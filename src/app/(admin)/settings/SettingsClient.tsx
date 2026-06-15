"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { LogOut, Download, Clock, MessageSquare, Bell } from "lucide-react";

type Props = {
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
  slaTargets: { id: string; priority: string; target_hours: number }[];
};

export function SettingsClient({ autoReplyEnabled, autoReplyMessage, slaTargets }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [autoReply, setAutoReply] = useState(autoReplyEnabled);
  const [autoReplyMsg, setAutoReplyMsg] = useState(autoReplyMessage);
  const [sla, setSla] = useState<Record<string, number>>(
    Object.fromEntries(slaTargets.map((s) => [s.priority, s.target_hours]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto_reply_enabled: String(autoReply),
          auto_reply_message: autoReplyMsg,
        }),
      }),
      fetch("/api/settings/sla", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sla),
      }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const res = await fetch("/api/tickets/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `support-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="pt-12 px-4 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      {/* Auto-reply */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Auto-Reply</p>
          <button
            onClick={() => setAutoReply((v) => !v)}
            className="ml-auto relative w-10 h-6 rounded-full transition-colors"
            style={{ backgroundColor: autoReply ? "#E85D04" : "#2a2a2a" }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ left: autoReply ? "calc(100% - 22px)" : "2px" }}
            />
          </button>
        </div>
        {autoReply && (
          <>
            <p className="text-xs text-muted-foreground">
              This message is sent automatically when a new ticket is created (outside business hours).
            </p>
            <Textarea
              value={autoReplyMsg}
              onChange={(e) => setAutoReplyMsg(e.target.value)}
              rows={3}
              className="bg-secondary border-border resize-none text-sm"
            />
          </>
        )}
      </div>

      {/* SLA Targets */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <Clock size={18} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">SLA Targets</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Target first-response time in hours. Overdue tickets are flagged.
        </p>
        {slaTargets.map((s) => (
          <div key={s.priority} className="flex items-center gap-3">
            <span
              className="text-xs font-medium capitalize px-2.5 py-1 rounded-full"
              style={
                s.priority === "urgent"
                  ? { backgroundColor: "#3f0000", color: "#f87171" }
                  : { backgroundColor: "#1E1E1E", color: "#888" }
              }
            >
              {s.priority}
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <Input
                type="number"
                value={sla[s.priority] ?? s.target_hours}
                onChange={(e) =>
                  setSla((prev) => ({ ...prev, [s.priority]: Number(e.target.value) }))
                }
                className="w-16 bg-secondary border-border text-center text-sm h-8"
                min={1}
              />
              <span className="text-xs text-muted-foreground">hours</span>
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full font-semibold"
        style={{ backgroundColor: saved ? "#22c55e" : "#E85D04" }}
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
      </Button>

      <Separator className="bg-border" />

      {/* Export */}
      <button
        onClick={handleExport}
        className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 text-left"
      >
        <Download size={18} className="text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Export Tickets as CSV</p>
          <p className="text-xs text-muted-foreground">Download all support tickets</p>
        </div>
      </button>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full bg-card border border-red-900/40 rounded-2xl p-4 flex items-center gap-3 text-left"
      >
        <LogOut size={18} className="text-red-400" />
        <p className="text-sm font-semibold text-red-400">Sign Out</p>
      </button>

      <div className="text-center text-xs text-muted-foreground pb-4">
        RepEAT Admin · v1.0.0 · tejaskhatri007@gmail.com
      </div>
    </div>
  );
}
