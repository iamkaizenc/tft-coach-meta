/**
 * GET /api/tft/report?puuid=...&limit=20
 * Oyuncunun koçluk raporunu döner.
 */

import { NextResponse } from 'next/server';
import {
  getPlayerParticipants,
  getPlayerStats,
  getPlacementTimeline,
} from '@/lib/db';
import { analyzePlayer } from '@/lib/analysis';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const puuid = searchParams.get('puuid');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!puuid) {
      return NextResponse.json({ error: 'puuid parametresi gerekli' }, { status: 400 });
    }

    const [participants, stats, timeline] = await Promise.all([
      getPlayerParticipants(puuid, limit),
      getPlayerStats(puuid),
      getPlacementTimeline(puuid, limit),
    ]);

    if (!participants.length) {
      return NextResponse.json(
        { error: 'Oyuncu için kayıtlı maç bulunamadı. Önce /api/tft/sync çalıştır.' },
        { status: 404 }
      );
    }

    const analysis = analyzePlayer(participants);

    return NextResponse.json({
      player:   stats,
      analysis,
      timeline,
    });

  } catch (err) {
    console.error('[report] Hata:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
