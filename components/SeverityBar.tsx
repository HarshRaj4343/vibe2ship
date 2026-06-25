const SEVERITY_COLORS = ['#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444'];
const SEVERITY_LABELS = ['Minor', 'Moderate', 'Significant', 'Serious', 'Critical'];

export default function SeverityBar({
  severity,
  showLabel = true,
}: {
  severity: number;
  showLabel?: boolean;
}) {
  const level = Math.min(Math.max(Math.round(severity), 1), 5);
  const color = SEVERITY_COLORS[level - 1];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" aria-label={`Severity ${level} of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-5 rounded-sm transition-colors"
            style={{ backgroundColor: i < level ? color : '#E5E7EB' }}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color }}>
          {level}/5 · {SEVERITY_LABELS[level - 1]}
        </span>
      )}
    </div>
  );
}
