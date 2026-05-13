import express from "express";
import multer from "multer";
import { detectMedicineFromImage } from "../controllers/mapController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/detect-medicine", upload.single("image"), detectMedicineFromImage);

export default router;
