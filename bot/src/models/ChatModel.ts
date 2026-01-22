import { Pool } from "pg";
import { Chat } from "../types/types";

export class ChatModel {
  constructor(private pool: Pool) {}

  async createOrUpdate(chat: Chat): Promise<void> {
    const query = `
      INSERT INTO chats (telegram_id, title, type)
      VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id) 
      DO UPDATE SET 
        title = EXCLUDED.title,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [chat.telegram_id, chat.title, chat.type]);
  }

  async isChatExists(id: number): Promise<boolean> {
    const query = "SELECT * FROM chats WHERE telegram_id = $1";
    const result = !!(await this.pool.query(query, [id])).rowCount;
    return result;
  }
}
