import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { format } from "date-fns";

const PORTAL_COLORS: Record<string, string> = {
  customer: "#E85D04",
  restaurant: "#3b82f6",
  creator: "#7E22CE",
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildHtml(
  subject: string,
  userName: string,
  portal: string,
  ticketId: string,
  messages: Array<{ sender_type: string; message: string; created_at: string }>,
  fallbackBody: string
): string {
  const accent = PORTAL_COLORS[portal] ?? "#E85D04";
  const shortId = ticketId.split("-")[0].toUpperCase();

  // WhatsApp CTA — only rendered when a support number is configured.
  const waNumber = (process.env.SUPPORT_WHATSAPP_NUMBER ?? "").replace(/[^0-9]/g, "");
  const whatsappBlock = waNumber
    ? `
        <div style="text-align:center;margin:26px 0 0">
          <p style="font-size:13px;color:#9aa0a6;line-height:1.5;margin:0 0 12px">Have more issues? Chat with us on WhatsApp.</p>
          <a href="https://wa.me/${waNumber}" style="display:inline-block;background:#25D366;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 20px;border-radius:24px">
            <img src="https://img.icons8.com/ios-filled/24/ffffff/whatsapp.png" width="16" height="16" alt="WhatsApp" style="vertical-align:-3px;margin-right:8px"/>Chat on WhatsApp
          </a>
        </div>`
    : "";

  const cards = messages.length > 0
    ? messages.map((m) => {
        const isAdmin = m.sender_type === "admin";
        const sender = isAdmin ? "REPEAT SUPPORT" : esc(userName).toUpperCase();
        const border = isAdmin ? accent : "#3a3a3a";
        const labelColor = isAdmin ? accent : "#9aa0a6";
        const time = format(new Date(m.created_at), "MMM d, h:mm a");
        return `
          <div style="border-left:3px solid ${border};background:#1f1f1f;padding:13px 16px;border-radius:0 8px 8px 0;margin-bottom:12px">
            <div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:${labelColor};margin-bottom:6px">${sender} · ${time}</div>
            <div style="font-size:14px;line-height:1.5;color:#e8e8e8;white-space:pre-wrap">${esc(m.message)}</div>
          </div>`;
      }).join("")
    : `<div style="border-left:3px solid ${accent};background:#1f1f1f;padding:13px 16px;border-radius:0 8px 8px 0">
         <div style="font-size:14px;line-height:1.5;color:#e8e8e8;white-space:pre-wrap">${esc(fallbackBody)}</div>
       </div>`;

  return `
  <div style="background:#0f0f0f;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:600px;margin:0 auto;background:#161616;border-radius:14px;overflow:hidden;border:1px solid #262626">
      <!-- Header -->
      <div style="background:#1d4ed8;padding:30px 24px;text-align:center">
        <div style="font-size:28px;font-weight:800;letter-spacing:.5px"><span style="color:#ffffff">Rep</span><span style="color:#E85D04">EAT</span></div>
        <div style="font-size:11px;font-weight:600;letter-spacing:3px;color:rgba(255,255,255,.85);margin-top:6px">SUPPORT CENTRE</div>
      </div>
      <!-- Body -->
      <div style="padding:28px 24px">
        <h1 style="font-size:21px;font-weight:700;color:#ffffff;margin:0 0 6px">Your support conversation</h1>
        <p style="font-size:13px;color:#9aa0a6;margin:0 0 22px">Ticket <span style="color:#cfcfcf;font-weight:600">#${shortId}</span> · ${esc(subject)}</p>
        ${cards}
        ${whatsappBlock}
        <hr style="border:none;border-top:1px solid #262626;margin:24px 0"/>
        <p style="color:#6b7177;font-size:11px;line-height:1.7;margin:0;text-align:center">
          RepEAT Inc · Ontario, Canada<br/>
          Reply to this email or contact us at <a href="mailto:contact@contact.repeateats.ca" style="color:#5b8def;text-decoration:none">contact@contact.repeateats.ca</a>
        </p>
      </div>
    </div>
  </div>`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    ticket_id,
    to_email,
    subject,
    body: emailBody,
    messages = [],
    user_name = "there",
    portal = "customer",
  } = body;

  if (!ticket_id || !to_email || !subject) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

  const html = buildHtml(subject, user_name, portal, ticket_id, messages, emailBody ?? "");
  const text = messages.length > 0
    ? messages.map((m: any) => {
        const sender = m.sender_type === "admin" ? "RepeatEats Support" : user_name;
        const time = format(new Date(m.created_at), "MMM d, h:mm a");
        return `[${time}] ${sender}:\n${m.message}`;
      }).join("\n\n")
    : (emailBody ?? "");

  const from = process.env.RESEND_FROM ?? "RepEAT Support <contact@contact.repeateats.ca>";
  const { error: sendError } = await resend.emails.send({
    from,
    to: to_email,
    subject,
    text,
    html,
  });

  if (sendError) {
    console.error("[send-email] Resend error:", sendError);
    return NextResponse.json({ error: sendError.message }, { status: 500 });
  }

  const admin = createAdminClient();
  await admin.from("support_email_log").insert({
    ticket_id,
    to_email,
    subject,
    body: emailBody ?? text,
  });

  return NextResponse.json({ success: true });
}
