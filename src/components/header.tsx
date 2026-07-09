import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const ROLE_LINK: Record<string, { href: string; label: string }> = {
  restaurant: { href: "/restaurant", label: "My restaurant" },
  rider: { href: "/rider", label: "My deliveries" },
  admin: { href: "/admin", label: "Admin" },
};

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

  const roleLink = role ? ROLE_LINK[role] : undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-amber-100 bg-amber-50/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-amber-800 dark:text-amber-500"
        >
          FoodVibe
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {roleLink && (
            <Link
              href={roleLink.href}
              className="font-semibold text-amber-800 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-400"
            >
              {roleLink.label}
            </Link>
          )}
          {user && (
            <Link
              href="/orders"
              className="text-zinc-700 hover:text-amber-800 dark:text-zinc-300 dark:hover:text-amber-500"
            >
              My orders
            </Link>
          )}
          {user ? (
            <Link
              href="/account"
              className="text-zinc-700 hover:text-amber-800 dark:text-zinc-300 dark:hover:text-amber-500"
            >
              Account
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
