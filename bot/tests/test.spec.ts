import { describe, it, expect, vi, beforeEach } from "vitest";
import { Pool } from "pg";
import { ChatModel, MessageModel } from "../src/models";
import { Chat, Message } from "../src/types/types";

describe("ChatModel", () => {
  let chatModel: ChatModel;
  let messageModel: MessageModel;
  let mockPool: any;

  beforeEach(() => {
    // Создаем мок для pool
    mockPool = {
      query: vi.fn(),
    };
    chatModel = new ChatModel(mockPool);
    messageModel = new MessageModel(mockPool);
  });

  describe("createOrUpdate", () => {
    it("должен вызывать запрос с правильными параметрами для вставки", async () => {
      const chat: Chat = {
        telegram_id: 12345,
        title: "Test Chat",
        type: "group",
      };

      mockPool.query.mockResolvedValueOnce({});

      await chatModel.createOrUpdate(chat);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO chats"),
        [12345, "Test Chat", "group"],
      );
    });

    it("должен обрабатывать ошибку при вставке", async () => {
      const chat: Chat = {
        telegram_id: 12345,
        title: "Test Chat",
        type: "group",
      };

      const error = new Error("Database error");
      mockPool.query.mockRejectedValueOnce(error);

      await expect(chatModel.createOrUpdate(chat)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("isChatExists", () => {
    it("должен возвращать true, если чат существует", async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await chatModel.isChatExists(12345);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT * FROM chats WHERE telegram_id = $1",
        [12345],
      );
    });

    it("должен возвращать false, если чат не существует", async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await chatModel.isChatExists(99999);

      expect(result).toBe(false);
    });

    it("должен обрабатывать ошибку базы данных", async () => {
      mockPool.query.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(chatModel.isChatExists(12345)).rejects.toThrow(
        "Connection failed",
      );
    });
  });

  describe("create", () => {
    it("должен создавать сообщение с правильными параметрами", async () => {
      const message: Message = {
        chat_telegram_id: 100,
        user_telegram_id: 200,
        message_id: 300,
        text: "Hello, world!",
      };

      mockPool.query.mockResolvedValueOnce({});

      await messageModel.create(message);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO messages"),
        [100, 200, 300, "Hello, world!"],
      );
    });

    it("должен обрабатывать конфликт (ON CONFLICT DO NOTHING)", async () => {
      const message: Message = {
        chat_telegram_id: 100,
        user_telegram_id: 200,
        message_id: 300,
        text: "Hello, world!",
      };

      mockPool.query.mockResolvedValueOnce({});

      await expect(messageModel.create(message)).resolves.not.toThrow();
    });

    it("должен обрабатывать ошибку при вставке сообщения", async () => {
      const message: Message = {
        chat_telegram_id: 100,
        user_telegram_id: 200,
        message_id: 300,
        text: "Hello, world!",
      };

      mockPool.query.mockRejectedValueOnce(new Error("Insert failed"));

      await expect(messageModel.create(message)).rejects.toThrow(
        "Insert failed",
      );
    });
  });

  describe("getLastUserMessages", () => {
    it("должен возвращать сообщения пользователя с лимитом по умолчанию", async () => {
      const mockMessages = [{ text: "Message 1" }, { text: "Message 2" }];

      mockPool.query.mockResolvedValueOnce({ rows: mockMessages });

      const result = await messageModel.getLastUserMessages(200);

      expect(result).toEqual(mockMessages);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [200, 50],
      );
    });

    it("должен возвращать сообщения пользователя с кастомным лимитом", async () => {
      const mockMessages = [{ text: "Message 1" }];

      mockPool.query.mockResolvedValueOnce({ rows: mockMessages });

      const result = await messageModel.getLastUserMessages(200, 10);

      expect(result).toEqual(mockMessages);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [200, 10],
      );
    });

    it("должен возвращать пустой массив, если сообщений нет", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await messageModel.getLastUserMessages(999);

      expect(result).toEqual([]);
    });

    it("должен обрабатывать ошибку при получении сообщений", async () => {
      mockPool.query.mockRejectedValueOnce(new Error("Query failed"));

      await expect(messageModel.getLastUserMessages(200)).rejects.toThrow(
        "Query failed",
      );
    });

    it("должен возвращать только текстовые поля", async () => {
      const mockMessages = [
        { text: "Message 1" },
        { text: "Message 2" },
        { text: "Message 3" },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockMessages });

      const result = await messageModel.getLastUserMessages(200, 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("text");
      expect(result[0]).not.toHaveProperty("message_id");
      expect(result[0]).not.toHaveProperty("chat_telegram_id");
    });
  });
});
