import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ISLANDS } from "@/game/data";
import type { GameState } from "@/game/types";

interface IslandViewProps {
  state: GameState;
  onPlotClick: (index: number) => void;
}

// Hex-ish isometric grid of plots
export function IslandView({ state, onPlotClick }: IslandViewProps) {
  const island = ISLANDS.find((i) => i.id === state.activeIsland)!;
  const [tap, setTap] = useState<{ x: number; y: number; key: number } | null>(null);

  const slots = useMemo(() => {
    // arrange up to 12 plots in a soft cluster
    const positions = [
      { x: 50, y: 55 },
      { x: 35, y: 48 },
      { x: 65, y: 48 },
      { x: 28, y: 62 },
      { x: 72, y: 62 },
      { x: 50, y: 42 },
      { x: 42, y: 70 },
      { x: 58, y: 70 },
      { x: 20, y: 55 },
      { x: 80, y: 55 },
      { x: 50, y: 75 },
      { x: 50, y: 30 },
    ];
    return positions.slice(0, Math.max(state.plots, state.buildings.length));
  }, [state.plots, state.buildings.length]);

  const cosmeticSpots = [
    { x: 15, y: 35 },
    { x: 85, y: 35 },
    { x: 12, y: 75 },
    { x: 88, y: 75 },
  ];

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-3xl"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTap({ x: e.clientX - r.left, y: e.clientY - r.top, key: Date.now() });
      }}
    >
      {/* Sky + sun */}
      <div className="absolute inset-0 bg-gradient-sky" />
      <div className="absolute top-8 right-12 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-200 to-amber-400 shadow-glow-gold animate-bob" />
      {/* Clouds */}
      <div className="absolute top-10 left-10 text-5xl opacity-80 animate-float">☁️</div>
      <div className="absolute top-20 left-1/3 text-4xl opacity-60 animate-float" style={{ animationDelay: "1.2s" }}>☁️</div>
      <div className="absolute top-6 right-1/3 text-3xl opacity-70 animate-float" style={{ animationDelay: "2s" }}>☁️</div>

      {/* Ocean */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-ocean" />
      {/* Waves */}
      <svg
        className="absolute inset-x-0 bottom-1/3 w-full h-12 animate-wave"
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
      >
        <path
          d="M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 L1200,80 L0,80 Z"
          fill="oklch(0.78 0.13 220 / 0.5)"
        />
      </svg>

      {/* Island base (isometric ellipse with sand top) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative" style={{ width: "78%", height: "62%" }}>
          {/* dirt under */}
          <div
            className="absolute inset-0 rounded-[50%] translate-y-3"
            style={{
              background: "radial-gradient(ellipse at 50% 60%, oklch(0.4 0.08 50) 0%, oklch(0.3 0.06 50) 70%, transparent 100%)",
              filter: "blur(2px)",
            }}
          />
          {/* sand */}
          <div
            className="absolute inset-0 rounded-[50%]"
            style={{
              background:
                "radial-gradient(ellipse at 50% 45%, oklch(0.94 0.08 85) 0%, oklch(0.85 0.1 80) 55%, oklch(0.75 0.12 70) 100%)",
              boxShadow: "inset 0 -20px 40px oklch(0.5 0.1 50 / 0.3), 0 30px 60px -20px oklch(0.2 0.1 240 / 0.4)",
            }}
          />
          {/* grass patch */}
          <div
            className="absolute"
            style={{
              left: "12%",
              right: "12%",
              top: "22%",
              bottom: "30%",
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at 50% 50%, oklch(0.75 0.18 145) 0%, oklch(0.6 0.18 155) 60%, oklch(0.5 0.15 160) 100%)",
              boxShadow: "inset 0 -10px 25px oklch(0.3 0.1 160 / 0.4)",
            }}
          />
        </div>
      </div>

      {/* Palms / decor */}
      <div className="absolute text-5xl animate-float pointer-events-none" style={{ left: "12%", top: "55%" }}>🌴</div>
      <div className="absolute text-4xl animate-float pointer-events-none" style={{ right: "14%", top: "58%", animationDelay: "1s" }}>🌴</div>
      <div className="absolute text-3xl pointer-events-none" style={{ left: "8%", bottom: "18%" }}>🐚</div>
      <div className="absolute text-3xl pointer-events-none" style={{ right: "10%", bottom: "20%" }}>⭐</div>

      {/* Cosmetics */}
      {state.cosmetics.map((c, i) => {
        const spot = cosmeticSpots[i % cosmeticSpots.length];
        const map: Record<string, string> = { torches: "🔥", statue: "🗿", lighthouse: "🗼", garden: "🌺" };
        return (
          <div
            key={c}
            className="absolute text-4xl animate-bob pointer-events-none"
            style={{ left: `${spot.x}%`, top: `${spot.y}%`, animationDelay: `${i * 0.3}s` }}
          >
            {map[c]}
          </div>
        );
      })}

      {/* Island label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full shadow-card border-2 border-white pointer-events-none">
        <span className="font-display font-bold text-sm">
          {island.emoji} {island.name} · ×{island.rateBonus}
        </span>
      </div>

      {/* Plots */}
      {slots.map((pos, i) => {
        const building = state.buildings[i];
        const isEmpty = !building;
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onPlotClick(i);
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <motion.div
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 14, stiffness: 200, delay: i * 0.05 }}
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.92 }}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl border-2 ${
                isEmpty
                  ? "bg-white/40 border-white/70 border-dashed text-white/90 animate-pulse-glow"
                  : "bg-gradient-to-br from-amber-100 to-amber-300 border-white shadow-card"
              }`}
              style={{
                transform: "perspective(400px) rotateX(20deg)",
              }}
            >
              {isEmpty ? "+" : (() => {
                const def = require("@/game/data").BUILDINGS.find((d: any) => d.id === building.id);
                return def?.emoji ?? "🏠";
              })()}
              {!isEmpty && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow border-2 border-white">
                  {building.level}
                </div>
              )}
            </motion.div>
          </button>
        );
      })}

      {/* Click ripple */}
      {tap && (
        <motion.div
          key={tap.key}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute w-10 h-10 rounded-full bg-white pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: tap.x, top: tap.y }}
          onAnimationComplete={() => setTap(null)}
        />
      )}
    </div>
  );
}
