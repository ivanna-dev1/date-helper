"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { PHOTO_TYPES } from "@/lib/photo";
import { shrinkPhoto } from "@/lib/shrinkPhoto";

type PhotoFieldProps = {
  photoUrl: string | null;
  label: string;
  onChange: (photoUrl: string | null) => void;
};

// Photo for one place: shrunk in the browser, uploaded to our route; only the URL goes with the form.
export function PhotoField({ photoUrl, label, onChange }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setIsSending(true);
    setError(null);
    try {
      const smaller = await shrinkPhoto(file);
      const form = new FormData();
      form.append("photo", smaller);
      const response = await fetch("/api/photo", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The photo did not upload");
        return;
      }
      onChange(result.url);
    } catch {
      setError("The photo did not upload");
    } finally {
      setIsSending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        // Hidden: file inputs look different in every browser.
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {photoUrl && (
        <Image
          src={photoUrl}
          alt={`Photo of ${label}`}
          width={400}
          height={220}
          className="h-28 w-full rounded-xl object-cover"
        />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isSending}
          className="rounded-xl border border-dashed border-line px-2.5 py-1.5 text-xs text-muted disabled:opacity-60"
        >
          {isSending
            ? "Adding…"
            : photoUrl
              ? `Change the photo of ${label}`
              : `Add a photo of ${label}`}
        </button>
        {photoUrl && !isSending && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-2 py-1.5 text-xs text-quiet"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}
