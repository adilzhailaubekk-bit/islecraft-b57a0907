import { motion } from "motion/react";
import { xpForLevel } from "@/game/data";

interface Props {
  level: number;
  xp: number;
}

export function LevelBadge({ level, xp }: Props) {
  const need = xpForLevel(level);
  const pct = Math.min(100, (xp / need) * 100);
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", damping: 12 }}
      className="flex items-center gap-2 bg-white/95 backdrop-blur rounded-2xl px-3 py-2 shadow-card border-2 border-white"
    >
      <div className="relative w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-inner border-2 border-white/70">
        <span className="font-display font-bold text-white text-lg text-shadow-soft">{level}</span>
      </div>
      <div className="hidden sm:block min-w-[120px]">
        <div className="text-xs font-bold text-muted-foreground uppercase">Уровень</div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-gold"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">{Math.floor(xp)}/{need} XP</div>
      </div>
    </motion.div>
  );
}
