import { createElement } from "react";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Kategoriya/hamyon ikonkasi o'z rangidagi yumshoq fon ustida */
export function ColorIcon({
  icon,
  color,
  className,
}: {
  icon: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", className)}
      // #rrggbb + "1f" ≈ 12% shaffoflikdagi fon
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {createElement(getIcon(icon), { className: "size-4" })}
    </span>
  );
}
