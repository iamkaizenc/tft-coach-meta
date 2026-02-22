'use client';

export default function AugmentsStatsPage() {
    const augments = [
        { id: 'TFT_Augment_Spellcaster', name: 'Sihir Üstadı', winRate: 15.2, pickRate: 8.1, avg: 3.5 },
        { id: 'TFT_Augment_RichGetRicher', name: 'Zengin Daha Zengin', winRate: 14.5, pickRate: 15.5, avg: 3.8 },
    ];

    return (
        <div className="max-w-6xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-6">Eklenti İstatistikleri</h1>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-800/50 border-b border-gray-800">
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Eklenti</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Pick %</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Win %</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ort. Sıra</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                        {augments.map((a, idx) => (
                            <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-900 rounded border border-gray-700 flex items-center justify-center font-bold text-gray-300">
                                        A
                                    </div>
                                    <span className="font-semibold text-gray-200">{a.name}</span>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-300 font-medium">%{a.pickRate}</td>
                                <td className="px-6 py-4 text-right text-green-400 font-medium">%{a.winRate}</td>
                                <td className="px-6 py-4 text-right text-white font-bold">{a.avg}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
