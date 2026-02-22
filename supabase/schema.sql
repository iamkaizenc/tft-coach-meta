-- ============================================================
-- TFT Coach App — Supabase Schema (v2: MetaTFT-Benzeri)
-- ============================================================

-- Players tablosu: takip edilen oyuncular
CREATE TABLE IF NOT EXISTS players (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  puuid       TEXT UNIQUE NOT NULL,
  game_name   TEXT NOT NULL,
  tag_line    TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'tr1',   -- tr1, euw1, na1 vb.
  region      TEXT NOT NULL DEFAULT 'europe', -- europe, americas, asia
  summoner_id TEXT,
  rank_tier   TEXT,
  rank_division TEXT,
  lp          INT,
  last_sync_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Matches tablosu: maç meta verisi
CREATE TABLE IF NOT EXISTS matches (
  match_id      TEXT PRIMARY KEY,
  game_datetime TIMESTAMPTZ,
  game_length   INT,  -- saniye
  game_version  TEXT,
  queue_id      INT,
  tft_set_number INT,
  fetched_at    TIMESTAMPTZ DEFAULT now()
);

-- Participants tablosu: her oyuncunun maç detayı
CREATE TABLE IF NOT EXISTS participants (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id         TEXT REFERENCES matches(match_id) ON DELETE CASCADE,
  puuid            TEXT NOT NULL,
  placement        INT NOT NULL,           -- 1–8
  level            INT,
  gold_left        INT,
  last_round       INT,
  players_eliminated INT,
  damage_to_players  INT,
  total_damage_to_players INT,
  time_eliminated  NUMERIC,
  augments         JSONB DEFAULT '[]',     -- ["TFT9_Augment_XYZ", ...]
  traits           JSONB DEFAULT '[]',     -- [{name, num_units, style, tier_current, tier_total}]
  units            JSONB DEFAULT '[]',     -- [{character_id, rarity, tier, items:[]}]
  -- Hesaplanan metrikler (analysis engine doldurur)
  tempo_score      NUMERIC,
  econ_score       NUMERIC,
  synergy_score    NUMERIC,
  -- v2: Comp detection
  comp_hash        TEXT,                   -- FK → comp_aggregation_log
  board_comp_json  JSONB,                  -- tam board state snapshot (units + items)
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, puuid)
);

-- İndeksler (mevcut)
CREATE INDEX IF NOT EXISTS idx_participants_puuid    ON participants(puuid);
CREATE INDEX IF NOT EXISTS idx_participants_match_id ON participants(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_datetime      ON matches(game_datetime DESC);

-- v2: Yeni indeksler
CREATE INDEX IF NOT EXISTS idx_participants_comp_hash ON participants(comp_hash);
CREATE INDEX IF NOT EXISTS idx_matches_set_number     ON matches(tft_set_number);
CREATE INDEX IF NOT EXISTS idx_matches_version        ON matches(game_version);

-- ============================================================
-- Static data: CDragon'dan çekilen set verisi (v2: genişletilmiş)
-- ============================================================

CREATE TABLE IF NOT EXISTS static_units (
  id            TEXT PRIMARY KEY,  -- "TFT14_Ahri" vb.
  name          TEXT,
  cost          INT,
  traits        JSONB DEFAULT '[]',
  abilities     JSONB,
  icon_url      TEXT,              -- CDragon CDN linki
  internal_name TEXT,              -- Riot internal name
  patch         TEXT,
  source        TEXT DEFAULT 'cdragon',
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS static_items (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  description   TEXT,
  effects       JSONB,
  composition   JSONB DEFAULT '[]',  -- bileşen item'lar
  icon_url      TEXT,
  internal_name TEXT,
  patch         TEXT,
  source        TEXT DEFAULT 'cdragon',
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS static_augments (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  description   TEXT,
  rarity        INT,  -- 1=silver 2=gold 3=prismatic
  effects       JSONB,
  icon_url      TEXT,
  internal_name TEXT,
  patch         TEXT,
  source        TEXT DEFAULT 'cdragon',
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS static_traits (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  description   TEXT,
  effects       JSONB DEFAULT '[]',  -- [{min_units, style, ...}]
  icon_url      TEXT,
  internal_name TEXT,
  patch         TEXT,
  source        TEXT DEFAULT 'cdragon',
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- v2: Meta Analiz Tabloları
-- ============================================================

-- Comp Aggregation: Tespit edilen kompozisyonların toplu istatistikleri
CREATE TABLE IF NOT EXISTS comp_aggregation_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comp_hash       TEXT UNIQUE NOT NULL,         -- deterministic hash (sorted unit IDs)
  comp_name       TEXT,                          -- otonom isim: "Dragons / Fire" vb.
  units_in_comp   JSONB DEFAULT '[]',            -- [{id, cost, name}]
  traits_in_comp  JSONB DEFAULT '[]',            -- [{name, num_units, style}]
  tier            TEXT DEFAULT 'C',              -- S / A / B / C
  pick_rate       NUMERIC DEFAULT 0,
  win_rate        NUMERIC DEFAULT 0,
  avg_placement   NUMERIC DEFAULT 0,
  top4_rate       NUMERIC DEFAULT 0,
  games_count     INT DEFAULT 0,
  sample_match_id TEXT,                          -- örnek maç (board görüntüsü için)
  tft_set_number  INT,
  patch           TEXT,
  meta_tags       JSONB DEFAULT '[]',            -- ["tempo","late-game","reroll"] vb.
  suggested_items JSONB DEFAULT '{}',            -- {unitId: [item1, item2]}
  suggested_augments JSONB DEFAULT '[]',         -- [{id, avg_placement, pick_rate}]
  last_updated    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_agg_tier   ON comp_aggregation_log(tier);
CREATE INDEX IF NOT EXISTS idx_comp_agg_set    ON comp_aggregation_log(tft_set_number);
CREATE INDEX IF NOT EXISTS idx_comp_agg_patch  ON comp_aggregation_log(patch);

-- Comp ↔ Match köprü tablosu
CREATE TABLE IF NOT EXISTS comp_matches (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comp_hash   TEXT NOT NULL,
  match_id    TEXT REFERENCES matches(match_id) ON DELETE CASCADE,
  puuid       TEXT NOT NULL,
  placement   INT NOT NULL,
  units       JSONB DEFAULT '[]',              -- exact board state
  items       JSONB DEFAULT '[]',              -- [{unit_id, items:[]}]
  augments    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comp_hash, match_id, puuid)
);

CREATE INDEX IF NOT EXISTS idx_comp_matches_hash     ON comp_matches(comp_hash);
CREATE INDEX IF NOT EXISTS idx_comp_matches_match_id ON comp_matches(match_id);

-- Meta Snapshots: Günlük/haftalık meta snapshot'ları (trend analizi)
CREATE TABLE IF NOT EXISTS meta_snapshots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date   DATE NOT NULL,
  tft_set_number  INT,
  patch           TEXT,
  comps_snapshot  JSONB DEFAULT '[]',   -- [{comp_hash, tier, pick_rate, win_rate, avg_placement, games_count}]
  unit_stats      JSONB DEFAULT '[]',   -- [{unit_id, pick_rate, win_rate, avg_placement}]
  trait_stats     JSONB DEFAULT '[]',   -- [{trait_id, pick_rate, avg_placement}]
  item_stats      JSONB DEFAULT '[]',   -- [{item_id, pick_rate, win_rate}]
  augment_stats   JSONB DEFAULT '[]',   -- [{aug_id, pick_rate, avg_placement}]
  total_games     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, tft_set_number, patch)
);

CREATE INDEX IF NOT EXISTS idx_meta_snapshots_date ON meta_snapshots(snapshot_date DESC);

-- Ladder Sync Log: Challenger/GM/Master scraping takibi
CREATE TABLE IF NOT EXISTS ladder_sync_log (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier              TEXT NOT NULL,       -- CHALLENGER, GRANDMASTER, MASTER
  region            TEXT NOT NULL,       -- europe, americas, asia, sea
  players_scraped   INT DEFAULT 0,
  matches_fetched   INT DEFAULT 0,
  last_sync         TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tier, region)
);

-- ============================================================
-- Views
-- ============================================================

-- Oyuncu özet istatistikleri
CREATE OR REPLACE VIEW player_stats AS
SELECT
  p.puuid,
  pl.game_name,
  pl.tag_line,
  COUNT(*)                                          AS total_games,
  ROUND(AVG(p.placement)::numeric, 2)               AS avg_placement,
  ROUND(SUM(CASE WHEN p.placement <= 4 THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) AS top4_pct,
  ROUND(SUM(CASE WHEN p.placement = 1  THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) AS win_pct,
  ROUND(AVG(p.tempo_score)::numeric, 2)             AS avg_tempo,
  ROUND(AVG(p.econ_score)::numeric, 2)              AS avg_econ,
  ROUND(AVG(p.synergy_score)::numeric, 2)           AS avg_synergy,
  MAX(m.game_datetime)                              AS last_game
FROM participants p
JOIN matches m  ON p.match_id = m.match_id
JOIN players pl ON p.puuid    = pl.puuid
GROUP BY p.puuid, pl.game_name, pl.tag_line;

-- v2: Meta comp özet view'ı (hızlı sorgu için)
CREATE OR REPLACE VIEW meta_comps_summary AS
SELECT
  c.comp_hash,
  c.comp_name,
  c.units_in_comp,
  c.traits_in_comp,
  c.tier,
  c.pick_rate,
  c.win_rate,
  c.avg_placement,
  c.top4_rate,
  c.games_count,
  c.suggested_items,
  c.suggested_augments,
  c.meta_tags,
  c.tft_set_number,
  c.patch,
  c.last_updated
FROM comp_aggregation_log c
ORDER BY
  CASE c.tier
    WHEN 'S' THEN 1
    WHEN 'A' THEN 2
    WHEN 'B' THEN 3
    WHEN 'C' THEN 4
    ELSE 5
  END,
  c.avg_placement ASC;
