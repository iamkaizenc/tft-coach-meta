import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Challenger/GM/Master maçlarındaki tahtaları analiz edip "Kompozisyon" çıkarır.
 */
export async function runMetaAggregation() {
    console.log('[Meta Analyzer] Kümeleme başlıyor...');

    // 1. Son 24 saat içinde oynanmış Challenger/GM ligindeki oyuncuların maçlarını çek
    const { data: dbMatches, error } = await supabase
        .from('participants')
        .select('match_id, puuid, placement, units, traits, augments')
        // Pratikte join(matches, leaderboard_players) yapılarak çekilmeli
        // ya da yüksek elo flag'i atılmalı. Şimdilik limit 2000:
        .order('placement', { ascending: true })
        .limit(2000);

    if (error || !dbMatches) throw new Error('Maç verisi alınamadı');

    console.log(`[Meta Analyzer] İşlenecek tahta sayısı: ${dbMatches.length}`);

    const comps = {}; // { 'ahri_syndra': { count, winCount, top4Count, totalPlacement, ... } }
    const unitsMap = {};
    const augmentsMap = {};
    const itemsMap = {};

    dbMatches.forEach(p => {
        // ---- 1. Birim İstatistikleri ----
        (p.units || []).forEach(u => {
            const uId = u.character_id;
            if (!unitsMap[uId]) unitsMap[uId] = { count: 0, sumPlace: 0, winCount: 0 };
            unitsMap[uId].count++;
            unitsMap[uId].sumPlace += p.placement;
            if (p.placement === 1) unitsMap[uId].winCount++;

            // Eşyalar
            (u.itemNames || []).forEach(item => {
                if (!itemsMap[item]) itemsMap[item] = { count: 0, sumPlace: 0, winCount: 0 };
                itemsMap[item].count++;
                itemsMap[item].sumPlace += p.placement;
                if (p.placement === 1) itemsMap[item].winCount++;
            });
        });

        // ---- 2. Eklenti İstatistikleri ----
        (p.augments || []).forEach(aug => {
            if (!augmentsMap[aug]) augmentsMap[aug] = { count: 0, sumPlace: 0, winCount: 0 };
            augmentsMap[aug].count++;
            augmentsMap[aug].sumPlace += p.placement;
            if (p.placement === 1) augmentsMap[aug].winCount++;
        });

        // ---- 3. Kompozisyon Kümeleme (Basitleştirilmiş) ----
        // Tahtadaki 4 ve 5 maliyetli (veya elindeki en yüksek tier) şampiyonları "Core" kabul edebiliriz.
        // Şimdilik sadece aktif trait'leri (tier_current > 0) alıp string birleştirerek imza çıkarıyoruz
        const activeTraits = (p.traits || [])
            .filter(t => t.tier_current > 0)
            .sort((a, b) => b.tier_current - a.tier_current)
            .slice(0, 3) // En yüksek seviyeli 3 trait comp adını belirlesin
            .map(t => t.name.replace('TFT14_', ''));

        if (activeTraits.length === 0) return;

        const compId = activeTraits.join('_').toLowerCase();

        if (!comps[compId]) {
            comps[compId] = {
                name: activeTraits.join(' '),
                count: 0,
                sumPlace: 0,
                winCount: 0,
                coreTarget: p.units.map(u => u.character_id).slice(0, 4) // Örnek core objesi
            };
        }

        comps[compId].count++;
        comps[compId].sumPlace += p.placement;
        if (p.placement === 1) comps[compId].winCount++;
    });

    // DB'ye yazma işlemi
    const totalGames = dbMatches.length;

    // 1. Meta Comps Kaydet
    const compRows = Object.keys(comps).map(k => {
        const c = comps[k];
        const pickRate = (c.count / totalGames) * 100;
        const winRate = (c.winCount / c.count) * 100;
        const avgPlace = c.sumPlace / c.count;

        // Basit Tier Ataması
        let tier = 'C';
        if (avgPlace <= 3.8 && pickRate > 5) tier = 'S';
        else if (avgPlace <= 4.2 && pickRate > 3) tier = 'A';
        else if (avgPlace <= 4.5 && pickRate > 1.5) tier = 'B';

        return {
            id: k,
            name: c.name,
            tier,
            core_units: c.coreTarget,
            pick_rate: pickRate.toFixed(2),
            win_rate: winRate.toFixed(2),
            avg_placement: avgPlace.toFixed(2),
            match_count: c.count,
            patch: 'latest' // Gerçek senaryoda Riot'un Info objesinden game_version çıkarılır
        };
    }).filter(c => c.match_count >= 10); // Noise filtresi (en az 10 maç)

    await supabase.from('meta_comps').upsert(compRows, { onConflict: 'id' });

    // ... Benzer şekilde meta_units, meta_augments yazdırılır (Demo olduğu için burada kesiyorum)
    console.log(`[Meta Analyzer] ${compRows.length} kompozisyon meta_comps'a kaydedildi.`);
    return { success: true, compsAnalized: compRows.length };
}
