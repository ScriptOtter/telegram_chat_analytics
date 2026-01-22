

CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  username VARCHAR(255),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  language_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
  telegram_id BIGINT PRIMARY KEY,
  title VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_telegram_id BIGINT NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  message_id BIGINT NOT NULL,
  text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chat_telegram_id, message_id),
  CONSTRAINT fk_messages_user 
    FOREIGN KEY (user_telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_chat 
    FOREIGN KEY (chat_telegram_id) REFERENCES chats(telegram_id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_user ON messages(user_telegram_id);
CREATE INDEX idx_messages_chat ON messages(chat_telegram_id);
