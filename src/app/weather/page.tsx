import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Weather — Date Helper",
};

// Only our own pages are allowed as "back": a path that starts with "/".
// "//other-site.com" also starts with "/", but it leads to another site,
// so we stop it too.
function getSafeBackPath(back: string | string[] | undefined): string {
  if (typeof back === "string" && back.startsWith("/") && !back.startsWith("//")) {
    return back;
  }
  return "/";
}

// The weather is not ready yet. The button already exists, so the product
// looks complete; this page says honestly that the feature is coming.
export default async function WeatherPage(props: PageProps<"/weather">) {
  const { back } = await props.searchParams;
  const backPath = getSafeBackPath(back);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">
        Weather is coming soon{" "}
        <span aria-hidden="true">🌤</span>
      </h1>
      <p className="text-base text-muted">
        Soon you will see the forecast for your date right here.
      </p>
      <Link href={backPath} className="text-sm font-medium text-accent">
        ← Back to the date
      </Link>
    </main>
  );
}
