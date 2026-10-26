// Oydin — sayt bo'ylab uchib yuradigan qiz-robotcha (SVG). Harakat va gaplar: companion.tsx
// Qiyofa: terrakota peshona sochi va ikki tugun, zaytun rang hudi, jinsi yubka, oq krossovka, yelka sumkasi.
import type { CompanionMood } from "@/lib/companion";
import { cn } from "@/lib/utils";

export type RobotMood = CompanionMood;

type Eyes = "open" | "happy" | "wow" | "closed" | "wink" | "sad" | "love" | "shy" | "flat" | "up";
type Mouth = "smile" | "open" | "grin" | "small" | "sad" | "pout";
type Brows = "none" | "sad" | "angry" | "up";
type Arms = "rest" | "cheer" | "cheeks" | "low" | "think" | "hips";

/** Har bir kayfiyat: ko'z, og'iz, qosh, qo'l holati va qizarish */
const MOODS: Record<RobotMood, { eyes: Eyes; mouth: Mouth; brows: Brows; arms: Arms; blush: "soft" | "strong"; tilt: number }> = {
  idle: { eyes: "open", mouth: "smile", brows: "none", arms: "rest", blush: "soft", tilt: 0 },
  happy: { eyes: "happy", mouth: "open", brows: "none", arms: "rest", blush: "soft", tilt: 0 },
  excited: { eyes: "happy", mouth: "grin", brows: "none", arms: "cheer", blush: "soft", tilt: 0 },
  love: { eyes: "love", mouth: "smile", brows: "none", arms: "cheeks", blush: "strong", tilt: 4 },
  shy: { eyes: "shy", mouth: "small", brows: "none", arms: "cheeks", blush: "strong", tilt: 7 },
  sad: { eyes: "sad", mouth: "sad", brows: "sad", arms: "low", blush: "soft", tilt: -5 },
  worried: { eyes: "open", mouth: "small", brows: "sad", arms: "think", blush: "soft", tilt: -3 },
  pout: { eyes: "flat", mouth: "pout", brows: "angry", arms: "hips", blush: "strong", tilt: -4 },
  surprised: { eyes: "wow", mouth: "small", brows: "up", arms: "cheer", blush: "soft", tilt: 0 },
  sleepy: { eyes: "closed", mouth: "small", brows: "none", arms: "low", blush: "soft", tilt: 6 },
  nod: { eyes: "happy", mouth: "smile", brows: "none", arms: "rest", blush: "soft", tilt: 0 },
  wink: { eyes: "wink", mouth: "smile", brows: "none", arms: "rest", blush: "soft", tilt: 3 },
  think: { eyes: "up", mouth: "small", brows: "none", arms: "think", blush: "soft", tilt: -4 },
};

const INK = "#2B2A26";
const SHELL = "#E6D6B4";
const CLAY = "#C35F36";
const PINK = "#F29C8A";
const HEART = "#E35D6A";
const MINT = "#7FE0C4";
const OLIVE = "#6B7F3A";
const OLIVE_DARK = "#56682C";
const DENIM = "#5679A6";
const CREAM = "#F4EFE6";
const TEAR = "#8FD3F4";

const line = { stroke: INK, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Shine({ dx = 0, dy = 0, big = false }: { dx?: number; dy?: number; big?: boolean }) {
  return (
    <g fill="#fff">
      <circle cx={67.8 + dx} cy={75.6 + dy} r={big ? 2.2 : 1.7} />
      <circle cx={95.8 + dx} cy={75.6 + dy} r={big ? 2.2 : 1.7} />
      <circle cx={64.6 + dx} cy={80.6 + dy} r=".8" />
      <circle cx={92.6 + dx} cy={80.6 + dy} r=".8" />
    </g>
  );
}

const heartPath = (cx: number, cy: number, s = 1) =>
  `M${cx} ${cy + 5 * s}L${cx - 5 * s} ${cy}C${cx - 7.5 * s} ${cy - 2.5 * s} ${cx - 4.5 * s} ${cy - 6.5 * s} ${cx} ${cy - 3 * s}C${cx + 4.5 * s} ${cy - 6.5 * s} ${cx + 7.5 * s} ${cy - 2.5 * s} ${cx + 5 * s} ${cy}Z`;

function EyesShape({ type }: { type: Eyes }) {
  switch (type) {
    case "happy":
      return <path d="M60 80Q66 71 72 80M88 80Q94 71 100 80" {...line} strokeWidth="3" />;
    case "wow":
      return (
        <g>
          <g fill={INK}>
            <ellipse cx="66" cy="78" rx="5.6" ry="6.8" />
            <ellipse cx="94" cy="78" rx="5.6" ry="6.8" />
          </g>
          <Shine dx={0.4} dy={-0.3} big />
        </g>
      );
    case "closed":
      return <path d="M60 78Q66 83 72 78M88 78Q94 83 100 78" {...line} strokeWidth="2.8" />;
    case "wink":
      return (
        <g>
          <ellipse cx="66" cy="78" rx="4.6" ry="6" fill={INK} />
          <g fill="#fff">
            <circle cx="67.8" cy="75.6" r="1.7" />
            <circle cx="64.6" cy="80.6" r=".8" />
          </g>
          <path d="M88 80Q94 71 100 80" {...line} strokeWidth="3" />
        </g>
      );
    case "sad":
      return (
        <g>
          <g fill={INK}>
            <ellipse cx="66" cy="79" rx="4.4" ry="5.6" />
            <ellipse cx="94" cy="79" rx="4.4" ry="5.6" />
          </g>
          <Shine dy={1} big />
          <g fill={TEAR}>
            <ellipse cx="66" cy="83" rx="2.6" ry="1" />
            <ellipse cx="94" cy="83" rx="2.6" ry="1" />
          </g>
        </g>
      );
    case "love":
      return (
        <g fill={HEART} stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
          <path d={heartPath(66, 77)} />
          <path d={heartPath(94, 77)} />
        </g>
      );
    case "shy":
      return (
        <g>
          <g fill={INK}>
            <ellipse cx="64.5" cy="80.5" rx="4" ry="4.6" />
            <ellipse cx="92.5" cy="80.5" rx="4" ry="4.6" />
          </g>
          <g fill="#fff">
            <circle cx="65.8" cy="78.8" r="1.4" />
            <circle cx="93.8" cy="78.8" r="1.4" />
          </g>
          <path d="M59.5 76.4Q64.5 74.2 69.5 76.4M87.5 76.4Q92.5 74.2 97.5 76.4" {...line} strokeWidth="2" />
        </g>
      );
    case "flat":
      return (
        <g>
          <path d="M60.5 77.2h11M88.5 77.2h11" {...line} strokeWidth="2.6" />
          <path d="M61.6 77.6a4.4 4.6 0 0 0 8.8 0zM89.6 77.6a4.4 4.6 0 0 0 8.8 0z" fill={INK} />
        </g>
      );
    case "up":
      return (
        <g>
          <g fill={INK}>
            <ellipse cx="67.5" cy="76.5" rx="4.4" ry="5.6" />
            <ellipse cx="95.5" cy="76.5" rx="4.4" ry="5.6" />
          </g>
          <g fill="#fff">
            <circle cx="69" cy="74.3" r="1.6" />
            <circle cx="97" cy="74.3" r="1.6" />
          </g>
        </g>
      );
    default:
      return (
        <g className="robot-blink">
          <g fill={INK}>
            <ellipse cx="66" cy="78" rx="4.6" ry="6" />
            <ellipse cx="94" cy="78" rx="4.6" ry="6" />
          </g>
          <Shine />
        </g>
      );
  }
}

function MouthShape({ type, className }: { type: Mouth; className?: string }) {
  switch (type) {
    case "open":
    case "grin": {
      const d = type === "grin" ? "M73 88.5Q80 100 87 88.5Z" : "M74.5 89Q80 98 85.5 89Z";
      return (
        <g className={className}>
          <path d={d} fill={CLAY} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d={type === "grin" ? "M76.8 94.6Q80 92.6 83.2 94.6Q80 97.4 76.8 94.6Z" : "M77.5 93.8Q80 92.3 82.5 93.8Q80 95.8 77.5 93.8Z"} fill={PINK} />
        </g>
      );
    }
    case "small":
      return <ellipse className={className} cx="80" cy="91" rx="2.4" ry="2.1" fill={INK} />;
    case "sad":
      return <path className={className} d="M75.5 93Q80 89 84.5 93" {...line} strokeWidth="2.5" />;
    case "pout":
      return <path className={className} d="M77 92Q80 89.6 83 92" {...line} strokeWidth="2.3" />;
    default:
      return <path className={className} d="M75.5 90Q80 94 84.5 90" {...line} strokeWidth="2.5" />;
  }
}

function BrowsShape({ type }: { type: Brows }) {
  if (type === "none") return null;
  const d = {
    sad: "M61 70.5L70 67.6M90 67.6L99 70.5",
    angry: "M61 67.4L70 70.2M90 70.2L99 67.4",
    up: "M61 68.6Q65.5 65.6 70 68.2M90 68.2Q94.5 65.6 99 68.6",
  }[type];
  return <path d={d} {...line} strokeWidth="2.4" />;
}

/** Qo'l: yelkadan (ixtiyoriy tirsak orqali) kaftgacha — hudi yengi va kaft */
function Arm({ points, className, origin }: { points: number[][]; className?: string; origin?: string }) {
  const d = `M${points.map((p) => p.join(" ")).join("L")}`;
  const [hx, hy] = points[points.length - 1];
  return (
    <g className={className} style={origin ? { transformOrigin: origin } : undefined}>
      <path d={d} stroke={INK} strokeWidth="10.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={OLIVE} strokeWidth="6.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={hx} cy={hy} r="4.6" fill={SHELL} stroke={INK} strokeWidth="2" />
    </g>
  );
}

const SHOULDER_L = [59, 118];
const SHOULDER_R = [101, 118];
const ARM_POSES: Record<Arms, { l: number[][]; r: number[][] }> = {
  rest: { l: [SHOULDER_L, [49, 137]], r: [SHOULDER_R, [111, 137]] },
  cheer: { l: [SHOULDER_L, [46, 101]], r: [SHOULDER_R, [114, 101]] },
  cheeks: { l: [SHOULDER_L, [54, 99]], r: [SHOULDER_R, [106, 99]] },
  low: { l: [SHOULDER_L, [55, 140]], r: [SHOULDER_R, [105, 140]] },
  think: { l: [SHOULDER_L, [49, 137]], r: [SHOULDER_R, [100, 110], [91, 101]] },
  hips: { l: [SHOULDER_L, [47, 128], [55, 137]], r: [SHOULDER_R, [113, 128], [105, 137]] },
};

function Head({ mood, talking }: { mood: RobotMood; talking: boolean }) {
  const face = MOODS[mood];
  const sadMouth = face.mouth === "sad" || face.mouth === "pout";
  return (
    <g>
      {/* Tugunlar (boshning orqasida) */}
      <g fill={CLAY} stroke={INK} strokeWidth="2.5">
        <circle cx="37" cy="52" r="8" />
        <circle cx="123" cy="52" r="8" />
      </g>
      {/* Yurakcha antenna */}
      <path d="M80 34V21" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path className="robot-beat" d="M80 18c-3-5-10-2-7 3l7 6 7-6c3-5-4-8-7-3z" fill={PINK} stroke={INK} strokeWidth="1.2" />
      <ellipse cx="80" cy="70" rx="42" ry="36" fill={SHELL} stroke={INK} strokeWidth="2.5" />
      {/* Peshona sochi */}
      <path
        d="M38.6 64A42 36 0 0 1 121.4 64L118 66Q110 54 102 63Q94 52 86 62Q78 51 70 62Q62 52 54 63Q46 55 41 67Z"
        fill={CLAY}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M57 46Q67 40 79 40" stroke="#fff" strokeOpacity=".35" strokeWidth="3" fill="none" strokeLinecap="round" />

      <BrowsShape type={face.brows} />
      <EyesShape type={face.eyes} />

      {/* Yonoqlar */}
      {face.blush === "strong" ? (
        <g>
          <g fill={PINK}>
            <ellipse cx="57" cy="88" rx="6.2" ry="3.8" />
            <ellipse cx="103" cy="88" rx="6.2" ry="3.8" />
          </g>
          <path
            d="M53.5 89.5l2-2.8M57 90l2-2.8M60.5 90.5l2-2.8M99.5 89.5l2-2.8M103 90l2-2.8M106.5 90.5l2-2.8"
            stroke={INK}
            strokeOpacity=".35"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g fill={PINK} opacity=".9">
          <ellipse cx="57.5" cy="88" rx="5" ry="3" />
          <ellipse cx="102.5" cy="88" rx="5" ry="3" />
        </g>
      )}

      {/* Gapirayotganda og'iz ochilib-yopiladi */}
      {talking ? (
        <>
          <MouthShape type={sadMouth ? "sad" : "open"} className="robot-talk-a" />
          <MouthShape type="small" className="robot-talk-b" />
        </>
      ) : (
        <MouthShape type={face.mouth} />
      )}

      {/* Ko'z yoshi, ter tomchisi */}
      {mood === "sad" && <path className="robot-tear" d="M61.5 85q-2.2 3.6 0 5.2q2.2-1.6 0-5.2z" fill={TEAR} />}
      {mood === "worried" && <path d="M110 62q-2.6 4.2 0 6q2.6-1.8 0-6z" fill={TEAR} stroke={INK} strokeWidth="1" />}
    </g>
  );
}

export function Oydin({
  mood = "idle",
  talking = false,
  waving = false,
  gait = "stand",
  thrust = 0,
  headOnly = false,
  className,
}: {
  mood?: RobotMood;
  /** Gapirayotgan payt — og'iz harakatlanadi */
  talking?: boolean;
  /** O'ng qo'l bilan salom beradi */
  waving?: boolean;
  /** Yurish: turibdi, qadam tashlab yuryapti yoki yuguryapti */
  gait?: "stand" | "walk" | "run";
  /** Krossovkalar ostidagi reaktiv nur (sakraganda): 0 — yo'q, 1 — kuchsiz, 2 — kuchli */
  thrust?: number;
  /** Faqat bosh (chat avatari uchun) */
  headOnly?: boolean;
  className?: string;
}) {
  const face = MOODS[mood];

  if (headOnly) {
    return (
      <svg viewBox="27 10 106 98" aria-hidden className={cn("overflow-visible", className)}>
        <Head mood={mood} talking={talking} />
      </svg>
    );
  }

  const arms = ARM_POSES[face.arms];
  const kicking = mood === "happy" || mood === "excited" || mood === "love";
  const moving = gait !== "stand";
  // Yurganda qo'llar oyoqlarga teskari silkinadi (faqat erkin tushib turganda)
  const swing = moving && face.arms === "rest";
  const legClass = (i: number) =>
    gait === "walk"
      ? i === 0
        ? "robot-step-l"
        : "robot-step-r"
      : gait === "run"
        ? i === 0
          ? "robot-run-l"
          : "robot-run-r"
        : kicking
          ? i === 0
            ? "robot-kick-l"
            : "robot-kick-r"
          : undefined;

  return (
    <svg viewBox="20 6 120 194" aria-hidden className={cn("overflow-visible", className)}>
      {/* Krossovkalardagi reaktiv nur */}
      {thrust > 0 && (
        <g style={{ transform: `scaleY(${0.6 + thrust * 0.45})`, transformOrigin: "80px 181px", transition: "transform 0.3s" }}>
          <g fill={MINT} className="robot-glow">
            <path d="M66 181Q71 195 76 181Z" />
            <path d="M84 181Q89 195 94 181Z" />
          </g>
          <g fill="#fff" opacity=".7">
            <path d="M69 181Q71 188 73 181Z" />
            <path d="M87 181Q89 188 91 181Z" />
          </g>
        </g>
      )}

      {/* Turganda sekin nafas oladi, yurganda har qadamda sal sakraydi */}
      <g className={cn(gait === "walk" ? "robot-walk-bob" : gait === "run" ? "robot-run-bob" : mood !== "sleepy" && "robot-breathe")}>
        {/* Oyoqlar va krossovkalar */}
        {[71, 89].map((x, i) => (
          <g key={x} className={legClass(i)} style={{ transformOrigin: `${x}px 160px` }}>
            <path d={`M${x} 158V174`} stroke={INK} strokeWidth="7" strokeLinecap="round" />
            <rect x={x - 7.5} y="172" width="15" height="8.5" rx="4.2" fill="#fff" stroke={INK} strokeWidth="2" />
            <path d={`M${x - 5} 176.6l5-1.8`} stroke={CLAY} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        ))}

        {/* Jinsi yubka */}
        <path d="M54 141L106 141L113 161Q80 167 47 161Z" fill={DENIM} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M67 143L63 163M80 143V165M93 143L97 163" stroke={INK} strokeOpacity=".3" strokeWidth="1.5" />

        {/* Hudi */}
        <path d="M56 117Q58 108 80 107Q102 108 104 117L108 143Q80 149 52 143Z" fill={OLIVE} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M62 110Q80 101 98 110Q91 117 80 117Q69 117 62 110Z" fill={OLIVE_DARK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M74.5 116v10M85.5 116v10" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
        <g fill={CREAM}>
          <circle cx="74.5" cy="127" r="1.4" />
          <circle cx="85.5" cy="127" r="1.4" />
        </g>
        <path d="M67 129H93L95.5 137Q80 139.5 64.5 137Z" fill={OLIVE_DARK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />

        {/* Yelka sumkasi */}
        <path d="M63 113L104 136" stroke={CLAY} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="98" y="134" width="13" height="10" rx="3" fill={CLAY} stroke={INK} strokeWidth="2" />
        <path d="M98.5 138h12" stroke={INK} strokeWidth="1.4" />
        <circle cx="104.5" cy="140" r="1.1" fill={INK} />

        {/* Bosh: kayfiyatga qarab qiyshayadi; "ha" deganda bosh irg'aydi */}
        <g style={{ transform: `rotate(${face.tilt}deg)`, transformOrigin: "80px 106px", transition: "transform 0.4s" }}>
          <g className={cn(mood === "nod" && "robot-nod")}>
            <Head mood={mood} talking={talking} />
          </g>
        </g>

        {/* Qo'llar (bosh ustida — yonoqqa qo'yilganda ko'rinsin) */}
        <Arm
          points={arms.l}
          className={cn(swing && (gait === "run" ? "robot-run-arm-l" : "robot-swing-l"))}
          origin="59px 118px"
        />
        {waving ? (
          <Arm points={[SHOULDER_R, [115, 99]]} className="robot-wave" origin="101px 118px" />
        ) : (
          <Arm
            points={arms.r}
            className={cn(swing && (gait === "run" ? "robot-run-arm-r" : "robot-swing-r"))}
            origin="101px 118px"
          />
        )}

        {/* Hissiyot bezaklari */}
        {mood === "love" && (
          <g fill={HEART}>
            <path className="robot-float-heart" d={heartPath(112, 30, 0.7)} />
            <path className="robot-float-heart" style={{ animationDelay: "0.9s" }} d={heartPath(50, 34, 0.55)} />
          </g>
        )}
        {mood === "excited" && (
          <g fill="#E3B341" stroke={INK} strokeWidth="1" strokeLinejoin="round">
            <path className="robot-twinkle" d="M114 36l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" />
            <path className="robot-twinkle" style={{ animationDelay: "0.6s" }} d="M44 42l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" />
          </g>
        )}
      </g>

      {mood === "sleepy" && (
        <g stroke={INK} className="dark:stroke-[#f4efe6]" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className="robot-z" d="M104 26h6l-6 7h6" />
          <path className="robot-z" style={{ animationDelay: "0.8s" }} d="M114 16h4.5l-4.5 5h4.5" />
        </g>
      )}
    </svg>
  );
}
