import { PHOTO_MAX_SIDE } from "@/lib/photo";

// Shrinks a photo in the browser before upload (JPEG, longer side PHOTO_MAX_SIDE).
export async function shrinkPhoto(file: File): Promise<File> {
  const picture = await createImageBitmap(file);
  const scale = Math.min(
    1,
    PHOTO_MAX_SIDE / Math.max(picture.width, picture.height),
  );
  const width = Math.round(picture.width * scale);
  const height = Math.round(picture.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    // Very old browser: send the file as it is, the server still checks it.
    picture.close();
    return file;
  }
  context.drawImage(picture, 0, 0, width, height);
  picture.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    // 0.8: usual balance of quality and size.
    canvas.toBlob(resolve, "image/jpeg", 0.8),
  );
  if (!blob) return file;

  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
