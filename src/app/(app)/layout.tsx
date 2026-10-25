import { Suspense } from "react";
import { AiAssistant } from "@/components/ai/assistant";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { QuickAdd, QuickAddFallback } from "@/components/entries/quick-add";
import { NavUserSkeleton } from "@/components/nav-user";
import { RobotCompanion } from "@/components/robot/companion";
import { SessionWatcher } from "@/components/session-watcher";
import { UserMenu } from "@/components/user-menu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader
        quickAdd={
          <Suspense fallback={<QuickAddFallback variant="pill" />}>
            <QuickAdd variant="pill" />
          </Suspense>
        }
        userMenu={
          <Suspense fallback={<NavUserSkeleton />}>
            <UserMenu />
          </Suspense>
        }
      />
      {/* Pastdagi joy — telefonda pastki panel, kompyuterda AI tugmasi oxirgi blokni yopib qo'ymasligi uchun */}
      {/* Oydin yoqilganda (body[data-robot]) — oxirgi blok uning ostida qolib ketmasin */}
      <main className="flex-1 px-4 pt-6 pb-28 in-data-[robot]:pb-46 md:px-6 lg:px-8 lg:pt-8 lg:pb-24 lg:in-data-[robot]:pb-40">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
      </main>
      <BottomNav
        quickAdd={
          <Suspense fallback={<QuickAddFallback variant="fab" />}>
            <QuickAdd variant="fab" />
          </Suspense>
        }
      />
      <SessionWatcher />
      <AiAssistant />
      <RobotCompanion />
    </div>
  );
}
