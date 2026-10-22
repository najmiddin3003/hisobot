import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { NavUserSkeleton } from "@/components/nav-user";
import { SessionWatcher } from "@/components/session-watcher";
import { SidebarUser } from "@/components/sidebar-user";
import { TopBar } from "@/components/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar
        userMenu={
          <Suspense fallback={<NavUserSkeleton />}>
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </SidebarInset>
      <SessionWatcher />
    </SidebarProvider>
  );
}
