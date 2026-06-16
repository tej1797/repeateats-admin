import { createAdminClient } from "@/lib/supabase/server";
import { BroadcastClient } from "./BroadcastClient";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const admin = createAdminClient();

  const [usersRes, restaurantsRes, influencersRes, billingRes] = await Promise.all([
    admin.from("users").select("id, email, expo_push_token, role, repeat_plus_plan"),
    admin.from("restaurants").select("id, owner_id, is_live"),
    admin.from("influencers").select("user_id"),
    admin.from("restaurant_billing_usage").select("month_key, billable_redemptions"),
  ]);

  const users = usersRes.data ?? [];
  const restaurants = restaurantsRes.data ?? [];
  const influencers = influencersRes.data ?? [];
  const billing = billingRes.data ?? [];

  const byId = new Map(users.map((u) => [u.id, u]));
  const hasEmail = (u?: { email?: string | null }) => !!u?.email;
  const hasPush = (u?: { expo_push_token?: string | null }) => !!u?.expo_push_token;

  // Customers = all app users that aren't restaurant accounts
  const customers = users.filter((u) => u.role !== "restaurant");

  // Restaurant owners (resolved through the users table)
  const ownerIds = [...new Set(restaurants.map((r) => r.owner_id).filter(Boolean))];
  const owners = ownerIds.map((id) => byId.get(id)).filter(Boolean) as typeof users;

  // Creators = users referenced by an influencer profile
  const creatorIds = [...new Set(influencers.map((i) => i.user_id).filter(Boolean))];
  const creators = creatorIds.map((id) => byId.get(id)).filter(Boolean) as typeof users;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const stats = {
    // customers
    totalCustomers: customers.length,
    customerWithEmail: customers.filter(hasEmail).length,
    customerWithPush: customers.filter(hasPush).length,
    // restaurants
    totalRestaurants: ownerIds.length,
    restaurantWithEmail: owners.filter(hasEmail).length,
    restaurantWithPush: owners.filter(hasPush).length,
    liveRestaurants: restaurants.filter((r) => r.is_live).length,
    // creators
    totalCreators: creatorIds.length,
    creatorWithEmail: creators.filter(hasEmail).length,
    creatorWithPush: creators.filter(hasPush).length,
    // business
    repeatPlusUsers: users.filter((u) => u.repeat_plus_plan && u.repeat_plus_plan !== "free").length,
    totalBillableRedemptions: billing.reduce((s, b) => s + (b.billable_redemptions ?? 0), 0),
    thisMonthBillable: billing
      .filter((b) => b.month_key === thisMonth)
      .reduce((s, b) => s + (b.billable_redemptions ?? 0), 0),
  };

  return <BroadcastClient stats={stats} />;
}
