import { ISLANDS } from "@/game/data";
import type { GameState } from "@/game/types";
import { fmt } from "@/game/format";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onUnlock: (id: string) => void;
  onSwitch: (id: string) => void;
}

export function IslandsModal({ open, onClose, state, onUnlock, onSwitch }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Архипелаг" icon="🗺️">
      <div className="grid sm:grid-cols-2 gap-3">
        {ISLANDS.map((isle) => {
          const unlocked = state.unlockedIslands.includes(isle.id);
          const active = state.activeIsland === isle.id;
          const afford = state.resources.gold >= isle.unlockCost;
          return (
            <div
              key={isle.id}
              className={`relative overflow-hidden rounded-2xl border-2 p-4 ${
                active ? "border-amber-400 bg-amber-50 shadow-glow-gold" : "border-amber-200 bg-white"
              } shadow-card`}
            >
              <div className="text-5xl mb-2">{isle.emoji}</div>
              <div className="font-display font-bold text-lg">{isle.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{isle.description}</div>
              <div className="text-sm font-bold text-emerald-700 mb-3">×{isle.rateBonus} к добыче</div>
              {active ? (
                <div className="text-center text-sm font-bold text-amber-700 py-2">⭐ Активный остров</div>
              ) : unlocked ? (
                <button
                  onClick={() => {
                    onSwitch(isle.id);
                    onClose();
                  }}
                  className="btn-3d w-full bg-gradient-tropical text-white font-bold py-2.5 rounded-xl"
                >
                  Переключиться
                </button>
              ) : (
                <button
                  onClick={() => onUnlock(isle.id)}
                  disabled={!afford}
                  className="btn-3d w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-50"
                >
                  Открыть · 🪙 {fmt(isle.unlockCost)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
