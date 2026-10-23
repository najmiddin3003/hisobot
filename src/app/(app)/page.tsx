import { Suspense } from "react";
import type { Metadata } from "next";
import { AiInsightCard } from "@/components/dashboard/ai-insight";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { DailyChart } from "@/components/dashboard/daily-chart";
import { BudgetTile, DebtTile, MonthHero } from "@/components/dashboard/summary-tiles";
import { TopExpenses } from "@/components/dashboard/top-expenses";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { RecentEntries } from "@/components/entries/recent-entries";
import { PageHeader } from "@/components/page-header";
import { ListCardSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMonthInsight } from "@/lib/data/ai";
import { getDashboard } from "@/lib/data/dashboard";
import { getRecentEntries } from "@/lib/data/entries";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

/*
  Bento to'r: kompyuterda 4 ustun, planshetda 2, telefonda 1.
  1-qator: oy natijasi (2) · budjet · qarzlar   2-qator: kategoriyalar (2) · AI tahlil (2)
  3-qator: 12 oy (2) · kunlik (2)               4-qator: eng katta xarajatlar (2) · so'nggi yozuvlar (2)
*/
export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <PageHeader title="Dashboard" description="Oylik moliyaviy holatingiz bir qarashda" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent searchParams={searchParams} />
        </Suspense>

        <div className="md:col-span-2 *:h-full">
          <Suspense fallback={<ListCardSkeleton rows={5} />}>
            <RecentEntriesSection />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function DashboardContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { oy } = await searchParams;
  const data = await getDashboard(oy);

  return (
    <>
      <MonthHero data={data} className="md:col-span-2" />
      <BudgetTile data={data} />
      <DebtTile data={data} />

      <CategoryBreakdown data={data} className="md:col-span-2" />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl md:col-span-2" />}>
        <AiInsightSection month={data.month} monthLabel={data.monthLabel} />
      </Suspense>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Kirim va chiqim — 12 oy</CardTitle>
          <CardDescription>Har oy qancha kirdi va qancha ketdi</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart trend={data.trend} />
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
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

      <TopExpenses data={data} className="md:col-span-2" />
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
      className="md:col-span-2"
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
      <Skeleton className="h-72 rounded-2xl md:col-span-2" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-96 rounded-2xl md:col-span-2" />
      ))}
    </>
  );
}
