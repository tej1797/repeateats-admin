import { createAdminClient } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = createAdminClient();

  const [settingsRes, slaRes] = await Promise.all([
    admin.from("admin_settings").select("*"),
    admin.from("ticket_sla_config").select("*").order("priority"),
  ]);

  const settings: Record<string, string> = {};
  (settingsRes.data ?? []).forEach((s: any) => { settings[s.key] = s.value; });

  return (
    <SettingsClient
      autoReplyEnabled={settings["auto_reply_enabled"] === "true"}
      autoReplyMessage={settings["auto_reply_message"] ?? ""}
      slaTargets={slaRes.data ?? []}
    />
  );
}
