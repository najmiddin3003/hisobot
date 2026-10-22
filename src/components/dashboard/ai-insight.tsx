"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  MessageSquareText,
  PiggyBank,
  RefreshCw,
  Scissors,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { openAssistant } from "@/components/ai/open-assistant";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Insight, SavedInsight } from "@/lib/ai/insight-schema";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const VERDICTS: Record<Insight["verdict"], { label: string; icon: LucideIcon; className: string }> = {
  good: { label: "Yaxshi oy", icon: TrendingUp, className: "bg-income/10 text-income" },
  ok: { label: "O'rtacha", icon: AlertTriangle, className: "bg-debt/10 text-debt" },
  risky: { label: "Xavotirli", icon: TrendingDown, className: "bg-expense/10 text-expense" },
};

const TONES: Record<Insight["highlights"][number]["tone"], { icon: LucideIcon; className: string; label: string }> = {
  good: { icon: CheckCircle2, className: "text-income", label: "Ijobiy" },
  warning: { icon: AlertTriangle, className: "text-debt", label: "E'tibor bering" },
  bad: { icon: XCircle, className: "text-expense", label: "Salbiy" },
};

/** Dashboard'dagi oylik AI tahlil: faqat tugma bosilganda tayyorlanadi va oy uchun saqlanadi */
export function AiInsightCard({
  month,
  monthLabel,
  configured,
  initial,
  changedSince,
  className,
}: {
  month: string;
  monthLabel: string;
  configured: boolean;
  initial: SavedInsight | null;
  changedSince: number;
  className?: string;
}) {
  const [insight, setInsight] = useState(initial);
  const [changed, setChanged] = useState(changedSince);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = (await response.json().catch(() => null)) as { insight?: SavedInsight; error?: string } | null;
      if (!response.ok || !data?.insight) {
        toast.error(data?.error ?? "Tahlil qilib bo'lmadi. Qayta urinib ko'ring.");
        return;
      }
      setInsight(data.insight);
      setChanged(0);
    } catch {
      toast.error("Aloqa uzildi. Internetni tekshirib, qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> AI tahlil
        </CardTitle>
        <CardDescription>
          {insight ? `${formatDateTime(new Date(insight.generatedAt))} holatiga` : `${monthLabel} bo'yicha maslahatlar`}
        </CardDescription>
        {insight && configured && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Yangilash
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {loading ? (
          <InsightLoading />
        ) : insight ? (
          <InsightView insight={insight.data} changed={changed} monthLabel={monthLabel} />
        ) : (
          <InsightEmpty configured={configured} monthLabel={monthLabel} onGenerate={generate} />
        )}
      </CardContent>
    </Card>
  );
}

function InsightEmpty({ configured, monthLabel, onGenerate }: { configured: boolean; monthLabel: string; onGenerate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        {configured ? <Sparkles className="size-5" /> : <KeyRound className="size-5" />}
      </div>
      {configured ? (
        <>
          <p className="max-w-xs text-sm text-muted-foreground">
            AI {monthLabel} oyidagi xarajatlaringizni ko&apos;rib chiqib, keraksizlarini va tejash yo&apos;llarini topadi.
          </p>
          <Button onClick={onGenerate}>
            <Sparkles /> Tahlil qilish
          </Button>
        </>
      ) : (
        <p className="max-w-xs text-sm text-muted-foreground">
          AI hali ulanmagan: <code className="font-mono text-xs">.env.local</code> faylidagi{" "}
          <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> qatoriga Claude API kalitini yozing.
        </p>
      )}
    </div>
  );
}

function InsightLoading() {
  return (
    <div className="flex flex-1 flex-col gap-3" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Tahlil qilinmoqda — odatda 20–60 soniya
      </p>
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
    </div>
  );
}

function InsightView({ insight, changed, monthLabel }: { insight: Insight; changed: number; monthLabel: string }) {
  const verdict = VERDICTS[insight.verdict];
  const totalSaving = insight.tips.reduce((sum, t) => sum + Math.max(t.monthlySaving, 0), 0);

  return (
    <>
      <div className="flex gap-3 rounded-lg border p-3">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", verdict.className)}>
          <verdict.icon className="size-4" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold">{verdict.label}</p>
          <p className="text-sm text-muted-foreground">{insight.summary}</p>
        </div>
      </div>

      {changed > 0 && (
        <p className="-mt-1 text-xs text-muted-foreground">
          Tahlildan keyin {changed} ta yozuv qo&apos;shildi yoki o&apos;zgardi — yangilash mumkin.
        </p>
      )}

      <Tabs defaultValue="highlights" className="flex-1 gap-3">
        <TabsList className="w-full">
          <TabsTrigger value="highlights">Kuzatuvlar</TabsTrigger>
          <TabsTrigger value="cuts">Kamaytirish</TabsTrigger>
          <TabsTrigger value="tips">Tejash</TabsTrigger>
        </TabsList>

        <TabsContent value="highlights" className="space-y-2">
          {insight.highlights.map((item, i) => {
            const tone = TONES[item.tone];
            return (
              <div key={i} className="flex gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
                <tone.icon className={cn("mt-0.5 size-4 shrink-0", tone.className)} aria-label={tone.label} />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="cuts" className="space-y-2">
          {insight.cuts.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-income" /> Bu oy keraksiz xarajat topilmadi
            </p>
          ) : (
            insight.cuts.map((item, i) => (
              <div key={i} className="flex gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
                <Scissors className="mt-0.5 size-4 shrink-0 text-expense" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.category}</p>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-expense">{formatMoney(item.amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="tips" className="space-y-2">
          {totalSaving > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-income/10 px-3 py-2.5">
              <span className="text-sm">Jami tejash mumkin</span>
              <span className="text-sm font-semibold tabular-nums text-income">~{formatMoney(totalSaving)} / oy</span>
            </div>
          )}
          {insight.tips.map((tip, i) => (
            <div key={i} className="flex gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
              <PiggyBank className="mt-0.5 size-4 shrink-0 text-income" />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{tip.title}</p>
                  {tip.monthlySaving > 0 && (
                    <span className="shrink-0 text-xs font-medium tabular-nums text-income">
                      ~{formatMoney(tip.monthlySaving)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{tip.detail}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => openAssistant(`${monthLabel} oyi tahlilini batafsil tushuntirib bering: qaysi xarajatlarni qanday kamaytirsam bo'ladi?`)}
      >
        <MessageSquareText /> AI bilan batafsil gaplashish
      </Button>
    </>
  );
}
