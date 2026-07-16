import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Badge counts for the bottom nav. Fetched client-side on every route change
// because the admin layout only renders on hard loads (App Router layouts
// don't re-render on soft navigation), which left stale numbers.
export async function GET() {
  const admin = createAdminClient();
  const [{ count: queue }, { count: verify }] = await Promise.all([
    admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    admin
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
  ]);
  return NextResponse.json({ queue: queue ?? 0, verify: verify ?? 0 });
}
