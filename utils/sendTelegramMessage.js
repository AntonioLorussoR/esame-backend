import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const sendTelegramMessage = async (chatId, text) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown", // puoi usare "HTML" se preferisci
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("❌ Errore invio messaggio Telegram:", data);
    }
  } catch (err) {
    console.error("❌ Errore fetch Telegram:", err);
  }
};

export default sendTelegramMessage;
