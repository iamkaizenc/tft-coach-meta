/**
 * CDragon Static Data Pipeline
 * TFT set verisini Community Dragon CDN'den çeker ve normalize eder.
 *
 * Kaynak: https://raw.communitydragon.org/latest/cdragon/tft/
 * Alternatif: Data Dragon (ddragon.leagueoflegends.com)
 */

import supabase from './db.js';

// ── CDragon URL'leri ────────────────────────────────────────
const CDRAGON_BASE = 'https://raw.communitydragon.org/latest/cdragon/tft';
const CDRAGON_ICON_BASE = 'https://raw.communitydragon.org/latest/game';

// TFT set verisi endpoint'leri
const ENDPOINTS = {
  // Ana TFT data (tüm set bilgisi)
  tftData: `${CDRAGON_BASE}/en_us.json`,
  // Türkçe versiyon (isimler için)
  tftDataTr: `${CDRAGON_BASE}/tr_tr.json`,
};

// ── In-memory cache (24 saat TTL) ───────────────────────────
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ── Fetch helper ────────────────────────────────────────────
async function fetchJson(url) {
  const cached = cacheGet(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`CDragon fetch failed: ${res.status} ${url}`);
  }

  const data = await res.json();
  cacheSet(url, data);
  return data;
}

// ── Icon URL dönüştürücü ────────────────────────────────────
// CDragon path: "ASSETS/Maps/Particles/TFT/..." → tam URL
function resolveIconUrl(path) {
  if (!path) return null;
  // CDragon path'leri lowercase ve / ile başlar
  const cleaned = path.toLowerCase().replace(/\.tex$/, '.png').replace(/\.dds$/, '.png');
  return `${CDRAGON_ICON_BASE}/${cleaned}`;
}

// ── Set numarasını patch'ten çıkar ──────────────────────────
function extractSetFromVersion(version) {
  // version: "Version 14.23.123.456" → set 13 gibi
  // CDragon'da setNumber doğrudan gelir
  return null; // CDragon verisinden alınacak
}

// ── Ana Parser: TFT Data ────────────────────────────────────

/**
 * CDragon'dan TFT set verisini çek ve parse et
 * @param {string} lang - "en_us" veya "tr_tr"
 * @returns {object} { sets, items }
 */
export async function fetchTFTData(lang = 'en_us') {
  const url = `${CDRAGON_BASE}/${lang}.json`;
  const data = await fetchJson(url);
  return data;
}

/**
 * Aktif set'in verilerini çek
 * @returns {object} { setNumber, units, traits, augments, items }
 */
export async function getActiveSetData() {
  const enData = await fetchTFTData('en_us');
  let trData;
  try {
    trData = await fetchTFTData('tr_tr');
  } catch {
    trData = null; // Türkçe yoksa İngilizce kullan
  }

  // En son set'i bul
  const setNumbers = Object.keys(enData.sets || {}).map(Number).sort((a, b) => b - a);
  const activeSetNum = setNumbers[0];
  const activeSet = enData.sets[activeSetNum];

  if (!activeSet) {
    throw new Error(`Aktif set bulunamadı. Mevcut setler: ${setNumbers.join(', ')}`);
  }

  const trSet = trData?.sets?.[activeSetNum];

  // Türkçe isim eşleştirme haritası
  const trUnitMap = new Map();
  const trTraitMap = new Map();
  if (trSet) {
    (trSet.champions || []).forEach(c => trUnitMap.set(c.apiName, c.name));
    (trSet.traits || []).forEach(t => trTraitMap.set(t.apiName, t.name));
  }

  // Units parse
  const units = (activeSet.champions || []).map(champ => ({
    id: champ.apiName,                           // "TFT14_Ahri"
    name: trUnitMap.get(champ.apiName) || champ.name,
    cost: champ.cost,
    traits: (champ.traits || []),
    abilities: champ.ability ? {
      name: champ.ability.name,
      desc: champ.ability.desc,
      icon: resolveIconUrl(champ.ability.icon),
    } : null,
    icon_url: resolveIconUrl(champ.icon || champ.squareIcon),
    internal_name: champ.apiName,
  }));

  // Traits parse
  const traits = (activeSet.traits || []).map(trait => ({
    id: trait.apiName,
    name: trTraitMap.get(trait.apiName) || trait.name,
    description: trait.desc,
    effects: (trait.effects || []).map(e => ({
      min_units: e.minUnits,
      max_units: e.maxUnits,
      style: e.style,
      variables: e.variables,
    })),
    icon_url: resolveIconUrl(trait.icon),
    internal_name: trait.apiName,
  }));

  // Items parse (global, set-agnostik)
  const items = (enData.items || []).map(item => ({
    id: item.apiName || item.id?.toString(),
    name: item.name,
    description: item.desc,
    effects: item.effects || {},
    composition: item.composition || [],
    icon_url: resolveIconUrl(item.icon),
    internal_name: item.apiName || item.id?.toString(),
  }));

  // Augments parse (setItems veya ayrı augment listesinden)
  const augments = (enData.items || [])
    .filter(item => item.apiName?.includes('Augment') || item.apiName?.includes('augment'))
    .map(aug => ({
      id: aug.apiName,
      name: aug.name,
      description: aug.desc,
      rarity: aug.apiName?.includes('Prismatic') || aug.apiName?.includes('III') ? 3 :
              aug.apiName?.includes('Gold') || aug.apiName?.includes('II') ? 2 : 1,
      effects: aug.effects || {},
      icon_url: resolveIconUrl(aug.icon),
      internal_name: aug.apiName,
    }));

  return {
    setNumber: activeSetNum,
    setName: activeSet.name || `Set ${activeSetNum}`,
    units,
    traits,
    items: items.filter(i => !i.id?.includes('Augment')), // Augment'leri ayır
    augments,
  };
}

// ── DB'ye Kaydet ────────────────────────────────────────────

/**
 * CDragon verisini DB'ye yaz (upsert)
 * @param {string} patch - "14.23" gibi
 */
export async function populateStaticTables(patch = 'latest') {
  const data = await getActiveSetData();
  const results = { units: 0, traits: 0, items: 0, augments: 0, errors: [] };

  // Units
  if (data.units.length) {
    const rows = data.units.map(u => ({
      id: u.id,
      name: u.name,
      cost: u.cost,
      traits: u.traits,
      abilities: u.abilities,
      icon_url: u.icon_url,
      internal_name: u.internal_name,
      patch,
      source: 'cdragon',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('static_units').upsert(rows, { onConflict: 'id' });
    if (error) results.errors.push({ table: 'static_units', error: error.message });
    else results.units = rows.length;
  }

  // Traits
  if (data.traits.length) {
    const rows = data.traits.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      effects: t.effects,
      icon_url: t.icon_url,
      internal_name: t.internal_name,
      patch,
      source: 'cdragon',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('static_traits').upsert(rows, { onConflict: 'id' });
    if (error) results.errors.push({ table: 'static_traits', error: error.message });
    else results.traits = rows.length;
  }

  // Items
  if (data.items.length) {
    const rows = data.items.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      effects: i.effects,
      composition: i.composition,
      icon_url: i.icon_url,
      internal_name: i.internal_name,
      patch,
      source: 'cdragon',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('static_items').upsert(rows, { onConflict: 'id' });
    if (error) results.errors.push({ table: 'static_items', error: error.message });
    else results.items = rows.length;
  }

  // Augments
  if (data.augments.length) {
    const rows = data.augments.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      rarity: a.rarity,
      effects: a.effects,
      icon_url: a.icon_url,
      internal_name: a.internal_name,
      patch,
      source: 'cdragon',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('static_augments').upsert(rows, { onConflict: 'id' });
    if (error) results.errors.push({ table: 'static_augments', error: error.message });
    else results.augments = rows.length;
  }

  return {
    setNumber: data.setNumber,
    setName: data.setName,
    patch,
    ...results,
  };
}

/**
 * Belirli bir unit'in static verisini çek (cache'den veya DB'den)
 */
export async function getStaticUnit(unitId) {
  const { data } = await supabase.from('static_units').select('*').eq('id', unitId).single();
  return data;
}

/**
 * Tüm aktif set unit'lerini çek
 */
export async function getAllStaticUnits() {
  const { data } = await supabase.from('static_units').select('*').order('cost');
  return data || [];
}

/**
 * Tüm aktif set trait'lerini çek
 */
export async function getAllStaticTraits() {
  const { data } = await supabase.from('static_traits').select('*').order('name');
  return data || [];
}
