import { WhoPays } from "@/generated/prisma/enums";

// "My treat" reads differently for the author and the invited person.
export type Viewer = "author" | "guest";

// A quiet line about the bill, or null when nobody chose.
export function getWhoPaysText(
  whoPays: WhoPays | null,
  authorName: string,
  guestName: string,
  viewer: Viewer,
): string | null {
  switch (whoPays) {
    case WhoPays.MY_TREAT:
      return viewer === "author"
        ? "My treat"
        : `${authorName} is treating`;
    case WhoPays.GUEST_TREAT:
      return viewer === "guest"
        ? "My treat"
        : `${guestName} is treating`;
    case WhoPays.SPLIT:
      return "Splitting the bill";
    case WhoPays.DECIDE_LATER:
      return "Who pays — you'll decide later";
    default:
      return null;
  }
}

// From the chooser's side: "me" is always "I pay"; "other" is the other person's own offer.
// Never ask them to pay: "Decide later" covers that.
export type PayChoice = "me" | "other" | "split" | "later" | null;

export function toWhoPays(choice: PayChoice, viewer: Viewer): WhoPays | null {
  if (choice === "me") {
    return viewer === "author" ? WhoPays.MY_TREAT : WhoPays.GUEST_TREAT;
  }
  if (choice === "other") {
    return viewer === "author" ? WhoPays.GUEST_TREAT : WhoPays.MY_TREAT;
  }
  if (choice === "split") return WhoPays.SPLIT;
  if (choice === "later") return WhoPays.DECIDE_LATER;
  return null;
}

// Sent only after a chip click, so changing the place does not wipe it.
export function toPayChoice(
  whoPays: WhoPays | null,
  viewer: Viewer,
): PayChoice {
  if (whoPays === WhoPays.SPLIT) return "split";
  if (whoPays === WhoPays.DECIDE_LATER) return "later";
  if (whoPays === WhoPays.MY_TREAT) return viewer === "author" ? "me" : "other";
  if (whoPays === WhoPays.GUEST_TREAT)
    return viewer === "guest" ? "me" : "other";
  return null;
}

// Chips in display order; clicking the picked one clears it. otherName adds the other person's own offer.
export function getPayChoices(
  otherName: string | null,
): { value: Exclude<PayChoice, null>; label: string }[] {
  return [
    ...(otherName
      ? [{ value: "other" as const, label: `${otherName}'s treat` }]
      : []),
    { value: "me", label: "My treat" },
    { value: "split", label: "Split it" },
    { value: "later", label: "Decide later" },
  ];
}
