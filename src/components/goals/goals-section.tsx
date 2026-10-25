"use client";

import { createElement, useState, useTransition } from "react";
import { CircleAlert, Loader2, Minus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteGoal, depositGoal, saveGoal } from "@/app/(app)/budjet/goal-actions";
import { ColorPicker, COLORS, IconPicker } from "@/app/(app)/sozlamalar/appearance-fields";
import { AmountInput } from "@/components/entries/amount-input";
import { GoalJar } from "@/components/goals/goal-jar";
import { EmptyState, IllustrationJar } from "@/components/illustrations";
import { Money } from "@/components/money";
import { ActivePill } from "@/components/motion/active-pill";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GoalItem } from "@/lib/data/goals";
import { formatDate } from "@/lib/dates";
import { getIcon } from "@/lib/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Modal = { type: "form"; goal: GoalItem | null } | { type: "deposit"; goal: GoalItem } | null;

/** Budjet sahifasidagi "Maqsadlar": idishli kartochkalar, pul qo'shish, tahrirlash, o'chirish */
export function GoalsSection({ goals }: { goals: GoalItem[] }) {
  const [modal, setModal] = useState<Modal>(null);
  const [version, setVersion] = useState(0);
  const [deleting, setDeleting] = useState<GoalItem | null>(null);
  const [pending, startTransition] = useTransition();

  const open = (next: Modal) => {
    setModal(next);
    setVersion((v) => v + 1);
  };

  const remove = (goal: GoalItem) =>
    startTransition(async () => {
      const result = await deleteGoal({ id: goal.id });
      if (result.ok) toast.success(`"${goal.name}" maqsadi o'chirildi`);
      else toast.error(result.error);
      setDeleting(null);
    });

  return (
    <section id="maqsadlar" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="space-y-0.5">
          <h2 className="font-heading text-xl font-medium">Maqsadlar</h2>
          <p className="text-sm text-muted-foreground">
            Nimaga yig&apos;yapsiz? Ajratgan pulingizni shu yerda belgilab boring — hamyonlardan ayrilmaydi.
          </p>
        </div>
        {goals.length > 0 && (
          <Button size="sm" onClick={() => open({ type: "form", goal: null })}>
            <Plus /> Maqsad
          </Button>
        )}
      </div>

      {goals.length === 0 ? (
        <EmptyState
          illustration={<IllustrationJar />}
          title="Birinchi maqsadni qo'shing"
          text="Mashina, uy, sayohat yoki xavfsizlik yostig'i — maqsad va summani yozing, idish asta-sekin to'lib boradi."
          action={
            <Button onClick={() => open({ type: "form", goal: null })}>
              <Plus /> Maqsad qo&apos;shish
            </Button>
          }
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDeposit={() => open({ type: "deposit", goal })}
              onEdit={() => open({ type: "form", goal })}
              onDelete={() => setDeleting(goal)}
            />
          ))}
        </div>
      )}

      <Dialog open={modal !== null} onOpenChange={(value) => !value && setModal(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          {modal?.type === "form" && <GoalForm key={version} goal={modal.goal} onDone={() => setModal(null)} />}
          {modal?.type === "deposit" && <DepositForm key={version} goal={modal.goal} onDone={() => setModal(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(value) => !value && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>&quot;{deleting?.name}&quot; o&apos;chirilsinmi?</AlertDialogTitle>
            <AlertDialogDescription>Maqsad va unga ajratilgan summa yozuvi o&apos;chadi. Hamyonlardagi pulga tegilmaydi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={() => deleting && remove(deleting)}>
              O&apos;chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function GoalCard({
  goal,
  onDeposit,
  onEdit,
  onDelete,
}: {
  goal: GoalItem;
  onDeposit: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const percent = Math.round(goal.progress * 100);
  return (
    <Card>
      <CardContent className="flex gap-4">
        <GoalJar progress={goal.progress} color={goal.color} label={`${goal.name}: ${percent}%`} className="h-28 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0" style={{ color: goal.color }}>
              {createElement(getIcon(goal.icon), { className: "size-4" })}
            </span>
            <p className="min-w-0 flex-1 truncate font-semibold">{goal.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Amallar" className="-mt-0.5 shrink-0">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil /> Tahrirlash
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 /> O&apos;chirish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <Money amount={goal.savedAmount} className="block truncate text-2xl" />
            <p className="text-xs text-muted-foreground">
              {formatMoney(goal.targetAmount)} dan · <b className="font-semibold text-foreground">{percent}%</b>
            </p>
          </div>
          <p className={cn("text-xs", goal.done ? "font-medium text-income" : "text-muted-foreground")}>
            {goal.done
              ? "Maqsadga yetdingiz! 🎉"
              : goal.deadline
                ? goal.daysLeft !== null && goal.daysLeft < 0
                  ? `Muddat o'tdi (${formatDate(new Date(goal.deadline))}) · ${formatMoney(goal.remaining)} qoldi`
                  : `${formatDate(new Date(goal.deadline))} gacha · oyiga ~${formatMoney(goal.monthlyNeeded ?? 0)}`
                : `Yana ${formatMoney(goal.remaining)} kerak`}
          </p>
          <Button size="sm" variant={goal.done ? "outline" : "default"} className="mt-auto self-start" onClick={onDeposit}>
            <Plus /> Pul qo&apos;shish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

function GoalForm({ goal, onDone }: { goal: GoalItem | null; onDone: () => void }) {
  const [name, setName] = useState(goal?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount ?? 0);
  const [icon, setIcon] = useState(goal?.icon ?? "Goal");
  const [color, setColor] = useState(goal?.color ?? COLORS[2]);
  const [deadline, setDeadline] = useState(goal?.deadline ? goal.deadline.slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveGoal({ id: goal?.id, name, targetAmount, icon, color, deadline });
      if (!result.ok) return setError(result.error);
      toast.success(goal ? "Maqsad saqlandi" : `"${name.trim()}" maqsadi qo'shildi`);
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{goal ? "Maqsadni tahrirlash" : "Yangi maqsad"}</DialogTitle>
        <DialogDescription>Masalan: Mashina, Umra safari, Xavfsizlik yostig&apos;i.</DialogDescription>
      </DialogHeader>
      <FormError error={error} />
      <div className="space-y-2">
        <Label htmlFor="goal-name">Nomi</Label>
        <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-target">Qancha kerak</Label>
        <AmountInput id="goal-target" value={targetAmount} onChange={setTargetAmount} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal-deadline">Qachongacha (ixtiyoriy)</Label>
        <DateTimePicker
          id="goal-deadline"
          value={deadline}
          onChange={setDeadline}
          withTime={false}
          clearable
          placeholder="Muddatsiz"
        />
      </div>
      <div className="space-y-2">
        <Label>Ikonka</Label>
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </div>
      <div className="space-y-2">
        <Label>Rang</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={pending || !name.trim() || targetAmount <= 0} className="min-w-28">
          {pending && <Loader2 className="animate-spin" />}
          Saqlash
        </Button>
      </DialogFooter>
    </form>
  );
}

const QUICK = [100_000, 500_000, 1_000_000];

/** Maqsadga pul qo'shish yoki undan olish */
function DepositForm({ goal, onDone }: { goal: GoalItem; onDone: () => void }) {
  const [mode, setMode] = useState<"add" | "take">("add");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const after = Math.max(goal.savedAmount + (mode === "add" ? amount : -amount), 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await depositGoal({ id: goal.id, amount: mode === "add" ? amount : -amount });
      if (!result.ok) return setError(result.error);
      toast.success(mode === "add" ? `${goal.name}: ${formatMoney(amount)} qo'shildi` : `${goal.name}: ${formatMoney(amount)} olindi`);
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{goal.name}</DialogTitle>
        <DialogDescription>
          Hozir: {formatMoney(goal.savedAmount)} / {formatMoney(goal.targetAmount)}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["add", "take"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors duration-200",
              mode === m ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode === m && (
              <ActivePill layoutId="goal-mode" className={cn("transition-colors duration-300", m === "add" ? "bg-income" : "bg-expense")} />
            )}
            {m === "add" ? <Plus className="relative size-4" /> : <Minus className="relative size-4" />}
            <span className="relative">{m === "add" ? "Qo'shish" : "Olish"}</span>
          </button>
        ))}
      </div>

      <FormError error={error} />

      <div className="flex items-center gap-4">
        <GoalJar progress={after / goal.targetAmount} color={goal.color} label="Natija" className="h-24 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <AmountInput value={amount} onChange={setAmount} autoFocus />
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <Button key={q} type="button" variant="secondary" size="xs" onClick={() => setAmount((a) => a + q)}>
                +{formatMoney(q)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Keyin: {formatMoney(after)} · {Math.round(Math.min(after / goal.targetAmount, 1) * 100)}%
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={pending || amount <= 0} className="min-w-28">
          {pending && <Loader2 className="animate-spin" />}
          Saqlash
        </Button>
      </DialogFooter>
    </form>
  );
}
