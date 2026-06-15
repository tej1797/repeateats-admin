"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
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

export function AnalyticsClient(props: Props) {
  const router = useRouter();
  const [restaurantLimit, setRestaurantLimit] = useState<LimitOption>(10);

  if (props.view === "restaurant") {
    return <RestaurantDrillDown restaurant={props.restaurant} deals={props.deals} />;
  }

  const { overview, restaurants } = props;

  const sortedRestaurants = [...restaurants].sort((a, b) => b.total_redeems - a.total_redeems);
  const limitedRestaurants =
    restaurantLimit === "All" ? sortedRestaurants : sortedRestaurants.slice(0, restaurantLimit);

  const chartData = sortedRestaurants.slice(0, 8).map((r: any) => ({
    name: r.name.length > 10 ? r.name.split(" ")[0] : r.name,
    claims: r.total_claims,
    redeems: r.total_redeems,
    id: r.id,
  }));

  return (
    <div className="pt-12 px-4 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Analytics</h1>

      {/* Overview stat cards — tap to open user list */}
      <div className="grid grid-cols-2 gap-3">
        <BigStatCard
          label="Customers"
          value={overview.total_customers}
          sub={`+${overview.new_customers_7d} this week`}
          icon={<Users size={16} />}
          onClick={() => router.push("/users?tab=customers")}
        />
        <BigStatCard
          label="Restaurants"
          value={overview.total_restaurants}
          sub={`+${overview.new_restaurants_7d} this week`}
          icon={<Store size={16} />}
          onClick={() => router.push("/users?tab=restaurants")}
        />
        <BigStatCard
          label="Creators"
          value={overview.total_creators}
          icon={<Star size={16} />}
          onClick={() => router.push("/users?tab=creators")}
        />
        <BigStatCard
          label="Active Collabs"
          value={overview.active_collabs}
          sub={`${overview.total_collabs} total`}
          icon={<TrendingUp size={16} />}
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

      {/* Restaurant performance bar chart */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Restaurant Performance{" "}
            <span className="text-[10px] normal-case font-normal ml-1">Tap to drill down</span>
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                style={{ background: "transparent" }}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]?.payload?.id) {
                    router.push(`/analytics?view=restaurant&restaurantId=${data.activePayload[0].payload.id}`);
                  }
                }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#888" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "#ccc" }}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <Bar dataKey="claims" name="Claims" fill="#E85D04" radius={[3, 3, 0, 0]} />
                <Bar dataKey="redeems" name="Redeems" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By Restaurant — sortable list with limit dropdown */}
      <div className="space-y-2 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            By Restaurant
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

        {limitedRestaurants.map((r: any) => (
          <button
            key={r.id}
            onClick={() => router.push(`/analytics?view=restaurant&restaurantId=${r.id}`)}
            className="w-full bg-card border border-border rounded-2xl p-4 text-left flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                {r.has_discrepancy && (
                  <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs" style={{ color: "#E85D04" }}>{r.total_claims} claimed</span>
                <span className="text-xs text-green-400">{r.total_redeems} redeemed</span>
                <span
                  className="text-xs font-medium ml-auto"
                  style={{ color: r.redemption_rate >= 60 ? "#22c55e" : r.redemption_rate >= 40 ? "#f59e0b" : "#ef4444" }}
                >
                  {r.redemption_rate}%
                </span>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
          </button>
        ))}
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
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl p-4 ${onClick ? "active:opacity-80 cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2 text-muted-foreground">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-xs font-medium">{label}</p>
        </div>
        {onClick && <ChevronRight size={12} className="text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
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
        {deals.map((d) => {
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
                <span className="text-sm font-bold flex-shrink-0" style={{ color: dr >= 60 ? "#22c55e" : dr >= 40 ? "#f59e0b" : "#ef4444" }}>
                  {dr}%
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${dr}%`, backgroundColor: dr >= 60 ? "#22c55e" : "#f59e0b" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-2" />
    </div>
  );
}
