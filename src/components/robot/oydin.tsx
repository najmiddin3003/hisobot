// Oydin — sayt bo'ylab uchib yuradigan qiz-robotcha (SVG). Harakat mantig'i: companion.tsx
import { cn } from "@/lib/utils";

export type RobotEyes = "happy" | "open" | "closed" | "wink" | "wow";
export type RobotMouth = "smile" | "open" | "small";

const INK = "#2B2A26";
const SHELL = "#E6D6B4";
const MINT = "#7FE0C4";
const CLAY = "#C35F36";
const BLUSH = "#F29C8A";

function Eyes({ eyes }: { eyes: RobotEyes }) {
  const line = { stroke: MINT, strokeWidth: 3.5, fill: "none", strokeLinecap: "round" } as const;
  switch (eyes) {
    case "open":
      return (
        <>
          <ellipse className="robot-blink" cx="68" cy="70" rx="5" ry="6.5" fill={MINT} />
          <ellipse className="robot-blink" cx="92" cy="70" rx="5" ry="6.5" fill={MINT} />
        </>
      );
    case "closed":
      return <path d="M62 72 Q68 76 74 72 M86 72 Q92 76 98 72" {...line} />;
    case "wink":
      return <path d="M62 72 Q68 64 74 72 M86 71 H98" {...line} />;
    case "wow":
      return (
        <>
          <circle cx="68" cy="70" r="6" {...line} />
          <circle cx="92" cy="70" r="6" {...line} />
        </>
      );
    default:
      return <path d="M62 72 Q68 64 74 72 M86 72 Q92 64 98 72" {...line} />;
  }
}

function Mouth({ mouth }: { mouth: RobotMouth }) {
  if (mouth === "open") return <path d="M73 81 Q80 91 87 81 Z" fill={MINT} stroke={MINT} strokeWidth="2" strokeLinejoin="round" />;
  if (mouth === "small") return <ellipse cx="80" cy="84" rx="3" ry="2.5" fill={MINT} />;
  return <path d="M74 82 Q80 87 86 82" stroke={MINT} strokeWidth="3" fill="none" strokeLinecap="round" />;
}

export function Oydin({
  eyes = "happy",
  mouth = "smile",
  waving = false,
  thrust = 1,
  sleeping = false,
  className,
}: {
  eyes?: RobotEyes;
  mouth?: RobotMouth;
  waving?: boolean;
  /** Pastdagi olov kattaligi: 0 — qo'ngan, 1 — suzib turibdi, 2 — tez uchyapti */
  thrust?: number;
  sleeping?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="22 4 116 188" aria-hidden className={cn("overflow-visible", className)}>
      {/* Olov / suzish nuri */}
      {thrust > 0 && (
        <g style={{ transform: `scale(1, ${0.7 + thrust * 0.45})`, transformOrigin: "80px 166px", transition: "transform 0.3s" }}>
          <path d="M72 164 Q80 186 88 164 Z" fill={MINT} className="robot-glow" />
          <path d="M76 164 Q80 176 84 164 Z" fill="#fff" opacity="0.7" />
        </g>
      )}
      <g className={cn(!sleeping && "robot-bob")}>
        {/* Yurakcha antenna */}
        <path d="M80 34 L80 20" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M80 18 c-3 -5 -10 -2 -7 3 l7 6 7 -6 c3 -5 -4 -8 -7 -3z" fill={CLAY} />
        {/* Bosh va ekran-yuz */}
        <ellipse cx="80" cy="70" rx="42" ry="36" fill={SHELL} stroke={INK} strokeWidth="2.5" />
        <ellipse cx="80" cy="72" rx="32" ry="22" fill={INK} />
        <Eyes eyes={eyes} />
        <Mouth mouth={mouth} />
        <circle cx="56" cy="86" r="4" fill={BLUSH} />
        <circle cx="104" cy="86" r="4" fill={BLUSH} />
        {/* Tana — pastga ingichkalashgan tomchi */}
        <path
          d="M56 112 Q80 102 104 112 Q100 150 80 164 Q60 150 56 112 Z"
          fill={SHELL}
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M62 122 Q80 116 98 122" stroke={CLAY} strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Qo'lchalar */}
        <circle cx="42" cy="128" r="8" fill={SHELL} stroke={INK} strokeWidth="2.5" />
        <g className={cn(waving && "robot-wave")} style={{ transformOrigin: "106px 124px" }}>
          <circle cx={waving ? 124 : 118} cy={waving ? 108 : 128} r="8" fill={SHELL} stroke={INK} strokeWidth="2.5" />
        </g>
      </g>
      {sleeping && (
        <g fill={INK} className="dark:fill-[#f4efe6]" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">
          <text x="112" y="40" className="robot-z">
            z
          </text>
          <text x="120" y="28" className="robot-z" style={{ animationDelay: "0.8s" }} fontSize="11">
            z
          </text>
        </g>
      )}
    </svg>
  );
}
