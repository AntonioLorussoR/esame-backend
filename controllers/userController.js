import User from "../models/User.js";
import Team from "../models/Team.js";

import dotenv from "dotenv";
dotenv.config();


//Recupera utente corrente
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
    }
    res.json({
      id: user._id,
      nomeUtente: user.nomeUtente,
      cognomeUtente: user.cognomeUtente,
      email: user.email,
      address: user.address,
      cap: user.cap,
      city: user.city,
      profilePicture: user.profilePicture
    });
    
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
    res.status(500).json({ message: "Errore durante l'aggiornamento del profilo" });
  }
};

// Upload immagine profilo
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Nessun file caricato" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    if (!user.profilePicture) {
      user.profilePicture = { data: null, contentType: "" };
    }

    user.profilePicture.data = req.file.buffer;
    user.profilePicture.contentType = req.file.mimetype;

    await user.save();

    res.json({ message: "Foto profilo aggiornata!" });
  } catch (err) {
    console.error("Errore upload foto:", err);
    res.status(500).json({ message: "Errore upload foto" });
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

    // Elimina i team dove l'utente è il creator
    await Team.deleteMany({
      "members.0.user": userId,
      "members.0.role": "Creator"
    });

    // Elimina l'utente
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account eliminato con successo" });
  } catch (err) {
    res.status(500).json({ message: "Errore durante l'eliminazione dell'account" });
  }
};
