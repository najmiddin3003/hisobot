// Kichik SVG grafiklar (kutubxonasiz, serverda chiziladi). Paydo bo'lganda chiziladi (animate-draw).
import { cn } from "@/lib/utils";

/**
 * Trend chizig'i: bir seriya, o'qlarsiz — faqat yo'nalishni ko'rsatadi.
 * Rang currentColor'dan (masalan className="text-chart-income"), ostida yengil soya, oxirgi nuqta belgilangan.
 */
export function Sparkline({
  values,
  className,
  label,
}: {
  values: number[];
  className?: string;
  /** Ekran o'quvchilar uchun */
  label: string;
}) {
  const W = 120;
  const H = 32;
  const pad = 3;
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (W - pad * 2),
    pad + (1 - (v - min) / span) * (H - pad * 2),
  ]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = points.at(-1)!;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label} className={cn("h-8 w-full overflow-visible", className)}>
      <path d={`${line} L${lx} ${H} L${pad} ${H} Z`} fill="currentColor" opacity={0.1} />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="animate-draw"
      />
      <circle cx={lx} cy={ly} r={3} fill="currentColor" stroke="var(--card)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Progress halqasi: value 0..1. Rang currentColor'dan; ichiga children (foiz yoki matn) joylanadi.
 */
export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  className,
  trackClassName = "text-foreground/10",
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  label: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <div role="img" aria-label={label} className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className={trackClassName} />
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={1}
            // Uzunlik style orqali (class ustidan); paydo bo'lganda 0 dan shu qiymatgacha chiziladi
            style={{ strokeDasharray: `${clamped} 1`, ["--ring-value" as string]: clamped }}
            className="animate-ring transition-[stroke-dasharray] duration-700"
          />
        )}
      </svg>
      {children && <span className="relative text-center leading-tight">{children}</span>}
    </div>
  );
}

export type DonutSegment = { key: string; value: number; color: string; label: string };

/**
 * Doira (halqa) diagramma: segmentlar orasida 2px bo'shliq, markazda yig'indi.
 * Rang segmentning o'zidan (kategoriya rangi — identifikatsiya), afsona tashqarida chiziladi.
 */
export function Donut({
  segments,
  size = 168,
  stroke = 22,
  label,
  children,
}: {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  label: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const gap = segments.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {total === 0 ? (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        ) : (
          segments.map((s, i) => {
            const length = (s.value / total) * circumference;
            const dash = Math.max(length - gap, 0.5);
            const el = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="donut-segment"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <title>{s.label}</title>
              </circle>
            );
            offset += length;
            return el;
          })
        )}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}
