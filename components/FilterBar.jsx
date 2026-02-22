'use client';

/**
 * FilterBar — Tier, Set, Patch, Sort filtreleri
 *
 * Props:
 *   filters: { tier, sort, ... }
 *   onChange: (newFilters) => void
 *   showTierFilter: boolean
 *   showSortOptions: string[] (opsiyonel sort seçenekleri)
 */

const TIER_OPTIONS = ['All', 'S', 'A', 'B', 'C'];

const SORT_LABELS = {
  tier: 'Tier',
  avgplacement: 'Ort. Placement',
  pickrate: 'Pick Rate',
  winrate: 'Win Rate',
  name: 'İsim',
};

export default function FilterBar({
  filters = {},
  onChange,
  showTierFilter = true,
  sortOptions = ['tier', 'avgplacement', 'pickrate', 'winrate'],
}) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-gray-900/60 rounded-xl border border-gray-800 px-4 py-3">
      {/* Tier Filter */}
      {showTierFilter && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1">Tier:</span>
          {TIER_OPTIONS.map(t => {
            const isActive = t === 'All'
              ? !filters.tier
              : filters.tier === t;
            return (
              <button
                key={t}
                onClick={() => handleChange('tier', t === 'All' ? '' : t)}
                className={`
                  px-2.5 py-1 rounded text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                  }
                `}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {/* Divider */}
      {showTierFilter && <div className="w-px h-5 bg-gray-700" />}

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Sırala:</span>
        <select
          value={filters.sort || sortOptions[0]}
          onChange={(e) => handleChange('sort', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
        >
          {sortOptions.map(opt => (
            <option key={opt} value={opt}>
              {SORT_LABELS[opt] || opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
