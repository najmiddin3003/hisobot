"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MonthPicker, MonthPickerFallback } from "@/components/month-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { findNavItem } from "@/lib/nav";

export function TopBar() {
  const section = findNavItem(usePathname());

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden data-[orientation=vertical]:h-4 sm:block" />
      {section && (
        // Telefonda joy tor — bo'lim nomi sahifa sarlavhasida baribir bor
        <div className="hidden min-w-0 items-center gap-2 text-sm font-medium sm:flex">
          <section.icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{section.label}</span>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Suspense fallback={<MonthPickerFallback />}>
          <MonthPicker />
        </Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
