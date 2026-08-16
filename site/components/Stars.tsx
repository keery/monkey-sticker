export function Stars({
  value,
  className,
  tone = "light",
}: {
  value: number;
  className?: string;
  tone?: "light" | "dark";
}) {
  const filled = tone === "dark" ? "#f2ede3" : "#111111";
  const empty = tone === "dark" ? "#57534e" : "#d4d4d8";
  return (
    <span className={`inline-flex items-center gap-0.5 ${className ?? ""}`} aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
          <defs>
            <linearGradient id={`star-${tone}-${i}-${Math.round(value * 10)}`}>
              <stop offset={`${Math.min(Math.max(value - (i - 1), 0), 1) * 100}%`} stopColor={filled} />
              <stop offset="0%" stopColor={empty} />
            </linearGradient>
          </defs>
          <path
            fill={`url(#star-${tone}-${i}-${Math.round(value * 10)})`}
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
          />
        </svg>
      ))}
    </span>
  );
}
