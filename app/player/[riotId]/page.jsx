'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { StatCard } from '@/components/ui/StatCard';
import { ScoreBar } from '@/components/ui/ScoreBar';
import { CoachCard } from '@/components/player/CoachCard';
import { PlacementTimeline, PlacementDist } from '@/components/player/PlacementCharts';

export default function PlayerProfilePage({ params }) {
    const searchParams = useSearchParams();
    const rawId = params.riotId; // "Faker-TR1"
    const platform = searchParams.get('platform') || 'tr1';

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');

    // Sadece "-" ile parse ediyoruz
    const lastIndex = rawId.lastIndexOf('-');
    const gameName = rawId.substring(0, lastIndex);
    const tagLine = rawId.substring(lastIndex + 1);

    // İlk yüklemede mevcut raporu çek (eğer varsa)
    useEffect(() => {
        fetchReport(false);
    }, [rawId]);

    async function fetchReport(forceSync = false) {
        if (!gameName || !tagLine) {
            setError('Geçersiz Riot ID formatı');
            setLoading(false);
            return;
        }

        if (forceSync) setSyncing(true);
        else setLoading(true);
        setError('');

        try {
            if (forceSync) {
                // Önce Riot'tan yeni verileri çek ve kaydet
                await fetch('/api/tft/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameName, tagLine, platform, count: 20 }),
                });
            }

            // Sync'ten DB'deki puuid'yi alalım
            const syncRes = await fetch('/api/tft/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameName, tagLine, platform, count: 20 }),
            });
            const syncData = await syncRes.json();

            if (!syncData.puuid) {
                throw new Error(syncData.error || 'Oyuncu bulunamadı (Önce senkronize edin)');
            }

            // Veritabanı raporunu çek
            const repRes = await fetch(`/api/tft/report?puuid=${syncData.puuid}&limit=20`);
            const repData = await repRes.json();

            if (!repRes.ok) throw new Error(repData.error || 'Rapor oluşturulamadı');
            setReport(repData);

        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    }

    const handleSyncButton = () => fetchReport(true);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-gray-400 animate-pulse flex items-center gap-3">
                    <span className="text-2xl">♟️</span> Profil yükleniyor...
                </div>
            </div>
        );
    }

    const rankStr = report?.player
        ? `${report.player.rank_tier || 'Unranked'} ${report.player.rank_division || ''} ${report.player.lp != null ? `(${report.player.lp} LP)` : ''}`.trim()
        : 'Unranked';

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            {/* Profil Başlığı */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {report?.player?.game_name || gameName}
                            <span className="text-gray-500 text-xl font-normal ml-1">#{report?.player?.tag_line || tagLine}</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="px-2.5 py-1 rounded bg-gray-800 text-xs font-semibold text-gray-300 border border-gray-700">
                                {platform.toUpperCase()}
                            </span>
                            <span className="text-indigo-400 font-medium text-sm">{rankStr}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSyncButton}
                            disabled={syncing}
                            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg px-4 py-2 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {syncing ? '🔄 Güncelleniyor...' : '📥 Verileri Güncelle (Sync)'}
                        </button>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-6 text-center text-red-400">
                    Upps: {error}
                </div>
            ) : report ? (
                <>
                    {/* Stat Kartları */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard
                            label="Ort. Placement"
                            value={report.analysis?.summary.avgPlacement}
                            color={report.analysis?.summary.avgPlacement <= 4 ? 'green' : 'red'}
                        />
                        <StatCard
                            label="Top4 %"
                            value={`%${report.analysis?.summary.top4Pct}`}
                            color={report.analysis?.summary.top4Pct >= 50 ? 'green' : 'yellow'}
                        />
                        <StatCard
                            label="Win %"
                            value={`%${report.analysis?.summary.winPct}`}
                            color="indigo"
                        />
                        <StatCard
                            label="İncelenen Maç"
                            value={report.analysis?.summary.totalGames}
                            color="indigo"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Timeline Grafiği */}
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                            <PlacementTimeline timeline={report.timeline} />
                        </div>

                        {/* Skor Dağılımları */}
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col justify-center">
                            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-6">Koçluk Puanları</h3>
                            <ScoreBar label="⚡ Tempo Yönetimi" score={report.analysis?.scores.tempo} />
                            <ScoreBar label="💰 Ekonomi Kullanımı" score={report.analysis?.scores.econ} />
                            <ScoreBar label="🔗 Sinerji & Board" score={report.analysis?.scores.synergy} />
                        </div>
                    </div>

                    {/* Koç Kartları */}
                    <div>
                        <h2 className="font-semibold text-gray-200 mb-4 px-1 text-lg">🃏 Yapay Zeka Koç Çıkarımları</h2>
                        <div className="grid sm:grid-cols-3 gap-4">
                            {report.analysis?.coachCards.map((card, i) => (
                                <CoachCard key={i} card={card} />
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* En İyi Eklentiler */}
                        {report.analysis?.augmentStats?.length > 0 && (
                            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4">Başarılı Eklentiler</h3>
                                <div className="space-y-3">
                                    {report.analysis.augmentStats.slice(0, 5).map((aug, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-800/60 last:border-0">
                                            <span className="text-gray-300 truncate pr-4">{aug.id.replace('TFT_Augment_', '').replace('TFT14_Augment_', '').replace(/_/g, ' ')}</span>
                                            <div className="flex gap-4 shrink-0 text-right">
                                                <div>
                                                    <p className="text-xs text-gray-500">Ort P.</p>
                                                    <p className="text-white font-medium">{aug.avgPlacement}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Kullanım</p>
                                                    <p className="text-indigo-400 font-medium">{aug.count}x</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* En İyi Traitler */}
                        {report.analysis?.traitStats?.length > 0 && (
                            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                                <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-4">Ağırlıklı Sinerjiler</h3>
                                <div className="space-y-3">
                                    {report.analysis.traitStats.slice(0, 5).map((t, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-800/60 last:border-0">
                                            <span className="text-gray-300 truncate pr-4">{t.name.replace('TFT14_', '').replace('TFT_', '')}</span>
                                            <div className="flex gap-4 shrink-0 text-right">
                                                <div>
                                                    <p className="text-xs text-gray-500">Top4</p>
                                                    <p className={`font-medium ${t.top4Pct >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>%{t.top4Pct}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Oyun</p>
                                                    <p className="text-indigo-400 font-medium">{t.count}x</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
}
