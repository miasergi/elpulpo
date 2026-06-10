import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return adminEmails().includes(user.email.toLowerCase()) ? user : null;
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/app");
  return user;
}
