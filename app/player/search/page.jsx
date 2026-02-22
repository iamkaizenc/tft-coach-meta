'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PlayerSearchPage() {
    const [input, setInput] = useState('');
    const [platform, setPlatform] = useState('tr1');
    const router = useRouter();

    const PLATFORMS = ['tr1', 'euw1', 'eune1', 'na1', 'kr', 'br1', 'jp1'];

    function handleSearch() {
        if (!input.trim()) return;
        const cleanInput = input.replace('#', '-'); // Faker#TR1 -> Faker-TR1
        router.push(`/player/${cleanInput}?platform=${platform}`);
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-20">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
                    TFT Profil Analizi
                </h1>
                <p className="text-gray-400">Detaylı maç geçmişi, koçluk raporu ve oyun tarzı istatistikleri.</p>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-2xl">
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="GameName#TAG (örn: Faker#TR1)"
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    >
                        {PLATFORMS.map((p) => (
                            <option key={p} value={p}>{p.toUpperCase()}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSearch}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-8 py-3 transition-colors shadow-lg shadow-indigo-900/20"
                    >
                        Ara
                    </button>
                </div>
            </div>
        </div>
    );
}
