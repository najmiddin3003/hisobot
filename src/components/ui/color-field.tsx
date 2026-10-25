"use client";

import { useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Hsv = { h: number; s: number; v: number };

function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0x64748b;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

function hsvToHex({ h, s, v }: Hsv) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return `#${[f(5), f(3), f(1)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** Sichqoncha yoki barmoq bilan sudrab qiymat tanlash (pointer capture) */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    onMove(clamp01((e.clientX - rect.left) / rect.width), clamp01((e.clientY - rect.top) / rect.height));
  };
  return {
    ref,
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      handle(e);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) handle(e);
    },
  };
}

/**
 * O'z rangini tanlash (brauzerning rang oynasi o'rniga): to'yinganlik/yorqinlik maydoni,
 * rang tusi chizig'i va HEX kod. trigger — popover'ni ochadigan element.
 */
export function ColorField({
  value,
  onChange,
  trigger,
}: {
  value: string;
  onChange: (hex: string) => void;
  trigger: React.ReactNode;
}) {
  // Tus (hue) alohida saqlanadi — kulrangga yaqin ranglarda ham chiziq sakramasin
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [draft, setDraft] = useState<string | null>(null);

  const update = (next: Hsv) => {
    setHsv(next);
    setDraft(null);
    onChange(hsvToHex(next));
  };

  const area = useDrag((x, y) => update({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => update({ ...hsv, h: x * 360 }));

  return (
    <Popover onOpenChange={(open) => open && setHsv(hexToHsv(value))}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-3 p-3">
        <div
          {...area}
          role="slider"
          aria-label="To'yinganlik va yorqinlik"
          aria-valuenow={Math.round(hsv.s * 100)}
          className="relative h-36 cursor-crosshair touch-none rounded-xl"
          style={{
            backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }),
            backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
          }}
        >
          <span
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hsvToHex(hsv) }}
          />
        </div>

        <div
          {...hue}
          role="slider"
          aria-label="Rang tusi"
          aria-valuenow={Math.round(hsv.h)}
          className="relative h-3 cursor-pointer touch-none rounded-full"
          style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
        >
          <span
            className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="size-8 shrink-0 rounded-lg ring-1 ring-foreground/10" style={{ backgroundColor: value }} />
          <input
            value={draft ?? value.toUpperCase()}
            onChange={(e) => {
              const text = e.target.value.trim();
              setDraft(text);
              if (/^#?[0-9a-f]{6}$/i.test(text)) {
                const hex = `#${text.replace("#", "").toLowerCase()}`;
                setHsv(hexToHsv(hex));
                onChange(hex);
              }
            }}
            onBlur={() => setDraft(null)}
            aria-label="HEX kod"
            spellCheck={false}
            className={cn(
              "h-8 min-w-0 flex-1 rounded-lg border border-input bg-card/60 px-2.5 font-mono text-sm uppercase outline-none focus:border-ring",
              draft !== null && !/^#?[0-9a-f]{6}$/i.test(draft) && "border-destructive",
            )}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
