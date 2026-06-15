import { createAdminClient } from "@/lib/supabase/server";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab = "customers", q = "" } = await searchParams;
  const admin = createAdminClient();

  const [customersRes, restaurantsRes, creatorsRes] = await Promise.all([
    admin
      .from("users")
      .select("*, claims(id, status)")
      .ilike(q ? "name" : "id", q ? `%${q}%` : "%")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("restaurants")
      .select("*, deals(id, current_claims)")
      .ilike(q ? "name" : "id", q ? `%${q}%` : "%")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("influencers")
      .select("*, users(name, email, created_at)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <UsersClient
      customers={customersRes.data ?? []}
      restaurants={restaurantsRes.data ?? []}
      creators={creatorsRes.data ?? []}
      activeTab={tab}
      query={q}
    />
  );
}
