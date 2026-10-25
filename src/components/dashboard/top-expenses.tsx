import { IllustrationChart } from "@/components/illustrations";
import { EntryRow } from "@/components/entries/entry-row";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dashboard } from "@/lib/data/dashboard";

export function TopExpenses({ data, className }: { data: Dashboard; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle>Eng katta xarajatlar</CardTitle>
        <CardDescription>{data.monthLabel} · top 5</CardDescription>
      </CardHeader>
      {data.topExpenses.length > 0 ? (
        <div className="-mb-4 divide-y">
          {data.topExpenses.map((entry, index) => (
            <div key={entry.id} className="flex items-center">
              <span className="w-8 shrink-0 pl-4 text-xs font-semibold text-muted-foreground">{index + 1}</span>
              <EntryRow entry={entry} withDate compact className="min-w-0 pl-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
          <IllustrationChart className="h-20" />
          Bu oyda hali chiqim yo&apos;q
        </div>
      )}
    </Card>
  );
}
