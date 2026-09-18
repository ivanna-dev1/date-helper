"use client";

import { useEffect } from "react";
import { rememberInvite } from "@/lib/myInvites";

type RememberInviteProps = {
  publicToken: string;
  secretToken: string;
};

// Draws nothing. It only writes the author's own link into this browser,
// so the author can come back to their page later (see src/lib/myInvites.ts).
export function RememberInvite({
  publicToken,
  secretToken,
}: RememberInviteProps) {
  useEffect(() => {
    rememberInvite(publicToken, secretToken);
  }, [publicToken, secretToken]);

  return null;
}
