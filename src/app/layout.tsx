import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
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
