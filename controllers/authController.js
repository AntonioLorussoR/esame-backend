import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Registrazione utente con login già effettuato dopo la registrazione
export const registerUser = async (req, res) => {
  try {
    const { nomeUtente, cognomeUtente, email, password } = req.body;
    if (!nomeUtente || !cognomeUtente || !email || !password) {
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
    }
    const emailPulita = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailPulita });
    if (existingUser) {
      return res.status(400).json({ message: "Email già registrata" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      nomeUtente,
      cognomeUtente,
      email: emailPulita,
      password: hashedPassword,
      profilePicture : null,
    });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: emailPulita },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(201).json({
      message: "Registrazione completata con successo",
      token,
      user: {
        id: newUser._id,
        nomeUtente: newUser.nomeUtente,
        cognomeUtente: newUser.cognomeUtente,
        email: newUser.email,
        profilePicture : null,
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({ message: "Email già registrata" });
    }
    console.error("❌ Errore nella registrazione:", error);
    res.status(500).json({ message: "Errore del server o del database" });
  }
};

// Login utente
export const loginUser = async (req, res) => {
  try {
    const emailPulita = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const user = await User.findOne({ email: emailPulita });
    if (!user) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenziali non valide" });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({
      message: "Login effettuato con successo",
      token,
      user: {
        id: user._id,
        nomeUtente: user.nomeUtente,
        cognomeUtente: user.cognomeUtente,
        email: user.email,
        profilePicture : (user.profilePicture
        ? `${process.env.API_BASE_URL}/uploads/profilePics/${user.profilePicture}`
        : null),
      },
    });
  } catch (error) {
    console.error("Errore nel login:", error);
    res.status(500).json({ message: "Errore del server" });
  }
};
