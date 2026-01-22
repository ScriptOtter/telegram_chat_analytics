import { initializeTelegramBot } from "./bot";
import { initializeDatabase } from "./services/postgre.service";
import { Request, Response } from "express";
import express from "express";
import cors from "cors"; // Импортируем cors
import { analyzeUserByUsername } from "./ulits";
import { psychologicalPortraitByUsername } from "./services/gemini.service";

async function startBot() {
  await initializeDatabase();
  await initializeTelegramBot();
}
startBot();

const app = express();
const PORT = process.env.SERVER_PORT || 4001;

const router = express.Router();

app.use(cors({ origin: "*" }));

app.use(express.json());

router.get("/", (req, res) => {
  res.json({ message: "Telegram Chat Analytics API" });
});

app.use("/api", router);

app.post("/analyze", async (req: Request, res: Response) => {
  const analyse = await analyzeUserByUsername(req.body.username);
  res.json({ analysis: analyse });
});

app.post("/portrait", async (req: Request, res: Response) => {
  const portrait = await psychologicalPortraitByUsername(req.body.username);
  res.json({ portrait: portrait });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
