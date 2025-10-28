import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import session from "express-session";
import passport from "passport";
import path from "path";

import "./passport.js";

import { verifyToken } from "./middleware/authMiddleware.js";
import userRoutes from "./routes/user.js";
import teamRoutes from "./routes/teamRoutes.js";
import authRoutes from "./routes/auth.js";
import materialRoutes from "./routes/materialRoutes.js";
import telegramRoutes from "./routes/telegram.js";

import Team from "./models/Team.js";
import Message from "./models/Message.js";
import User from "./models/User.js"; // IMPORT MANCANTE
import sendTelegramMessage from "./utils/sendTelegramMessage.js";

dotenv.config();

const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];
const app = express();
const server = http.createServer(app);

// Middleware JSON
app.use(express.json());

// Configurazione CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Connessione MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connesso"))
  .catch(err => console.error("❌ Errore MongoDB:", err));

// Sessione e Passport
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 },
}));
app.use(passport.initialize());
app.use(passport.session());

// Montaggio route
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", verifyToken, teamRoutes);
app.use("/api", materialRoutes);
app.use("/api/telegram", telegramRoutes);

// File statici con CORS
app.use("/uploads/contentShared", express.static("uploads/contentShared"));
app.use("/uploads/profilePics", express.static("uploads/profilePics"));

// Socket.IO
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
});
export { io };

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.id || decoded.userId || decoded.sub;
    if (!userId) return next(new Error("Token non contiene ID utente"));
    socket.user = { id: userId, ...decoded };
    next();
  } catch (err) {
    console.error("❌ Errore decoding token:", err.message);
    next(new Error("Token non valido"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinTeam", (teamId) => socket.join(teamId));

  socket.on("sendMessage", async ({ teamId, content }) => {
    const userId = socket.user.id;
    try {
      const message = await Message.create({ content, author: userId, team: teamId, date: new Date() });
      await Team.findByIdAndUpdate(teamId, { $push: { chat: message._id } });
      const populated = await Message.findById(message._id).populate("author", "nomeUtente cognomeUtente email");

      io.to(teamId).emit("chatMessage", populated);

      const team = await Team.findById(teamId);
      if (team?.telegramChatId) {
        const autore = populated.author?.nomeUtente || "Un membro del team";
        await sendTelegramMessage(team.telegramChatId, `💬 Nuovo messaggio da ${autore}:\n${content}`);
      }
    } catch (err) {
      console.error("Errore invio messaggio:", err);
    }
  });

  socket.on("getMessages", async (teamId, callback) => {
    try {
      const team = await Team.findById(teamId).populate({
        path: "chat",
        populate: { path: "author", select: "nomeUtente cognomeUtente email" },
      });
      callback(team ? team.chat : []);
    } catch (err) {
      console.error("Errore recupero messaggi:", err);
      callback([]);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server attivo su porta ${PORT}`));
