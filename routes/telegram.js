import express from "express";
import Team from "../models/Team.js";
import sendTelegramMessage from "../utils/sendTelegramMessage.js";
import { io } from "../index.js"; // Assicurati che il path sia corretto

const router = express.Router();

// Verifica codice dal frontend
router.post("/verify", async (req, res) => {
  const { code } = req.body;
  const team = await Team.findOne({ telegramCode: code });
  if (!team) return res.status(404).json({ error: "Codice non valido" });
  res.json({ message: "Codice valido. Invia /accoppia nel gruppo Telegram." });
});

// Webhook Telegram
router.post("/webhook", async (req, res) => {
  const { message } = req.body;
  if (!message || !message.text || !message.chat || !message.chat.id) {
    console.log("❌ Messaggio non valido:", req.body);
    return res.sendStatus(200);
  }
  const chatId = message.chat.id;
  const chatTitle = message.chat.title || "Gruppo senza nome";
  const text = message.text.trim();

  //Comando /accoppia
  if (text.startsWith("/accoppia")) {
    const parts = text.split(" ");
    const code = parts[1];

    if (!code) {
      await sendTelegramMessage(chatId, "Devi specificare un codice. Es: /accoppia ABC123");
      return res.sendStatus(200);
    }

    const team = await Team.findOne({ telegramCode: code });

    if (team) {
      team.telegramChatId = chatId;
      team.telegramChatTitle = chatTitle;
      await team.save();

      //Emissione evento Socket.IO
      io.to(team._id.toString()).emit("telegramLinked", {
        chatId,
        title: chatTitle,
      });

      await sendTelegramMessage(chatId, `Collegamento riuscito con il team ${team.name}`);
    } else {
      await sendTelegramMessage(chatId, `Codice non valido. Riprova.`);
    }
  }

  res.sendStatus(200);
});

export default router;
