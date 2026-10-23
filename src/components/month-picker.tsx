"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  MONTH_NAMES,
  currentMonthKey,
  monthLabel,
  resolveMonthParam,
  shiftMonth,
  toMonthKey,
} from "@/lib/dates";
import { isMonthlyPage } from "@/lib/nav";

/** Tanlangan oy URL'da ?oy=YYYY-MM ko'rinishida saqlanadi; joriy oyda parametr bo'lmaydi */
export function MonthPicker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = currentMonthKey();
  const selected = resolveMonthParam(searchParams.get("oy"));

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(selected.slice(0, 4)));

  if (!isMonthlyPage(pathname)) return null;

  const hrefFor = (key: string) => {
    const params = new URLSearchParams(searchParams);
    if (key === current) params.delete("oy");
    else params.set("oy", key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const prev = shiftMonth(selected, -1);
  const next = shiftMonth(selected, 1);
  const currentYear = Number(current.slice(0, 4));

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" asChild aria-label="Oldingi oy">
        <Link href={hrefFor(prev)}>
          <ChevronLeft />
        </Link>
      </Button>

      <Popover
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) setYear(Number(selected.slice(0, 4)));
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-center gap-2 font-medium sm:min-w-36">
            <CalendarDays className="hidden text-muted-foreground sm:block" />
            {/* Telefonda joy tor: "Okt 2026" */}
            <span className="sm:hidden">
              {MONTH_NAMES[Number(selected.slice(5)) - 1].slice(0, 3)} {selected.slice(0, 4)}
            </span>
            <span className="hidden sm:inline">{monthLabel(selected)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon-sm" onClick={() => setYear(year - 1)} aria-label="Oldingi yil">
              <ChevronLeft />
            </Button>
            <span className="text-sm font-semibold tabular-nums">{year}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setYear(year + 1)}
              disabled={year >= currentYear}
              aria-label="Keyingi yil"
            >
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, index) => {
              const key = toMonthKey(year, index + 1);
              const isFuture = key > current;
              const isSelected = key === selected;
              if (isFuture) {
                return (
                  <Button key={key} variant="ghost" size="sm" disabled>
                    {name.slice(0, 3)}
                  </Button>
                );
              }
              return (
                <Button
                  key={key}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(key === current && !isSelected && "text-primary")}
                >
                  <Link href={hrefFor(key)} onClick={() => setOpen(false)}>
                    {name.slice(0, 3)}
                  </Link>
                </Button>
              );
            })}
          </div>
          {selected !== current && (
            <Button variant="secondary" size="sm" className="mt-3 w-full" asChild>
              <Link href={hrefFor(current)} onClick={() => setOpen(false)}>
                Joriy oyga qaytish
              </Link>
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {next <= current ? (
        <Button variant="ghost" size="icon" asChild aria-label="Keyingi oy">
          <Link href={hrefFor(next)}>
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <Button variant="ghost" size="icon" disabled aria-label="Keyingi oy">
          <ChevronRight />
        </Button>
      )}
    </div>
  );
}

/** URL parametrlari kelguncha joy egallab turadi (sahifa sakramasligi uchun) */
export function MonthPickerFallback() {
  const pathname = usePathname();
  if (!isMonthlyPage(pathname)) return null;
  return <Skeleton className="h-8 w-40 rounded-full sm:w-56" />;
}
