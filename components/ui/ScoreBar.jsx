export function ScoreBar({ label, score }) {
    const color =
        score >= 70 ? 'bg-green-500' :
            score >= 45 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="mb-3">
            <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span>{label}</span>
                <span className="font-bold">{score}/100</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${color}`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}
