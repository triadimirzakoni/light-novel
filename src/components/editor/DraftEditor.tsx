"use client";

import React, { useState, useEffect, useRef } from "react";
import { streamProse, runLogicQC, streamRevision } from "@/lib/ai/gemini-client";
import { Sparkles, ShieldAlert, Loader2, BookOpen, Save, List, Plus, Copy, Check, Trash2, Italic, Bold, Wand2 } from "lucide-react";
import { getChaptersDB, saveChapterDB, deleteChapterDB } from "@/app/actions/chapter";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const MOCK_LORE_CONTEXT = `
=== COSMOLOGY & WORLD-BUILDING ===
1. The Truth: Dunia fisik tidak ada. Semuanya adalah mimpi kolektif dari entitas bernama "The Dreamer". Semua manusia adalah kepingan jiwa The Dreamer.
2. Reality by Consensus: Hukum fisika bekerja karena miliaran manusia (Sleepers) mempercayainya. Kepercayaan kolektif menciptakan realitas (termasuk Dewa).
3. Reality Correction: Jika orang biasa melihat sihir/monster, dunia secara otomatis akan mencoba "mengedit" ingatan mereka untuk menjaga agar mimpi tetap stabil.
4. Realms: 
   - Consensus Layer: Dunia nyata yang stabil.
   - The Veil: Dimensi cermin bayangan, sepi, penuh kabut dan monster (Shadeborn).
   - Echoes: Pocket dimension/Ujian dari sebuah Fragment.
   - The Gazebo: Tempat kumpul rahasia di dalam mimpi.

=== POWER SYSTEM (LUCIDITY & RESONANCE) ===
- Progression: Sleeper (0%) -> Seeker -> Dreamer -> Fragment-Bound -> Awakened (100%).
- The Cost (Melting): Sihir dibayar dengan kewarasan. Memaksakan kehendak pada realitas atau bertindak berlawanan sifat asli membuat tubuh "Meluruh" (Dissolving).
- Loot: Saat Shadeborn mati, kesadaran/traumanya berpindah ke pembunuh atau meninggalkan "Echo Shards".

=== CHARACTER PROFILES ===
1. JULIAN VANCE
- Resonance: The Anomalous Hunter / Reality Anchor. Berfungsi pasif men-dispel sihir orang lain saat terancam.
- Sifat: Pragmatis, logis, blak-blakan, penyendiri. 

2. ELARA MOONSONG
- Resonance: Warden of Memories (memanipulasi ingatan).
- Sifat: Sangat tertutup, paranoid, pesimis. Murid dari The Hermit.

3. SEBASTIAN
- Resonance: Eternal Wanderer (menjelajah alam non-fisik).
- Sifat: Kalkulatif, sangat menghindari risiko, bicaranya sarkas dan pelit kata. Yatim piatu Gereja Halora.

4. LYRA SOLVARIS
- Resonance: Voicewoven Herald (Telepati).
- Sifat: Putri kerajaan yang naif, polos. Bisu secara fisik.

5. KAEL STERLING
- Resonance: Swordborne Vessel (Form Shaper).
- Sifat: Ksatria idealis, optimis.

=== ENEMIES ===
- Shadeborn: Monster perwujudan trauma The Dreamer.
`;

type DBChapter = {
  id: string;
  title: string;
  draftContent: string;
  proseContent: string;
  updatedAt: Date | string;
};

export default function DraftEditor() {
  const [chapterId, setChapterId] = useState<string>(crypto.randomUUID());
  const [title, setTitle] = useState("Chapter 1: The Glitch");
  const [draft, setDraft] = useState("");
  const [prose, setProse] = useState("");
  
  const [chapters, setChapters] = useState<DBChapter[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  // --- AUTOSAVE STATES ---
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const isInitialLoad = useRef(true); // Ref agar load awal dari DB tidak dianggap "perubahan"

  const [isForging, setIsForging] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isCheckingQC, setIsCheckingQC] = useState(false);
  const [qcResult, setQcResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [mounted, setMounted] = useState(false);

  // --- TIPTAP EDITOR INIT ---
  const editor = useEditor({
    extensions: [StarterKit],
    content: prose,
    editorProps: {
      attributes: {
        class: 'flex-1 w-full p-6 text-lg leading-relaxed bg-transparent focus:outline-none text-zinc-100 h-full overflow-y-auto [&_p]:mb-4 [&_em]:italic [&_strong]:font-bold [&_em]:text-zinc-300',
      },
    },
    onUpdate: ({ editor }) => {
      setProse(editor.getHTML()); 
      if (!isInitialLoad.current) setHasUnsavedChanges(true); // Tandai ada perubahan
    },
  });

  const loadDatabase = async () => {
    setIsLoadingDB(true);
    const data = await getChaptersDB();
    setChapters(data);
    setIsLoadingDB(false);
  };

  useEffect(() => {
    setMounted(true);
    loadDatabase();
    // Beri jeda sebentar agar load pertama tidak men-trigger autosave
    setTimeout(() => { isInitialLoad.current = false; }, 500);
  }, []);

  // --- EFEK AUTOSAVE (Memicu save setelah 5 detik diam) ---
  useEffect(() => {
    if (!hasUnsavedChanges || isAutoSaving || isSaving || isInitialLoad.current) return;

    const timer = setTimeout(() => {
      handleSaveToDB(true); // true = silent save
    }, 5000); // 5 detik

    return () => clearTimeout(timer);
  }, [draft, prose, title, hasUnsavedChanges]);

  // --- CHANGE HANDLERS (Agar mendeteksi ketikan User) ---
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (!isInitialLoad.current) setHasUnsavedChanges(true);
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    if (!isInitialLoad.current) setHasUnsavedChanges(true);
  };

  // --- HELPER FUNCTIONS ---
  const getWordCount = (htmlText: string) => {
    if (!htmlText) return 0;
    const plainText = htmlText.replace(/<[^>]*>?/gm, '');
    return plainText.trim().split(/\s+/).filter((word) => word.length > 0).length;
  };

  const handleCopy = async () => {
    if (!prose) return;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = prose;
    await navigator.clipboard.writeText(tempDiv.innerText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearProse = () => {
    if (confirm("Yakin ingin menghapus semua hasil teks AI di panel kanan?")) {
      setProse("");
      editor?.commands.setContent("");
      setHasUnsavedChanges(true);
    }
  };

  // --- AI FUNCTIONS ---
  const handleForge = async () => {
    if (!draft.trim()) return;
    setIsForging(true);
    setQcResult(null);

    let currentStream = prose.trim() ? prose.trim() + "<p></p>" : "";
    editor?.commands.setContent(currentStream);

    await streamProse(draft, MOCK_LORE_CONTEXT, prose, (chunk) => {
      currentStream += chunk;
      editor?.commands.setContent(currentStream);
      setProse(currentStream);
    });
    
    setIsForging(false);
    setDraft(""); 
    setHasUnsavedChanges(true); // Tandai hasil AI sebagai perubahan baru
  };

  const handleRevise = async () => {
    if (!prose.trim()) return;
    setIsRevising(true);
    
    const proseToRevise = prose; 
    setProse(""); 
    editor?.commands.setContent("");
    
    let currentStream = "";
    await streamRevision(proseToRevise, MOCK_LORE_CONTEXT, (chunk) => {
      currentStream += chunk;
      editor?.commands.setContent(currentStream);
      setProse(currentStream);
    });
    
    setIsRevising(false);
    setHasUnsavedChanges(true);
  };

  const handleLoreQC = async () => {
    if (!draft.trim()) return;
    setIsCheckingQC(true);
    const result = await runLogicQC(draft, MOCK_LORE_CONTEXT);
    setQcResult(result);
    setIsCheckingQC(false);
  };

  // --- DATABASE FUNCTIONS ---
  
  // Parameter silent = true untuk Autosave agar tidak muncul alert popup
  const handleSaveToDB = async (silent = false) => {
    if (silent) setIsAutoSaving(true);
    else setIsSaving(true);

    const response = await saveChapterDB({
      id: chapterId,
      title: title || "Untitled Chapter",
      draftContent: draft, 
      proseContent: prose,
    });
    
    if (response.success) {
      setHasUnsavedChanges(false); // Reset status perubahan
      // Panggil database secara diam-diam untuk update daftar Sidebar
      const data = await getChaptersDB();
      setChapters(data);

      if (!silent) alert(`Bab "${title}" berhasil disimpan ke Cloud! ☁️`);
    } else {
      if (!silent) alert("Gagal menyimpan bab. Cek koneksi internet.");
    }
    
    if (silent) setIsAutoSaving(false);
    else setIsSaving(false);
  };

  const handleLoadChapter = async (chapter: DBChapter) => {
    // 🛡️ PERLINDUNGAN: Simpan dulu bab saat ini sebelum buka yang baru!
    if (hasUnsavedChanges) {
      await handleSaveToDB(true); 
    }

    isInitialLoad.current = true; // Kunci agar load DB tidak memicu autosave
    setChapterId(chapter.id);
    setTitle(chapter.title);
    setDraft(chapter.draftContent);
    setProse(chapter.proseContent);
    editor?.commands.setContent(chapter.proseContent);
    setQcResult(null);

    setTimeout(() => {
      setHasUnsavedChanges(false);
      isInitialLoad.current = false;
    }, 200);
  };

  const createNewChapter = async () => {
    // 🛡️ PERLINDUNGAN: Simpan dulu sebelum bikin bab baru!
    if (hasUnsavedChanges) {
      await handleSaveToDB(true); 
    }

    isInitialLoad.current = true;
    setChapterId(crypto.randomUUID());
    setTitle("New Chapter");
    setDraft("");
    setProse("");
    editor?.commands.setContent("");
    setQcResult(null);

    setTimeout(() => {
      setHasUnsavedChanges(false);
      isInitialLoad.current = false;
    }, 200);
  };

  const handleDeleteChapter = async (e: React.MouseEvent, id: string, deletedTitle: string) => {
    e.stopPropagation(); 
    if (confirm(`Yakin ingin menghapus bab "${deletedTitle}" selamanya dari Database?`)) {
      await deleteChapterDB(id);
      await loadDatabase();
      if (chapterId === id) createNewChapter();
    }
  };

  if (!mounted || !editor) return null;

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
              onChange={handleTitleChange}
              className="bg-transparent text-lg font-bold text-zinc-100 uppercase tracking-widest focus:outline-none border-b border-dashed border-zinc-700 focus:border-emerald-500 w-80"
            />
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          {/* VISUAL INDICATOR AUTOSAVE */}
          <div className="mr-2 text-right">
            {isAutoSaving ? (
              <span className="text-xs text-zinc-500 animate-pulse">Autosaving...</span>
            ) : hasUnsavedChanges ? (
              <span className="text-xs text-amber-500/70 italic">Unsaved changes</span>
            ) : (
              <span className="text-xs text-emerald-500/70">Saved to Cloud</span>
            )}
          </div>

          <button onClick={() => handleSaveToDB(false)} disabled={isSaving || !hasUnsavedChanges} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-md border-zinc-700 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 disabled:opacity-30">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button onClick={handleLoreQC} disabled={isCheckingQC || !draft} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-md border-zinc-700 hover:bg-zinc-800 disabled:opacity-50">
            {isCheckingQC ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
            QC Logika
          </button>
          <button onClick={handleForge} disabled={isForging || !draft || isRevising} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black transition-all rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {isForging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Forge Beat
          </button>
        </div>
      </header>

      {/* QC BANNER */}
      {qcResult && (
        <div className={`px-6 py-3 text-sm font-medium border-b ${qcResult.includes("LORE ACCURATE") ? "bg-emerald-950/50 text-emerald-400 border-emerald-900" : "bg-amber-950/50 text-amber-400 border-amber-900"}`}>
          <span className="font-bold">Lorekeeper: </span>
          {qcResult}
        </div>
      )}

      {/* TAMPILAN UTAMA */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR DB CLOUD */}
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

        {/* KOTAK KIRI */}
        <div className={`flex flex-col flex-1 border-r border-zinc-800 bg-zinc-950 transition-all ${showSidebar ? 'ml-72' : 'ml-0'}`}>
          <div className="px-6 py-2 text-xs font-semibold tracking-wider uppercase border-b border-zinc-800 text-zinc-500 flex justify-between items-center bg-zinc-900/30">
            <span>Director's Draft</span>
            <span className="bg-zinc-900 px-2 py-1 rounded text-zinc-400">{getWordCount(draft)} words</span>
          </div>
          <textarea
            value={draft}
            onChange={handleDraftChange}
            placeholder="Tulis Beat-mu di sini..."
            className="flex-1 w-full p-6 text-lg leading-relaxed bg-transparent resize-none focus:outline-none text-zinc-300 placeholder:text-zinc-700"
          />
        </div>

        {/* KOTAK KANAN */}
        <div className="flex flex-col flex-1 bg-zinc-900/30">
          <div className="px-6 py-2 text-xs font-semibold tracking-wider text-emerald-500 uppercase border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            
            <div className="flex items-center gap-2">
              <span>Forged Prose</span>
              <div className="h-4 w-px bg-zinc-700 mx-2"></div>
              
              <button 
                onClick={() => editor.chain().focus().toggleBold().run()} 
                className={`p-1 rounded transition-colors ${editor.isActive('bold') ? 'bg-zinc-700 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400'}`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => editor.chain().focus().toggleItalic().run()} 
                className={`p-1 rounded transition-colors ${editor.isActive('italic') ? 'bg-zinc-700 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400'}`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-zinc-700 mx-2"></div>
              <button 
                onClick={handleRevise} 
                disabled={!prose || isRevising || isForging}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                title="Kirim naskah ini ke Editor AI untuk diperbaiki diksi dan pacing-nya"
              >
                {isRevising ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {isRevising ? "Polishing..." : "Expert Polish"}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-emerald-600 font-mono">{getWordCount(prose)} words</span>
              <button 
                onClick={handleClearProse}
                disabled={!prose}
                className="flex items-center gap-1.5 px-3 py-1 text-red-400 hover:bg-red-950/30 rounded transition-colors disabled:opacity-50"
                title="Hapus semua teks di panel kanan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleCopy}
                disabled={!prose}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors disabled:opacity-50"
                title="Copy ke Clipboard"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className={isCopied ? "text-emerald-500" : ""}>{isCopied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          <EditorContent editor={editor} className="flex-1 overflow-hidden flex flex-col" />
          
        </div>
      </div>
    </div>
  );
}