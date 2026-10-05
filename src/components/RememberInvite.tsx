"use client";

import { useEffect } from "react";
import { rememberInvite } from "@/lib/myInvites";

type RememberInviteProps = {
  publicToken: string;
  secretToken: string;
};

export function RememberInvite({
  publicToken,
  secretToken,
}: RememberInviteProps) {
  useEffect(() => {
    rememberInvite(publicToken, secretToken);
  }, [publicToken, secretToken]);

  return null;
}
