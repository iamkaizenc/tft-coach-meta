'use client';

export default function ItemsStatsPage() {
    const items = [
        { id: 'BlueBuff', name: 'Mavi Güçlendirme', winRate: 20.2, pickRate: 45.1, avg: 3.1 },
        { id: 'JeweledGauntlet', name: 'Mücevherli Eldiven', winRate: 18.5, pickRate: 35.5, avg: 3.4 },
    ];

    return (
        <div className="max-w-6xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-6">Eşya İstatistikleri</h1>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-800/50 border-b border-gray-800">
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Eşya</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Pick %</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Win %</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ort. Sıra</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                        {items.map((i, idx) => (
                            <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <img
                                        src={`https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/${i.id.toLowerCase()}.png`}
                                        alt={i.name}
                                        className="w-10 h-10 rounded border border-gray-700 bg-gray-950"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span className="font-semibold text-gray-200">{i.name}</span>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-300 font-medium">%{i.pickRate}</td>
                                <td className="px-6 py-4 text-right text-green-400 font-medium">%{i.winRate}</td>
                                <td className="px-6 py-4 text-right text-white font-bold">{i.avg}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
