import { randomBytes } from "node:crypto";

// 9 random bytes become 12 characters in base64url.
// base64url is safe for links: it has no "+", "/" or "=" signs.
const TOKEN_BYTES = 9;

/**
 * Makes a random token for a link, for example "k7Fq2mXp9RtA".
 *
 * We do NOT use the database id here. Ids go 1, 2, 3, so anyone could
 * open /i/1, /i/2 and read other people's invitations. A random token
 * cannot be guessed: there are more than 4 * 10^21 of them.
 */
export function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}
