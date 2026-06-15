"use client";

import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ArrowRight, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<string, string> = {
  claim_issue: "Claim",
  redemption_issue: "Redemption",
  technical: "Technical",
  payment: "Payment",
  collab: "Collab",
  account: "Account",
  general: "General",
};

type Props = {
  data: {
    stats: {
      open: number;
      urgent: number;
      inProgress: number;
      resolvedToday: number;
      newSinceLastCheck: number;
    };
    avgResponseHours: number;
    topCategories: { category: string; count: number }[];
    dailyVolume: { date: string; count: number }[];
    oldestTicket: {
      id: string;
      subject: string;
      created_at: string;
      portal: string;
      category: string;
      priority: string;
    } | null;
    lastCheckLabel: string;
  };
};

export function DashboardClient({ data }: Props) {
  const router = useRouter();
  const { stats, avgResponseHours, topCategories, dailyVolume, oldestTicket } = data;

  const chartData = dailyVolume.map((d) => ({
    ...d,
    label: format(new Date(d.date + "T12:00:00"), "EEE"),
  }));

  return (
    <div className="px-4 pt-12 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Rep<span style={{ color: "#E85D04" }}>EAT</span> Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Support Overview</p>
        </div>
        {stats.newSinceLastCheck > 0 && (
          <Badge
            className="text-white text-xs font-bold px-2.5 py-1"
            style={{ backgroundColor: "#E85D04" }}
          >
            {stats.newSinceLastCheck} new
          </Badge>
        )}
      </div>

      {/* Stat Cards — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Open"
          value={stats.open}
          color="#E85D04"
          onClick={() => router.push("/queue?status=open")}
        />
        <StatCard
          label="Urgent"
          value={stats.urgent}
          color="#ef4444"
          onClick={() => router.push("/queue?priority=urgent")}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          color="#3b82f6"
          onClick={() => router.push("/queue?status=in_progress")}
        />
        <StatCard
          label="Resolved Today"
          value={stats.resolvedToday}
          color="#22c55e"
          onClick={() => router.push("/queue?status=resolved")}
        />
      </div>

      {/* Avg first response */}
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(232,93,4,0.12)" }}
        >
          <Clock size={18} style={{ color: "#E85D04" }} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg first response (7 days)</p>
          <p className="text-lg font-bold text-foreground">
            {avgResponseHours === 0 ? "—" : `${avgResponseHours}h`}
          </p>
        </div>
      </div>

      {/* 7-day sparkline */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ticket Volume — Last 7 Days
        </p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E85D04" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E85D04" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#888" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#888" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#888" }}
                itemStyle={{ color: "#E85D04" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#E85D04"
                strokeWidth={2}
                fill="url(#volGrad)"
                dot={false}
                name="Tickets"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Top Categories This Week
          </p>
          <div className="space-y-2.5">
            {topCategories.map(({ category, count }, i) => {
              const max = topCategories[0].count;
              const pct = Math.round((count / max) * 100);
              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">
                      {CATEGORY_LABELS[category] ?? category}
                    </span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: i === 0 ? "#E85D04" : "#444",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick action: jump to oldest open ticket */}
      {oldestTicket && (
        <button
          onClick={() => router.push(`/queue/${oldestTicket.id}`)}
          className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 active:scale-98 transition-transform text-left"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
          >
            <Zap size={18} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Jump to oldest open ticket</p>
            <p className="text-sm font-medium text-foreground truncate">{oldestTicket.subject}</p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {oldestTicket.portal} · {CATEGORY_LABELS[oldestTicket.category]}
            </p>
          </div>
          <ArrowRight size={16} className="text-muted-foreground flex-shrink-0" />
        </button>
      )}

      <div className="h-2" />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-2xl p-4 text-left active:scale-95 transition-transform w-full"
    >
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      <div
        className="w-6 h-0.5 rounded-full mt-2"
        style={{ backgroundColor: color }}
      />
    </button>
  );
}
