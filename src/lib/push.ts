import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hola@elpulpo.app";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a payload to every subscription of the given users.
 * Dead subscriptions (404/410) are pruned automatically.
 */
export async function sendToUsers(userIds: string[], payload: PushPayload) {
  if (!configure() || userIds.length === 0) return { sent: 0, pruned: 0 };
  const supabase = createServiceClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return { sent: 0, pruned: 0 };

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    })
  );

  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", dead);
  }
  return { sent, pruned: dead.length };
}
