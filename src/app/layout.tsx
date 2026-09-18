import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
});

// Links in <meta> tags (like the preview picture) must be full addresses.
// On Vercel, VERCEL_PROJECT_PRODUCTION_URL holds the site domain;
// on a computer we use localhost.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Date Helper — ask someone out, the easy way",
  description:
    "Pick a few times and places, add a note, and share one link. They choose what works — no back-and-forth.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* People open this on a phone, so the content is always
            narrow and centered — even on a big screen. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-5">
          {children}
        </div>
      </body>
    </html>
  );
}
