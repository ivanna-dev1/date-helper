import { put } from "@vercel/blob";
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from "@/lib/photo";

/** Saves one place photo in Vercel Blob. The storage token never reaches the browser. */
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("photo");

  if (!(file instanceof File)) {
    return Response.json({ error: "No photo" }, { status: 400 });
  }
  // Re-check on the server: the request may not come from our form.
  if (!PHOTO_TYPES.includes(file.type)) {
    return Response.json(
      { error: "Only a JPEG, PNG or WebP photo" },
      { status: 400 },
    );
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return Response.json({ error: "This photo is too big" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Photos are not set up yet" },
      { status: 500 },
    );
  }

  const blob = await put(`places/photo`, file, {
    access: "public",
    // Random name: uploads never overwrite each other and URLs cannot be guessed.
    addRandomSuffix: true,
    contentType: file.type,
  });

  return Response.json({ url: blob.url });
}
