"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m, useReducedMotion, type Transition } from "motion/react";
import { openAssistant } from "@/components/ai/open-assistant";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getRobotTips } from "./actions";
import { Oydin, type RobotEyes, type RobotMouth } from "./oydin";
import { useRobotEnabled } from "./use-robot";

type Pose = { eyes: RobotEyes; mouth: RobotMouth; waving: boolean; thrust: number; sleeping: boolean };

const IDLE: Pose = { eyes: "open", mouth: "smile", waving: false, thrust: 1, sleeping: false };
const EDGE = 12;
/** Shuncha vaqt hech narsa qilinmasa — qo'nib uxlab qoladi */
const SLEEP_AFTER = 90_000;
/** Gaplar orasidagi eng kam vaqt */
const TALK_EVERY = 28_000;
const TIPS_TTL = 2 * 60_000;
/** Sichqoncha yaqinlashganda shuncha piksel chetga suriladi */
const DODGE = 96;

const GENERIC = [
  "Meni bosing, savolingizga javob beraman 💬",
  "Bugun ham tejaymizmi? 💪",
  "Kayfiyat zo'rmi? Menimcha zo'r! 😄",
  "Kichik tejash — katta natija ✨",
  "Men shu yerdaman, kerak bo'lsam bosing 🙂",
];

const ROUTE_LINES: Record<string, string[]> = {
  "/": ["Bugungi holatni birga ko'ramizmi? 📊", "Dashboard bugun ham chiroyli chiqdi!"],
  "/kirim-chiqim": ["Har bir so'mni yozib boring, men kuzatib turaman 👀", "Yangi yozuv uchun + tugmasini bosing"],
  "/budjet": ["Maqsad idishlarini to'ldiramizmi? 🫙", "Budjet nazoratda, zo'r!"],
  "/qarzlar": ["Qarzlarni vaqtida yopsak, uyqu shirin bo'ladi 😌"],
  "/xaq": ["Sizdan qarzdorlarni ham unutmaymiz 📒"],
  "/sozlamalar": ["Meni shu yerda o'chirib qo'yish mumkin... lekin qilmang-da 🥺"],
};

const NEAR = ["Salom! 👋", "Meni bosing, yordam beraman 💬", "Hehe, men shu yerdaman 😄", "Nima qilamiz bugun? ✨"];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function greeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "Xayrli tong, jigar! ☀️";
  if (hour >= 11 && hour < 17) return "Salom, jigar! 👋";
  if (hour >= 17 && hour < 23) return "Xayrli kech, jigar! 🌙";
  return "Hali uxlamadingizmi, jigar? 🌙";
}

const noop = () => () => {};
const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const viewportWidth = () => document.documentElement.clientWidth;
const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;

/**
 * Oydin — sayt bo'ylab (ekranning pastki qismida) uchib yuradigan robotcha.
 * Uchadi, shoshib "yuguradi", salto qiladi, sichqoncha yaqinlashsa salom beradi, uzoq tinchlikda uxlaydi.
 * Bosilsa — AI yordamchi ochiladi. Sozlamalarda o'chirib qo'yish mumkin.
 */
export function RobotCompanion() {
  const enabled = useRobotEnabled();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const width = useSyncExternalStore(subscribeResize, viewportWidth, () => 0);
  const desktop = useSyncExternalStore(subscribeResize, isDesktop, () => false);
  const reduced = useReducedMotion();
  const pathname = usePathname();

  const size = desktop ? 64 : 48;
  const maxX = Math.max(width - size - EDGE, EDGE);
  const maxLift = desktop ? 40 : 20;

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [move, setMove] = useState<Transition>({ duration: 1.2, ease: "easeOut" });
  const [lean, setLean] = useState(0);
  const [facing, setFacing] = useState<1 | -1>(-1);
  const [pose, setPose] = useState<Pose>(IDLE);
  const [flipKey, setFlipKey] = useState(0);
  const [bubble, setBubble] = useState<{ id: number; text: string } | null>(null);

  const robotRef = useRef<HTMLDivElement>(null);
  const timers = useRef<{ bubble?: number; settle?: number }>({});
  const lastActivity = useRef(0);
  const lastTalk = useRef(0);
  const lastNear = useRef(0);
  const holdUntil = useRef(0);
  const asleep = useRef(false);
  const tips = useRef<{ at: number; list: string[] }>({ at: 0, list: [] });

  const x = pos ? clamp(pos.x, EDGE, maxX) : maxX;
  const y = pos?.y ?? 0;

  const say = (text: string, ms = 4200) => {
    window.clearTimeout(timers.current.bubble);
    setBubble({ id: Date.now(), text });
    lastTalk.current = Date.now();
    timers.current.bubble = window.setTimeout(() => setBubble(null), ms);
  };

  /** Harakat tugagach — tik turib, odatiy holatga qaytadi */
  const settle = (afterMs: number, next: Partial<Pose> = {}) => {
    window.clearTimeout(timers.current.settle);
    timers.current.settle = window.setTimeout(() => {
      setLean(0);
      setPose((p) => (p.sleeping ? p : { ...IDLE, ...next }));
    }, afterMs);
  };

  const flyTo = (targetX: number, targetY: number, fast: boolean) => {
    const distance = Math.abs(targetX - x);
    const duration = fast ? clamp(distance / 520, 0.45, 1.2) : clamp(distance / 150, 1.1, 4.5);
    const dir = targetX >= x ? 1 : -1;
    setFacing(dir);
    setMove({ duration, ease: fast ? [0.7, 0, 0.2, 1] : "easeInOut" });
    setPos({ x: targetX, y: targetY });
    setLean(dir * (fast ? 16 : 7));
    setPose({ ...IDLE, eyes: fast ? "wow" : "happy", mouth: fast ? "open" : "smile", thrust: fast ? 2 : 1.4 });
    settle(duration * 1000);
    return duration * 1000;
  };

  const wave = (text: string) => {
    setFacing(x + size / 2 < width / 2 ? 1 : -1);
    setLean(0);
    setPose({ ...IDLE, eyes: "happy", mouth: "open", waving: true });
    say(text);
    settle(2600);
  };

  const flip = () => {
    setFlipKey((k) => k + 1);
    setMove({ duration: 0.5, ease: "easeOut" });
    setPos({ x, y: -Math.min(maxLift, 36) });
    setPose({ ...IDLE, eyes: "happy", mouth: "open", thrust: 2 });
    settle(1000);
  };

  const nextTip = () => {
    const pool = [...tips.current.list, ...(ROUTE_LINES[pathname] ?? []), ...GENERIC];
    return pick(pool);
  };

  const loadTips = useEffectEvent(() => {
    if (Date.now() - tips.current.at < TIPS_TTL) return;
    tips.current.at = Date.now();
    getRobotTips()
      .then((list) => (tips.current.list = list))
      .catch(() => {});
  });

  // ---- Asosiy sikl: har safar keyingi harakatni tasodifiy tanlaydi ----
  const step = useEffectEvent((): number => {
    const now = Date.now();
    if (document.hidden || asleep.current) return 3000;
    if (holdUntil.current > now) return holdUntil.current - now + 200;

    if (now - lastActivity.current > SLEEP_AFTER) {
      asleep.current = true;
      window.clearTimeout(timers.current.settle);
      setMove({ duration: 1.6, ease: "easeInOut" });
      setPos({ x, y: 0 });
      setLean(0);
      setFacing(1);
      setPose({ ...IDLE, eyes: "closed", thrust: 0, sleeping: true });
      setBubble(null);
      return 3000;
    }

    if (now - lastTalk.current > TALK_EVERY + rand(0, 20_000)) {
      wave(nextTip());
      return 4200;
    }

    const r = Math.random();
    if (r < 0.45) {
      // Kamida ekranning chorak qismi narigi tomonga uchadi
      let target = rand(EDGE, maxX);
      if (Math.abs(target - x) < width / 4) target = x > width / 2 ? rand(EDGE, width / 3) : rand((width * 2) / 3 - size, maxX);
      return flyTo(clamp(target, EDGE, maxX), -rand(8, maxLift), false) + rand(800, 2400);
    }
    if (r < 0.6) {
      const target = x > width / 2 ? rand(EDGE, width * 0.35) : rand(width * 0.65 - size, maxX);
      if (Math.random() < 0.35) say("Vuuush! 💨", 1600);
      return flyTo(clamp(target, EDGE, maxX), -rand(4, 14), true) + rand(600, 1600);
    }
    if (r < 0.8) {
      // Joyida suzib turadi, ba'zan orqasiga o'giriladi
      if (Math.random() < 0.5) setFacing((f) => (f === 1 ? -1 : 1));
      setMove({ duration: 1.4, ease: "easeInOut" });
      setPos({ x, y: -rand(6, maxLift * 0.6) });
      setPose(IDLE);
      return rand(2500, 5000);
    }
    if (r < 0.9) {
      flip();
      if (Math.random() < 0.3) say("Hop! 🤸", 1500);
      return 1800;
    }
    wave(nextTip());
    return 4200;
  });

  useEffect(() => {
    if (!mounted || !enabled || reduced) return;
    lastActivity.current = Date.now();
    let timer = window.setTimeout(function loop() {
      timer = window.setTimeout(loop, step());
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [mounted, enabled, reduced]);

  // ---- Birinchi chiqish: pastdan ko'tarilib salom beradi ----
  const greet = useEffectEvent(() => {
    loadTips();
    lastActivity.current = Date.now();
    setPose({ ...IDLE, eyes: "happy", mouth: "open", waving: true });
    say(greeting(), 4500);
    settle(2600);
  });
  useEffect(() => {
    if (!mounted || !enabled) return;
    const timer = window.setTimeout(greet, 900);
    return () => window.clearTimeout(timer);
  }, [mounted, enabled]);

  // ---- Sahifa almashganda — o'sha bo'limga mos gap ----
  const firstPath = useRef(true);
  const onRoute = useEffectEvent(() => {
    loadTips();
    if (asleep.current || Math.random() > 0.7) return;
    const lines = ROUTE_LINES[pathname];
    if (lines) wave(pick(lines));
  });
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const timer = window.setTimeout(onRoute, 700);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // ---- Faollik: uyg'onish va sichqoncha yaqinlashganda salom ----
  const onActivity = useEffectEvent((event: Event) => {
    const now = Date.now();
    lastActivity.current = now;
    if (asleep.current) {
      asleep.current = false;
      setPose({ ...IDLE, eyes: "happy", mouth: "open" });
      setMove({ duration: 0.8, ease: "easeOut" });
      setPos({ x, y: -Math.min(20, maxLift) });
      say("Uyg'ondim! ☀️", 2500);
      holdUntil.current = now + 2500;
      return;
    }
    if (reduced || event.type !== "pointermove" || now - lastNear.current < 12_000) return;
    const rect = robotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX, clientY } = event as PointerEvent;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) > 150) return;

    // Ostidagi tugmani to'sib qolmaslik uchun bir chetga suriladi, keyin sichqoncha tomonga qarab salom beradi.
    // Keyingi 12 soniya qochmaydi — shunda uni bemalol bosish mumkin.
    lastNear.current = now;
    holdUntil.current = now + 3500;
    const here = clamp(rect.left, EDGE, maxX);
    let away = here + (dx >= 0 ? -DODGE : DODGE);
    if (away < EDGE || away > maxX) away = here + (dx >= 0 ? DODGE : -DODGE);
    setMove({ duration: 0.45, ease: "easeOut" });
    setPos({ x: clamp(away, EDGE, maxX), y });
    setLean(0);
    setFacing(dx >= 0 ? 1 : -1);
    setPose({ ...IDLE, eyes: "happy", mouth: "open", waving: true });
    say(pick(NEAR), 3000);
    settle(2600);
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
    return () => {
      window.clearTimeout(t.bubble);
      window.clearTimeout(t.settle);
    };
  }, []);

  if (!mounted || !enabled || width === 0) return null;

  const onRight = x + size / 2 > width / 2;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-30 h-0 lg:bottom-4 print:hidden"
      data-robot-layer
    >
      <m.div
        ref={robotRef}
        className="absolute bottom-0 left-0"
        style={{ width: size }}
        initial={{ x, y: 60, opacity: 0 }}
        animate={{ x, y, opacity: 1 }}
        transition={{ x: move, y: move, opacity: { duration: 0.4 } }}
      >
        <AnimatePresence>
          {bubble && (
            <m.p
              key={bubble.id}
              aria-hidden
              initial={{ opacity: 0, scale: 0.6, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
              transition={SPRING}
              className={cn(
                "absolute bottom-full mb-1.5 w-max max-w-[min(15rem,calc(100vw-2rem))] rounded-2xl border bg-card px-3 py-2 text-sm leading-snug font-medium text-card-foreground shadow-lg shadow-black/10",
                onRight ? "right-0 origin-bottom-right rounded-br-md" : "left-0 origin-bottom-left rounded-bl-md",
              )}
            >
              {bubble.text}
            </m.p>
          )}
        </AnimatePresence>

        <m.button
          type="button"
          onClick={() => {
            lastActivity.current = Date.now();
            holdUntil.current = Date.now() + 2000;
            flip();
            say("Nima yordam kerak? 💬", 2500);
            openAssistant();
          }}
          aria-label="Oydin — AI yordamchini ochish"
          title="Oydin — AI yordamchi"
          className="pointer-events-auto block w-full cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          animate={{ rotate: lean }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <m.div animate={{ scaleX: facing }} transition={{ duration: 0.25 }}>
            <div key={flipKey} className={cn(flipKey > 0 && "robot-flip")}>
              <Oydin {...pose} className="h-auto w-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.15)]" />
            </div>
          </m.div>
        </m.button>
      </m.div>
    </div>
  );
}
