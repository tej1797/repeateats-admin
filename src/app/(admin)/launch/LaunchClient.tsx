"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Plus, Send, RefreshCw, Download, Upload } from "lucide-react";
import { format } from "date-fns";

type Props = {
  campaigns: any[];
  prospects: any[];
  stats: { total: number; withEmail: number; emailed: number; registered: number };
};

const DEFAULT_TEMPLATE = `Hi {{restaurant_name}},

I'm Tejas, the founder of RepeatEats — a new restaurant deals platform launching in Ontario this year.

RepeatEats lets restaurants post exclusive deals that customers discover and claim through our app. It's free to join during launch and a great way to attract new customers.

🎬 See how it works: [YouTube Link]
📱 Download the app: [App Store Link] | [Google Play Link]

I'd love to have {{restaurant_name}} on the platform! Sign up here: https://www.repeateats.ca/restaurant

Best,
Tejas Khatri
Founder, RepeatEats`;

export function LaunchClient({ campaigns, prospects, stats }: Props) {
  const [showCompose, setShowCompose] = useState(false);
  const [campaignName, setCampaignName] = useState("Launch Outreach - " + new Date().toLocaleDateString());
  const [subject, setSubject] = useState("Join RepeatEats — Free for Ontario restaurants 🍽️");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleCrawl = async () => {
    setCrawling(true);
    await fetch("/api/cron/crawl-restaurants", { method: "POST" });
    setCrawling(false);
    window.location.reload();
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const text = await file.text();
    const res = await fetch("/api/import/prospects", { method: "POST", body: text });
    const json = await res.json();
    setImportResult(`Imported ${json.inserted} prospects${json.skipped ? ` (${json.skipped} skipped)` : ""}`);
    setImporting(false);
    setTimeout(() => { setImportResult(null); window.location.reload(); }, 2000);
    e.target.value = "";
  };

  const handleSendCampaign = async () => {
    if (!subject || !body) return;
    setSending(true);

    // Create campaign
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: campaignName, subject, body }),
    });

    if (res.ok) {
      const { campaign } = await res.json();
      // Trigger send
      await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
    }

    setSending(false);
    setShowCompose(false);
    window.location.reload();
  };

  return (
    <div className="pt-12 px-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Launch Outreach</h1>
          <p className="text-xs text-muted-foreground">Email Ontario restaurants</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "#E85D04" }}
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* Prospect stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Prospects", value: stats.total },
          { label: "Have Email", value: stats.withEmail },
          { label: "Emailed", value: stats.emailed },
          { label: "Registered", value: stats.registered },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Crawler */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-sm font-semibold text-foreground mb-1">Ontario Restaurant Crawler</p>
        <p className="text-xs text-muted-foreground mb-3">
          Fetches restaurant names, websites & emails from Google Places across GTA, Mississauga, Brampton, Ottawa, Hamilton, and more.
        </p>
        <Button
          onClick={handleCrawl}
          disabled={crawling}
          variant="outline"
          className="w-full border-border text-foreground"
        >
          <RefreshCw size={14} className={crawling ? "animate-spin" : ""} />
          {crawling ? "Crawling…" : "Run Crawler Now"}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Also runs automatically daily via Vercel Cron
        </p>
      </div>

      {/* Past campaigns */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Past Campaigns
        </p>
        <div className="space-y-2">
          {campaigns.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No campaigns yet. Tap + to create one.
            </div>
          )}
          {campaigns.map((c: any) => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={
                      c.status === "sent"
                        ? { backgroundColor: "#052e16", color: "#22c55e" }
                        : { backgroundColor: "#1E1E1E", color: "#888" }
                    }
                  >
                    {c.status}
                  </span>
                  {c.status === "sent" && (
                    <p className="text-xs text-muted-foreground mt-1">{c.total_sent} sent</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prospect list preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Prospects ({stats.total})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.open("/api/export?type=prospects", "_blank")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
              style={{ backgroundColor: "#1E1E1E", color: "#888" }}
            >
              <Download size={11} /> Export
            </button>
            <label
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer"
              style={{ backgroundColor: "#1E1E1E", color: importing ? "#888" : "#E85D04" }}
            >
              <Upload size={11} />
              {importing ? "Importing…" : "Import CSV"}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
                disabled={importing}
              />
            </label>
          </div>
        </div>
        {importResult && (
          <p className="text-xs text-green-400 mb-2">{importResult}</p>
        )}
        <div className="space-y-2">
          {prospects.slice(0, 20).map((p: any) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.email ?? "No email found"} · {p.city}</p>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                style={
                  p.status === "registered"
                    ? { backgroundColor: "#052e16", color: "#22c55e" }
                    : p.status === "emailed"
                    ? { backgroundColor: "#1e3a5f", color: "#60a5fa" }
                    : { backgroundColor: "#1E1E1E", color: "#888" }
                }
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Compose dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Email Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Campaign Name</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Subject Line</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Email Body{" "}
                <span className="font-normal text-muted-foreground/60">
                  — {"{{restaurant_name}}"} is auto-replaced
                </span>
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="bg-secondary border-border mt-1 resize-none font-mono text-xs"
              />
            </div>
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                Will send to <strong className="text-foreground">{stats.withEmail - stats.emailed}</strong> prospects
                with emails not yet contacted.
              </p>
            </div>
            <Button
              onClick={handleSendCampaign}
              disabled={sending || !subject || !body}
              className="w-full font-semibold"
              style={{ backgroundColor: "#E85D04" }}
            >
              <Send size={14} />
              {sending ? "Sending…" : `Send to ${stats.withEmail - stats.emailed} Restaurants`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-2" />
    </div>
  );
}
