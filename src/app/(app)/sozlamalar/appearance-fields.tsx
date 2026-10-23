"use client";

import { createElement, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { ICON_NAMES, getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** Kategoriya va hamyonlar uchun tayyor ranglar (qorong'i va yorug' fonda ham ko'rinadi) */
export const COLORS = [
  "#16a34a",
  "#059669",
  "#0d9488",
  "#0891b2",
  "#0284c7",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#9333ea",
  "#db2777",
  "#e11d48",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#ca8a04",
  "#64748b",
];

export function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (icon: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Ikonka" className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
      {ICON_NAMES.map((name) => {
        const selected = name === value;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            onClick={() => onChange(name)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border transition-colors hover:bg-accent",
              selected ? "border-transparent ring-2 ring-offset-1 ring-offset-background" : "text-muted-foreground",
            )}
            style={selected ? { backgroundColor: `${color}1f`, color, ["--tw-ring-color" as string]: color } : undefined}
          >
            {createElement(getIcon(name), { className: "size-4" })}
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const custom = !COLORS.includes(value.toLowerCase());
  return (
    <div role="radiogroup" aria-label="Rang" className="flex flex-wrap gap-2">
      {COLORS.map((color) => {
        const selected = color === value.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className="flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110"
            style={{ backgroundColor: color, boxShadow: selected ? `0 0 0 2px var(--background), 0 0 0 4px ${color}` : undefined }}
          >
            {selected && <Check className="size-3.5 text-white" />}
          </button>
        );
      })}
      {/* Boshqa rang — brauzerning rang tanlagichi */}
      <label
        className={cn(
          "relative flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed text-muted-foreground hover:bg-accent",
          custom && "border-solid",
        )}
        style={custom ? { backgroundColor: value, boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${value}` } : undefined}
        title="Boshqa rang"
      >
        {custom ? <Check className="size-3.5 text-white" /> : <Plus className="size-3.5" />}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Boshqa rang"
        />
      </label>
    </div>
  );
}

/** Botda "45000 taksi" deb yozilganda kategoriyani topish uchun so'zlar */
export function KeywordsInput({ value, onChange, id }: { value: string[]; onChange: (keywords: string[]) => void; id?: string }) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const words = raw
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w && w.length <= 30 && !value.includes(w));
    if (words.length) onChange([...value, ...new Set(words)]);
    setDraft("");
  };

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
      {value.map((word) => (
        <span key={word} className="inline-flex items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs">
          {word}
          <button
            type="button"
            onClick={() => onChange(value.filter((w) => w !== word))}
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label={`${word} so'zini olib tashlash`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => {
          const text = e.target.value;
          if (text.endsWith(",")) add(text);
          else setDraft(text);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? "" : "masalan: taksi, metro, benzin"}
        maxLength={30}
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
