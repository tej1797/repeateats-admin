"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import type { QuickReplyTemplate, TicketCategory } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All categories",
  claim_issue: "Claim Issue",
  redemption_issue: "Redemption Issue",
  technical: "Technical",
  payment: "Payment",
  collab: "Collab",
  account: "Account",
  general: "General",
};

type Props = { templates: QuickReplyTemplate[] };

export function TemplatesClient({ templates: initial }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initial);
  const [editTarget, setEditTarget] = useState<QuickReplyTemplate | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "general" });
  const [saving, setSaving] = useState(false);

  const openEdit = (t: QuickReplyTemplate) => {
    setEditTarget(t);
    setForm({ title: t.title, body: t.body, category: t.category });
  };

  const handleSave = async () => {
    setSaving(true);
    if (editTarget) {
      const res = await fetch(`/api/templates/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const { template } = await res.json();
        setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
        setEditTarget(null);
      }
    } else {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const { template } = await res.json();
        setTemplates((prev) => [...prev, template]);
        setShowNew(false);
        setForm({ title: "", body: "", category: "general" });
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="pt-12 px-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Quick Reply Templates</h1>
          <p className="text-xs text-muted-foreground">{templates.length} templates</p>
        </div>
        <button
          onClick={() => { setShowNew(true); setForm({ title: "", body: "", category: "general" }); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "#E85D04" }}
        >
          <Plus size={18} className="text-white" />
        </button>
      </div>

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">{t.title}</p>
                  <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {CATEGORY_LABELS[t.category] ?? t.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(t)}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
                >
                  <Pencil size={13} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="w-8 h-8 rounded-lg bg-red-950/40 flex items-center justify-center"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New / Edit dialog */}
      <Dialog open={showNew || editTarget !== null} onOpenChange={(o) => { if (!o) { setShowNew(false); setEditTarget(null); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Looking into it"
                className="bg-secondary border-border mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v ?? "general" }))}>
                <SelectTrigger className="bg-secondary border-border mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Body <span className="text-muted-foreground/60 font-normal">— use {"{{name}}"} for user&apos;s name</span>
              </Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={5}
                placeholder="Hi {{name}}, …"
                className="bg-secondary border-border mt-1 resize-none"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.body}
              className="w-full font-semibold"
              style={{ backgroundColor: "#E85D04" }}
            >
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
