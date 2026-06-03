import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import GamePage from "@/components/game/GamePage";
import { MainMenu } from "@/components/game/MainMenu";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const STORAGE_KEY = "island-tycoon-save-v2";

type Screen = "menu" | "game";
type InitialModal = "shop" | "daily" | "achievements" | "prestige" | null;

function IndexPage() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [initialModal, setInitialModal] = useState<InitialModal>(null);
  // Start as false on server + first client render to avoid hydration mismatch,
  // then sync from localStorage after mount.
  const [hasSave, setHasSave] = useState(false);
  useEffect(() => {
    setHasSave(!!localStorage.getItem(STORAGE_KEY));
  }, []);

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
            onQuests={() => enter("daily")}
            onAchievements={() => enter("achievements")}
            onLeaderboards={() => enter("achievements")}
            onPrestige={() => enter("prestige")}
            onEvents={() =>
              toast("События скоро будут доступны 🎉", {
                description: "Сезонные ивенты в разработке.",
              })
            }
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
      { title: "Islecraft — Построй свой тропический остров" },
      {
        name: "description",
        content:
          "Islecraft — современный тропический островной крафт: добывайте ресурсы, стройте здания и открывайте архипелаг островов.",
      },
      { property: "og:title", content: "Islecraft" },
      {
        property: "og:description",
        content:
          "Современный тропический тайкун с автоматической добычей, апгрейдами и архипелагом островов.",
      },
    ],
  }),
  component: IndexPage,
});
