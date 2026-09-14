import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export const metadata: Metadata = {
  title: "Your invitation — Date Helper",
  // This page is private. Search engines must never show it.
  robots: { index: false, follow: false },
};

export default async function ManagePage(
  props: PageProps<"/manage/[secretToken]">,
) {
  const { secretToken } = await props.params;

  // We only need two fields here, so we ask the database for just those.
  const invite = await prisma.invite.findUnique({
    where: { secretToken },
    select: { authorName: true, publicToken: true },
  });

  if (!invite) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-6 py-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold text-ink">
          Your invitation is ready{" "}
          <span aria-hidden="true">✨</span>
        </h1>
        <p className="text-base text-muted">
          Send this link to the person you are inviting.
        </p>
      </div>

      <CopyLinkButton path={`/i/${invite.publicToken}`} />

      <p className="text-center text-xs text-quiet">
        Keep this page. You will see their answer here.
      </p>
    </main>
  );
}
