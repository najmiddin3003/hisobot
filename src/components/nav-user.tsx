"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { logoutAction } from "@/lib/auth/actions";

export function NavUser({ username }: { username: string }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const initial = username.slice(0, 1).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {initial}
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{username}</span>
                <span className="truncate text-xs text-muted-foreground">Himoyalangan seans</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="w-52">
            <DropdownMenuLabel className="font-normal text-muted-foreground">{username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/sozlamalar" onClick={() => setOpenMobile(false)}>
                <Settings /> Sozlamalar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => logoutAction()}>
              <LogOut /> Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function NavUserSkeleton() {
  return (
    <div className="flex h-12 items-center gap-2 p-2 group-data-[collapsible=icon]:p-0">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-1.5 group-data-[collapsible=icon]:hidden">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}
