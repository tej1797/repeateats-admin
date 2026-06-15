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
    q
      ? admin.from("users").select("*, claims(id, status)").or(`name.ilike.%${q}%,email.ilike.%${q}%`).order("name", { ascending: true }).limit(100)
      : admin.from("users").select("*, claims(id, status)").order("name", { ascending: true }).limit(100),
    q
      ? admin.from("restaurants").select("*, deals(id, current_claims)").ilike("name", `%${q}%`).order("name", { ascending: true }).limit(100)
      : admin.from("restaurants").select("*, deals(id, current_claims)").order("name", { ascending: true }).limit(100),
    admin.from("influencers").select("*, users(name, email, created_at)").order("created_at", { ascending: false }).limit(100),
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
