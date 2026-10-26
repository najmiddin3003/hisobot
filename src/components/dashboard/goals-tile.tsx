import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { GoalJar } from "@/components/goals/goal-jar";
import { IllustrationJar } from "@/components/illustrations";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGoals } from "@/lib/data/goals";
import { formatCompact } from "@/lib/money";
import { cn } from "@/lib/utils";

const SHOWN = 3;

/** Dashboard: jamg'arma maqsadlari — idishlar yonma-yon (ko'pi bilan 3 ta) */
export async function GoalsTile({ goals: pending, className }: { goals?: ReturnType<typeof getGoals>; className?: string }) {
  const goals = await (pending ?? getGoals());
  const shown = goals.slice(0, SHOWN);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Maqsadlar</CardTitle>
        <CardDescription>
          {goals.length ? `${goals.filter((g) => g.done).length} / ${goals.length} ta bajarildi` : "Nimaga yig'yapsiz?"}
        </CardDescription>
        {goals.length > 0 && (
          <CardAction>
            <Link href="/budjet#maqsadlar" className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
              Barchasi <ArrowRight className="size-4" />
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 items-center">
        {shown.length === 0 ? (
          <Link
            href="/budjet#maqsadlar"
            className="flex w-full items-center gap-4 rounded-2xl border border-dashed p-4 transition-colors hover:bg-muted/50"
          >
            <IllustrationJar className="h-20" />
            <div className="space-y-1">
              <p className="font-heading text-base font-medium">Birinchi maqsadni qo&apos;shing</p>
              <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Plus className="size-4" /> Mashina, uy, sayohat...
              </p>
            </div>
          </Link>
        ) : (
          <div className={cn("grid w-full gap-4", shown.length === 1 ? "grid-cols-1" : shown.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
            {shown.map((goal) => (
              <Link key={goal.id} href="/budjet#maqsadlar" className="group flex flex-col items-center gap-2 text-center">
                <GoalJar
                  progress={goal.progress}
                  color={goal.color}
                  label={`${goal.name}: ${Math.round(goal.progress * 100)}%`}
                  className="h-24 transition-transform duration-300 group-hover:-translate-y-1"
                />
                <div className="w-full min-w-0">
                  <p className="truncate text-sm font-medium">{goal.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    <b className="font-semibold text-foreground">{Math.round(goal.progress * 100)}%</b> ·{" "}
                    {formatCompact(goal.savedAmount)} / {formatCompact(goal.targetAmount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
