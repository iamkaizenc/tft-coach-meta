export function StatCard({ label, value, sub, color = 'indigo' }) {
    const colors = {
        indigo: 'bg-indigo-900/40 border-indigo-700',
        green: 'bg-green-900/40  border-green-700',
        yellow: 'bg-yellow-900/40 border-yellow-700',
        red: 'bg-red-900/40    border-red-700',
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}
