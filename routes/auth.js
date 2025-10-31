import express from "express";
import { registerUser, loginUser} from "../controllers/authController.js";
import { getCurrentUser } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

import dotenv from "dotenv";
dotenv.config();

// Configurazione multer per upload immagini profilo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profilePics");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

const upload = multer({ storage });


router.post("/register", registerUser);


router.post("/login", loginUser);


router.get("/me", verifyToken, getCurrentUser);


router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token mancante" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token: newAccessToken });
  } catch (err) {
    console.error("❌ Errore nel refresh:", err.message);
    res.status(403).json({ message: "Refresh token non valido" });
  }
});


router.get(
  "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        const token = jwt.sign(
          {
            _id: req.user._id,
            email: req.user.email,
            nomeUtente: req.user.nomeUtente,
            cognomeUtente: req.user.cognomeUtente,
          },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
      
      const refreshToken = jwt.sign(
        { id: req.user._id, email: req.user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

  res.redirect(`${process.env.FRONTEND_REDIRECT_URL}?token=${token}`);
}

);


export default router;
