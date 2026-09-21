import { WhoPays } from "@/generated/prisma/enums";

// Who looks at the page: the author or the invited person.
// "My treat" means different words for each of them.
export type Viewer = "author" | "guest";

// A short quiet line about the bill, or null when nobody chose
// (then we show nothing).
// MY_TREAT means the author pays, GUEST_TREAT — the invited person.
export function getWhoPaysText(
  whoPays: WhoPays | null,
  authorName: string,
  guestName: string,
  viewer: Viewer,
): string | null {
  switch (whoPays) {
    case WhoPays.MY_TREAT:
      return viewer === "author" ? "Your treat" : `${authorName} is treating`;
    case WhoPays.GUEST_TREAT:
      return viewer === "guest" ? "Your treat" : `${guestName} is treating`;
    case WhoPays.SPLIT:
      return "Splitting the bill";
    case WhoPays.DECIDE_LATER:
      return "Who pays — you'll decide later";
    default:
      return null;
  }
}

// The same choice seen from the person who is choosing: "me" is always
// "I pay", whoever I am. There is no "you pay" on purpose: asking the other
// person to pay feels rude on a date — "Decide later" covers that.
export type PayChoice = "me" | "split" | "later" | null;

export function toWhoPays(choice: PayChoice, viewer: Viewer): WhoPays | null {
  if (choice === "me") {
    return viewer === "author" ? WhoPays.MY_TREAT : WhoPays.GUEST_TREAT;
  }
  if (choice === "split") return WhoPays.SPLIT;
  if (choice === "later") return WhoPays.DECIDE_LATER;
  return null;
}

// The other person's "My treat" is not a chip for this viewer, so it shows
// as nothing picked. The forms send who pays only after a click on a chip,
// so it is not wiped by someone who only changes the place.
export function toPayChoice(
  whoPays: WhoPays | null,
  viewer: Viewer,
): PayChoice {
  if (whoPays === WhoPays.SPLIT) return "split";
  if (whoPays === WhoPays.DECIDE_LATER) return "later";
  if (whoPays === WhoPays.MY_TREAT && viewer === "author") return "me";
  if (whoPays === WhoPays.GUEST_TREAT && viewer === "guest") return "me";
  return null;
}

// The chips, in the order people see them. A click on the picked one
// clears it: not choosing is fine too.
export const PAY_CHOICES: { value: Exclude<PayChoice, null>; label: string }[] =
  [
    { value: "me", label: "My treat" },
    { value: "split", label: "Split it" },
    { value: "later", label: "Decide later" },
  ];
