/**
 * Meta Aggregation Engine
 *
 * Maç verilerinden comp'ları gruplar, istatistik hesaplar,
 * tier atar ve meta_snapshots tablosuna yazar.
 *
 * Çalışma akışı:
 * 1. Son X saatin participants verisini çek
 * 2. Comp detection ile grupla
 * 3. Her comp için stats hesapla + tier ata
 * 4. comp_aggregation_log + comp_matches upsert
 * 5. meta_snapshots insert (günlük)
 */

import supabase from './db.js';
import {
  groupByComposition,
  calculateCompStats,
  assignCompTiers,
  generateMetaTags,
  detectCompFromParticipant,
} from './composition.js';

// ── Ana Aggregation Fonksiyonu ──────────────────────────────

/**
 * Son hoursBack saatin meta snapshot'ını oluştur
 * @param {number} hoursBack - kaç saat geriye bak (default: 72)
 * @param {number} minGames  - minimum maç eşiği (default: 3)
 * @returns {object} { compsProcessed, snapshotSaved, errors }
 */
export async function aggregateMetaSnapshot(hoursBack = 72, minGames = 3) {
  const results = { compsProcessed: 0, snapshotSaved: false, errors: [] };

  try {
    // 1. Son X saatin participants verisini çek
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const { data: participants, error: fetchErr } = await supabase
      .from('participants')
      .select(`
        *,
        matches ( game_datetime, game_version, tft_set_number )
      `)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;

    if (!participants?.length) {
      console.log('[aggregation] Veri yok, atlanıyor.');
      return results;
    }

    console.log(`[aggregation] ${participants.length} participant işleniyor...`);

    // 2. Comp'lara göre grupla
    const compGroups = groupByComposition(participants);

    // 3. Her comp için stats hesapla
    // totalGames = unique maç sayısı (8 oyunculu, her maç 8 participant)
    const uniqueMatches = new Set(participants.map(p => p.match_id));
    const totalGames = uniqueMatches.size;

    const compList = [];
    for (const [hash, group] of compGroups) {
      const stats = calculateCompStats(group, totalGames);
      if (!stats) continue;

      const metaTags = generateMetaTags(group, stats);

      // TFT set numarası ve patch (ilk participant'tan al)
      const sampleP = group.participants[0];
      const setNumber = sampleP?.matches?.tft_set_number || null;
      const patch = sampleP?.matches?.game_version || null;

      compList.push({
        compHash: hash,
        compName: group.compName,
        unitsInComp: group.unitsTemplate,
        traitsInComp: group.traitsTemplate,
        sampleMatchId: sampleP?.match_id || null,
        tftSetNumber: setNumber,
        patch,
        metaTags,
        ...stats,
      });
    }

    // 4. Tier ata
    assignCompTiers(compList, minGames);

    // 5. comp_aggregation_log upsert
    for (const comp of compList) {
      try {
        await upsertCompAggregation(comp);
        results.compsProcessed++;
      } catch (err) {
        results.errors.push({ comp: comp.compHash, error: err.message });
      }
    }

    // 6. comp_matches bridge kayıtları
    for (const [hash, group] of compGroups) {
      for (const p of group.participants) {
        try {
          await upsertCompMatch(hash, p);
        } catch {
          // duplicate hatalarını yoksay (UNIQUE constraint)
        }
      }
    }

    // 7. Participants tablosunda comp_hash güncelle
    await updateParticipantCompHashes(compGroups);

    // 8. Günlük meta snapshot kaydet
    try {
      await saveMetaSnapshot(compList, totalGames);
      results.snapshotSaved = true;
    } catch (err) {
      results.errors.push({ snapshot: true, error: err.message });
    }

    console.log(`[aggregation] ${results.compsProcessed} comp işlendi.`);
    return results;

  } catch (err) {
    console.error('[aggregation] Kritik hata:', err);
    results.errors.push({ critical: true, error: err.message });
    return results;
  }
}

// ── DB İşlemleri ────────────────────────────────────────────

/**
 * comp_aggregation_log'a upsert
 */
async function upsertCompAggregation(comp) {
  const { error } = await supabase.from('comp_aggregation_log').upsert(
    {
      comp_hash:          comp.compHash,
      comp_name:          comp.compName,
      units_in_comp:      comp.unitsInComp,
      traits_in_comp:     comp.traitsInComp,
      tier:               comp.tier || 'C',
      pick_rate:          comp.pickRate,
      win_rate:           comp.winRate,
      avg_placement:      comp.avgPlacement,
      top4_rate:          comp.top4Rate,
      games_count:        comp.gamesCount,
      sample_match_id:    comp.sampleMatchId,
      tft_set_number:     comp.tftSetNumber,
      patch:              comp.patch,
      meta_tags:          comp.metaTags,
      suggested_items:    comp.suggestedItems,
      suggested_augments: comp.suggestedAugments,
      last_updated:       new Date().toISOString(),
    },
    { onConflict: 'comp_hash' }
  );
  if (error) throw error;
}

/**
 * comp_matches bridge tablosuna kaydet
 */
async function upsertCompMatch(compHash, participant) {
  const comp = detectCompFromParticipant(participant);

  const { error } = await supabase.from('comp_matches').upsert(
    {
      comp_hash: compHash,
      match_id:  participant.match_id,
      puuid:     participant.puuid,
      placement: participant.placement,
      units:     comp.units,
      items:     comp.items,
      augments:  comp.augments,
    },
    { onConflict: 'comp_hash,match_id,puuid' }
  );
  // UNIQUE hatalarını yoksay
  if (error && !error.message?.includes('duplicate')) throw error;
}

/**
 * Participants tablosunda comp_hash'leri güncelle (batch)
 */
async function updateParticipantCompHashes(compGroups) {
  for (const [hash, group] of compGroups) {
    const ids = group.participants.map(p => p.id).filter(Boolean);
    if (!ids.length) continue;

    // Batch update: 100'lük gruplar
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase
        .from('participants')
        .update({ comp_hash: hash })
        .in('id', batch);
    }
  }
}

/**
 * Günlük meta snapshot kaydet
 */
async function saveMetaSnapshot(compList, totalGames) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const setNumber = compList[0]?.tftSetNumber || null;
  const patch = compList[0]?.patch || null;

  // Comp snapshot
  const compsSnapshot = compList
    .filter(c => c.tier !== 'C') // Sadece anlamlı comp'lar
    .map(c => ({
      comp_hash:     c.compHash,
      comp_name:     c.compName,
      tier:          c.tier,
      pick_rate:     c.pickRate,
      win_rate:      c.winRate,
      avg_placement: c.avgPlacement,
      games_count:   c.gamesCount,
    }));

  // Unit stats aggregate
  const unitStatsMap = new Map();
  for (const comp of compList) {
    for (const unit of (comp.unitsInComp || [])) {
      const uid = unit.id || unit.name;
      if (!unitStatsMap.has(uid)) {
        unitStatsMap.set(uid, { unit_id: uid, placements: [], count: 0 });
      }
      const entry = unitStatsMap.get(uid);
      entry.count += comp.gamesCount;
      // approx avg placement (weighted)
      entry.placements.push({ avg: comp.avgPlacement, weight: comp.gamesCount });
    }
  }
  const unitStats = Array.from(unitStatsMap.values()).map(u => {
    const totalWeight = u.placements.reduce((s, p) => s + p.weight, 0);
    const weightedAvg = u.placements.reduce((s, p) => s + p.avg * p.weight, 0) / (totalWeight || 1);
    return {
      unit_id: u.unit_id,
      pick_rate: round2((u.count / (totalGames * 8 || 1)) * 100),
      avg_placement: round2(weightedAvg),
    };
  });

  const { error } = await supabase.from('meta_snapshots').upsert(
    {
      snapshot_date:   today,
      tft_set_number:  setNumber,
      patch,
      comps_snapshot:  compsSnapshot,
      unit_stats:      unitStats,
      trait_stats:     [],  // gelecekte dolacak
      item_stats:      [],
      augment_stats:   [],
      total_games:     totalGames,
    },
    { onConflict: 'snapshot_date,tft_set_number,patch' }
  );

  if (error) throw error;
}

// ── Yardımcı ────────────────────────────────────────────────
function round2(n) {
  return Math.round(n * 100) / 100;
}
