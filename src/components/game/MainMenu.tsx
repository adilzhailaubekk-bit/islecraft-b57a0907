import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Play, Plus, Settings, Bell, Gift, Trophy, ShoppingBag,
  Swords, CalendarDays, LogOut, ChevronRight, Coins, TreePine, Mountain,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MainMenuProps {
  onPlay: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onLeaderboards: () => void;
  onDaily: () => void;
  onShop: () => void;
  onPrestige?: () => void;
  onAchievements?: () => void;
  onQuests?: () => void;
  onEvents?: () => void;
  hasSave: boolean;
}

const STORAGE_KEY = "island-tycoon-save-v2";

type SaveSnap = {
  level: number;
  xp: number;
  xpNext: number;
  gold: number;
  wood: number;
  stone: number;
  islandName: string;
  plots: number;
  buildings: number;
};

function loadSnap(): SaveSnap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    const level = s.level ?? 1;
    const xpNext = Math.floor(50 * Math.pow(1.35, level - 1));
    return {
      level,
      xp: s.xp ?? 0,
      xpNext,
      gold: Math.floor(s.resources?.gold ?? 0),
      wood: Math.floor(s.resources?.wood ?? 0),
      stone: Math.floor(s.resources?.stone ?? 0),
      islandName: s.activeIsland ?? "paradise",
      plots: s.plots ?? 3,
      buildings: Array.isArray(s.buildings) ? s.buildings.filter(Boolean).length : 0,
    };
  } catch {
    return null;
  }
}

const fmt = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.floor(n).toString();
};

export function MainMenu({
  onPlay, onNewGame, onSettings, onLeaderboards, onDaily, onShop,
  onPrestige, onAchievements, onQuests, onEvents, hasSave,
}: MainMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [snap, setSnap] = useState<SaveSnap | null>(null);
  const [hoverPlay, setHoverPlay] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const requestNewGame = () => {
    if (hasSave) setConfirmNew(true);
    else onNewGame();
  };
  const confirmNewGame = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setConfirmNew(false);
    onNewGame();
  };

  useEffect(() => {
    setMounted(true);
    setSnap(loadSnap());
  }, []);

  // Time-of-day cycle (60s loop)
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(((now - start) / 60000) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Sky gradient cycles: dawn -> day -> dusk -> night
  const sky = useMemo(() => {
    const stops = [
      ["#ffb480", "#ffd6a5", "#9ad6f0"],   // dawn
      ["#7ec8ff", "#bfe5ff", "#e6f4ff"],   // day
      ["#ff8c7a", "#ffc56b", "#6c8fc7"],   // dusk
      ["#0c1838", "#1b2a55", "#37406b"],   // night
    ];
    const idx = t * stops.length;
    const i = Math.floor(idx) % stops.length;
    const j = (i + 1) % stops.length;
    const k = idx - Math.floor(idx);
    const mix = (a: string, b: string) => {
      const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
      const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
      const m = pa.map((v, n) => Math.round(v + (pb[n] - v) * k));
      return `rgb(${m[0]},${m[1]},${m[2]})`;
    };
    return [mix(stops[i][0], stops[j][0]), mix(stops[i][1], stops[j][1]), mix(stops[i][2], stops[j][2])];
  }, [t]);

  const sideButtons = [
    { id: "daily", label: "Daily", icon: Gift, onClick: onDaily },
    { id: "quests", label: "Quests", icon: Swords, onClick: onQuests ?? onDaily },
    { id: "ach", label: "Achievements", icon: Trophy, onClick: onAchievements ?? onLeaderboards },
    { id: "shop", label: "Shop", icon: ShoppingBag, onClick: onShop },
    { id: "events", label: "Events", icon: CalendarDays, onClick: onEvents ?? (() => toast("События скоро 🎉")) },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* === Animated sky === */}
      <motion.div
        className="absolute inset-0 transition-colors"
        style={{ background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 55%, ${sky[2]} 100%)` }}
      />

      {/* Sun / Moon */}
      <motion.div
        className="absolute"
        style={{
          left: `${10 + t * 80}%`,
          top: `${10 + Math.sin(t * Math.PI) * -8 + 8}%`,
        }}
      >
        <div
          className="w-28 h-28 rounded-full"
          style={{
            background: t > 0.6
              ? "radial-gradient(circle, #f5f7ff 0%, #c8d2ff 45%, rgba(200,210,255,0) 75%)"
              : "radial-gradient(circle, #fff7c7 0%, #ffd84a 40%, rgba(255,200,80,0) 75%)",
            filter: "blur(1px)",
          }}
        />
      </motion.div>

      {/* Clouds (parallax) */}
      {mounted && Array.from({ length: 6 }).map((_, i) => {
        const top = 5 + (i * 7) % 35;
        const dur = 50 + i * 9;
        const scale = 0.6 + (i % 3) * 0.3;
        return (
          <motion.div
            key={`cl-${i}`}
            className="absolute"
            style={{ top: `${top}%`, opacity: 0.7 }}
            initial={{ x: "-25vw" }}
            animate={{ x: "120vw" }}
            transition={{ duration: dur, delay: -i * 8, repeat: Infinity, ease: "linear" }}
          >
            <svg width={160 * scale} height={70 * scale} viewBox="0 0 160 70">
              <g fill="#ffffff">
                <ellipse cx="40" cy="44" rx="34" ry="22" />
                <ellipse cx="80" cy="32" rx="38" ry="26" />
                <ellipse cx="120" cy="46" rx="30" ry="20" />
              </g>
            </svg>
          </motion.div>
        );
      })}

      {/* Distant mountain layer (parallax depth) */}
      <motion.svg
        className="absolute bottom-[40%] left-0 w-[110%]"
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
        style={{ height: "20%" }}
        animate={{ x: [0, -20, 0] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M0,200 L0,120 L120,40 L220,110 L320,30 L460,130 L580,60 L700,120 L800,80 L800,200 Z" fill="#3d6e92" opacity="0.55" />
        <path d="M0,200 L0,150 L100,90 L200,140 L320,80 L440,150 L560,100 L680,140 L800,110 L800,200 Z" fill="#2d567a" opacity="0.7" />
      </motion.svg>

      {/* Ocean */}
      <div className="absolute bottom-0 left-0 right-0 h-[55%]">
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #3ec5f0 0%, #1c8fc9 55%, #07365f 100%)" }} />
        {[
          { top: 0, color: "#ffffff", opacity: 0.35, duration: 9, amp: 6 },
          { top: 12, color: "#a7e6ff", opacity: 0.3, duration: 13, amp: 8 },
          { top: 28, color: "#6dc4f0", opacity: 0.22, duration: 17, amp: 10 },
        ].map((w, i) => (
          <motion.svg
            key={`w-${i}`}
            className="absolute left-0 w-[200%]"
            style={{ top: `${w.top}%`, height: 70 }}
            viewBox="0 0 1600 70"
            preserveAspectRatio="none"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: w.duration, repeat: Infinity, ease: "linear" }}
          >
            <path
              d={`M0,35 Q200,${35 - w.amp} 400,35 T800,35 T1200,35 T1600,35 L1600,70 L0,70 Z`}
              fill={w.color} opacity={w.opacity}
            />
          </motion.svg>
        ))}

        {/* Island with subtle camera drift */}
        <motion.div
          className="absolute left-1/2"
          style={{ bottom: "18%", x: "-50%" }}
          animate={{ y: [0, -6, 0], x: ["-52%", "-48%", "-52%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="560" height="240" viewBox="0 0 560 240">
            <defs>
              <radialGradient id="sand" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#fff1bd" />
                <stop offset="100%" stopColor="#e9c277" />
              </radialGradient>
              <radialGradient id="grass" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#8be082" />
                <stop offset="100%" stopColor="#3ea34a" />
              </radialGradient>
            </defs>
            <ellipse cx="280" cy="170" rx="260" ry="48" fill="url(#sand)" />
            <ellipse cx="280" cy="135" rx="180" ry="52" fill="url(#grass)" />
            <ellipse cx="120" cy="168" rx="22" ry="12" fill="#8a96aa" />
            <ellipse cx="450" cy="170" rx="26" ry="14" fill="#8a96aa" />
            <g transform="translate(220 105)">
              <rect x="0" y="0" width="28" height="24" fill="#f5d29a" stroke="#8a5a2a" strokeWidth="1.5" />
              <polygon points="-2,0 30,0 14,-14" fill="#e8a020" stroke="#8a6a10" strokeWidth="1.5" />
            </g>
            <g transform="translate(300 110)">
              <rect x="0" y="0" width="22" height="20" fill="#f5d29a" stroke="#8a5a2a" strokeWidth="1.5" />
              <polygon points="-2,0 24,0 11,-12" fill="#3a7ac8" stroke="#1e4a82" strokeWidth="1.5" />
            </g>
          </svg>

          {[{ left: "15%", s: 1 }, { left: "75%", s: 0.9 }, { left: "48%", s: 1.1 }].map((p, i) => (
            <motion.div
              key={`pl-${i}`}
              className="absolute"
              style={{ left: p.left, bottom: "55%", transformOrigin: "bottom center", transform: `scale(${p.s})` }}
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ duration: 5 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="110" height="160" viewBox="0 0 110 160">
                <path d="M55,160 Q48,110 52,70 Q56,40 62,10" stroke="#7a4a26" strokeWidth="8" fill="none" strokeLinecap="round" />
                {[0, 60, 120, 180, 240, 300].map((rot) => (
                  <g key={rot} transform={`translate(60 18) rotate(${rot})`}>
                    <path d="M0,0 Q24,-10 50,0 Q24,8 0,0 Z" fill="#3aa84a" stroke="#2d8c3e" strokeWidth="2" />
                  </g>
                ))}
                <circle cx="60" cy="18" r="6" fill="#2d8c3e" />
              </svg>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Birds */}
      {mounted && Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={`bd-${i}`}
          className="absolute"
          style={{ top: `${10 + i * 6}%` }}
          initial={{ x: "-10vw" }}
          animate={{ x: "110vw", y: [0, -16, 8, -10, 0] }}
          transition={{
            x: { duration: 22 + i * 4, delay: i * 5, repeat: Infinity, ease: "linear" },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <motion.svg width={24} height={12} viewBox="0 0 28 14" animate={{ scaleY: [1, 0.5, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
            <path d="M2,8 Q7,1 14,7 Q21,1 26,8" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
          </motion.svg>
        </motion.div>
      ))}

      {/* Soft canvas-tone vignette (lighter so Miro UI reads cleanly) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,20,0.35) 100%)" }} />

      {/* ============ FOREGROUND UI — Miro design tokens ============ */}

      {/* TOP BAR */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.9, 0.3, 1] }}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-3 right-3 sm:top-5 sm:left-6 sm:right-6 z-30 flex items-center gap-2 sm:gap-3"
      >
        <ProfileChip snap={snap} />

        <div className="hidden md:flex items-center gap-2 ml-1">
          <ResChip icon={<Coins className="w-5 h-5" style={{ color: "#7a4a10" }} />} value={fmt(snap?.gold ?? 0)} bg="#fde8c4" />
          <ResChip icon={<TreePine className="w-5 h-5" style={{ color: "#0e6b63" }} />} value={fmt(snap?.wood ?? 0)} bg="#cdf3ee" />
          <ResChip icon={<Mountain className="w-5 h-5" style={{ color: "#6b4e1a" }} />} value={fmt(snap?.stone ?? 0)} bg="#fff1bd" />
        </div>

        <div className="flex-1" />

        <IconChip onClick={() => toast("Уведомлений нет 🔔")} title="Уведомления">
          <Bell className="w-5 h-5" strokeWidth={2.2} />
          {hasSave && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: "#ff4747" }} />}
        </IconChip>
        <IconChip onClick={onSettings} title="Настройки">
          <Settings className="w-5 h-5" strokeWidth={2.2} />
        </IconChip>
        <AuthChip />
      </motion.div>

      {/* TITLE — Miro-style wordmark with yellow sticky highlight */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.9, 0.3, 1.1] }}
        className="absolute top-[10%] sm:top-[12%] left-0 right-0 z-20 text-center pointer-events-none px-4"
      >
        <div
          className="inline-block mb-3 px-3 py-1 rounded-full font-semibold tracking-[0.18em]"
          style={{
            background: "rgba(255,255,255,0.45)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            color: "#ffffff",
            fontSize: "13px",
            border: "1px solid rgba(255,255,255,0.7)",
            boxShadow: "0 8px 24px rgba(30,80,100,0.25)",
          }}
        >
          ISLECRAFT · ТРОПИКИ
        </div>
        <h1
          className="font-semibold leading-[1.02] tracking-[-0.04em]"
          style={{
            fontSize: "clamp(3rem, 9vw, 6.8rem)",
            color: "#ffffff",
            textShadow: "0 6px 28px rgba(30,80,110,0.45)",
          }}
        >
          Isle
          <br />
          <span className="relative inline-block">
            <span style={{ color: "#ffffff", position: "relative", padding: "0 0.18em" }}>craft</span>
          </span>

        </h1>
      </motion.div>

      {/* SIDE QUICK MENU — circular white icons on hairline */}
      <motion.div
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="absolute left-3 sm:left-6 top-[44%] sm:top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 sm:gap-2.5"
      >
        {sideButtons.map((b, i) => (
          <motion.button
            key={b.id}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.04 }}
            whileHover={{ scale: 1.06, x: 2 }}
            whileTap={{ scale: 0.94 }}
            onClick={b.onClick}
            title={b.label}
            className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.9)",
              color: "#6b4e1a",
              boxShadow: "0 6px 18px rgba(107,78,26,0.15)",
            }}
          >
            <b.icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
            <span
              className="absolute left-full ml-2 px-3 py-1.5 text-[14px] font-semibold rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none hidden sm:block"
              style={{ background: "#ffd84a", color: "#6b4e1a" }}
            >
              {b.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* CENTER — PLAY card */}
      <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="pointer-events-auto w-full max-w-md px-5 pb-8 sm:pb-0 sm:mt-28"
        >
          {/* Save snapshot — clean white feature card */}
          <AnimatePresence>
            {snap && hasSave && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                className="mb-4 p-4 sm:p-5"
                style={{
                  background: "rgba(255,255,255,0.65)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  borderRadius: "28px",
                  boxShadow: "0 20px 60px rgba(107,78,26,0.18)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] uppercase tracking-[0.12em] font-semibold" style={{ color: "#8e91a0" }}>
                    Последнее сохранение
                  </div>
                  <div
                    className="text-[13px] font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                    style={{ background: "#e6f7ef", color: "#00b473" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00b473" }} />
                    Синхронизировано
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: "#fde8c4" }}
                  >
                    🏝️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold capitalize truncate text-[17px]" style={{ color: "#6b4e1a" }}>
                      {snap.islandName}
                    </div>
                    <div className="text-[14px] mt-0.5" style={{ color: "#6b6f7e" }}>
                      Зданий <b style={{ color: "#6b4e1a" }}>{snap.buildings}</b>/{snap.plots} · Уровень{" "}
                      <b style={{ color: "#6b4e1a" }}>{snap.level}</b>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef0f3" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (snap.buildings / Math.max(1, snap.plots)) * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="h-full"
                        style={{ background: "#ffd84a" }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PRIMARY PLAY — black pill (Miro signature) */}
          <motion.button
            onMouseEnter={() => setHoverPlay(true)}
            onMouseLeave={() => setHoverPlay(false)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={hasSave ? onPlay : onNewGame}
            className="relative w-full overflow-hidden flex items-center justify-center gap-3"
            style={{
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              color: "#6b4e1a",
              border: "1.5px solid rgba(255,216,74,0.9)",
              borderRadius: "9999px",
              padding: "20px 28px",
              fontSize: "19px",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              boxShadow: hoverPlay
                ? "0 20px 50px rgba(245,184,32,0.45), 0 0 0 4px rgba(255,216,74,0.45)"
                : "0 16px 40px rgba(245,184,32,0.4)",
              transition: "box-shadow 0.25s ease",
            }}
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 36, height: 36, background: "#ffd84a", color: "#6b4e1a" }}
            >
              <Play className="w-5 h-5 fill-current" strokeWidth={0} />
            </span>
            <span>{hasSave ? "Продолжить игру" : "Начать играть"}</span>
            <ChevronRight className="w-6 h-6 opacity-70" />
          </motion.button>

          {/* Secondary — full width like primary */}
          <div className="mt-3 w-full">
            <SecondaryBtn icon={<Plus className="w-5 h-5" strokeWidth={2.4} />} label="Новая игра" onClick={requestNewGame} />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="absolute bottom-3 right-4 text-[12px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: "rgba(255,255,255,0.75)" }}
      >
        v1.0 · Islecraft
      </motion.div>

      {/* CONFIRM NEW GAME MODAL */}
      <AnimatePresence>
        {confirmNew && (
          <motion.div
            key="confirm-new"
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: "rgba(10,20,35,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
              onClick={() => setConfirmNew(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="relative w-full max-w-md p-6 sm:p-7"
              style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.9)",
                borderRadius: "28px",
                boxShadow: "0 30px 80px rgba(10,20,35,0.35)",
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "#ffe3e3" }}
                >
                  ⚠️
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-[22px] leading-tight" style={{ color: "#1a1a2e" }}>
                    Вы уверены?
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "#4b5063" }}>
                    У вас уже есть сохранённая игра. Создание новой игры приведёт к удалению текущего прогресса. Это действие нельзя отменить.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirmNew(false)}
                  className="flex-1 rounded-full font-semibold text-[15px] py-3 px-5"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    color: "#4b5063",
                    border: "1.5px solid #e4e6ec",
                  }}
                >
                  ❌ Отмена
                </motion.button>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={confirmNewGame}
                  className="flex-1 rounded-full font-semibold text-[15px] py-3 px-5"
                  style={{
                    background: "#ff4d57",
                    color: "#ffffff",
                    border: "1.5px solid #ff4d57",
                    boxShadow: "0 10px 24px rgba(255,77,87,0.4)",
                  }}
                >
                  ✅ Создать новую игру
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- subcomponents (Miro design tokens) ---------- */

function ResChip({ icon, value, bg }: { icon: React.ReactNode; value: string; bg: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 h-9 rounded-full"
      style={{ background: bg, color: "#6b4e1a", border: "1px solid rgba(255,255,255,0.8)" }}
    >
      {icon}
      <span className="text-[15px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

function IconChip({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      title={title}
      className="relative w-9 h-9 rounded-full flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.9)",
        color: "#6b4e1a",
        boxShadow: "0 4px 12px rgba(107,78,26,0.12)",
      }}
    >
      {children}
    </motion.button>
  );
}

function SecondaryBtn({
  icon,
  label,
  onClick,
  variant = "outline",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "outline" | "yellow";
}) {
    const styles =
      variant === "yellow"
        ? { background: "rgba(255,216,74,0.75)", color: "#6b4e1a", border: "1.5px solid rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }
        : { background: "rgba(255,255,255,0.55)", color: "#6b4e1a", border: "1.5px solid rgba(255,216,74,0.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" };
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative w-full flex items-center justify-center gap-2 rounded-full font-semibold text-[15px]"
      style={{
        ...styles,
        padding: "12px 18px",
        boxShadow: "0 6px 16px rgba(107,78,26,0.18)",
      }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

function ProfileChip({ snap }: { snap: SaveSnap | null }) {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Гость";
  const avatar = user?.user_metadata?.avatar_url as string | undefined;
  const level = snap?.level ?? 1;
  const xpPct = snap ? Math.min(100, (snap.xp / Math.max(1, snap.xpNext)) * 100) : 0;

  return (
    <div
      className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 6px 18px rgba(107,78,26,0.15)",
      }}
    >
      <div className="relative">
        {avatar ? (
          <img src={avatar} alt="" className="w-8 h-8 rounded-full" style={{ border: "2px solid #ffb347" }} />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[15px]"
            style={{ background: "#ffb347", color: "#6b4e1a" }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div
          className="absolute -bottom-1 -right-1 min-w-[20px] h-[16px] px-1 rounded-full text-[12px] font-extrabold flex items-center justify-center"
          style={{ background: "#ffd84a", color: "#6b4e1a", border: "2px solid #ffffff" }}
        >
          {level}
        </div>
      </div>
      <div className="hidden sm:flex flex-col min-w-0">
        <div className="text-[14px] font-bold truncate max-w-[110px] leading-tight" style={{ color: "#6b4e1a" }}>
          {name}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "#eef0f3" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full"
              style={{ background: "#ffd84a" }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: "#8e91a0" }}>
            {Math.round(xpPct)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function AuthChip() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-1.5 px-4 h-9 rounded-full text-[14px] font-semibold"
        style={{ background: "rgba(255,216,74,0.8)", color: "#6b4e1a", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.8)" }}
      >
        Войти
      </Link>
    );
  }
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={async () => {
        await supabase.auth.signOut();
        toast.success("Вы вышли из аккаунта");
      }}
      title="Выйти"
      className="w-9 h-9 rounded-full flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.9)",
        color: "#6b4e1a",
        boxShadow: "0 4px 12px rgba(107,78,26,0.12)",
      }}
    >
      <LogOut className="w-4 h-4" />
    </motion.button>
  );
}
