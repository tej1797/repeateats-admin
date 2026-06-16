import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { subject, body, audience } = await request.json();
  if (!subject || !body || !audience) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

  let emails: string[] = [];

  if (audience === "customers") {
    const { data } = await admin
      .from("users")
      .select("email")
      .not("email", "is", null)
      .not("role", "eq", "restaurant");
    emails = (data ?? []).map((u) => u.email).filter(Boolean);
  } else if (audience === "creators") {
    const { data: infl } = await admin
      .from("influencers")
      .select("user_id")
      .not("user_id", "is", null);
    const ids = (infl ?? []).map((i) => i.user_id);
    if (ids.length > 0) {
      const { data } = await admin.from("users").select("email").in("id", ids).not("email", "is", null);
      emails = (data ?? []).map((u) => u.email).filter(Boolean);
    }
  } else if (audience === "restaurants") {
    // Email restaurant owners
    const { data: owners } = await admin
      .from("restaurants")
      .select("owner_id, users!restaurants_owner_id_fkey(email)")
      .not("owner_id", "is", null);
    emails = (owners ?? [])
      .map((r: any) => r.users?.email)
      .filter(Boolean);
    // Fallback: query restaurants for contact emails if the join is empty
    if (emails.length === 0) {
      const { data: restData } = await admin
        .from("restaurants")
        .select("owner_id")
        .not("owner_id", "is", null);
      const ids = (restData ?? []).map((r) => r.owner_id);
      if (ids.length > 0) {
        const { data: uData } = await admin.from("users").select("email").in("id", ids);
        emails = (uData ?? []).map((u) => u.email).filter(Boolean);
      }
    }
  } else {
    // all
    const { data } = await admin.from("users").select("email").not("email", "is", null);
    emails = (data ?? []).map((u) => u.email).filter(Boolean);
  }

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: "no emails found" });
  }

  // HTML template for promo emails
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#fff">
      <div style="background:#1d4ed8;padding:22px 24px;border-radius:12px 12px 0 0">
        <p style="font-size:22px;font-weight:800;margin:0;letter-spacing:.5px"><span style="color:#fff">Rep</span><span style="color:#E85D04">EAT</span></p>
      </div>
      <div style="padding:28px 24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
        <h2 style="font-size:18px;color:#111;margin:0 0 16px">${subject.replace(/</g, "&lt;")}</h2>
        ${body.split("\n").map((l: string) => `<p style="font-size:14px;color:#333;margin:0 0 10px">${l.replace(/</g, "&lt;") || "&nbsp;"}</p>`).join("")}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:11px;margin:0">
          RepEAT Inc · Ontario, Canada<br/>
          <a href="mailto:contact@contact.repeateats.ca" style="color:#1d4ed8">contact@contact.repeateats.ca</a>
        </p>
      </div>
    </div>`;

  // Send in batches of 50 (Resend batch API)
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    for (const email of batch) {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM ?? "RepeatEats <contact@contact.repeateats.ca>",
        to: email,
        subject,
        html,
        text: body,
      });
      if (error) failed++; else sent++;
    }
    // Small delay between batches to avoid rate limits
    if (i + 50 < emails.length) await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({ sent, failed, total: emails.length });
}
