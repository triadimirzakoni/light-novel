// src/app/actions/chapter.ts
"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fungsi Mengambil Semua Bab (Diurutkan dari yang terbaru)
export async function getChaptersDB() {
  try {
    const chapters = await prisma.chapter.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return chapters;
  } catch (error) {
    console.error("Gagal mengambil chapter:", error);
    return [];
  }
}

// Fungsi Menyimpan / Meng-update Bab
export async function saveChapterDB(data: { id: string; title: string; draftContent: string; proseContent: string }) {
  try {
    const chapter = await prisma.chapter.upsert({
      where: { id: data.id },
      update: {
        title: data.title,
        draftContent: data.draftContent,
        proseContent: data.proseContent,
      },
      create: {
        id: data.id,
        title: data.title,
        draftContent: data.draftContent,
        proseContent: data.proseContent,
      },
    });
    return { success: true, chapter };
  } catch (error) {
    console.error("Gagal menyimpan chapter:", error);
    return { success: false };
  }
}

// Fungsi Menghapus Bab
export async function deleteChapterDB(id: string) {
  try {
    await prisma.chapter.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}