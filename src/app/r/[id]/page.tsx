import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuView } from "@/components/menu-view";
import type { MenuCategory, MenuItem, Restaurant } from "@/lib/types";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: restaurant }, { data: categories }, { data: items }] =
    await Promise.all([
      supabase.from("restaurants").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", id)
        .order("sort_order")
        .order("name"),
      supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", id)
        .order("sort_order")
        .order("name"),
    ]);

  if (!restaurant) notFound();

  return (
    <MenuView
      restaurant={restaurant as Restaurant}
      categories={(categories ?? []) as MenuCategory[]}
      items={(items ?? []) as MenuItem[]}
    />
  );
}
