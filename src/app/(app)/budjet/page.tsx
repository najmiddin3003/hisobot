import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getBudgetOverview } from "@/lib/data/budget";
import { BudgetView } from "./budget-view";

export const metadata: Metadata = { title: "Budjet" };

export default function BudgetPage() {
  return (
    <>
      <PageHeader title="Budjet" description="Hozir qancha pulingiz bor va jamg'arma qanday o'syapti" />
      <Suspense fallback={<BudgetSkeleton />}>
        <BudgetContent />
      </Suspense>
    </>
  );
}

async function BudgetContent() {
  return <BudgetView data={await getBudgetOverview()} />;
}

function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-xl lg:col-span-3" />
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
