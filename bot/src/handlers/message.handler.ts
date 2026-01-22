import { Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { StatsModel } from "../models/StatsModel";
import { UserModel } from "../models/UserModel";
import { ChatModel } from "../models/ChatModel";
import { MessageModel } from "../models/MessageModel";
import { MyContext } from "./index";

export function setupMessageHandlers(
  bot: Telegraf<MyContext>,
  statsModel: StatsModel,
  userModel: UserModel,
  chatModel: ChatModel,
  messageModel: MessageModel,
) {
  bot.on("text", async (ctx) => {
    try {
      const session = ctx.session;

      if (
        session &&
        session.waitingForSearch &&
        session.waitingForSearch.action === "search_user"
      ) {
        await handleSearchResponse(ctx, statsModel);
        return;
      } else {
        await handleRegularMessage(ctx, userModel, chatModel, messageModel);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      await ctx.reply("❌ Произошла ошибка при обработке сообщения");
      if (ctx.session?.waitingForSearch) {
        delete ctx.session.waitingForSearch;
      }
    }
  });
}

async function handleSearchResponse(ctx: MyContext, statsModel: StatsModel) {
  const session = ctx.session!;
  const chatId = session.waitingForSearch!.chatId;
  const searchTerm = ctx.message.text!;

  if (ctx.chat.id !== chatId) {
    if (ctx.chat.type === "private") {
      await ctx.reply(
        `🔍 Вы начали поиск в групповом чате.\n\n` +
          `Пожалуйста, вернитесь в тот чат и напишите там имя пользователя для поиска.`,
      );
    }

    delete ctx.session.waitingForSearch;
    return;
  }

  const cleanSearchTerm = searchTerm.startsWith("@")
    ? searchTerm.substring(1)
    : searchTerm;

  const users = await statsModel.findUsers(cleanSearchTerm, chatId, 10);

  if (users.length === 0) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("⬅️ Назад", `stats:back:${chatId}`)],
    ]);

    await ctx.reply(
      `❌ Пользователи по запросу "${searchTerm}" не найдены.`,
      keyboard,
    );

    delete ctx.session.waitingForSearch;
    return;
  }

  const userButtons = [];
  for (let i = 0; i < users.length; i += 2) {
    const row = [];
    for (let j = 0; j < 2 && i + j < users.length; j++) {
      const user = users[i + j];
      const name = user.username
        ? `@${user.username}`
        : `${user.first_name || "Неизвестный"}`;
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

  let messageText = `🔍 *Результаты поиска: "${searchTerm}"*\n\n`;
  users.forEach((user, index) => {
    const name = user.username
      ? `@${user.username}`
      : `${user.first_name || "Неизвестный"}${user.last_name ? " " + user.last_name : ""}`;
    messageText += `${index + 1}. ${name} - ${user.message_count || 0} сообщ.\n`;
  });

  await ctx.replyWithMarkdown(messageText, keyboard);
  delete ctx.session.waitingForSearch;
}

async function handleRegularMessage(
  ctx: MyContext,
  userModel: UserModel,
  chatModel: ChatModel,
  messageModel: MessageModel,
) {
  const { message } = ctx;
  const sender = message.from!;
  const chat = message.chat;

  if ("entities" in message && message.entities) {
    const isCommand = message.entities.some(
      (entity: any) => entity.type === "bot_command",
    );
    if (isCommand) {
      return;
    }
  }

  if (chat.type !== "private") {
    try {
      await userModel.createOrUpdate({
        telegram_id: sender.id,
        username: sender.username,
        first_name: sender.first_name,
        last_name: sender.last_name,
        language_code: sender.language_code,
      });
    } catch (userError: any) {
      console.error("❌ Ошибка сохранения пользователя:", userError.message);
    }

    try {
      const chatExists = await chatModel.isChatExists(chat.id);
      if (!chatExists) {
        await chatModel.createOrUpdate({
          telegram_id: chat.id,
          title: chat.title,
          type: chat.type,
        });
        console.log("✅ Чат создан в БД");
      }
    } catch (chatError: any) {
      console.error("❌ Ошибка сохранения чата:", chatError.message);
    }

    if ("text" in message && message.text) {
      try {
        await messageModel.create({
          chat_telegram_id: chat.id,
          message_id: message.message_id,
          text: message.text,
          user_telegram_id: sender.id,
        });
        console.log("✅ Сообщение сохранено в БД");
      } catch (msgError: any) {
        console.error("❌ Ошибка сохранения сообщения:", msgError.message);
      }
    } else {
      console.log("📎 Не текстовое сообщение, текст не сохраняем");
    }
  } else {
    console.log("💬 Личное сообщение, не сохраняем в БД");
  }
}
