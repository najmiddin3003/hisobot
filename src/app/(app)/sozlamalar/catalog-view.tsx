"use client";

import { useState, useTransition } from "react";
import {
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/(app)/kirim-chiqim/actions";
import { ColorIcon } from "@/components/color-icon";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryItem, WalletItem } from "@/lib/data/settings";
import { WALLET_KIND_LABELS, type TxType } from "@/lib/domain";
import { formatCurrency } from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  deleteCategory,
  deleteWallet,
  moveCategory,
  moveWallet,
  setCategoryArchived,
  setWalletArchived,
} from "./catalog-actions";
import { CategoryForm, WalletForm } from "./catalog-forms";

type RowItem = { id: string; name: string; icon: string; color: string; deletable: boolean };

/** Amal natijasi: xato bo'lsa toast, muvaffaqiyatda xabar */
function useRunner() {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>, success?: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else if (success) toast.success(success);
    });
  return { pending, run };
}

/** Bitta qator: ikonka, nomi, izoh va amallar menyusi */
function CatalogRow({
  item,
  detail,
  badge,
  extra,
  first,
  last,
  locked,
  onEdit,
  onMove,
  onArchive,
  onDelete,
}: {
  item: RowItem;
  detail: React.ReactNode;
  badge?: React.ReactNode;
  extra?: React.ReactNode;
  first: boolean;
  last: boolean;
  /** Tizim kategoriyasi: yashirib/o'chirib bo'lmaydi */
  locked?: boolean;
  onEdit: () => void;
  onMove: (direction: "up" | "down") => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border p-2.5 pr-1.5">
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ColorIcon icon={item.icon} color={item.color} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{item.name}</span>
            {badge}
          </p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </button>
      {extra}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`${item.name}: amallar`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> Tahrirlash
          </DropdownMenuItem>
          <DropdownMenuItem disabled={first} onSelect={() => onMove("up")}>
            <ArrowUp /> Yuqoriga
          </DropdownMenuItem>
          <DropdownMenuItem disabled={last} onSelect={() => onMove("down")}>
            <ArrowDown /> Pastga
          </DropdownMenuItem>
          {!locked && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onArchive}>
                <EyeOff /> Yashirish
              </DropdownMenuItem>
              {item.deletable && (
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 /> O&apos;chirish
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Yashirilganlar ro'yxati — ochiladigan blok */
function ArchivedList<T extends RowItem>({
  items,
  detail,
  pending,
  onRestore,
  onDelete,
}: {
  items: T[];
  detail: (item: T) => string;
  pending: boolean;
  onRestore: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-dashed">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <EyeOff className="size-4" /> Yashirilganlar ({items.length})
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t p-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg p-1.5 opacity-80">
              <ColorIcon icon={item.icon} color={item.color} className="size-8 grayscale" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">{detail(item)}</p>
              </div>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => onRestore(item)}>
                <ArchiveRestore /> Qaytarish
              </Button>
              {item.deletable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-expense"
                  disabled={pending}
                  onClick={() => onDelete(item)}
                  aria-label={`${item.name}ni o'chirish`}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmDelete({
  target,
  what,
  onCancel,
  onConfirm,
}: {
  target: RowItem | null;
  what: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            &quot;{target?.name}&quot; {what} o&apos;chirilsinmi?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Unda hech qanday yozuv yo&apos;q, shuning uchun butunlay o&apos;chiriladi. Buni qaytarib bo&apos;lmaydi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            O&apos;chirish
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const entriesText = (count: number) => (count > 0 ? `${count} ta yozuv` : "Yozuv yo'q");

// ---------------------------------------------------------------- Kategoriyalar

export function CategoriesCard({ categories, className }: { categories: CategoryItem[]; className?: string }) {
  const [tab, setTab] = useState<TxType>("chiqim");
  const [editing, setEditing] = useState<CategoryItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<CategoryItem | null>(null);
  const { pending, run } = useRunner();

  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  const detail = (c: CategoryItem) => {
    const parts = [entriesText(c.entries)];
    if (c.keywords.length) parts.push(`kalit so'zlar: ${c.keywords.slice(0, 4).join(", ")}${c.keywords.length > 4 ? "…" : ""}`);
    else if (!c.systemKey || c.systemKey === "oylik") parts.push("kalit so'z yo'q");
    return parts.join(" · ");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Kategoriyalar</CardTitle>
        <CardDescription>
          {active.filter((c) => c.type === "chiqim").length} ta chiqim, {active.filter((c) => c.type === "kirim").length} ta kirim
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Kategoriya
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as TxType)} className="gap-4">
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="chiqim">Chiqim</TabsTrigger>
              <TabsTrigger value="kirim">Kirim</TabsTrigger>
            </TabsList>
            {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>

          {(["chiqim", "kirim"] as const).map((type) => {
            const list = active.filter((c) => c.type === type);
            return (
              <TabsContent key={type} value={type} className="min-w-0 space-y-3">
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  {list.map((category, i) => (
                    <CatalogRow
                      key={category.id}
                      item={category}
                      detail={detail(category)}
                      badge={
                        category.systemKey && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            tizim
                          </Badge>
                        )
                      }
                      first={i === 0}
                      last={i === list.length - 1}
                      locked={Boolean(category.systemKey)}
                      onEdit={() => setEditing(category)}
                      onMove={(direction) => run(() => moveCategory({ id: category.id, direction }))}
                      onArchive={() =>
                        run(
                          () => setCategoryArchived({ id: category.id, archived: true }),
                          `"${category.name}" yashirildi — eski yozuvlarda ko'rinib turadi`,
                        )
                      }
                      onDelete={() => setDeleting(category)}
                    />
                  ))}
                </div>
                <ArchivedList
                  items={archived.filter((c) => c.type === type)}
                  detail={(c) => entriesText(c.entries)}
                  pending={pending}
                  onRestore={(c) => run(() => setCategoryArchived({ id: c.id, archived: false }), `"${c.name}" qaytarildi`)}
                  onDelete={setDeleting}
                />
              </TabsContent>
            );
          })}
        </Tabs>
        <p className="mt-4 text-xs text-muted-foreground">
          Yozuvi bor kategoriya o&apos;chirilmaydi, faqat yashiriladi: yangi yozuvlarda tanlanmaydi, eskilarida esa nomi qoladi.
        </p>
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          {editing !== null && (
            <CategoryForm
              key={editing === "new" ? "new" : editing.id}
              category={editing === "new" ? null : editing}
              defaultType={tab}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        target={deleting}
        what="kategoriyasi"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) run(() => deleteCategory({ id: target.id }), `"${target.name}" o'chirildi`);
        }}
      />
    </Card>
  );
}

// ---------------------------------------------------------------- Hamyonlar

export function WalletsCard({ wallets, className }: { wallets: WalletItem[]; className?: string }) {
  const [editing, setEditing] = useState<WalletItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<WalletItem | null>(null);
  const { pending, run } = useRunner();

  const active = wallets.filter((w) => !w.archived);
  const archived = wallets.filter((w) => w.archived);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Hamyonlar {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>{active.length} ta hamyon</CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Hamyon
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {active.map((wallet, i) => (
            <CatalogRow
              key={wallet.id}
              item={wallet}
              // Tor ustunda nomi kesilib qolmasligi uchun qoldiq ikkinchi qatorda
              detail={
                <>
                  <span
                    className={cn("font-semibold text-foreground tabular-nums", wallet.balance < 0 && "text-expense")}
                  >
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </span>
                  {wallet.currency !== "UZS" && ` ≈ ${formatMoney(wallet.balanceUzs)}`}
                  {` · ${WALLET_KIND_LABELS[wallet.kind]} · ${entriesText(wallet.entries)}`}
                </>
              }
              first={i === 0}
              last={i === active.length - 1}
              onEdit={() => setEditing(wallet)}
              onMove={(direction) => run(() => moveWallet({ id: wallet.id, direction }))}
              onArchive={() =>
                run(() => setWalletArchived({ id: wallet.id, archived: true }), `"${wallet.name}" yashirildi`)
              }
              onDelete={() => setDeleting(wallet)}
            />
          ))}
        </div>
        <ArchivedList
          items={archived}
          detail={(w) => `${WALLET_KIND_LABELS[w.kind]} · ${entriesText(w.entries)}`}
          pending={pending}
          onRestore={(w) => run(() => setWalletArchived({ id: w.id, archived: false }), `"${w.name}" qaytarildi`)}
          onDelete={setDeleting}
        />
        <p className="text-xs text-muted-foreground">
          Hamyonni yashirishdan oldin undagi pulni o&apos;tkazma bilan boshqa hamyonga o&apos;tkazing.
        </p>
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          {editing !== null && (
            <WalletForm
              key={editing === "new" ? "new" : editing.id}
              wallet={editing === "new" ? null : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        target={deleting}
        what="hamyoni"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) run(() => deleteWallet({ id: target.id }), `"${target.name}" o'chirildi`);
        }}
      />
    </Card>
  );
}
