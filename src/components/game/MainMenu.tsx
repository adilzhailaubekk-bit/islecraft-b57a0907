import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Play, Plus, Settings, Bell, Gift, Trophy, ShoppingBag, Sparkles,
  Swords, CalendarDays, BarChart3, LogOut, ChevronRight, Coins, TreePine, Mountain,
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
    { id: "daily", label: "Daily", icon: Gift, color: "from-pink-500 to-rose-600", onClick: onDaily, badge: hasSave },
    { id: "quests", label: "Quests", icon: Swords, color: "from-amber-500 to-orange-600", onClick: onQuests ?? onDaily },
    { id: "ach", label: "Achievements", icon: Trophy, color: "from-yellow-400 to-amber-600", onClick: onAchievements ?? onLeaderboards },
    { id: "shop", label: "Shop", icon: ShoppingBag, color: "from-emerald-500 to-teal-600", onClick: onShop },
    { id: "prestige", label: "Prestige", icon: Sparkles, color: "from-fuchsia-500 to-violet-700", onClick: onPrestige ?? (() => toast("Prestige доступен в игре ✨")) },
    { id: "events", label: "Events", icon: CalendarDays, color: "from-sky-500 to-indigo-600", onClick: onEvents ?? (() => toast("События скоро 🎉")) },
    { id: "lb", label: "Leaderboards", icon: BarChart3, color: "from-violet-500 to-purple-700", onClick: onLeaderboards },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden select-none text-white font-display">
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
            {/* Tiny buildings */}
            <g transform="translate(220 105)">
              <rect x="0" y="0" width="28" height="24" fill="#f5d29a" stroke="#8a5a2a" strokeWidth="1.5" />
              <polygon points="-2,0 30,0 14,-14" fill="#c8523a" stroke="#7a3220" strokeWidth="1.5" />
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

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,10,0.55) 100%)" }} />

      {/* ============ FOREGROUND UI ============ */}

      {/* TOP BAR */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.9, 0.3, 1] }}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-2 right-2 sm:top-5 sm:left-5 sm:right-5 z-30 flex items-center gap-1.5 sm:gap-3"
      >
        <ProfileChip snap={snap} />

        {/* Resources */}
        <div className="hidden md:flex items-center gap-2 ml-2">
          <ResChip icon={<Coins className="w-4 h-4 text-amber-300" />} value={fmt(snap?.gold ?? 0)} accent="from-amber-400/30 to-amber-600/10" />
          <ResChip icon={<TreePine className="w-4 h-4 text-emerald-300" />} value={fmt(snap?.wood ?? 0)} accent="from-emerald-400/30 to-emerald-600/10" />
          <ResChip icon={<Mountain className="w-4 h-4 text-slate-200" />} value={fmt(snap?.stone ?? 0)} accent="from-slate-300/30 to-slate-500/10" />
        </div>

        <div className="flex-1" />

        <IconChip onClick={() => toast("Уведомлений нет 🔔")} title="Уведомления">
          <Bell className="w-4 h-4" />
          {hasSave && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-black/30" />}
        </IconChip>
        <IconChip onClick={onSettings} title="Настройки">
          <Settings className="w-4 h-4" />
        </IconChip>
        <AuthChip />
      </motion.div>

      {/* TITLE */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: [0.2, 0.9, 0.3, 1.1] }}
        className="absolute top-[14%] sm:top-[16%] left-0 right-0 z-20 text-center pointer-events-none px-4"
      >
        <h1
          className="font-extrabold leading-none tracking-tight"
          style={{
            fontSize: "clamp(2.4rem, 7vw, 5rem)",
            color: "#fff5d6",
            textShadow: "0 2px 0 #b8761c, 0 4px 0 #8a5414, 0 6px 0 #6b3e0f, 0 10px 22px rgba(0,0,0,0.5), 0 0 40px rgba(255,210,90,0.45)",
            WebkitTextStroke: "1.5px #6b3e0f",
          }}
        >
          LOST ISLES
        </h1>
        <div
          className="mt-1 font-bold"
          style={{
            fontSize: "clamp(1rem, 3vw, 1.8rem)",
            color: "#ffd24a",
            letterSpacing: "0.5em",
            textShadow: "0 2px 0 #6b3e0f, 0 4px 10px rgba(0,0,0,0.4)",
          }}
        >
          T Y C O O N
        </div>
      </motion.div>

      {/* SIDE QUICK MENU */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="absolute left-2 sm:left-5 top-[42%] sm:top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 sm:gap-2"
      >
        {sideButtons.map((b, i) => (
          <motion.button
            key={b.id}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.05 }}
            whileHover={{ scale: 1.08, x: 4 }}
            whileTap={{ scale: 0.94 }}
            onClick={b.onClick}
            title={b.label}
            className="group relative w-10 h-10 sm:w-14 sm:h-14 rounded-2xl border border-white/25 backdrop-blur-xl bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${b.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
            <b.icon className="relative w-4 h-4 sm:w-6 sm:h-6 drop-shadow" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl" />
            <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-bold rounded-md bg-black/70 backdrop-blur whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none hidden sm:block">
              {b.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* CENTER — PLAY */}
      <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="pointer-events-auto w-full max-w-md px-5 pb-8 sm:pb-0 sm:mt-24"
        >
          {/* Save card */}
          <AnimatePresence>
            {snap && hasSave && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-4 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] uppercase tracking-widest text-white/70 font-bold">Последнее сохранение</div>
                  <div className="text-[11px] font-bold text-emerald-300">● Сохранено</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🏝️</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold capitalize truncate">{snap.islandName}</div>
                    <div className="text-xs text-white/70">
                      Зданий: <b className="text-white">{snap.buildings}</b> / {snap.plots} · Уровень{" "}
                      <b className="text-white">{snap.level}</b>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-black/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (snap.buildings / Math.max(1, snap.plots)) * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PLAY button */}
          <motion.button
            onMouseEnter={() => setHoverPlay(true)}
            onMouseLeave={() => setHoverPlay(false)}
            whileTap={{ scale: 0.97 }}
            onClick={hasSave ? onPlay : onNewGame}
            className="relative w-full overflow-hidden rounded-3xl py-5 border-2 border-white/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            style={{
              background: "linear-gradient(135deg, #22d39a 0%, #11a87b 50%, #0a7a5e 100%)",
            }}
          >
            {/* Glow */}
            <motion.div
              className="absolute -inset-2 rounded-3xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(80,255,180,0.55), transparent 70%)" }}
              animate={{ opacity: hoverPlay ? 0.9 : 0.4, scale: hoverPlay ? 1.05 : 1 }}
              transition={{ duration: 0.4 }}
            />
            {/* Shine sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)" }}
              initial={{ x: "-120%" }}
              animate={{ x: "120%" }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
            />
            <span className="relative flex items-center justify-center gap-3 text-white font-extrabold text-2xl tracking-wider drop-shadow">
              <Play className="w-7 h-7 fill-white" />
              {hasSave ? "ПРОДОЛЖИТЬ" : "ИГРАТЬ"}
            </span>
            {hasSave && (
              <span className="relative block mt-1 text-xs text-white/85 font-semibold">
                Тапни, чтобы вернуться на остров →
              </span>
            )}
          </motion.button>

          {/* Secondary actions */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <SecondaryBtn icon={<Plus className="w-4 h-4" />} label="Новая игра" onClick={onNewGame} />
            <SecondaryBtn
              icon={<ChevronRight className="w-4 h-4" />}
              label={hasSave ? "Прогресс острова" : "Открыть архипелаг"}
              onClick={hasSave ? onPlay : onNewGame}
            />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-2 right-3 text-white/70 text-[10px] font-bold tracking-wider"
      >
        v1.0 · Lost Isles Tycoon
      </motion.div>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function ResChip({ icon, value, accent }: { icon: React.ReactNode; value: string; accent: string }) {
  return (
    <div className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-xl bg-gradient-to-br ${accent} shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`}>
      {icon}
      <span className="text-xs font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function IconChip({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={title}
      className="relative w-9 h-9 rounded-full border border-white/25 bg-white/10 backdrop-blur-xl flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
    >
      {children}
    </motion.button>
  );
}

function SecondaryBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/25 bg-white/10 backdrop-blur-xl text-xs font-bold text-white/95 shadow-[0_6px_18px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-white/15 transition-colors"
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
    <div className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-white/25 bg-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_18px_rgba(0,0,0,0.3)]">
      <div className="relative">
        {avatar ? (
          <img src={avatar} alt="" className="w-9 h-9 rounded-full border-2 border-emerald-300" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-extrabold text-sm border-2 border-white/40">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 min-w-[22px] h-[18px] px-1 rounded-md bg-gradient-to-br from-amber-400 to-orange-600 text-[10px] font-extrabold flex items-center justify-center border border-white/40 shadow">
          {level}
        </div>
      </div>
      <div className="hidden xs:flex flex-col min-w-0 sm:flex">
        <div className="text-xs font-extrabold truncate max-w-[100px] sm:max-w-[120px] leading-tight">{name}</div>
        <div className="flex items-center gap-1.5">
          <div className="w-16 sm:w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full bg-gradient-to-r from-cyan-300 to-blue-500"
            />
          </div>
          <span className="text-[9px] font-bold text-white/70 tabular-nums">{Math.round(xpPct)}%</span>
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
        className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-xs font-extrabold border border-white/40 shadow-lg transition"
      >
        ☁️ Войти
      </Link>
    );
  }
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={async () => {
        await supabase.auth.signOut();
        toast.success("Вы вышли из аккаунта");
      }}
      title="Выйти"
      className="w-9 h-9 rounded-full border border-white/25 bg-rose-500/20 hover:bg-rose-500/40 backdrop-blur-xl flex items-center justify-center"
    >
      <LogOut className="w-4 h-4" />
    </motion.button>
  );
}
