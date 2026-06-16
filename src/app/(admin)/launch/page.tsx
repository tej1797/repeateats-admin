import { createAdminClient } from "@/lib/supabase/server";
import { LaunchClient } from "./LaunchClient";

export const dynamic = "force-dynamic";

export default async function LaunchPage() {
  const admin = createAdminClient();

  const campaignsRes = await admin
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // PostgREST caps a single response at 1000 rows — page through to get them all.
  const prospects: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("email_prospects")
      .select("id, name, email, phone, website, address, city, status, source, email_status")
      .order("email", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    prospects.push(...data);
    if (data.length < 1000) break;
  }

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
      prospects={prospects}
      stats={prospectStats}
    />
  );
}
