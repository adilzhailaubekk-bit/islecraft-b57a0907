import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import GamePage from "@/components/game/GamePage";
import { MainMenu } from "@/components/game/MainMenu";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const STORAGE_KEY = "island-tycoon-save-v1";

type Screen = "menu" | "game";
type InitialModal = "shop" | "daily" | "achievements" | null;

function IndexPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [initialModal, setInitialModal] = useState<InitialModal>(null);
  const hasSave =
    typeof window !== "undefined" && !!localStorage.getItem(STORAGE_KEY);

  const enter = (modal: InitialModal = null) => {
    setInitialModal(modal);
    setScreen("game");
  };

  return (
    <>
    <Toaster />
    <AnimatePresence mode="wait">
      {screen === "menu" ? (
        <motion.div
          key="menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
        >
          <MainMenu
            hasSave={hasSave}
            onPlay={() => enter()}
            onNewGame={() => {
              if (
                hasSave &&
                !confirm("Начать новую игру? Текущий прогресс будет удалён.")
              )
                return;
              localStorage.removeItem(STORAGE_KEY);
              enter();
            }}
            onShop={() => enter("shop")}
            onDaily={() => enter("daily")}
            onLeaderboards={() => enter("achievements")}
            onSettings={() =>
              toast("Настройки скоро будут доступны ⚙", {
                description: "В разработке: звук, графика, язык.",
              })
            }
          />
        </motion.div>
      ) : (
        <motion.div
          key="game"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <GamePage initialModal={initialModal} />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lost Isles Tycoon — Построй свою тропическую империю" },
      {
        name: "description",
        content:
          "Lost Isles Tycoon — современный тропический тайкун: добывайте ресурсы, стройте здания и открывайте архипелаг островов.",
      },
      { property: "og:title", content: "Lost Isles Tycoon" },
      {
        property: "og:description",
        content:
          "Современный тропический тайкун с автоматической добычей, апгрейдами и архипелагом островов.",
      },
    ],
  }),
  component: IndexPage,
});
