'use client';
import { CompHexBoard } from '@/components/meta/CompHexBoard';

export default function CompDetailPage({ params }) {
    // Demo veri (Normalde `/api/meta/comps/${params.id}` den çekilecek)
    const comp = {
        id: params.id,
        name: 'Mage Ahri Carry',
        tier: 'S',
        winRate: '18%',
        pickRate: '12%',
        avgPlacement: 3.2,
        traits: [
            { name: 'Mage', count: 4, style: 'gold' },
            { name: 'Bastion', count: 2, style: 'bronze' }
        ],
        units: [
            { id: 'TFT14_Ahri', hex: [3, 3], items: ['BlueBuff', 'JeweledGauntlet', 'RabadonsDeathcap'] },
            { id: 'TFT14_Syndra', hex: [3, 2], items: ['Shojin'] },
            { id: 'TFT14_Taric', hex: [0, 3], items: ['GargoyleStoneplate', 'WarmogsArmor', 'DragonsClaw'] },
            { id: 'TFT14_Lillia', hex: [0, 4], items: [] },
            { id: 'TFT14_Nami', hex: [3, 4], items: [] },
        ]
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl mb-8 flex justify-between items-center">
                <div>
                    <div className="flex gap-3 items-center mb-2">
                        <span className="bg-red-500 text-white font-bold text-lg px-3 py-0.5 rounded shadow">{comp.tier}</span>
                        <h1 className="text-3xl font-bold text-white">{comp.name}</h1>
                    </div>
                    <div className="flex gap-2">
                        {comp.traits.map(t => (
                            <span key={t.name} className={`px-2.5 py-1 rounded text-xs font-bold border ${t.style === 'gold' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-500' :
                                    t.style === 'silver' ? 'bg-gray-700/50 border-gray-400 text-gray-300' :
                                        'bg-orange-900/50 border-orange-700 text-orange-400'
                                }`}>
                                {t.count} {t.name}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex gap-6 text-right">
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Pick %</p>
                        <p className="font-bold text-xl text-white">{comp.pickRate}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Win %</p>
                        <p className="font-bold text-xl text-green-400">{comp.winRate}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Ort. Sıra</p>
                        <p className="font-bold text-xl text-blue-400">{comp.avgPlacement}</p>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl p-6">
                        <h3 className="font-semibold text-lg text-white mb-4 border-b border-gray-800 pb-2">Geç Aşama Dizilimi (Late Game Board)</h3>
                        <CompHexBoard units={comp.units} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="font-semibold text-white mb-4">Önerilen Eklentiler (Augments)</h3>
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                                    <div className="w-10 h-10 bg-indigo-900 rounded flex items-center justify-center text-xs">A</div>
                                    <div>
                                        <p className="font-medium text-sm text-gray-200">Sihir Üstadı (Mage Crown)</p>
                                        <p className="text-xs text-green-400">Avg: 3.12</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
