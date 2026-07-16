// src/lib/ai/gemini-client.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BASE_SYSTEM_PROMPT, QC_SYSTEM_PROMPT } from "./prompts";

// Ambil API Key dari .env.local
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  console.warn("API Key Gemini tidak ditemukan. Pastikan file .env.local sudah disetting.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

/**
 * ENGINE 1: The Prose Forge (Menggunakan Gemini 3.5 Flash)
 * Fungsi ini menggunakan fitur Streaming agar teks muncul kata per kata (seperti ChatGPT).
 */
export async function streamProse(draft: string, loreContext: string, onChunk: (text: string) => void) {
  try {
    // Inisialisasi model dengan System Instruction terbaru
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction: BASE_SYSTEM_PROMPT + "\n" + loreContext,
      generationConfig: {
        temperature: 0.7, // 0.7 cukup seimbang antara kreatif dan konsisten
        topP: 0.9,
      },
    });

    const result = await model.generateContentStream(draft);
    
    // Looping melalui stream dan mengirim tiap kata ke UI
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      onChunk(chunkText);
    }
  } catch (error) {
    console.error("Gagal melakukan Forge Prose:", error);
    onChunk("\n\n[ERROR: Gagal menghubungi The Forge. Cek koneksi atau API Key.]");
  }
}

/**
 * ENGINE 2: The Lorekeeper Agent (Menggunakan Gemini 3.1 Flash Lite)
 * Berjalan di background untuk mengecek apakah draf melanggar aturan world-building (PDF-mu).
 */
export async function runLogicQC(draft: string, loreContext: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: QC_SYSTEM_PROMPT + "\n" + loreContext,
      generationConfig: {
        temperature: 0.1, // Suhu rendah karena QC butuh presisi, bukan kreativitas
      },
    });

    const response = await model.generateContent(`Draft to analyze:\n${draft}`);
    return response.response.text();
  } catch (error) {
    console.error("Gagal melakukan QC:", error);
    return "Error: Lorekeeper agent is currently sleeping.";
  }
}