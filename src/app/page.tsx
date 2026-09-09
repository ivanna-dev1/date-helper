import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold leading-tight text-ink">
          Ask someone out —<br />
          without the back-and-forth
        </h1>
        <p className="text-base leading-relaxed text-muted">
          Pick a few times and places, add a note, and share the link. They just
          choose what works for them.
        </p>
      </div>

      <Link
        href="/create"
        className="w-full rounded-2xl bg-brand py-4 text-center text-base font-semibold text-white"
      >
        Create an invitation
      </Link>

      <p className="text-xs text-quiet">No sign-up — all you need is a link</p>
    </main>
  );
}
