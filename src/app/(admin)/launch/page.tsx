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
      .select("id, name, email, city, status")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const prospectStats = {
    total: prospectsRes.data?.length ?? 0,
    withEmail: prospectsRes.data?.filter((p) => p.email).length ?? 0,
    emailed: prospectsRes.data?.filter((p) => p.status === "emailed").length ?? 0,
    registered: prospectsRes.data?.filter((p) => p.status === "registered").length ?? 0,
  };

  return (
    <LaunchClient
      campaigns={campaignsRes.data ?? []}
      prospects={prospectsRes.data ?? []}
      stats={prospectStats}
    />
  );
}
