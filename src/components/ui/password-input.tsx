"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Parol maydoni: ko'z belgisi bilan yozilganini ko'rsatish/yashirish */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
        className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,scale] hover:bg-muted hover:text-foreground active:scale-90"
      >
        {/* Ikonka almashganda yumshoq aylanib kiradi */}
        {visible ? (
          <EyeOff key="off" className="size-4 animate-in duration-200 fade-in zoom-in-75" />
        ) : (
          <Eye key="on" className="size-4 animate-in duration-200 fade-in zoom-in-75" />
        )}
      </button>
    </div>
  );
}
