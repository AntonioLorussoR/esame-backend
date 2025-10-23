import Material from "../models/Material.js";
import Team from "../models/Team.js";
import fs from "fs";
import path from "path";

// Upload di un materiale
export const uploadMaterial = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "Nessun file ricevuto" });

    const material = new Material({
      team: teamId,
      name: file.originalname,
      url: `/uploads/contentShared/${file.filename}`,
    });

    await material.save();
    res.status(201).json(material);
  } catch (err) {
    console.error("Errore upload:", err);
    res.status(500).json({ message: "Errore durante l'upload" });
  }
};

// Recupero dei materiali di un team
export const getMaterials = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const materials = await Material.find({ team: teamId }).sort({ date: -1 });
    res.json(materials);
  } catch {
    res.status(500).json({ message: "Errore nel recupero dei materiali" });
  }
};

// Eliminazione di un materiale (può essere effettuata solo da admin o creatore)
export const deleteMaterial = async (req, res) => {
  try {
    const materialId = req.params.materialId;
    const userId = req.user.id;

    const material = await Material.findById(materialId);
    if (!material) return res.status(404).json({ message: "Materiale non trovato" });

    const team = await Team.findById(material.team);
    if (!team) return res.status(404).json({ message: "Team non trovato" });

    const isAdmin = team.members.some(
      (m) => String(m.user) === String(userId) && (m.role === "Admin" || m.role === "Creator")
    );
    if (!isAdmin) return res.status(403).json({ message: "Solo gli admin possono eliminare materiali" });

    const filePath = path.join("uploads", "contentShared", path.basename(material.url));
    fs.unlink(filePath, (err) => {
      if (err) console.warn("File non trovato o già rimosso:", filePath);
    });

    await Material.findByIdAndDelete(materialId);
    res.json({ message: "Materiale eliminato" });
  } catch (err) {
    console.error("Errore eliminazione materiale:", err);
    res.status(500).json({ message: "Errore interno server" });
  }
};
