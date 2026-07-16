"use client";

import React, { useState } from "react";
import { streamProse, runLogicQC } from "@/lib/ai/gemini-client";
import { Sparkles, ShieldAlert, Loader2, BookOpen } from "lucide-react";

// TODO: Nanti lore ini akan diambil dinamis dari NodeCanvas / Zustand Store
// Sementara kita hardcode berdasarkan world-building Jembatan milikmu agar AI bisa langsung memahaminya.
const MOCK_LORE_CONTEXT = `
LORE GLOSSARY & RULES:
- The Bridge (Jembatan): Jembatan raksasa tanpa pondasi. Kabel baja menjuntai ke langit yang tertutup kabut tebal. Bawahnya jurang kabut abadi tanpa suara (benda jatuh tidak bersuara pantulan). Penuh mobil dan bus karatan.
- Julian Vance (MC): 19 tahun. Pemikir cepat, rela berkorban. Resonance: Swordborne Vessel.
- Elara Moonsong: 18 tahun. Awalnya sangat tertutup (secretive). Punya kekuatan pikiran/mimpi (The Hermit).
- Sebastian: 19 tahun. Jarang bicara (Silent guy). Resonance OP tapi berbahaya, dia bisa meluruh (dissolve) jika Lyra terbangun.
- Lyra Solvaris: 16 tahun. Putri kerajaan. Harus dalam kondisi tidur/pingsan agar Sebastian bisa menggunakan kekuatan maksimalnya tanpa mati.
- Kael Sterling: 20 tahun. Ksatria pelindung (Vanguard). Idealistis.
- Enemies: Shadeborn (monster di jembatan), Wraiths (bayangan hitam mematikan di langit).
`;

export default function DraftEditor() {
  const [draft, setDraft] = useState("");
  const [prose, setProse] = useState("");
  const [isForging, setIsForging] = useState(false);
  const [qcResult, setQcResult] = useState<string | null>(null);
  const [isCheckingQC, setIsCheckingQC] = useState(false);

  const handleForge = async () => {
    if (!draft.trim()) return;
    
    setIsForging(true);
    setProse(""); // Kosongkan hasil sebelumnya
    setQcResult(null);

    // Memanggil API Stream dari gemini-client.ts
    await streamProse(draft, MOCK_LORE_CONTEXT, (chunk) => {
      // Menggunakan functional state update agar karakter streaming tertumpuk dengan benar
      setProse((prev) => prev + chunk);
    });

    setIsForging(false);
  };

  const handleLoreQC = async () => {
    if (!draft.trim()) return;
    setIsCheckingQC(true);
    const result = await runLogicQC(draft, MOCK_LORE_CONTEXT);
    setQcResult(result);
    setIsCheckingQC(false);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 font-sans">
      {/* HEADER / TOOLBAR */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-500" />
          <h1 className="text-lg font-bold tracking-widest text-zinc-100 uppercase">The Director's Forge</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleLoreQC}
            disabled={isCheckingQC || !draft}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-md border-zinc-700 hover:bg-zinc-800 disabled:opacity-50"
          >
            {isCheckingQC ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
            Lorekeeper QC
          </button>
          <button
            onClick={handleForge}
            disabled={isForging || !draft}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black transition-all rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            {isForging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Forge Prose
          </button>
        </div>
      </header>

      {/* BANNER QC (Jika ada hasil pengecekan logika) */}
      {qcResult && (
        <div className={`px-6 py-3 text-sm font-medium border-b ${qcResult.includes("LORE ACCURATE") ? "bg-emerald-950/50 text-emerald-400 border-emerald-900" : "bg-amber-950/50 text-amber-400 border-amber-900"}`}>
          <span className="font-bold">Lorekeeper Agent: </span>
          {qcResult}
        </div>
      )}

      {/* SPLIT SCREEN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        {/* PANEL KIRI: The Beat Editor (Indo/Eng Draft) */}
        <div className="flex flex-col w-1/2 border-r border-zinc-800 bg-zinc-950">
          <div className="px-6 py-2 text-xs font-semibold tracking-wider uppercase border-b border-zinc-800 text-zinc-500">
            Director's Rough Draft
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tulis ide kasarmu di sini (campur Indo/Inggris). Contoh: Julian bangun, aspalnya dingin banget. Dia noleh ke Elara..."
            className="flex-1 w-full p-6 text-lg leading-relaxed bg-transparent resize-none focus:outline-none text-zinc-300 placeholder:text-zinc-700"
          />
        </div>

        {/* PANEL KANAN: The Proscenium (AI Generated English Prose) */}
        <div className="flex flex-col w-1/2 bg-zinc-900/30">
          <div className="px-6 py-2 text-xs font-semibold tracking-wider text-emerald-500 uppercase border-b border-zinc-800">
            Forged English Prose
          </div>
          <textarea
            value={prose}
            onChange={(e) => setProse(e.target.value)}
            placeholder="Mahakarya bahasa Inggrismu akan mengalir di sini..."
            className="flex-1 w-full p-6 text-lg leading-relaxed bg-transparent resize-none focus:outline-none text-zinc-100 placeholder:text-zinc-700 selection:bg-emerald-500/30"
          />
        </div>
      </div>
    </div>
  );
}