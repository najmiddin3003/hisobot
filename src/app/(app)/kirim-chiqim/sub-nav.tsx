"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Repeat, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/kirim-chiqim", label: "Yozuvlar", icon: List },
  { href: "/kirim-chiqim/takroriy", label: "Takroriy to'lovlar", icon: Repeat },
  { href: "/kirim-chiqim/savatcha", label: "Savatcha", icon: Trash2 },
];

export function SubNav() {
  const pathname = usePathname();
  return (
    <nav className="-mt-2 flex gap-1 overflow-x-auto border-b">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
