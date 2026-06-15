import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const body = await request.json();
  const admin = createAdminClient();
  const updates = Object.entries(body).map(([key, value]) =>
    admin.from("admin_settings").upsert({ key, value: String(value) }).eq("key", key)
  );
  await Promise.all(updates);
  return NextResponse.json({ success: true });
}
