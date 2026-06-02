import { motion } from "motion/react";
import { BUILDINGS } from "@/game/data";
import type { GameState, Resources } from "@/game/types";
import { buildingCost, buildingRate, canAfford } from "@/game/store";
import { fmt } from "@/game/format";
import { Modal } from "./Modal";

interface BuildMenuProps {
  open: boolean;
  onClose: () => void;
  plotIndex: number;
  state: GameState;
  onBuild: (id: string, plotIndex: number) => void;
  onUpgrade: (id: string) => void;
}

const RES_EMOJI: Record<keyof Resources, string> = {
  gold: "🪙",
  wood: "🪵",
  stone: "🪨",
  energy: "⚡",
};

export function BuildMenu({ open, onClose, plotIndex, state, onBuild, onUpgrade }: BuildMenuProps) {
  const existing = state.buildings[plotIndex];


  if (existing) {
    const def = BUILDINGS.find((b) => b.id === existing.id)!;
    const cost = buildingCost(def, existing.level);
    const currentRate = buildingRate(def, existing.level);
    const nextRate = buildingRate(def, existing.level + 1);
    const afford = canAfford(state.resources, cost);
    return (
      <Modal open={open} onClose={onClose} title={def.name} icon={def.emoji} maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="bg-secondary rounded-2xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Уровень</span>
              <span className="font-bold">{existing.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Добыча {RES_EMOJI[def.produces]}</span>
              <span className="font-bold tabular-nums">
                {fmt(currentRate)} → <span className="text-emerald-600">{fmt(nextRate)}</span>/с
              </span>
            </div>
          </div>
          <button
            onClick={() => onUpgrade(existing.id)}
            disabled={!afford}
            className="btn-3d w-full bg-gradient-primary text-primary-foreground font-display font-bold text-lg py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >

            Улучшить · {Object.entries(cost).map(([k, v]) => `${RES_EMOJI[k as keyof Resources]} ${fmt(v as number)}`).join(" ")}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Построить здание" icon="🔨">
      <div className="grid sm:grid-cols-2 gap-3">
        {BUILDINGS.map((def) => {
          const unlocked = state.level >= def.unlockLevel;
          const cost = buildingCost(def, 0);
          const afford = canAfford(state.resources, cost);
          return (
            <motion.button
              key={def.id}
              whileHover={unlocked ? { y: -3 } : {}}
              whileTap={unlocked ? { scale: 0.97 } : {}}
              onClick={() => {
                if (!unlocked || !afford) return;
                onBuild(def.id);
                onClose();
              }}
              disabled={!unlocked || !afford}
              className={`text-left rounded-2xl p-4 border-2 transition-all ${
                unlocked
                  ? afford
                    ? "bg-white border-amber-300 shadow-card hover:shadow-pop cursor-pointer"
                    : "bg-white/60 border-border opacity-70"
                  : "bg-muted border-border opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-300 flex items-center justify-center text-2xl">
                  {def.emoji}
                </div>
                <div className="flex-1">
                  <div className="font-display font-bold">{def.name}</div>
                  <div className="text-xs text-muted-foreground">{def.description}</div>
                </div>
              </div>
              {!unlocked ? (
                <div className="text-sm text-muted-foreground">🔒 Уровень игрока {def.unlockLevel}</div>
              ) : (
                <>
                  <div className="text-sm font-bold text-emerald-700 mb-1">
                    +{fmt(buildingRate(def, 1))} {RES_EMOJI[def.produces]}/с
                  </div>
                  <div className="text-sm font-bold tabular-nums">
                    {Object.entries(cost).map(([k, v]) => `${RES_EMOJI[k as keyof Resources]} ${fmt(v as number)}`).join("  ")}
                  </div>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </Modal>
  );
}
