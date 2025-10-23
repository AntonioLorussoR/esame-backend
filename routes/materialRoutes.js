import express from "express";
import upload from "../middleware/upload.js";
import { uploadMaterial, getMaterials } from "../controllers/materialController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { deleteMaterial } from "../controllers/materialController.js";

const router = express.Router();

router.post("/:teamId/materials", verifyToken, upload.single("file"), uploadMaterial);
router.get("/teams/:teamId/materials", verifyToken, getMaterials);
router.post("/teams/:teamId/materials", verifyToken, upload.single("file"), uploadMaterial);
router.delete("/materials/:materialId", verifyToken, deleteMaterial);

export default router;
