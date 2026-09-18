import { WhoPays } from "@/generated/prisma/enums";

// Who looks at the page: the author or the invited person.
// "My treat" means different words for each of them.
export type Viewer = "author" | "guest";

// A short quiet line for the confirmed date, or null when the author
// did not choose (then we show nothing).
export function getWhoPaysText(
  whoPays: WhoPays | null,
  authorName: string,
  viewer: Viewer,
): string | null {
  switch (whoPays) {
    case WhoPays.MY_TREAT:
      return viewer === "author" ? "Your treat" : `${authorName} is treating`;
    case WhoPays.SPLIT:
      return "Splitting the bill";
    case WhoPays.DECIDE_LATER:
      return "Who pays — you'll decide later";
    default:
      return null;
  }
}
