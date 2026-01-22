import { Pool } from "pg";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function initializeTables() {
  const query = await pool.query(`SELECT COUNT(*) = 3 AS result
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('chats', 'messages', 'users');`);
  if (!query.rows[0].result) {
    const sqlFilePath = path.join(process.cwd(), "migrations", "init.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");
    await pool.query(sqlContent);
  }
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export async function initializeDatabase() {
  try {
    console.log(`Connecting to database...`);
    const start = Date.now();
    await pool.query("SELECT NOW()");
    console.log(
      `✅ Successfully connected to the database (ms=${Date.now() - start})`,
    );
    initializeTables();
    console.log("✅ The database was initialized successfully.");
  } catch (error) {
    console.error("❌ Error connecting to the database:", error);
    process.exit(1);
  }
}
