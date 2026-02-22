'use client';

import { useState } from 'react';

/**
 * StatsTable — Filtrelenebilir istatistik tablosu
 *
 * Props:
 *   data: array of objects
 *   columns: [{ key, label, render?, sortable? }]
 *   onRowClick: (row) => void (opsiyonel)
 */
export default function StatsTable({ data = [], columns = [], onRowClick }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      })
    : data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            {columns.map(col => (
              <th
                key={col.key}
                onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                className={`
                  px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400
                  ${col.sortable !== false ? 'cursor-pointer hover:text-gray-200' : ''}
                `}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (
                    <span className="text-indigo-400">{sortAsc ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`
                border-b border-gray-800/50
                ${onRowClick ? 'cursor-pointer hover:bg-gray-800/40' : ''}
                ${i % 2 === 0 ? 'bg-gray-900/20' : ''}
              `}
            >
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2.5 text-gray-300">
                  {col.render
                    ? col.render(row[col.key], row)
                    : row[col.key] ?? '—'
                  }
                </td>
              ))}
            </tr>
          ))}
          {!sortedData.length && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-gray-500"
              >
                Veri bulunamadı
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
