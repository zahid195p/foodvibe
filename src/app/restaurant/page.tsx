"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS, statusColor } from "@/lib/status";
import type { Order, OrderStatus, Profile, Restaurant } from "@/lib/types";

type InboxOrder = Order & {
  order_items: { name_snapshot: string; qty: number }[];
};

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // audio not available — ignore
  }
}

export default function RestaurantPortal() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<InboxOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const restaurantRef = useRef<Restaurant | null>(null);

  const loadAll = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSignedIn(false);
      setLoaded(true);
      return;
    }
    setSignedIn(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile((prof as Profile) ?? null);

    const { data: rest } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    setRestaurant((rest as Restaurant) ?? null);
    restaurantRef.current = (rest as Restaurant) ?? null;
    setLoaded(true);
  }, []);

  const loadOrders = useCallback(async () => {
    const rest = restaurantRef.current;
    if (!rest) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(name_snapshot, qty)")
      .eq("restaurant_id", rest.id)
      .order("placed_at", { ascending: false })
      .limit(50);
    setOrders((data as InboxOrder[]) ?? []);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!restaurant) return;
    loadOrders();
    const supabase = createClient();
    const channel = supabase
      .channel(`restaurant-orders-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          beep();
          loadOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => loadOrders()
      )
      .subscribe();
    const timer = setInterval(loadOrders, 20000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [restaurant, loadOrders]);

  async function requestRestaurantRole() {
    const supabase = createClient();
    const { error } = await supabase.rpc("request_role", {
      p_role: "restaurant",
    });
    if (error) setError(error.message);
    else loadAll();
  }

  async function registerRestaurant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("restaurants").insert({
      owner_id: user.id,
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      address: String(form.get("address") ?? ""),
      min_order_rs: Number(form.get("min_order") ?? 0),
      packaging_fee_rs: Number(form.get("packaging") ?? 0),
    });
    if (error) setError(error.message);
    else loadAll();
  }

  async function toggleOpen() {
    if (!restaurant) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({ is_open: !restaurant.is_open })
      .eq("id", restaurant.id);
    if (error) setError(error.message);
    else loadAll();
  }

  async function setStatus(orderId: string, to: OrderStatus) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("restaurant_set_status", {
      p_order: orderId,
      p_to: to,
    });
    if (error) setError(error.message);
    else loadOrders();
  }

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center bg-amber-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (signedIn === false) {
    return (
      <Gate>
        <p className="text-zinc-700 dark:text-zinc-300">
          Run your restaurant on FoodVibe — zero commission, every rupee is
          yours.
        </p>
        <Link
          href="/restaurant/login"
          className="rounded-lg bg-amber-700 px-5 py-2.5 font-semibold text-white hover:bg-amber-800"
        >
          Partner sign in
        </Link>
      </Gate>
    );
  }

  if (profile && profile.role !== "restaurant" && profile.role !== "admin") {
    return (
      <Gate>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Partner with FoodVibe
        </h1>
        <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
          List your restaurant, receive orders, keep 100% of the money.
          Foodpanda takes up to 30% — we take nothing, forever.
        </p>
        {error && <ErrorNote message={error} />}
        <button
          onClick={requestRestaurantRole}
          className="rounded-lg bg-amber-700 px-5 py-2.5 font-semibold text-white hover:bg-amber-800"
        >
          Become a restaurant partner
        </button>
      </Gate>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Register your restaurant
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Fill this in and our team approves you — usually within a day.
          </p>
          <form onSubmit={registerRestaurant} className="flex flex-col gap-4">
            <Field label="Restaurant name" name="name" required />
            <Field label="Short description" name="description" />
            <Field label="Full address" name="address" required />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Minimum order (Rs)" name="min_order" type="number" defaultValue="0" />
              <Field label="Packaging fee (Rs)" name="packaging" type="number" defaultValue="0" />
            </div>
            {error && <ErrorNote message={error} />}
            <button
              type="submit"
              className="rounded-lg bg-amber-700 px-4 py-2.5 font-semibold text-white hover:bg-amber-800"
            >
              Submit for approval
            </button>
          </form>
        </main>
      </div>
    );
  }

  const groups: {
    title: string;
    statuses: OrderStatus[];
    actions?: { label: string; to: OrderStatus; danger?: boolean }[];
  }[] = [
    {
      title: "🆕 New orders",
      statuses: ["placed"],
      actions: [
        { label: "Accept", to: "accepted" },
        { label: "Reject", to: "rejected", danger: true },
      ],
    },
    {
      title: "👨‍🍳 In the kitchen",
      statuses: ["accepted", "preparing"],
      actions: [{ label: "Mark ready for pickup", to: "ready" }],
    },
    { title: "📦 Waiting for rider", statuses: ["ready"] },
    { title: "🛵 Out for delivery", statuses: ["rider_assigned", "picked_up"] },
    {
      title: "Done (recent)",
      statuses: ["delivered", "rejected", "cancelled", "refund_requested"],
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {restaurant.name}
            </h1>
            {!restaurant.is_approved && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                ⏳ Pending admin approval — you won&apos;t appear to buyers yet
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/restaurant/menu"
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:border-zinc-700 dark:text-amber-500 dark:hover:bg-zinc-900"
            >
              Edit menu
            </Link>
            <button
              onClick={toggleOpen}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                restaurant.is_open
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-zinc-500 hover:bg-zinc-600"
              }`}
            >
              {restaurant.is_open ? "Open — tap to close" : "Closed — tap to open"}
            </button>
          </div>
        </div>

        {error && <ErrorNote message={error} />}

        {groups.map((group) => {
          const groupOrders = orders.filter((o) =>
            group.statuses.includes(o.status)
          );
          if (groupOrders.length === 0 && group.title.startsWith("Done"))
            return null;
          return (
            <section key={group.title} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {group.title} ({groupOrders.length})
              </h2>
              {groupOrders.length === 0 ? (
                <p className="rounded-lg border border-dashed border-amber-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800">
                  Nothing here right now.
                </p>
              ) : (
                groupOrders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Rs {o.total_rs} · COD
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(o.status)}`}
                      >
                        {STATUS_LABELS[o.status]}
                      </span>
                    </div>
                    <ul className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {o.order_items.map((item, i) => (
                        <li key={i}>
                          {item.qty} × {item.name_snapshot}
                        </li>
                      ))}
                    </ul>
                    {o.note && (
                      <p className="mt-1 text-sm italic text-amber-800 dark:text-amber-400">
                        “{o.note}”
                      </p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">
                      {o.delivery_address} ·{" "}
                      {new Date(o.placed_at).toLocaleTimeString("en-PK", {
                        timeStyle: "short",
                      })}
                    </p>
                    {group.actions && (
                      <div className="mt-3 flex gap-2">
                        {group.actions.map((action) => (
                          <button
                            key={action.to}
                            onClick={() => setStatus(o.id, action.to)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                              action.danger
                                ? "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                                : "bg-amber-700 text-white hover:bg-amber-800"
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-amber-50 px-6 dark:bg-zinc-950">
      {children}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
      {message}
    </p>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        min={type === "number" ? 0 : undefined}
        className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </label>
  );
}
