import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Resources } from "@/game/types";
import { fmt, fmtRate } from "@/game/format";

/* ============================================================
   Premium 3D-style SVG icons (gold coin, wood stack, stone pile, energy)
   ============================================================ */

function GoldCoinIcon() {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      animate={{ rotateY: [0, 360], y: [0, -2, 0] }}
      transition={{
        rotateY: { duration: 4, repeat: Infinity, ease: "linear" },
        y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
      }}
      style={{ transformStyle: "preserve-3d", filter: "drop-shadow(0 4px 6px rgba(180,120,0,0.45))" }}
    >
      <defs>
        <radialGradient id="coin-face" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff9c4" />
          <stop offset="35%" stopColor="#ffd84a" />
          <stop offset="75%" stopColor="#e8a72a" />
          <stop offset="100%" stopColor="#a66a10" />
        </radialGradient>
        <linearGradient id="coin-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8821a" />
          <stop offset="100%" stopColor="#6b3e08" />
        </linearGradient>
        <radialGradient id="coin-shine" cx="30%" cy="25%" r="35%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Back coin */}
      <ellipse cx="32" cy="38" rx="24" ry="22" fill="url(#coin-edge)" />
      {/* Coin face */}
      <circle cx="32" cy="32" r="24" fill="url(#coin-face)" stroke="#8a5410" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#b8780f" strokeWidth="1.2" opacity="0.6" />
      {/* Dollar sign */}
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontSize="26"
        fontWeight="900"
        fill="#7a4a08"
        style={{ fontFamily: "var(--font-display, system-ui)" }}
      >
        $
      </text>
      {/* Shine */}
      <ellipse cx="24" cy="22" rx="10" ry="6" fill="url(#coin-shine)" />
      {/* Animated highlight */}
      <motion.rect
        x="-30"
        y="0"
        width="14"
        height="64"
        fill="#ffffff"
        opacity="0.35"
        transform="skewX(-20)"
        animate={{ x: [-30, 80] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
        style={{ mixBlendMode: "screen" }}
      />
    </motion.svg>
  );
}

function WoodIcon() {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      animate={{ y: [0, -2, 0], rotate: [-2, 2, -2] }}
      transition={{
        y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
      }}
      style={{ filter: "drop-shadow(0 4px 6px rgba(80,40,10,0.45))" }}
    >
      <defs>
        <radialGradient id="wood-ring" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5c98d" />
          <stop offset="50%" stopColor="#c98a4a" />
          <stop offset="100%" stopColor="#6b3a1c" />
        </radialGradient>
        <linearGradient id="wood-bark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5a2f12" />
          <stop offset="50%" stopColor="#7a4a26" />
          <stop offset="100%" stopColor="#5a2f12" />
        </linearGradient>
      </defs>

      {/* Bottom log (back-left) */}
      <g transform="translate(8 32)">
        <rect x="0" y="0" width="42" height="16" rx="8" fill="url(#wood-bark)" stroke="#3d1f0a" strokeWidth="1" />
        <ellipse cx="42" cy="8" rx="6" ry="8" fill="url(#wood-ring)" stroke="#3d1f0a" strokeWidth="1" />
        <ellipse cx="42" cy="8" rx="3.5" ry="5" fill="none" stroke="#5a2f12" strokeWidth="0.8" />
        <ellipse cx="42" cy="8" rx="1.5" ry="2.2" fill="#3d1f0a" />
        <ellipse cx="0" cy="8" rx="6" ry="8" fill="url(#wood-ring)" stroke="#3d1f0a" strokeWidth="1" transform="translate(-6)" />
      </g>

      {/* Bottom log (front-right) */}
      <g transform="translate(14 40)">
        <rect x="0" y="0" width="42" height="16" rx="8" fill="url(#wood-bark)" stroke="#3d1f0a" strokeWidth="1" />
        <ellipse cx="42" cy="8" rx="6" ry="8" fill="url(#wood-ring)" stroke="#3d1f0a" strokeWidth="1" />
        <ellipse cx="42" cy="8" rx="3.5" ry="5" fill="none" stroke="#5a2f12" strokeWidth="0.8" />
        <ellipse cx="42" cy="8" rx="1.5" ry="2.2" fill="#3d1f0a" />
        <ellipse cx="0" cy="8" rx="6" ry="8" fill="url(#wood-ring)" stroke="#3d1f0a" strokeWidth="1" transform="translate(-6)" />
      </g>

      {/* Top log */}
      <g transform="translate(12 18)">
        <rect x="0" y="0" width="38" height="14" rx="7" fill="url(#wood-bark)" stroke="#3d1f0a" strokeWidth="1" />
        <ellipse cx="38" cy="7" rx="5" ry="7" fill="url(#wood-ring)" stroke="#3d1f0a" strokeWidth="1" />
        <ellipse cx="38" cy="7" rx="3" ry="4" fill="none" stroke="#5a2f12" strokeWidth="0.8" />
        <ellipse cx="38" cy="7" rx="1.2" ry="1.8" fill="#3d1f0a" />
        <ellipse cx="0" cy="7" rx="5" ry="7" fill="url(#wood-ring)" stroke="#3d1f0a" strokeWidth="1" transform="translate(-5)" />
      </g>
    </motion.svg>
  );
}

function StoneIcon() {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      animate={{ scale: [1, 1.04, 1], y: [0, -1.5, 0] }}
      transition={{
        scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
        y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
      }}
      style={{ filter: "drop-shadow(0 4px 6px rgba(60,70,90,0.5))" }}
    >
      <defs>
        <radialGradient id="stone-grad" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#e6ecf5" />
          <stop offset="50%" stopColor="#a6b1c5" />
          <stop offset="100%" stopColor="#4a5468" />
        </radialGradient>
        <radialGradient id="stone-grad2" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#d3dae6" />
          <stop offset="60%" stopColor="#8a95ac" />
          <stop offset="100%" stopColor="#3a4458" />
        </radialGradient>
      </defs>
      {/* Back-left stone */}
      <path
        d="M8,42 Q6,30 14,26 Q22,22 28,28 Q32,36 26,44 Q18,48 8,42 Z"
        fill="url(#stone-grad2)"
        stroke="#2d3548"
        strokeWidth="1.4"
      />
      <path d="M14,30 Q18,28 22,32" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.6" strokeLinecap="round" />

      {/* Back-right stone */}
      <path
        d="M36,40 Q34,28 44,24 Q54,22 58,32 Q58,42 50,46 Q40,48 36,40 Z"
        fill="url(#stone-grad)"
        stroke="#2d3548"
        strokeWidth="1.4"
      />
      <path d="M42,28 Q46,26 50,30" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.7" strokeLinecap="round" />

      {/* Front big stone */}
      <path
        d="M14,52 Q10,42 20,38 Q34,34 46,40 Q54,46 48,54 Q34,60 14,52 Z"
        fill="url(#stone-grad)"
        stroke="#2d3548"
        strokeWidth="1.5"
      />
      <path d="M22,44 Q28,42 36,44" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.7" strokeLinecap="round" />
      <circle cx="40" cy="50" r="1.2" fill="#2d3548" opacity="0.5" />
      <circle cx="24" cy="50" r="0.9" fill="#2d3548" opacity="0.5" />
    </motion.svg>
  );
}

function EnergyIcon() {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 0 8px rgba(80,210,255,0.8)) drop-shadow(0 4px 6px rgba(0,80,140,0.5))" }}
    >
      <defs>
        <linearGradient id="bolt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="40%" stopColor="#79f7e6" />
          <stop offset="100%" stopColor="#1ea1e0" />
        </linearGradient>
      </defs>
      <path
        d="M36,4 L14,36 L28,36 L24,60 L50,26 L34,26 L40,4 Z"
        fill="url(#bolt-grad)"
        stroke="#0a5a9c"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M30,12 L20,32 L26,32" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.85" strokeLinecap="round" />
    </motion.svg>
  );
}

/* ============================================================
   Animated number that tweens toward target
   ============================================================ */
function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (latest) => fmt(latest));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.5, ease: "easeOut" });
    return controls.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

/* ============================================================
   Float popup (+N) when a resource increases
   ============================================================ */
interface Pop {
  id: number;
  delta: number;
}

/* ============================================================
   Per-resource theme
   ============================================================ */
const THEME = {
  gold: {
    name: "Gold",
    Icon: GoldCoinIcon,
    cell: "from-amber-50 via-yellow-50 to-amber-100",
    border: "border-amber-300/80",
    glow: "0 0 18px rgba(255,200,80,0.45), 0 6px 14px rgba(180,120,0,0.25)",
    iconBg: "radial-gradient(circle at 35% 30%, #fff7c7, #ffd84a 55%, #b8780f 100%)",
    text: "text-amber-900",
    pop: "#d97706",
    particle: "#ffd84a",
  },
  wood: {
    name: "Wood",
    Icon: WoodIcon,
    cell: "from-orange-50 via-amber-50 to-orange-100",
    border: "border-orange-300/80",
    glow: "0 0 16px rgba(217,146,88,0.45), 0 6px 14px rgba(120,60,20,0.25)",
    iconBg: "radial-gradient(circle at 35% 30%, #ffe0b8, #d99258 55%, #6b3a1c 100%)",
    text: "text-orange-900",
    pop: "#9a4f1a",
    particle: "#d99258",
  },
  stone: {
    name: "Stone",
    Icon: StoneIcon,
    cell: "from-slate-50 via-slate-100 to-slate-200",
    border: "border-slate-300/80",
    glow: "0 0 16px rgba(150,165,190,0.5), 0 6px 14px rgba(60,70,90,0.3)",
    iconBg: "radial-gradient(circle at 35% 30%, #f1f4fa, #a6b1c5 55%, #4a5468 100%)",
    text: "text-slate-800",
    pop: "#475569",
    particle: "#a6b1c5",
  },
  energy: {
    name: "Energy",
    Icon: EnergyIcon,
    cell: "from-sky-50 via-cyan-50 to-sky-100",
    border: "border-sky-300/80",
    glow: "0 0 18px rgba(80,210,255,0.55), 0 6px 14px rgba(0,80,140,0.3)",
    iconBg: "radial-gradient(circle at 35% 30%, #e0fbff, #79f7e6 55%, #0a5a9c 100%)",
    text: "text-sky-900",
    pop: "#0369a1",
    particle: "#79f7e6",
  },
} as const;

interface ResourceBarProps {
  resources: Resources;
  rates: Resources;
}

export function ResourceBar({ resources, rates }: ResourceBarProps) {
  const keys: (keyof Resources)[] = ["gold", "wood", "stone"];
  const maxRate = Math.max(0.0001, ...keys.map((k) => rates[k] || 0));
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full">
      {keys.map((k) => (
        <ResourceCell
          key={k}
          resourceKey={k}
          value={resources[k]}
          rate={rates[k]}
          maxRate={maxRate}
        />
      ))}
    </div>
  );
}

function ResourceCell({
  resourceKey,
  value,
  rate,
  maxRate,
}: {
  resourceKey: keyof Resources;
  value: number;
  rate: number;
  maxRate: number;
}) {
  const theme = THEME[resourceKey];
  const Icon = theme.Icon;
  const prevValue = useRef(value);
  const [pops, setPops] = useState<Pop[]>([]);
  const [bump, setBump] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const delta = value - prevValue.current;
    prevValue.current = value;
    if (delta > 0.5) {
      const id = Date.now() + Math.random();
      setPops((prev) => [...prev, { id, delta }].slice(-3));
      setBump((b) => b + 1);
      setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== id)), 1200);
    }
  }, [value]);

  const rateShare = rate > 0 ? Math.min(1, rate / maxRate) : 0;
  const active = rate > 0;

  return (
    <motion.div
      key={resourceKey}
      layout
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      animate={{ scale: bump ? [1, 1.05, 1] : 1, y: hover ? -2 : 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative bg-gradient-to-br ${theme.cell} backdrop-blur-xl rounded-2xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 border ${theme.border} flex items-center gap-2 sm:gap-3 overflow-hidden`}
      style={{
        boxShadow:
          theme.glow +
          ", inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 6px rgba(0,0,0,0.06), 0 8px 18px rgba(20,30,60,0.12)",
      }}
    >
      {/* Animated holographic conic sweep */}
      {active && (
        <motion.div
          className="absolute -inset-8 pointer-events-none opacity-25"
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, ${theme.particle} 18%, transparent 30%, transparent 65%, ${theme.particle} 78%, transparent 90%)`,
            filter: "blur(14px)",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Top gloss */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
        }}
      />

      {/* Sweeping highlight */}
      <motion.div
        className="absolute inset-y-0 -left-1/3 w-1/3 pointer-events-none"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
        }}
        animate={{ x: ["0%", "420%"] }}
        transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
      />

      {/* Icon disc */}
      <motion.div
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0"
        animate={
          active
            ? {
                boxShadow: [
                  "inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.25), 0 0 0px " +
                    theme.particle,
                  "inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.25), 0 0 14px " +
                    theme.particle,
                  "inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.25), 0 0 0px " +
                    theme.particle,
                ],
              }
            : {}
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: theme.iconBg,
          border: "2px solid rgba(255,255,255,0.9)",
        }}
      >
        <div className="absolute inset-1.5">
          <Icon />
        </div>
        {/* Particle burst on gain */}
        <AnimatePresence>
          {pops.length > 0 && (
            <motion.div
              key={pops[pops.length - 1].id}
              initial={{ opacity: 1, scale: 0.4 }}
              animate={{ opacity: 0, scale: 2.2 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: `0 0 20px 6px ${theme.particle}` }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Text */}
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-center justify-between gap-1">
          <div
            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] ${theme.text} opacity-70 truncate`}
          >
            {theme.name}
          </div>
          {active && (
            <div
              className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-[1px] rounded-full"
              style={{
                background: "rgba(255,255,255,0.75)",
                color: theme.pop,
                border: `1px solid ${theme.particle}`,
              }}
            >
              <motion.span
                animate={{ y: [0, -1, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                ▲
              </motion.span>
              <span className="tabular-nums">{fmtRate(rate)}</span>
            </div>
          )}
        </div>

        <div
          className={`font-display font-black text-lg sm:text-2xl leading-tight tabular-nums truncate ${theme.text}`}
          style={{
            textShadow:
              "0 1px 0 rgba(255,255,255,0.85), 0 2px 6px rgba(0,0,0,0.08)",
            letterSpacing: "-0.01em",
          }}
        >
          <AnimatedNumber value={value} />
        </div>

        {/* Mobile rate label */}
        {active && (
          <div className="mt-0.5 sm:hidden">
            <span className="text-[9px] font-bold tabular-nums" style={{ color: theme.pop }}>
              ▲ {fmtRate(rate)}
            </span>
          </div>
        )}

        {/* Velocity bar */}
        <div className="mt-1 h-1 rounded-full bg-white/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${theme.particle}, ${theme.pop})`,
              boxShadow: `0 0 8px ${theme.particle}`,
            }}
            initial={false}
            animate={{ width: `${Math.max(active ? 6 : 0, rateShare * 100)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>

        {/* Floating +N popups */}
        <AnimatePresence>
          {pops.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 0, scale: 0.7 }}
              animate={{ opacity: 1, y: -28 - i * 6, scale: 1 }}
              exit={{ opacity: 0, y: -42 - i * 6 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute right-1 top-0 font-display font-extrabold text-sm sm:text-base pointer-events-none"
              style={{
                color: theme.pop,
                textShadow:
                  "0 1px 0 rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.6)",
              }}
            >
              +{fmt(p.delta)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
