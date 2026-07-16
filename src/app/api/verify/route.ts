import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Mirrors public.admin_review_restaurant() semantics. That RPC authorizes via
// auth.uid() → users.is_admin, which is NULL under the service-role key this
// admin app uses — so we apply the same updates directly and fire the same
// owner push via public._send_push. Do NOT touch is_live on approve: the DB
// trigger trg_enforce_restaurant_verification governs it via the status field.
export async function POST(request: Request) {
  const { restaurant_id, approve, note } = await request.json();
  if (!restaurant_id || typeof approve !== "boolean") {
    return NextResponse.json({ error: "Missing restaurant_id or approve" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, owner_id, verification_status")
    .eq("id", restaurant_id)
    .maybeSingle();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  let pushTitle: string;
  let pushBody: string;
  let pushRoute: string;

  if (approve) {
    const { error } = await admin
      .from("restaurants")
      .update({
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verification_note: null,
      })
      .eq("id", restaurant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    pushTitle = "You're verified ✅";
    pushBody = `${restaurant.name} is approved on RepEAT — go live and publish your first deal!`;
    pushRoute = "/(restaurant)";
  } else {
    const { error } = await admin
      .from("restaurants")
      .update({
        verification_status: "rejected",
        verification_note: note ?? null,
        is_live: false,
      })
      .eq("id", restaurant_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    pushTitle = "Verification unsuccessful";
    pushBody = note?.trim()
      ? note.trim()
      : `We couldn't confirm ownership of ${restaurant.name}. Reply via Support in the app.`;
    pushRoute = "/(restaurant)/settings";
  }

  // Notify the owner (same push the RPC sends). Non-fatal if it fails.
  let pushed = false;
  if (restaurant.owner_id) {
    const { error: pushError } = await admin.rpc("_send_push", {
      p_user_ids: [restaurant.owner_id],
      p_title: pushTitle,
      p_body: pushBody,
      p_data: { route: pushRoute },
    });
    pushed = !pushError;
    if (pushError) console.error("[verify] _send_push failed:", pushError.message);
  }

  return NextResponse.json({ ok: true, status: approve ? "verified" : "rejected", pushed });
}
