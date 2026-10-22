import { Suspense } from "react";
import type { Metadata } from "next";
import { AiInsightCard } from "@/components/dashboard/ai-insight";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { DailyChart } from "@/components/dashboard/daily-chart";
import { DebtsSummary } from "@/components/dashboard/debts-summary";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { TopExpenses } from "@/components/dashboard/top-expenses";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RecentEntries } from "@/components/entries/recent-entries";
import { PageHeader } from "@/components/page-header";
import { ListCardSkeleton, StatCardsSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMonthInsight } from "@/lib/data/ai";
import { getDashboard } from "@/lib/data/dashboard";
import { getRecentEntries } from "@/lib/data/entries";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title="Dashboard" description="Oylik moliyaviy holatingiz bir qarashda" />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<ListCardSkeleton rows={5} />}>
        <RecentEntriesSection />
      </Suspense>
    </>
  );
}

async function DashboardContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { oy } = await searchParams;
  const data = await getDashboard(oy);

  return (
    <>
      <KpiRow data={data} />

      <div className="grid gap-6 xl:grid-cols-3">
        <CategoryBreakdown data={data} className="xl:col-span-2" />
        <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
          <AiInsightSection month={data.month} monthLabel={data.monthLabel} />
        </Suspense>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Kirim va chiqim — 12 oy</CardTitle>
            <CardDescription>Har oy qancha kirdi va qancha ketdi</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart trend={data.trend} />
          </CardContent>
        </Card>
        <DebtsSummary data={data} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Kunlik xarajatlar</CardTitle>
            <CardDescription>
              {data.monthLabel} · kuniga o&apos;rtacha {formatMoney(data.dailyAverage)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyChart daily={data.daily} average={data.dailyAverage} />
          </CardContent>
        </Card>
        <TopExpenses data={data} />
      </div>
    </>
  );
}

async function AiInsightSection({ month, monthLabel }: { month: string; monthLabel: string }) {
  const { configured, insight, changedSince } = await getMonthInsight(month);
  return (
    // Oy almashganda kartochka holati yangidan boshlanadi
    <AiInsightCard
      key={month}
      month={month}
      monthLabel={monthLabel}
      configured={configured}
      initial={insight}
      changedSince={changedSince}
    />
  );
}

async function RecentEntriesSection() {
  const { entries, options } = await getRecentEntries();
  return <RecentEntries entries={entries} options={options} />;
}

function DashboardSkeleton() {
  return (
    <>
      <StatCardsSkeleton />
      {[0, 1, 2].map((row) => (
        <div key={row} className="grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-xl xl:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ))}
    </>
  );
}
