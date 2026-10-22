import { Suspense } from "react";
import type { Metadata } from "next";
import { ListCardSkeleton } from "@/components/skeletons";
import { getTrash } from "@/lib/data/entries";
import { TrashView } from "./trash-view";

export const metadata: Metadata = { title: "Savatcha" };

export default function TrashPage() {
  return (
    <Suspense fallback={<ListCardSkeleton rows={4} />}>
      <TrashContent />
    </Suspense>
  );
}

async function TrashContent() {
  return <TrashView entries={await getTrash()} />;
}
