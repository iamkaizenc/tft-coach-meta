/**
 * GET /api/meta/snapshots
 *
 * Tarihsel Meta Trend API
 *
 * Query params:
 *   days  - kaç gün geriye bak (default: 7, max: 30)
 *   set   - TFT set numarası (opsiyonel)
 */

import { NextResponse } from 'next/server';
import supabase from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(30, Math.max(1, parseInt(searchParams.get('days') || '7', 10)));
    const set  = searchParams.get('set');

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = supabase
      .from('meta_snapshots')
      .select('*')
      .gte('snapshot_date', since)
      .order('snapshot_date', { ascending: true });

    if (set) {
      query = query.eq('tft_set_number', parseInt(set, 10));
    }

    const { data: snapshots, error } = await query;
    if (error) throw error;

    // Meta shift analizi (dünün S/A tier'ı vs bugünün)
    let metaShifts = null;
    if (snapshots?.length >= 2) {
      const latest = snapshots[snapshots.length - 1];
      const previous = snapshots[snapshots.length - 2];

      const latestComps = new Map((latest.comps_snapshot || []).map(c => [c.comp_hash, c]));
      const prevComps = new Map((previous.comps_snapshot || []).map(c => [c.comp_hash, c]));

      const rising = [];
      const falling = [];
      const newComps = [];

      for (const [hash, comp] of latestComps) {
        const prev = prevComps.get(hash);
        if (!prev) {
          newComps.push(comp);
        } else {
          const tierOrder = { S: 1, A: 2, B: 3, C: 4 };
          const diff = (tierOrder[prev.tier] || 4) - (tierOrder[comp.tier] || 4);
          if (diff > 0) rising.push({ ...comp, previousTier: prev.tier });
          if (diff < 0) falling.push({ ...comp, previousTier: prev.tier });
        }
      }

      metaShifts = { rising, falling, newComps };
    }

    return NextResponse.json({
      days,
      snapshots: (snapshots || []).map(s => ({
        date:          s.snapshot_date,
        tftSetNumber:  s.tft_set_number,
        patch:         s.patch,
        totalGames:    s.total_games,
        comps:         s.comps_snapshot || [],
        unitStats:     s.unit_stats || [],
        traitStats:    s.trait_stats || [],
        itemStats:     s.item_stats || [],
        augmentStats:  s.augment_stats || [],
      })),
      metaShifts,
    });

  } catch (err) {
    console.error('[meta/snapshots] Hata:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
