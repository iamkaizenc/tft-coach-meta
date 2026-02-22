/**
 * POST /api/tft/sync
 * Oyuncunun son N maçını Riot API'dan çekip DB'ye yazar.
 *
 * Body: { gameName, tagLine, platform?, count? }
 * veya: { puuid, region?, count? }  (zaten biliyorsan)
 */

import { NextResponse } from 'next/server';
import {
  getFullProfile,
  getMatchIds,
  getMatchDetails,
  PLATFORM_TO_REGION,
} from '@/lib/riot';
import {
  upsertPlayer,
  getExistingMatchIds,
  saveMatch,
} from '@/lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      gameName,
      tagLine,
      platform = 'tr1',
      puuid: existingPuuid,
      count = 20,
    } = body;

    // ── 1. Profil çek ───────────────────────────────────────
    let profile;
    if (existingPuuid) {
      // PUUID verilmişse direkt kullan
      const region = PLATFORM_TO_REGION[platform] || 'europe';
      const matchIds = await getMatchIds(existingPuuid, region, count);
      profile = { puuid: existingPuuid, platform, region, recentMatchIds: matchIds || [] };
    } else if (gameName && tagLine) {
      profile = await getFullProfile(gameName, tagLine, platform);
      if (!profile) {
        return NextResponse.json(
          { error: `Oyuncu bulunamadı: ${gameName}#${tagLine}` },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'gameName+tagLine veya puuid gerekli' },
        { status: 400 }
      );
    }

    // ── 2. Player upsert ────────────────────────────────────
    if (profile.gameName) {
      await upsertPlayer(profile);
    }

    // ── 3. Yeni matchId'leri filtrele ──────────────────────
    const allIds     = profile.recentMatchIds || [];
    const existingSet = await getExistingMatchIds(allIds);
    const newIds      = allIds.filter((id) => !existingSet.has(id));

    if (!newIds.length) {
      return NextResponse.json({
        message: 'Tüm maçlar zaten senkronize.',
        synced: 0,
        total: allIds.length,
      });
    }

    // ── 4. Maç detaylarını çek ve kaydet ───────────────────
    const details = await getMatchDetails(newIds, profile.region);
    let saved = 0;
    const errors = [];

    for (const matchJson of details) {
      try {
        await saveMatch(matchJson);
        saved++;
      } catch (err) {
        errors.push({ matchId: matchJson.metadata?.match_id, error: err.message });
      }
    }

    return NextResponse.json({
      message: `${saved}/${newIds.length} yeni maç senkronize edildi.`,
      synced:  saved,
      skipped: allIds.length - newIds.length,
      errors:  errors.length ? errors : undefined,
      puuid:   profile.puuid,
    });

  } catch (err) {
    console.error('[sync] Hata:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
