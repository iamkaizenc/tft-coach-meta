export function PlacementTimeline({ timeline }) {
    if (!timeline?.length) return null;
    const max = 8;
    const barH = 120;

    return (
        <div>
            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Son Maçlar (Placement)</h3>
            <div className="flex items-end gap-1.5 h-32">
                {timeline.map((entry, i) => {
                    const p = entry.placement;
                    const h = ((max - p + 1) / max) * barH;
                    const color =
                        p === 1 ? 'bg-yellow-400' :
                            p <= 4 ? 'bg-green-500' : 'bg-red-500';
                    return (
                        <div key={i} className="flex flex-col items-center flex-1 gap-1">
                            <span className="text-xs text-gray-400">{p}</span>
                            <div
                                className={`w-full rounded-t ${color}`}
                                style={{ height: `${h}px` }}
                                title={`Placement: ${p}`}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>en eski</span>
                <span>en yeni</span>
            </div>
        </div>
    );
}

export function PlacementDist({ dist }) {
    if (!dist?.length) return null;
    const max = Math.max(...dist.map((d) => d.count), 1);

    const colors = [
        'bg-yellow-400', 'bg-green-400', 'bg-green-500', 'bg-green-600',
        'bg-red-400', 'bg-red-500', 'bg-red-600', 'bg-red-800',
    ];

    return (
        <div>
            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-3">Placement Dağılımı</h3>
            {dist.map((d, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-gray-400 w-4 text-right">{d.place}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${colors[i]}`}
                            style={{ width: `${(d.count / max) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-400 w-4">{d.count}</span>
                </div>
            ))}
        </div>
    );
}
