"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Har oyning qaysi kuni (takroriy to'lov, kredit to'lovi): 1–31 kunlar to'ri */
export function MonthDayPicker({
  value,
  onChange,
  id,
  className,
}: {
  value: number;
  onChange: (day: number) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "group/day flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-card/60 pr-2.5 pl-3 text-left text-sm transition-[color,border-color,box-shadow] duration-200 outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/25",
            className,
          )}
        >
          <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">Har oyning {value}-kuni</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/day:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-2.5 p-3">
        <p className="text-xs text-muted-foreground">Oyning qaysi kuni?</p>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => {
                onChange(day);
                setOpen(false);
              }}
              aria-pressed={day === value}
              className={cn(
                "flex h-8 items-center justify-center rounded-full text-sm tabular-nums transition-[background-color,color,scale] duration-150 active:scale-90",
                day === value ? "bg-primary font-medium text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {day}
            </button>
          ))}
        </div>
        {value > 28 && (
          <p className="text-xs text-muted-foreground">Oyda bu kun bo&apos;lmasa (masalan fevral), oyning oxirgi kuni olinadi.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
