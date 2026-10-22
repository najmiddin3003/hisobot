"use client";

import { Copy, Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Zaxira kodlarni bir marta ko'rsatadi: nusxa olish va .txt fayl sifatida saqlash */
export function BackupCodes({ codes }: { codes: string[] }) {
  const text = codes.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kodlar nusxalandi");
    } catch {
      toast.error("Nusxa olib bo'lmadi — kodlarni qo'lda yozib oling");
    }
  };

  const download = () => {
    const content = `Hisob — zaxira kodlar\n\nHar bir kod faqat bir marta ishlaydi.\n\n${text}\n`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "hisob-zaxira-kodlar.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Alert className="border-debt/40 bg-debt/5">
        <TriangleAlert className="text-debt" />
        <AlertDescription>
          Telefon yo&apos;qolsa, shu kodlar bilan kirasiz. Har biri faqat bir marta ishlaydi va{" "}
          <b>boshqa ko&apos;rsatilmaydi</b> — xavfsiz joyga saqlang.
        </AlertDescription>
      </Alert>
      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3">
        {codes.map((code) => (
          <code key={code} className="rounded-md bg-background px-2 py-1.5 text-center font-mono text-sm tracking-wider">
            {code}
          </code>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={copy}>
          <Copy /> Nusxa olish
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download /> Yuklab olish
        </Button>
      </div>
    </div>
  );
}
