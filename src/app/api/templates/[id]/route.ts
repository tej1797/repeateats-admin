import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quick_reply_templates")
    .update({ title: body.title, body: body.body, category: body.category })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();
  await admin.from("quick_reply_templates").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
