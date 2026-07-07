"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Order, Profile } from "@/lib/types";

type RiderOrder = Order & {
  restaurants: { name: string; address: string } | null;
};

export default function RiderPortal() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [active, setActive] = useState<RiderOrder[]>([]);
  const [pool, setPool] = useState<RiderOrder[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
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

    if ((prof as Profile)?.role === "rider") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [activeRes, poolRes, doneRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, restaurants(name, address)")
          .eq("rider_id", user.id)
          .in("status", ["rider_assigned", "picked_up"])
          .order("placed_at"),
        supabase
          .from("orders")
          .select("*, restaurants(name, address)")
          .eq("status", "ready")
          .is("rider_id", null)
          .order("placed_at"),
        supabase
          .from("orders")
          .select("delivery_fee_rs")
          .eq("rider_id", user.id)
          .eq("status", "delivered")
          .gte("placed_at", startOfDay.toISOString()),
      ]);
      setActive((activeRes.data as RiderOrder[]) ?? []);
      setPool((poolRes.data as RiderOrder[]) ?? []);
      const done = doneRes.data ?? [];
      setTodayCount(done.length);
      setTodayEarnings(
        done.reduce((sum, o) => sum + (o.delivery_fee_rs ?? 0), 0)
      );
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function requestRiderRole() {
    const supabase = createClient();
    const { error } = await supabase.rpc("request_role", { p_role: "rider" });
    if (error) setError(error.message);
    else load();
  }

  async function acceptOrder(orderId: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("rider_accept", { p_order: orderId });
    if (error) setError(error.message);
    load();
  }

  async function pickUp(orderId: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("rider_set_status", {
      p_order: orderId,
      p_to: "picked_up",
    });
    if (error) setError(error.message);
    load();
  }

  async function deliver(orderId: string) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("rider_set_status", {
      p_order: orderId,
      p_to: "delivered",
      p_otp: otpInputs[orderId] ?? "",
    });
    if (error) setError(error.message);
    load();
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-amber-50 px-6 dark:bg-zinc-950">
        <p className="text-zinc-700 dark:text-zinc-300">
          Deliver with FoodVibe — keep 100% of every delivery fee and tip.
        </p>
        <Link
          href="/login?next=/rider"
          className="rounded-lg bg-amber-700 px-5 py-2.5 font-semibold text-white hover:bg-amber-800"
        >
          Sign in to get started
        </Link>
      </div>
    );
  }

  if (profile && profile.role !== "rider") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-amber-50 px-6 dark:bg-zinc-950">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Ride with FoodVibe
        </h1>
        <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
          Every delivery fee is yours — Rs 100 per delivery plus tips, no cuts.
          After you sign up, our team approves you (CNIC check comes at
          approval).
        </p>
        {error && (
          <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          onClick={requestRiderRole}
          className="rounded-lg bg-amber-700 px-5 py-2.5 font-semibold text-white hover:bg-amber-800"
        >
          Become a rider
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Rider dashboard
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Today: <strong>{todayCount}</strong> delivered ·{" "}
            <strong>Rs {todayEarnings}</strong>
          </p>
        </div>

        {profile && !profile.is_approved && (
          <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            ⏳ Your rider account is awaiting admin approval. You can see
            deliveries but can&apos;t accept them yet.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {active.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              🛵 Your active delivery
            </h2>
            {active.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border-2 border-amber-500 bg-white p-4 dark:bg-zinc-900"
              >
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {o.restaurants?.name}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Pick up: {o.restaurants?.address}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Deliver to: {o.delivery_address}
                </p>
                <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
                  💵 Collect Rs {o.total_rs} cash (your delivery fee: Rs{" "}
                  {o.delivery_fee_rs})
                </p>
                {o.status === "rider_assigned" ? (
                  <button
                    onClick={() => pickUp(o.id)}
                    className="mt-3 w-full rounded-lg bg-amber-700 px-4 py-2.5 font-semibold text-white hover:bg-amber-800"
                  >
                    I&apos;ve picked up the food
                  </button>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="4-digit code from customer"
                      value={otpInputs[o.id] ?? ""}
                      onChange={(e) =>
                        setOtpInputs({ ...otpInputs, [o.id]: e.target.value })
                      }
                      className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-center text-lg font-bold tracking-widest text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      onClick={() => deliver(o.id)}
                      className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                    >
                      Delivered ✓
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            📦 Ready for pickup ({pool.length})
          </h2>
          {pool.length === 0 ? (
            <p className="rounded-lg border border-dashed border-amber-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800">
              No deliveries waiting — new ones appear here automatically.
            </p>
          ) : (
            pool.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {o.restaurants?.name}
                  </p>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Earn Rs {o.delivery_fee_rs}
                  </p>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  From: {o.restaurants?.address}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  To: {o.delivery_address}
                </p>
                <button
                  onClick={() => acceptOrder(o.id)}
                  disabled={!profile?.is_approved}
                  className="mt-3 w-full rounded-lg bg-amber-700 px-4 py-2.5 font-semibold text-white hover:bg-amber-800 disabled:opacity-40"
                >
                  Accept delivery
                </button>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
