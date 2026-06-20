import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";

// Initialize environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Use JSON body parser with comfortable size limits for draft text
  app.use(express.json({ limit: "5mb" }));

  // Assistant AI endpoint
  app.post("/api/assistant", async (req, res) => {
    try {
      const { action, text, sourceLang, targetLang, tone, templateType, keyPoints } = req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "OPENAI_API_KEY is not configured. Please add it to your environment variables.",
        });
      }

      let prompt = "";
      let systemInstruction = "";

      if (action === "translate") {
        systemInstruction = `You are an elite, professional bilingual human translator specializing in Khmer and English.
Your goal is to output highly natural, accurate, and culturally appropriate translations.
- Do NOT translate literally word-for-word if it sounds unnatural. Maintain the exact professional tone of the source text.
- If translating to Khmer, use elegant, grammatically proper Khmer syntax (such as correct honorifics if context suggests, and standard formatting).
- Do NOT append any extra explanations, notes, metadata, or conversational filler. Only return the translated text itself.`;
        
        prompt = `Translate the following text from ${sourceLang === "km" ? "Khmer" : "English"} to ${targetLang === "km" ? "Khmer" : "English"}:\n\n${text}`;
      } 
      else if (action === "refine") {
        systemInstruction = `You are a high-level corporate bilingual proofreader and editor. Your task is to refine and polish user text while preserving its core message.
- For Khmer text, correct spelling mistakes, adjust punctuation spacing appropriately, and enhance flow using standard Cambodian administrative or business norms.
- For English text, elevate vocabulary, remove awkward phrasing, fix grammar, and style with professional writing standards.
- Maintain the original language of the text.
- Return ONLY the improved, polished content with no surrounding text, prefix remarks, or introductory notes.`;
        
        prompt = `Review, proofread, and professionally refine the following text:\n\n${text}`;
      }
      else if (action === "summarize") {
        systemInstruction = `You are a professional scribe. Summarize the provided document in the exact language it was written in (Khmer or English).
- Structure the summary with an overarching executive summary sentence, followed by a clean bulleted list of 3-5 core points.
- Ensure the terminology is elegant and highly clear.
- Return ONLY the summary, formatted as clean Markdown. No extra commentary.`;
        
        prompt = `Provide a concise, professional summary of the following document:\n\n${text}`;
      }
      else if (action === "template") {
        systemInstruction = `You are a professional documentation expert specializing in generating state-of-the-art office documents, corporate letters, and promotional texts.
- Output high-caliber formal text in BOTH English and Khmer side-by-side or clearly separated into Sections.
- Match requested corporate formats exactly (include placeholders for Date, Dear [Name], Address, etc.).
- Maintain pristine structure, spacing, and vocabulary.
- Return ONLY the formatted template content with no chatty introductory notes or postscripts.`;

        prompt = `Generate a professional dual-language template (in BOTH English and Khmer) for: "${templateType}".
Key details/points to include:
${keyPoints || "No specific details provided. Generate a generic high-quality corporate template."}

Format the output clearly separating:
--- ENGLISH VERSION ---
[Prised, polished English text]

--- KHMER VERSION (ភាសាខ្មែរ) ---
[Beautiful, proper Khmer text]`;
      }
      else if (action === "adjust-tone") {
        systemInstruction = `You are an executive communication coach. Rewrite the input text to match the requested tone: "${tone}" (Professional, Friendly/Casual, Direct, or Inspiring/Creative).
- Keep the original language of the input text (English or Khmer).
- Ensure the style fits corporate compliance and respectful business communication.
- Return ONLY the adjusted text. No conversational introductions.`;
        
        prompt = `Rewrite this text in a "${tone}" tone:\n\n${text}`;
      }
      else {
        return res.status(400).json({ error: "Invalid action requested" });
      }

      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: systemInstruction,
        input: prompt,
        temperature: 0.35,
      });

      const resultText = response.output_text || "";
      return res.json({ success: true, text: resultText });

    } catch (error: any) {
      console.error("OpenAI API Error in server:", error);
      return res.status(500).json({
        error: error.message || "An error occurred while communicating with the AI model.",
      });
    }
  });

  // Vite middleware and Fallbacks
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RTTC Attendance Portal running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
