import { Pool } from "pg";
import { Message } from "../types/types";

export class MessageModel {
  constructor(private pool: Pool) {}

  async create(message: Message): Promise<void> {
    const query = `
      INSERT INTO messages (chat_telegram_id, user_telegram_id, message_id, text)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `;

    await this.pool.query(query, [
      message.chat_telegram_id,
      message.user_telegram_id,
      message.message_id,
      message.text,
    ]);
  }

  async getLastUserMessages(
    userTelegramId: number,
    limit: number = 50,
  ): Promise<Message[]> {
    const query = `
    SELECT 
      m.text
    FROM messages m
    JOIN chats c ON m.chat_telegram_id = c.telegram_id
    JOIN users u ON m.user_telegram_id = u.telegram_id
    WHERE m.user_telegram_id = $1
    ORDER BY m.created_at DESC
    LIMIT $2
  `;

    const result = await this.pool.query(query, [userTelegramId, limit]);
    return result.rows;
  }
}
