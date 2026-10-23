import { cache } from "react";
import { EntryEditorProvider } from "@/components/entries/entry-editor";
import { QuickAddButton, QuickAddShell } from "@/components/entries/quick-add-button";
import { requireUser } from "@/lib/auth/dal";
import { loadEntryOptions } from "@/lib/data/entries";
import { connectDB } from "@/lib/db";

// Yuqori va pastki paneldagi ikkala tugma bitta so'rovda bir marta yuklangan ro'yxatdan foydalanadi
const loadOptions = cache(async () => {
  await requireUser();
  await connectDB();
  return loadEntryOptions();
});

/** Istalgan sahifadan yangi kirim/chiqim/o'tkazma qo'shish tugmasi (o'z oynasi bilan) */
export async function QuickAdd({ variant }: { variant: "fab" | "pill" }) {
  const options = await loadOptions();
  return (
    <EntryEditorProvider options={options}>
      <QuickAddButton variant={variant} />
    </EntryEditorProvider>
  );
}

export function QuickAddFallback({ variant }: { variant: "fab" | "pill" }) {
  return <QuickAddShell variant={variant} />;
}
