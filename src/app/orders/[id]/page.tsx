"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS, STATUS_ORDER, TIMELINE_STEPS, statusColor } from "@/lib/status";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

type OrderWithDetails = Order & {
  restaurants: { name: string; address: string } | null;
  order_items: OrderItem[];
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select(
        "*, restaurants(name, address), order_items(id, order_id, name_snapshot, price_rs, qty)"
      )
      .eq("id", id)
      .maybeSingle();
    setOrder((data as OrderWithDetails) ?? null);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => load()
      )
      .subscribe();
    const timer = setInterval(load, 20000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [id, load]);

  useEffect(() => {
    if (!order || otp) return;
    if (["ready", "rider_assigned", "picked_up"].includes(order.status)) {
      const supabase = createClient();
      supabase
        .rpc("get_handover_otp", { p_order: order.id })
        .then(({ data }) => {
          if (data) setOtp(data as string);
        });
    }
  }, [order, otp]);

  async function cancelOrder() {
    if (!order || !confirm("Cancel this order?")) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("buyer_cancel", { p_order: order.id });
    if (error) setError(error.message);
    else load();
  }

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center bg-amber-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-amber-50 dark:bg-zinc-950">
        <p className="text-zinc-700 dark:text-zinc-300">Order not found.</p>
        <Link href="/orders" className="text-amber-700 underline dark:text-amber-500">
          My orders
        </Link>
      </div>
    );
  }

  const stepIndex = STATUS_ORDER[order.status];
  const isBad = stepIndex === -1;

  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {order.restaurants?.name ?? "Order"}
          </h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(order.status as OrderStatus)}`}
          >
            {STATUS_LABELS[order.status as OrderStatus]}
          </span>
        </div>

        {isBad ? (
          <p className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            This order was {STATUS_LABELS[order.status as OrderStatus].toLowerCase()}.
            {order.status === "rejected" &&
              " The restaurant couldn't take it — nothing has been charged."}
          </p>
        ) : (
          <ol className="flex flex-col gap-0.5">
            {TIMELINE_STEPS.map((step, i) => {
              const done = stepIndex >= i;
              const current = stepIndex === i;
              return (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                      done
                        ? "bg-amber-700 text-white"
                        : "border border-zinc-300 text-zinc-400 dark:border-zinc-700"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={`py-1 text-sm ${
                      current
                        ? "font-bold text-zinc-900 dark:text-zinc-50"
                        : done
                          ? "text-zinc-700 dark:text-zinc-300"
                          : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {otp && !isBad && order.status !== "delivered" && (
          <div className="rounded-xl border-2 border-amber-500 bg-white p-4 text-center dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Give this code to your rider at delivery
            </p>
            <p className="mt-1 text-4xl font-bold tracking-[0.3em] text-amber-700 dark:text-amber-500">
              {otp}
            </p>
          </div>
        )}

        <section className="rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <ul className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.qty} × {item.name_snapshot}
                </span>
                <span className="tabular-nums">Rs {item.price_rs * item.qty}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-dashed border-amber-200 pt-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            <p className="flex justify-between">
              <span>Delivery</span>
              <span className="tabular-nums">Rs {order.delivery_fee_rs}</span>
            </p>
            {order.packaging_fee_rs > 0 && (
              <p className="flex justify-between">
                <span>Packaging</span>
                <span className="tabular-nums">Rs {order.packaging_fee_rs}</span>
              </p>
            )}
            <p className="mt-1 flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-100">
              <span>Total ({order.payment_method.toUpperCase()})</span>
              <span className="tabular-nums">Rs {order.total_rs}</span>
            </p>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Deliver to: {order.delivery_address}
          </p>
        </section>

        {error && (
          <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {order.status === "placed" && (
          <button
            onClick={cancelOrder}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Cancel order
          </button>
        )}

        <Link href="/orders" className="text-sm text-zinc-500 underline">
          ← Back to my orders
        </Link>
      </main>
    </div>
  );
}
