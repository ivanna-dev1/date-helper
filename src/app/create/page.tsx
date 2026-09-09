import type { Metadata } from "next";
import { CreateInviteForm } from "@/components/CreateInviteForm";

export const metadata: Metadata = {
  title: "New invitation — Date Helper",
  description: "Pick a few times and places, add a note, and share one link.",
};

export default function CreatePage() {
  return (
    <main className="flex flex-1 flex-col py-8">
      <h1 className="mb-6 text-2xl font-bold text-ink">New invitation</h1>
      <CreateInviteForm />
    </main>
  );
}
