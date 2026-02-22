'use client';

import Link from 'next/link';
import TierBadge from './TierBadge';
import TrendIndicator from './TrendIndicator';

/**
 * CompCard — Tier List'teki tek bir comp kartı
 *
 * Props:
 *   comp: { compHash, compName, tier, units, traits, pickRate, winRate, avgPlacement, top4Rate, gamesCount, metaTags }
 */
export default function CompCard({ comp }) {
  const {
    compHash,
    compName,
    tier,
    units = [],
    traits = [],
    pickRate,
    winRate,
    avgPlacement,
    top4Rate,
    gamesCount,
    metaTags = [],
  } = comp;

  // Placement rengi
  const placementColor = avgPlacement <= 3.5 ? 'text-green-400' :
    avgPlacement <= 4.5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <Link
      href={`/comps/${compHash}`}
      className="block bg-gray-800/60 border border-gray-700 rounded-xl p-4 hover:border-indigo-500/50 hover:bg-gray-800 transition-all group"
    >
      {/* Header: Tier + Name */}
      <div className="flex items-center gap-3 mb-3">
        <TierBadge tier={tier} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate group-hover:text-indigo-300 transition-colors">
            {compName || 'Unknown Comp'}
          </h3>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {metaTags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Units Preview */}
      <div className="flex gap-1 mb-3 overflow-hidden">
        {units.slice(0, 8).map((unit, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded bg-gray-700 border border-gray-600 flex items-center justify-center text-[10px] text-gray-300 shrink-0"
            title={unit.name || unit.id}
          >
            {unit.iconUrl ? (
              <img
                src={unit.iconUrl}
                alt={unit.name || ''}
                className="w-full h-full rounded object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              (unit.name || unit.id || '?').slice(0, 2)
            )}
          </div>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Ort.</p>
          <p className={`text-sm font-bold ${placementColor}`}>{avgPlacement}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Top4</p>
          <p className="text-sm font-bold text-white">%{top4Rate}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Win</p>
          <p className="text-sm font-bold text-white">%{winRate}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Pick</p>
          <p className="text-sm font-bold text-gray-400">%{pickRate}</p>
        </div>
      </div>

      {/* Games count */}
      <div className="mt-2 text-right">
        <span className="text-[10px] text-gray-600">{gamesCount} maç</span>
      </div>
    </Link>
  );
}
