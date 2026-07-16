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

  if (view === "customers") {
    // Customer analytics: who claims most, which cuisines/deal kinds they pick, city split
    const [usersRes, claimsRes, dealsRes, restaurantsRes] = await Promise.all([
      admin.from("users").select("id, name, email, city, created_at").neq("role", "restaurant"),
      admin.from("claims").select("id, user_id, deal_id, status, money_saved_cents"),
      admin.from("deals").select("id, restaurant_id, discount_type"),
      admin.from("restaurants").select("id, name, cuisine, city"),
    ]);

    const dealById = new Map((dealsRes.data ?? []).map((d) => [d.id, d]));
    const restById = new Map((restaurantsRes.data ?? []).map((r) => [r.id, r]));

    // Enrich each claim with the cuisine + deal kind it belongs to
    const claims = (claimsRes.data ?? []).map((c) => {
      const deal = dealById.get(c.deal_id);
      const rest = deal ? restById.get(deal.restaurant_id) : undefined;
      return {
        user_id: c.user_id,
        redeemed: c.status === "redeemed",
        money_saved_cents: c.money_saved_cents ?? 0,
        cuisine: rest?.cuisine ?? null,
        restaurant_name: rest?.name ?? null,
        discount_type: deal?.discount_type ?? null,
      };
    });

    return (
      <AnalyticsClient
        view="customers"
        customers={usersRes.data ?? []}
        customerClaims={claims}
      />
    );
  }

  if (view === "restaurants") {
    // Restaurant analytics: what/when they post, cuisines, cities
    const [restaurantsRes, dealsRes] = await Promise.all([
      admin.from("restaurants").select("id, name, cuisine, city, is_live, venue_type, verification_status"),
      admin.from("deals").select("id, restaurant_id, discount_type, created_at, available_days, current_claims, redeemed_count, is_active"),
    ]);
    return (
      <AnalyticsClient
        view="restaurants"
        allRestaurants={restaurantsRes.data ?? []}
        allDeals={dealsRes.data ?? []}
      />
    );
  }

  if (view === "creators") {
    // Creator analytics: who they are, who they collab with, niches, cities
    const [influencersRes, usersRes, collabsRes, restaurantsRes] = await Promise.all([
      admin.from("influencers").select("id, user_id, display_name, niche, follower_count, city, total_collabs, rating, primary_platform, instagram_handle"),
      admin.from("users").select("id, name, email, city"),
      admin.from("collabs").select("id, influencer_id, restaurant_id, status, agreed_amount"),
      admin.from("restaurants").select("id, name, cuisine, city"),
    ]);

    const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
    const restById = new Map((restaurantsRes.data ?? []).map((r) => [r.id, r]));

    const creators = (influencersRes.data ?? []).map((i) => {
      const u = userById.get(i.user_id);
      return {
        ...i,
        name: i.display_name || u?.name || u?.email || "Unknown creator",
        city: i.city || u?.city || null,
      };
    });
    const collabs = (collabsRes.data ?? []).map((c) => {
      const rest = restById.get(c.restaurant_id);
      return {
        influencer_id: c.influencer_id,
        status: c.status,
        agreed_amount: c.agreed_amount,
        restaurant_name: rest?.name ?? "Unknown",
        cuisine: rest?.cuisine ?? null,
        restaurant_city: rest?.city ?? null,
      };
    });

    return <AnalyticsClient view="creators" creators={creators} collabs={collabs} />;
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
