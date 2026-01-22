import { Telegraf } from "telegraf";
import { StatsModel } from "../models/StatsModel";
import { TimePeriod } from "../types/types";
import { MyContext } from "./index";
import {
  handleBackToStats,
  handlePeriodStats,
  handleSearchUser,
  handleSelectUser,
  handleUserList,
} from "./stats.handler";

export function setupCallbackHandlers(
  bot: Telegraf<MyContext>,
  statsModel: StatsModel,
) {
  bot.on("callback_query", async (ctx) => {
    try {
      const callbackData = (ctx.callbackQuery as any).data;

      if (!callbackData || !callbackData.startsWith("stats:")) {
        return;
      }

      const [, action, chatIdStr] = callbackData.split(":");
      const chatId = parseInt(chatIdStr);

      if (isNaN(chatId)) {
        await ctx.answerCbQuery("❌ Ошибка: неверный ID чата");
        return;
      }

      // Проверяем доступ к чату
      try {
        const chatMember = await ctx.telegram.getChatMember(
          chatId,
          ctx.botInfo.id,
        );
        if (chatMember.status === "left" || chatMember.status === "kicked") {
          await ctx.answerCbQuery("❌ Бот не является участником этого чата");
          return;
        }
      } catch (error) {
        await ctx.answerCbQuery("❌ Нет доступа к чату");
        return;
      }

      switch (action) {
        case "today":
        case "week":
        case "month":
        case "all":
          await handlePeriodStats(
            ctx,
            chatId,
            action as TimePeriod,
            statsModel,
          );
          break;

        case "search":
          await handleSearchUser(ctx, chatId, statsModel);
          break;

        case "list":
          await handleUserList(ctx, chatId, statsModel);
          break;

        case "select_user":
          await handleSelectUser(ctx, chatId, callbackData, statsModel);
          break;

        case "back":
          await handleBackToStats(ctx, chatId, statsModel);
          break;

        default:
          await ctx.answerCbQuery("❌ Неизвестное действие");
      }
    } catch (error) {
      console.error("Error handling callback:", error);
      await ctx.answerCbQuery("❌ Произошла ошибка");
    }
  });
}
