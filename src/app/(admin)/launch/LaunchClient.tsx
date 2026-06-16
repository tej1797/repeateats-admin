"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Send, RefreshCw, Download, Upload, Globe, MapPin, Phone, Mail, ChevronDown,
  Search, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";

type Prospect = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  status: string | null;
  source: string | null;
  email_status: string | null;
};

type EmailFilter = "all" | "has_email" | "no_email";

type Props = {
  campaigns: any[];
  prospects: Prospect[];
  stats: { total: number; withEmail: number; emailed: number; registered: number };
};

const ONTARIO_CITIES = [
  "Toronto", "Mississauga", "Brampton", "Markham", "Vaughan",
  "Richmond Hill", "Oakville", "Burlington", "Hamilton", "Ottawa",
  "Scarborough", "North York", "Etobicoke", "Pickering", "Ajax",
];

const DEFAULT_SUBJECT = "Bring new customers to {{restaurant_name}} — free to join RepeatEats 🍽️";

const DEFAULT_TEMPLATE = `Hi {{restaurant_name}} team,

My name is Tejas Khatri, founder of RepeatEats — a local restaurant deals app built right here in Ontario.

We help restaurants like {{restaurant_name}} attract new diners and turn first-time visitors into regulars — with zero upfront cost.

HOW IT WORKS
1. You post an exclusive deal (e.g. "Buy 1 Get 1 Free" or "20% off your first visit").
2. Nearby customers discover {{restaurant_name}} in the RepeatEats app and claim your deal.
3. They walk in and redeem it. You only pay a small fee on a verified redemption — no monthly fees, no risk.

WHY RESTAURANTS JOIN
• Free to sign up — no setup or subscription fees during our Ontario launch.
• Get discovered by hungry customers who are actively looking for a place to eat.
• A simple dashboard to track claims, redemptions and repeat visits.

GET STARTED IN 5 MINUTES
1. Visit https://www.repeateats.ca/restaurant and create your free account.
2. Add your first deal.
3. Go live — customers can start discovering you the same day.

Your customers download the free RepeatEats app here:
📱 iPhone (App Store): [iOS_APP_LINK]
🤖 Android (Google Play): [ANDROID_APP_LINK]
🌐 Learn more: https://www.repeateats.ca

I'd genuinely love to welcome {{restaurant_name}} as one of our founding Ontario restaurants. Just reply to this email and I'll personally help you get set up.

Warm regards,
Tejas Khatri
Founder, RepeatEats
support@repeateats.ca · https://www.repeateats.ca`;

export function LaunchClient({ campaigns, prospects, stats }: Props) {
  const [showCompose, setShowCompose] = useState(false);
  const [campaignName, setCampaignName] = useState("Launch Outreach - " + new Date().toLocaleDateString());
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<string | null>(null);
  const [crawlError, setCrawlError] = useState(false);
  const [crawlCity, setCrawlCity] = useState<string>("auto");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");

  const handleCrawl = async () => {
    setCrawling(true);
    setCrawlResult(null);
    setCrawlError(false);
    try {
      const res = await fetch("/api/cron/crawl-restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crawlCity === "auto" ? {} : { city: crawlCity }),
      });
      const json = await res.json();
      const sourceLabel = json.sources?.includes("google_places")
        ? "Google Places"
        : json.sources?.includes("openstreetmap")
        ? "OpenStreetMap"
        : "";
      const enrichedNote =
        json.enriched > 0 ? ` · found ${json.enriched} new emails` : "";
      if (json.added > 0) {
        setCrawlResult(
          `Added ${json.added} restaurants from ${json.cities?.join(", ")}` +
            (sourceLabel ? ` via ${sourceLabel}` : "") +
            enrichedNote
        );
      } else if (json.enriched > 0) {
        setCrawlResult(`Found ${json.enriched} new emails on existing prospects' websites.`);
      } else if (json.errors?.length) {
        setCrawlError(true);
        // Show the discovery error but make clear it's the server being rate-limited
        setCrawlResult(
          json.errors.find((e: string) => e.includes("OSM") || e.includes("Places")) ??
            json.errors[0]
        );
      } else {
        setCrawlResult(`No new restaurants found in ${json.cities?.join(", ")} (already crawled).`);
      }
    } catch {
      setCrawlError(true);
      setCrawlResult("Crawler failed — check network");
    }
    setCrawling(false);
    setTimeout(() => { window.location.reload(); }, 4000);
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
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: campaignName, subject, body }),
    });
    if (res.ok) {
      const { campaign } = await res.json();
      await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
    }
    setSending(false);
    setShowCompose(false);
    window.location.reload();
  };

  const sendableCount = Math.max(stats.withEmail - stats.emailed, 0);

  return (
    <div className="pt-12 px-4 space-y-5 pb-nav">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Launch Outreach</h1>
          <p className="text-xs text-muted-foreground">Find & email Ontario restaurants</p>
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
          Finds restaurant names, websites, addresses, phones & emails across Ontario. Uses Google
          Places when available, and automatically falls back to OpenStreetMap (free, no API key) so
          it always works.
        </p>

        {/* City selector */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <select
              value={crawlCity}
              onChange={(e) => setCrawlCity(e.target.value)}
              className="w-full appearance-none bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground pr-8"
            >
              <option value="auto">Daily rotation (3 cities)</option>
              {ONTARIO_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <Button
          onClick={handleCrawl}
          disabled={crawling}
          variant="outline"
          className="w-full border-border text-foreground"
        >
          <RefreshCw size={14} className={crawling ? "animate-spin" : ""} />
          {crawling ? "Crawling… (up to 60s)" : "Run Crawler Now"}
        </Button>
        {crawlResult && (
          <p className={`text-[11px] mt-2 text-center ${crawlError ? "text-red-400" : "text-green-400"}`}>
            {crawlResult}
          </p>
        )}
        {!crawlResult && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Also runs automatically daily via Vercel Cron
          </p>
        )}
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

      {/* Prospect list */}
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
        {importResult && <p className="text-xs text-green-400 mb-2">{importResult}</p>}

        {/* Search bar */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurant or email…"
            className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Email availability filter */}
        <div className="flex gap-2 mb-3">
          {([
            { key: "all", label: `All (${prospects.length})` },
            { key: "has_email", label: `Has email (${prospects.filter((p) => p.email).length})` },
            { key: "no_email", label: `No email (${prospects.filter((p) => !p.email).length})` },
          ] as { key: EmailFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setEmailFilter(key)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
              style={
                emailFilter === key
                  ? { backgroundColor: "#E85D04", color: "#fff" }
                  : { backgroundColor: "#1E1E1E", color: "#888" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {prospects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No prospects yet. Run the crawler above to find restaurants.
          </div>
        )}

        {(() => {
          const q = search.trim().toLowerCase();
          const filtered = prospects.filter((p) => {
            if (emailFilter === "has_email" && !p.email) return false;
            if (emailFilter === "no_email" && p.email) return false;
            if (!q) return true;
            return (
              p.name.toLowerCase().includes(q) ||
              (p.email ?? "").toLowerCase().includes(q) ||
              (p.city ?? "").toLowerCase().includes(q)
            );
          });
          if (filtered.length === 0) {
            return (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No prospects match “{search}”.
              </div>
            );
          }
          return (
        <div className="space-y-2">
          {filtered.map((p) => {
            const isOpen = expanded === p.id;
            return (
              <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {p.email ? <EmailBadge status={p.email_status} /> : null}
                      <span className="truncate">{p.email ?? "No email found"}{p.city ? ` · ${p.city}` : ""}</span>
                    </p>
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
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-xs text-foreground">
                        <Mail size={12} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate" style={{ color: "#E85D04" }}>{p.email}</span>
                      </a>
                    )}
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-foreground"
                      >
                        <Globe size={12} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-blue-400">{p.website.replace(/^https?:\/\//, "")}</span>
                      </a>
                    )}
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-xs text-foreground">
                        <Phone size={12} className="text-muted-foreground flex-shrink-0" />
                        <span>{p.phone}</span>
                      </a>
                    )}
                    {p.address && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                        <span>{p.address}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center gap-2 text-[11px] pt-0.5">
                        <EmailBadge status={p.email_status} />
                        <span className="text-muted-foreground">
                          {p.email_status === "valid"
                            ? "Verified — domain accepts mail"
                            : p.email_status === "risky"
                            ? "Unverified — may not be monitored"
                            : p.email_status === "invalid"
                            ? "Likely bogus — do not send"
                            : "Not yet verified"}
                        </span>
                      </div>
                    )}
                    {p.source && (
                      <p className="text-[10px] text-muted-foreground/70 pt-1">
                        Source: {p.source === "google_places" ? "Google Places" : p.source === "openstreetmap" ? "OpenStreetMap" : p.source}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
          );
        })()}
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
              <Label className="text-xs text-muted-foreground">
                Subject Line{" "}
                <span className="font-normal text-muted-foreground/60">— {"{{restaurant_name}}"} is auto-replaced</span>
              </Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Email Body{" "}
                <span className="font-normal text-muted-foreground/60">
                  — replace [iOS_APP_LINK] / [ANDROID_APP_LINK] before sending
                </span>
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                className="bg-secondary border-border mt-1 resize-none font-mono text-xs"
              />
            </div>
            <div className="bg-secondary rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                Will send to <strong className="text-foreground">{sendableCount}</strong> prospects
                with an email that haven&apos;t been contacted yet.
              </p>
            </div>
            <Button
              onClick={handleSendCampaign}
              disabled={sending || !subject || !body}
              className="w-full font-semibold"
              style={{ backgroundColor: "#E85D04" }}
            >
              <Send size={14} />
              {sending ? "Sending…" : `Send to ${sendableCount} Restaurants`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-2" />
    </div>
  );
}

function EmailBadge({ status }: { status: string | null }) {
  if (status === "valid")
    return <CheckCircle2 size={12} className="flex-shrink-0" style={{ color: "#22c55e" }} aria-label="Verified email" />;
  if (status === "risky")
    return <AlertTriangle size={12} className="flex-shrink-0" style={{ color: "#f59e0b" }} aria-label="Unverified email" />;
  if (status === "invalid")
    return <XCircle size={12} className="flex-shrink-0" style={{ color: "#ef4444" }} aria-label="Bogus email" />;
  return <Mail size={12} className="flex-shrink-0 text-muted-foreground" aria-label="Unchecked email" />;
}
