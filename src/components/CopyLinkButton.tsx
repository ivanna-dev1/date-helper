"use client";

import { useEffect, useState } from "react";

type CopyLinkButtonProps = {
  path: string; // for example "/i/k7Fq2mXp9RtA"
};

export function CopyLinkButton({ path }: CopyLinkButtonProps) {
  const [fullLink, setFullLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The site address (localhost now, a real domain later) is known only in
  // the browser. Reading it during render would break hydration.
  useEffect(() => {
    setFullLink(`${window.location.origin}${path}`);
  }, [path]);

  async function handleCopy() {
    if (!fullLink) return;

    await navigator.clipboard.writeText(fullLink);
    setCopied(true);
    // Put the button text back after a short moment.
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="break-all rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink">
        {fullLink ?? path}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-2xl bg-brand py-4 text-base font-semibold text-white"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
