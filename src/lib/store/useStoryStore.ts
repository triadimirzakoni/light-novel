// src/lib/store/useStoryStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Chapter = {
  id: string;
  title: string;
  draftContent: string;
  proseContent: string;
  updatedAt: number;
};

interface StoryState {
  chapters: Chapter[];
  saveChapter: (chapter: Chapter) => void;
  deleteChapter: (id: string) => void;
}

export const useStoryStore = create<StoryState>()(
  persist(
    (set) => ({
      chapters: [],
      
      // Fungsi untuk menyimpan / update bab
      saveChapter: (newChapter) =>
        set((state) => {
          const index = state.chapters.findIndex((c) => c.id === newChapter.id);
          if (index >= 0) {
            // Update bab jika sudah ada
            const updatedChapters = [...state.chapters];
            updatedChapters[index] = newChapter;
            return { chapters: updatedChapters };
          }
          // Tambah bab baru
          return { chapters: [...state.chapters, newChapter] };
        }),
        
      // Fungsi untuk menghapus bab
      deleteChapter: (id) =>
        set((state) => ({
          chapters: state.chapters.filter((c) => c.id !== id),
        })),
    }),
    {
      name: 'directors-forge-db', // Nama database di browser
    }
  )
);