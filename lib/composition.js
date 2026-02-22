/**
 * Composition Detection & Hashing Engine
 *
 * Maç verilerinden kompozisyonları tespit eder, gruplar ve
 * meta analiz için istatistik hesaplar.
 *
 * Hash stratejisi:
 * - Board'daki unit'leri cost'a göre sırala
 * - Character ID'lerini birleştir → deterministic hash
 * - Aynı unit seti = aynı comp
 */

// ── Comp Hash Üretimi ───────────────────────────────────────

/**
 * Units dizisinden deterministic comp hash üret
 * @param {object[]} units - [{character_id, tier, rarity, items}]
 * @returns {string} comp hash (ör: "ahri_blitz_jinx_sona_yone")
 */
export function generateCompHash(units) {
  if (!units?.length) return 'empty';

  // Character ID'leri normalize et ve sırala
  const normalized = units
    .map(u => normalizeUnitId(u.character_id || u.id || ''))
    .filter(Boolean)
    .sort();

  // Deterministic hash: sıralı unit ID'ler
  return normalized.join('_');
}

/**
 * Unit ID'yi normalize et: "TFT14_Ahri" → "ahri"
 */
function normalizeUnitId(id) {
  if (!id) return '';
  // TFT prefix'ini kaldır: TFT14_Ahri → Ahri → ahri
  return id
    .replace(/^TFT\d+_/i, '')
    .replace(/^TFTSet\d+_/i, '')
    .toLowerCase()
    .trim();
}

/**
 * Comp hash'ten okunabilir isim üret
 * Trait bazlı isimlendirme: en baskın 2 trait'i kullan
 * @param {object[]} traits - [{name, style, num_units}]
 * @param {object[]} units  - [{character_id}]
 * @returns {string} "Dragons / Fire" gibi
 */
export function generateCompName(traits, units) {
  if (!traits?.length) {
    // Trait yoksa en pahalı 2 unit'i kullan
    if (units?.length) {
      const topUnits = [...units]
        .sort((a, b) => (b.rarity || 0) - (a.rarity || 0))
        .slice(0, 2)
        .map(u => normalizeUnitId(u.character_id || u.id || ''))
        .map(name => name.charAt(0).toUpperCase() + name.slice(1));
      return topUnits.join(' / ') || 'Unknown';
    }
    return 'Unknown';
  }

  // Aktif trait'leri style'a göre sırala (yüksek → düşük)
  const activeTraits = traits
    .filter(t => (t.style || 0) > 0)
    .sort((a, b) => {
      // Önce style (prismatic > gold > silver > bronze)
      if ((b.style || 0) !== (a.style || 0)) return (b.style || 0) - (a.style || 0);
      // Sonra num_units
      return (b.num_units || 0) - (a.num_units || 0);
    });

  if (!activeTraits.length) return 'Flexible';

  // En güçlü 2 trait'i isimlendir
  const topTraits = activeTraits
    .slice(0, 2)
    .map(t => cleanTraitName(t.name || t.id || ''));

  return topTraits.join(' / ');
}

/**
 * Trait name'i temizle: "Set14_Dragons" → "Dragons"
 */
function cleanTraitName(name) {
  return name
    .replace(/^Set\d+_/i, '')
    .replace(/^TFT\d+_/i, '')
    .replace(/_/g, ' ')
    .trim();
}

// ── Participant'tan Comp Tespit ─────────────────────────────

/**
 * Bir participant'ın board state'inden comp bilgisi çıkar
 * @param {object} participant - DB'den gelen katılımcı kaydı
 * @returns {object} { compHash, compName, units, traits, items, augments }
 */
export function detectCompFromParticipant(participant) {
  const units = participant.units || [];
  const traits = participant.traits || [];
  const augments = participant.augments || [];

  const compHash = generateCompHash(units);
  const compName = generateCompName(traits, units);

  // Board state snapshot
  const boardState = units.map(u => ({
    id: u.character_id || u.id,
    name: normalizeUnitId(u.character_id || u.id || ''),
    tier: u.tier || 1,       // yıldız seviyesi
    rarity: u.rarity || 0,   // cost
    items: (u.items || u.itemNames || []),
  }));

  // Item dağılımı
  const itemMap = {};
  for (const unit of boardState) {
    if (unit.items?.length) {
      itemMap[unit.id] = unit.items;
    }
  }

  return {
    compHash,
    compName,
    units: boardState,
    traits: traits.filter(t => (t.style || 0) > 0), // sadece aktif trait'ler
    items: itemMap,
    augments,
    placement: participant.placement,
    level: participant.level,
  };
}

// ── Toplu Gruplama ──────────────────────────────────────────

/**
 * Bir dizi participant'ı comp'lara göre grupla
 * @param {object[]} participants - DB kayıtları
 * @returns {Map<string, object>} comp_hash → { participants[], compName, units, traits }
 */
export function groupByComposition(participants) {
  const compMap = new Map();

  for (const p of participants) {
    const comp = detectCompFromParticipant(p);

    if (!compMap.has(comp.compHash)) {
      compMap.set(comp.compHash, {
        compHash: comp.compHash,
        compName: comp.compName,
        unitsTemplate: comp.units, // ilk görülen board state (referans)
        traitsTemplate: comp.traits,
        participants: [],
        placements: [],
        itemCounts: {},        // item → kullanım sayısı
        augmentCounts: {},     // augment → kullanım sayısı
      });
    }

    const group = compMap.get(comp.compHash);
    group.participants.push(p);
    group.placements.push(comp.placement);

    // Item co-occurrence
    for (const [unitId, items] of Object.entries(comp.items)) {
      for (const item of items) {
        const key = `${unitId}:${item}`;
        group.itemCounts[key] = (group.itemCounts[key] || 0) + 1;
      }
    }

    // Augment co-occurrence
    for (const aug of comp.augments) {
      const augId = typeof aug === 'string' ? aug : aug.id || String(aug);
      group.augmentCounts[augId] = (group.augmentCounts[augId] || 0) + 1;
    }
  }

  return compMap;
}

// ── Comp İstatistik Hesaplama ───────────────────────────────

/**
 * Tek bir comp grubunun istatistiklerini hesapla
 * @param {object} compGroup - groupByComposition'dan gelen grup
 * @param {number} totalGames - toplam maç sayısı (pick rate için)
 * @returns {object} { pickRate, winRate, avgPlacement, top4Rate, ... }
 */
export function calculateCompStats(compGroup, totalGames) {
  const { placements, itemCounts, augmentCounts, participants } = compGroup;
  const n = placements.length;

  if (n === 0) return null;

  const avgPlacement = round2(placements.reduce((a, b) => a + b, 0) / n);
  const top4Count = placements.filter(p => p <= 4).length;
  const winCount = placements.filter(p => p === 1).length;

  // En iyi item'lar (unit bazlı)
  const suggestedItems = {};
  for (const [key, count] of Object.entries(itemCounts)) {
    const [unitId, itemId] = key.split(':');
    if (!suggestedItems[unitId]) suggestedItems[unitId] = [];
    suggestedItems[unitId].push({ id: itemId, count, rate: round2((count / n) * 100) });
  }
  // Her unit için top 3 item
  for (const unitId of Object.keys(suggestedItems)) {
    suggestedItems[unitId] = suggestedItems[unitId]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  // En iyi augment'ler
  const suggestedAugments = Object.entries(augmentCounts)
    .map(([id, count]) => {
      // Bu augment'le oynanan maçların placement'ları
      const augPlacements = participants
        .filter(p => {
          const augs = p.augments || [];
          return augs.some(a => (typeof a === 'string' ? a : a.id || String(a)) === id);
        })
        .map(p => p.placement);

      return {
        id,
        count,
        pickRate: round2((count / n) * 100),
        avgPlacement: augPlacements.length
          ? round2(augPlacements.reduce((a, b) => a + b, 0) / augPlacements.length)
          : 0,
      };
    })
    .sort((a, b) => a.avgPlacement - b.avgPlacement)
    .slice(0, 5);

  return {
    gamesCount: n,
    pickRate: totalGames > 0 ? round2((n / totalGames) * 100) : 0,
    winRate: round2((winCount / n) * 100),
    avgPlacement,
    top4Rate: round2((top4Count / n) * 100),
    suggestedItems,
    suggestedAugments,
  };
}

/**
 * Comp'lara tier ata: S / A / B / C
 * Weighted score = (100 - avgPlacement*10)*0.5 + top4Rate*0.3 + winRate*0.2
 * Min 5 game threshold
 */
export function assignCompTiers(comps, minGames = 5) {
  // Min game filtresi
  const eligible = comps.filter(c => c.gamesCount >= minGames);
  if (!eligible.length) return comps;

  // Weighted score hesapla
  for (const comp of eligible) {
    comp.weightedScore =
      (100 - comp.avgPlacement * 10) * 0.5 +
      comp.top4Rate * 0.3 +
      comp.winRate * 0.2;
  }

  // Score'a göre sırala
  eligible.sort((a, b) => b.weightedScore - a.weightedScore);

  // Tier ata (yüzdelik dilimlere göre)
  const n = eligible.length;
  for (let i = 0; i < n; i++) {
    const percentile = i / n;
    if (percentile < 0.10) eligible[i].tier = 'S';
    else if (percentile < 0.30) eligible[i].tier = 'A';
    else if (percentile < 0.65) eligible[i].tier = 'B';
    else eligible[i].tier = 'C';
  }

  // minGames altındakiler otomatik C
  for (const comp of comps) {
    if (comp.gamesCount < minGames) {
      comp.tier = 'C';
      comp.weightedScore = 0;
    }
  }

  return comps;
}

// ── Meta Tag Üretici ────────────────────────────────────────

/**
 * Comp'un oynanış tarzına göre tag'ler ata
 * @param {object} compGroup
 * @param {object} stats
 * @returns {string[]} ["tempo","late-game","reroll"] vb.
 */
export function generateMetaTags(compGroup, stats) {
  const tags = [];
  const { participants } = compGroup;

  // Ortalama level
  const avgLevel = participants.reduce((s, p) => s + (p.level || 0), 0) / participants.length;
  // Ortalama last_round
  const avgRound = participants.reduce((s, p) => s + (p.last_round || 20), 0) / participants.length;

  // Tempo: hızlı leveling
  if (avgLevel >= 8) tags.push('fast-8');
  if (avgLevel >= 9) tags.push('fast-9');

  // Reroll: düşük cost carry
  const avgCost = compGroup.unitsTemplate.reduce((s, u) => s + (u.rarity || 0), 0) / compGroup.unitsTemplate.length;
  if (avgCost <= 2) tags.push('reroll');

  // Late game: uzun maçlar
  if (avgRound >= 25) tags.push('late-game');
  if (avgRound <= 18) tags.push('early-game');

  // Win rate bazlı
  if (stats.winRate >= 20) tags.push('high-winrate');
  if (stats.top4Rate >= 60) tags.push('consistent');

  return tags;
}

// ── Yardımcı ────────────────────────────────────────────────
function round2(n) {
  return Math.round(n * 100) / 100;
}
