import { createAdminClient } from "@/lib/supabase/server";
import { BroadcastClient } from "./BroadcastClient";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const admin = createAdminClient();

  const [usersRes, restaurantsRes, billingRes] = await Promise.all([
    admin.from("users").select("id, email, expo_push_token, role, repeat_plus_plan, created_at, last_sign_in_at, streak_days"),
    admin.from("restaurants").select("id, name, owner_id, is_live"),
    admin.from("restaurant_billing_usage").select("restaurant_id, month_key, metered_redemptions, billable_redemptions"),
  ]);

  const users = usersRes.data ?? [];
  const restaurants = restaurantsRes.data ?? [];
  const billing = billingRes.data ?? [];

  const stats = {
    totalCustomers: users.filter((u) => u.role !== "restaurant").length,
    withEmail: users.filter((u) => u.email).length,
    withPush: users.filter((u) => u.expo_push_token).length,
    restaurantOwners: restaurants.filter((r) => r.owner_id).length,
    liveRestaurants: restaurants.filter((r) => r.is_live).length,
    repeatPlusUsers: users.filter((u) => u.repeat_plus_plan && u.repeat_plus_plan !== "free").length,
    totalBillableRedemptions: billing.reduce((s, b) => s + (b.billable_redemptions ?? 0), 0),
    thisMonthBillable: billing
      .filter((b) => b.month_key === new Date().toISOString().slice(0, 7))
      .reduce((s, b) => s + (b.billable_redemptions ?? 0), 0),
  };

  return <BroadcastClient stats={stats} />;
}
