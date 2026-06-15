"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { SupportTicket } from "@/types";
import { CheckCheck, Clock, AlertTriangle } from "lucide-react";

const PORTAL_LABELS: Record<string, string> = {
  customer: "Customer",
  restaurant: "Restaurant",
  creator: "Creator",
};
const PORTAL_COLORS: Record<string, string> = {
  customer: "#3b82f6",
  restaurant: "#065F46",
  creator: "#7E22CE",
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
  { value: "all", label: "All" },
  { value: "customer", label: "Customer" },
  { value: "restaurant", label: "Restaurant" },
  { value: "creator", label: "Creator" },
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
      {/* Header */}
      <div className="px-4 pb-3">
        <h1 className="text-xl font-bold text-foreground">Queue</h1>
        <p className="text-xs text-muted-foreground">{tickets.length} tickets</p>
      </div>

      {/* Filter strips */}
      <div className="space-y-2 pb-3">
        {/* Status filter */}
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

        {/* Portal filter */}
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {PORTAL_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter("portal", value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={
                currentPortal === value
                  ? { backgroundColor: "#1E1E1E", color: "#F0F0F0", border: "1px solid #E85D04" }
                  : { backgroundColor: "#1E1E1E", color: "#888", border: "1px solid transparent" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category filter */}
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

      {/* Ticket list */}
      <div className="space-y-2 px-4">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCheck size={40} className="text-muted-foreground mb-3" />
            <p className="text-foreground font-medium">All clear!</p>
            <p className="text-muted-foreground text-sm mt-1">No tickets match these filters.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <SwipeableTicketCard
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

function SwipeableTicketCard({
  ticket,
  onTap,
}: {
  ticket: SupportTicket & { unread_count: number };
  onTap: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState<null | "resolve" | "progress">(null);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 10) isDragging.current = true;
    setOffset(Math.max(-120, Math.min(120, dx)));
    if (dx < -THRESHOLD) setAction("resolve");
    else if (dx > THRESHOLD) setAction("progress");
    else setAction(null);
  };

  const handleTouchEnd = async () => {
    if (action === "resolve") {
      await updateTicketStatus(ticket.id, "resolved");
    } else if (action === "progress") {
      await updateTicketStatus(ticket.id, "in_progress");
    }
    setOffset(0);
    setAction(null);
    if (!isDragging.current) onTap();
  };

  const handleClick = () => {
    if (!isDragging.current) onTap();
  };

  const isUrgent = ticket.priority === "urgent";
  const portalColor = PORTAL_COLORS[ticket.portal] ?? "#888";

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe backgrounds */}
      <div
        className="absolute inset-0 flex items-center px-5 rounded-2xl"
        style={{
          backgroundColor: action === "resolve" ? "#22c55e" : "#3b82f6",
          opacity: action ? 1 : 0,
          transition: "opacity 0.1s",
        }}
      >
        {action === "resolve" ? (
          <div className="ml-auto flex items-center gap-1.5 text-white">
            <CheckCheck size={18} />
            <span className="text-sm font-semibold">Resolve</span>
          </div>
        ) : action === "progress" ? (
          <div className="flex items-center gap-1.5 text-white">
            <Clock size={18} />
            <span className="text-sm font-semibold">In Progress</span>
          </div>
        ) : null}
      </div>

      {/* Card */}
      <div
        className="relative bg-card border border-border rounded-2xl p-4 active:opacity-90 cursor-pointer"
        style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? "transform 0.3s" : "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          {/* Portal dot */}
          <div
            className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: portalColor }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-foreground truncate">{ticket.user_name ?? ticket.user_email}</p>
              {isUrgent && (
                <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
              )}
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
    </div>
  );
}

async function updateTicketStatus(ticketId: string, status: string) {
  await fetch(`/api/tickets/${ticketId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
