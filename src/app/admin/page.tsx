"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS, statusColor } from "@/lib/status";
import type { Order, OrderStatus, Profile, Restaurant } from "@/lib/types";

type AdminOrder = Order & { restaurants: { name: string } | null };

const ALL_STATUSES: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "rider_assigned",
  "picked_up",
  "delivered",
  "rejected",
  "cancelled",
  "refund_requested",
];

export default function AdminPortal() {
  const [me, setMe] = useState<Profile | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [riders, setRiders] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoaded(true);
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setMe((prof as Profile) ?? null);
    if ((prof as Profile)?.role !== "admin") {
      setLoaded(true);
      return;
    }
    const [restRes, riderRes, orderRes] = await Promise.all([
      supabase.from("restaurants").select("*").order("is_approved").order("name"),
      supabase.from("profiles").select("*").eq("role", "rider").order("is_approved"),
      supabase
        .from("orders")
        .select("*, restaurants(name)")
        .order("placed_at", { ascending: false })
        .limit(30),
    ]);
    setRestaurants((restRes.data as Restaurant[]) ?? []);
    setRiders((riderRes.data as Profile[]) ?? []);
    setOrders((orderRes.data as AdminOrder[]) ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approveRestaurant(id: string, approved: boolean) {
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_approve_restaurant", {
      p_restaurant: id,
      p_approved: approved,
    });
    if (error) setError(error.message);
    else load();
  }

  async function approveRider(id: string, approved: boolean) {
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_role", {
      p_user: id,
      p_role: "rider",
      p_approved: approved,
    });
    if (error) setError(error.message);
    else load();
  }

  async function forceStatus(orderId: string, to: OrderStatus) {
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_order_status", {
      p_order: orderId,
      p_to: to,
    });
    if (error) setError(error.message);
    else load();
  }

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center bg-amber-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!me || me.role !== "admin") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-amber-50 px-6 dark:bg-zinc-950">
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Admin only
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This area is for the FoodVibe team.
        </p>
      </div>
    );
  }

  const pendingRestaurants = restaurants.filter((r) => !r.is_approved);
  const approvedRestaurants = restaurants.filter((r) => r.is_approved);
  const pendingRiders = riders.filter((r) => !r.is_approved);
  const approvedRiders = riders.filter((r) => r.is_approved);

  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Admin
        </h1>

        {error && (
          <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            🏪 Restaurants awaiting approval ({pendingRestaurants.length})
          </h2>
          {pendingRestaurants.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {r.name}
                </p>
                <p className="text-xs text-zinc-500">{r.address}</p>
              </div>
              <button
                onClick={() => approveRestaurant(r.id, true)}
                className="flex-none rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          ))}
          {pendingRestaurants.length === 0 && (
            <p className="rounded-lg border border-dashed border-amber-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800">
              None pending.
            </p>
          )}
          {approvedRestaurants.length > 0 && (
            <details className="text-sm text-zinc-600 dark:text-zinc-400">
              <summary className="cursor-pointer">
                Approved ({approvedRestaurants.length})
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {approvedRestaurants.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span>{r.name}</span>
                    <button
                      onClick={() => approveRestaurant(r.id, false)}
                      className="text-xs text-red-600 underline dark:text-red-400"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            🛵 Riders awaiting approval ({pendingRiders.length})
          </h2>
          {pendingRiders.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {r.full_name || "Unnamed rider"}
                </p>
                <p className="text-xs text-zinc-500">{r.phone ?? "no phone"}</p>
              </div>
              <button
                onClick={() => approveRider(r.id, true)}
                className="flex-none rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          ))}
          {pendingRiders.length === 0 && (
            <p className="rounded-lg border border-dashed border-amber-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800">
              None pending.
            </p>
          )}
          {approvedRiders.length > 0 && (
            <p className="text-xs text-zinc-500">
              {approvedRiders.length} approved rider
              {approvedRiders.length > 1 ? "s" : ""}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            📋 Recent orders ({orders.length})
          </h2>
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {o.restaurants?.name} · Rs {o.total_rs}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(o.status)}`}
                >
                  {STATUS_LABELS[o.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {new Date(o.placed_at).toLocaleString("en-PK", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · {o.delivery_address}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Force status:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value)
                      forceStatus(o.id, e.target.value as OrderStatus);
                  }}
                  className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="" disabled>
                    choose…
                  </option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
