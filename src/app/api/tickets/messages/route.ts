import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { ticket_id, message, is_internal_note, sender_type } = body;

  if (!ticket_id || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("support_messages")
    .insert({
      ticket_id,
      content: message,             // old NOT NULL column — keep for compat
      is_admin: sender_type === "admin", // old boolean column
      message,                      // new column
      is_internal_note: is_internal_note ?? false,
      sender_type: sender_type ?? "admin",
      read_by_admin: sender_type === "admin" ? true : false,
      read_by_user: sender_type === "user" ? true : false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bump updated_at on ticket
  await admin
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticket_id);

  return NextResponse.json({ message: data });
}
