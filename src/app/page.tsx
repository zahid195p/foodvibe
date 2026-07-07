import Link from "next/link";

const portals = [
  {
    href: "/restaurant",
    title: "Restaurant portal",
    desc: "Receive orders, manage your menu, set prep times.",
  },
  {
    href: "/rider",
    title: "Rider portal",
    desc: "Accept deliveries, collect COD, keep 100% of your earnings.",
  },
  {
    href: "/admin",
    title: "Admin",
    desc: "KYC approvals, disputes, zones.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-500">
            کھانا، بغیر کمیشن کے
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            FoodVibe
          </h1>
          <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            Open-source, zero-commission food delivery for Pakistan. No cut
            from restaurants, riders, or buyers — ever.
          </p>
          <div>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-amber-700 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-amber-800"
            >
              Sign in / Create account
            </Link>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Buyer ordering opens in Phase 1. The other interfaces:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {portals.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="rounded-xl border border-amber-200 bg-white p-4 transition-colors hover:border-amber-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-600"
              >
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {p.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {p.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <footer className="text-sm text-zinc-500 dark:text-zinc-500">
          Free and open source under AGPL-3.0 ·{" "}
          <a
            href="https://github.com/zahid195p/foodvibe"
            className="underline hover:text-amber-700 dark:hover:text-amber-500"
          >
            Contribute on GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}
