import { createAdminClient } from "@/lib/supabase/server";
import { QueueClient } from "./QueueClient";
import type { SupportTicket } from "@/types";

export const dynamic = "force-dynamic";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; portal?: string; category?: string; priority?: string }>;
}) {
  const params = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("support_tickets")
    .select("*")
    .order("priority", { ascending: false }) // urgent first within filter
    .order("created_at", { ascending: true }); // then FIFO

  // Apply filters
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  } else if (!params.status) {
    // Default: show open + in_progress
    query = query.in("status", ["open", "in_progress"]);
  }
  if (params.portal && params.portal !== "all") query = query.eq("portal", params.portal);
  if (params.category && params.category !== "all") query = query.eq("category", params.category);
  if (params.priority && params.priority !== "all") query = query.eq("priority", params.priority);

  const { data: tickets } = await query.returns<SupportTicket[]>();

  // Get unread count per ticket (messages sent by user not yet read by admin)
  const ticketIds = (tickets ?? []).map((t) => t.id);
  let unreadMap: Record<string, number> = {};
  if (ticketIds.length > 0) {
    const { data: unreadData } = await admin
      .from("support_messages")
      .select("ticket_id")
      .in("ticket_id", ticketIds)
      .eq("sender_type", "user")
      .eq("read_by_admin", false);
    (unreadData ?? []).forEach((m) => {
      unreadMap[m.ticket_id] = (unreadMap[m.ticket_id] ?? 0) + 1;
    });
  }

  const enriched = (tickets ?? []).map((t) => ({
    ...t,
    unread_count: unreadMap[t.id] ?? 0,
  }));

  return <QueueClient tickets={enriched} activeFilters={params} />;
}
