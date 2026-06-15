import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { title, body: tmplBody, category } = body;
  if (!title || !tmplBody) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quick_reply_templates")
    .insert({ title, body: tmplBody, category: category ?? "general" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
