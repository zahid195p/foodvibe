"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      router.push("/account");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      setMessage(
        "Account created! Check your email and click the confirmation link to finish."
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-amber-50 px-6 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {mode === "signin" ? "Sign in to FoodVibe" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "signin"
            ? "Welcome back."
            : "Free forever. No commission, no tricks."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "signup" && (
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Full name
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          {message && (
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-amber-700 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-amber-800 disabled:opacity-50"
          >
            {busy
              ? "Working…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage(null);
            }}
            className="text-amber-700 underline dark:text-amber-500"
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Have an account? Sign in"}
          </button>
          <Link
            href="/"
            className="text-zinc-500 underline dark:text-zinc-400"
          >
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
