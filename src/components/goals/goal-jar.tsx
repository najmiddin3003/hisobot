import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Maqsad idishi: progress (0..1) bo'yicha maqsad rangidagi suyuqlik bilan to'ladi, tepasida to'lqin
 * sekin chayqaladi. To'lsa — tepasida yulduzcha. Paydo bo'lganda pastdan ko'tariladi (jar-fill).
 */
export function GoalJar({
  progress,
  color,
  className,
  label,
}: {
  progress: number;
  color: string;
  className?: string;
  label: string;
}) {
  const clipId = useId();
  const level = Math.min(Math.max(progress, 0), 1);
  // Idish ichi: y 22..84 (62 birlik)
  const top = 84 - level * 62;

  return (
    <svg viewBox="0 0 64 92" role="img" aria-label={label} className={cn("h-24 w-auto overflow-visible", className)}>
      <defs>
        <clipPath id={clipId}>
          <path d="M14 22 h36 v52 a12 12 0 0 1 -12 12 h-12 a12 12 0 0 1 -12 -12z" />
        </clipPath>
      </defs>
      {/* Soyasi */}
      <ellipse cx="32" cy="89" rx="22" ry="3" className="fill-foreground/10" />
      {/* Suyuqlik va to'lqin */}
      <g clipPath={`url(#${clipId})`}>
        <g className="jar-fill" style={{ transformOrigin: "32px 86px" }}>
          <rect x="10" y={top + 2} width="44" height={90 - top} fill={color} opacity={0.85} />
          {level > 0 && level < 1 && (
            <path
              className="jar-wave"
              d={`M-20 ${top + 3} q 8 -4 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 v 10 h -112 z`}
              fill={color}
            />
          )}
          {/* Yaltirash */}
          <rect x="18" y={top + 6} width="4" height={Math.max(84 - top - 12, 0)} rx="2" fill="#fff" opacity={0.25} />
        </g>
      </g>
      {/* Idish va qopqog'i */}
      <path
        d="M14 22 h36 v52 a12 12 0 0 1 -12 12 h-12 a12 12 0 0 1 -12 -12z"
        fill="none"
        className="stroke-foreground/35"
        strokeWidth="2.5"
      />
      <rect x="11" y="12" width="42" height="10" rx="4" className="fill-foreground/25" />
      <rect x="17" y="8" width="30" height="6" rx="3" className="fill-foreground/15" />
      {level >= 1 && (
        <path
          className="animate-rise"
          d="M50 0 l2.4 5 5.4 0.8 -3.9 3.8 0.9 5.4 -4.8 -2.5 -4.8 2.5 0.9 -5.4 -3.9 -3.8 5.4 -0.8z"
          fill="#d9a23a"
        />
      )}
    </svg>
  );
}
