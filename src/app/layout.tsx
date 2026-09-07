import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Date Helper — запроси на побачення",
  description:
    "Створи запрошення з варіантами часу і місця, скинь посилання — і домовтесь без зайвого листування.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* Продукт відкривають з телефона, тому вміст завжди вузький
            і по центру — навіть на великому екрані. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-5">
          {children}
        </div>
      </body>
    </html>
  );
}
