import express from "express";
import { getCurrentUser, updateUserProfile, uploadProfileImage, deleteAccount, removeProfilePicture} from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { registerUser, loginUser } from "../controllers/authController.js";
import uploadProfilePic from "../middleware/updateProfilePic.js";


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/me", verifyToken, updateUserProfile);
router.post("/me/upload", verifyToken, uploadProfilePic.single("profilePicture"), uploadProfileImage);
router.get("/me", verifyToken, getCurrentUser);
router.delete("/me/profile-picture", verifyToken, removeProfilePicture);
router.delete("/me", verifyToken, deleteAccount);

router.get("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "Token mancante" });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Refresh token non valido" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });
  res.status(200).json({ message: "Logout effettuato" });
});


export default router;
