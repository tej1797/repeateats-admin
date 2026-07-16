"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Inbox, ShieldCheck, BarChart3, Users, Grid3X3,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";

const BRAND = "#E85D04";

const PRIMARY_TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null as "queue" | "verify" | null },
  { href: "/queue", label: "Queue", icon: Inbox, badge: "queue" as const },
  { href: "/verify", label: "Verify", icon: ShieldCheck, badge: "verify" as const },
  { href: "/analytics", label: "Analytics", icon: BarChart3, badge: null },
  { href: "/users", label: "Users", icon: Users, badge: null },
];

const MORE_ITEMS = [
  { href: "/broadcast", label: "Broadcast", desc: "Push & promo emails", emoji: "📣" },
  { href: "/launch", label: "Launch Outreach", desc: "Find & email restaurant prospects", emoji: "🚀" },
  { href: "/templates", label: "Quick Reply Templates", desc: "Canned support responses", emoji: "⚡" },
  { href: "/settings", label: "Settings", desc: "Account & app preferences", emoji: "⚙️" },
];

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-1 -right-2.5 min-w-4 h-4 px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
      style={{ backgroundColor: BRAND }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function BottomNav({
  queueCount = 0,
  verifyCount = 0,
}: {
  queueCount?: number;
  verifyCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [counts, setCounts] = useState({ queue: queueCount, verify: verifyCount });

  // Layouts don't re-render on soft navigation, so the server-passed counts go
  // stale — refresh on every route change and every 60s.
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      fetch("/api/nav-counts")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j && !cancelled) setCounts(j); })
        .catch(() => {});
    refresh();
    const t = setInterval(refresh, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [pathname]);

  const isActive = (href: string) => pathname.startsWith(href);
  const isMoreActive = MORE_ITEMS.some((i) => pathname.startsWith(i.href));
  const badgeCount = (badge: "queue" | "verify" | null) =>
    badge === "queue" ? counts.queue : badge === "verify" ? counts.verify : 0;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border"
      style={{
        backgroundColor: "rgba(12,12,12,0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch h-16 max-w-3xl mx-auto">
        {PRIMARY_TABS.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1"
            >
              <span
                className="relative flex items-center justify-center rounded-full px-3.5 py-1 transition-colors"
                style={active ? { backgroundColor: "rgba(232,93,4,0.16)" } : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.8}
                  style={{ color: active ? BRAND : "#8a8a8a" }}
                />
                <Badge count={badgeCount(badge)} />
              </span>
              <span
                className="text-[10px] leading-none"
                style={{
                  color: active ? BRAND : "#8a8a8a",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}

        {/* More */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger className="flex-1 flex flex-col items-center justify-center gap-1 p-0 bg-transparent border-0 outline-none">
            <span
              className="relative flex items-center justify-center rounded-full px-3.5 py-1 transition-colors"
              style={isMoreActive ? { backgroundColor: "rgba(232,93,4,0.16)" } : undefined}
            >
              <Grid3X3
                size={20}
                strokeWidth={isMoreActive ? 2.4 : 1.8}
                style={{ color: isMoreActive ? BRAND : "#8a8a8a" }}
              />
            </span>
            <span
              className="text-[10px] leading-none"
              style={{
                color: isMoreActive ? BRAND : "#8a8a8a",
                fontWeight: isMoreActive ? 700 : 500,
              }}
            >
              More
            </span>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-2xl">
            <div className="pt-2 pb-6 max-w-3xl mx-auto w-full">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">
                More tools
              </h3>
              <div className="space-y-1">
                {MORE_ITEMS.map(({ href, label, desc, emoji }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <button
                      key={href}
                      onClick={() => {
                        setMoreOpen(false);
                        router.push(href);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors text-left"
                      style={active ? { backgroundColor: "rgba(232,93,4,0.10)" } : undefined}
                    >
                      <span
                        className="text-lg w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#1E1E1E" }}
                      >
                        {emoji}
                      </span>
                      <span className="min-w-0">
                        <span
                          className="block text-sm font-semibold truncate"
                          style={{ color: active ? BRAND : "#F0F0F0" }}
                        >
                          {label}
                        </span>
                        <span className="block text-xs text-muted-foreground truncate">{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
