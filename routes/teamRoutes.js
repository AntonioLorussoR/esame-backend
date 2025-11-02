import express from "express";
import mongoose from "mongoose";
import Team from "../models/Team.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { verifyTeamAdmin } from "../middleware/verifyTeamAdmin.js";


import {
  getTeams,
  createTeam,
  joinTeamByCode,
  updateTeamDescription,
  deleteTeam,
  makeAdmin,
  getPosts,
  addPost,
  deletePost,
  updateTelegramInvite,
  removeMember
} from "../controllers/teamController.js";

const router = express.Router();

router.get("/", verifyToken, getTeams);
router.post("/", verifyToken, createTeam);
router.post("/join", verifyToken, joinTeamByCode);
router.put("/:teamId/description", verifyToken, verifyTeamAdmin, updateTeamDescription);
router.put("/:teamId/admin/:memberId", verifyToken, verifyTeamAdmin, makeAdmin);
router.get("/:teamId/posts", verifyToken, getPosts);
router.post("/:teamId/posts", verifyToken, verifyTeamAdmin, addPost);

router.delete(
  "/:teamId/posts/:postId",
  verifyToken,
  (req, res, next) => {
    req.teamId = req.params.teamId;
    next();
  },
  verifyTeamAdmin,
  deletePost
);

router.delete(
  "/:teamId",
  verifyToken,
  (req, res, next) => {
    req.teamId = req.params.teamId;
    next();
  },
  verifyTeamAdmin,
  deleteTeam
);

router.put("/:id/description", verifyToken, async (req, res) => {
  try {
    const { description } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { description },
      { new: true }
    );
    res.json(team);
  } catch (err) {
    console.error("Errore salvataggio descrizione:", err);
    res.status(500).json({ message: "Errore nel salvataggio della descrizione" });
  }
});

router.delete("/:id/leave", verifyToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const teamId = req.params.id;

    const result = await Team.updateOne(
      { _id: teamId },
      { $pull: { members: { user: userId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Utente non trovato nel team" });
    }

    res.json({ message: "Hai abbandonato il team" });
  } catch (err) {
    console.error("Errore abbandono team:", err);
    res.status(500).json({ message: "Errore durante l'abbandono del team" });
  }
});


router.delete("/:teamId/members/:memberId", verifyToken, verifyTeamAdmin, removeMember);

router.get("/:teamId/messages", verifyToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate({
      path: "chat",
      populate: { path: "author", select: "nomeUtente email" },
    });

    if (!team) return res.status(404).json({ message: "Team non trovato" });

    res.json(team.chat);
  } catch (err) {
    console.error("Errore nel recupero messaggi:", err);
    res.status(500).json({ message: "Errore interno server" });
  }
});

router.post("/:id/telegram", verifyToken, async (req, res) => {
  try {
    const { chatId, telegramLink } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).send("Team non trovato");

    team.telegramChatId = chatId;
    team.telegramInviteLink = telegramLink;
    await team.save();

    if (team.telegramChatId) {
      const message = `📢 *Nuovo annuncio nel team ${team.nome}*\n${req.body.content}\n👤 Autore: ${user.nomeUtente} ${user.cognomeUtente}`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: team.telegramChatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });
    }

    res.status(200).send("Collegamento Telegram salvato");
  } catch (err) {
    console.error(err);
    res.status(500).send("Errore server");
  }
});

router.put("/:teamId/telegram-invite", verifyToken, updateTelegramInvite);


export default router;
