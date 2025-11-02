import express from "express";
import upload from "../middleware/upload.js";
import { uploadMaterial, getMaterials } from "../controllers/materialController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { deleteMaterial } from "../controllers/materialController.js";

const router = express.Router();

router.get(":teamId/materials", verifyToken, getMaterials);
router.post(":teamId/materials", verifyToken, upload.single("file"), uploadMaterial);
router.delete(":teamId/materials/:materialId", verifyToken, deleteMaterial);

export default router;
