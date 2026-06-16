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

const PUSH_TEMPLATES = [
  { label: "New deal alert", title: "🔥 New Deal Just Dropped!", body: "Check out the latest exclusive deals near you on RepeatEats." },
  { label: "Weekend promo", title: "🍽️ Weekend Eats!", body: "Exclusive weekend deals are live. Claim yours before they're gone!" },
  { label: "Re-engage", title: "We miss you! 👋", body: "It's been a while — new restaurants have joined RepeatEats. Come explore!" },
];

const EMAIL_TEMPLATES = [
  { label: "New feature", subject: "Exciting new features on RepeatEats 🚀", body: "Hi there,\n\nWe've been busy building new features to make RepeatEats even better for you.\n\nCheck out what's new in the app today!\n\nBest,\nTejas\nFounder, RepeatEats" },
  { label: "Restaurant welcome", subject: "Welcome to RepeatEats! Here's how to get started 🍽️", body: "Hi there,\n\nThank you for joining RepeatEats! We're excited to help you attract new customers.\n\nHere's how to get started:\n1. Add your first deal\n2. Go live on the platform\n3. Watch customers discover you\n\nNeed help? Reply to this email.\n\nBest,\nTejas\nFounder, RepeatEats" },
];

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

  const getAudienceCount = (key: AudienceKey, type: TabKey) => {
    const push = type === "push";
    const c = push ? stats.customerWithPush : stats.customerWithEmail;
    const r = push ? stats.restaurantWithPush : stats.restaurantWithEmail;
    const cr = push ? stats.creatorWithPush : stats.creatorWithEmail;
    if (key === "customers") return c;
    if (key === "restaurants") return r;
    if (key === "creators") return cr;
    return c + r + cr;
  };

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
            style={tab === t ? { backgroundColor: "#E85D04", color: "#fff" } : { color: "#888" }}
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
          {AUDIENCE_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAudience(key)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all"
              style={audience === key
                ? { borderColor: "#E85D04", backgroundColor: "#E85D0415", color: "#E85D04" }
                : { borderColor: "transparent", backgroundColor: "#1E1E1E", color: "#888" }}
            >
              <Icon size={15} />
              <span>{label}</span>
              <span className="text-[10px] opacity-70">{getAudienceCount(key, tab)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Push notification composer */}
      {tab === "push" && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Templates</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {PUSH_TEMPLATES.map((t) => (
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
          <Button
            onClick={handleSendPush}
            disabled={sendingPush || !pushTitle || !pushBody}
            className="w-full font-semibold"
            style={{ backgroundColor: "#E85D04" }}
          >
            <Bell size={14} />
            {sendingPush ? "Sending…" : `Send to ${getAudienceCount(audience, "push")} users`}
          </Button>
        </div>
      )}

      {/* Promo email composer */}
      {tab === "email" && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Templates</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {EMAIL_TEMPLATES.map((t) => (
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
          <Button
            onClick={handleSendEmail}
            disabled={sendingEmail || !emailSubject || !emailBody}
            className="w-full font-semibold"
            style={{ backgroundColor: "#E85D04" }}
          >
            <Mail size={14} />
            {sendingEmail ? "Sending…" : `Email ${getAudienceCount(audience, "email")} users`}
          </Button>
        </div>
      )}
    </div>
  );
}
