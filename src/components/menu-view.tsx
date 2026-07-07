"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Cart } from "@/lib/cart";
import { cartCount, cartSubtotal, readCart, writeCart } from "@/lib/cart";
import type { MenuCategory, MenuItem, Restaurant } from "@/lib/types";

export function MenuView({
  restaurant,
  categories,
  items,
}: {
  restaurant: Restaurant;
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    setCart(readCart());
  }, []);

  function qtyOf(itemId: string): number {
    if (!cart || cart.restaurantId !== restaurant.id) return 0;
    return cart.lines.find((l) => l.id === itemId)?.qty ?? 0;
  }

  function changeQty(item: MenuItem, delta: number) {
    let next: Cart;
    if (!cart || cart.restaurantId !== restaurant.id) {
      if (
        cart &&
        cart.lines.length > 0 &&
        !confirm(
          `Your cart has items from ${cart.restaurantName}. Start a new cart here?`
        )
      ) {
        return;
      }
      next = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        minOrderRs: restaurant.min_order_rs,
        packagingFeeRs: restaurant.packaging_fee_rs,
        lines: [],
      };
    } else {
      next = { ...cart, lines: [...cart.lines] };
    }

    const idx = next.lines.findIndex((l) => l.id === item.id);
    if (idx >= 0) {
      const qty = next.lines[idx].qty + delta;
      if (qty <= 0) next.lines.splice(idx, 1);
      else next.lines[idx] = { ...next.lines[idx], qty };
    } else if (delta > 0) {
      next.lines.push({
        id: item.id,
        name: item.name,
        price_rs: item.price_rs,
        qty: 1,
      });
    }

    writeCart(next.lines.length > 0 ? next : null);
    setCart(next.lines.length > 0 ? next : null);
  }

  const grouped: { name: string; items: MenuItem[] }[] = [];
  for (const cat of categories) {
    const catItems = items.filter((i) => i.category_id === cat.id);
    if (catItems.length > 0) grouped.push({ name: cat.name, items: catItems });
  }
  const uncategorized = items.filter(
    (i) => !i.category_id || !categories.some((c) => c.id === i.category_id)
  );
  if (uncategorized.length > 0)
    grouped.push({ name: grouped.length > 0 ? "More" : "Menu", items: uncategorized });

  const count = cart?.restaurantId === restaurant.id ? cartCount(cart) : 0;
  const subtotal = cart?.restaurantId === restaurant.id ? cartSubtotal(cart) : 0;

  return (
    <div className="flex flex-1 flex-col bg-amber-50 pb-24 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {restaurant.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                restaurant.is_open
                  ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {restaurant.is_open ? "Open" : "Closed"}
            </span>
          </div>
          {restaurant.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {restaurant.description}
            </p>
          )}
          <p className="text-xs text-zinc-500">
            {restaurant.address}
            {restaurant.min_order_rs > 0 &&
              ` · Minimum order Rs ${restaurant.min_order_rs}`}
            {restaurant.packaging_fee_rs > 0 &&
              ` · Packaging Rs ${restaurant.packaging_fee_rs}`}
          </p>
        </header>

        {!restaurant.is_open && (
          <p className="rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            This restaurant is closed right now — you can browse the menu but
            not order.
          </p>
        )}

        {grouped.length === 0 && (
          <p className="rounded-lg border border-dashed border-amber-300 bg-white p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            The menu is being prepared — check back soon.
          </p>
        )}

        {grouped.map((group) => (
          <section key={group.name} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {group.name}
            </h2>
            <div className="flex flex-col gap-2">
              {group.items.map((item) => {
                const qty = qtyOf(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 ${
                      item.is_available ? "" : "opacity-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-amber-800 dark:text-amber-500">
                        Rs {item.price_rs}
                        {!item.is_available && " · unavailable"}
                      </p>
                    </div>
                    {item.is_available && restaurant.is_open && (
                      <div className="flex flex-none items-center gap-2">
                        {qty > 0 && (
                          <>
                            <button
                              onClick={() => changeQty(item, -1)}
                              aria-label={`Remove one ${item.name}`}
                              className="h-8 w-8 rounded-full border border-amber-300 text-lg font-bold text-amber-800 hover:bg-amber-100 dark:border-zinc-700 dark:text-amber-500 dark:hover:bg-zinc-800"
                            >
                              −
                            </button>
                            <span className="w-5 text-center font-semibold text-zinc-900 dark:text-zinc-100">
                              {qty}
                            </span>
                          </>
                        )}
                        <button
                          onClick={() => changeQty(item, 1)}
                          aria-label={`Add one ${item.name}`}
                          className="h-8 w-8 rounded-full bg-amber-700 text-lg font-bold text-white hover:bg-amber-800"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {count} item{count > 1 ? "s" : ""} · Rs {subtotal}
              </p>
              {subtotal < restaurant.min_order_rs && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Rs {restaurant.min_order_rs - subtotal} more to reach the
                  minimum
                </p>
              )}
            </div>
            <Link
              href="/checkout"
              aria-disabled={subtotal < restaurant.min_order_rs}
              className={`rounded-lg px-5 py-2.5 font-semibold text-white ${
                subtotal >= restaurant.min_order_rs
                  ? "bg-amber-700 hover:bg-amber-800"
                  : "pointer-events-none bg-zinc-400 dark:bg-zinc-700"
              }`}
            >
              Checkout →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
