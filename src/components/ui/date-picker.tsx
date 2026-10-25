"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MONTH_NAMES, tashkentToday, toDateTimeInput } from "@/lib/dates";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

type Parts = { year: number; month: number; day: number; hour: number; minute: number };
type Ymd = { year: number; month: number; day: number };

const pad = (n: number) => String(n).padStart(2, "0");
const sameDay = (a: Ymd, b: Ymd) => a.year === b.year && a.month === b.month && a.day === b.day;

/** "2026-10-25T14:40" yoki "2026-10-25" → qismlar (Toshkent vaqti, saqlash formati o'zgarmaydi) */
function parse(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  return { year: +y, month: +mo, day: +d, hour: h ? +h : 0, minute: mi ? +mi : 0 };
}

function serialize(p: Parts, withTime: boolean) {
  const date = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  return withTime ? `${date}T${pad(p.hour)}:${pad(p.minute)}` : date;
}

function addDays(d: Ymd, delta: number): Ymd {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + delta));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

/** Tugmadagi matn: "Bugun, 14:40", "Kecha, 09:15" yoki "18 oktabr 2026" */
function describe(p: Parts, withTime: boolean, today: Ymd) {
  const date = sameDay(p, today)
    ? "Bugun"
    : sameDay(p, addDays(today, -1))
      ? "Kecha"
      : sameDay(p, addDays(today, 1))
        ? "Ertaga"
        : `${p.day} ${MONTH_NAMES[p.month - 1].toLowerCase()}${p.year === today.year ? "" : ` ${p.year}`}`;
  return withTime ? `${date}, ${pad(p.hour)}:${pad(p.minute)}` : date;
}

/** 6 haftalik to'r (dushanbadan boshlanadi): oldingi/keyingi oy kunlari ham ko'rinadi */
function monthGrid(year: number, month: number): (Ymd & { outside: boolean })[] {
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const start = addDays({ year, month, day: 1 }, -firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i);
    return { ...d, outside: d.month !== month };
  });
}

/**
 * Sana (va vaqt) tanlagich — brauzerning standart <input type="date"> o'rniga.
 * Qiymat formati o'zgarmaydi: "YYYY-MM-DDTHH:mm" (withTime) yoki "YYYY-MM-DD".
 */
export function DateTimePicker({
  value,
  onChange,
  withTime = true,
  clearable = false,
  placeholder = "Sanani tanlang",
  id,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  /** Bo'sh qoldirish mumkin (masalan, ixtiyoriy muddat) */
  clearable?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const parts = parse(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const today = tashkentToday();
    return { year: parts?.year ?? today.year, month: parts?.month ?? today.month };
  });
  // Oy almashish yo'nalishi: kalendar shu tomonga sirpanadi
  const [direction, setDirection] = useState(0);
  const today = tashkentToday();

  const now = () => parse(toDateTimeInput(new Date()))!;

  const openChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setDirection(0);
      setView({ year: parts?.year ?? today.year, month: parts?.month ?? today.month });
    }
  };

  const shiftMonth = (delta: number) => {
    setDirection(delta);
    setView((v) => {
      const index = v.year * 12 + (v.month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  };

  const pick = (d: Ymd) => {
    const time = parts ?? now();
    onChange(serialize({ ...d, hour: time.hour, minute: time.minute }, withTime));
    if (d.month !== view.month || d.year !== view.year) shiftMonth(d.year * 12 + d.month - (view.year * 12 + view.month));
    if (!withTime) setOpen(false);
  };

  const setTime = (hour: number, minute: number) => {
    const base = parts ?? now();
    onChange(serialize({ ...base, hour, minute }, true));
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={openChange}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-card/60 px-3 text-left text-sm transition-[color,border-color,box-shadow] duration-200 outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/25",
              clearable && parts && "pr-9",
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !parts && "text-muted-foreground")}>
              {parts ? describe(parts, withTime, today) : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[19.5rem] gap-3 p-3">
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Oldingi oy">
              <ChevronLeft />
            </Button>
            <span className="font-heading text-base font-medium">
              {MONTH_NAMES[view.month - 1]} {view.year}
            </span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Keyingi oy">
              <ChevronRight />
            </Button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="relative h-[13.5rem] overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <m.div
                key={`${view.year}-${view.month}`}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: EASE_OUT }}
                className="grid grid-cols-7 gap-0.5"
              >
                {monthGrid(view.year, view.month).map((d) => {
                  const selected = parts !== null && sameDay(d, parts);
                  const isToday = sameDay(d, today);
                  return (
                    <button
                      key={`${d.year}-${d.month}-${d.day}`}
                      type="button"
                      onClick={() => pick(d)}
                      aria-label={`${d.day} ${MONTH_NAMES[d.month - 1].toLowerCase()} ${d.year}`}
                      aria-pressed={selected}
                      aria-current={isToday ? "date" : undefined}
                      className={cn(
                        "relative flex h-8.5 items-center justify-center rounded-full text-sm tabular-nums transition-[background-color,color,scale] duration-150 active:scale-90",
                        selected
                          ? "bg-primary font-medium text-primary-foreground"
                          : d.outside
                            ? "text-muted-foreground/45 hover:bg-muted"
                            : "hover:bg-muted",
                        isToday && !selected && "font-semibold text-foreground ring-1 ring-ring/60 ring-inset",
                      )}
                    >
                      {d.day}
                    </button>
                  );
                })}
              </m.div>
            </AnimatePresence>
          </div>

          {withTime && (
            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-4" /> Vaqt
              </span>
              <div className="flex items-center gap-1">
                <TimeUnit
                  label="Soat"
                  value={parts?.hour ?? now().hour}
                  max={23}
                  onChange={(h) => setTime(h, parts?.minute ?? now().minute)}
                />
                <span className="pb-0.5 font-medium text-muted-foreground">:</span>
                <TimeUnit
                  label="Daqiqa"
                  value={parts?.minute ?? now().minute}
                  max={59}
                  onChange={(mi) => setTime(parts?.hour ?? now().hour, mi)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const n = now();
                onChange(serialize(n, withTime));
                setView({ year: n.year, month: n.month });
                if (!withTime) setOpen(false);
              }}
            >
              {withTime ? "Hozir" : "Bugun"}
            </Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Tayyor
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {clearable && parts && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Sanani tozalash"
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Soat yoki daqiqa: − / + tugmalari, yozish, ↑/↓ va sichqoncha g'ildiragi bilan o'zgaradi */
function TimeUnit({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const wrap = (n: number) => ((n % (max + 1)) + (max + 1)) % (max + 1);
  const commit = () => {
    if (draft !== null && draft !== "") onChange(Math.min(Number(draft), max));
    setDraft(null);
  };

  return (
    <div className="flex items-center rounded-full bg-muted p-0.5">
      <button
        type="button"
        onClick={() => onChange(wrap(value - 1))}
        aria-label={`${label}: kamaytirish`}
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-[background-color,scale] hover:bg-card hover:text-foreground active:scale-90"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={draft ?? pad(value)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            setDraft(null);
            onChange(wrap(value + (e.key === "ArrowUp" ? 1 : -1)));
          }
        }}
        onWheel={(e) => {
          if (document.activeElement !== e.currentTarget) return;
          onChange(wrap(value + (e.deltaY < 0 ? 1 : -1)));
        }}
        className="w-7 bg-transparent text-center text-sm font-medium tabular-nums outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(wrap(value + 1))}
        aria-label={`${label}: oshirish`}
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-[background-color,scale] hover:bg-card hover:text-foreground active:scale-90"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
