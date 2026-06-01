import { ACHIEVEMENTS } from "@/game/data";
import type { GameState } from "@/game/types";
import { fmt } from "@/game/format";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onClaim: (id: string, reward: number) => void;
}

export function AchievementsModal({ open, onClose, state, onClaim }: Props) {
  const progressFor = (metric: string) => {
    if (metric === "gold") return state.totalGoldEarned;
    if (metric === "level") return state.level;
    if (metric === "buildings") return state.buildings.reduce((s, b) => s + b.level, 0);
    if (metric === "islands") return state.unlockedIslands.length;
    return 0;
  };
  return (
    <Modal open={open} onClose={onClose} title="Достижения" icon="🏆">
      <div className="space-y-2">
        {ACHIEVEMENTS.map((a) => {
          const claimed = state.achievements.includes(a.id);
          const p = progressFor(a.metric);
          const pct = Math.min(100, (p / a.goal) * 100);
          const done = p >= a.goal;
          return (
            <div
              key={a.id}
              className={`rounded-2xl p-4 border-2 ${
                claimed ? "bg-emerald-50 border-emerald-300" : done ? "bg-amber-50 border-amber-300" : "bg-white border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <div>
                  <div className="font-display font-bold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.description}</div>
                </div>
                {claimed ? (
                  <span className="text-emerald-600 font-bold whitespace-nowrap">✓ Получено</span>
                ) : done ? (
                  <button
                    onClick={() => onClaim(a.id, a.reward)}
                    className="btn-3d bg-gradient-gold text-amber-900 font-bold px-4 py-2 rounded-xl whitespace-nowrap"
                  >
                    🪙 +{fmt(a.reward)}
                  </button>
                ) : (
                  <span className="text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                    {fmt(p)}/{fmt(a.goal)}
                  </span>
                )}
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
