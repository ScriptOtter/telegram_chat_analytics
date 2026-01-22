import { session, Telegraf } from "telegraf";
import dotenv from "dotenv";
import { setupHandlers } from "./handlers";

dotenv.config();

export async function initializeTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  bot.use(
    session({
      defaultSession: () => ({}),
    }),
  );

  bot.use(async (ctx, next) => {
    await next();
  });

  await setupHandlers(bot);

  console.log("🚀 Бот запущен...");
  bot.launch();

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
