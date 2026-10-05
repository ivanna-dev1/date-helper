import type { Viewer } from "@/lib/whoPays";
import type { LastWords } from "@/lib/responseView";

type LastMessageProps = {
  words: LastWords | null;
  viewer: Viewer;
  authorName: string;
  guestName: string;
};

export function LastMessage({
  words,
  viewer,
  authorName,
  guestName,
}: LastMessageProps) {
  if (!words) return null;

  const name =
    words.by === viewer
      ? "You"
      : words.by === "author"
        ? authorName
        : guestName;

  return (
    <p className="w-full rounded-xl border-l-4 border-brand bg-bg p-4 text-left text-base text-ink">
      <span className="font-semibold">{name}:</span> {words.text}
    </p>
  );
}
