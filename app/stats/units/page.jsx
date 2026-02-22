'use client';

export default function UnitsStatsPage() {
    const units = [
        { id: 'TFT14_Ahri', name: 'Ahri', cost: 4, winRate: 18.2, pickRate: 12.1, avg: 3.2 },
        { id: 'TFT14_Syndra', name: 'Syndra', cost: 4, winRate: 15.1, pickRate: 9.5, avg: 3.5 },
    ];

    return (
        <div className="max-w-6xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-6">Şampiyon İstatistikleri</h1>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-800/50 border-b border-gray-800">
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Şampiyon</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Maliyet</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Pick %</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Win %</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ort. Sıra</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                        {units.map((u, idx) => (
                            <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <img
                                        src={`https://raw.communitydragon.org/latest/game/assets/characters/${u.id.toLowerCase()}/hud/${u.id.toLowerCase()}_square.tft_set14.png`}
                                        alt={u.name}
                                        className="w-10 h-10 rounded border border-gray-700 bg-gray-950"
                                        onError={(e) => { e.target.src = '/empty-champ.png'; }}
                                    />
                                    <span className="font-semibold text-gray-200">{u.name}</span>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-400 font-medium">{u.cost} Gold</td>
                                <td className="px-6 py-4 text-right text-gray-300 font-medium">%{u.pickRate}</td>
                                <td className="px-6 py-4 text-right text-green-400 font-medium">%{u.winRate}</td>
                                <td className="px-6 py-4 text-right text-white font-bold">{u.avg}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
