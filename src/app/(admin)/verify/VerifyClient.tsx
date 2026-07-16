"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format, formatDistanceToNow } from "date-fns";
import {
  ShieldCheck, ShieldX, Phone, MapPin, Mail, AlertTriangle, CheckCircle2, XCircle, Clock,
} from "lucide-react";

type Venue = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  google_place_id: string | null;
  venue_type: string | null;
  created_at: string;
  owner_id: string | null;
  owner_email: string | null;
  verification_status: string;
  verified_at: string | null;
  verification_note: string | null;
};

export function VerifyClient({ pending, reviewed }: { pending: Venue[]; reviewed: Venue[] }) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const review = async (id: string, approve: boolean, rejectNote?: string) => {
    setBusyId(id);
    setResult(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: id, approve, note: rejectNote || null }),
      });
      const json = await res.json();
      if (res.ok) {
        setResult({
          id,
          ok: true,
          msg: approve ? "Approved — owner notified ✅" : "Rejected — owner notified",
        });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setResult({ id, ok: false, msg: json.error ?? "Failed — try again" });
      }
    } catch {
      setResult({ id, ok: false, msg: "Network error — try again" });
    }
    setBusyId(null);
  };

  return (
    <div className="pt-12 px-4 space-y-5 pb-nav">
      <div>
        <h1 className="text-xl font-bold text-foreground">Verification Queue</h1>
        <p className="text-xs text-muted-foreground">
          Confirm ownership before a restaurant can go live. Playbook: call the venue&apos;s
          Google-listed number and confirm they signed up.
        </p>
      </div>

      {/* Pending */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Pending ({pending.length})
        </p>
        {pending.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm bg-card border border-border rounded-2xl">
            🎉 No restaurants waiting for review.
          </div>
        )}
        <div className="space-y-3">
          {pending.map((r) => {
            const isRejecting = rejectingId === r.id;
            const busy = busyId === r.id;
            const rowResult = result?.id === r.id ? result : null;
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {r.venue_type ?? "restaurant"}
                      {r.city ? ` · ${r.city}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                    <Clock size={10} />
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>

                {r.address && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                    <span>{r.address}</span>
                  </div>
                )}
                {r.owner_email && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail size={12} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Applicant:</span>
                    <a href={`mailto:${r.owner_email}`} style={{ color: "#E85D04" }} className="truncate">
                      {r.owner_email}
                    </a>
                  </div>
                )}

                {/* Phone — the core of the verification playbook */}
                {r.phone ? (
                  <a
                    href={`tel:${r.phone}`}
                    className="flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: "#1e3a5f", color: "#60a5fa" }}
                  >
                    <Phone size={14} />
                    Call to verify: {r.phone}
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-yellow-500">
                    <AlertTriangle size={12} /> No phone number on the listing — verify another way.
                  </p>
                )}

                {r.google_place_id ? (
                  <p className="text-[10px] text-muted-foreground/70 break-all">
                    Google Place: {r.google_place_id}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertTriangle size={12} /> No Google listing linked — extra caution advised.
                  </p>
                )}

                {rowResult && (
                  <p className={`text-xs ${rowResult.ok ? "text-green-400" : "text-red-400"}`}>
                    {rowResult.msg}
                  </p>
                )}

                {/* Actions */}
                {!isRejecting ? (
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => review(r.id, true)}
                      disabled={busy}
                      className="flex-1 font-semibold text-white"
                      style={{ backgroundColor: "#16a34a" }}
                    >
                      <ShieldCheck size={14} />
                      {busy ? "Working…" : "Approve"}
                    </Button>
                    <Button
                      onClick={() => { setRejectingId(r.id); setNote(""); }}
                      disabled={busy}
                      variant="outline"
                      className="flex-1 font-semibold border-red-900 text-red-400"
                    >
                      <ShieldX size={14} />
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="Reason (optional) — shown to the applicant in their app…"
                      className="bg-secondary border-border resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => review(r.id, false, note)}
                        disabled={busy}
                        className="flex-1 font-semibold text-white"
                        style={{ backgroundColor: "#dc2626" }}
                      >
                        {busy ? "Working…" : "Confirm Reject"}
                      </Button>
                      <Button
                        onClick={() => setRejectingId(null)}
                        disabled={busy}
                        variant="outline"
                        className="flex-1 border-border text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recently reviewed */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recently Reviewed
        </p>
        {reviewed.length === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">Nothing reviewed yet.</p>
        )}
        <div className="space-y-2">
          {reviewed.map((r) => {
            const ok = r.verification_status === "verified";
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  {ok ? (
                    <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.owner_email ?? "—"}
                      {r.city ? ` · ${r.city}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={
                        ok
                          ? { backgroundColor: "#052e16", color: "#22c55e" }
                          : { backgroundColor: "#3f0000", color: "#f87171" }
                      }
                    >
                      {r.verification_status}
                    </span>
                    {r.verified_at && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(r.verified_at), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
                {!ok && r.verification_note && (
                  <p className="text-xs text-muted-foreground mt-2 pl-7">
                    Note: {r.verification_note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-2" />
    </div>
  );
}
