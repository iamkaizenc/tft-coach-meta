import { NextResponse } from 'next/server';
import { getLeagueEntries, getPuuidByRiotId, PLATFORM_TO_REGION, getMatchIds } from '@/lib/riot';
import { createClient } from '@supabase/supabase-js';
import { runMetaAggregation } from '@/lib/meta-analyzer';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform') || 'tr1';
    const tier = searchParams.get('tier') || 'CHALLENGER'; // CHALLENGER, GRANDMASTER, MASTER

    try {
        console.log(`[Ladder Cron] Fetching ${tier} for ${platform}...`);
        const leagueData = await getLeagueEntries(tier, platform);

        if (!leagueData || !leagueData.entries) {
            return NextResponse.json({ error: `League data not found for ${tier} ${platform}` }, { status: 404 });
        }

        // İlk 50 oyuncuyu alalım (Vercel cron süresi sınırlı olduğu için)
        // Gerçek bir sistemde daha uzun süreli arkaplan task manager gerekir
        const entriesToSync = leagueData.entries
            .sort((a, b) => b.leaguePoints - a.leaguePoints)
            .slice(0, 50);

        const region = PLATFORM_TO_REGION[platform] || 'europe';
        const results = [];

        for (const entry of entriesToSync) {
            try {
                // PUUID çek (Riot ID'ye çevirmiyoruz, summonerId'den bulmak için ekstra endpoint lazım
                // Ama account v1'da by-riot-id istiyor. TFT League v1 şu an summonerId veriyor.
                // O yüzden Summoner v1 by-summoner kullanıp oradan puuid alacağız.)
                const summonerRes = await fetch(`https://${platform}.api.riotgames.com/tft/summoner/v1/summoners/${entry.summonerId}`, {
                    headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
                });

                if (!summonerRes.ok) {
                    results.push({ summoner: entry.summonerName, error: 'Summoner not found' });
                    continue;
                }

                const summonerData = await summonerRes.json();
                const puuid = summonerData.puuid;

                // Leaderboard tablosuna ekle
                await supabase.from('leaderboard_players').upsert({
                    puuid,
                    summoner_id: entry.summonerId,
                    region: platform,
                    tier: tier,
                    lp: entry.leaguePoints,
                    last_sync_at: new Date().toISOString()
                }, { onConflict: 'puuid' });

                // Son 10 maçını çek
                const matchIds = await getMatchIds(puuid, region, 10);

                // Bu maçların DB'de olmayanlarını sync etmek için mevcut sync logic veya 
                // doğrudan /api/tft/sync'e internal istek atılabilir.

                results.push({ puuid, matchCount: matchIds.length, status: 'scraped' });

            } catch (err) {
                results.push({ summoner: entry.summonerName, error: err.message });
            }
        }

        // --- EKLENEN KISIM: Scrape bittikten sonra meta analyzer çalışsın ---
        let aggregationResult = null;
        try {
            aggregationResult = await runMetaAggregation();
        } catch (aggErr) {
            console.error('[Ladder Cron] Aggregation Error:', aggErr);
        }

        return NextResponse.json({
            ok: true,
            synced: results.length,
            results,
            aggregation: aggregationResult
        });

    } catch (error) {
        console.error('[Ladder Cron] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

