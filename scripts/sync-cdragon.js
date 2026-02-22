/**
 * TFT CDragon Static Data Sync Script
 * 
 * Bu betik, CommunityDragon (CDragon) üzerinden güncel setin
 * (örn: Set 14) veri dosyalarını çeker ve Supabase DB'deki 
 * static_units, static_items, static_augments, static_traits tablolarına yazar.
 * 
 * Kullanım:
 * node scripts/sync-cdragon.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Güncel Set Numarası
const ACTIVE_SET = '14';
const CDRAGON_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/tr_tr.json';

async function syncCdragon() {
  console.log('🔄 CDragon verileri çekiliyor...');
  try {
    const res = await fetch(CDRAGON_URL);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    const data = await res.json();

    // items.json, set.json gibi ayrı statik JSON yapıları communitydragon'da mevcut
    // tr_tr.json yapısı içerisinde items ve set data propertyleri bulunur.
    const items = data.items || [];
    const sets = data.setData || [];

    const activeSetData = sets.find(s => String(s.number) === ACTIVE_SET || s.mutator === `TFTSet${ACTIVE_SET}`);
    if (!activeSetData) {
      console.warn(`⚠️ Set ${ACTIVE_SET} verisi bulunamadı. Lütfen set sürümünü kontrol edin.`);
      return;
    }

    console.log(`✅ Set ${ACTIVE_SET} verisi bulundu. Tablolara yazılıyor...`);

    // 1. Şampiyonları Kaydet (static_units)
    const unitsList = activeSetData.champions || [];
    const unitsRows = unitsList.map(u => ({
      id: u.apiName,
      name: u.name,
      cost: u.cost,
      traits: u.traits || [],
      abilities: u.ability || {},
      patch: 'latest',
      source: 'cdragon'
    })).filter(u => u.id && u.name); // Pet vb. dummy unitleri ufak filtrele

    if (unitsRows.length > 0) {
      const { error } = await supabase.from('static_units').upsert(unitsRows, { onConflict: 'id' });
      if (error) console.error('❌ Units Error:', error.message);
      else console.log(`✅ ${unitsRows.length} şampiyon eklendi/güncellendi.`);
    }

    // 2. Traitleri Kaydet (static_traits)
    const traitsList = activeSetData.traits || [];
    const traitsRows = traitsList.map(t => ({
      id: t.apiName,
      name: t.name,
      description: t.desc || '',
      effects: t.effects || [],
      patch: 'latest'
    })).filter(t => t.id && t.name);

    if (traitsRows.length > 0) {
      const { error } = await supabase.from('static_traits').upsert(traitsRows, { onConflict: 'id' });
      if (error) console.error('❌ Traits Error:', error.message);
      else console.log(`✅ ${traitsRows.length} trait eklendi/güncellendi.`);
    }

    // 3. Eşyaları ve Eklentileri Kaydet (static_items, static_augments)
    // augments ve items genelde items.json içerisinde karışık gelir. typeof veya id ile ayırabiliriz.
    const itemRows = [];
    const augmentRows = [];

    items.forEach(item => {
      // Eklentiler (Augments) genelde "TFT14_Augment_...", "TFT_Augment..." prefixi ile gelir
      if (item.apiName.includes('Augment') || item.icon?.toLowerCase().includes('augment')) {
        augmentRows.push({
          id: item.apiName,
          name: item.name,
          description: item.desc || '',
          rarity: 1, // Bunu cdRagon icon color veya metadata'dan maplemek gerekebilir
          effects: item.effects || {},
          patch: 'latest'
        });
      } else {
        // Normal eşyalar
        itemRows.push({
          id: item.apiName,
          name: item.name,
          description: item.desc || '',
          effects: item.effects || {},
          composition: item.composition || [],
          patch: 'latest'
        });
      }
    });

    if (itemRows.length > 0) {
      // Upsert yavaş/limitliyse parçalara böl (chunk)
      const chunkSize = 500;
      for (let i = 0; i < itemRows.length; i += chunkSize) {
        const chunk = itemRows.slice(i, i + chunkSize);
        const { error } = await supabase.from('static_items').upsert(chunk, { onConflict: 'id' });
        if (error) console.error('❌ Items Error:', error.message);
      }
      console.log(`✅ ${itemRows.length} eşya eklendi/güncellendi.`);
    }

    if (augmentRows.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < augmentRows.length; i += chunkSize) {
        const chunk = augmentRows.slice(i, i + chunkSize);
        const { error } = await supabase.from('static_augments').upsert(chunk, { onConflict: 'id' });
        if (error) console.error('❌ Augments Error:', error.message);
      }
      console.log(`✅ ${augmentRows.length} eklenti (augment) eklendi/güncellendi.`);
    }

    console.log('🎉 CDragon senkronizasyonu tamamlandı!');
  } catch (err) {
    console.error('❌ Fatal Error:', err.message);
  }
}

syncCdragon();
