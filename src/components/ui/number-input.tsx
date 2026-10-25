"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Butun son maydoni: chapda −, o'ngda +, o'rtada yozish mumkin; ↑/↓ ham ishlaydi.
 * Qiymat matn ko'rinishida (bo'sh qoldirish mumkin) — formalar avvalgidek ishlayveradi.
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  suffix,
  placeholder,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  /** Raqamdan keyingi so'z, masalan "oy" */
  suffix?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  const current = value === "" ? null : Number(value);
  const step = (delta: number) => {
    const next = Math.min(Math.max((current ?? (delta > 0 ? min - 1 : min + 1)) + delta, min), max);
    onChange(String(next));
  };

  return (
    <div
      className={cn(
        "flex h-9 items-center rounded-xl border border-input bg-card/60 p-0.5 transition-[border-color,box-shadow] duration-200 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 hover:border-ring/60",
        className,
      )}
    >
      <StepButton label="Kamaytirish" onClick={() => step(-1)} disabled={current !== null && current <= min}>
        <Minus className="size-3.5" />
      </StepButton>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, String(max).length);
            onChange(digits === "" ? "" : String(Math.min(Number(digits), max)));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              step(e.key === "ArrowUp" ? 1 : -1);
            }
          }}
          className="w-full min-w-0 bg-transparent text-center text-sm font-medium tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
        {suffix && value !== "" && <span className="shrink-0 pr-1 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <StepButton label="Oshirish" onClick={() => step(1)} disabled={current !== null && current >= max}>
        <Plus className="size-3.5" />
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 shrink-0 items-center justify-center rounded-[0.6rem] text-muted-foreground transition-[background-color,color,scale] duration-150 hover:bg-muted hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
