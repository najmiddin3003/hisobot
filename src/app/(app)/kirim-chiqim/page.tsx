import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getEntriesPage } from "@/lib/data/entries";
import { resolveMonthParam } from "@/lib/dates";
import { groupByDay, hasActiveFilters, parseEntryFilters } from "@/lib/entries";
import { EntriesView } from "./entries-view";

export const metadata: Metadata = { title: "Kirim-chiqim" };

export default function EntriesPage({ searchParams }: PageProps<"/kirim-chiqim">) {
  return (
    <Suspense fallback={<EntriesSkeleton />}>
      <EntriesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EntriesContent({ searchParams }: Pick<PageProps<"/kirim-chiqim">, "searchParams">) {
  const params = await searchParams;
  const filters = parseEntryFilters(params);
  // getEntriesPage seansni tekshiradi — shundan keyingi kod faqat so'rov paytida ishlaydi
  const data = await getEntriesPage(resolveMonthParam(params.oy), filters);

  return (
    <EntriesView
      groups={groupByDay(data.entries)}
      totals={data.totals}
      options={data.options}
      filters={filters}
      filtered={hasActiveFilters(filters)}
      shownCount={data.entries.length}
    />
  );
}

function EntriesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-3 gap-2 lg:w-44 lg:grid-cols-1">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      {[0, 1].map((group) => (
        <Card key={group} className="gap-0 py-0">
          <Skeleton className="h-10 rounded-none" />
          <CardContent className="space-y-4 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
