"use client";

import { useTransition } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EntryRow } from "@/components/entries/entry-row";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import type { Entry } from "@/lib/entries";
import { purgeEntry, restoreEntry } from "../actions";

export function TrashView({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Trash2 className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Savatcha bo&apos;sh</p>
          <p className="text-sm text-muted-foreground">O&apos;chirilgan yozuvlar shu yerga tushadi va qayta tiklanadi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {entries.length} ta o&apos;chirilgan yozuv. Tiklansa, avvalgi kuni va hamyoniga qaytadi.
      </p>
      <Card className="gap-0 divide-y py-0">
        {entries.map((entry) => (
          <TrashItem key={`${entry.kind}-${entry.id}`} entry={entry} />
        ))}
      </Card>
    </div>
  );
}

function TrashItem({ entry }: { entry: Entry }) {
  const [pending, startTransition] = useTransition();
  const ref = { kind: entry.kind, id: entry.id };

  const restore = () =>
    startTransition(async () => {
      const result = await restoreEntry(ref);
      if (result.ok) toast.success("Tiklandi");
      else toast.error(result.error);
    });

  const purge = () =>
    startTransition(async () => {
      const result = await purgeEntry(ref);
      if (result.ok) toast.success("Butunlay o'chirildi");
      else toast.error(result.error);
    });

  return (
    <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:pb-0">
      <div className="min-w-0 flex-1">
        <EntryRow entry={entry} withDate />
        {entry.deletedAt && (
          <p className="-mt-2 pl-17 text-xs text-muted-foreground">O&apos;chirilgan: {formatDateTime(new Date(entry.deletedAt))}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2 px-4 sm:pr-4 sm:pl-0">
        <Button variant="outline" size="sm" onClick={restore} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Tiklash
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} className="text-destructive">
              <Trash2 /> Butunlay
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Butunlay o&apos;chirilsinmi?</AlertDialogTitle>
              <AlertDialogDescription>
                Bu yozuv bazadan o&apos;chiriladi va uni qayta tiklab bo&apos;lmaydi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={purge}>
                Butunlay o&apos;chirish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
