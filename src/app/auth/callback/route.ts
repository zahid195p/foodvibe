import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Same-browser email links land here with a one-time code that we
// exchange for a real session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let dest = next;
      // Generic destination? Land the user where their role actually works.
      if (dest === "/account" || dest === "/") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          const role = profile?.role;
          dest =
            role === "admin"
              ? "/admin"
              : role === "restaurant"
                ? "/restaurant"
                : role === "rider"
                  ? "/rider"
                  : "/";
        }
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
