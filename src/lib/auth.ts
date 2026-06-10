import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Returns the authenticated user's profile, or redirects to /login. */
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Profile trigger may not have run (rare). Bail to login.
    redirect("/login");
  }

  return { user, profile, supabase };
}
