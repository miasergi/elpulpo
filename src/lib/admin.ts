import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS_HARDCODED = ["sergicornellesaguilar@gmail.com", "clientes@miarquitecto.info"];

export function adminEmails() {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...ADMIN_EMAILS_HARDCODED, ...fromEnv])];
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
