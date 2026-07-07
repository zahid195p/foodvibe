import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, statusColor } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_rs, placed_at, restaurants(name)")
    .eq("buyer_id", user.id)
    .order("placed_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          My orders
        </h1>
        {orders && orders.length > 0 ? (
          <div className="flex flex-col gap-3">
            {orders.map((o) => {
              const restaurant = o.restaurants as unknown as {
                name: string;
              } | null;
              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="rounded-xl border border-amber-200 bg-white p-4 transition-colors hover:border-amber-500 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {restaurant?.name ?? "Restaurant"}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(o.status as OrderStatus)}`}
                    >
                      {STATUS_LABELS[o.status as OrderStatus]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Rs {o.total_rs} ·{" "}
                    {new Date(o.placed_at).toLocaleString("en-PK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-700 dark:text-zinc-300">No orders yet.</p>
            <Link
              href="/"
              className="mt-1 inline-block text-amber-700 underline dark:text-amber-500"
            >
              Browse restaurants
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
