"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Zap,
  Send,
} from "lucide-react";
import type { SupportTicket, SupportMessage, QuickReplyTemplate } from "@/types";

const PORTAL_COLORS: Record<string, string> = {
  customer: "#E85D04",
  restaurant: "#3b82f6",
  creator: "#7E22CE",
};
const STATUS_NEXT: Record<string, string> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "open",
};
const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Clock size={14} />,
  in_progress: <Clock size={14} className="text-blue-400" />,
  resolved: <CheckCircle2 size={14} className="text-green-400" />,
};

type Props = {
  ticket: SupportTicket;
  messages: SupportMessage[];
  templates: QuickReplyTemplate[];
};

export function TicketDetailClient({ ticket: initialTicket, messages: initialMessages, templates }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState(initialMessages);
  const [reply, setReply] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState(`Re: ${initialTicket.subject}`);
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Subscribe to new messages via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as SupportMessage]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id, supabase]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    setReply(""); // clear immediately for UX

    const res = await fetch("/api/tickets/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: ticket.id,
        message: text,
        is_internal_note: isNote,
        sender_type: "admin",
      }),
    });

    if (res.ok) {
      const { message: newMsg } = await res.json();
      // Add immediately (don't rely solely on Realtime subscription)
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === newMsg.id);
        return exists ? prev : [...prev, newMsg];
      });
    }

    setSending(false);

    // Record first admin response time
    if (!ticket.first_response_at && !isNote) {
      const updated = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_response_at: new Date().toISOString() }),
      });
      if (updated.ok) {
        const { ticket: t } = await updated.json();
        setTicket(t);
      }
    }
  };

  const cycleStatus = async () => {
    const next = STATUS_NEXT[ticket.status] ?? "open";
    const body: Record<string, string> = { status: next };
    if (next === "resolved") body.resolved_at = new Date().toISOString();
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { ticket: t } = await res.json();
      setTicket(t);
    }
  };

  const togglePriority = async () => {
    const next = ticket.priority === "urgent" ? "normal" : "urgent";
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: next }),
    });
    if (res.ok) {
      const { ticket: t } = await res.json();
      setTicket(t);
    }
  };

  const sendEmail = async () => {
    if (!emailBody.trim()) return;
    setSendingEmail(true);
    await fetch("/api/tickets/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: ticket.id,
        to_email: ticket.user_email,
        subject: emailSubject,
        body: emailBody,
      }),
    });
    setSendingEmail(false);
    setShowEmail(false);
    setEmailBody("");
  };

  const applyTemplate = (t: QuickReplyTemplate) => {
    const body = t.body.replace(/\{\{name\}\}/g, ticket.user_name ?? "there");
    setReply(body);
    setShowTemplates(false);
  };

  const portalColor = PORTAL_COLORS[ticket.portal] ?? "#888";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground">
              {ticket.user_name} · {ticket.user_email}
            </p>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Status cycle */}
          <button
            onClick={cycleStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0"
            style={
              ticket.status === "resolved"
                ? { backgroundColor: "#052e16", color: "#22c55e" }
                : ticket.status === "in_progress"
                ? { backgroundColor: "#1e3a5f", color: "#60a5fa" }
                : { backgroundColor: "#1E1E1E", color: "#E85D04", border: "1px solid #E85D04" }
            }
          >
            {STATUS_ICONS[ticket.status]}
            {STATUS_LABELS[ticket.status]}
          </button>

          {/* Priority */}
          <button
            onClick={togglePriority}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0"
            style={
              ticket.priority === "urgent"
                ? { backgroundColor: "#3f0000", color: "#f87171" }
                : { backgroundColor: "#1E1E1E", color: "#888" }
            }
          >
            <AlertTriangle size={12} />
            {ticket.priority === "urgent" ? "Urgent" : "Normal"}
          </button>

          {/* Portal badge */}
          <span
            className="px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 capitalize"
            style={{ backgroundColor: `${portalColor}20`, color: portalColor }}
          >
            {ticket.portal}
          </span>

          {/* Email button */}
          <button
            onClick={() => setShowEmail(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 bg-secondary text-foreground ml-auto"
          >
            <Mail size={12} />
            Email
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isAdmin = msg.sender_type === "admin";
          const isNote = msg.is_internal_note;
          return (
            <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[62%] rounded-2xl px-3 py-2 ${
                  isNote
                    ? "border border-dashed border-yellow-600/50 bg-yellow-950/20"
                    : isAdmin
                    ? ""
                    : "bg-secondary"
                }`}
                style={
                  isAdmin && !isNote
                    ? { backgroundColor: "#E85D04", color: "#fff" }
                    : undefined
                }
              >
                {isNote && (
                  <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-semibold mb-1">
                    <Lock size={10} />
                    Internal note
                  </div>
                )}
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                <p
                  className={`text-[10px] mt-0.5 ${
                    isAdmin && !isNote ? "text-white/60" : "text-muted-foreground"
                  }`}
                >
                  {format(new Date(msg.created_at), "h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="bg-card border-t border-border px-4 pt-3 pb-safe flex-shrink-0">
        {/* Note toggle */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setIsNote(false)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              !isNote ? "text-foreground bg-secondary" : "text-muted-foreground"
            }`}
          >
            Reply to user
          </button>
          <button
            onClick={() => setIsNote(true)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transition-colors ${
              isNote ? "text-yellow-400 bg-yellow-950/40" : "text-muted-foreground"
            }`}
          >
            <Lock size={10} />
            Internal note
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium text-muted-foreground bg-secondary flex items-center gap-1"
          >
            <Zap size={11} />
            Templates
          </button>
        </div>

        <div className="flex gap-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={isNote ? "Add internal note…" : "Reply to user…"}
            rows={2}
            className="flex-1 resize-none bg-secondary border-border text-sm rounded-xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendReply();
              }
            }}
          />
          <button
            onClick={sendReply}
            disabled={sending || !reply.trim()}
            className="w-10 h-10 self-end rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "#E85D04" }}
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Quick Reply Templates sheet */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="bg-card border-border max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Reply Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t)}
                className="w-full text-left p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.body}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email composer */}
      <Dialog open={showEmail} onOpenChange={setShowEmail}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Send Email to {ticket.user_name ?? ticket.user_email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input value={ticket.user_email} disabled className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="bg-secondary border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Message</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                placeholder="Write your email…"
                className="bg-secondary border-border mt-1 resize-none"
              />
            </div>
            <Button
              onClick={sendEmail}
              disabled={sendingEmail || !emailBody.trim()}
              className="w-full font-semibold"
              style={{ backgroundColor: "#E85D04" }}
            >
              {sendingEmail ? "Sending…" : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
