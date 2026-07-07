"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Passwords don't match.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }

  if (signedIn === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-amber-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-amber-50 px-6 dark:bg-zinc-950">
        <p className="max-w-sm text-center text-zinc-700 dark:text-zinc-300">
          This page works after you click the reset link from your email. Need
          one?
        </p>
        <Link
          href="/login"
          className="text-amber-700 underline dark:text-amber-500"
        >
          Go to sign in → Forgot password?
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-amber-50 px-6 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Set a new password
        </h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            New password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Repeat new password
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          {message && (
            <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-amber-700 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
