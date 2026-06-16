import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Expo push API — batched for efficiency
async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ sent: number; failed: number }> {
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const messages = tokens.map((to) => ({ to, title, body, data: data ?? {}, sound: "default" }));

  // Expo accepts up to 100 per batch
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      const result = await res.json();
      (result.data ?? []).forEach((r: any) => {
        if (r.status === "ok") sent++; else failed++;
      });
    } catch {
      failed += batch.length;
    }
  }
  return { sent, failed };
}

export async function POST(request: Request) {
  const { title, body, audience, data } = await request.json();
  if (!title || !body || !audience) {
    return NextResponse.json({ error: "Missing title, body, or audience" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch target push tokens
  let users: { id: string; expo_push_token: string }[] = [];

  if (audience === "customers") {
    const { data } = await admin
      .from("users")
      .select("id, expo_push_token")
      .not("expo_push_token", "is", null)
      .not("role", "eq", "restaurant");
    users = (data ?? []) as typeof users;
  } else if (audience === "restaurants") {
    const { data: owners } = await admin
      .from("restaurants")
      .select("owner_id")
      .not("owner_id", "is", null);
    const ownerIds = (owners ?? []).map((r) => r.owner_id);
    if (ownerIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, in_app: 0, skipped: "no restaurant owners" });
    }
    const { data } = await admin
      .from("users")
      .select("id, expo_push_token")
      .not("expo_push_token", "is", null)
      .in("id", ownerIds);
    users = (data ?? []) as typeof users;
  } else if (audience === "creators") {
    const { data: infl } = await admin
      .from("influencers")
      .select("user_id")
      .not("user_id", "is", null);
    const creatorIds = (infl ?? []).map((i) => i.user_id);
    if (creatorIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, in_app: 0, skipped: "no creators" });
    }
    const { data } = await admin
      .from("users")
      .select("id, expo_push_token")
      .not("expo_push_token", "is", null)
      .in("id", creatorIds);
    users = (data ?? []) as typeof users;
  } else {
    const { data } = await admin
      .from("users")
      .select("id, expo_push_token")
      .not("expo_push_token", "is", null);
    users = (data ?? []) as typeof users;
  }
  const tokens = (users ?? []).map((u) => u.expo_push_token).filter(Boolean);

  // Send push
  const { sent, failed } = await sendExpoPush(tokens, title, body, data);

  // Insert in-app notifications for all target users
  const userIds = (users ?? []).map((u) => u.id);
  let inApp = 0;
  if (userIds.length > 0) {
    const notifRows = userIds.map((user_id) => ({
      user_id,
      title,
      body,
      type: "broadcast",
      read: false,
    }));
    const { error } = await admin.from("notifications").insert(notifRows);
    if (!error) inApp = notifRows.length;
  }

  return NextResponse.json({ sent, failed, in_app: inApp, total_users: userIds.length });
}
