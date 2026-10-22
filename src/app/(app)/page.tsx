import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { History, PieChart, Scale, Sparkles, TrendingDown, TrendingUp, Wallet, ChartColumn } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";
import { StatCardsSkeleton } from "@/components/skeletons";
import { StatCard } from "@/components/stat-card";
import { monthLabel, resolveMonthParam, shiftMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title="Dashboard" description="Oylik moliyaviy holatingiz bir qarashda" />

      <Suspense fallback={<StatCardsSkeleton />}>
        <MonthSummary searchParams={searchParams} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <ComingSoon
          className="lg:col-span-2"
          icon={PieChart}
          title="Kategoriyalar bo'yicha xarajatlar"
          description="Doira diagramma va har bir kategoriyaning o'tgan oyga nisbatan o'zgarishi"
          stage={6}
        />
        <ComingSoon
          icon={Sparkles}
          title="AI tahlil"
          description="Keraksiz xarajatlar va tejash bo'yicha maslahatlar"
          stage={8}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ComingSoon
          icon={ChartColumn}
          title="12 oylik trend"
          description="Har oydagi kirim va chiqim grafigi"
          stage={6}
        />
        <ComingSoon
          icon={History}
          title="So'nggi yozuvlar"
          description="Oxirgi kirim-chiqimlar sana-vaqti va manbasi bilan"
          stage={3}
        />
      </div>
    </>
  );
}

async function MonthSummary({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { oy } = await searchParams;
  // Joriy oy so'rov vaqtiga qarab aniqlanadi — prerender'da emas
  await io();
  const month = resolveMonthParam(oy);
  const compareHint = `${monthLabel(shiftMonth(month, -1))} bilan taqqoslash`;

  // 6-bosqichda haqiqiy hisob-kitob bilan almashtiriladi
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Kirim" value={formatMoney(0)} icon={TrendingUp} tone="income" hint={compareHint} />
      <StatCard
        label="Chiqim"
        value={formatMoney(0)}
        icon={TrendingDown}
        tone="expense"
        upIsGood={false}
        hint={compareHint}
      />
      <StatCard label="Sof natija" value={formatMoney(0)} icon={Scale} tone="primary" hint="Kirim − chiqim" />
      <StatCard label="Jami budjet" value={formatMoney(0)} icon={Wallet} tone="receivable" hint="Barcha hamyonlar" />
    </div>
  );
}
