import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { format } from "date-fns";

const PORTAL_LABELS: Record<string, string> = {
  customer: "Customer Support",
  restaurant: "Restaurant Support",
  creator: "Creator Support",
};

function buildHtml(
  subject: string,
  userName: string,
  portal: string,
  messages: Array<{ sender_type: string; message: string; created_at: string }>,
  fallbackBody: string
): string {
  const portalLabel = PORTAL_LABELS[portal] ?? "Support";

  const msgRows = messages.length > 0
    ? messages.map((m) => {
        const isAdmin = m.sender_type === "admin";
        const sender = isAdmin ? "RepeatEats Support" : userName;
        const bg = isAdmin ? "#FFF4EE" : "#F9F9F9";
        const border = isAdmin ? "#E85D04" : "#DDD";
        const time = format(new Date(m.created_at), "MMM d, h:mm a");
        return `
          <tr>
            <td style="padding:8px 0">
              <div style="border-left:3px solid ${border};background:${bg};padding:10px 14px;border-radius:0 8px 8px 0">
                <div style="font-size:11px;color:#999;margin-bottom:4px">${sender} · ${time}</div>
                <div style="font-size:14px;color:#111;white-space:pre-wrap">${m.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              </div>
            </td>
          </tr>`;
      }).join("")
    : `<tr><td style="padding:8px 0;font-size:14px;color:#333;white-space:pre-wrap">${fallbackBody.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>`;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#fff">
      <div style="background:#E85D04;padding:20px 24px;border-radius:12px 12px 0 0">
        <p style="color:#fff;font-size:13px;margin:0;font-weight:600">RepeatEats · ${portalLabel}</p>
      </div>
      <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
        <p style="font-size:15px;font-weight:600;color:#111;margin:0 0 4px">${subject.replace(/</g, "&lt;")}</p>
        <p style="font-size:13px;color:#666;margin:0 0 20px">Conversation with ${userName}</p>
        <table style="width:100%;border-collapse:collapse">
          ${msgRows}
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:11px;margin:0">
          RepeatEats · GTA, Ontario<br/>
          <a href="mailto:support@repeateats.ca" style="color:#E85D04">support@repeateats.ca</a>
        </p>
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

  const html = buildHtml(subject, user_name, portal, messages, emailBody ?? "");
  const text = messages.length > 0
    ? messages.map((m: any) => {
        const sender = m.sender_type === "admin" ? "RepeatEats Support" : user_name;
        const time = format(new Date(m.created_at), "MMM d, h:mm a");
        return `[${time}] ${sender}:\n${m.message}`;
      }).join("\n\n")
    : (emailBody ?? "");

  const { error: sendError } = await resend.emails.send({
    from: "Tejas @ RepeatEats <support@repeateats.ca>",
    to: to_email,
    subject,
    text,
    html,
  });

  if (sendError) {
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
