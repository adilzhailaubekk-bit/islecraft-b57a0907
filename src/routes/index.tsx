import { createFileRoute } from "@tanstack/react-router";
import GamePage from "@/components/game/GamePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Island Tycoon — Построй свою империю островов" },
      { name: "description", content: "Современный тропический тайкун: добывайте ресурсы, стройте здания и открывайте новые острова." },
      { property: "og:title", content: "Island Tycoon" },
      { property: "og:description", content: "Тропический тайкун с автоматической добычей, апгрейдами и архипелагом островов." },
    ],
  }),
  component: GamePage,
});
