import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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
  hasSave: boolean;
}

type MenuButton = {
  id: "play" | "new" | "shop" | "daily" | "leaderboards" | "settings";
  label: string;
  emoji: string;
  gradient: string;
  primary?: boolean;
};

const BUTTONS: MenuButton[] = [
  { id: "play", label: "Play", emoji: "▶", gradient: "from-emerald-400 via-green-500 to-teal-600", primary: true },
  { id: "new", label: "New Game", emoji: "🏝️", gradient: "from-amber-400 via-orange-500 to-rose-500" },
  { id: "shop", label: "Shop", emoji: "💰", gradient: "from-yellow-400 via-amber-500 to-orange-600" },
  { id: "daily", label: "Daily Rewards", emoji: "🎁", gradient: "from-fuchsia-400 via-pink-500 to-rose-500" },
  { id: "leaderboards", label: "Leaderboards", emoji: "🏆", gradient: "from-sky-400 via-indigo-500 to-violet-600" },
  { id: "settings", label: "Settings", emoji: "⚙", gradient: "from-slate-400 via-slate-500 to-slate-700" },
];

export function MainMenu({
  onPlay,
  onNewGame,
  onSettings,
  onLeaderboards,
  onDaily,
  onShop,
  hasSave,
}: MainMenuProps) {
  const handlers: Record<string, () => void> = {
    play: onPlay,
    new: onNewGame,
    settings: onSettings,
    leaderboards: onLeaderboards,
    daily: onDaily,
    shop: onShop,
  };

  // Pre-compute random animation properties for birds/clouds/butterflies
  const birds = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => ({
        id: i,
        top: 8 + Math.random() * 30,
        duration: 18 + Math.random() * 14,
        delay: i * 5 + Math.random() * 4,
        scale: 0.6 + Math.random() * 0.6,
      })),
    [],
  );
  const clouds = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: i,
        top: 4 + Math.random() * 28,
        duration: 60 + Math.random() * 40,
        delay: -Math.random() * 40,
        scale: 0.8 + Math.random() * 0.9,
        opacity: 0.55 + Math.random() * 0.35,
      })),
    [],
  );
  const butterflies = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, i) => ({
        id: i,
        top: 45 + Math.random() * 35,
        left: 10 + Math.random() * 80,
        duration: 8 + Math.random() * 6,
        delay: Math.random() * 5,
        color: ["#ff5ea0", "#ffd84a", "#79f7e6"][i % 3],
      })),
    [],
  );

  const [showHint, setShowHint] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #ffd28a 0%, #ffb46b 18%, #ff9a8a 35%, #6ec3e8 65%, #3ea3d8 100%)",
        }}
      />

      {/* Sun with glow */}
      <motion.div
        className="absolute"
        style={{ top: "14%", right: "16%" }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="w-40 h-40 rounded-full"
          style={{
            background: "radial-gradient(circle, #fff7c7 0%, #ffd84a 40%, rgba(255,200,80,0) 75%)",
            filter: "blur(2px)",
          }}
        />
      </motion.div>

      {/* Clouds */}
      {mounted && clouds.map((c) => (
        <motion.div
          key={`c-${c.id}`}
          className="absolute"
          style={{ top: `${c.top}%`, opacity: c.opacity }}
          initial={{ x: "-20vw" }}
          animate={{ x: "120vw" }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <svg width={140 * c.scale} height={70 * c.scale} viewBox="0 0 140 70">
            <g fill="#ffffff">
              <ellipse cx="40" cy="42" rx="32" ry="22" />
              <ellipse cx="72" cy="34" rx="34" ry="26" />
              <ellipse cx="102" cy="44" rx="28" ry="20" />
            </g>
          </svg>
        </motion.div>
      ))}

      {/* Distant mountains silhouette */}
      <svg
        className="absolute bottom-[42%] left-0 w-full"
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
        style={{ height: "18%" }}
      >
        <path d="M0,200 L0,120 L120,40 L220,110 L320,30 L460,130 L580,60 L700,120 L800,80 L800,200 Z" fill="#3d6e92" opacity="0.6" />
        <path d="M0,200 L0,150 L100,90 L200,140 L320,80 L440,150 L560,100 L680,140 L800,110 L800,200 Z" fill="#2d567a" opacity="0.7" />
      </svg>

      {/* Ocean with animated waves */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #3ec5f0 0%, #1ea1e0 50%, #0a5a9c 100%)",
          }}
        />
        {/* Wave layers */}
        {[
          { top: 0, color: "#ffffff", opacity: 0.4, duration: 8, amp: 6 },
          { top: 14, color: "#a7e6ff", opacity: 0.35, duration: 11, amp: 8 },
          { top: 32, color: "#7dd3fc", opacity: 0.25, duration: 14, amp: 10 },
        ].map((w, i) => (
          <motion.svg
            key={`w-${i}`}
            className="absolute left-0 w-[200%]"
            style={{ top: `${w.top}%`, height: 60 }}
            viewBox="0 0 1600 60"
            preserveAspectRatio="none"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: w.duration, repeat: Infinity, ease: "linear" }}
          >
            <path
              d={`M0,30 Q200,${30 - w.amp} 400,30 T800,30 T1200,30 T1600,30 L1600,60 L0,60 Z`}
              fill={w.color}
              opacity={w.opacity}
            />
          </motion.svg>
        ))}

        {/* Island */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: "22%" }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="520" height="220" viewBox="0 0 520 220">
            {/* Sand */}
            <ellipse cx="260" cy="160" rx="240" ry="44" fill="#ffe7a8" />
            <ellipse cx="260" cy="150" rx="210" ry="34" fill="#ffd884" />
            {/* Grass mound */}
            <ellipse cx="260" cy="125" rx="170" ry="48" fill="#6fd16a" />
            <ellipse cx="260" cy="118" rx="140" ry="38" fill="#4ab84a" />
            {/* Rocks */}
            <ellipse cx="120" cy="155" rx="22" ry="12" fill="#8a96aa" />
            <ellipse cx="420" cy="158" rx="26" ry="14" fill="#8a96aa" />
            {/* Path */}
            <ellipse cx="260" cy="148" rx="40" ry="8" fill="#d8d1b8" opacity="0.7" />
          </svg>

          {/* Palms */}
          {[
            { left: "20%", delay: 0, scale: 1 },
            { left: "72%", delay: 0.8, scale: 0.9 },
            { left: "46%", delay: 0.4, scale: 1.15 },
          ].map((p, i) => (
            <motion.div
              key={`palm-${i}`}
              className="absolute"
              style={{
                left: p.left,
                bottom: "55%",
                transformOrigin: "bottom center",
                transform: `scale(${p.scale})`,
              }}
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ duration: 5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
            >
              <svg width="110" height="160" viewBox="0 0 110 160">
                {/* Trunk */}
                <path
                  d="M55,160 Q48,110 52,70 Q56,40 62,10"
                  stroke="#7a4a26"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Leaves */}
                {[0, 60, 120, 180, 240, 300].map((rot) => (
                  <g key={rot} transform={`translate(60 18) rotate(${rot})`}>
                    <path
                      d="M0,0 Q24,-10 50,0 Q24,8 0,0 Z"
                      fill="#3aa84a"
                      stroke="#2d8c3e"
                      strokeWidth="2"
                    />
                  </g>
                ))}
                <circle cx="60" cy="18" r="6" fill="#2d8c3e" />
              </svg>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Birds */}
      {mounted && birds.map((b) => (
        <motion.div
          key={`b-${b.id}`}
          className="absolute"
          style={{ top: `${b.top}%` }}
          initial={{ x: "-10vw" }}
          animate={{ x: "110vw", y: [0, -20, 10, -10, 0] }}
          transition={{
            x: { duration: b.duration, delay: b.delay, repeat: Infinity, ease: "linear" },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <motion.svg
            width={28 * b.scale}
            height={14 * b.scale}
            viewBox="0 0 28 14"
            animate={{ scaleY: [1, 0.6, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <path d="M2,8 Q7,1 14,7 Q21,1 26,8" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" />
          </motion.svg>
        </motion.div>
      ))}

      {/* Butterflies */}
      {mounted && butterflies.map((b) => (
        <motion.div
          key={`bf-${b.id}`}
          className="absolute"
          style={{ top: `${b.top}%`, left: `${b.left}%` }}
          animate={{
            x: [0, 40, -30, 20, 0],
            y: [0, -30, -10, -40, 0],
          }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.svg
            width="18"
            height="14"
            viewBox="0 0 18 14"
            animate={{ scaleX: [1, 0.4, 1] }}
            transition={{ duration: 0.3, repeat: Infinity }}
          >
            <ellipse cx="5" cy="7" rx="4" ry="6" fill={b.color} />
            <ellipse cx="13" cy="7" rx="4" ry="6" fill={b.color} />
            <rect x="8.5" y="5" width="1" height="6" fill="#222" />
          </motion.svg>
        </motion.div>
      ))}

      {/* Sparkles */}
      {mounted && Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`sp-${i}`}
          className="absolute w-1.5 h-1.5 rounded-full bg-white"
          style={{
            top: `${Math.random() * 60}%`,
            left: `${Math.random() * 100}%`,
            boxShadow: "0 0 8px #fff, 0 0 16px #fff",
          }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 3, repeat: Infinity }}
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)" }}
      />

      {/* === AUTH CHIP (top-right) === */}
      <AuthChip />

      {/* === FOREGROUND UI === */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-between py-6 sm:py-10 px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: -30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.2, 0.9, 0.3, 1.2] }}
          className="text-center mt-4 sm:mt-8"
        >
          <motion.h1
            className="font-display font-extrabold leading-none tracking-tight"
            style={{
              fontSize: "clamp(2.6rem, 8vw, 5.5rem)",
              color: "#fff5d6",
              textShadow:
                "0 2px 0 #b8761c, 0 4px 0 #8a5414, 0 6px 0 #6b3e0f, 0 10px 18px rgba(0,0,0,0.45), 0 0 32px rgba(255,210,90,0.55)",
              WebkitTextStroke: "1.5px #6b3e0f",
            }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            LOST ISLES
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-1 sm:mt-2 font-display font-bold"
            style={{
              fontSize: "clamp(1.2rem, 3.5vw, 2.2rem)",
              color: "#ffd24a",
              letterSpacing: "0.4em",
              textShadow: "0 2px 0 #6b3e0f, 0 4px 10px rgba(0,0,0,0.4)",
            }}
          >
            T Y C O O N
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="mt-2 text-white/90 text-xs sm:text-sm font-bold tracking-wide drop-shadow"
          >
            Build your tropical empire 🌴
          </motion.div>
        </motion.div>

        {/* Buttons */}
        <div className="w-full max-w-md flex flex-col gap-3 mb-4 sm:mb-8">
          {BUTTONS.map((b, i) => (
            <motion.button
              key={b.id}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: "easeOut" }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={handlers[b.id]}
              disabled={b.id === "play" && !hasSave}
              className={`relative group bg-gradient-to-br ${b.gradient} text-white font-display font-extrabold rounded-2xl border-2 border-white/80 shadow-pop overflow-hidden ${
                b.primary ? "py-4 text-xl" : "py-3 text-base"
              } ${b.id === "play" && !hasSave ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{
                boxShadow:
                  "0 6px 0 rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.4)",
              }}
            >
              {/* Shine sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 50%, transparent 65%)",
                }}
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: b.primary ? 1.5 : 4 + i,
                  ease: "easeInOut",
                }}
              />
              <span className="relative flex items-center justify-center gap-3">
                <span className="text-2xl drop-shadow">{b.emoji}</span>
                <span className="text-shadow-soft tracking-wide">{b.label}</span>
              </span>
              {b.id === "play" && hasSave && (
                <motion.span
                  className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 border-2 border-white"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  CONTINUE
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showHint ? 1 : 0.5 }}
          transition={{ delay: 1.2 }}
          className="text-white/80 text-xs font-bold drop-shadow"
        >
          v1.0 · Made with 🌺
        </motion.div>
      </div>
    </div>
  );
}

function AuthChip() {
  const { user, loading } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Вы вышли из аккаунта");
  };

  if (loading) return null;

  return (
    <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-30">
      {user ? (
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full pl-1 pr-3 py-1 shadow-lg border-2 border-white">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full border-2 border-emerald-400"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
              {(user.user_metadata?.full_name || user.email || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-bold text-slate-700 max-w-[110px] truncate">
            {user.user_metadata?.full_name || user.email?.split("@")[0]}
          </span>
          <button
            onClick={handleSignOut}
            title="Выйти"
            className="ml-1 w-6 h-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 flex items-center justify-center text-xs font-bold transition"
          >
            ⎋
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold rounded-full px-4 py-2 shadow-lg border-2 border-white transition"
        >
          <span>☁️</span>
          <span>Войти</span>
        </Link>
      )}
    </div>
  );
}
