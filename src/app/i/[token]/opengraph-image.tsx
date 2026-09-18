import { ImageResponse } from "next/og";
import { getInviteCard, getInviteForCard } from "@/lib/inviteCard";

// The picture a messenger shows under the link ("screen 0").
// Next.js adds the <meta property="og:image"> tag for this page by itself.
export const alt = "An invitation from Date Helper";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Colors from the mockup. This file draws a picture, not HTML,
// so Tailwind classes do not work here: only inline styles.
const COLORS = {
  pink: "#E8B4C8",
  peach: "#D4847C",
  surface: "#FFFBF8",
  ink: "#2C2C2C",
  muted: "#8A8A8A",
};

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteForCard(token);

  const card = invite
    ? getInviteCard(invite)
    : {
        emoji: "✨",
        title: "Date Helper",
        subtitle: "Ask someone out, the easy way",
        quote: null,
      };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${COLORS.pink} 0%, ${COLORS.peach} 100%)`,
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
            gap: 24,
            background: COLORS.surface,
            borderRadius: 40,
            padding: 60,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 96 }}>{card.emoji}</div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.ink,
              lineHeight: 1.15,
            }}
          >
            {card.title}
          </div>
          {card.quote && (
            <div
              style={{
                fontSize: 34,
                color: COLORS.ink,
                borderLeft: `8px solid ${COLORS.pink}`,
                paddingLeft: 24,
              }}
            >
              {card.quote}
            </div>
          )}
          <div style={{ fontSize: 34, color: COLORS.muted }}>
            {card.subtitle}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
