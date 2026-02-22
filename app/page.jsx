export default function MetaCompsPage() {
  // Demo veri (şimdilik)
  const comps = [
    { tier: 'S', name: 'Mage Ahrí Carry', pickRate: '12%', winRate: '18%', avg: 3.2 },
    { tier: 'S', name: 'Bruiser Brawler', pickRate: '9%', winRate: '15%', avg: 3.5 },
    { tier: 'A', name: 'Sniper Reroll', pickRate: '15%', winRate: '11%', avg: 4.1 },
    { tier: 'B', name: 'Fast 9 Legendary', pickRate: '4%', winRate: '25%', avg: 4.5 },
  ];

  const tierColors = {
    S: 'bg-red-500 text-white',
    A: 'bg-orange-500 text-white',
    B: 'bg-yellow-500 text-black',
    C: 'bg-green-500 text-white',
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          Meta Kompozisyonları
        </h1>
        <p className="text-gray-400 mt-2">Güncel yamanın en iyi performans gösteren dizilişleri.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800/50 border-b border-gray-800">
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tier</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Kompozisyon</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Pick %</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Win %</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ort. Sıra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-900/50 hover:bg-gray-900">
            {comps.map((comp, idx) => (
              <tr key={idx} className="hover:bg-gray-800/50 transition-colors cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded font-bold text-sm shadow-sm ${tierColors[comp.tier]}`}>
                    {comp.tier}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-200 text-base">{comp.name}</div>
                  <div className="text-xs text-gray-500 mt-1">Örnek Şampiyonlar...</div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-300">
                  {comp.pickRate}
                </td>
                <td className="px-6 py-4 text-right font-medium text-green-400">
                  {comp.winRate}
                </td>
                <td className="px-6 py-4 text-right font-bold text-white">
                  {comp.avg}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
