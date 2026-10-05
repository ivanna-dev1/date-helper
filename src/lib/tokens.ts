import { randomBytes } from "node:crypto";

// 9 random bytes = 12 base64url characters (link-safe).
const TOKEN_BYTES = 9;

// Random token for a link. Not the database id: sequential ids could be guessed (/i/1, /i/2).
export function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}
