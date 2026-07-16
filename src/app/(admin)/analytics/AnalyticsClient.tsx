"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, TrendingUp, Users, Store, Star, ChevronRight } from "lucide-react";
import type { AnalyticsOverview } from "@/types";

type Props =
  | { view: "overview"; overview: AnalyticsOverview; restaurants: any[] }
  | { view: "restaurant"; restaurant: any; deals: any[] }
  | { view: "customers"; customers: any[]; customerClaims: any[] }
  | { view: "restaurants"; allRestaurants: any[]; allDeals: any[] }
  | { view: "creators"; creators: any[]; collabs: any[] };

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
  if (props.view === "customers") {
    return <CustomersAnalytics customers={props.customers} claims={props.customerClaims} />;
  }
  if (props.view === "restaurants") {
    return <RestaurantsAnalytics restaurants={props.allRestaurants} deals={props.allDeals} />;
  }
  if (props.view === "creators") {
    return <CreatorsAnalytics creators={props.creators} collabs={props.collabs} />;
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
          onClick={() => router.push("/analytics?view=customers")}
        />
        <BigStatCard
          label="Restaurants"
          value={overview.total_restaurants}
          sub={`+${overview.new_restaurants_7d} this week`}
          icon={<Store size={15} />}
          accent="#3b82f6"
          onClick={() => router.push("/analytics?view=restaurants")}
        />
        <BigStatCard
          label="Creators"
          value={overview.total_creators}
          icon={<Star size={15} />}
          accent="#7E22CE"
          onClick={() => router.push("/analytics?view=creators")}
        />
        <BigStatCard
          label="Active Collabs"
          value={overview.active_collabs}
          sub={`${overview.total_collabs} total`}
          icon={<TrendingUp size={15} />}
          accent="#22c55e"
          onClick={() => router.push("/analytics?view=creators")}
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

/* ================= Portal drill-down analytics ================= */

const DEAL_KIND_LABELS: Record<string, string> = {
  bogo: "Buy 1 Get 1 Free",
  bogo_half: "BOGO 50% off",
  percentage: "% off",
  fixed: "$ off",
  set_price: "Set price combo",
  free_item: "Free item",
};
const dealKindLabel = (t: string | null) =>
  t ? DEAL_KIND_LABELS[t] ?? t.replace(/_/g, " ") : "Other";

// "Indian", "Indian Restaurant", "indian restaurants" → all become "Indian".
function normalizeCuisine(c: string | null | undefined): string | null {
  if (!c) return null;
  let s = c.trim().replace(/\s+(restaurants?|cuisine)$/i, "").trim();
  if (!s) s = c.trim();
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

// Lighter shade of each portal accent, for gradient bar fills.
const SHADE: Record<string, string> = {
  "#E85D04": "#FB8B3C",
  "#3b82f6": "#6BA6FF",
  "#7E22CE": "#B15AF0",
  "#22c55e": "#4ADE80",
};
const barFill = (accent: string) =>
  `linear-gradient(90deg, ${accent}, ${SHADE[accent] ?? accent})`;

type Ranked = { label: string; value: number; sub?: string; members?: string[] };

// Count items by key; optionally collect the unique member names in each bucket
// so a bar can expand to show *which* restaurants/customers are in it.
function tally<T>(
  items: T[],
  key: (item: T) => string | null | undefined,
  member?: (item: T) => string | null | undefined
): Ranked[] {
  const map = new Map<string, { value: number; members: Set<string> }>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    const entry = map.get(k) ?? { value: 0, members: new Set<string>() };
    entry.value += 1;
    const m = member?.(item);
    if (m) entry.members.add(m);
    map.set(k, entry);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, value: v.value, members: [...v.members].sort() }))
    .sort((a, b) => b.value - a.value);
}

function DrillHeader({ title, sub, accent }: { title: string; sub: string; accent: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => router.push("/analytics")}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
      >
        <ArrowLeft size={17} />
      </button>
      <div>
        <h1 className="text-xl font-bold" style={{ color: accent }}>{title}</h1>
        <p className="text-[13px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function CityChips({
  cities, selected, onSelect, accent,
}: { cities: string[]; selected: string; onSelect: (c: string) => void; accent: string }) {
  if (cities.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {["all", ...cities].map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors border"
          style={
            selected === c
              ? { backgroundColor: `${accent}26`, borderColor: accent, color: accent }
              : { backgroundColor: "transparent", borderColor: "#262626", color: "#9a9a9a" }
          }
        >
          {c === "all" ? "All cities" : c}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{
        background: "linear-gradient(180deg, #17181a 0%, #101012 100%)",
        borderColor: "#242628",
        boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset",
      }}
    >
      <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function RankBars({
  items, color, unit, empty,
}: { items: Ranked[]; color: string; unit?: string; empty?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-3">{empty ?? "No data yet."}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((i) => {
        const expandable = (i.members?.length ?? 0) > 0;
        const isOpen = open === i.label;
        return (
          <div key={i.label}>
            <button
              type="button"
              disabled={!expandable}
              onClick={() => setOpen(isOpen ? null : i.label)}
              className="w-full text-left"
            >
              <div className="flex justify-between items-baseline mb-1.5 gap-2">
                <span className="text-sm text-foreground truncate capitalize flex items-center gap-1">
                  {i.label}
                  {expandable && (
                    <ChevronRight
                      size={13}
                      className="text-muted-foreground transition-transform"
                      style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                    />
                  )}
                </span>
                <span className="text-sm font-semibold flex-shrink-0" style={{ color }}>
                  {i.value.toLocaleString()}{unit ? ` ${unit}` : ""}{i.sub ? ` · ${i.sub}` : ""}
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(i.value / max) * 100}%`, background: barFill(color) }}
                />
              </div>
            </button>
            {isOpen && expandable && (
              <div className="flex flex-wrap gap-1.5 mt-2 pl-1">
                {i.members!.map((m) => (
                  <span
                    key={m}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ backgroundColor: `${color}1a`, color }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Customers ---------- */

function CustomersAnalytics({ customers, claims }: { customers: any[]; claims: any[] }) {
  const ACCENT = "#E85D04";
  const [city, setCity] = useState("all");

  const cities = [...new Set(customers.map((c) => c.city).filter(Boolean))].sort() as string[];
  const visibleCustomers = city === "all" ? customers : customers.filter((c) => c.city === city);
  const visibleIds = new Set(visibleCustomers.map((c) => c.id));
  const visibleClaims = claims.filter((cl) => visibleIds.has(cl.user_id));

  const byCustomer = visibleCustomers
    .map((c) => {
      const mine = claims.filter((cl) => cl.user_id === c.id);
      return {
        ...c,
        claims: mine.length,
        redeems: mine.filter((m) => m.redeemed).length,
        saved: mine.reduce((s, m) => s + (m.money_saved_cents ?? 0), 0) / 100,
      };
    })
    .sort((a, b) => b.claims - a.claims);

  return (
    <div className="pt-12 px-4 space-y-4 pb-nav">
      <DrillHeader title="Customer Analytics" sub="Who claims, what they love, where they are" accent={ACCENT} />
      <CityChips cities={cities} selected={city} onSelect={setCity} accent={ACCENT} />

      <Section title={`Most active customers (${visibleCustomers.length})`}>
        {byCustomer.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No customers in this city yet.</p>
        ) : (
          <div className="space-y-2">
            {byCustomer.slice(0, 15).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name ?? c.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.city ?? "—"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs">
                    <span style={{ color: ACCENT }}>{c.claims} claims</span>
                    {" · "}
                    <span className="text-green-400">{c.redeems} redeemed</span>
                  </p>
                  {c.saved > 0 && (
                    <p className="text-[10px] text-muted-foreground">${c.saved.toFixed(2)} saved</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Favourite cuisines (by claims)">
        <RankBars
          items={tally(visibleClaims, (c) => normalizeCuisine(c.cuisine), (c) => c.restaurant_name)}
          color={ACCENT}
          unit="claims"
          empty="No claims yet."
        />
      </Section>

      <Section title="Deal types they pick">
        <RankBars
          items={tally(visibleClaims, (c) => dealKindLabel(c.discount_type), (c) => c.restaurant_name)}
          color={ACCENT}
          unit="claims"
          empty="No claims yet."
        />
      </Section>

      <Section title="Restaurants they claim from">
        <RankBars items={tally(visibleClaims, (c) => c.restaurant_name)} color={ACCENT} unit="claims" empty="No claims yet." />
      </Section>

      <Section title="Customers by city">
        <RankBars
          items={tally(customers, (c) => c.city, (c) => c.name ?? c.email)}
          color={ACCENT}
          unit="customers"
          empty="No cities recorded."
        />
      </Section>
    </div>
  );
}

/* ---------- Restaurants ---------- */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function RestaurantsAnalytics({ restaurants, deals }: { restaurants: any[]; deals: any[] }) {
  const ACCENT = "#3b82f6";
  const [city, setCity] = useState("all");

  const cities = [...new Set(restaurants.map((r) => r.city).filter(Boolean))].sort() as string[];
  const visibleRestaurants = city === "all" ? restaurants : restaurants.filter((r) => r.city === city);
  const visibleIds = new Set(visibleRestaurants.map((r) => r.id));
  const visibleDeals = deals.filter((d) => visibleIds.has(d.restaurant_id));
  const restById = new Map(restaurants.map((r) => [r.id, r]));

  // When during the week deals get POSTED (created_at day)
  const postedByDay = WEEKDAYS.map((label, idx) => ({
    label,
    value: visibleDeals.filter((d) => new Date(d.created_at).getDay() === idx).length,
  }));
  const weekend = postedByDay[0].value + postedByDay[6].value + postedByDay[5].value; // Fri+Sat+Sun
  const weekday = visibleDeals.length - weekend;

  const topPosters = visibleRestaurants
    .map((r) => {
      const mine = deals.filter((d) => d.restaurant_id === r.id);
      return {
        label: r.name,
        value: mine.length,
        sub: `${mine.reduce((s, d) => s + (d.current_claims ?? 0), 0)} claims`,
      };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="pt-12 px-4 space-y-4 pb-nav">
      <DrillHeader title="Restaurant Analytics" sub="What they post, when, and where" accent={ACCENT} />
      <CityChips cities={cities} selected={city} onSelect={setCity} accent={ACCENT} />

      <Section title={`Deals posted (${visibleDeals.length} total)`}>
        <RankBars items={topPosters} color={ACCENT} unit="deals" empty="No deals posted yet." />
      </Section>

      <Section title="Deal types being posted">
        <RankBars
          items={tally(visibleDeals, (d) => dealKindLabel(d.discount_type), (d) => restById.get(d.restaurant_id)?.name)}
          color={ACCENT}
          unit="deals"
          empty="No deals yet."
        />
      </Section>

      <Section title="Cuisines posting deals">
        <RankBars
          items={tally(
            visibleDeals,
            (d) => normalizeCuisine(restById.get(d.restaurant_id)?.cuisine),
            (d) => restById.get(d.restaurant_id)?.name
          )}
          color={ACCENT}
          unit="deals"
          empty="No deals yet."
        />
      </Section>

      <Section title="When deals get posted">
        <div className="flex items-end gap-1.5 h-28 mb-3">
          {postedByDay.map((d) => {
            const max = Math.max(...postedByDay.map((x) => x.value), 1);
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <span className="text-[11px] font-medium" style={{ color: d.value > 0 ? ACCENT : "transparent" }}>
                  {d.value || "0"}
                </span>
                <div
                  className="w-full rounded-md transition-all"
                  style={{
                    height: `${(d.value / max) * 72}%`,
                    minHeight: d.value > 0 ? 6 : 2,
                    background: d.value > 0 ? barFill(ACCENT) : "rgba(255,255,255,0.05)",
                  }}
                />
                <span className="text-[11px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 text-[13px]">
          <span className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ backgroundColor: `${ACCENT}14` }}>
            <span className="font-bold text-base" style={{ color: ACCENT }}>{weekday}</span>
            <span className="text-muted-foreground"> weekday posts</span>
          </span>
          <span className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ backgroundColor: `${ACCENT}14` }}>
            <span className="font-bold text-base" style={{ color: ACCENT }}>{weekend}</span>
            <span className="text-muted-foreground"> Fri–Sun posts</span>
          </span>
        </div>
      </Section>

      <Section title="Restaurants by city">
        <RankBars
          items={tally(restaurants, (r) => r.city, (r) => r.name)}
          color={ACCENT}
          unit="venues"
          empty="No cities recorded."
        />
      </Section>

      <Section title="Live vs pending">
        <RankBars
          items={tally(
            restaurants,
            (r) => (r.is_live ? "Live on RepEAT" : r.verification_status === "pending" ? "Awaiting verification" : "Not live"),
            (r) => r.name
          )}
          color={ACCENT}
          unit="venues"
        />
      </Section>
    </div>
  );
}

/* ---------- Creators ---------- */

function CreatorsAnalytics({ creators, collabs }: { creators: any[]; collabs: any[] }) {
  const ACCENT = "#7E22CE";
  const [city, setCity] = useState("all");

  const cities = [...new Set(creators.map((c) => c.city).filter(Boolean))].sort() as string[];
  const visibleCreators = city === "all" ? creators : creators.filter((c) => c.city === city);
  const visibleIds = new Set(visibleCreators.map((c) => c.id));
  const visibleCollabs = collabs.filter((c) => visibleIds.has(c.influencer_id));

  return (
    <div className="pt-12 px-4 space-y-4 pb-nav">
      <DrillHeader title="Creator Analytics" sub="Who they are and who they collab with" accent={ACCENT} />
      <CityChips cities={cities} selected={city} onSelect={setCity} accent={ACCENT} />

      <Section title={`Creators (${visibleCreators.length})`}>
        {visibleCreators.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No creators in this city yet.</p>
        ) : (
          <div className="space-y-2">
            {[...visibleCreators]
              .sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate capitalize">
                      {[c.niche, c.primary_platform, c.city].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold" style={{ color: ACCENT }}>
                      {(c.follower_count ?? 0).toLocaleString()} followers
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.total_collabs ?? 0} collabs{c.rating ? ` · ★ ${c.rating}` : ""}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Section>

      <Section title="Collabs by cuisine">
        <RankBars
          items={tally(visibleCollabs, (c) => normalizeCuisine(c.cuisine), (c) => c.restaurant_name)}
          color={ACCENT}
          unit="collabs"
          empty="No collabs yet."
        />
      </Section>

      <Section title="Restaurants they collab with">
        <RankBars items={tally(visibleCollabs, (c) => c.restaurant_name)} color={ACCENT} unit="collabs" empty="No collabs yet." />
      </Section>

      <Section title="Collab status">
        <RankBars
          items={tally(visibleCollabs, (c) => (c.status ?? "unknown").replace(/_/g, " "), (c) => c.restaurant_name)}
          color={ACCENT}
          unit="collabs"
          empty="No collabs yet."
        />
      </Section>

      <Section title="Creator niches">
        <RankBars
          items={tally(creators, (c) => c.niche, (c) => c.name)}
          color={ACCENT}
          unit="creators"
          empty="No niches recorded."
        />
      </Section>

      <Section title="Creators by city">
        <RankBars
          items={tally(creators, (c) => c.city, (c) => c.name)}
          color={ACCENT}
          unit="creators"
          empty="No cities recorded."
        />
      </Section>
    </div>
  );
}
