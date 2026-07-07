import Link from "next/link";

export default function RiderPortal() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-amber-50 px-6 dark:bg-zinc-950">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Rider portal
      </h1>
      <p className="max-w-sm text-center text-zinc-600 dark:text-zinc-400">
        Delivery offers, navigation, COD ledger, and earnings arrive in
        Phase 1. You keep 100% of every delivery fee and tip.
      </p>
      <Link
        href="/"
        className="text-sm text-amber-700 underline dark:text-amber-500"
      >
        ← Back to FoodVibe
      </Link>
    </div>
  );
}
