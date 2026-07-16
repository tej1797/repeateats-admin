import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = createAdminClient();

  // Live badge counts for the nav (cheap head-only counts)
  const [{ count: openTickets }, { count: pendingVerify }] = await Promise.all([
    admin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    admin
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
  ]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <TopBar />
      {/* Page content scrolls between the fixed top bar and bottom nav.
          Pages carry pt-12 (= TopBar height); pt-2 here adds breathing room. */}
      <main className="flex-1 pt-2 pb-nav overflow-y-auto">{children}</main>
      <BottomNav queueCount={openTickets ?? 0} verifyCount={pendingVerify ?? 0} />
    </div>
  );
}
