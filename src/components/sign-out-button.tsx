"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-zinc-700 dark:text-amber-400 dark:hover:bg-zinc-900"
    >
      Sign out
    </button>
  );
}
