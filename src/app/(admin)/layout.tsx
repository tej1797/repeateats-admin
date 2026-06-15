import { BottomNav } from "@/components/BottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Page content scrolls above the fixed bottom nav */}
      <main className="flex-1 pb-nav overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
