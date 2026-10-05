"use client";

import Link from "next/link";
import { useBrowserValue } from "@/hooks/useBrowserValue";
import { getMySecretToken } from "@/lib/myInvites";

type AuthorPageLinkProps = {
  publicToken: string;
};

export function AuthorPageLink({ publicToken }: AuthorPageLinkProps) {
  const secretToken = useBrowserValue<string | null>(
    () => getMySecretToken(publicToken),
    null,
  );

  if (!secretToken) return null;

  return (
    <Link
      href={`/manage/${secretToken}`}
      className="w-full rounded-xl border border-line py-3 text-center text-sm font-medium text-muted"
    >
      You made this invitation — open your page
    </Link>
  );
}
