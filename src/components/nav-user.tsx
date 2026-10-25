"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { logoutAction } from "@/lib/auth/actions";

/** Yuqori o'ng burchakdagi akkaunt menyusi: sozlamalar va chiqish (mavzu — yonidagi quyosh/oy tugmasida) */
export function NavUser({ username }: { username: string }) {
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tile-sand font-heading text-base font-medium text-[var(--tile-sand-foreground)] ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:ring-2 data-[state=open]:ring-ring/60"
        aria-label="Akkaunt menyusi"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate font-medium">{username}</p>
          <p className="text-xs font-normal text-muted-foreground">Himoyalangan seans</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/sozlamalar">
            <Settings /> Sozlamalar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => logoutAction()}>
          <LogOut /> Chiqish
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NavUserSkeleton() {
  return <Skeleton className="size-9 shrink-0 rounded-full" />;
}
