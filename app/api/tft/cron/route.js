/**
 * GET /api/tft/cron
 *
 * Vercel Cron Job — 3 mod:
 *   ?mode=tracked  → Kayıtlı oyuncuları sync et (her 6 saat)
 *   ?mode=ladder   → Challenger/GM ladder scrape (günlük)
 *   ?mode=aggregate → Sadece meta aggregation çalıştır
 *   (default: tracked + aggregate)
 */

import { NextResponse } from 'next/server';
import { getAllPlayers } from '@/lib/db';
import { getMatchIds, getMatchDetails } from '@/lib/riot';
import { getExistingMatchIds, saveMatch, upsertPlayer } from '@/lib/db';
import { aggregateMetaSnapshot } from '@/lib/aggregation';
import { syncLadderMatches } from '@/lib/ladder';

export const maxDuration = 300; // Vercel: max 5 dakika

export async function GET(req) {
  // Basit cron secret koruması
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get('mode') || 'tracked';
  const startTime = Date.now();
  const response = { mode, results: {}, duration: 0 };

  try {
    // ── MODE: TRACKED ────────────────────────────────────────
    if (mode === 'tracked' || mode === 'all') {
      const players = await getAllPlayers();
      const syncResults = [];

      for (const player of players) {
        try {
          const matchIds = await getMatchIds(player.puuid, player.region, 10);
          const existing = await getExistingMatchIds(matchIds || []);
          const newIds = (matchIds || []).filter((id) => !existing.has(id));

          if (!newIds.length) {
            syncResults.push({ puuid: player.puuid, synced: 0 });
            continue;
          }

          const details = await getMatchDetails(newIds, player.region);
          let saved = 0;
          for (const m of details) {
            try { await saveMatch(m); saved++; } catch (_) { }
          }

          // last_sync_at güncelle
          await upsertPlayer({ ...player, gameName: player.game_name, tagLine: player.tag_line });
          syncResults.push({ puuid: player.puuid, synced: saved });
        } catch (err) {
          syncResults.push({ puuid: player.puuid, error: err.message });
        }
      }

      response.results.tracked = {
        players: players.length,
        synced: syncResults.filter(r => r.synced > 0).length,
        details: syncResults,
      };
    }

    // ── MODE: LADDER ─────────────────────────────────────────
    if (mode === 'ladder' || mode === 'all') {
      const ladderResults = [];

      // Challenger — ana bölgeler
      const platforms = ['euw1', 'kr', 'na1', 'tr1'];
      for (const platform of platforms) {
        try {
          const result = await syncLadderMatches('CHALLENGER', platform, 30, 10);
          ladderResults.push(result);
        } catch (err) {
          ladderResults.push({
            tier: 'CHALLENGER',
            region: platform,
            error: err.message,
          });
        }
      }

      response.results.ladder = ladderResults;
    }

    // ── AGGREGATION (her modda çalışır) ──────────────────────
    if (mode !== 'aggregate') {
      // Tracked veya ladder sonrası aggregation
      try {
        const aggResult = await aggregateMetaSnapshot(72, 3);
        response.results.aggregation = aggResult;
      } catch (err) {
        response.results.aggregation = { error: err.message };
      }
    }

    // ── MODE: AGGREGATE (sadece aggregation) ─────────────────
    if (mode === 'aggregate') {
      try {
        const aggResult = await aggregateMetaSnapshot(72, 3);
        response.results.aggregation = aggResult;
      } catch (err) {
        response.results.aggregation = { error: err.message };
      }
    }

    response.duration = `${Math.round((Date.now() - startTime) / 1000)}s`;
    return NextResponse.json({ ok: true, ...response });

  } catch (err) {
    console.error('[cron] Kritik hata:', err);
    response.duration = `${Math.round((Date.now() - startTime) / 1000)}s`;
    return NextResponse.json({ ok: false, error: err.message, ...response }, { status: 500 });
  }
}
