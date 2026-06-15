import { createAdminClient } from "@/lib/supabase/server";
import { TemplatesClient } from "./TemplatesClient";
import type { QuickReplyTemplate } from "@/types";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const admin = createAdminClient();
  const { data: templates } = await admin
    .from("quick_reply_templates")
    .select("*")
    .order("category")
    .returns<QuickReplyTemplate[]>();

  return <TemplatesClient templates={templates ?? []} />;
}
