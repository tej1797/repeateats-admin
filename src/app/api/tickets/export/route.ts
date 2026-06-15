import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = tickets ?? [];
  const headers = [
    "id", "user_email", "user_name", "portal", "subject", "category",
    "status", "priority", "created_at", "first_response_at", "resolved_at",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((r: any) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="tickets-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
