import { Pool } from "pg";
import {
  ChatStats,
  TimePeriod,
  UserChatStats,
  UserStats,
} from "../types/types";
import { RedisService } from "../services/redis.service";

export class StatsModel {
  private readonly redisService = new RedisService();
  constructor(private pool: Pool) {}
  private defaultExpiry: number = Number(process.env.REDIS_CACHE_TIME!);

  private generateCacheKey(prefix: string, ...args: any[]): string {
    return `stats:${prefix}:${args.join(":")}`;
  }

  /**
   * Получить интервал дат в зависимости от периода
   */
  private getDateInterval(period: TimePeriod, tableAlias: string = ""): string {
    const prefix = tableAlias ? `${tableAlias}.` : "";

    switch (period) {
      case "today":
        return `AND ${prefix}created_at::date = CURRENT_DATE`;
      case "week":
        return `AND ${prefix}created_at >= CURRENT_DATE - INTERVAL '7 days'`;
      case "month":
        return `AND ${prefix}created_at >= CURRENT_DATE - INTERVAL '30 days'`;
      case "all":
        return "";
      default:
        return "";
    }
  }

  async getTopUsersByChat(
    chatTelegramId: number,
    period: TimePeriod = "all",
    limit: number = 10,
  ): Promise<UserStats[]> {
    const cacheKey = this.generateCacheKey(
      "top",
      chatTelegramId,
      period,
      limit,
    );

    // Пробуем получить из кеша
    const cached = await this.redisService.getJson<UserStats[]>(cacheKey);
    if (cached) {
      console.log(`📊 Cache hit for top users: ${cacheKey}`);
      return cached;
    }

    console.log(`📊 Cache miss for top users: ${cacheKey}`);

    const dateFilter = this.getDateInterval(period, "m");

    const query = `
      SELECT 
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(m.id) as message_count
      FROM messages m
      JOIN users u ON m.user_telegram_id = u.telegram_id
      WHERE m.chat_telegram_id = $1
      ${dateFilter}
      GROUP BY u.telegram_id, u.username, u.first_name, u.last_name
      ORDER BY message_count DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [chatTelegramId, limit]);
    const users = result.rows;

    await this.redisService.setJson(cacheKey, users);

    return users;
  }

  async getChatStats(
    chatTelegramId: number,
    period: TimePeriod = "all",
    topLimit: number = 10,
  ): Promise<ChatStats> {
    const cacheKey = this.generateCacheKey(
      "chat",
      chatTelegramId,
      period,
      topLimit,
    );

    const cached = await this.redisService.getJson<ChatStats>(cacheKey);
    if (cached) {
      console.log(`📊 Cache hit for chat stats: ${cacheKey}`);
      return cached;
    }

    console.log(`📊 Cache miss for chat stats: ${cacheKey}`);

    const topUsers = await this.getTopUsersByChat(
      chatTelegramId,
      period,
      topLimit,
    );

    const totalMessagesQuery = `
      SELECT COUNT(*) as total_messages
      FROM messages
      WHERE chat_telegram_id = $1
      ${this.getDateInterval(period)}  
    `;

    const totalUsersQuery = `
      SELECT COUNT(DISTINCT user_telegram_id) as total_users
      FROM messages
      WHERE chat_telegram_id = $1
      ${this.getDateInterval(period)}  
    `;

    const [messagesResult, usersResult] = await Promise.all([
      this.pool.query(totalMessagesQuery, [chatTelegramId]),
      this.pool.query(totalUsersQuery, [chatTelegramId]),
    ]);

    const chatStats: ChatStats = {
      chat_telegram_id: chatTelegramId,
      total_messages: parseInt(messagesResult.rows[0].total_messages) || 0,
      total_users: parseInt(usersResult.rows[0].total_users) || 0,
      top_users: topUsers,
      period: period,
      generated_at: new Date(),
    };

    await this.redisService.setJson(cacheKey, chatStats);

    return chatStats;
  }

  async getUserStatsInChat(
    userTelegramId: number,
    chatTelegramId: number,
  ): Promise<UserChatStats> {
    const cacheKey = this.generateCacheKey(
      "user",
      userTelegramId,
      chatTelegramId,
    );

    // Пробуем получить из кеша
    const cached = await this.redisService.getJson<UserChatStats>(cacheKey);
    if (cached) {
      console.log(`📊 Cache hit for user stats: ${cacheKey}`);
      return cached;
    }

    console.log(`📊 Cache miss for user stats: ${cacheKey}`);

    // Получаем основную информацию о пользователе
    const userQuery = `
      SELECT 
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        u.created_at as join_date
      FROM users u
      WHERE u.telegram_id = $1
    `;

    // Получаем статистику сообщений по периодам
    const statsQuery = `
      WITH user_messages AS (
        SELECT 
          COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as month,
          COUNT(*) as all_time,
          MAX(created_at) as last_message_date
        FROM messages
        WHERE user_telegram_id = $1 
          AND chat_telegram_id = $2
      )
      SELECT * FROM user_messages
    `;

    // Получаем позицию в рейтинге
    const rankQuery = `
      WITH user_ranks AS (
        SELECT 
          user_telegram_id,
          COUNT(*) as message_count,
          RANK() OVER (ORDER BY COUNT(*) DESC) as rank
        FROM messages
        WHERE chat_telegram_id = $1
        GROUP BY user_telegram_id
      )
      SELECT rank FROM user_ranks WHERE user_telegram_id = $2
    `;

    const [userResult, statsResult, rankResult] = await Promise.all([
      this.pool.query(userQuery, [userTelegramId]),
      this.pool.query(statsQuery, [userTelegramId, chatTelegramId]),
      this.pool.query(rankQuery, [chatTelegramId, userTelegramId]),
    ]);

    if (userResult.rows.length === 0) {
      throw new Error(`Пользователь с ID ${userTelegramId} не найден`);
    }

    const user = userResult.rows[0];
    const stats = statsResult.rows[0] || {
      today: 0,
      week: 0,
      month: 0,
      all_time: 0,
      last_message_date: null,
    };

    const userStats: UserChatStats = {
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      total_messages: parseInt(stats.all_time) || 0,
      messages_by_period: {
        today: parseInt(stats.today) || 0,
        week: parseInt(stats.week) || 0,
        month: parseInt(stats.month) || 0,
        all: parseInt(stats.all_time) || 0,
      },
      rank: rankResult.rows.length > 0 ? parseInt(rankResult.rows[0].rank) : 0,
      join_date: user.join_date,
      last_message_date: stats.last_message_date,
    };

    // Сохраняем в кеш на короткое время (так как статистика пользователя часто меняется)
    await this.redisService.setJson(cacheKey, userStats); // 2 минуты

    return userStats;
  }

  async findUsers(
    searchTerm: string,
    chatTelegramId?: number,
    limit: number = 10,
  ): Promise<UserStats[]> {
    const cacheKey = this.generateCacheKey(
      "search",
      chatTelegramId || "global",
      searchTerm.toLowerCase(),
      limit,
    );

    // Пробуем получить из кеша
    const cached = await this.redisService.getJson<UserStats[]>(cacheKey);
    if (cached) {
      console.log(`🔍 Cache hit for search: ${cacheKey}`);
      return cached;
    }

    console.log(`🔍 Cache miss for search: ${cacheKey}`);

    const searchPattern = `%${searchTerm}%`;

    let query: string;
    let params: any[];

    if (chatTelegramId) {
      query = `
        SELECT DISTINCT
          u.telegram_id,
          u.username,
          u.first_name,
          u.last_name,
          COUNT(m.id) as message_count
        FROM users u
        LEFT JOIN messages m ON u.telegram_id = m.user_telegram_id
          AND m.chat_telegram_id = $2
        WHERE (
          LOWER(u.username) LIKE LOWER($1) OR
          LOWER(u.first_name) LIKE LOWER($1) OR
          LOWER(u.last_name) LIKE LOWER($1)
        )
        AND EXISTS (
          SELECT 1 
          FROM messages 
          WHERE user_telegram_id = u.telegram_id 
          AND chat_telegram_id = $2
        )
        GROUP BY u.telegram_id, u.username, u.first_name, u.last_name
        ORDER BY message_count DESC
        LIMIT $3
      `;
      params = [searchPattern, chatTelegramId, limit];
    } else {
      query = `
        SELECT DISTINCT
          u.telegram_id,
          u.username,
          u.first_name,
          u.last_name,
          COUNT(m.id) as message_count
        FROM users u
        LEFT JOIN messages m ON u.telegram_id = m.user_telegram_id
        WHERE (
          LOWER(u.username) LIKE LOWER($1) OR
          LOWER(u.first_name) LIKE LOWER($1) OR
          LOWER(u.last_name) LIKE LOWER($1)
        )
        GROUP BY u.telegram_id, u.username, u.first_name, u.last_name
        ORDER BY message_count DESC
        LIMIT $2
      `;
      params = [searchPattern, limit];
    }

    const result = await this.pool.query(query, params);
    const users = result.rows;

    await this.redisService.setJson(cacheKey, users);

    return users;
  }

  async getAllChatUsers(
    chatTelegramId: number,
    limit: number = 50,
  ): Promise<UserStats[]> {
    const cacheKey = this.generateCacheKey("all-users", chatTelegramId, limit);

    // Пробуем получить из кеша
    const cached = await this.redisService.getJson<UserStats[]>(cacheKey);
    if (cached) {
      console.log(`👥 Cache hit for all users: ${cacheKey}`);
      return cached;
    }

    console.log(`👥 Cache miss for all users: ${cacheKey}`);

    const query = `
      SELECT 
        u.telegram_id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(m.id) as message_count
      FROM users u
      JOIN messages m ON u.telegram_id = m.user_telegram_id
      WHERE m.chat_telegram_id = $1
      GROUP BY u.telegram_id, u.username, u.first_name, u.last_name
      ORDER BY message_count DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [chatTelegramId, limit]);
    const users = result.rows;

    // Сохраняем в кеш
    await this.redisService.setJson(cacheKey, users);

    return users;
  }

  formatChatStats(stats: ChatStats): string {
    const { total_messages, total_users, top_users, period, generated_at } =
      stats;

    const periodNames = {
      today: "за сегодня",
      week: "за неделю",
      month: "за месяц",
      all: "за все время",
    };

    let message = `📊 *Статистика чата ${periodNames[period]}*\n\n`;

    // Топ пользователей
    if (top_users.length > 0) {
      message += "*Топ пользователей:*\n";
      top_users.forEach((user, index) => {
        const name = user.username
          ? `@${user.username}`
          : `${user.first_name}${user.last_name ? " " + user.last_name : ""}`.trim() ||
            "Неизвестный";
        const count = user.message_count.toLocaleString();
        message += `${index + 1}. ${name} - ${count} сообщ.\n`;
      });
    } else {
      message += "*Топ пользователей:*\nНет данных\n";
    }

    // Итоговая статистика
    message += `\n*Итоги:*\n`;
    message += `📝 Всего сообщений: ${total_messages.toLocaleString()}\n`;
    message += `👥 Уникальных пользователей: ${total_users}\n`;
    message += `🕐 Обновлено: ${generated_at.toLocaleString("ru-RU")}\n`;

    return message;
  }

  formatUserStats(stats: UserChatStats): string {
    const {
      username,
      first_name,
      last_name,
      total_messages,
      messages_by_period,
      rank,
      join_date,
      last_message_date,
    } = stats;

    const name = username
      ? `@${username}`
      : `${first_name}${last_name ? " " + last_name : ""}`.trim() ||
        "Неизвестный";

    let message = `👤 *Статистика пользователя ${name}*\n\n`;

    message += "*Активность по периодам:*\n";
    message += `📅 За сегодня: ${messages_by_period.today}\n`;
    message += `📅 За неделю: ${messages_by_period.week}\n`;
    message += `📅 За месяц: ${messages_by_period.month}\n`;
    message += `📅 Всего: ${total_messages.toLocaleString()}\n\n`;

    message += "*Дополнительно:*\n";
    message += `🏆 Место в рейтинге: ${rank}\n`;
    message += `📅 Дата регистрации: ${join_date.toLocaleDateString("ru-RU")}\n`;
    if (last_message_date) {
      message += `💬 Последнее сообщение: ${new Date(last_message_date).toLocaleString("ru-RU")}\n`;
    }

    return message;
  }
}
