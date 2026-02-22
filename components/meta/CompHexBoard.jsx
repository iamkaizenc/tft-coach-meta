'use client';

// TFT Hex Board yapısı:
// 4 Satır, 7 Sütun. Satırlar hafifçe kaymış (hexagonal) dizilime sahiptir.
// En alttaki 2 satır oyuncunun taşıyıcıları, üstteki 2 satır ön saflar için.

export function CompHexBoard({ units }) {
    // units = [{ id: 'TFT14_Ahri', hex: [2, 3], items: ['TFT_Item_BlueBuff'] }, ...]

    const rows = 4;
    const cols = 7;

    return (
        <div className="relative w-full max-w-2xl mx-auto py-8">
            {/* Perspective wrapper for the isometric/tilted look */}
            <div className="transform perspective-1000 rotate-x-12">
                <div className="flex flex-col gap-2 mx-auto" style={{ width: 'fit-content' }}>
                    {Array.from({ length: rows }).map((_, rIndex) => (
                        <div
                            key={`row-${rIndex}`}
                            className={`flex gap-2 justify-center ${rIndex % 2 !== 0 ? 'ml-6' : ''}`}
                        >
                            {Array.from({ length: cols }).map((_, cIndex) => {
                                const hexPos = [rIndex, cIndex];
                                const unitOnHex = units?.find(u => u.hex?.[0] === rIndex && u.hex?.[1] === cIndex);

                                return (
                                    <div
                                        key={`hex-${rIndex}-${cIndex}`}
                                        className="relative w-12 h-14 sm:w-16 sm:h-18 lg:w-20 lg:h-24"
                                    >
                                        {/* Hexagon Shape */}
                                        <div className="absolute inset-0 bg-gray-800/80 border border-gray-700 clip-hexagon hover:bg-gray-700/80 hover:border-indigo-500 transition-colors cursor-crosshair"></div>

                                        {/* Unit Image & Items */}
                                        {unitOnHex && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-1">
                                                <div className="w-8 h-8 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden border-2 border-yellow-500 shadow-lg shadow-black/50 bg-gray-900">
                                                    <img
                                                        src={`https://raw.communitydragon.org/latest/game/assets/characters/${unitOnHex.id.toLowerCase()}/hud/${unitOnHex.id.toLowerCase()}_square.tft_set14.png`}
                                                        alt={unitOnHex.id}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.src = '/empty-champ.png'; }}
                                                    />
                                                </div>

                                                {/* Items */}
                                                {unitOnHex.items && unitOnHex.items.length > 0 && (
                                                    <div className="flex gap-0.5 mt-[-8px] z-20">
                                                        {unitOnHex.items.map((item, i) => (
                                                            <img
                                                                key={i}
                                                                src={`https://raw.communitydragon.org/latest/game/assets/maps/particles/tft/item_icons/${item.toLowerCase()}.png`}
                                                                alt="item"
                                                                className="w-3 h-3 sm:w-4 sm:h-4 border border-gray-900 rounded"
                                                                onError={(e) => e.target.style.display = 'none'}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* CSS for clip-path hexagon */}
            <style jsx global>{`
        .clip-hexagon {
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
      `}</style>
        </div>
    );
}
