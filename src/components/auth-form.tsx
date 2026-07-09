"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

export type Audience = "buyer" | "restaurant" | "rider";

const COPY: Record<
  Audience,
  {
    signinTitle: string;
    signinTagline: string;
    signupTitle: string;
    signupTagline: string;
    landing: string;
    wrongDoor: string;
  }
> = {
  buyer: {
    signinTitle: "Sign in to FoodVibe",
    signinTagline: "Welcome back.",
    signupTitle: "Create your account",
    signupTagline: "Free forever. No commission, no tricks.",
    landing: "/",
    wrongDoor: "",
  },
  restaurant: {
    signinTitle: "Partner sign in",
    signinTagline: "Manage your restaurant and orders.",
    signupTitle: "Become a FoodVibe partner",
    signupTagline: "List your restaurant, keep 100% of every order.",
    landing: "/restaurant",
    wrongDoor:
      "This account isn't a restaurant partner account — use the main customer sign in, or create a partner account.",
  },
  rider: {
    signinTitle: "Rider sign in",
    signinTagline: "Your deliveries and earnings.",
    signupTitle: "Become a FoodVibe rider",
    signupTagline: "Keep 100% of every delivery fee and tip.",
    landing: "/rider",
    wrongDoor:
      "This account isn't a rider account — use the main customer sign in, or create a rider account.",
  },
};

export function landingFor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "restaurant":
      return "/restaurant";
    case "rider":
      return "/rider";
    default:
      return "/";
  }
}

export function AuthForm({ audience }: { audience: Audience }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get("next");
  const linkError = searchParams.get("error");
  const copy = COPY[audience];

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
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

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
      });
      setMessage(
        error
          ? error.message
          : "Reset link sent! Check your email (and spam folder), then click the link to set a new password."
      );
      setBusy(false);
      return;
    }

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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let role: UserRole = "buyer";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = (profile?.role as UserRole) ?? "buyer";
      }

      // Wrong door: portal sign-ins are exclusive to their role.
      if (audience !== "buyer" && role !== audience && role !== "admin") {
        await supabase.auth.signOut();
        setMessage(copy.wrongDoor);
        setBusy(false);
        return;
      }

      // Right door: land where this account actually works.
      const target =
        audience === "buyer"
          ? (explicitNext ?? landingFor(role))
          : landingFor(audience === "restaurant" ? "restaurant" : "rider");
      router.push(target);
      router.refresh();
      return;
    }

    // Sign up
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...(audience !== "buyer" ? { requested_role: audience } : {}),
        },
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(
          explicitNext ?? copy.landing
        )}`,
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-amber-50 px-6 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        {audience !== "buyer" && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-500">
            {audience === "restaurant" ? "🏪 For restaurants" : "🛵 For riders"}
          </p>
        )}
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {mode === "signin"
            ? copy.signinTitle
            : mode === "signup"
              ? copy.signupTitle
              : "Reset your password"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "signin"
            ? copy.signinTagline
            : mode === "signup"
              ? copy.signupTagline
              : "We'll email you a link to set a new password."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "signup" && (
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {audience === "restaurant" ? "Owner's full name" : "Full name"}
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
          {mode !== "forgot" && (
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
          )}

          {message && (
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {message}
            </p>
          )}
          {linkError && !message && (
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              That email link didn&apos;t work — it may have expired or been
              used already. Sign in normally, or use &ldquo;Forgot
              password?&rdquo; to get a fresh link.
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
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage(null);
            }}
            className="text-amber-700 underline dark:text-amber-500"
          >
            {mode === "signin"
              ? audience === "buyer"
                ? "New here? Create an account"
                : audience === "restaurant"
                  ? "New partner? Register here"
                  : "New rider? Register here"
              : "Have an account? Sign in"}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setMessage(null);
              }}
              className="text-zinc-500 underline dark:text-zinc-400"
            >
              Forgot password?
            </button>
          )}
        </div>

        <div className="mt-6 border-t border-amber-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          {audience === "buyer" ? (
            <p>
              Restaurant owner?{" "}
              <Link
                href="/restaurant/login"
                className="text-amber-700 underline dark:text-amber-500"
              >
                Partner sign in
              </Link>{" "}
              · Rider?{" "}
              <Link
                href="/rider/login"
                className="text-amber-700 underline dark:text-amber-500"
              >
                Rider sign in
              </Link>
            </p>
          ) : (
            <p>
              Just ordering food?{" "}
              <Link
                href="/login"
                className="text-amber-700 underline dark:text-amber-500"
              >
                Customer sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
