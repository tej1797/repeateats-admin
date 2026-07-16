import { createAdminClient } from "@/lib/supabase/server";
import { VerifyClient } from "./VerifyClient";

export const dynamic = "force-dynamic";

const RESTAURANT_COLS =
  "id, name, address, city, phone, google_place_id, venue_type, created_at, owner_id, verification_status, verified_at, verification_note";

export default async function VerifyPage() {
  const admin = createAdminClient();

  const [pendingRes, reviewedRes] = await Promise.all([
    admin
      .from("restaurants")
      .select(RESTAURANT_COLS)
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("restaurants")
      .select(RESTAURANT_COLS)
      .in("verification_status", ["verified", "rejected"])
      .order("verified_at", { ascending: false, nullsFirst: false })
      .limit(20),
  ]);

  const pending = pendingRes.data ?? [];
  const reviewed = reviewedRes.data ?? [];

  // Resolve applicant owner emails (flat query — nested joins are unreliable here)
  const ownerIds = [
    ...new Set([...pending, ...reviewed].map((r) => r.owner_id).filter(Boolean)),
  ];
  let emailById: Record<string, string> = {};
  if (ownerIds.length > 0) {
    const { data: owners } = await admin.from("users").select("id, email").in("id", ownerIds);
    emailById = Object.fromEntries((owners ?? []).map((u) => [u.id, u.email]));
  }

  const withEmail = (r: any) => ({ ...r, owner_email: emailById[r.owner_id] ?? null });

  return (
    <VerifyClient
      pending={pending.map(withEmail)}
      reviewed={reviewed.map(withEmail)}
    />
  );
}
