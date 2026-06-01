import { Modal } from "./Modal";
import type { GameState } from "@/game/types";
import { fmt } from "@/game/format";

interface Props {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onClaim: () => void;
}

const DAY = 22 * 3600 * 1000;

export function DailyModal({ open, onClose, state, onClaim }: Props) {
  const now = Date.now();
  const ready = now - state.lastDailyClaim >= DAY;
  const reward = 500 + state.level * 100;
  const remaining = Math.max(0, DAY - (now - state.lastDailyClaim));
  const hours = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);

  return (
    <Modal open={open} onClose={onClose} title="Ежедневная награда" icon="🎁" maxWidth="max-w-md">
      <div className="text-center space-y-4">
        <div className="text-7xl animate-bob">🎁</div>
        <div>
          <div className="text-sm text-muted-foreground">Сегодняшний бонус</div>
          <div className="font-display font-bold text-3xl text-amber-600">🪙 {fmt(reward)}</div>
        </div>
        {ready ? (
          <button
            onClick={() => {
              onClaim();
              onClose();
            }}
            className="btn-3d w-full bg-gradient-gold text-amber-900 font-display font-bold text-lg py-4 rounded-2xl"
          >
            Забрать награду
          </button>
        ) : (
          <div className="bg-secondary rounded-2xl py-4 font-bold">
            Следующая награда через {hours}ч {mins}м
          </div>
        )}
      </div>
    </Modal>
  );
}
