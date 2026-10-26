"use client";

// O'qli grafiklar (ustunli va maydonli) — kutubxonasiz. Ustunlar va yozuvlar HTML'da (foizlar bilan), shuning uchun
// o'lcham o'lchanmaydi, serverda ham to'g'ri chiziladi va matnlar cho'zilmaydi. Ustiga olib borilsa/bosilsa — izoh.
import { useState } from "react";
import { formatCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Chiroyli o'q bo'linmalari: 1, 2, 2.5, 5 × 10ⁿ qadam bilan, 0 doim ichida */
function niceScale(min: number, max: number, count = 4) {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi === lo) return { lo: 0, hi: 1, ticks: [0, 1] };
  const raw = (hi - lo) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * power >= raw) ?? 10) * power;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v));
  return { lo: start, hi: end, ticks };
}

/** Ko'p ustunda har nechanchi yozuv ko'rsatilishi (taxminan 8–12 ta yozuv) */
const labelStep = (count: number, max = 12) => Math.max(1, Math.ceil(count / max));

type Series<T> = { key: keyof T & string; label: string; color: string };

type Common<T> = {
  data: T[];
  xLabel: (point: T) => string;
  tooltip: (point: T) => React.ReactNode;
  /** Chizma balandligi (o'qlarsiz), px */
  height?: number;
  className?: string;
  label: string;
};

function Frame({
  scale,
  height,
  label,
  className,
  children,
  labels,
}: {
  scale: ReturnType<typeof niceScale>;
  height: number;
  label: string;
  className?: string;
  children: React.ReactNode;
  labels: React.ReactNode;
}) {
  const y = (v: number) => ((v - scale.lo) / (scale.hi - scale.lo)) * 100;
  return (
    <div role="img" aria-label={label} className={cn("grid grid-cols-[auto_1fr] gap-x-2 text-[11px] text-muted-foreground", className)}>
      {/* Y o'qi */}
      <div className="relative" style={{ height }}>
        {scale.ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2 tabular-nums whitespace-nowrap" style={{ bottom: `${y(t)}%` }}>
            {formatCompact(t)}
          </span>
        ))}
        <span className="invisible block h-0 tabular-nums">{formatCompact(scale.hi)}</span>
      </div>
      <div className="relative" style={{ height }}>
        {scale.ticks.map((t) => (
          <div
            key={t}
            className={cn("absolute inset-x-0 border-t", t === 0 ? "border-border" : "border-dashed border-border/70")}
            style={{ bottom: `${y(t)}%` }}
          />
        ))}
        {children}
      </div>
      <div />
      {labels}
    </div>
  );
}

function Tooltip({ index, count, children }: { index: number; count: number; children: React.ReactNode }) {
  // Chap yarmida — o'ngga, o'ng yarmida — chapga ochiladi (ekrandan chiqib ketmasin)
  const left = index < count / 2;
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-60 animate-in rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md duration-150 fade-in zoom-in-95",
        left ? "left-0" : "right-0",
      )}
    >
      {children}
    </div>
  );
}

function XLabels<T>({ data, xLabel }: { data: T[]; xLabel: (p: T) => string }) {
  const step = labelStep(data.length);
  return (
    <div className="mt-2 flex">
      {data.map((point, i) => (
        <span key={i} className="min-w-0 flex-1 text-center whitespace-nowrap">
          {i % step === 0 || i === data.length - 1 ? xLabel(point) : ""}
        </span>
      ))}
    </div>
  );
}

/** Ustunli grafik: har nuqtada bir yoki bir necha seriya yonma-yon; ixtiyoriy gorizontal chiziq (masalan, o'rtacha) */
export function ColumnChart<T>({
  data,
  series,
  xLabel,
  tooltip,
  reference,
  height = 224,
  className,
  label,
}: Common<T> & { series: Series<T>[]; reference?: { value: number; label: string } }) {
  const [active, setActive] = useState<number | null>(null);
  const values = data.flatMap((p) => series.map((s) => Number(p[s.key]) || 0));
  const scale = niceScale(Math.min(0, ...values), Math.max(0, ...values, reference?.value ?? 0));
  const pct = (v: number) => ((v - scale.lo) / (scale.hi - scale.lo)) * 100;
  const zero = pct(0);

  return (
    <Frame scale={scale} height={height} label={label} className={className} labels={<XLabels data={data} xLabel={xLabel} />}>
      <div className="absolute inset-0 flex" onPointerLeave={() => setActive(null)}>
        {data.map((point, i) => (
          <div
            key={i}
            className={cn("relative min-w-0 flex-1 transition-colors", active === i && "bg-muted/50")}
            onPointerEnter={() => setActive(i)}
            onClick={() => setActive(i)}
          >
            {/* Ustunlar nol chizig'idan yuqoriga o'sadi */}
            <div className="absolute inset-x-[12%] top-0 flex items-end justify-center gap-0.5" style={{ bottom: `${zero}%` }}>
              {series.map((s) => {
                const v = Math.max(Number(point[s.key]) || 0, 0);
                return (
                  <div
                    key={s.key}
                    className="column-grow w-full max-w-6 rounded-t-[4px]"
                    style={{
                      height: `${v > 0 ? Math.max(((pct(v) - zero) / (100 - zero)) * 100, 0.8) : 0}%`,
                      backgroundColor: s.color,
                      animationDelay: `${i * 18}ms`,
                    }}
                  />
                );
              })}
            </div>
            {active === i && (
              <Tooltip index={i} count={data.length}>
                {tooltip(point)}
              </Tooltip>
            )}
          </div>
        ))}
      </div>
      {reference && reference.value > 0 && (
        <div className="pointer-events-none absolute inset-x-0 border-t border-muted-foreground/70" style={{ bottom: `${pct(reference.value)}%` }}>
          <span className="absolute right-1 bottom-0.5 rounded bg-card/80 px-1">{reference.label}</span>
        </div>
      )}
    </Frame>
  );
}

/** Maydonli grafik: bitta seriya, chiziq va ostida yengil soya */
export function AreaChart<T>({ data, value, color, xLabel, tooltip, height = 256, className, label }: Common<T> & { value: (p: T) => number; color: string }) {
  const [active, setActive] = useState<number | null>(null);
  const values = data.map(value);
  const scale = niceScale(Math.min(...values), Math.max(...values));
  const y = (v: number) => 100 - ((v - scale.lo) / (scale.hi - scale.lo)) * 100;
  // Nuqtalar har ustun o'rtasida (X yozuvlari bilan bir xil joyda)
  const x = (i: number) => ((i + 0.5) / data.length) * 100;
  const points = values.map((v, i) => `${x(i)},${y(v)}`);
  const line = `M${points.join(" L")}`;
  const area = `${line} L${x(values.length - 1)},${y(scale.lo)} L${x(0)},${y(scale.lo)} Z`;

  return (
    <Frame scale={scale} height={height} label={label} className={className} labels={<XLabels data={data} xLabel={xLabel} />}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible animate-in duration-700 fade-in">
        <path d={area} fill={color} opacity={0.1} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="absolute inset-0 flex" onPointerLeave={() => setActive(null)}>
        {data.map((point, i) => (
          <div key={i} className="relative min-w-0 flex-1" onPointerEnter={() => setActive(i)} onClick={() => setActive(i)}>
            {active === i && (
              <>
                <div className="absolute inset-y-0 left-1/2 border-l" />
                <Tooltip index={i} count={data.length}>
                  {tooltip(point)}
                </Tooltip>
              </>
            )}
            {(active === i || data.length === 1) && (
              <span
                className="absolute left-1/2 size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-card"
                style={{ bottom: `${100 - y(values[i])}%`, backgroundColor: color }}
              />
            )}
          </div>
        ))}
      </div>
    </Frame>
  );
}
