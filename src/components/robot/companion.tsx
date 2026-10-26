"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m, useReducedMotion, type Transition } from "motion/react";
import { openAssistant } from "@/components/ai/open-assistant";
import type { CompanionLine, CompanionMood } from "@/lib/companion";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getCompanionLines } from "./actions";
import { ROBOT_EVENT, type RobotEventDetail } from "./events";
import { EVERYDAY, REACTIONS, ROUTE_LINES, greeting, pick, shuffle } from "./lines";
import { Oydin } from "./oydin";
import { useRobotEnabled } from "./use-robot";

const EDGE = 8;
/** SVG nisbati (balandlik / kenglik) — oydin.tsx viewBox */
const RATIO = 194 / 120;
/** Shuncha vaqt hech narsa qilinmasa — pastga tushib uxlab qoladi */
const SLEEP_AFTER = 120_000;
/** O'z-o'zidan gapirish oralig'i (eng kami) */
const TALK_EVERY = 35_000;
/** Foydalanuvchi qo'ygan joyda shuncha turadi, keyin yana aylana boshlaydi */
const REST_AFTER_DROP = 45_000;
/** Server gaplari shuncha vaqtda bir yangilanadi */
const LINES_TTL = 30 * 60_000;
/** Sahifa shuncha vaqt yashirin turib qaytilsa — "sog'indim" */
const MISSED_AFTER = 3 * 60_000;

type Pos = { x: number; y: number };
type Bubble = { id: number; text: string; below: boolean; right: boolean };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number; vw: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const noop = () => () => {};
const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;
const viewportKey = () => `${window.innerWidth}x${window.innerHeight}`;

/** Yuradigan hudud: yuqori panel ostidan, telefonda — pastki menyudan yuqorida */
function readBounds(w: number, h: number): Bounds {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
  // Pastki menyu — ekran tagiga yopishgan, ko'rinib turgan nav (kompyuterda yashirin)
  const nav = [...document.querySelectorAll<HTMLElement>("nav")].find(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().bottom >= vh - 1,
  );
  const navTop = nav ? nav.getBoundingClientRect().top : vh;
  const minY = Math.max(header, 0) + EDGE;
  return { minX: EDGE, maxX: Math.max(EDGE, vw - w - EDGE), minY, maxY: Math.max(minY, navTop - h - EDGE), vw };
}

/**
 * Oydin — ekran bo'ylab uchib yuradigan yordamchi qiz.
 * Istalgan joyga uchadi, shoshib "yuguradi", salto qiladi; sichqonchani sudrab xohlagan joyga qo'yish mumkin.
 * Erkalab gapiradi, voqealarga (kirim, katta xarajat...) hissiy javob beradi, uzoq tinchlikda uxlaydi.
 * Bosilsa — AI yordamchi (u ham Oydin) ochiladi. Sozlamalarda o'chirib qo'yish mumkin.
 */
export function RobotCompanion() {
  const enabled = useRobotEnabled();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const desktop = useSyncExternalStore(subscribeResize, isDesktop, () => false);
  const viewport = useSyncExternalStore(subscribeResize, viewportKey, () => "");
  const reduced = useReducedMotion();
  const pathname = usePathname();

  const w = desktop ? 64 : 52;
  const h = Math.round(w * RATIO);

  const [pos, setPos] = useState<Pos | null>(null);
  const [move, setMove] = useState<Transition>({ duration: 0 });
  const [lean, setLean] = useState(0);
  const [facing, setFacing] = useState<1 | -1>(-1);
  const [mood, setMood] = useState<CompanionMood>("idle");
  const [talking, setTalking] = useState(false);
  const [waving, setWaving] = useState(false);
  const [thrust, setThrust] = useState(0);
  const [gait, setGait] = useState<"stand" | "walk" | "run">("stand");
  const [flipKey, setFlipKey] = useState(0);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [dragging, setDragging] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const timers = useRef<Record<string, number>>({});
  const life = useRef({ lastActivity: 0, lastTalk: 0, lastNear: 0, holdUntil: 0, restUntil: 0, asleep: false, hiddenAt: 0 });
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; lastX: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const pool = useRef<{ lines: CompanionLine[]; queue: CompanionLine[]; at: number }>({ lines: [], queue: [], at: 0 });

  const later = (name: string, ms: number, fn: () => void) => {
    window.clearTimeout(timers.current[name]);
    timers.current[name] = window.setTimeout(fn, ms);
  };

  /** Hozirgi (animatsiya o'rtasidagi bo'lsa ham) haqiqiy joy */
  const currentPos = (): Pos | null => {
    const rect = boxRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : pos;
  };

  const say = (line: CompanionLine, ms = 4800) => {
    const at = currentPos() ?? { x: 0, y: 0 };
    const b = readBounds(w, h);
    setBubble({ id: Date.now(), text: line.text, below: at.y < b.minY + 70, right: at.x + w / 2 > b.vw / 2 });
    life.current.lastTalk = Date.now();
    setMood(line.mood);
    setTalking(!reduced);
    later("talk", Math.min(2600, 700 + line.text.length * 30), () => setTalking(false));
    later("bubble", ms, () => setBubble(null));
    later("mood", ms + 300, () => {
      if (!life.current.asleep && !drag.current) setMood("idle");
    });
  };

  const wave = (ms = 2400) => {
    setWaving(true);
    later("wave", ms, () => setWaving(false));
  };

  /** Qadam tashlab boradi (bir tekis tezlikda); run — yuguradi */
  const walkTo = (target: Pos, run: boolean) => {
    const from = currentPos() ?? target;
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    const speed = (run ? 230 : 80) * (desktop ? 1 : 0.75);
    const duration = clamp(distance / speed, 0.6, 12);
    const dir = target.x >= from.x ? 1 : -1;
    setFacing(dir);
    setMove({ duration, ease: "linear" });
    setPos(target);
    setGait(run ? "run" : "walk");
    setLean(dir * (run ? 8 : 2));
    later("settle", duration * 1000, () => {
      setGait("stand");
      setLean(0);
    });
    return duration * 1000;
  };

  /** Yaqin-atrofga (ko'pincha yon tomonga) — ekran chetlarida ko'proq yuradi, kontentni kamroq to'sadi */
  const pickTarget = (b: Bounds, far = false): Pos => {
    const from = currentPos() ?? { x: b.maxX, y: b.maxY };
    let target = from;
    for (let i = 0; i < 8; i++) {
      const length = far ? rand(320, 700) : rand(110, 380);
      // Asosan gorizontal yuradi, yuqori-pastga kamroq
      const angle = rand(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI);
      const x = clamp(from.x + Math.cos(angle) * length, b.minX, b.maxX);
      const y = clamp(from.y + Math.sin(angle) * length * 0.7, b.minY, b.maxY);
      target = { x, y };
      if (Math.hypot(x - from.x, y - from.y) > 90) break;
    }
    return target;
  };

  /** Joyida sakrab salto qiladi — krossovkalardagi reaktiv nur yonadi */
  const flip = () => {
    setFlipKey((k) => k + 1);
    setThrust(2);
    setMood("happy");
    later("jet", 900, () => setThrust(0));
    later("mood", 1100, () => setMood("idle"));
  };

  const nextLine = (): CompanionLine => {
    const p = pool.current;
    if (p.queue.length === 0) {
      // Ma'lumotga asoslangan (yoki AI) gaplar ko'proq, bo'lim va kundalik gaplar aralash
      p.queue = shuffle([...p.lines, ...p.lines, ...(ROUTE_LINES[pathname] ?? []), ...shuffle(EVERYDAY).slice(0, 5)]);
    }
    return p.queue.pop() ?? pick(EVERYDAY);
  };

  /** Turgan joyida uxlab qoladi */
  const fallAsleep = () => {
    const at = currentPos();
    if (!at) return;
    life.current.asleep = true;
    window.clearTimeout(timers.current.settle);
    setMove({ duration: 0.2, ease: "easeOut" });
    setPos(at);
    setGait("stand");
    setLean(0);
    setThrust(0);
    setBubble(null);
    setTalking(false);
    setMood("sleepy");
  };

  const wake = () => {
    const now = Date.now();
    life.current.asleep = false;
    life.current.holdUntil = now + 3000;
    say(pick(REACTIONS.wake), 3400);
  };

  // ---- Server gaplari (AI kaliti bo'lsa — Claude yozgani) ----
  const loadLines = useEffectEvent(async () => {
    const p = pool.current;
    if (Date.now() - p.at < LINES_TTL) return;
    p.at = Date.now();
    try {
      const result = await getCompanionLines();
      p.lines = result.lines;
      p.queue = [];
      // AI yangi gaplarni fonda yozyapti — bir daqiqadan keyin qayta so'raymiz
      if (result.pending) {
        window.setTimeout(() => {
          p.at = 0;
          void loadLines();
        }, 60_000);
      }
    } catch {
      p.at = Date.now() - LINES_TTL + 5 * 60_000;
    }
  });

  // ---- Asosiy sikl: har safar keyingi harakatni tanlaydi ----
  const step = useEffectEvent((): number => {
    const now = Date.now();
    const s = life.current;
    if (!pos || document.hidden || s.asleep || drag.current) return 2500;
    if (s.holdUntil > now) return s.holdUntil - now + 200;
    const b = readBounds(w, h);

    if (now - s.lastActivity > SLEEP_AFTER) {
      fallAsleep();
      return 3000;
    }
    if (now - s.lastTalk > TALK_EVERY + rand(0, 25_000)) {
      say(nextLine());
      if (Math.random() < 0.3) wave();
      s.holdUntil = now + 4500;
      return 4700;
    }
    // Foydalanuvchi qo'ygan joyda turibdi — faqat atrofga qaraydi
    if (s.restUntil > now) {
      if (Math.random() < 0.4) setFacing((f) => (f === 1 ? -1 : 1));
      return rand(3000, 5000);
    }

    const r = Math.random();
    if (r < 0.55) return walkTo(pickTarget(b), false) + rand(1500, 4000);
    if (r < 0.62) {
      if (Math.random() < 0.4) say(pick(REACTIONS.dash), 1800);
      return walkTo(pickTarget(b, true), true) + rand(900, 2000);
    }
    if (r < 0.82) {
      if (Math.random() < 0.5) setFacing((f) => (f === 1 ? -1 : 1));
      return rand(2500, 5000);
    }
    if (r < 0.9) {
      flip();
      return 1800;
    }
    setMood(pick(["think", "wink", "happy", "shy"] as const));
    later("mood", 2600, () => setMood("idle"));
    return 3000;
  });

  useEffect(() => {
    if (!mounted || !enabled || reduced) return;
    let timer = window.setTimeout(function loop() {
      timer = window.setTimeout(loop, step());
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [mounted, enabled, reduced]);

  // ---- Paydo bo'lish: pastki o'ng burchakdan, vaqtga mos salom ----
  const appear = useEffectEvent(() => {
    const b = readBounds(w, h);
    life.current.lastActivity = Date.now();
    setPos({ x: b.maxX, y: b.maxY });
    void loadLines();
    later("greet", 900, () => {
      wave();
      say(greeting(), 5000);
    });
  });
  useEffect(() => {
    if (!mounted || !enabled) return;
    appear();
    const refresh = window.setInterval(() => void loadLines(), 5 * 60_000);
    return () => window.clearInterval(refresh);
  }, [mounted, enabled]);

  // Oyna o'lchami o'zgarsa — chegaradan chiqib ketmasin
  const keepInside = useEffectEvent(() => {
    const b = readBounds(w, h);
    setMove({ duration: 0.3, ease: "easeOut" });
    setPos((p) => (p ? { x: clamp(p.x, b.minX, b.maxX), y: clamp(p.y, b.minY, b.maxY) } : p));
  });
  useEffect(() => {
    if (viewport) keepInside();
  }, [viewport]);

  // ---- Bo'lim almashganda — o'sha bo'limga mos gap ----
  const firstPath = useRef(true);
  const onRoute = useEffectEvent(() => {
    void loadLines();
    if (life.current.asleep || drag.current || Math.random() > 0.7) return;
    const lines = ROUTE_LINES[pathname];
    if (lines) say(pick(lines));
  });
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const timer = window.setTimeout(onRoute, 700);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // ---- Saytdagi voqealar: yozuv qo'shildi, katta xarajat... ----
  const onRobotEvent = useEffectEvent((detail: RobotEventDetail) => {
    const now = Date.now();
    life.current.lastActivity = now;
    life.current.holdUntil = now + 4000;
    if (life.current.asleep) {
      life.current.asleep = false;
    }
    const lines = detail.editing
      ? REACTIONS.saved
      : detail.kind === "kirim"
        ? REACTIONS.income
        : detail.kind === "otkazma"
          ? REACTIONS.transfer
          : detail.big
            ? REACTIONS.bigExpense
            : REACTIONS.expense;
    say(pick(lines));
    if (detail.kind === "kirim" && !detail.editing) setFlipKey((k) => k + 1);
  });
  useEffect(() => {
    if (!mounted || !enabled) return;
    const handler = (event: Event) => onRobotEvent((event as CustomEvent<RobotEventDetail>).detail);
    window.addEventListener(ROBOT_EVENT, handler);
    return () => window.removeEventListener(ROBOT_EVENT, handler);
  }, [mounted, enabled]);

  // ---- Sahifaga qaytilganda — "sog'indim" ----
  const onVisibility = useEffectEvent(() => {
    const s = life.current;
    if (document.hidden) {
      s.hiddenAt = Date.now();
      return;
    }
    if (s.hiddenAt && Date.now() - s.hiddenAt > MISSED_AFTER) {
      s.lastActivity = Date.now();
      if (s.asleep) wake();
      else say(pick(REACTIONS.comeBack));
    }
    void loadLines();
  });
  useEffect(() => {
    if (!mounted || !enabled) return;
    const handler = () => onVisibility();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [mounted, enabled]);

  // ---- Faollik: uyg'onish va sichqoncha yaqinlashganda salom ----
  const onActivity = useEffectEvent((event: Event) => {
    const now = Date.now();
    const s = life.current;
    s.lastActivity = now;
    if (s.asleep) {
      wake();
      return;
    }
    if (reduced || !desktop || event.type !== "pointermove" || drag.current || now - s.lastNear < 25_000) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX, clientY } = event as PointerEvent;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) > 130) return;

    // To'xtab, sichqoncha tomonga qarab salom beradi
    s.lastNear = now;
    s.holdUntil = now + 3200;
    window.clearTimeout(timers.current.settle);
    setMove({ duration: 0.3, ease: "easeOut" });
    setPos({ x: rect.left, y: rect.top });
    setGait("stand");
    setLean(0);
    setFacing(dx >= 0 ? 1 : -1);
    wave();
    say(pick(REACTIONS.near), 3200);
  });
  useEffect(() => {
    if (!mounted || !enabled) return;
    let last = 0;
    const handler = (event: Event) => {
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      onActivity(event);
    };
    const events = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, handler, { passive: true });
    return () => {
      for (const name of events) window.removeEventListener(name, handler);
    };
  }, [mounted, enabled]);

  // Sahifa pastiga qo'shimcha joy (layout.tsx dagi in-data-[robot] uchun)
  const visible = mounted && enabled;
  useEffect(() => {
    if (!visible) return;
    document.body.dataset.robot = "";
    return () => {
      delete document.body.dataset.robot;
    };
  }, [visible]);

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach((id) => window.clearTimeout(id));
  }, []);

  // ---- Sudrab olib yurish ----
  const startDrag = () => {
    const s = life.current;
    s.lastActivity = Date.now();
    if (s.asleep) s.asleep = false;
    window.clearTimeout(timers.current.settle);
    setGait("stand");
    setDragging(true);
    setWaving(false);
    say(pick(REACTIONS.dragStart), 2200);
    // Avval hayron, keyin kulib yuboradi
    later("giggle", 800, () => {
      if (drag.current) setMood("happy");
    });
  };

  const endDrag = () => {
    const now = Date.now();
    const b = readBounds(w, h);
    setDragging(false);
    setGait("stand");
    setLean(0);
    setMove({ duration: 0.4, ease: "easeOut" });
    // Yuqori panel yoki pastki menyu ustida qolmasin
    setPos((p) => (p ? { x: clamp(p.x, b.minX, b.maxX), y: clamp(p.y, b.minY, b.maxY) } : p));
    life.current.restUntil = now + REST_AFTER_DROP;
    life.current.holdUntil = now + 3000;
    say(pick(REACTIONS.drop), 3600);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      sx: event.clientX,
      sy: event.clientY,
      ox: event.clientX - rect.left,
      oy: event.clientY - rect.top,
      lastX: event.clientX,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(event.clientX - d.sx, event.clientY - d.sy) < 6) return;
      d.moved = true;
      startDrag();
    }
    const vw = document.documentElement.clientWidth;
    setMove({ duration: 0 });
    setPos({ x: clamp(event.clientX - d.ox, 0, vw - w), y: clamp(event.clientY - d.oy, 0, window.innerHeight - h) });
    // Tez sudralsa — oyoqlari osilib, u yoqdan-bu yoqqa chayqaladi
    setLean(clamp((event.clientX - d.lastX) * 2, -22, 22));
    d.lastX = event.clientX;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (d.moved) {
      justDragged.current = true;
      endDrag();
    }
  };

  const onClick = () => {
    // Sudrab qo'yilgandan keyingi "click" chatni ochmaydi
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    const now = Date.now();
    life.current.lastActivity = now;
    life.current.holdUntil = now + 2600;
    if (life.current.asleep) {
      life.current.asleep = false;
    }
    say(pick(REACTIONS.click), 2600);
    openAssistant();
  };

  if (!mounted || !enabled || !pos) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 print:hidden" data-robot-layer>
      <m.div
        ref={boxRef}
        className="absolute top-0 left-0"
        style={{ width: w, height: h }}
        initial={{ x: pos.x, y: pos.y + 40, opacity: 0 }}
        animate={{ x: pos.x, y: pos.y, opacity: 1 }}
        transition={{ x: move, y: move, opacity: { duration: 0.4 } }}
      >
        <AnimatePresence>
          {bubble && (
            <m.p
              key={bubble.id}
              aria-hidden
              initial={{ opacity: 0, scale: 0.6, y: bubble.below ? -8 : 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              transition={SPRING}
              className={cn(
                "absolute w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-2xl border bg-card px-3 py-2 text-sm leading-snug font-medium text-card-foreground shadow-lg shadow-black/10",
                bubble.below ? "top-full mt-1.5" : "bottom-full mb-1.5",
                bubble.right ? "right-0" : "left-0",
                bubble.below
                  ? bubble.right
                    ? "origin-top-right rounded-tr-md"
                    : "origin-top-left rounded-tl-md"
                  : bubble.right
                    ? "origin-bottom-right rounded-br-md"
                    : "origin-bottom-left rounded-bl-md",
              )}
            >
              {bubble.text}
            </m.p>
          )}
        </AnimatePresence>

        <m.button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onClick}
          aria-label="Oydin — AI yordamchini ochish (sudrab boshqa joyga qo'yish mumkin)"
          title="Oydin — bosing yoki sudrab boshqa joyga qo'ying"
          className={cn(
            "pointer-events-auto block size-full touch-none rounded-full outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          animate={{ rotate: lean, scale: dragging ? 1.08 : 1 }}
          whileHover={{ scale: dragging ? 1.08 : 1.05 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <m.div className="size-full" animate={{ scaleX: facing }} transition={{ duration: 0.25 }}>
            <div key={flipKey} className={cn("size-full", flipKey > 0 && "robot-flip")}>
              <Oydin
                mood={mood}
                talking={talking}
                waving={waving && !dragging}
                gait={dragging ? "stand" : gait}
                thrust={dragging ? 0 : thrust}
                className="size-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.15)]"
              />
            </div>
          </m.div>
        </m.button>
      </m.div>
    </div>
  );
}
