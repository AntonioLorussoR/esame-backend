import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import session from "express-session";
import passport from "passport";
import "./passport.js";

import { verifyToken } from "./middleware/authMiddleware.js";
import userRoutes from "./routes/user.js";
import teamRoutes from "./routes/teamRoutes.js";
import authRoutes from "./routes/auth.js";
import materialRoutes from "./routes/materialRoutes.js";
import telegramRoutes from "./routes/telegram.js";

import Team from "./models/Team.js";
import Message from "./models/Message.js";

import sendTelegramMessage from "./utils/sendTelegramMessage.js";
dotenv.config();

const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];


const app = express();
const server = http.createServer(app);

// ✅ Configurazione Socket.IO con CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});


// ✅ Esporta Socket.IO per usarlo altrove
export { io };

// ✅ Middleware CORS e JSON


app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));


// ✅ Connessione a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connesso"))
  .catch((err) => console.error("❌ Errore MongoDB:", err));

// ✅ Sessione e Passport PRIMA delle route
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ✅ Monta le route
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", verifyToken, teamRoutes);
app.use("/api", materialRoutes);
app.use("/api/telegram", telegramRoutes);

// ✅ Static files
app.use("/uploads/profilePics", express.static("uploads/profilePics"));
app.use("/uploads/contentShared", express.static("uploads/contentShared"));



io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id || decoded.id || decoded.userId || decoded.sub;
    if (!userId) {
      console.warn("Token decodificato ma senza ID:", decoded);
      return next(new Error("Token non contiene ID utente"));
    }
    socket.user = { id: userId, ...decoded };
    next();
  } catch (err) {
    console.error("❌ Errore nel decoding del token:", err.message);
    next(new Error("Token non valido"));
  }
});





// ✅ Socket.IO eventi
io.on("connection", (socket) => {
  socket.on("joinTeam", (teamId) => socket.join(teamId));

  //Invio annunci bacheca
  socket.on("sendMessage", async ({ teamId, content }) => {
  const userId = socket.user.id;
  try {
    const message = await Message.create({
      content,
      author: userId,
      team: teamId,
      date: new Date(),
    });
    await Team.findByIdAndUpdate(teamId, { $push: { chat: message._id } });
    const populated = await Message.findById(message._id).populate("author", "nomeUtente cognomeUtente email");

    //Invia il messaggio via Socket.IO al frontend
    io.to(teamId).emit("chatMessage", populated);

    //Invia il messaggio anche su Telegram (se il team è collegato)
    const team = await Team.findById(teamId);
    if (team?.telegramChatId) {
      const autore = populated.author?.nomeUtente || "Un membro del team";
      const testoTelegram = `💬 Nuovo messaggio da ${autore}:\n${content}`;
      await sendTelegramMessage(team.telegramChatId, testoTelegram);
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

      if (!team) return callback([]);
      callback(team.chat);
    } catch (err) {
      console.error("Errore nel recupero messaggi:", err);
      callback([]);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server attivo su porta ${PORT}`));
