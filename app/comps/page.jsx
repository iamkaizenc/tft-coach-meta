'use client';

import { useState, useEffect } from 'react';
import CompCard from '@/components/CompCard';
import FilterBar from '@/components/FilterBar';

export default function CompsPage() {
  const [comps, setComps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ tier: '', sort: 'tier' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchComps();
  }, [filters, page]);

  async function fetchComps() {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filters.tier) params.set('tier', filters.tier);
      if (filters.sort) params.set('sort', filters.sort);
      params.set('page', page.toString());
      params.set('limit', '24');

      const res = await fetch(`/api/meta/comps?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Veri çekilemedi');

      setComps(data.comps || []);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Tier gruplama
  const tierGroups = {};
  if (filters.sort === 'tier' && !filters.tier) {
    for (const comp of comps) {
      const t = comp.tier || 'C';
      if (!tierGroups[t]) tierGroups[t] = [];
      tierGroups[t].push(comp);
    }
  }

  const showGrouped = filters.sort === 'tier' && !filters.tier && Object.keys(tierGroups).length > 0;

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Meta Tier List</h1>
        <p className="text-sm text-gray-400 mt-1">
          En iyi TFT kompozisyonları — pick rate, win rate ve placement verisine dayalı
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={(f) => { setFilters(f); setPage(1); }}
        showTierFilter
        sortOptions={['tier', 'avgplacement', 'pickrate', 'winrate']}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-gray-500 text-sm">Yükleniyor...</div>
        </div>
      )}

      {/* Comps Grid */}
      {!loading && !error && (
        <>
          {showGrouped ? (
            // Tier bazlı gruplu görünüm
            ['S', 'A', 'B', 'C'].map(tier => {
              const group = tierGroups[tier];
              if (!group?.length) return null;

              const tierColors = {
                S: 'text-yellow-400 border-yellow-500/30',
                A: 'text-purple-400 border-purple-500/30',
                B: 'text-blue-400   border-blue-500/30',
                C: 'text-gray-400   border-gray-500/30',
              };

              return (
                <div key={tier} className="space-y-3">
                  <div className={`flex items-center gap-3 border-b pb-2 ${tierColors[tier]}`}>
                    <span className="text-lg font-bold">{tier} Tier</span>
                    <span className="text-xs text-gray-500">({group.length} comp)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {group.map(comp => (
                      <CompCard key={comp.compHash} comp={comp} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Düz grid görünümü
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {comps.map(comp => (
                <CompCard key={comp.compHash} comp={comp} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!comps.length && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-sm">
                Henüz comp verisi yok. Ladder sync çalıştıktan sonra burada meta comp'lar görünecek.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 disabled:opacity-30"
              >
                Önceki
              </button>
              <span className="text-sm text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 disabled:opacity-30"
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
