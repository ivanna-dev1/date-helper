import { cookies } from "next/headers";
import type { Proposer } from "@/lib/responseView";

// Which side of this date the browser is on. Guards against answering your own suggestion; not a lock (another browser has no cookie).

// One cookie per invitation.
function cookieName(publicToken: string): string {
  return `dh_role_${publicToken}`;
}

// Half a year: longer than any back-and-forth.
const ROLE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export async function getBrowserRole(
  publicToken: string,
): Promise<Proposer | null> {
  const value = (await cookies()).get(cookieName(publicToken))?.value;
  return value === "author" || value === "guest" ? value : null;
}

// Server Actions only: pages cannot set cookies.
export async function rememberBrowserRole(
  publicToken: string,
  role: Proposer,
): Promise<void> {
  (await cookies()).set(cookieName(publicToken), role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ROLE_MAX_AGE_SECONDS,
    path: "/",
  });
}
