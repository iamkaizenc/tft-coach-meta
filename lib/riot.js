/**
 * Riot API Client — TFT Coach App
 * Rate limit: 20 req/s | 100 req/2min (dev key)
 * Otomatik retry + exponential backoff + in-memory cache
 */

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// ── Routing tabloları ──────────────────────────────────────
const PLATFORM_TO_REGION = {
  tr1: 'europe',
  euw1: 'europe',
  eune1: 'europe',
  ru: 'europe',
  na1: 'americas',
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
};

// ── Basit in-memory cache (TTL: 5 dk) ─────────────────────
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ── Rate limiter (token bucket, basit) ────────────────────
let tokens = 20;
let lastRefill = Date.now();
const MAX_TOKENS = 20;
const REFILL_RATE_MS = 1000; // 20 token / saniye

async function acquireToken() {
  const now = Date.now();
  const elapsed = now - lastRefill;
  tokens = Math.min(MAX_TOKENS, tokens + (elapsed / REFILL_RATE_MS) * MAX_TOKENS);
  lastRefill = now;

  if (tokens >= 1) {
    tokens -= 1;
    return;
  }
  // Token yok → bekle
  const waitMs = ((1 - tokens) / MAX_TOKENS) * REFILL_RATE_MS + 50;
  await sleep(waitMs);
  tokens = 0;
  lastRefill = Date.now();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Core fetch (retry + 429 backoff) ──────────────────────
async function riotFetch(url, retries = 3) {
  const cached = cacheGet(url);
  if (cached) return cached;

  await acquireToken();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'X-Riot-Token': RIOT_API_KEY },
      });

      if (res.status === 429) {
        // Rate limit aşıldı — Retry-After header'ına bak
        const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
        console.warn(`[RiotAPI] 429 — ${retryAfter}s bekleniyor. URL: ${url}`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (res.status === 404) return null;

      if (!res.ok) {
        throw new Error(`Riot API ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      cacheSet(url, data);
      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      // Exponential backoff: 1s, 2s, 4s
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}

// ── API Metodları ──────────────────────────────────────────

/**
 * Riot ID → PUUID
 * @param {string} gameName  Örn: "Faker"
 * @param {string} tagLine   Örn: "TR1"
 * @param {string} region    "europe" | "americas" | "asia"
 */
export async function getPuuidByRiotId(gameName, tagLine, region = 'europe') {
  const url = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotFetch(url);
}

/**
 * PUUID → Summoner (platform üzerinde)
 * @param {string} puuid
 * @param {string} platform  Örn: "tr1"
 */
export async function getSummonerByPuuid(puuid, platform = 'tr1') {
  const url = `https://${platform}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`;
  return riotFetch(url);
}

/**
 * Summoner ID → Rank bilgisi
 * @param {string} summonerId
 * @param {string} platform
 */
export async function getRankBySummonerId(summonerId, platform = 'tr1') {
  const url = `https://${platform}.api.riotgames.com/tft/league/v1/entries/by-summoner/${summonerId}`;
  return riotFetch(url);
}

/**
 * Belirli bir ligdeki oyuncuları çeker (Challenger, Grandmaster, Master)
 * @param {string} tier "CHALLENGER", "GRANDMASTER", "MASTER"
 * @param {string} platform  Örn: "tr1"
 */
export async function getLeagueEntries(tier = 'CHALLENGER', platform = 'tr1') {
  const url = `https://${platform}.api.riotgames.com/tft/league/v1/${tier.toLowerCase()}`;
  return riotFetch(url);
}

/**
 * PUUID → Son N maç ID'si
 * @param {string} puuid
 * @param {string} region    "europe" | "americas" | "asia"
 * @param {number} count     Max 200, default 20
 * @param {number} start     Sayfalama offset
 */
export async function getMatchIds(puuid, region = 'europe', count = 20, start = 0) {
  const url = `https://${region}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;
  return riotFetch(url);
}

/**
 * Match ID → Maç detayı
 * @param {string} matchId  Örn: "EUW1_7123456789"
 * @param {string} region
 */
export async function getMatchDetail(matchId, region = 'europe') {
  const url = `https://${region}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
  return riotFetch(url);
}

/**
 * Tam profil çek: PUUID + Summoner + Rank
 * @param {string} gameName
 * @param {string} tagLine
 * @param {string} platform  Örn: "tr1"
 */
export async function getFullProfile(gameName, tagLine, platform = 'tr1') {
  const region = PLATFORM_TO_REGION[platform] || 'europe';

  const account = await getPuuidByRiotId(gameName, tagLine, region);
  if (!account) return null;

  const [summoner, matchIds] = await Promise.all([
    getSummonerByPuuid(account.puuid, platform),
    getMatchIds(account.puuid, region, 20),
  ]);

  let rank = null;
  if (summoner?.id) {
    const rankData = await getRankBySummonerId(summoner.id, platform);
    rank = rankData?.find((r) => r.queueType === 'RANKED_TFT') || null;
  }

  return {
    puuid: account.puuid,
    gameName: account.gameName,
    tagLine: account.tagLine,
    platform,
    region,
    summonerId: summoner?.id,
    summonerLevel: summoner?.summonerLevel,
    rank: rank
      ? {
        tier: rank.tier,
        division: rank.rank,
        lp: rank.leaguePoints,
        wins: rank.wins,
        losses: rank.losses,
      }
      : null,
    recentMatchIds: matchIds || [],
  };
}

/**
 * N maç detayını batch çek (rate limit'e saygılı)
 * @param {string[]} matchIds
 * @param {string} region
 */
export async function getMatchDetails(matchIds, region = 'europe') {
  const results = [];
  for (const id of matchIds) {
    try {
      const detail = await getMatchDetail(id, region);
      if (detail) results.push(detail);
    } catch (err) {
      console.error(`[RiotAPI] Match çekme hatası (${id}):`, err.message);
    }
    // Rate limit: her istekten sonra 60ms bekle (sürekli ~16 req/s)
    await sleep(60);
  }
  return results;
}

export { PLATFORM_TO_REGION };
