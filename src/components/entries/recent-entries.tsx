"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, ReceiptText } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { EntryEditorProvider, useEntryEditor } from "@/components/entries/entry-editor";
import { EntryRow } from "@/components/entries/entry-row";
import { Collapse } from "@/components/motion/collapse";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import type { Entry, EntryOptions } from "@/lib/entries";

/** Dashboard: oxirgi yozuvlar va tezkor qo'shish */
export function RecentEntries({ entries, options }: { entries: Entry[]; options: EntryOptions }) {
  return (
    <EntryEditorProvider options={options}>
      <RecentEntriesCard entries={entries} />
    </EntryEditorProvider>
  );
}

function RecentEntriesCard({ entries }: { entries: Entry[] }) {
  const editor = useEntryEditor();
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle>So&apos;nggi yozuvlar</CardTitle>
        <CardAction className="flex gap-1.5">
          <Button size="sm" variant="outline" className="text-expense" onClick={() => editor.openNew("chiqim")}>
            <Minus /> Chiqim
          </Button>
          <Button size="sm" variant="outline" className="text-income" onClick={() => editor.openNew("kirim")}>
            <Plus /> Kirim
          </Button>
        </CardAction>
      </CardHeader>
      {entries.length > 0 ? (
        <div className="divide-y">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <Collapse key={`${entry.kind}-${entry.id}`}>
                <EntryRow entry={entry} withDate onClick={() => editor.openEdit(entry)} />
              </Collapse>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
          <ReceiptText className="size-6" />
          Hali yozuv yo&apos;q — birinchisini qo&apos;shing
        </div>
      )}
      <Link
        href="/kirim-chiqim"
        className="flex items-center justify-center gap-1.5 border-t py-3 text-sm font-medium text-primary hover:bg-muted/50"
      >
        Barcha yozuvlar <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}
