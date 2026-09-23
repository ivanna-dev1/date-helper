"use client";

import { useId, useState } from "react";
import { SHARE_TARGETS } from "@/lib/shareTargets";
import { useBrowserValue } from "@/hooks/useBrowserValue";

type ShareMenuProps = {
  path: string; // for example "/i/k7Fq2mXp9RtA"
  text: string; // the message; the link is added after it
  buttonLabel: string; // "Let Olia know"
  hint?: string; // a line above the button until something is picked
  // "main": the big pink button. "quiet": an outlined secondary button.
  variant?: "main" | "quiet";
  // Adds the sender's time zone to the link ("?tz=Europe/Kyiv"), so the
  // preview picture can show the time. The server does not know any zone,
  // and a friend is usually in the same city as the sender.
  withTimeZone?: boolean;
};

const BUTTON_STYLES = {
  main: "rounded-2xl bg-brand py-4 text-base font-semibold text-white",
  quiet: "rounded-xl border border-line py-3 text-sm font-medium text-muted",
};

// Small chips in rows of three: the list should not shout louder
// than the card itself.
const optionStyle =
  "flex items-center justify-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-ink";

/**
 * A main button that opens a list of messengers.
 *
 * We cannot know if the message was really sent: a messenger does not tell
 * us. So after any pick we only say "Sent? Great!".
 */
export function ShareMenu({
  path,
  text,
  buttonLabel,
  hint,
  variant = "main",
  withTimeZone = false,
}: ShareMenuProps) {
  // The site address and the phone share menu exist only in the browser.
  const fullLink = useBrowserValue<string | null>(() => {
    const link = `${window.location.origin}${path}`;
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
  // A unique id that links the button to its list (for screen readers).
  const optionsId = useId();

  async function handleSystemShare() {
    if (!fullLink) return;
    try {
      await navigator.share({ text, url: fullLink });
      setIsPicked(true);
    } catch {
      // The person closed the menu. Nothing to do.
    }
  }

  async function handleCopy() {
    if (!fullLink) return;
    // Only the link, so it can be pasted into a browser or a message.
    await navigator.clipboard.writeText(fullLink);
    setIsCopied(true);
    setIsPicked(true);
    // Put the button text back after a short moment.
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
              // Until the address is known, the link goes nowhere.
              href={fullLink ? target.buildUrl(text, fullLink) : undefined}
              // Web links open in a new tab. App links (viber:, sms:) must
              // not, or an empty tab stays behind.
              target={target.isWebLink ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={() => setIsPicked(true)}
              className={optionStyle}
            >
              {target.name}
            </a>
          ))}

          {/* The phone menu has every app, also Instagram and Signal.
              Computers often do not have it, so we hide it there. */}
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
