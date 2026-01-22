export interface User {
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Chat {
  telegram_id: number;
  title?: string;
  type: string; // 'private', 'group', 'supergroup', 'channel'
  created_at?: Date;
  updated_at?: Date;
}

export interface Message {
  chat_telegram_id: number;
  user_telegram_id: number;
  message_id: number;
  text: string;
}

export interface UserStats {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  message_count: number;
}

export interface ChatStats {
  chat_telegram_id: number;
  total_messages: number;
  total_users: number;
  top_users: UserStats[];
  period: TimePeriod;
  generated_at: Date;
}

export interface UserChatStats {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  total_messages: number;
  messages_by_period: {
    today: number;
    week: number;
    month: number;
    all: number;
  };
  rank: number;
  join_date: Date;
  last_message_date: Date;
}

export type TimePeriod = "today" | "week" | "month" | "all";
