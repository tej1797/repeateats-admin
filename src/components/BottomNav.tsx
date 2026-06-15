"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, BarChart3, Users, Grid3X3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIMARY_TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue", label: "Queue", icon: Inbox },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/users", label: "Users", icon: Users },
];

const MORE_ITEMS = [
  { href: "/broadcast", label: "Broadcast", emoji: "📣" },
  { href: "/launch", label: "Launch Outreach", emoji: "🚀" },
  { href: "/templates", label: "Quick Reply Templates", emoji: "⚡" },
  { href: "/settings", label: "Settings", emoji: "⚙️" },
];

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);
  const isMoreActive = MORE_ITEMS.some((i) => pathname.startsWith(i.href));

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const isQueue = href === "/queue";
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? "#E85D04" : "#888" }}
                />
                {/* Unread badge on Queue tab */}
                {isQueue && unreadCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                    style={{ backgroundColor: "#E85D04", fontSize: "9px" }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "#E85D04" : "#888" }}
              >
                {label}
              </span>
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: "#E85D04" }}
                />
              )}
            </Link>
          );
        })}

        {/* More tab */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger className="flex-1 flex flex-col items-center justify-center gap-0.5 relative p-0 bg-transparent border-0 outline-none">
            <span className="flex flex-col items-center justify-center gap-0.5 w-full">
              <Grid3X3
                size={22}
                strokeWidth={isMoreActive ? 2.5 : 1.8}
                style={{ color: isMoreActive ? "#E85D04" : "#888" }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: isMoreActive ? "#E85D04" : "#888" }}
              >
                More
              </span>
              {isMoreActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: "#E85D04" }}
                />
              )}
            </span>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-2xl">
            <div className="pt-2 pb-6">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">
                More
              </h3>
              <div className="space-y-1">
                {MORE_ITEMS.map(({ href, label, emoji }) => (
                  <button
                    key={href}
                    onClick={() => {
                      setMoreOpen(false);
                      router.push(href);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <span className="text-xl w-8 text-center">{emoji}</span>
                    <span
                      className="text-base font-medium"
                      style={{ color: pathname.startsWith(href) ? "#E85D04" : "#F0F0F0" }}
                    >
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
