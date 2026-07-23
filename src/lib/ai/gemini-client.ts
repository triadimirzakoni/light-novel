// src/lib/ai/gemini-client.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BASE_SYSTEM_PROMPT, QC_SYSTEM_PROMPT,REVISION_SYSTEM_PROMPT } from "./prompts";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.warn("API Key Gemini tidak ditemukan. Pastikan file .env.local atau Vercel Environment Variables sudah disetting.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function streamProse(
  draft: string, 
  loreContext: string, 
  previousProse: string, // Parameter untuk memori cerita sebelumnya
  onChunk: (text: string) => void
) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: BASE_SYSTEM_PROMPT + "\n" + loreContext,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
      },
    });

    // Meracik Prompt Pintar agar AI tahu harus menyambung cerita, bukan mengulang
    let finalPrompt = "";
    if (previousProse.trim()) {
      // Kita ambil 3000 karakter terakhir dari cerita agar AI tahu konteks adegan terakhir
      const contextText = previousProse.slice(-3000); 
      finalPrompt = `[PREVIOUS STORY CONTEXT - DO NOT REWRITE THIS, JUST READ FOR FLOW AND CONTINUITY]:\n${contextText}\n\n---\n\n[NEW BEAT TO EXPAND AND CONTINUE]:\n${draft}`;
    } else {
      finalPrompt = `[NEW BEAT TO EXPAND]:\n${draft}`;
    }

    const result = await model.generateContentStream(finalPrompt);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      onChunk(chunkText);
    }
  } catch (error) {
    console.error("Gagal melakukan Forge Prose:", error);
    onChunk("\n\n[ERROR: Gagal menghubungi The Forge. Cek koneksi atau API Key.]");
  }
}

export async function runLogicQC(draft: string, loreContext: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: QC_SYSTEM_PROMPT + "\n" + loreContext,
      generationConfig: {
        temperature: 0.1, 
      },
    });

    const response = await model.generateContent(`Draft to analyze:\n${draft}`);
    return response.response.text();
  } catch (error) {
    console.error("Gagal melakukan QC:", error);
    return "Error: Lorekeeper agent is currently sleeping.";
  }
}
// Fungsi Baru untuk Fitur Revisi Ahli
export async function streamRevision(
  proseToRevise: string, 
  loreContext: string, 
  onChunk: (text: string) => void
) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash", // Tetap pakai Flash karena kuat untuk text processing panjang
      systemInstruction: REVISION_SYSTEM_PROMPT + "\n" + loreContext,
      generationConfig: {
        temperature: 0.6, // Suhu diturunkan sedikit agar AI lebih fokus mengedit daripada mengkhayal
        topP: 0.9,
      },
    });

    const result = await model.generateContentStream(`[PROSE TO REVISE AND POLISH]:\n${proseToRevise}`);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      onChunk(chunkText);
    }
  } catch (error) {
    console.error("Gagal melakukan Revisi:", error);
    onChunk("\n\n[ERROR: Gagal menghubungi The Editors Panel. Cek koneksi atau limit.]");
  }
}