import { SHOP_BOOSTERS, COSMETICS } from "@/game/data";
import type { GameState } from "@/game/types";
import { fmt } from "@/game/format";
import { Modal } from "./Modal";
import { useState } from "react";

interface ShopModalProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onBuyBooster: (id: string, price: number, duration: number) => void;
  onBuyCosmetic: (id: string, price: number) => void;
}

export function ShopModal({ open, onClose, state, onBuyBooster, onBuyCosmetic }: ShopModalProps) {
  const [tab, setTab] = useState<"boost" | "cosmetic">("boost");
  return (
    <Modal open={open} onClose={onClose} title="Магазин" icon="🛒">
      <div className="flex gap-2 mb-4 p-1 bg-secondary rounded-2xl">
        {[
          { id: "boost", label: "⚡ Ускорители" },
          { id: "cosmetic", label: "🌺 Украшения" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2 rounded-xl font-bold transition-all ${
              tab === t.id ? "bg-white shadow-soft text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "boost" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {SHOP_BOOSTERS.map((b) => {
            const afford = state.resources.gold >= b.price;
            return (
              <div key={b.id} className="bg-white rounded-2xl p-4 border-2 border-amber-200 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center text-3xl shadow-inner">
                    {b.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-bold">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => onBuyBooster(b.id, b.price, b.duration)}
                  disabled={!afford}
                  className="btn-3d w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-50"
                >
                  🪙 {fmt(b.price)}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "cosmetic" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {COSMETICS.map((c) => {
            const owned = state.cosmetics.includes(c.id);
            const afford = state.resources.gold >= c.price;
            return (
              <div key={c.id} className="bg-white rounded-2xl p-4 border-2 border-amber-200 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-14 h-14 rounded-xl bg-gradient-tropical flex items-center justify-center text-3xl shadow-inner">
                    {c.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-bold">{c.name}</div>
                  </div>
                </div>
                <button
                  onClick={() => !owned && onBuyCosmetic(c.id, c.price)}
                  disabled={owned || !afford}
                  className="btn-3d w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-50"
                >
                  {owned ? "✓ Установлено" : `🪙 ${fmt(c.price)}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
