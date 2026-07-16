// Fixed brand header. Height (h-12) matches the pt-12 top padding every page
// already uses, so content starts right below it. z-30 keeps it under the
// ticket-detail full-screen overlay (z-40) and the bottom nav (z-50).
export function TopBar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 h-12 flex items-center justify-between px-4 border-b border-border"
      style={{
        backgroundColor: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg font-extrabold tracking-tight">
          <span className="text-white">Rep</span>
          <span style={{ color: "#E85D04" }}>EAT</span>
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded"
          style={{ backgroundColor: "rgba(232,93,4,0.15)", color: "#E85D04" }}
        >
          Admin
        </span>
      </div>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22c55e" }} title="Live" />
    </header>
  );
}
