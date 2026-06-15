"use client";

import { useRouter, usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { SupportTicket } from "@/types";
import { CheckCheck, AlertTriangle } from "lucide-react";

const PORTAL_LABELS: Record<string, string> = {
  customer: "Customer",
  restaurant: "Restaurant",
  creator: "Creator",
};
const PORTAL_COLORS: Record<string, string> = {
  customer: "#E85D04",   // orange
  restaurant: "#3b82f6", // blue
  creator: "#7E22CE",    // purple
};
const CATEGORY_LABELS: Record<string, string> = {
  claim_issue: "Claim",
  redemption_issue: "Redemption",
  technical: "Technical",
  payment: "Payment",
  collab: "Collab",
  account: "Account",
  general: "General",
};
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];
const PORTAL_OPTIONS = [
  { value: "all", label: "All", activeColor: "#E85D04" },
  { value: "customer", label: "Customer", activeColor: "#E85D04" },
  { value: "restaurant", label: "Restaurant", activeColor: "#3b82f6" },
  { value: "creator", label: "Creator", activeColor: "#7E22CE" },
];
const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "claim_issue", label: "Claim" },
  { value: "redemption_issue", label: "Redemption" },
  { value: "technical", label: "Technical" },
  { value: "payment", label: "Payment" },
  { value: "collab", label: "Collab" },
  { value: "account", label: "Account" },
  { value: "general", label: "General" },
];

type Props = {
  tickets: (SupportTicket & { unread_count: number })[];
  activeFilters: {
    status?: string;
    portal?: string;
    category?: string;
    priority?: string;
  };
};

export function QueueClient({ tickets, activeFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (activeFilters.status) params.set("status", activeFilters.status);
    if (activeFilters.portal) params.set("portal", activeFilters.portal);
    if (activeFilters.category) params.set("category", activeFilters.category);
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const currentStatus = activeFilters.status ?? "active";
  const currentPortal = activeFilters.portal ?? "all";
  const currentCategory = activeFilters.category ?? "all";

  return (
    <div className="pt-12">
      <div className="px-4 pb-3">
        <h1 className="text-xl font-bold text-foreground">Queue</h1>
        <p className="text-xs text-muted-foreground">{tickets.length} tickets</p>
      </div>

      <div className="space-y-2 pb-3">
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter("status", value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={
                currentStatus === value
                  ? { backgroundColor: "#E85D04", color: "#fff" }
                  : { backgroundColor: "#1E1E1E", color: "#888" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {PORTAL_OPTIONS.map(({ value, label, activeColor }) => (
            <button
              key={value}
              onClick={() => setFilter("portal", value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={
                currentPortal === value
                  ? { backgroundColor: "#1E1E1E", color: "#F0F0F0", border: `1px solid ${activeColor}` }
                  : { backgroundColor: "#1E1E1E", color: "#888", border: "1px solid transparent" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter("category", value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={
                currentCategory === value
                  ? { backgroundColor: "#1E1E1E", color: "#F0F0F0", border: "1px solid #3b82f6" }
                  : { backgroundColor: "#1E1E1E", color: "#888", border: "1px solid transparent" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 px-4">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCheck size={40} className="text-muted-foreground mb-3" />
            <p className="text-foreground font-medium">All clear!</p>
            <p className="text-muted-foreground text-sm mt-1">No tickets match these filters.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onTap={() => router.push(`/queue/${ticket.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TicketCard({
  ticket,
  onTap,
}: {
  ticket: SupportTicket & { unread_count: number };
  onTap: () => void;
}) {
  const isUrgent = ticket.priority === "urgent";
  const portalColor = PORTAL_COLORS[ticket.portal] ?? "#888";

  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 active:opacity-80 cursor-pointer"
      onClick={onTap}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: portalColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-foreground truncate">
              {ticket.user_name ?? ticket.user_email}
            </p>
            {isUrgent && <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />}
            {ticket.unread_count > 0 && (
              <span
                className="text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
                style={{ backgroundColor: "#E85D04" }}
              >
                {ticket.unread_count}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/80 truncate">{ticket.subject}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${portalColor}20`, color: portalColor }}
            >
              {PORTAL_LABELS[ticket.portal]}
            </span>
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[ticket.category]}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
