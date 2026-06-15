import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Calendar, ShoppingBag, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [userRes, claimsRes, ticketsRes] = await Promise.all([
    admin.from("users").select("*").eq("id", id).single(),
    admin
      .from("claims")
      .select("*, deals(title, emoji, restaurants(name))")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("support_tickets")
      .select("id, subject, status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!userRes.data) notFound();
  const user = userRes.data;
  const claims = claimsRes.data ?? [];
  const tickets = ticketsRes.data ?? [];
  const redeemed = claims.filter((c: any) => c.status === "redeemed").length;

  return (
    <div className="pt-12 px-4 pb-nav space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/users?tab=customers"
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{user.name ?? "Unknown"}</h1>
          <p className="text-xs text-muted-foreground">Customer</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Mail size={14} className="text-muted-foreground" />
          <span>{user.email}</span>
        </div>
        {user.city && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <MapPin size={14} className="text-muted-foreground" />
            <span>{user.city}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Calendar size={14} className="text-muted-foreground" />
          <span>Joined {format(new Date(user.created_at), "MMM d, yyyy")}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{claims.length}</p>
          <p className="text-[10px] text-muted-foreground">Claims</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-green-400">{redeemed}</p>
          <p className="text-[10px] text-muted-foreground">Redeemed</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{tickets.length}</p>
          <p className="text-[10px] text-muted-foreground">Tickets</p>
        </div>
      </div>

      {/* Claims history */}
      {claims.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Claim History
          </p>
          {claims.map((c: any) => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {c.deals?.emoji ?? "🍽️"} {c.deals?.title ?? "Unknown deal"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.deals?.restaurants?.name ?? "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(c.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex-shrink-0">
                {c.status === "redeemed" ? (
                  <span className="flex items-center gap-1 text-[10px] text-green-400">
                    <CheckCircle size={11} /> Redeemed
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground capitalize">{c.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Support tickets */}
      {tickets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Support Tickets
          </p>
          {tickets.map((t: any) => (
            <Link
              key={t.id}
              href={`/queue/${t.id}`}
              className="block bg-card border border-border rounded-2xl p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-foreground truncate">{t.subject}</p>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: t.status === "resolved" ? "#16a34a20" : "#E85D0420",
                    color: t.status === "resolved" ? "#16a34a" : "#E85D04",
                  }}
                >
                  {t.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
