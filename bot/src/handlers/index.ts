import { Telegraf } from "telegraf";

import { StatsModel } from "../models/StatsModel";
import { pool } from "../services/postgre.service";
import { ChatModel, MessageModel, UserModel } from "../models";
import { setupCommandHandlers } from "./command.handler";
import { setupCallbackHandlers } from "./callback.handler";
import { setupMessageHandlers } from "./message.handler";

export interface BotSession {
  waitingForSearch?: {
    chatId: number;
    action: "search_user";
  };
}

export type MyContext = any & {
  session: BotSession;
};

export async function setupHandlers(bot: Telegraf<MyContext>) {
  console.log("🔄 Регистрируем обработчики...");

  // Инициализируем модели
  const statsModel = new StatsModel(pool);
  const userModel = new UserModel(pool);
  const chatModel = new ChatModel(pool);
  const messageModel = new MessageModel(pool);

  // Настраиваем обработчики
  setupCommandHandlers(bot, statsModel);
  setupCallbackHandlers(bot, statsModel);
  setupMessageHandlers(bot, statsModel, userModel, chatModel, messageModel);
}
