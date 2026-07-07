import Link from "next/link";

export default function AdminPortal() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-amber-50 px-6 dark:bg-zinc-950">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Admin
      </h1>
      <p className="max-w-sm text-center text-zinc-600 dark:text-zinc-400">
        KYC review queues, dispute tools, and zone configuration arrive in
        Phase 1–2.
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
