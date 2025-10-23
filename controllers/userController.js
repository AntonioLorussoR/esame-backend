import User from "../models/User.js";
import Team from "../models/Team.js";

import dotenv from "dotenv";
dotenv.config();

const API_BASE = process.env.API_BASE_URL;


//Recupera utente corrente
export const getCurrentUser = async (req, res) => {
  try {
    const utente = await User.findById(req.user.id).select("-password");
    if (!utente) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    res.json(utente);
  } catch (err) {
    console.error("Errore getCurrentUser:", err);
    res.status(500).json({ message: "Errore server" });
  }
};

//Aggiorna profilo
export const updateUserProfile = async (req, res) => {
  try {
    const { address, cap, city } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { address, cap, city },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    res.json({
      address: user.address,
      cap: user.cap,
      city: user.city,
    });
  } catch (err) {
    console.error("Errore aggiornamento profilo:", err);
    res.status(500).json({ message: "Errore durante l'aggiornamento del profilo" });
  }
};

// Upload immagine profilo
export const uploadProfileImage = async (req, res) => {
  try {
    const imageUrl = `${API_BASE}/uploads/profilePics/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: imageUrl },
      { new: true }
    );

    res.json({ profilePicture: user.profilePicture });
  } catch (err) {
    console.error("Errore upload immagine:", err);
    res.status(500).json({ message: "Errore durante l'upload della foto" });
  }
};

//Elimina foto profilo
export const removeProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    user.profilePicture = null;
    await user.save();

    res.json({ message: "Foto profilo rimossa" });
  } catch (err) {
    console.error("Errore rimozione foto profilo:", err);
    res.status(500).json({ message: "Errore interno del server" });
  }
};


//Elimina account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Rimuovi l'utente dai team dove è membro
    await Team.updateMany(
      {},
      { $pull: { members: { user: userId } } }
    );

    // Elimina i team dove l'utente è l'unico admin
    await Team.deleteMany({
      members: { $size: 1 },
      "members.0.user": userId,
      "members.0.role": "Admin"
    });

    // Elimina l'utente
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account eliminato con successo" });
  } catch (err) {
    console.error("❌ Errore eliminazione account:", err);
    res.status(500).json({ message: "Errore durante l'eliminazione dell'account" });
  }
};
