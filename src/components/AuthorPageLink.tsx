"use client";

import Link from "next/link";
import { useBrowserValue } from "@/hooks/useBrowserValue";
import { getMySecretToken } from "@/lib/myInvites";

type AuthorPageLinkProps = {
  publicToken: string;
};

/**
 * Shown only to the author, and only in the browser where they made the
 * invitation: that browser remembers their secret link.
 *
 * It solves a real problem. The invited person's "Let … know" message
 * carries the public link, so the author lands on the invited person's
 * page, where there are no buttons for them. From here they get back
 * to their own page in one tap.
 */
export function AuthorPageLink({ publicToken }: AuthorPageLinkProps) {
  // The memory lives in the browser, so the server knows nothing about it.
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
