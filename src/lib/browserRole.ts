import { cookies } from "next/headers";
import type { Proposer } from "@/lib/responseView";

// Which side of one date this browser is on: the author or the invited
// person. It stops a simple mistake: opening the link you just sent to
// the other person and answering your own suggestion.
// It is a guard against a mistake, not a lock: another browser has no
// cookie, and then the link alone decides, as before.

// One cookie per invitation, so one browser can make several invitations
// and answer other people's ones.
function cookieName(publicToken: string): string {
  return `dh_role_${publicToken}`;
}

// Half a year: longer than any back-and-forth about one date.
const ROLE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export async function getBrowserRole(
  publicToken: string,
): Promise<Proposer | null> {
  const value = (await cookies()).get(cookieName(publicToken))?.value;
  return value === "author" || value === "guest" ? value : null;
}

// Can be called only in a Server Action: a page cannot set cookies.
export async function rememberBrowserRole(
  publicToken: string,
  role: Proposer,
): Promise<void> {
  (await cookies()).set(cookieName(publicToken), role, {
    // Only the server reads it: page scripts do not need it.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ROLE_MAX_AGE_SECONDS,
    path: "/",
  });
}
