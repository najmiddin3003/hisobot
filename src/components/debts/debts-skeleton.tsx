import { StatCardsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export function DebtsSkeleton() {
  return (
    <div className="space-y-8">
      <StatCardsSkeleton />
      <Skeleton className="h-8 w-40 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
