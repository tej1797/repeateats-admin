import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Globe, Phone, Calendar, ShoppingBag } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [restaurantRes, dealsRes] = await Promise.all([
    admin.from("restaurants").select("*").eq("id", id).single(),
    admin
      .from("deals")
      .select("*, claims(id, status)")
      .eq("restaurant_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!restaurantRes.data) notFound();
  const r = restaurantRes.data;
  const deals = (dealsRes.data ?? []).map((d: any) => ({
    ...d,
    total_claims: (d.claims ?? []).length,
    total_redeems: (d.claims ?? []).filter((c: any) => c.status === "redeemed").length,
  }));

  const totalClaims = deals.reduce((s, d) => s + d.total_claims, 0);
  const totalRedeems = deals.reduce((s, d) => s + d.total_redeems, 0);
  const rate = totalClaims > 0 ? Math.round((totalRedeems / totalClaims) * 100) : 0;

  return (
    <div className="pt-12 px-4 pb-nav space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/users?tab=restaurants"
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground truncate">{r.name}</h1>
            {r.is_live && (
              <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Restaurant</p>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {(r.city || r.address) && (
          <div className="flex items-start gap-2 text-sm text-foreground">
            <MapPin size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <span>{[r.address, r.city, r.province].filter(Boolean).join(", ")}</span>
          </div>
        )}
        {r.phone && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Phone size={14} className="text-muted-foreground" />
            <span>{r.phone}</span>
          </div>
        )}
        {r.website && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Globe size={14} className="text-muted-foreground" />
            <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 truncate">
              {r.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
        {r.cuisine && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ShoppingBag size={14} className="text-muted-foreground" />
            <span>{r.cuisine}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Calendar size={14} className="text-muted-foreground" />
          <span>Joined {format(new Date(r.created_at), "MMM d, yyyy")}</span>
        </div>
        {r.google_place_id && (
          <p className="text-[10px] text-muted-foreground font-mono break-all">
            Place ID: {r.google_place_id}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{deals.length}</p>
          <p className="text-[10px] text-muted-foreground">Deals</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold" style={{ color: "#E85D04" }}>{totalClaims}</p>
          <p className="text-[10px] text-muted-foreground">Claims</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-green-400">{totalRedeems}</p>
          <p className="text-[10px] text-muted-foreground">Redeemed</p>
        </div>
      </div>

      {/* Redemption rate */}
      {totalClaims > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex justify-between">
            <p className="text-xs text-muted-foreground">Redemption rate</p>
            <p className="text-sm font-bold" style={{ color: rate >= 60 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444" }}>
              {rate}%
            </p>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${rate}%`, backgroundColor: rate >= 60 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444" }}
            />
          </div>
        </div>
      )}

      {/* Deals */}
      {deals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Deals
          </p>
          {deals.map((d: any) => {
            const dr = d.total_claims > 0 ? Math.round((d.total_redeems / d.total_claims) * 100) : 0;
            return (
              <div key={d.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {d.emoji ?? "🍽️"} {d.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs" style={{ color: "#E85D04" }}>{d.total_claims} claimed</span>
                      <span className="text-xs text-green-400">{d.total_redeems} redeemed</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-sm font-bold"
                      style={{ color: dr >= 60 ? "#22c55e" : dr >= 40 ? "#f59e0b" : "#ef4444" }}
                    >
                      {dr}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.is_live ? "Live" : "Off"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
