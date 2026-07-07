import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, description, address, is_open, min_order_rs")
    .eq("is_approved", true)
    .order("is_open", { ascending: false })
    .order("name");

  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-500">
            کھانا، بغیر کمیشن کے
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Order food, zero commission
          </h1>
          <p className="max-w-md text-zinc-600 dark:text-zinc-400">
            Every rupee goes to the restaurant and the rider. Cash on
            delivery.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Restaurants
          </h2>
          {restaurants && restaurants.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {restaurants.map((r) => (
                <Link
                  key={r.id}
                  href={`/r/${r.id}`}
                  className={`rounded-xl border bg-white p-4 transition-colors hover:border-amber-500 dark:bg-zinc-900 ${
                    r.is_open
                      ? "border-amber-200 dark:border-zinc-800"
                      : "border-zinc-200 opacity-60 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {r.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.is_open
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {r.is_open ? "Open" : "Closed"}
                    </span>
                  </div>
                  {r.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {r.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    {r.address}
                    {r.min_order_rs > 0 && ` · Min Rs ${r.min_order_rs}`}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-amber-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                No restaurants yet — launching soon!
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Own a restaurant?{" "}
                <Link
                  href="/restaurant"
                  className="text-amber-700 underline dark:text-amber-500"
                >
                  Join FoodVibe free
                </Link>{" "}
                — we take no commission, ever.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-amber-100 pt-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          <Link href="/restaurant" className="hover:text-amber-700 dark:hover:text-amber-500">
            For restaurants
          </Link>
          <Link href="/rider" className="hover:text-amber-700 dark:hover:text-amber-500">
            For riders
          </Link>
          <a
            href="https://github.com/zahid195p/foodvibe"
            className="hover:text-amber-700 dark:hover:text-amber-500"
          >
            Open source (AGPL)
          </a>
        </footer>
      </main>
    </div>
  );
}
