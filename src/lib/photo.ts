
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// After shrinking a photo is about 200 KB; the server refuses bigger files.
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

// Longer side of the saved picture.
export const PHOTO_MAX_SIDE = 1200;

// Only addresses from our own blob storage are accepted, so a direct request cannot put any URL on our page.
const BLOB_HOST_ENDING = ".public.blob.vercel-storage.com";

export function isOurPhotoUrl(url: string): boolean {
  try {
    const address = new URL(url);
    return (
      address.protocol === "https:" &&
      address.hostname.endsWith(BLOB_HOST_ENDING)
    );
  } catch {
    return false;
  }
}

export function toSafePhotoUrl(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  return value !== "" && isOurPhotoUrl(value) ? value : null;
}
