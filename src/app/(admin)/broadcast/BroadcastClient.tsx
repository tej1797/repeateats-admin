"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Mail, Users, Store, Zap, TrendingUp, Star } from "lucide-react";

type Stats = {
  totalCustomers: number;
  customerWithEmail: number;
  customerWithPush: number;
  totalRestaurants: number;
  restaurantWithEmail: number;
  restaurantWithPush: number;
  liveRestaurants: number;
  totalCreators: number;
  creatorWithEmail: number;
  creatorWithPush: number;
  repeatPlusUsers: number;
  totalBillableRedemptions: number;
  thisMonthBillable: number;
};

type AudienceKey = "customers" | "restaurants" | "creators" | "all";
type TabKey = "push" | "email";

const AUDIENCE_OPTIONS: { key: AudienceKey; label: string; icon: any }[] = [
  { key: "customers", label: "Customers", icon: Users },
  { key: "restaurants", label: "Restaurants", icon: Store },
  { key: "creators", label: "Creators", icon: Star },
  { key: "all", label: "Everyone", icon: Zap },
];

// Portal colors: customer=orange, restaurant=blue, creator=purple, everyone=yellow
const PORTAL_COLORS: Record<AudienceKey, string> = {
  customers: "#E85D04",
  restaurants: "#3b82f6",
  creators: "#7E22CE",
  all: "#eab308",
};

type PushTpl = { label: string; title: string; body: string };
type EmailTpl = { label: string; subject: string; body: string };

// Quick templates tailored to each audience
const PUSH_TEMPLATES: Record<AudienceKey, PushTpl[]> = {
  customers: [
    { label: "New deal alert", title: "🔥 New Deal Just Dropped!", body: "Check out the latest exclusive deals near you on RepeatEats." },
    { label: "Weekend promo", title: "🍽️ Weekend Eats!", body: "Exclusive weekend deals are live. Claim yours before they're gone!" },
    { label: "Re-engage", title: "We miss you! 👋", body: "It's been a while — new restaurants just joined RepeatEats. Come explore!" },
  ],
  restaurants: [
    { label: "Add a deal", title: "📈 Reach more diners", body: "Post a deal on RepeatEats and get discovered by hungry customers nearby." },
    { label: "Weekend boost", title: "🍽️ Fill your weekend", body: "Diners are searching now — add a weekend deal to bring in more covers." },
    { label: "Performance", title: "📊 Your week on RepeatEats", body: "New customers discovered you this week. Open your dashboard to see the numbers." },
  ],
  creators: [
    { label: "New collab", title: "🤝 New collab available", body: "A restaurant is looking for creators like you. Open RepeatEats to apply." },
    { label: "Opportunities", title: "✨ Fresh opportunities", body: "New collab opportunities just dropped in your area. Check them out!" },
    { label: "Reminder", title: "📸 Don't forget to post", body: "Have an approved collab? Tag @repeateats in your content to get featured." },
  ],
  all: [
    { label: "Announcement", title: "📣 News from RepeatEats", body: "We've got exciting updates for the whole RepeatEats community." },
    { label: "What's new", title: "🚀 Something new just landed", body: "Open the app to see what's new on RepeatEats today." },
  ],
};

const EMAIL_TEMPLATES: Record<AudienceKey, EmailTpl[]> = {
  customers: [
    { label: "New feature", subject: "Exciting new features on RepeatEats 🚀", body: "Hi there,\n\nWe've been busy building new features to make RepeatEats even better for you.\n\nOpen the app to see what's new today!\n\nBest,\nTejas\nFounder, RepeatEats" },
    { label: "New deals", subject: "New deals are live near you 🍽️", body: "Hi there,\n\nFresh deals just dropped from restaurants near you on RepeatEats.\n\nClaim yours before they're gone!\n\nBest,\nTejas\nFounder, RepeatEats" },
  ],
  restaurants: [
    { label: "Welcome", subject: "Welcome to RepeatEats! Here's how to get started 🍽️", body: "Hi there,\n\nThank you for joining RepeatEats! We're excited to help you attract new customers.\n\nHere's how to get started:\n1. Add your first deal\n2. Go live on the platform\n3. Watch customers discover you\n\nNeed help? Just reply to this email.\n\nBest,\nTejas\nFounder, RepeatEats" },
    { label: "Add a deal", subject: "Bring in more diners this week 📈", body: "Hi there,\n\nRestaurants posting deals on RepeatEats are getting discovered by new customers every day.\n\nLog in and post a deal in under 5 minutes — it's free during launch.\n\nBest,\nTejas\nFounder, RepeatEats" },
  ],
  creators: [
    { label: "Creator welcome", subject: "Welcome to the RepeatEats creator program ✨", body: "Hi there,\n\nThanks for joining RepeatEats as a creator! Restaurants are looking for local voices like you.\n\nOpen the app to browse and apply for collabs near you.\n\nBest,\nTejas\nFounder, RepeatEats" },
    { label: "New collabs", subject: "New collab opportunities for you 🤝", body: "Hi there,\n\nNew restaurant collab opportunities just opened up in your area on RepeatEats.\n\nApply now and start creating!\n\nBest,\nTejas\nFounder, RepeatEats" },
  ],
  all: [
    { label: "Announcement", subject: "An update from RepeatEats 📣", body: "Hi there,\n\nWe've got some exciting news to share with the whole RepeatEats community.\n\nThanks for being part of the journey.\n\nBest,\nTejas\nFounder, RepeatEats" },
  ],
};

export function BroadcastClient({ stats }: { stats: Stats }) {
  const [tab, setTab] = useState<TabKey>("push");
  const [audience, setAudience] = useState<AudienceKey>("customers");

  // Push state
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sendingPush, setSendingPush] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  // Email state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  // Total audience size (everyone in that group). Reachability (who has a
  // push token / email) is handled server-side at send time.
  const getAudienceCount = (key: AudienceKey) => {
    if (key === "customers") return stats.totalCustomers;
    if (key === "restaurants") return stats.totalRestaurants;
    if (key === "creators") return stats.totalCreators;
    return stats.totalCustomers + stats.totalRestaurants + stats.totalCreators;
  };

  // How many will actually receive this send (push token for push, email for email)
  const getReachable = (key: AudienceKey, type: TabKey) => {
    const push = type === "push";
    const c = push ? stats.customerWithPush : stats.customerWithEmail;
    const r = push ? stats.restaurantWithPush : stats.restaurantWithEmail;
    const cr = push ? stats.creatorWithPush : stats.creatorWithEmail;
    if (key === "customers") return c;
    if (key === "restaurants") return r;
    if (key === "creators") return cr;
    return c + r + cr;
  };

  const portalColor = PORTAL_COLORS[audience];

  const handleSendPush = async () => {
    if (!pushTitle || !pushBody) return;
    setSendingPush(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/broadcast/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pushTitle, body: pushBody, audience }),
      });
      const json = await res.json();
      if (json.total_users === 0) {
        setPushResult(`Saved for ${json.in_app} users — no push tokens registered yet`);
      } else {
        setPushResult(`Sent to ${json.sent} devices · ${json.in_app} in-app notifications`);
      }
    } catch {
      setPushResult("Failed to send — check connection");
    }
    setSendingPush(false);
    setTimeout(() => setPushResult(null), 5000);
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) return;
    setSendingEmail(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/broadcast/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, body: emailBody, audience }),
      });
      const json = await res.json();
      setEmailResult(`Sent ${json.sent} / ${json.total} emails${json.failed > 0 ? ` (${json.failed} failed)` : ""}`);
    } catch {
      setEmailResult("Failed to send — check connection");
    }
    setSendingEmail(false);
    setTimeout(() => setEmailResult(null), 5000);
  };

  return (
    <div className="pt-12 px-4 space-y-5 pb-nav">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Broadcast</h1>
        <p className="text-xs text-muted-foreground">Push & email your users</p>
      </div>

      {/* Business health stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Customers", value: stats.totalCustomers, icon: Users, color: "#E85D04" },
          { label: "Creators", value: stats.totalCreators, icon: Star, color: "#7E22CE" },
          { label: "Live Restaurants", value: stats.liveRestaurants, icon: Store, color: "#3b82f6" },
          { label: "Push Enabled", value: stats.customerWithPush, icon: Bell, color: "#3b82f6" },
          { label: "Repeat+ Users", value: stats.repeatPlusUsers, icon: Star, color: "#f59e0b" },
          { label: "Billable (MTD)", value: stats.thisMonthBillable, icon: TrendingUp, color: "#22c55e" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={12} style={{ color }} />
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-0 bg-secondary rounded-xl p-1">
        {(["push", "email"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
            style={tab === t ? { backgroundColor: portalColor, color: "#fff" } : { color: "#888" }}
          >
            {t === "push" ? <Bell size={13} /> : <Mail size={13} />}
            {t === "push" ? "Push Notification" : "Promo Email"}
          </button>
        ))}
      </div>

      {/* Audience selector */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Audience</p>
        <div className="flex gap-2">
          {AUDIENCE_OPTIONS.map(({ key, label, icon: Icon }) => {
            const c = PORTAL_COLORS[key];
            return (
              <button
                key={key}
                onClick={() => setAudience(key)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all"
                style={audience === key
                  ? { borderColor: c, backgroundColor: `${c}15`, color: c }
                  : { borderColor: "transparent", backgroundColor: "#1E1E1E", color: "#888" }}
              >
                <Icon size={15} />
                <span>{label}</span>
                <span className="text-[10px] opacity-70">{getAudienceCount(key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Push notification composer */}
      {tab === "push" && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Templates</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {PUSH_TEMPLATES[audience].map((t) => (
                <button
                  key={t.label}
                  onClick={() => { setPushTitle(t.title); setPushBody(t.body); }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              placeholder="e.g. 🔥 New Deal Just Dropped!"
              className="bg-secondary border-border mt-1"
              maxLength={65}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{pushTitle.length}/65</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              placeholder="e.g. Check out the latest exclusive deals near you…"
              rows={3}
              className="bg-secondary border-border mt-1 resize-none text-sm"
              maxLength={150}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{pushBody.length}/150</p>
          </div>
          {pushResult && (
            <p className={`text-xs ${pushResult.includes("Failed") ? "text-red-400" : "text-green-400"}`}>
              {pushResult}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground text-center">
            {getReachable(audience, "push")} of {getAudienceCount(audience)} have push enabled · all {getAudienceCount(audience)} also get an in-app notification
          </p>
          <Button
            onClick={handleSendPush}
            disabled={sendingPush || !pushTitle || !pushBody}
            className="w-full font-semibold text-white"
            style={{ backgroundColor: portalColor }}
          >
            <Bell size={14} />
            {sendingPush ? "Sending…" : `Send to ${getAudienceCount(audience)} ${audience === "all" ? "users" : audience}`}
          </Button>
        </div>
      )}

      {/* Promo email composer */}
      {tab === "email" && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Templates</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {EMAIL_TEMPLATES[audience].map((t) => (
                <button
                  key={t.label}
                  onClick={() => { setEmailSubject(t.subject); setEmailBody(t.body); }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="e.g. New deals are live on RepeatEats 🍽️"
              className="bg-secondary border-border mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Body</Label>
            <Textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Write your email…"
              rows={8}
              className="bg-secondary border-border mt-1 resize-none text-sm"
            />
          </div>
          {emailResult && (
            <p className={`text-xs ${emailResult.includes("Failed") ? "text-red-400" : "text-green-400"}`}>
              {emailResult}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground text-center">
            {getReachable(audience, "email")} of {getAudienceCount(audience)} have an email on file
          </p>
          <Button
            onClick={handleSendEmail}
            disabled={sendingEmail || !emailSubject || !emailBody}
            className="w-full font-semibold text-white"
            style={{ backgroundColor: portalColor }}
          >
            <Mail size={14} />
            {sendingEmail ? "Sending…" : `Email ${getReachable(audience, "email")} ${audience === "all" ? "users" : audience}`}
          </Button>
        </div>
      )}
    </div>
  );
}
