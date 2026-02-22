/**
 * Ladder Scraping Module
 *
 * Challenger / Grandmaster / Master tier oyuncularının
 * maç verilerini toplar ve meta analiz için DB'ye yazar.
 *
 * Rate limit stratejisi:
 * - Challenger: ~200 oyuncu → 200 + 200 match ID req = ~400 req (güvenli)
 * - Grandmaster: ~500 oyuncu → top 100 al = ~200 req
 * - Master: çok fazla → top 50 al = ~100 req
 */

import {
  getMatchIds,
  getMatchDetails,
  PLATFORM_TO_REGION,
} from './riot.js';
import {
  getExistingMatchIds,
  saveMatch,
} from './db.js';
import supabase from './db.js';

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// ── Ladder Entry'leri Çek ───────────────────────────────────

/**
 * Belirli bir tier'ın ladder oyuncularını çek
 * @param {string} tier     - "CHALLENGER" | "GRANDMASTER" | "MASTER"
 * @param {string} platform - "tr1" | "euw1" vb.
 * @param {number} maxPlayers - kaç oyuncu çek
 * @returns {object[]} [{summonerId, puuid, leaguePoints, ...}]
 */
export async function getLadderPlayers(tier, platform = 'tr1', maxPlayers = 50) {
  const tierEndpoints = {
    CHALLENGER:  `https://${platform}.api.riotgames.com/tft/league/v1/challenger`,
    GRANDMASTER: `https://${platform}.api.riotgames.com/tft/league/v1/grandmaster`,
    MASTER:      `https://${platform}.api.riotgames.com/tft/league/v1/master`,
  };

  const url = tierEndpoints[tier.toUpperCase()];
  if (!url) throw new Error(`Geçersiz tier: ${tier}`);

  const res = await fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });

  if (!res.ok) {
    throw new Error(`Ladder API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const entries = data.entries || [];

  // LP'ye göre sırala, top N al
  return entries
    .sort((a, b) => b.leaguePoints - a.leaguePoints)
    .slice(0, maxPlayers)
    .map(e => ({
      summonerId: e.summonerId,
      summonerName: e.summonerName,
      leaguePoints: e.leaguePoints,
      wins: e.wins,
      losses: e.losses,
    }));
}

/**
 * Summoner ID → PUUID dönüşümü
 */
async function summonerIdToPuuid(summonerId, platform = 'tr1') {
  const url = `https://${platform}.api.riotgames.com/tft/summoner/v1/summoners/${summonerId}`;
  const res = await fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.puuid;
}

// ── Ladder Maçlarını Topla ──────────────────────────────────

/**
 * Belirli bir tier'ın top oyuncularının son maçlarını sync et
 * @param {string} tier
 * @param {string} platform
 * @param {number} maxPlayers     - kaç oyuncudan maç çek
 * @param {number} matchesPerPlayer - oyuncu başına kaç maç
 * @returns {object} { playersSynced, matchesFetched, matchesSaved, errors }
 */
export async function syncLadderMatches(tier, platform = 'tr1', maxPlayers = 50, matchesPerPlayer = 10) {
  const region = PLATFORM_TO_REGION[platform] || 'europe';
  const results = {
    tier,
    region,
    playersSynced: 0,
    matchesFetched: 0,
    matchesSaved: 0,
    errors: [],
  };

  try {
    // 1. Ladder oyuncularını çek
    console.log(`[ladder] ${tier} oyuncuları çekiliyor (${platform})...`);
    const players = await getLadderPlayers(tier, platform, maxPlayers);
    console.log(`[ladder] ${players.length} oyuncu bulundu.`);

    // 2. Her oyuncunun PUUID'sini al ve son maçlarını çek
    const allMatchIds = new Set();

    for (const player of players) {
      try {
        const puuid = await summonerIdToPuuid(player.summonerId, platform);
        if (!puuid) continue;

        const matchIds = await getMatchIds(puuid, region, matchesPerPlayer);
        if (matchIds?.length) {
          matchIds.forEach(id => allMatchIds.add(id));
        }
        results.playersSynced++;

        // Rate limit: her oyuncudan sonra 100ms bekle
        await sleep(100);
      } catch (err) {
        results.errors.push({ player: player.summonerName, error: err.message });
      }
    }

    console.log(`[ladder] ${allMatchIds.size} benzersiz maç ID bulundu.`);
    results.matchesFetched = allMatchIds.size;

    // 3. Zaten DB'de olan maçları filtrele
    const matchIdArray = Array.from(allMatchIds);
    const existingSet = await getExistingMatchIds(matchIdArray);
    const newIds = matchIdArray.filter(id => !existingSet.has(id));

    console.log(`[ladder] ${newIds.length} yeni maç kaydedilecek.`);

    // 4. Yeni maçların detaylarını çek ve kaydet
    // Batch halinde (rate limit dostu)
    const BATCH_SIZE = 10;
    for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
      const batch = newIds.slice(i, i + BATCH_SIZE);
      const details = await getMatchDetails(batch, region);

      for (const matchJson of details) {
        try {
          await saveMatch(matchJson);
          results.matchesSaved++;
        } catch (err) {
          results.errors.push({ matchId: matchJson.metadata?.match_id, error: err.message });
        }
      }
    }

    // 5. Sync log'u güncelle
    await updateLadderSyncLog(tier, region, results);

    console.log(`[ladder] ${tier} sync tamamlandı: ${results.matchesSaved} yeni maç kaydedildi.`);
    return results;

  } catch (err) {
    console.error(`[ladder] ${tier} sync hatası:`, err);
    results.errors.push({ critical: true, error: err.message });
    return results;
  }
}

// ── Sync Log Güncelle ───────────────────────────────────────

async function updateLadderSyncLog(tier, region, results) {
  const { error } = await supabase.from('ladder_sync_log').upsert(
    {
      tier:             tier.toUpperCase(),
      region,
      players_scraped:  results.playersSynced,
      matches_fetched:  results.matchesSaved,
      last_sync:        new Date().toISOString(),
    },
    { onConflict: 'tier,region' }
  );
  if (error) console.error('[ladder] Sync log hatası:', error.message);
}

// ── Multi-Region Ladder Sync ────────────────────────────────

/**
 * Tüm bölgelerde Challenger sync yap
 * @param {string[]} platforms - ["tr1","euw1","na1","kr"]
 * @param {number} maxPlayers
 */
export async function syncAllRegionLadders(platforms = ['euw1', 'kr', 'na1'], maxPlayers = 30) {
  const allResults = [];

  for (const platform of platforms) {
    try {
      const result = await syncLadderMatches('CHALLENGER', platform, maxPlayers, 10);
      allResults.push(result);
    } catch (err) {
      allResults.push({
        tier: 'CHALLENGER',
        region: PLATFORM_TO_REGION[platform],
        error: err.message,
      });
    }

    // Region arası 2 saniye bekle
    await sleep(2000);
  }

  return allResults;
}

// ── Yardımcı ────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
