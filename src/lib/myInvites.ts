// The author's secret links, kept in this browser only: { publicToken: secretToken }.
// There are no accounts, and the server must not hand out secret tokens.
const STORAGE_KEY = "date-helper:my-invites";

type InviteMap = Record<string, string>;

// localStorage can throw (private mode, blocked data); the memory is optional.
function readAll(): InviteMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InviteMap) : {};
  } catch {
    return {};
  }
}

export function rememberInvite(publicToken: string, secretToken: string) {
  try {
    const all = readAll();
    all[publicToken] = secretToken;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
  }
}

export function getMySecretToken(publicToken: string): string | null {
  return readAll()[publicToken] ?? null;
}
