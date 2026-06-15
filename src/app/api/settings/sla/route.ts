import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const body = await request.json(); // { normal: 24, urgent: 4 }
  const admin = createAdminClient();
  await Promise.all(
    Object.entries(body).map(([priority, hours]) =>
      admin
        .from("ticket_sla_config")
        .update({ target_hours: Number(hours) })
        .eq("priority", priority)
    )
  );
  return NextResponse.json({ success: true });
}
