import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateGeminiText } from "../gemini.server";

const gameSnapshotSchema = z.object({
  level: z.number().min(1),
  gold: z.number().min(0),
  wood: z.number().min(0),
  stone: z.number().min(0),
  plots: z.number().min(0),
  buildings: z.number().min(0),
  islands: z.number().min(1),
  activeCaptain: z.boolean(),
  question: z.string().trim().min(1).max(500),
});

export const getGeminiGameAdvice = createServerFn({ method: "POST" })
  .inputValidator(gameSnapshotSchema)
  .handler(async ({ data }) => {
    const prompt = [
      `Уровень игрока: ${data.level}`,
      `Ресурсы: ${Math.floor(data.gold)} золота, ${Math.floor(data.wood)} дерева, ${Math.floor(data.stone)} камня`,
      `Участки: ${data.plots}`,
      `Постройки: ${data.buildings}`,
      `Открыто островов: ${data.islands}`,
      `Активен Таинственный Капитан: ${data.activeCaptain ? "да" : "нет"}`,
      `Вопрос игрока: ${data.question}`,
    ].join("\n");

    const answer = await generateGeminiText({
      system:
        "Ты дружелюбный ИИ-помощник в игре Islecraft. Отвечай по-русски, коротко, практично и без markdown-таблиц. Давай 2-4 конкретных совета по развитию острова, экономике или событию капитана. Не обещай награды, которых нет в состоянии игры.",
      prompt,
      temperature: 0.65,
      maxOutputTokens: 360,
    });

    return { answer };
  });
