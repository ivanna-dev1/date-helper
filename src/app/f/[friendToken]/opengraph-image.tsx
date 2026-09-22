import { ImageResponse } from "next/og";
import { getFriendCard } from "@/lib/friendCard";

// The picture a messenger shows under the friend's link.
// Calm on purpose: a plain card, no gradient, no emoji.
export const alt = "A date plan from Date Helper";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Colors from the mockup. A picture, not HTML: only inline styles.
const COLORS = {
  background: "#F8F5F2",
  line: "#E8B4C8",
  surface: "#FFFBF8",
  ink: "#2C2C2C",
  muted: "#8A8A8A",
};

export default async function Image({
  params,
}: {
  params: Promise<{ friendToken: string }>;
}) {
  const { friendToken } = await params;
  const card = (await getFriendCard(friendToken)) ?? {
    title: "Date plan",
    subtitle: "Open to see the plan",
  };

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: COLORS.background,
        padding: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: COLORS.surface,
          border: `4px solid ${COLORS.line}`,
          borderRadius: 40,
          padding: 60,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            color: COLORS.ink,
            lineHeight: 1.15,
          }}
        >
          {card.title}
        </div>
        <div style={{ fontSize: 36, color: COLORS.muted }}>{card.subtitle}</div>
      </div>
    </div>,
    { ...size },
  );
}
