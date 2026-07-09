import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-amber-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {profile?.full_name || "Your account"}
        </h1>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Role</dt>
            <dd className="font-medium capitalize text-amber-700 dark:text-amber-500">
              {profile?.role ?? "buyer"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Phone</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {profile?.phone ?? "Not set"}
            </dd>
          </div>
        </dl>
        {profile?.role && profile.role !== "buyer" && (
          <Link
            href={
              profile.role === "admin"
                ? "/admin"
                : profile.role === "restaurant"
                  ? "/restaurant"
                  : "/rider"
            }
            className="mt-4 block rounded-lg bg-amber-700 px-4 py-2.5 text-center font-semibold text-white hover:bg-amber-800"
          >
            Open my dashboard →
          </Link>
        )}
        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-amber-700 underline dark:text-amber-500"
          >
            ← Home
          </Link>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
