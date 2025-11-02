import express from "express";
import { getCurrentUser, updateUserProfile, uploadProfileImage, deleteAccount, removeProfilePicture} from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import uploadProfilePic from "../middleware/updateProfilePic.js";


const router = express.Router();

router.put("/me", verifyToken, updateUserProfile);
router.post("/me/upload", verifyToken, uploadProfilePic.single("profilePicture"), uploadProfileImage);
router.get("/me", verifyToken, getCurrentUser);
router.delete("/me/profile-picture", verifyToken, removeProfilePicture);
router.delete("/me", verifyToken, deleteAccount);



export default router;
