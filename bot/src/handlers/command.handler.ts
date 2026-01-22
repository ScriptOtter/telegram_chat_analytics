import { Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { StatsModel } from "../models/StatsModel";
import { MyContext } from "./index";
import { MessageModel, UserModel } from "../models";
import { pool } from "../services/postgre.service";
import { Message } from "../types/types";
import { analyzeMessages } from "../services/gemini.service";
import { convertMessagesInString } from "../ulits";

export function setupCommandHandlers(
  bot: Telegraf<MyContext>,
  statsModel: StatsModel,
) {
  bot.start((ctx) => {
    ctx.reply("🤖 Привет! Используй /stats в группе для получения статистики");
  });

  bot.command("stats", async (ctx) => {
    try {
      const chatId = ctx.chat.id;

      if (ctx.chat.type === "private") {
        await ctx.reply(
          "📊 Эта команда работает только в группах, где я сохраню сообщения.\n\nДобавьте меня в группу, и я начну собирать статистику!",
        );
        return;
      }

      try {
        console.log("📊 Получаем статистику для чата:", chatId);
        const chatStats = await statsModel.getChatStats(chatId, "all");
        console.log("📈 Статистика получена");

        const formattedStats = statsModel.formatChatStats(chatStats);

        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback("📅 Сегодня", `stats:today:${chatId}`),
            Markup.button.callback("📅 Неделя", `stats:week:${chatId}`),
          ],
          [
            Markup.button.callback("📅 Месяц", `stats:month:${chatId}`),
            Markup.button.callback("✅ Все время", `stats:all:${chatId}`),
          ],
          [
            Markup.button.callback(
              "🔍 Найти пользователя",
              `stats:search:${chatId}`,
            ),
            Markup.button.callback(
              "👥 Список пользователей",
              `stats:list:${chatId}`,
            ),
          ],
        ]);

        await ctx.replyWithMarkdown(formattedStats, keyboard);
      } catch (dbError: any) {
        console.error("❌ Database error:", dbError?.message || dbError);
        await ctx.reply(
          "📊 Статистика еще не собрана или произошла ошибка. Убедитесь, что бот имеет доступ к сообщениям чата.",
        );
      }
    } catch (error: any) {
      console.error("❌ Error in /stats command:", error?.message || error);
      await ctx.reply(
        "❌ Произошла ошибка при получении статистики: " +
          (error?.message || "неизвестная ошибка"),
      );
    }
  });

  bot.command("help", (ctx) => {
    ctx.reply(
      "🤖 Доступные команды:\n" +
        "/stats - статистика чата (работает в группах)\n" +
        "/help - эта справка\n\n" +
        "Для работы добавьте меня в группу и дайте права на чтение сообщений.",
    );
  });

  bot.command("cancel", async (ctx) => {
    if (ctx.session?.waitingForSearch) {
      delete ctx.session.waitingForSearch;
      await ctx.reply("✅ Поиск отменен");
    } else {
      await ctx.reply("Нет активного поиска для отмены");
    }
  });

  bot.command("analyze", async (ctx) => {
    const users = new UserModel(pool);
    try {
      const chatId = ctx.chat.id;
      const messageText = ctx.message.text || "";
      const replyToMessage = ctx.message.reply_to_message;

      if (ctx.chat.type === "private") {
        await ctx.reply(
          "📊 Эта команда работает только в группах, где есть статистика.\n\n" +
            "Добавьте меня в группу и используйте /stats для начала сбора данных.",
        );
        return;
      }

      let targetUserId: number | undefined;
      let targetUsername: string | undefined;
      let analysisType: "chat" | "user" = "user";

      const mentionMatch = messageText.match(/\/analyze\s+@(\w+)/);

      if (mentionMatch) {
        targetUsername = mentionMatch[1];
        analysisType = "user";

        console.log(`🔍 Анализ пользователя по username: @${targetUsername}`);
      } else if (replyToMessage && replyToMessage.from) {
        targetUserId = replyToMessage.from.id;
        analysisType = "user";

        console.log(
          `🔍 Анализ пользователя в ответ на сообщение: ${targetUserId}`,
        );
      } else {
        console.log(`📊 @id отсутсвует`);
        return;
      }

      let waitingText =
        "🤖 *Запускаю анализ...*\n\nЭто может занять несколько секунд. Пожалуйста, подождите...";

      if (analysisType === "user") {
        if (targetUsername) {
          waitingText = `🤖 *Анализирую пользователя @${targetUsername}...*\n\nЭто может занять несколько секунд.`;
        } else if (targetUserId) {
          waitingText = `🤖 *Анализирую пользователя...*\n\nЭто может занять несколько секунд.`;
        }
      }

      const waitingMessage = await ctx.reply(waitingText, {
        parse_mode: "Markdown",
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      });

      let analysis: string = await convertMessagesInString(
        targetUserId
          ? targetUserId
          : await users.getTelegramIdByUsername(targetUsername!),
      );

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        waitingMessage.message_id,
        undefined,
        analysis,
        { parse_mode: "Markdown" },
      );
    } catch (error: any) {
      console.error("❌ Error in /analyze command:", error?.message || error);

      await ctx.reply(
        "❌ *Не удалось проанализировать*\n\n" +
          "Причина: " +
          (error?.message || "неизвестная ошибка") +
          "\n\n" +
          "Попробуйте позже или убедитесь, что в чате есть статистика (/stats)",
      );
    }
  });
}
