import { createAdminClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; restaurantId?: string }>;
}) {
  const { view = "overview", restaurantId } = await searchParams;
  const admin = createAdminClient();

  if (view === "restaurant" && restaurantId) {
    // Level 2: restaurant drill-down
    const [restaurantRes, dealsRes] = await Promise.all([
      admin.from("restaurants").select("*").eq("id", restaurantId).single(),
      admin
        .from("deals")
        .select("*, claims(id, status)")
        .eq("restaurant_id", restaurantId)
        .order("current_claims", { ascending: false }),
    ]);

    const deals = (dealsRes.data ?? []).map((d: any) => ({
      ...d,
      total_claims: (d.claims ?? []).length,
      total_redeems: (d.claims ?? []).filter((c: any) => c.status === "redeemed").length,
    }));

    return (
      <AnalyticsClient
        view="restaurant"
        restaurant={restaurantRes.data}
        deals={deals}
      />
    );
  }

  // Level 1: overview
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalCustomers, newCustomers7d, newCustomers30d,
    totalRestaurants, newRestaurants7d,
    totalCreators,
    claimsRes, redeemsRes,
    restaurantPerf,
    collabsRes, activeCollabsRes,
  ] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("users").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    admin.from("users").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo.toISOString()),
    admin.from("restaurants").select("id", { count: "exact", head: true }),
    admin.from("restaurants").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    admin.from("influencers").select("id", { count: "exact", head: true }),
    admin.from("claims").select("id", { count: "exact", head: true }),
    admin.from("claims").select("id", { count: "exact", head: true }).eq("status", "redeemed"),
    admin.from("restaurants").select(`
      id, name, city, cuisine, is_live,
      deals(id, title, current_claims, claims(id, status))
    `).eq("is_live", true).order("name").limit(30),
    admin.from("collabs").select("id", { count: "exact", head: true }),
    admin.from("collabs").select("id", { count: "exact", head: true }).in("status", ["negotiating", "accepted"]),
  ]);

  const totalClaims = claimsRes.count ?? 0;
  const totalRedeems = redeemsRes.count ?? 0;

  const restaurants = (restaurantPerf.data ?? []).map((r: any) => {
    const total_claims = (r.deals ?? []).reduce(
      (s: number, d: any) => s + (d.claims ?? []).length, 0
    );
    const total_redeems = (r.deals ?? []).reduce(
      (s: number, d: any) => s + (d.claims ?? []).filter((c: any) => c.status === "redeemed").length, 0
    );
    return {
      ...r,
      total_deals: (r.deals ?? []).length,
      total_claims,
      total_redeems,
      redemption_rate: total_claims > 0 ? Math.round((total_redeems / total_claims) * 100) : 0,
      has_discrepancy: total_claims > 10 && total_redeems / total_claims < 0.5,
    };
  });

  return (
    <AnalyticsClient
      view="overview"
      overview={{
        total_customers: totalCustomers.count ?? 0,
        new_customers_7d: newCustomers7d.count ?? 0,
        new_customers_30d: newCustomers30d.count ?? 0,
        total_restaurants: totalRestaurants.count ?? 0,
        new_restaurants_7d: newRestaurants7d.count ?? 0,
        total_creators: totalCreators.count ?? 0,
        total_claims: totalClaims,
        total_redeems: totalRedeems,
        redemption_rate: totalClaims > 0 ? Math.round((totalRedeems / totalClaims) * 100) : 0,
        total_collabs: collabsRes.count ?? 0,
        active_collabs: activeCollabsRes.count ?? 0,
      }}
      restaurants={restaurants}
    />
  );
}
