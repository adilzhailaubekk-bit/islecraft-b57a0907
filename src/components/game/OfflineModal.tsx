import { Modal } from "./Modal";
import { fmt } from "@/game/format";

interface Props {
  open: boolean;
  onClose: () => void;
  gold: number;
  seconds: number;
}

export function OfflineModal({ open, onClose, gold, seconds }: Props) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return (
    <Modal open={open} onClose={onClose} title="С возвращением!" icon="🌅" maxWidth="max-w-md">
      <div className="text-center space-y-4">
        <div className="text-6xl animate-bob">⛱️</div>
        <p className="text-muted-foreground">
          Пока вас не было ({h}ч {m}м), ваш остров продолжал работать на 50% мощности.
        </p>
        <div className="bg-gradient-gold rounded-2xl py-6 shadow-glow-gold">
          <div className="text-sm font-bold text-amber-900/70">ВЫ ЗАРАБОТАЛИ</div>
          <div className="font-display font-bold text-4xl text-amber-900">🪙 {fmt(gold)}</div>
        </div>
        <button
          onClick={onClose}
          className="btn-3d w-full bg-gradient-primary text-primary-foreground font-display font-bold text-lg py-4 rounded-2xl"
        >
          Собрать
        </button>
      </div>
    </Modal>
  );
}
