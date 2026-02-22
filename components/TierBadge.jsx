/**
 * TierBadge — S/A/B/C tier göstergesi
 */

const TIER_STYLES = {
  S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  A: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  B: 'bg-blue-500/20   text-blue-400   border-blue-500/40',
  C: 'bg-gray-500/20   text-gray-400   border-gray-500/40',
};

const TIER_LABELS = {
  S: 'S Tier',
  A: 'A Tier',
  B: 'B Tier',
  C: 'C Tier',
};

export default function TierBadge({ tier, size = 'md' }) {
  const t = (tier || 'C').toUpperCase();
  const style = TIER_STYLES[t] || TIER_STYLES.C;

  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-lg
        font-bold border ${style} ${sizes[size]}
      `}
      title={TIER_LABELS[t]}
    >
      {t}
    </span>
  );
}

export { TIER_STYLES };
