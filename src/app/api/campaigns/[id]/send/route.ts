import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { NextResponse } from "next/server";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  // Get campaign
  const { data: campaign } = await admin
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Get prospects with email not yet emailed
  const { data: prospects } = await admin
    .from("email_prospects")
    .select("*")
    .not("email", "is", null)
    .neq("status", "emailed")
    .neq("status", "registered");

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  const batchSize = 10; // Resend batch limit

  const resend = getResend();

  for (let i = 0; i < prospects.length; i += batchSize) {
    const batch = prospects.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (p: any) => {
        const personalizedBody = campaign.body
          .replace(/\{\{restaurant_name\}\}/g, p.name)
          .replace(/\{\{city\}\}/g, p.city ?? "Ontario");

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM ?? "Tejas @ RepeatEats <contact@contact.repeateats.ca>",
            to: p.email,
            subject: campaign.subject,
            text: personalizedBody,
          });

          await admin
            .from("email_prospects")
            .update({ status: "emailed" })
            .eq("id", p.id);

          await admin.from("campaign_sends").insert({
            campaign_id: id,
            prospect_id: p.id,
            to_email: p.email,
            status: "sent",
            sent_at: new Date().toISOString(),
          });

          sent++;
        } catch {
          await admin.from("campaign_sends").insert({
            campaign_id: id,
            prospect_id: p.id,
            to_email: p.email,
            status: "failed",
          });
        }
      })
    );
    // Small delay between batches
    if (i + batchSize < prospects.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Mark campaign as sent
  await admin
    .from("email_campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString(), total_sent: sent })
    .eq("id", id);

  return NextResponse.json({ sent });
}
