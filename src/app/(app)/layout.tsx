import { Suspense } from "react";
import { AiAssistant } from "@/components/ai/assistant";
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
        {/* Pastdagi joy — AI tugmasi oxirgi blokni yopib qo'ymasligi uchun */}
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-24 lg:p-8 lg:pb-24">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </SidebarInset>
      <SessionWatcher />
      <AiAssistant />
    </SidebarProvider>
  );
}
