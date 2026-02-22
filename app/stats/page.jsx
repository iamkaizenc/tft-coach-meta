'use client';

import { useState, useEffect } from 'react';
import StatsTable from '@/components/StatsTable';

const TYPE_TABS = [
  { key: 'unit',    label: 'Birimler',  icon: '🎭' },
  { key: 'augment', label: 'Augmentler', icon: '⭐' },
  { key: 'trait',   label: 'Traitler',  icon: '🔗' },
  { key: 'item',    label: 'İtemler',   icon: '🗡️' },
];

const SORT_OPTIONS = {
  unit:    ['avgplacement', 'winrate', 'pickrate', 'name'],
  augment: ['avgplacement', 'winrate', 'pickrate', 'name'],
  trait:   ['avgplacement', 'winrate', 'pickrate', 'name'],
  item:    ['avgplacement', 'winrate', 'name'],
};

const COLUMNS = {
  unit: [
    { key: 'name', label: 'Birim', render: (val, row) => (
      <div className="flex items-center gap-2">
        {row.iconUrl && <img src={row.iconUrl} alt="" className="w-6 h-6 rounded" onError={(e) => { e.target.style.display = 'none'; }} />}
        <span className="font-medium text-white">{val}</span>
        <span className="text-[10px] text-gray-500">{row.cost}g</span>
      </div>
    )},
    { key: 'avgPlacement', label: 'Ort. Placement', render: (val) => (
      <span className={val <= 4 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{val}</span>
    )},
    { key: 'winRate', label: 'Win %', render: (val) => `%${val}` },
    { key: 'pickRate', label: 'Pick %', render: (val) => `%${val}` },
    { key: 'gamesCount', label: 'Maç', render: (val) => (
      <span className="text-gray-500">{val}</span>
    )},
  ],
  augment: [
    { key: 'name', label: 'Augment', render: (val, row) => (
      <div className="flex items-center gap-2">
        {row.iconUrl && <img src={row.iconUrl} alt="" className="w-5 h-5 rounded" onError={(e) => { e.target.style.display = 'none'; }} />}
        <span className="font-medium text-white">{val}</span>
        {row.rarity && (
          <span className={`text-[10px] px-1 rounded ${
            row.rarity === 3 ? 'bg-purple-900/50 text-purple-300' :
            row.rarity === 2 ? 'bg-yellow-900/50 text-yellow-300' :
            'bg-gray-700 text-gray-400'
          }`}>
            {row.rarity === 3 ? 'P' : row.rarity === 2 ? 'G' : 'S'}
          </span>
        )}
      </div>
    )},
    { key: 'avgPlacement', label: 'Ort. Placement', render: (val) => (
      <span className={val <= 4 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{val}</span>
    )},
    { key: 'top4Rate', label: 'Top4 %', render: (val) => `%${val}` },
    { key: 'winRate', label: 'Win %', render: (val) => `%${val}` },
    { key: 'gamesCount', label: 'Oynanma', render: (val) => (
      <span className="text-gray-500">{val}</span>
    )},
  ],
  trait: [
    { key: 'name', label: 'Trait', render: (val, row) => (
      <div className="flex items-center gap-2">
        {row.iconUrl && <img src={row.iconUrl} alt="" className="w-5 h-5 rounded" onError={(e) => { e.target.style.display = 'none'; }} />}
        <span className="font-medium text-white">{val}</span>
      </div>
    )},
    { key: 'avgPlacement', label: 'Ort. Placement', render: (val) => (
      <span className={val <= 4 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{val}</span>
    )},
    { key: 'top4Rate', label: 'Top4 %', render: (val) => `%${val}` },
    { key: 'winRate', label: 'Win %', render: (val) => `%${val}` },
    { key: 'avgStyle', label: 'Ort. Tier', render: (val) => {
      const labels = ['', 'Bronze', 'Silver', 'Gold', 'Prismatic'];
      const idx = Math.round(val || 0);
      return <span className="text-gray-400">{labels[idx] || val}</span>;
    }},
    { key: 'gamesCount', label: 'Oynanma' },
  ],
  item: [
    { key: 'name', label: 'İtem', render: (val, row) => (
      <div className="flex items-center gap-2">
        {row.iconUrl && <img src={row.iconUrl} alt="" className="w-5 h-5 rounded" onError={(e) => { e.target.style.display = 'none'; }} />}
        <span className="font-medium text-white">{val}</span>
      </div>
    )},
    { key: 'avgPlacement', label: 'Ort. Placement', render: (val) => (
      <span className={val <= 4 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{val}</span>
    )},
    { key: 'winRate', label: 'Win %', render: (val) => `%${val}` },
    { key: 'gamesCount', label: 'Kullanım' },
  ],
};

export default function StatsPage() {
  const [activeType, setActiveType] = useState('unit');
  const [sort, setSort] = useState('avgplacement');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, [activeType, sort]);

  async function fetchStats() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/stats/explorer?type=${activeType}&sort=${sort}&limit=50`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Veri çekilemedi');
      setData(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Stats Explorer</h1>
        <p className="text-sm text-gray-400 mt-1">
          Unit, Item, Augment ve Trait istatistikleri — filtreleyerek analiz et
        </p>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveType(tab.key); setSort('avgplacement'); }}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeType === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">Sırala:</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          {(SORT_OPTIONS[activeType] || []).map(opt => (
            <option key={opt} value={opt}>
              {opt === 'avgplacement' ? 'Ort. Placement' :
               opt === 'winrate' ? 'Win Rate' :
               opt === 'pickrate' ? 'Pick Rate' :
               opt === 'name' ? 'İsim' : opt}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-gray-500 text-sm">Yükleniyor...</span>
          </div>
        ) : (
          <StatsTable
            data={data}
            columns={COLUMNS[activeType] || []}
          />
        )}
      </div>
    </div>
  );
}
