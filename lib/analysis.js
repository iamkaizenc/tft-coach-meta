/**
 * TFT Coaching Analysis Engine
 *
 * Girdi: participants[] (DB'den veya raw match JSON'dan)
 * Çıktı: metrikler, koç kartları, hata örüntüleri
 */

// ── Skor hesaplama fonksiyonları ───────────────────────────

/**
 * Tempo skoru (0–100)
 * Level'e ulaşma hızına bakarak ölçer.
 * last_round erken bitişi ve yüksek level ödüllendirir.
 */
export function calcTempoScore(participant) {
  const { level = 1, last_round = 1, time_eliminated = 0 } = participant;

  // Normalizasyon: level 9 ideal, 28 round ortalama max
  const levelScore   = Math.min(100, (level / 9) * 100);
  const roundScore   = Math.min(100, (last_round / 28) * 100);

  // Erken elenme cezası (15 rounddan önce çok düşer)
  const eliminationPenalty = last_round < 15 ? (15 - last_round) * 3 : 0;

  return Math.max(0, Math.round(levelScore * 0.6 + roundScore * 0.4 - eliminationPenalty));
}

/**
 * Econ skoru (0–100)
 * gold_left ve placement kombinasyonu.
 * Az gold bırakmak (harcamak) + iyi placement = yüksek econ.
 */
export function calcEconScore(participant) {
  const { gold_left = 0, placement = 8 } = participant;

  // İdeal: 0–5 gold bırakmak (etkin harcama)
  const spendScore = Math.max(0, 100 - gold_left * 4);

  // Placement bonusu: top4 → +20
  const placementBonus = placement <= 4 ? 20 : 0;

  return Math.min(100, Math.round(spendScore * 0.8 + placementBonus));
}

/**
 * Synergy skoru (0–100)
 * Aktif trait sayısı ve tier yüksekliğine bakılır.
 */
export function calcSynergyScore(participant) {
  const traits = participant.traits || [];
  if (!traits.length) return 0;

  let score = 0;
  for (const trait of traits) {
    const style = trait.style || 0; // 0=inactive, 1=bronze, 2=silver, 3=gold, 4=prismatic
    score += style * 15;
  }

  // Aktif trait sayısı bonusu
  const activeTrait = traits.filter((t) => (t.style || 0) > 0).length;
  score += activeTrait * 5;

  return Math.min(100, Math.round(score));
}

// ── Aggregate analiz ──────────────────────────────────────

/**
 * Oyuncunun son N maçını analiz et
 * @param {object[]} participants  DB'den gelen katılımcı kayıtları
 * @returns {object} Özet istatistikler + koç kartları
 */
export function analyzePlayer(participants) {
  if (!participants.length) return null;

  const n = participants.length;
  const placements = participants.map((p) => p.placement);

  // Temel istatistikler
  const avgPlacement = placements.reduce((a, b) => a + b, 0) / n;
  const top4Count    = placements.filter((p) => p <= 4).length;
  const winCount     = placements.filter((p) => p === 1).length;
  const top4Pct      = (top4Count / n) * 100;
  const winPct       = (winCount / n) * 100;

  // Placement dağılımı
  const placementDist = Array.from({ length: 8 }, (_, i) => ({
    place: i + 1,
    count: placements.filter((p) => p === i + 1).length,
  }));

  // Skor ortalamaları
  const avgTempo   = avg(participants.map((p) => p.tempo_score   || 0));
  const avgEcon    = avg(participants.map((p) => p.econ_score    || 0));
  const avgSynergy = avg(participants.map((p) => p.synergy_score || 0));

  // Augment performansı
  const augmentStats = calcAugmentStats(participants);

  // Trait/comp performansı
  const traitStats = calcTraitStats(participants);

  // Hata örüntüleri
  const errorPatterns = detectErrorPatterns(participants);

  // Koç kartları (3 adet)
  const coachCards = generateCoachCards({
    avgPlacement,
    top4Pct,
    winPct,
    avgTempo,
    avgEcon,
    avgSynergy,
    augmentStats,
    traitStats,
    errorPatterns,
    n,
  });

  return {
    summary: {
      totalGames: n,
      avgPlacement: round2(avgPlacement),
      top4Pct:      round2(top4Pct),
      winPct:       round2(winPct),
      placementDist,
    },
    scores: {
      tempo:   round2(avgTempo),
      econ:    round2(avgEcon),
      synergy: round2(avgSynergy),
    },
    augmentStats: augmentStats.slice(0, 10),  // top 10
    traitStats:   traitStats.slice(0, 10),
    errorPatterns,
    coachCards,
  };
}

// ── Augment istatistikleri ─────────────────────────────────
function calcAugmentStats(participants) {
  const augMap = new Map();

  for (const p of participants) {
    const augments = p.augments || [];
    for (const aug of augments) {
      const augId = typeof aug === 'string' ? aug : aug.id || aug.name || String(aug);
      if (!augMap.has(augId)) {
        augMap.set(augId, { id: augId, placements: [], count: 0 });
      }
      const entry = augMap.get(augId);
      entry.placements.push(p.placement);
      entry.count++;
    }
  }

  return Array.from(augMap.values())
    .filter((a) => a.count >= 2)  // En az 2 kez görülmüş
    .map((a) => ({
      id:           a.id,
      count:        a.count,
      avgPlacement: round2(avg(a.placements)),
      top4Pct:      round2((a.placements.filter((p) => p <= 4).length / a.count) * 100),
    }))
    .sort((a, b) => a.avgPlacement - b.avgPlacement);  // En iyi avg placement önce
}

// ── Trait istatistikleri ───────────────────────────────────
function calcTraitStats(participants) {
  const traitMap = new Map();

  for (const p of participants) {
    const traits = p.traits || [];
    const activeTraits = traits.filter((t) => (t.style || 0) >= 2);  // silver+

    for (const trait of activeTraits) {
      const name = trait.name || trait.id || String(trait);
      if (!traitMap.has(name)) {
        traitMap.set(name, { name, placements: [], count: 0 });
      }
      const entry = traitMap.get(name);
      entry.placements.push(p.placement);
      entry.count++;
    }
  }

  return Array.from(traitMap.values())
    .filter((t) => t.count >= 2)
    .map((t) => ({
      name:         t.name,
      count:        t.count,
      avgPlacement: round2(avg(t.placements)),
      top4Pct:      round2((t.placements.filter((p) => p <= 4).length / t.count) * 100),
    }))
    .sort((a, b) => a.avgPlacement - b.avgPlacement);
}

// ── Hata örüntüsü tespiti ─────────────────────────────────
function detectErrorPatterns(participants) {
  const patterns = [];

  // 1) Erken elenme örüntüsü
  const earlyElim = participants.filter((p) => (p.last_round || 28) < 16 && p.placement > 4);
  if (earlyElim.length >= 3) {
    patterns.push({
      type: 'early_elimination',
      severity: 'high',
      message: `Son ${participants.length} maçın ${earlyElim.length}'inde erken elendin (round < 16). Tempo ve streak yönetimine bak.`,
      count: earlyElim.length,
    });
  }

  // 2) Gold israfı
  const goldWaste = participants.filter((p) => (p.gold_left || 0) > 10 && p.placement > 4);
  if (goldWaste.length >= 3) {
    patterns.push({
      type: 'gold_waste',
      severity: 'medium',
      message: `${goldWaste.length} maçta 10+ gold bırakıp top4 kaçırdın. Kaybederken harcamayı bırakma.`,
      count: goldWaste.length,
    });
  }

  // 3) Bot4 pattern (8'lik veya 7'lik serisi)
  const bot4Streak = participants.slice(0, 5).filter((p) => p.placement >= 5);
  if (bot4Streak.length >= 4) {
    patterns.push({
      type: 'tilt_streak',
      severity: 'high',
      message: 'Son 5 maçın 4\'ünde bot4. Tilt modu tespit edildi — mola ver veya comp değiştir.',
      count: bot4Streak.length,
    });
  }

  // 4) Düşük synergy (aktif trait yok)
  const lowSynergy = participants.filter((p) => (p.synergy_score || 0) < 30);
  if (lowSynergy.length > participants.length * 0.4) {
    patterns.push({
      type: 'low_synergy',
      severity: 'medium',
      message: 'Maçların %40\'ında trait aktivasyonu zayıf. Comp çizgini net belirle.',
      count: lowSynergy.length,
    });
  }

  return patterns;
}

// ── Koç kartı üretici ─────────────────────────────────────
function generateCoachCards({ avgPlacement, top4Pct, avgTempo, avgEcon, avgSynergy, augmentStats, traitStats, errorPatterns, n }) {
  const cards = [];

  // Kart 1: Güçlü yön
  const bestAugment = augmentStats[0];
  const bestTrait   = traitStats[0];
  cards.push({
    type: 'strength',
    title: '💪 Güçlü Yönün',
    body: bestAugment
      ? `${bestAugment.id} augment'iyle ortalama ${bestAugment.avgPlacement} placement ve %${bestAugment.top4Pct} top4 oranın var. Bu augment'i seçtiğinde iyi oynuyorsun.`
      : `${n} maçta %${round2(top4Pct)} top4 oranınla ortalamanın üzerindesin.`,
    metric: top4Pct,
    benchmark: 50,
  });

  // Kart 2: Kritik iyileştirme
  const weakArea = [
    { name: 'tempo', score: avgTempo },
    { name: 'econ', score: avgEcon },
    { name: 'synergy', score: avgSynergy },
  ].sort((a, b) => a.score - b.score)[0];

  const weakMessages = {
    tempo:   'Leveling geç kalıyor. 4-1\'de 5, 4-2\'de 6, 6-1\'de 7\'ye ulaşmayı hedefle.',
    econ:    'Gold yönetimi zayıf. 50 gold faizini koru, 7\'den sonra harca.',
    synergy: 'Trait aktivasyonu düşük. Oyunun başında core comp belirle, random unit koyma.',
  };

  cards.push({
    type: 'improvement',
    title: '🎯 Kritik İyileştirme',
    body: weakMessages[weakArea.name] || 'Genel dengeyi artır.',
    metric: weakArea.score,
    benchmark: 60,
  });

  // Kart 3: En yüksek öncelikli hata
  const topError = errorPatterns.sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0))[0];
  cards.push({
    type: 'error_pattern',
    title: '⚠️ Tekrarlayan Hata',
    body: topError
      ? topError.message
      : 'Belirgin bir hata örüntüsü yok. Tutarlılığını koru.',
    metric: topError ? topError.count : 0,
    benchmark: 0,
  });

  return cards;
}

// ── Yardımcı ──────────────────────────────────────────────
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
