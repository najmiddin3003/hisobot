import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecurringPage } from "@/lib/data/entries";
import { RecurringView } from "./recurring-view";

export const metadata: Metadata = { title: "Takroriy to'lovlar" };

export default function RecurringPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <RecurringContent />
    </Suspense>
  );
}

async function RecurringContent() {
  const { items, options } = await getRecurringPage();
  return <RecurringView items={items} options={options} />;
}
