"use client";

import { useState } from "react";

// Shared styles. We keep them in one place so all fields look the same.
const labelStyle =
  "mb-1.5 text-xs font-medium uppercase tracking-wide text-muted";
const fieldStyle =
  "rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none placeholder:text-quiet focus:border-accent";

export function CreateInviteForm() {
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");

  return (
    <form className="flex flex-col gap-5">
      <div className="flex flex-col">
        <label htmlFor="authorName" className={labelStyle}>
          Your name
        </label>
        <input
          id="authorName"
          name="authorName"
          type="text"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder="Olia"
          maxLength={50}
          className={fieldStyle}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="message" className={labelStyle}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Max, want to grab a coffee this weekend?"
          maxLength={300}
          rows={3}
          className={`${fieldStyle} resize-none`}
        />
      </div>

      <button
        type="submit"
        className="mt-2 rounded-2xl bg-brand py-4 text-base font-semibold text-white"
      >
        Create invitation
      </button>
    </form>
  );
}
