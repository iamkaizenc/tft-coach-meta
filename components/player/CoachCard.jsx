export function CoachCard({ card }) {
    const icons = { strength: '💪', improvement: '🎯', error_pattern: '⚠️' };
    const borders = {
        strength: 'border-green-600',
        improvement: 'border-yellow-600',
        error_pattern: 'border-red-600',
    };

    return (
        <div className={`rounded-xl border bg-gray-800/60 p-5 ${borders[card.type] || 'border-gray-600'}`}>
            <h3 className="font-bold text-white text-base mb-2">{card.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{card.body}</p>
        </div>
    );
}
