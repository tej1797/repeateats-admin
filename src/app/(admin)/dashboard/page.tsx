import { createAdminClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  // Parallel fetch everything
  const [
    openRes,
    urgentRes,
    inProgressRes,
    resolvedTodayRes,
    dailyVolumeRes,
    topCategoriesRes,
    avgResponseRes,
    lastCheckRes,
  ] = await Promise.all([
    admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("priority", "urgent")
      .in("status", ["open", "in_progress"]),
    admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
    admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved")
      .gte("resolved_at", todayStart.toISOString()),
    admin
      .from("support_tickets")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at"),
    admin
      .from("support_tickets")
      .select("category")
      .in("status", ["open", "in_progress"]),
    admin
      .from("support_tickets")
      .select("created_at, first_response_at")
      .not("first_response_at", "is", null)
      .gte("created_at", sevenDaysAgo.toISOString()),
    admin
      .from("admin_settings")
      .select("value")
      .eq("key", "last_ticket_check")
      .single(),
  ]);

  // Daily volume — bucket by day
  const dailyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  (dailyVolumeRes.data ?? []).forEach((t) => {
    const day = t.created_at.slice(0, 10);
    if (day in dailyMap) dailyMap[day]++;
  });
  const dailyVolume = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

  // Top categories
  const catMap: Record<string, number> = {};
  (topCategoriesRes.data ?? []).forEach((t) => {
    catMap[t.category] = (catMap[t.category] ?? 0) + 1;
  });
  const topCategories = Object.entries(catMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Avg first response time (in hours)
  const responses = avgResponseRes.data ?? [];
  let avgResponseHours = 0;
  if (responses.length > 0) {
    const totalMs = responses.reduce((sum, t) => {
      const diff =
        new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime();
      return sum + diff;
    }, 0);
    avgResponseHours = Math.round((totalMs / responses.length / 1000 / 3600) * 10) / 10;
  }

  // New tickets since last check
  const lastCheck = lastCheckRes.data?.value ? new Date(lastCheckRes.data.value) : sevenDaysAgo;
  const { count: newSinceLastCheck } = await admin
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .gte("created_at", lastCheck.toISOString());

  // Update last check time
  await admin
    .from("admin_settings")
    .update({ value: now.toISOString() })
    .eq("key", "last_ticket_check");

  // Oldest open ticket
  const { data: oldestTicket } = await admin
    .from("support_tickets")
    .select("id, subject, created_at, portal, category, priority")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return {
    stats: {
      open: openRes.count ?? 0,
      urgent: urgentRes.count ?? 0,
      inProgress: inProgressRes.count ?? 0,
      resolvedToday: resolvedTodayRes.count ?? 0,
      newSinceLastCheck: newSinceLastCheck ?? 0,
    },
    avgResponseHours,
    topCategories,
    dailyVolume,
    oldestTicket,
    lastCheckLabel: formatDistanceToNow(lastCheck, { addSuffix: true }),
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
