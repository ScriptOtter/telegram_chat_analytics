import Redis, { Redis as RedisType } from "ioredis";

export class RedisService {
  private client: RedisType;
  private defaultExpiry: number = Number(process.env.REDIS_CACHE_TIME!);

  constructor() {
    this.client = new Redis(process.env.REDIS_URL!, {
      retryStrategy: (times: any) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on("connect", () => {
      console.log(`Connecting to Redis...`);

      console.log(`✅ Successfully connected to Redis`);
    });

    this.client.on("error", (error: any) => {
      console.error("❌ Redis error:", error);
    });

    this.client.on("close", () => {
      console.log("🔌 Redis connection closed");
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error parsing JSON for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string | Buffer | number): Promise<boolean> {
    try {
      if (this.defaultExpiry > 0) {
        await this.client.setex(key, this.defaultExpiry, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async setJson(key: string, value: any): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString);
    } catch (error) {
      console.error(`Error setting JSON for key ${key}:`, error);
      return false;
    }
  }
}
