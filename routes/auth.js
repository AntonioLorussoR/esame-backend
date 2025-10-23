import express from "express";
import { registerUser, loginUser} from "../controllers/authController.js";
import { getCurrentUser } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = express.Router();

// 📁 Configurazione multer per upload immagini profilo
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

// 🔐 Registrazione
router.post("/register", registerUser);

// 🔑 Login
router.post("/login", loginUser);

// 👤 Dati utente corrente
router.get("/me", verifyToken, getCurrentUser);

//Oauth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

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
          { expiresIn: "1d" }
        );

  res.redirect(`http://localhost:5173/oauth-success?token=${token}`);
}

);


export default router;
