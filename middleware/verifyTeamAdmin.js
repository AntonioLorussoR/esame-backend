import Team from "../models/Team.js";
import mongoose from "mongoose";

export const verifyTeamAdmin = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "ID del team mancante o non valido" });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    if (!Array.isArray(team.members)) {
      return res.status(500).json({ message: "Struttura membri non valida" });
    }

    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Utente non autenticato o ID non valido" });
    }

    const isAdmin = team.members.some(m =>
      String(m.user?._id || m.user) === String(userId) && (m.role === "Admin" || m.role === "Creator")
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Accesso negato: solo gli admin del team possono eseguire questa azione" });
    }

    next();
  } catch (err) {
    console.error("❌ Errore verifyTeamAdmin:", err);
    res.status(500).json({ message: "Errore del server" });
  }
};
