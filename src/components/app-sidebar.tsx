"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PiggyBank } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { DEBT_NAV, MAIN_NAV, SETTINGS_NAV, findNavItem, type NavItem } from "@/lib/nav";

function NavLinks({ items, activeHref }: { items: NavItem[]; activeHref?: string }) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={item.href === activeHref} tooltip={item.label}>
            <Link href={item.href} onClick={() => setOpenMobile(false)}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const activeHref = findNavItem(usePathname())?.href;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <PiggyBank className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Hisob</span>
                  <span className="truncate text-xs text-muted-foreground">Shaxsiy moliya</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Asosiy</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavLinks items={MAIN_NAV} activeHref={activeHref} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Qarzlar</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavLinks items={DEBT_NAV} activeHref={activeHref} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavLinks items={[SETTINGS_NAV]} activeHref={activeHref} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
