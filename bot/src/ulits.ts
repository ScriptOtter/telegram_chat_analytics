import { MessageModel, UserModel } from "./models";
import { pool } from "./services/postgre.service";
import { analyzeMessages } from "./services/gemini.service";
import { Message } from "./types/types";

export async function convertMessagesInString(
  targetUserId: number,
): Promise<string> {
  const messageModel = new MessageModel(pool);
  const array = await messageModel.getLastUserMessages(targetUserId!);
  const messages = array.reduce((acc: string, el: Message) => {
    return acc + " " + el.text;
  }, "");

  return analyzeMessages(messages) ?? "Не удалось проанализировать";
}

export async function analyzeUserByUsername(username: string) {
  const userModel = new UserModel(pool);
  const id = await userModel.getTelegramIdByUsername(username);

  const messages = await convertMessagesInString(id);
  return await analyzeMessages(messages);
}
