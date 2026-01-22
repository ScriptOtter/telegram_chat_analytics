import { Pool } from "pg";
import { User } from "../types/types";

export class UserModel {
  constructor(private pool: Pool) {}

  async createOrUpdate(user: User): Promise<void> {
    const query = `
      INSERT INTO users (telegram_id, username, first_name, last_name, language_code)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (telegram_id) 
      DO UPDATE SET 
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        language_code = EXCLUDED.language_code,
        created_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.pool.query(query, [
      user.telegram_id,
      user.username,
      user.first_name,
      user.last_name,
      user.language_code,
    ]);
  }

  async getTelegramIdByUsername(username: string): Promise<number> {
    const query = `
    SELECT telegram_id 
    FROM users 
    WHERE username = $1
    LIMIT 1
  `;

    const result = await this.pool.query(query, [username]);
    return result.rows[0].telegram_id;
  }
}
