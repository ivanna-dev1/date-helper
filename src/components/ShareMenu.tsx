"use client";

import { useId, useState } from "react";
import { SHARE_TARGETS } from "@/lib/shareTargets";
import { getShareOrigin } from "@/lib/siteUrl";
import { useBrowserValue } from "@/hooks/useBrowserValue";

type ShareMenuProps = {
  path: string;
  text: string;
  buttonLabel: string;
  hint?: string;
  variant?: "main" | "quiet";
  // Adds the sender's time zone (?tz=) so the preview image can show the time.
  withTimeZone?: boolean;
};

const BUTTON_STYLES = {
  main: "rounded-2xl bg-brand py-4 text-base font-semibold text-white",
  quiet: "rounded-xl border border-line py-3 text-sm font-medium text-muted",
};

const optionStyle =
  "flex items-center justify-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-ink";

// A button that opens a list of messengers. We cannot tell whether the message was sent.
export function ShareMenu({
  path,
  text,
  buttonLabel,
  hint,
  variant = "main",
  withTimeZone = false,
}: ShareMenuProps) {
  const fullLink = useBrowserValue<string | null>(() => {
    const link = `${getShareOrigin()}${path}`;
    if (!withTimeZone) return link;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `${link}${path.includes("?") ? "&" : "?"}tz=${encodeURIComponent(zone)}`;
  }, null);
  const canUseSystemShare = useBrowserValue(
    () => typeof navigator.share === "function",
    false,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isPicked, setIsPicked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const optionsId = useId();

  async function handleSystemShare() {
    if (!fullLink) return;
    try {
      await navigator.share({ text, url: fullLink });
      setIsPicked(true);
    } catch {
      // Menu closed; nothing to do.
    }
  }

  async function handleCopy() {
    if (!fullLink) return;
    await navigator.clipboard.writeText(fullLink);
    setIsCopied(true);
    setIsPicked(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {hint && !isPicked && (
        <p className="text-center text-base font-semibold text-accent">
          {hint}
        </p>
      )}
      {isPicked && (
        <p className="text-center text-base font-semibold text-accent">
          Sent? Great!
        </p>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={optionsId}
        className={BUTTON_STYLES[variant]}
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div id={optionsId} className="grid grid-cols-3 gap-1.5">
          {SHARE_TARGETS.map((target) => (
            <a
              key={target.name}
              href={fullLink ? target.buildUrl(text, fullLink) : undefined}
              // App links (viber:, sms:) must not open a new tab.
              target={target.isWebLink ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={() => setIsPicked(true)}
              className={optionStyle}
            >
              {target.name}
            </a>
          ))}

          {canUseSystemShare && (
            <button
              type="button"
              onClick={handleSystemShare}
              className={optionStyle}
            >
              More
            </button>
          )}

          <button type="button" onClick={handleCopy} className={optionStyle}>
            {isCopied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
