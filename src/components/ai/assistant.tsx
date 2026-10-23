"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowUp,
  Database,
  History,
  KeyRound,
  Loader2,
  MessageSquare,
  Sparkles,
  SquarePen,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteChat, getAssistantState } from "@/lib/ai/actions";
import { MAX_MESSAGE_LENGTH, QUICK_PROMPTS, type ChatSummary } from "@/lib/ai/shared";
import { dayKey, formatDayHeading, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import { OPEN_ASSISTANT_EVENT, type OpenAssistantDetail } from "./open-assistant";
import { useAssistantChat, type UiTurn } from "./use-assistant-chat";

/** "Bugun, 14:35" yoki "20 oktabr, seshanba, 14:35" */
function formatWhen(iso: string) {
  const date = new Date(iso);
  return `${formatDayHeading(dayKey(date))}, ${formatTime(date)}`;
}

/** Har sahifada pastki o'ng burchakdagi tugma va o'ngdan ochiladigan suhbat paneli */
export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [, startLoading] = useTransition();

  const refresh = () =>
    startLoading(async () => {
      const state = await getAssistantState();
      setConfigured(state.configured);
      setChats(state.chats);
    });

  const chat = useAssistantChat({ onFinished: refresh, onNotConfigured: () => setConfigured(false) });

  const show = (next: boolean) => {
    setOpen(next);
    if (next) refresh();
  };

  // Boshqa joydan (masalan, Dashboard'dagi AI tahlildan) ochish
  const onOpenRequest = useEffectEvent((detail: OpenAssistantDetail) => {
    show(true);
    setView("chat");
    if (detail.prompt && !chat.busy) chat.send(detail.prompt, { fresh: true });
  });
  useEffect(() => {
    const handler = (event: Event) => onOpenRequest((event as CustomEvent<OpenAssistantDetail>).detail ?? {});
    window.addEventListener(OPEN_ASSISTANT_EVENT, handler);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, handler);
  }, []);

  const newChat = () => {
    chat.reset();
    setView("chat");
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={() => show(true)}
            className="fixed right-6 bottom-6 z-40 hidden size-12 rounded-full shadow-lg shadow-black/20 lg:inline-flex"
            aria-label="AI yordamchi"
          >
            {chat.busy ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">AI yordamchi</TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={show}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
          onOpenAutoFocus={(e) => {
            // Kompyuterda darhol yozish mumkin bo'lsin; telefonda klaviatura o'zi ochilib ketmasin
            e.preventDefault();
            const content = e.currentTarget as HTMLElement;
            const input = content.querySelector("textarea");
            if (input && window.matchMedia("(pointer: fine)").matches) input.focus();
            else content.focus();
          }}
        >
          <header className="flex items-center gap-3 border-b px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base">AI yordamchi</SheetTitle>
              <SheetDescription className="truncate text-xs">
                {view === "history" ? "Oldingi suhbatlar" : (chat.title ?? "Yangi suhbat")}
              </SheetDescription>
            </div>
            <HeaderButton
              label={view === "history" ? "Suhbatga qaytish" : "Suhbatlar tarixi"}
              onClick={() => setView(view === "history" ? "chat" : "history")}
              active={view === "history"}
            >
              <History />
            </HeaderButton>
            <HeaderButton label="Yangi suhbat" onClick={newChat}>
              <SquarePen />
            </HeaderButton>
            <HeaderButton label="Yopish" onClick={() => show(false)}>
              <X />
            </HeaderButton>
          </header>

          {view === "history" ? (
            <ChatHistory
              chats={chats}
              activeId={chat.chatId}
              onOpen={async (id) => {
                if (chat.busy) chat.stop();
                if (await chat.load(id)) setView("chat");
                else toast.error("Suhbat topilmadi");
              }}
              onDeleted={(id) => {
                setChats((list) => list.filter((c) => c.id !== id));
                if (chat.chatId === id) chat.reset();
              }}
            />
          ) : (
            <ChatBody chat={chat} configured={configured} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function HeaderButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={label}
          className={cn("size-8 shrink-0", active && "bg-accent text-accent-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type Chat = ReturnType<typeof useAssistantChat>;

function ChatBody({ chat, configured }: { chat: Chat; configured: boolean | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [draft, setDraft] = useState("");

  // Pastga yopishib turadi, foydalanuvchi yuqoriga o'qish uchun ko'tarilmagan bo'lsa
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [chat.turns]);

  const submit = (text = draft) => {
    if (!text.trim() || chat.busy) return;
    stickRef.current = true;
    chat.send(text);
    setDraft("");
  };

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {configured === false && <NotConfigured />}
        {chat.turns.length === 0 ? (
          <EmptyState disabled={configured === false} onPick={(prompt) => submit(prompt)} />
        ) : (
          <div className="space-y-5">
            {chat.turns.map((turn) => (turn.role === "user" ? <UserTurn key={turn.key} turn={turn} /> : <BotTurn key={turn.key} turn={turn} />))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="border-t p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5 pl-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            placeholder="Savolingizni yozing..."
            aria-label="Savol"
            disabled={configured === false}
            className="field-sizing-content max-h-36 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          {chat.busy ? (
            <Button type="button" size="icon" variant="secondary" className="size-8 shrink-0" onClick={chat.stop} aria-label="To'xtatish">
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button type="submit" size="icon" className="size-8 shrink-0" disabled={!draft.trim() || configured === false} aria-label="Yuborish">
              <ArrowUp />
            </Button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
          AI ma&apos;lumotlaringizni faqat o&apos;qiydi, hech narsani o&apos;zgartirmaydi.
          <span className="hidden md:inline"> Enter — yuborish, Shift+Enter — yangi qator.</span>
        </p>
      </form>
    </>
  );
}

function NotConfigured() {
  return (
    <div className="mb-4 flex gap-3 rounded-xl border border-debt/40 bg-debt/10 p-3 text-sm">
      <KeyRound className="mt-0.5 size-4 shrink-0 text-debt" />
      <div className="space-y-1">
        <p className="font-medium">AI hali ulanmagan</p>
        <p className="text-muted-foreground">
          <code className="font-mono text-xs">.env.local</code> faylidagi{" "}
          <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> qatoriga Claude API kalitini yozing va saytni qayta ishga
          tushiring.
        </p>
      </div>
    </div>
  );
}

function EmptyState({ disabled, onPick }: { disabled: boolean; onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 pt-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Moliyangiz bo&apos;yicha savol bering</p>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          Kirim-chiqim, budjet va qarzlaringizni ko&apos;rib chiqaman, keraksiz xarajatlarni topaman va tejash yo&apos;llarini
          aytaman.
        </p>
      </div>
      <div className="grid w-full gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <MessageSquare className="size-4 shrink-0 text-primary" />
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserTurn({ turn }: { turn: UiTurn }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
        {turn.text}
      </div>
      <time dateTime={turn.at} className="px-1 text-[11px] text-muted-foreground">
        {formatWhen(turn.at)}
      </time>
    </div>
  );
}

function BotTurn({ turn }: { turn: UiTurn }) {
  const waiting = turn.pending && !turn.text;
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {turn.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {turn.tools.map((label) => {
              const active = turn.pending && turn.activeTool === label;
              return (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {active ? <Loader2 className="size-3 animate-spin" /> : <Database className="size-3" />}
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {waiting && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> {turn.progress ?? "O'ylanmoqda"}...
          </p>
        )}

        {turn.text && <Markdown text={turn.text} />}

        {turn.note && (
          <p
            className={cn(
              "flex items-start gap-1.5 text-xs",
              turn.status === "aborted" ? "text-muted-foreground" : "text-expense",
            )}
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            {turn.note}
          </p>
        )}

        {!turn.pending && (
          <time dateTime={turn.at} className="block text-[11px] text-muted-foreground">
            {formatWhen(turn.at)}
          </time>
        )}
      </div>
    </div>
  );
}

function ChatHistory({
  chats,
  activeId,
  onOpen,
  onDeleted,
}: {
  chats: ChatSummary[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (chats.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <History className="size-5" />
        Hali suhbatlar yo&apos;q
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {chats.map((c) => (
        <div
          key={c.id}
          className={cn(
            "group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-accent",
            c.id === activeId && "bg-accent",
          )}
        >
          <button type="button" onClick={() => onOpen(c.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
            <p className="truncate text-sm font-medium">{c.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatWhen(c.updatedAt)} · {Math.ceil(c.turns / 2)} ta savol
            </p>
          </button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={confirming === c.id ? "O'chirishni tasdiqlash" : "Suhbatni o'chirish"}
            onBlur={() => setConfirming(null)}
            onClick={() => {
              if (confirming !== c.id) return setConfirming(c.id);
              startTransition(async () => {
                await deleteChat(c.id);
                onDeleted(c.id);
                setConfirming(null);
                toast.success("Suhbat o'chirildi");
              });
            }}
            className={cn(
              "size-8 shrink-0 text-muted-foreground",
              confirming === c.id ? "bg-expense/10 text-expense hover:bg-expense/15 hover:text-expense" : "opacity-60 group-hover:opacity-100",
            )}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <p className="px-3 py-2 text-xs text-muted-foreground">O&apos;chirish uchun savat belgisini ikki marta bosing.</p>
    </div>
  );
}
