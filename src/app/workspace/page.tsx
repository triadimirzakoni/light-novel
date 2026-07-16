// src/app/workspace/page.tsx
import DraftEditor from "@/components/editor/DraftEditor";

export const metadata = {
  title: "Workspace - Director's Forge",
};

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <DraftEditor />
    </main>
  );
}