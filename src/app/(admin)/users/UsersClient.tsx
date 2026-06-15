"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Search, Users, Store, Star, Download } from "lucide-react";

const TAB_EXPORT: Record<string, string> = {
  customers: "customers",
  restaurants: "restaurants",
  creators: "creators",
};

function downloadExport(type: string) {
  window.open(`/api/export?type=${type}`, "_blank");
}

type Props = {
  customers: any[];
  restaurants: any[];
  creators: any[];
  activeTab: string;
  query: string;
};

const TABS = [
  { id: "customers", label: "Customers", icon: Users, color: "#E85D04" },
  { id: "restaurants", label: "Restaurants", icon: Store, color: "#3b82f6" },
  { id: "creators", label: "Creators", icon: Star, color: "#7E22CE" },
];

export function UsersClient({ customers, restaurants, creators, activeTab, query }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query);

  const setTab = (tab: string) => {
    router.push(`${pathname}?tab=${tab}${search ? `&q=${search}` : ""}`);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    router.push(`${pathname}?tab=${activeTab}&q=${val}`);
  };

  return (
    <div className="pt-12">
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <button
            onClick={() => downloadExport(TAB_EXPORT[activeTab] ?? activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ backgroundColor: "#1E1E1E", color: "#888" }}
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9 bg-secondary border-border rounded-xl"
          />
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-0 px-4 mb-4 bg-secondary rounded-xl mx-4 p-1">
        {TABS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors"
            style={
              activeTab === id
                ? { backgroundColor: color, color: "#fff" }
                : { color: "#888" }
            }
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 space-y-2">
        {activeTab === "customers" &&
          customers.map((u: any) => (
            <button
              key={u.id}
              onClick={() => router.push(`/users/customer/${u.id}`)}
              className="w-full bg-card border border-border rounded-2xl p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">{u.city ?? "Unknown city"}</span>
                    <span className="text-xs text-muted-foreground">
                      {(u.claims ?? []).length} claims
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                </span>
              </div>
            </button>
          ))}

        {activeTab === "restaurants" &&
          restaurants.map((r: any) => {
            const totalClaims = (r.deals ?? []).reduce(
              (sum: number, d: any) => sum + (d.current_claims ?? 0),
              0
            );
            return (
              <button
                key={r.id}
                onClick={() => router.push(`/users/restaurant/${r.id}`)}
                className="w-full bg-card border border-border rounded-2xl p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                      {r.is_live && (
                        <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.city} · {r.cuisine ?? "—"}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">{(r.deals ?? []).length} deals</span>
                      <span className="text-xs text-muted-foreground">{totalClaims} total claims</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
              </button>
            );
          })}

        {activeTab === "creators" &&
          creators.map((inf: any) => (
            <button
              key={inf.id}
              onClick={() => router.push(`/users/creator/${inf.id}`)}
              className="w-full bg-card border border-border rounded-2xl p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {inf.users?.name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{inf.instagram_handle ?? inf.tiktok_handle ?? "—"}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {inf.follower_count?.toLocaleString() ?? "?"} followers
                    </span>
                    <span className="text-xs text-muted-foreground">{inf.niche ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{inf.total_collabs ?? 0} collabs</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(inf.created_at), { addSuffix: true })}
                </span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
