import { Context } from "telegraf";

export interface BotSession {
  waitingForSearch?: {
    chatId: number;
    action: "search_user";
  };
}

export interface MyContext extends Context {
  session: BotSession;
}
export interface StatsCallbackData {
  action: string;
  chatId: number;
  userId?: number;
}
