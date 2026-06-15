import { createAdminClient } from "@/lib/supabase/server";
import { TicketDetailClient } from "./TicketDetailClient";
import { notFound } from "next/navigation";
import type { SupportTicket, SupportMessage, QuickReplyTemplate } from "@/types";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [ticketRes, messagesRes, templatesRes] = await Promise.all([
    admin
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single<SupportTicket>(),
    admin
      .from("support_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })
      .returns<SupportMessage[]>(),
    admin
      .from("quick_reply_templates")
      .select("*")
      .order("category")
      .returns<QuickReplyTemplate[]>(),
  ]);

  if (!ticketRes.data) notFound();

  // Mark user messages as read by admin
  await admin
    .from("support_messages")
    .update({ read_by_admin: true })
    .eq("ticket_id", id)
    .eq("sender_type", "user")
    .eq("read_by_admin", false);

  return (
    <TicketDetailClient
      ticket={ticketRes.data}
      messages={messagesRes.data ?? []}
      templates={templatesRes.data ?? []}
    />
  );
}
