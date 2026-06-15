import { createAdminClient } from "@/lib/supabase/server";
import { LaunchClient } from "./LaunchClient";

export const dynamic = "force-dynamic";

export default async function LaunchPage() {
  const admin = createAdminClient();

  const [campaignsRes, prospectsRes] = await Promise.all([
    admin
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("email_prospects")
      .select("id, name, email, phone, website, address, city, status, source")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // Accurate counts straight from the DB (not limited by the page size).
  const [{ count: totalCount }, { count: emailCount }, { count: emailedCount }, { count: registeredCount }] =
    await Promise.all([
      admin.from("email_prospects").select("id", { count: "exact", head: true }),
      admin.from("email_prospects").select("id", { count: "exact", head: true }).not("email", "is", null),
      admin.from("email_prospects").select("id", { count: "exact", head: true }).eq("status", "emailed"),
      admin.from("email_prospects").select("id", { count: "exact", head: true }).eq("status", "registered"),
    ]);

  const prospectStats = {
    total: totalCount ?? 0,
    withEmail: emailCount ?? 0,
    emailed: emailedCount ?? 0,
    registered: registeredCount ?? 0,
  };

  return (
    <LaunchClient
      campaigns={campaignsRes.data ?? []}
      prospects={prospectsRes.data ?? []}
      stats={prospectStats}
    />
  );
}
