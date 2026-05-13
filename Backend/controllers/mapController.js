import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const detectMedicineFromImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    const imageBuffer = fs.readFileSync(req.file.path);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      "Identify the medicine name in this image.",
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: "image/jpeg",
        },
      },
    ]);

    const medicine = result.response.text().trim().split(" ")[0];
    res.json({ medicine });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
