"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { MenuCategory, MenuItem, Restaurant } from "@/lib/types";

export default function MenuEditorPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
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
    const { data: rest } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    setRestaurant((rest as Restaurant) ?? null);
    if (rest) {
      const [{ data: cats }, { data: menuItems }] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("*")
          .eq("restaurant_id", rest.id)
          .order("sort_order")
          .order("name"),
        supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", rest.id)
          .order("sort_order")
          .order("name"),
      ]);
      setCategories((cats as MenuCategory[]) ?? []);
      setItems((menuItems as MenuItem[]) ?? []);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!restaurant) return;
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("menu_categories")
      .insert({ restaurant_id: restaurant.id, name });
    if (error) setError(error.message);
    else {
      form.reset();
      load();
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? Items in it stay on the menu.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!restaurant) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const supabase = createClient();
    const categoryId = String(data.get("category") ?? "");
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: restaurant.id,
      category_id: categoryId || null,
      name: String(data.get("name") ?? ""),
      description: String(data.get("description") ?? ""),
      price_rs: Number(data.get("price") ?? 0),
    });
    if (error) setError(error.message);
    else {
      form.reset();
      load();
    }
  }

  async function toggleAvailable(item: MenuItem) {
    const supabase = createClient();
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    if (error) setError(error.message);
    else load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item permanently?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
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

  if (!restaurant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-amber-50 px-6 dark:bg-zinc-950">
        <p className="text-zinc-700 dark:text-zinc-300">
          Register your restaurant first.
        </p>
        <Link
          href="/restaurant"
          className="text-amber-700 underline dark:text-amber-500"
        >
          Go to restaurant portal
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-amber-50 dark:bg-zinc-950">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Menu — {restaurant.name}
          </h1>
          <Link
            href="/restaurant"
            className="text-sm text-amber-700 underline dark:text-amber-500"
          >
            ← Orders
          </Link>
        </div>

        {error && (
          <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <section className="rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Categories
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                {cat.name}
                <button
                  onClick={() => deleteCategory(cat.id)}
                  aria-label={`Delete category ${cat.name}`}
                  className="font-bold hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-zinc-500">
                No categories yet — e.g. “Biryani”, “BBQ”, “Drinks”.
              </p>
            )}
          </div>
          <form onSubmit={addCategory} className="mt-3 flex gap-2">
            <input
              name="name"
              placeholder="New category name"
              className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Add
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-amber-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Add item
          </h2>
          <form onSubmit={addItem} className="mt-3 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="name"
                required
                placeholder="Item name (e.g. Chicken Biryani)"
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <input
                name="price"
                required
                type="number"
                min={1}
                placeholder="Price (Rs)"
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <input
              name="description"
              placeholder="Short description (optional)"
              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <div className="flex gap-2">
              <select
                name="category"
                className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                Add item
              </button>
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Items ({items.length})
          </h2>
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 ${
                item.is_available ? "" : "opacity-60"
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {item.name} · Rs {item.price_rs}
                </p>
                <p className="text-xs text-zinc-500">
                  {categories.find((c) => c.id === item.category_id)?.name ??
                    "No category"}
                  {item.description && ` · ${item.description}`}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <button
                  onClick={() => toggleAvailable(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    item.is_available
                      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950 dark:text-green-300"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {item.is_available ? "Available" : "Out of stock"}
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  aria-label={`Delete ${item.name}`}
                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-amber-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800">
              No items yet — add your first dish above.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
