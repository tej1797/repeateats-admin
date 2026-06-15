import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { ticket_id, to_email, subject, body: emailBody } = body;

  if (!ticket_id || !to_email || !subject || !emailBody) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

  // Send via Resend
  const { error: sendError } = await resend.emails.send({
    from: "Tejas @ RepeatEats <support@repeateats.ca>",
    to: to_email,
    subject,
    text: emailBody,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <p style="color:#666;font-size:12px;margin-bottom:24px">RepeatEats Support</p>
      ${emailBody.split("\n").map((line: string) => `<p>${line}</p>`).join("")}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#999;font-size:11px">RepeatEats · GTA, Ontario</p>
    </div>`,
  });

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 500 });
  }

  // Log the email
  const admin = createAdminClient();
  await admin.from("support_email_log").insert({
    ticket_id,
    to_email,
    subject,
    body: emailBody,
  });

  return NextResponse.json({ success: true });
}
