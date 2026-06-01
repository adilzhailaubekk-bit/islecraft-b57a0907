import { motion } from "motion/react";
import type { Resources } from "@/game/types";
import { fmt, fmtRate } from "@/game/format";

const RES_META: Record<keyof Resources, { name: string; emoji: string; color: string; glow: string }> = {
  gold: { name: "Золото", emoji: "🪙", color: "from-amber-300 to-amber-500", glow: "shadow-glow-gold" },
  wood: { name: "Дерево", emoji: "🪵", color: "from-orange-300 to-orange-600", glow: "" },
  stone: { name: "Камень", emoji: "🪨", color: "from-slate-300 to-slate-500", glow: "" },
  energy: { name: "Энергия", emoji: "⚡", color: "from-cyan-300 to-sky-500", glow: "" },
};

interface ResourceBarProps {
  resources: Resources;
  rates: Resources;
}

export function ResourceBar({ resources, rates }: ResourceBarProps) {
  const keys: (keyof Resources)[] = ["gold", "wood", "stone", "energy"];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
      {keys.map((k) => {
        const meta = RES_META[k];
        return (
          <motion.div
            key={k}
            layout
            className="relative bg-white/95 backdrop-blur rounded-2xl px-3 py-2 shadow-card border-2 border-white flex items-center gap-2 sm:gap-3"
          >
            <div
              className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${meta.color} flex items-center justify-center text-xl sm:text-2xl shadow-inner border-2 border-white/80`}
            >
              <span className="drop-shadow">{meta.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                {meta.name}
              </div>
              <div className="font-display font-bold text-base sm:text-lg leading-tight tabular-nums truncate">
                {fmt(resources[k])}
              </div>
              {rates[k] > 0 && (
                <div className="text-[10px] sm:text-xs text-emerald-600 font-bold tabular-nums">
                  +{fmtRate(rates[k])}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
