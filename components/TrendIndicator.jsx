/**
 * TrendIndicator — Yukarı/Aşağı trend göstergesi
 *
 * Props:
 *   value: number (pozitif = iyi, negatif = kötü)
 *   suffix: string (ör: "%", "LP")
 *   invert: boolean (placement için: düşük = iyi)
 */
export default function TrendIndicator({ value, suffix = '', invert = false }) {
  if (value == null || value === 0) {
    return <span className="text-gray-500 text-xs">—</span>;
  }

  const isPositive = invert ? value < 0 : value > 0;
  const color = isPositive ? 'text-green-400' : 'text-red-400';
  const arrow = isPositive ? '↑' : '↓';
  const display = Math.abs(value);

  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow} {display}{suffix}
    </span>
  );
}
