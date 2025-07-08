import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getSoulReply } from "./soulChain.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided." });

  try {
    const reply = await getSoulReply(message);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed." });
  }
});

app.listen(PORT, () => {
  console.log(`🧠 SoulAI backend running at http://localhost:${PORT}`);
});
