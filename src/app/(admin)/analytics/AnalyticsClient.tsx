"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, TrendingUp, Users, Store, Star, ChevronRight } from "lucide-react";
import type { AnalyticsOverview } from "@/types";

type Props =
  | {
      view: "overview";
      overview: AnalyticsOverview;
      restaurants: any[];
      restaurant?: never;
      deals?: never;
    }
  | {
      view: "restaurant";
      restaurant: any;
      deals: any[];
      overview?: never;
      restaurants?: never;
    };

const LIMIT_OPTIONS = [10, 20, 30, 50, "All"] as const;
type LimitOption = typeof LIMIT_OPTIONS[number];

type SortKey = "redeems" | "claims";

export function AnalyticsClient(props: Props) {
  const router = useRouter();
  const [restaurantLimit, setRestaurantLimit] = useState<LimitOption>(10);
  const [chartSort, setChartSort] = useState<SortKey>("redeems");

  if (props.view === "restaurant") {
    return <RestaurantDrillDown restaurant={props.restaurant} deals={props.deals} />;
  }

  const { overview, restaurants } = props;

  const sortedRestaurants = [...restaurants].sort((a, b) =>
    chartSort === "claims" ? b.total_claims - a.total_claims : b.total_redeems - a.total_redeems
  );
  const limitedRestaurants =
    restaurantLimit === "All" ? sortedRestaurants : sortedRestaurants.slice(0, restaurantLimit);

  // One shared scale so bars are comparable across restaurants
  const maxCount = Math.max(
    ...limitedRestaurants.map((r: any) => Math.max(r.total_claims, r.total_redeems)),
    1
  );

  return (
    <div className="pt-12 px-4 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Analytics</h1>

      {/* Overview stat cards — tap to open user list */}
      <div className="grid grid-cols-2 gap-3">
        <BigStatCard
          label="Customers"
          value={overview.total_customers}
          sub={`+${overview.new_customers_7d} this week`}
          icon={<Users size={15} />}
          accent="#E85D04"
          onClick={() => router.push("/users?tab=customers")}
        />
        <BigStatCard
          label="Restaurants"
          value={overview.total_restaurants}
          sub={`+${overview.new_restaurants_7d} this week`}
          icon={<Store size={15} />}
          accent="#3b82f6"
          onClick={() => router.push("/users?tab=restaurants")}
        />
        <BigStatCard
          label="Creators"
          value={overview.total_creators}
          icon={<Star size={15} />}
          accent="#7E22CE"
          onClick={() => router.push("/users?tab=creators")}
        />
        <BigStatCard
          label="Active Collabs"
          value={overview.active_collabs}
          sub={`${overview.total_collabs} total`}
          icon={<TrendingUp size={15} />}
          accent="#22c55e"
        />
      </div>

      {/* Claims vs Redeems — two bars */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Claims vs Redeems
        </p>
        <div className="flex items-baseline gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold" style={{ color: "#E85D04" }}>{overview.total_claims.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">claims</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{overview.total_redeems.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">redeemed</p>
          </div>
          <div className="ml-auto text-right">
            <p
              className="text-2xl font-bold"
              style={{ color: overview.redemption_rate >= 60 ? "#22c55e" : overview.redemption_rate >= 40 ? "#f59e0b" : "#ef4444" }}
            >
              {overview.redemption_rate}%
            </p>
            <p className="text-xs text-muted-foreground">rate</p>
          </div>
        </div>

        {/* Two-bar visual */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Claims</span>
              <span>{overview.total_claims.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full w-full" style={{ backgroundColor: "#E85D04" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Redeems</span>
              <span>{overview.total_redeems.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${overview.redemption_rate}%`, backgroundColor: "#22c55e" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant performance — horizontal bars, readable names, tap to drill down */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Restaurant Performance
          </p>
          <div className="flex gap-1">
            {LIMIT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setRestaurantLimit(opt)}
                className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                style={
                  restaurantLimit === opt
                    ? { backgroundColor: "#E85D04", color: "#fff" }
                    : { backgroundColor: "#1E1E1E", color: "#888" }
                }
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Sort chips */}
        <div className="flex gap-2">
          {([
            { key: "claims", label: "Sort by claims", color: "#E85D04" },
            { key: "redeems", label: "Sort by redeems", color: "#22c55e" },
          ] as { key: SortKey; label: string; color: string }[]).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setChartSort(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
              style={
                chartSort === key
                  ? { backgroundColor: color, color: "#fff" }
                  : { backgroundColor: "#1E1E1E", color: "#888" }
              }
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: chartSort === key ? "#fff" : color }}
              />
              {label}
            </button>
          ))}
        </div>

        {limitedRestaurants.length === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">No restaurant activity yet.</p>
        )}

        <div className="space-y-1">
          {limitedRestaurants.map((r: any) => (
            <button
              key={r.id}
              onClick={() => router.push(`/analytics?view=restaurant&restaurantId=${r.id}`)}
              className="w-full text-left rounded-xl px-3 py-3 hover:bg-secondary/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                {r.has_discrepancy && (
                  <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                )}
                <span
                  className="text-xs font-bold ml-auto flex-shrink-0"
                  style={{ color: r.redemption_rate >= 60 ? "#22c55e" : r.redemption_rate >= 40 ? "#f59e0b" : "#ef4444" }}
                >
                  {r.redemption_rate}%
                </span>
                <ChevronRight size={13} className="text-muted-foreground flex-shrink-0" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(r.total_claims / maxCount) * 100}%`, backgroundColor: "#E85D04" }}
                    />
                  </div>
                  <span className="text-[10px] w-16 flex-shrink-0" style={{ color: "#E85D04" }}>
                    {r.total_claims} claims
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(r.total_redeems / maxCount) * 100}%`, backgroundColor: "#22c55e" }}
                    />
                  </div>
                  <span className="text-[10px] w-16 flex-shrink-0 text-green-400">
                    {r.total_redeems} redeems
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="h-2" />
    </div>
  );
}

function BigStatCard({
  label,
  value,
  sub,
  icon,
  accent = "#E85D04",
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl p-4 ${onClick ? "active:opacity-80 cursor-pointer" : ""}`}
      onClick={onClick}
      style={{ borderTop: `2px solid ${accent}` }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            {icon}
          </span>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        {onClick && <ChevronRight size={12} className="text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold" style={{ color: accent }}>{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function RestaurantDrillDown({ restaurant, deals }: { restaurant: any; deals: any[] }) {
  const router = useRouter();
  const totalClaims = deals.reduce((s, d) => s + d.total_claims, 0);
  const totalRedeems = deals.reduce((s, d) => s + d.total_redeems, 0);
  const rate = totalClaims > 0 ? Math.round((totalRedeems / totalClaims) * 100) : 0;

  return (
    <div className="pt-12 px-4 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/analytics")}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{restaurant?.name}</h1>
          <p className="text-xs text-muted-foreground">{restaurant?.city} · {restaurant?.cuisine}</p>
        </div>
      </div>

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
          <p className="text-[10px] text-muted-foreground">Redeems</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex justify-between mb-3">
          <p className="text-xs text-muted-foreground">Redemption rate</p>
          <p className="text-sm font-bold" style={{ color: rate >= 60 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444" }}>
            {rate}%
          </p>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Claims</span><span>{totalClaims}</span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full w-full" style={{ backgroundColor: "#E85D04" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Redeems</span><span>{totalRedeems}</span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: "#22c55e" }} />
            </div>
          </div>
        </div>
        {rate < 50 && totalClaims > 10 && (
          <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
            <AlertTriangle size={11} />
            Discrepancy detected — more than half of claims are not being redeemed.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal Breakdown</p>
        {(() => {
          const maxClaims = Math.max(...deals.map((d) => d.total_claims), 1);
          return deals.map((d) => {
            const dr = d.total_claims > 0 ? Math.round((d.total_redeems / d.total_claims) * 100) : 0;
            const claimPct = Math.round((d.total_claims / maxClaims) * 100);
            const redeemPct = Math.round((d.total_redeems / maxClaims) * 100);
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
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: dr >= 60 ? "#22c55e" : dr >= 40 ? "#f59e0b" : "#ef4444" }}>
                    {dr}%
                  </span>
                </div>
                <div className="space-y-1 mt-2">
                  <div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                      <span>Claims</span><span>{d.total_claims}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${claimPct}%`, backgroundColor: "#E85D04" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                      <span>Redeems</span><span>{d.total_redeems}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${redeemPct}%`, backgroundColor: "#22c55e" }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
      <div className="h-2" />
    </div>
  );
}
