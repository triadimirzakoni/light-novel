import { redirect } from "next/navigation";

export default function Home() {
  // Langsung arahkan user ke meja kerja sutradara
  redirect("/workspace");
}