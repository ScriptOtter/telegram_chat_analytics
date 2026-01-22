import { Markup } from "telegraf";
import { StatsModel } from "../models/StatsModel";
import { TimePeriod, User } from "../types/types";

export async function handlePeriodStats(
  ctx: any,
  chatId: number,
  period: TimePeriod,
  statsModel: StatsModel,
) {
  const chatStats = await statsModel.getChatStats(chatId, period);
  const formattedStats = statsModel.formatChatStats(chatStats);

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        period === "today" ? "✅ Сегодня" : "📅 Сегодня",
        `stats:today:${chatId}`,
      ),
      Markup.button.callback(
        period === "week" ? "✅ Неделя" : "📅 Неделя",
        `stats:week:${chatId}`,
      ),
    ],
    [
      Markup.button.callback(
        period === "month" ? "✅ Месяц" : "📅 Месяц",
        `stats:month:${chatId}`,
      ),
      Markup.button.callback(
        period === "all" ? "✅ Все время" : "📅 Все время",
        `stats:all:${chatId}`,
      ),
    ],
    [
      Markup.button.callback("🔍 Найти пользователя", `stats:search:${chatId}`),
      Markup.button.callback("👥 Список пользователей", `stats:list:${chatId}`),
    ],
  ]);

  await ctx.editMessageText(formattedStats, {
    parse_mode: "Markdown",
    ...keyboard,
  });

  await ctx.answerCbQuery();
}

export async function handleSearchUser(
  ctx: any,
  chatId: number,
  statsModel: StatsModel,
) {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("⬅️ Назад к статистике", `stats:back:${chatId}`)],
  ]);

  await ctx.editMessageText(
    "🔍 *Поиск пользователя*\n\n" +
      "Введите username или имя пользователя для поиска.\n" +
      "Примеры:\n" +
      "- `@username`\n" +
      "- `Иван`\n" +
      "- `Petrov`",
    {
      parse_mode: "Markdown",
      ...keyboard,
    },
  );

  ctx.session = ctx.session || {};
  ctx.session.waitingForSearch = { chatId, action: "search_user" };

  await ctx.answerCbQuery();
}

export async function handleUserList(
  ctx: any,
  chatId: number,
  statsModel: StatsModel,
) {
  try {
    const users = await statsModel.getAllChatUsers(chatId, 20);

    if (users.length === 0) {
      await ctx.editMessageText(
        "👥 *Список пользователей*\n\n" +
          "В этом чате еще нет сообщений от пользователей.",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("⬅️ Назад", `stats:back:${chatId}`)],
          ]),
        },
      );
      await ctx.answerCbQuery();
      return;
    }

    const userButtons = [];
    for (let i = 0; i < users.length; i += 2) {
      const row = [];
      for (let j = 0; j < 2 && i + j < users.length; j++) {
        const user = users[i + j];
        const name = user.username ? `@${user.username}` : `${user.first_name}`;
        const displayName =
          name.length > 15 ? name.substring(0, 12) + "..." : name;

        row.push(
          Markup.button.callback(
            `${i + j + 1}. ${displayName}`,
            `stats:select_user:${chatId}:${user.telegram_id}`,
          ),
        );
      }
      userButtons.push(row);
    }

    userButtons.push([
      Markup.button.callback("⬅️ Назад к статистике", `stats:back:${chatId}`),
    ]);

    const keyboard = Markup.inlineKeyboard(userButtons);

    let messageText = "👥 *Список пользователей*\n\n";
    users.forEach((user: any, index: number) => {
      const name = user.username
        ? `@${user.username}`
        : `${user.first_name}${user.last_name ? " " + user.last_name : ""}`;
      messageText += `${index + 1}. ${name} - ${user.message_count} сообщ.\n`;
    });

    await ctx.editMessageText(messageText, {
      parse_mode: "Markdown",
      ...keyboard,
    });

    await ctx.answerCbQuery();
  } catch (error) {
    console.error("Error showing user list:", error);
    await ctx.answerCbQuery("❌ Ошибка при загрузке списка");
  }
}

export async function handleSelectUser(
  ctx: any,
  chatId: number,
  callbackData: string,
  statsModel: StatsModel,
) {
  const userId = parseInt(callbackData.split(":")[3]);

  if (isNaN(userId)) {
    await ctx.answerCbQuery("❌ Ошибка: неверный ID пользователя");
    return;
  }

  try {
    const userStats = await statsModel.getUserStatsInChat(userId, chatId);
    const formattedStats = statsModel.formatUserStats(userStats);

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("⬅️ Назад к списку", `stats:list:${chatId}`)],
      [Markup.button.callback("📊 К общей статистике", `stats:all:${chatId}`)],
    ]);

    await ctx.editMessageText(formattedStats, {
      parse_mode: "Markdown",
      ...keyboard,
    });

    await ctx.answerCbQuery();
  } catch (error) {
    console.error("Error getting user stats:", error);
    await ctx.editMessageText(
      "❌ Не удалось получить статистику пользователя",
      Markup.inlineKeyboard([
        [Markup.button.callback("⬅️ Назад", `stats:list:${chatId}`)],
      ]),
    );
  }
}

export async function handleBackToStats(
  ctx: any,
  chatId: number,
  statsModel: StatsModel,
) {
  const chatStats = await statsModel.getChatStats(chatId, "all");
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
      Markup.button.callback("🔍 Найти пользователя", `stats:search:${chatId}`),
      Markup.button.callback("👥 Список пользователей", `stats:list:${chatId}`),
    ],
  ]);

  await ctx.editMessageText(formattedStats, {
    parse_mode: "Markdown",
    ...keyboard,
  });

  await ctx.answerCbQuery();
}
