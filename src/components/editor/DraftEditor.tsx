"use client";

import React, { useState, useEffect } from "react";
import { streamProse, runLogicQC } from "@/lib/ai/gemini-client";
import { Sparkles, ShieldAlert, Loader2, BookOpen, Save, List, Plus, Copy, Check, Trash2 } from "lucide-react";
// Import fungsi Database yang baru kita buat
import { getChaptersDB, saveChapterDB, deleteChapterDB } from "@/app/actions/chapter";

const MOCK_LORE_CONTEXT = `
=== COSMOLOGY & WORLD-BUILDING ===
1. The Truth: Dunia fisik tidak ada. Semuanya adalah mimpi kolektif dari entitas bernama "The Dreamer". Semua manusia adalah kepingan jiwa The Dreamer.
2. Reality by Consensus: Hukum fisika bekerja karena miliaran manusia (Sleepers) mempercayainya. Kepercayaan kolektif menciptakan realitas (termasuk Dewa).
3. Reality Correction: Jika orang biasa melihat sihir/monster, dunia secara otomatis akan mencoba "mengedit" ingatan mereka untuk menjaga agar mimpi tetap stabil.
4. Realms: 
   - Consensus Layer: Dunia nyata yang stabil.
   - The Veil: Dimensi cermin bayangan, sepi, penuh kabut dan monster (Shadeborn).
   - Echoes: Pocket dimension/Ujian dari sebuah Fragment (contoh: Jembatan Kabut, Isle of Calystria).
   - The Gazebo: Tempat kumpul rahasia di dalam mimpi (manifestasi Will Fragment).

=== POWER SYSTEM (LUCIDITY & RESONANCE) ===
- Progression: Sleeper (0%) -> Seeker -> Dreamer -> Fragment-Bound -> Awakened (100%).
- The Cost (Resonance Loss & Melting): Sihir tidak pakai Mana. Kekuatan dibayar dengan kewarasan. Jika seseorang terlalu memaksakan kehendaknya pada realitas, atau bertindak berlawanan dengan sifat aslinya, tubuh dan kesadarannya akan "Meluruh" (Melting/Dissolving) menjadi transparan dan kembali ke The Dreamer.
- Loot: Saat Shadeborn mati, kesadaran/traumanya berpindah ke pembunuh (meningkatkan Resonance) atau meninggalkan "Echo Shards".

=== CHARACTER PROFILES (PSYCHOLOGY & POWERS) ===
1. JULIAN VANCE
- Resonance: The Anomalous Hunter / Reality Anchor (Level: Seeker/Dreamer). Kekuatannya misterius, berfungsi secara pasif men-dispel sihir orang lain saat dia terancam. Punya insting bertahan hidup ekstrem.
- Sifat: Pragmatis, logis, blak-blakan/kasar (blunt), penyendiri. Digeser dari balas dendam menjadi pelindung kelompok.

2. ELARA MOONSONG
- Resonance: Warden of Memories (Bisa memanipulasi dan menghapus ingatan, termasuk ingatannya sendiri).
- Sifat: Sangat tertutup (secretive), paranoid, pesimis. Murid dari The Hermit yang secara diam-diam ingin membunuh gurunya.

3. SEBASTIAN
- Resonance: Eternal Wanderer (Bisa menjelajah alam non-fisik/mimpi, kebal suhu ekstrem).
- Sifat: Kalkulatif, sangat menghindari risiko, bicaranya sarkas dan pelit kata. Yatim piatu Gereja Halora yang sinis. Sering mengucap "blasphemous" sebagai sindiran. Takut pada proses "Melting".

4. LYRA SOLVARIS
- Resonance: Voicewoven Herald (Mind Weaver - Telepati).
- Sifat: Putri kerajaan yang naif, kaku, dan polos. Bisu secara fisik (HANYA bisa bicara lewat telepati langsung ke otak orang lain). Terlindungi dari dunia luar tapi pelan-pelan terpapar pikiran gelap orang lain.

5. KAEL STERLING
- Resonance: Swordborne Vessel (Form Shaper - Bisa menciptakan pedang dari objek).
- Sifat: Ksatria idealis, optimis, loyal pada The Chancellor (Empire). Percaya dia sedang "menyelamatkan dunia" sampai akhirnya melihat kebusukan atasannya.

=== ENEMIES & ENTITIES ===
- Shadeborn: Monster perwujudan trauma/mimpi buruk The Dreamer.
- The 5 Great Powers: The Queen (Authority), The Pope (Faith), The Chancellor (Mind), The Hermit (Isolation), The Prime/Faction Leader (Ego - musuh utama Julian).
`;

type DBChapter = {
  id: string;
  title: string;
  draftContent: string;
  proseContent: string;
  updatedAt: Date | string;
};

export default function DraftEditor() {
  // State Editor
  const [chapterId, setChapterId] = useState<string>(crypto.randomUUID());
  const [title, setTitle] = useState("Chapter 1: The Glitch");
  const [draft, setDraft] = useState("");
  const [prose, setProse] = useState("");
  
  // State Database & Loading
  const [chapters, setChapters] = useState<DBChapter[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  // State AI
  const [isForging, setIsForging] = useState(false);
  const [isCheckingQC, setIsCheckingQC] = useState(false);
  const [qcResult, setQcResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Fetch data dari Supabase saat web pertama kali dibuka
  const loadDatabase = async () => {
    setIsLoadingDB(true);
    const data = await getChaptersDB();
    setChapters(data);
    setIsLoadingDB(false);
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // --- Helper Functions ---
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  };

  const handleCopy = async () => {
    if (!prose) return;
    await navigator.clipboard.writeText(prose);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearProse = () => {
    if (confirm("Yakin ingin menghapus semua hasil teks AI di panel kanan?")) {
      setProse("");
    }
  };

  // --- AI Functions ---
  const handleForge = async () => {
    if (!draft.trim()) return;
    setIsForging(true);
    setQcResult(null);

    if (prose.trim()) {
      setProse((prev) => prev.trim() + "\n\n");
    }

    await streamProse(draft, MOCK_LORE_CONTEXT, prose, (chunk) => {
      setProse((prev) => prev + chunk);
    });
    
    setIsForging(false);
    setDraft(""); // Reset kotak kiri siap untuk next beat
  };

  const handleLoreQC = async () => {
    if (!draft.trim()) return;
    setIsCheckingQC(true);
    const result = await runLogicQC(draft, MOCK_LORE_CONTEXT);
    setQcResult(result);
    setIsCheckingQC(false);
  };

  // --- Database Functions ---
  const handleSaveToDB = async () => {
    setIsSaving(true);
    const response = await saveChapterDB({
      id: chapterId,
      title: title || "Untitled Chapter",
      draftContent: draft, 
      proseContent: prose,
    });
    
    if (response.success) {
      alert(`Bab "${title}" berhasil disimpan ke Cloud Database! ☁️`);
      await loadDatabase(); // Refresh daftar sidebar
    } else {
      alert("Gagal menyimpan bab. Cek koneksi internet.");
    }
    setIsSaving(false);
  };

  const handleLoadChapter = (chapter: DBChapter) => {
    setChapterId(chapter.id);
    setTitle(chapter.title);
    setDraft(chapter.draftContent);
    setProse(chapter.proseContent);
    setQcResult(null);
  };

  const createNewChapter = () => {
    setChapterId(crypto.randomUUID());
    setTitle("New Chapter");
    setDraft("");
    setProse("");
    setQcResult(null);
  };

  const handleDeleteChapter = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation(); // Mencegah bab ter-load saat klik tombol hapus
    if (confirm(`Yakin ingin menghapus bab "${title}" selamanya dari Database?`)) {
      await deleteChapterDB(id);
      await loadDatabase();
      if (chapterId === id) createNewChapter();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 font-sans">
      {/* HEADER / TOOLBAR */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 border rounded border-zinc-700 hover:bg-zinc-800 transition-colors relative">
            <List className="w-5 h-5 text-zinc-300" />
            {chapters.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {chapters.length}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent text-lg font-bold text-zinc-100 uppercase tracking-widest focus:outline-none border-b border-dashed border-zinc-700 focus:border-emerald-500 w-80"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleSaveToDB} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-md border-zinc-700 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            {isSaving ? "Saving to Cloud..." : "Save Chapter"}
          </button>

          <button onClick={handleLoreQC} disabled={isCheckingQC || !draft} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-md border-zinc-700 hover:bg-zinc-800 disabled:opacity-50">
            {isCheckingQC ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
            QC Logika
          </button>

          <button onClick={handleForge} disabled={isForging || !draft} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black transition-all rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {isForging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Forge Beat
          </button>
        </div>
      </header>

      {/* BANNER QC */}
      {qcResult && (
        <div className={`px-6 py-3 text-sm font-medium border-b ${qcResult.includes("LORE ACCURATE") ? "bg-emerald-950/50 text-emerald-400 border-emerald-900" : "bg-amber-950/50 text-amber-400 border-amber-900"}`}>
          <span className="font-bold">Lorekeeper: </span>
          {qcResult}
        </div>
      )}

      {/* TAMPILAN UTAMA (Editor + Sidebar) */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR DATABASE CLOUD */}
        {showSidebar && (
          <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col absolute z-10 h-full shadow-2xl transition-all">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
              <span className="font-bold text-sm text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                Cloud DB
                {isLoadingDB && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
              </span>
              <button onClick={createNewChapter} className="p-1 text-emerald-500 hover:bg-zinc-800 rounded transition-colors" title="Buat Bab Baru">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {chapters.length === 0 && !isLoadingDB ? (
                <p className="text-xs text-zinc-600 text-center mt-4">Belum ada naskah di Cloud.</p>
              ) : (
                chapters.map((ch) => (
                  <div 
                    key={ch.id} 
                    onClick={() => handleLoadChapter(ch)}
                    className={`p-3 mb-2 rounded cursor-pointer border transition-colors group relative ${chapterId === ch.id ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 text-zinc-400'}`}
                  >
                    <div className="font-semibold text-sm truncate pr-6">{ch.title}</div>
                    <div className="text-[10px] mt-1.5 opacity-50 flex justify-between font-mono">
                      <span>{new Date(ch.updatedAt).toLocaleDateString('id-ID')}</span>
                      <span>{getWordCount(ch.proseContent)} words</span>
                    </div>
                    {/* Tombol Hapus (Hanya muncul saat di-hover) */}
                    <button 
                      onClick={(e) => handleDeleteChapter(e, ch.id, ch.title)}
                      className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                      title="Hapus Bab"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PANEL KIRI: The Beat Editor */}
        <div className={`flex flex-col flex-1 border-r border-zinc-800 bg-zinc-950 transition-all ${showSidebar ? 'ml-72' : 'ml-0'}`}>
          <div className="px-6 py-2 text-xs font-semibold tracking-wider uppercase border-b border-zinc-800 text-zinc-500 flex justify-between items-center bg-zinc-900/30">
            <span>Director's Draft (Next Beat)</span>
            <span className="bg-zinc-900 px-2 py-1 rounded text-zinc-400">{getWordCount(draft)} words</span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tulis Beat-mu di sini... (Setelah di-Forge, kotak ini akan kosong otomatis untuk Beat selanjutnya)"
            className="flex-1 w-full p-6 text-lg leading-relaxed bg-transparent resize-none focus:outline-none text-zinc-300 placeholder:text-zinc-700"
          />
        </div>

        {/* PANEL KANAN: The Proscenium */}
        <div className="flex flex-col flex-1 bg-zinc-900/30">
          <div className="px-6 py-2 text-xs font-semibold tracking-wider text-emerald-500 uppercase border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <span>Forged Prose (Bersambung ke bawah)</span>
            <div className="flex items-center gap-4">
              <span className="text-emerald-600 font-mono">{getWordCount(prose)} words</span>
              
              <button 
                onClick={handleClearProse}
                disabled={!prose}
                className="flex items-center gap-1.5 px-3 py-1 text-red-400 hover:bg-red-950/30 rounded transition-colors disabled:opacity-50"
                title="Hapus semua teks"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={handleCopy}
                disabled={!prose}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors disabled:opacity-50"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className={isCopied ? "text-emerald-500" : ""}>{isCopied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>
          <textarea
            value={prose}
            onChange={(e) => setProse(e.target.value)}
            placeholder="Hasil AI akan bersambung ke bawah. Kamu bisa memodifikasinya kapan saja..."
            className="flex-1 w-full p-6 text-lg leading-relaxed bg-transparent resize-none focus:outline-none text-zinc-100 placeholder:text-zinc-700 selection:bg-emerald-500/30"
          />
        </div>
      </div>
    </div>
  );
}