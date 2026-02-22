/**
 * Supabase DB Client + TFT veri erişim katmanı
 */

import { createClient } from '@supabase/supabase-js';
import {
  calcTempoScore,
  calcEconScore,
  calcSynergyScore,
} from './analysis.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // server-side → service role
);

export default supabase;

// ── Player işlemleri ──────────────────────────────────────

export async function upsertPlayer(profile) {
  const { error } = await supabase.from('players').upsert(
    {
      puuid:          profile.puuid,
      game_name:      profile.gameName,
      tag_line:       profile.tagLine,
      platform:       profile.platform,
      region:         profile.region,
      summoner_id:    profile.summonerId,
      rank_tier:      profile.rank?.tier,
      rank_division:  profile.rank?.division,
      lp:             profile.rank?.lp,
      last_sync_at:   new Date().toISOString(),
    },
    { onConflict: 'puuid' }
  );
  if (error) throw error;
}

export async function getPlayer(puuid) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('puuid', puuid)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getAllPlayers() {
  const { data, error } = await supabase.from('players').select('*');
  if (error) throw error;
  return data;
}

// ── Match işlemleri ───────────────────────────────────────

/**
 * Hangi matchId'ler zaten DB'de? (gereksiz API çağrısını önler)
 */
export async function getExistingMatchIds(matchIds) {
  const { data, error } = await supabase
    .from('matches')
    .select('match_id')
    .in('match_id', matchIds);
  if (error) throw error;
  return new Set(data.map((r) => r.match_id));
}

/**
 * Ham Riot match JSON'unu normalize edip DB'ye yaz
 */
export async function saveMatch(matchJson) {
  const info = matchJson.info;

  // matches tablosu
  const { error: matchError } = await supabase.from('matches').upsert(
    {
      match_id:        matchJson.metadata.match_id,
      game_datetime:   new Date(info.game_datetime).toISOString(),
      game_length:     Math.round(info.game_length),
      game_version:    info.game_version,
      queue_id:        info.queue_id,
      tft_set_number:  info.tft_set_number,
    },
    { onConflict: 'match_id' }
  );
  if (matchError) throw matchError;

  // participants tablosu
  const rows = info.participants.map((p) => {
    const tempoScore   = calcTempoScore(p);
    const econScore    = calcEconScore(p);
    const synergyScore = calcSynergyScore(p);

    return {
      match_id:                matchJson.metadata.match_id,
      puuid:                   p.puuid,
      placement:               p.placement,
      level:                   p.level,
      gold_left:               p.gold_left,
      last_round:              p.last_round,
      players_eliminated:      p.players_eliminated,
      damage_to_players:       p.total_damage_to_players,
      total_damage_to_players: p.total_damage_to_players,
      time_eliminated:         p.time_eliminated,
      augments:                p.augments    || [],
      traits:                  p.traits      || [],
      units:                   p.units       || [],
      tempo_score:             tempoScore,
      econ_score:              econScore,
      synergy_score:           synergyScore,
    };
  });

  const { error: partError } = await supabase
    .from('participants')
    .upsert(rows, { onConflict: 'match_id,puuid' });
  if (partError) throw partError;

  return rows.length;
}

// ── Report sorgular ───────────────────────────────────────

/**
 * Oyuncunun son N maç katılımını çek
 */
export async function getPlayerParticipants(puuid, limit = 20) {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      matches ( game_datetime, game_version, tft_set_number )
    `)
    .eq('puuid', puuid)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * player_stats view'ından özet çek
 */
export async function getPlayerStats(puuid) {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('puuid', puuid)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Placement timeline (grafik için)
 */
export async function getPlacementTimeline(puuid, limit = 30) {
  const { data, error } = await supabase
    .from('participants')
    .select('placement, created_at, matches(game_datetime)')
    .eq('puuid', puuid)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse(); // eski → yeni
}
