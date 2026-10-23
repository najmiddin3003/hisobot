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
    <nav className="-mt-1 flex gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
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
