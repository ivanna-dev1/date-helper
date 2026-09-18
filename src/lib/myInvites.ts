// The author's own links, kept in their browser only.
//
// There are no accounts, so the author's page lives behind a secret link.
// If they lose it, nothing can bring it back: the server must not give a
// secret token to whoever asks. But the author's own browser may remember
// it — like a bookmark the app writes for them.
//
// The map is { publicToken: secretToken }. Nothing leaves the device.
const STORAGE_KEY = "date-helper:my-invites";

type InviteMap = Record<string, string>;

// localStorage can throw: private mode, blocked site data, old browsers.
// A missing memory is not a problem here, so we just give up quietly.
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
    // Nothing to do: the app works without this memory.
  }
}

// Gives the author's secret token for this invitation, or null when this
// browser never created it.
export function getMySecretToken(publicToken: string): string | null {
  return readAll()[publicToken] ?? null;
}
