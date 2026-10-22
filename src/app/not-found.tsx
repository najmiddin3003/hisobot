import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">Sahifa topilmadi</p>
        <p className="text-sm text-muted-foreground">Bunday manzil mavjud emas.</p>
      </div>
      <Button asChild>
        <Link href="/">Dashboard&apos;ga qaytish</Link>
      </Button>
    </div>
  );
}
