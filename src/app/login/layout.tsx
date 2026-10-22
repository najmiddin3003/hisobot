import { PiggyBank, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <PiggyBank className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold">Hisob</p>
          <p className="text-xs text-muted-foreground">Shaxsiy moliya</p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Ikki bosqichli himoya · barcha kirishlar qayd etiladi
      </p>
    </div>
  );
}
