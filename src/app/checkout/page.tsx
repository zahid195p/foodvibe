"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Cart } from "@/lib/cart";
import { cartSubtotal, readCart, writeCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";

const DELIVERY_FEE_RS = 100;

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCart(readCart());
    setLoaded(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!cart) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("place_order", {
      p_restaurant: cart.restaurantId,
      p_items: cart.lines.map((l) => ({ menu_item_id: l.id, qty: l.qty })),
      p_address: address,
      p_note: note,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    writeCart(null);
    router.push(`/orders/${data}`);
  }

  if (!loaded) return null;

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-amber-50 px-6 dark:bg-zinc-950">
        <p className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
          Your cart is empty
        </p>
        <Link href="/" className="text-amber-700 underline dark:text-amber-500">
          Browse restaurants
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(cart);
  const total = subtotal + DELIVERY_FEE_RS + cart.packagingFeeRs;

  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Checkout
        </h1>

        <section className="rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {cart.restaurantName}
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>
                  {l.qty} × {l.name}
                </span>
                <span className="tabular-nums">Rs {l.price_rs * l.qty}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-dashed border-amber-200 pt-2 text-sm dark:border-zinc-700">
            <p className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span className="tabular-nums">Rs {subtotal}</span>
            </p>
            <p className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>Delivery</span>
              <span className="tabular-nums">Rs {DELIVERY_FEE_RS}</span>
            </p>
            {cart.packagingFeeRs > 0 && (
              <p className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Packaging</span>
                <span className="tabular-nums">Rs {cart.packagingFeeRs}</span>
              </p>
            )}
            <p className="mt-1 flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-100">
              <span>Total (cash on delivery)</span>
              <span className="tabular-nums">Rs {total}</span>
            </p>
          </div>
        </section>

        {signedIn === false ? (
          <div className="rounded-xl border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-medium">Sign in to place your order</p>
            <p className="mt-1">
              Your cart is saved —{" "}
              <Link href="/login?next=/checkout" className="font-semibold underline">
                sign in or create an account
              </Link>{" "}
              and you&apos;ll come right back here.
            </p>
          </div>
        ) : (
          <form onSubmit={placeOrder} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Delivery address
              <textarea
                required
                minLength={10}
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, street, area, landmark…"
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Note for the restaurant (optional)
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Extra spicy, no onions…"
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || signedIn === null}
              className="rounded-lg bg-amber-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
            >
              {busy ? "Placing order…" : `Place order — Rs ${total} on delivery`}
            </button>
            <p className="text-center text-xs text-zinc-500">
              Pay cash when your food arrives. You&apos;ll get a 4-digit code to
              give the rider — that&apos;s your proof of delivery.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
