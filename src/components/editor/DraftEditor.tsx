"use client";

import React, { useState, useEffect } from "react";
import { streamProse, runLogicQC } from "@/lib/ai/gemini-client";
import { Sparkles, ShieldAlert, Loader2, BookOpen, Save, List, Plus, Copy, Check } from "lucide-react";
import { useStoryStore, Chapter } from "@/lib/store/useStoryStore";

const MOCK_LORE_CONTEXT = `[LORE JEMBATAN SEPERTI SEBELUMNYA...]`;

export default function DraftEditor() {
  // State Editor
  const [chapterId, setChapterId] = useState<string>(crypto.randomUUID());
  const [title, setTitle] = useState("Chapter 1: The Silent Abyss");
  const [draft, setDraft] = useState("");
  const [prose, setProse] = useState("");
  
  // State Loading & Copy
  const [isForging, setIsForging] = useState(false);
  const [isCheckingQC, setIsCheckingQC] = useState(false);
  const [qcResult, setQcResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Database Store
  const { chapters, saveChapter } = useStoryStore();
  const [showSidebar, setShowSidebar] = useState(false);

  // Fix Hydration Issue (Zustand Persist Next.js)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- Helper Functions ---
  
  // 1. Fungsi Penghitung Jumlah Kata
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  };

  // 2. Fungsi Copy to Clipboard
  const handleCopy = async () => {
    if (!prose) return;
    await navigator.clipboard.writeText(prose);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); // Reset tulisan 'Copied' setelah 2 detik
  };

  const handleForge = async () => {
    if (!draft.trim()) return;
    setIsForging(true);
    setProse(""); 
    setQcResult(null);

    await streamProse(draft, MOCK_LORE_CONTEXT, (chunk) => {
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

  const handleSaveToDB = () => {
    const newChapter: Chapter = {
      id: chapterId,
      title: title || "Untitled Chapter",
      draftContent: draft,
      proseContent: prose,
      updatedAt: Date.now(),
    };
    saveChapter(newChapter);
    // Kita kasih efek UI dikit biar kerasa udah ke-save
    alert(`Bab "${title}" berhasil disimpan ke Database!`);
  };

  const loadChapter = (chapter: Chapter) => {
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

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 font-sans">
      {/* HEADER / TOOLBAR */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 border rounded border-zinc-700 hover:bg-zinc-800 transition-colors">
            <List className="w-5 h-5 text-zinc-300" />
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
          <button onClick={handleSaveToDB} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-md border-zinc-700 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300">
            <Save className="w-4 h-4" /> Save Chapter
          </button>

          <button onClick={handleLoreQC} disabled={isCheckingQC || !draft} className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-md border-zinc-700 hover:bg-zinc-800 disabled:opacity-50">
            {isCheckingQC ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
            QC Logika
          </button>

          <button onClick={handleForge} disabled={isForging || !draft} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black transition-all rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {isForging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Forge Prose
          </button>
        </div>
      </header>

      {/* BANNER QC */}
      {qcResult && (
        <div className={`px-6 py-3 text-sm font-medium border-b ${qcResult.includes("LORE ACCURATE") ? "bg-emerald-950/50 text-emerald-400 border-emerald-900" : "bg-amber-950/50 text-amber-400 border-amber-900"}`}>
          <span className="font-bold">Lorekeeper Agent: </span>
          {qcResult}
        </div>
      )}

      {/* TAMPILAN UTAMA (Editor + Sidebar) */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR DATABASE */}
        {showSidebar && (
          <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col absolute z-10 h-full shadow-2xl transition-all">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
              <span className="font-bold text-sm text-zinc-400 uppercase tracking-wider">Chapter DB</span>
              <button onClick={createNewChapter} className="p-1 text-emerald-500 hover:bg-zinc-800 rounded transition-colors" title="Buat Bab Baru">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {chapters.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center mt-4">Belum ada bab tersimpan.</p>
              ) : (
                chapters.map((ch) => (
                  <div 
                    key={ch.id} 
                    onClick={() => loadChapter(ch)}
                    className={`p-3 mb-2 rounded cursor-pointer border transition-colors ${chapterId === ch.id ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 text-zinc-400'}`}
                  >
                    <div className="font-semibold text-sm truncate">{ch.title}</div>
                    <div className="text-xs mt-1 opacity-50 flex justify-between">
                      <span>{new Date(ch.updatedAt).toLocaleDateString()}</span>
                      <span>{getWordCount(ch.proseContent)} words</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PANEL KIRI: The Beat Editor */}
        <div className={`flex flex-col flex-1 border-r border-zinc-800 bg-zinc-950 transition-all ${showSidebar ? 'ml-64' : 'ml-0'}`}>
          <div className="px-6 py-2 text-xs font-semibold tracking-wider uppercase border-b border-zinc-800 text-zinc-500 flex justify-between items-center bg-zinc-900/30">
            <span>Director's Rough Draft</span>
            <span className="bg-zinc-900 px-2 py-1 rounded text-zinc-400">{getWordCount(draft)} words</span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tulis ide kasarmu di sini (campur Indo/Inggris)..."
            className="flex-1 w-full p-6 text-lg leading-relaxed bg-transparent resize-none focus:outline-none text-zinc-300 placeholder:text-zinc-700"
          />
        </div>

        {/* PANEL KANAN: The Proscenium */}
        <div className="flex flex-col flex-1 bg-zinc-900/30">
          <div className="px-6 py-2 text-xs font-semibold tracking-wider text-emerald-500 uppercase border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <span>Forged English Prose (Editable)</span>
            <div className="flex items-center gap-4">
              <span className="text-emerald-600 font-mono">{getWordCount(prose)} words</span>
              <button 
                onClick={handleCopy}
                disabled={!prose}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy to Clipboard"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className={isCopied ? "text-emerald-500" : ""}>{isCopied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>
          <textarea
            value={prose}
            onChange={(e) => setProse(e.target.value)}
            placeholder="Hasil AI akan muncul di sini. Kamu bisa langsung mengedit teks ini sesuka hatimu sebelum di-save."
            className="flex-1 w-full p-6 text-lg leading-relaxed bg-transparent resize-none focus:outline-none text-zinc-100 placeholder:text-zinc-700 selection:bg-emerald-500/30"
          />
        </div>
      </div>
    </div>
  );
}