import Link from 'next/link';

export function Sidebar() {
    const routes = [
        { name: 'Tier List', href: '/', icon: '📊' },
        { name: 'Şampiyonlar', href: '/stats/units', icon: '👤' },
        { name: 'Eşyalar', href: '/stats/items', icon: '⚔️' },
        { name: 'Eklentiler', href: '/stats/augments', icon: '💠' },
    ];

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-gray-800">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
                    <span className="text-2xl">♟️</span>
                    <span className="font-bold text-lg tracking-tight text-white">TFT Meta</span>
                </Link>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
                    Meta Analiz
                </div>
                {routes.map((route) => (
                    <Link
                        key={route.href}
                        href={route.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <span className="text-xl">{route.icon}</span>
                        <span className="font-medium">{route.name}</span>
                    </Link>
                ))}

                <div className="mt-8 mb-4 px-2 border-t border-gray-800 pt-6">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                        Oyuncu
                    </div>
                    <Link
                        href="/player/search"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <span className="text-xl">🔍</span>
                        <span className="font-medium">Profil Ara</span>
                    </Link>
                </div>
            </nav>
        </aside>
    );
}
