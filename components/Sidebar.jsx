'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',      label: 'Dashboard',  icon: '🏠' },
  { href: '/comps', label: 'Meta Comps', icon: '🏆' },
  { href: '/stats', label: 'Stats',      icon: '📊' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl">♟️</span>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">TFT Coach</span>
            <span className="block text-[10px] text-gray-500 uppercase tracking-widest">Meta Analiz</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Player Search (alt kısım) */}
      <div className="px-3 pb-4">
        <div className="border-t border-gray-800 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span>🔍</span>
            <span>Oyuncu Ara</span>
          </Link>
        </div>
        <div className="px-3 py-2 text-[10px] text-gray-600">
          v2.0 — MetaTFT Style
        </div>
      </div>
    </aside>
  );
}
