import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ArrowLeft, Instagram, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [influencerRes, collabsRes] = await Promise.all([
    admin.from("influencers").select("*, users(name, email, created_at)").eq("id", id).single(),
    admin
      .from("collabs")
      .select("*, restaurants(name, city)")
      .eq("influencer_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!influencerRes.data) notFound();
  const inf = influencerRes.data as any;
  const collabs = (collabsRes.data ?? []) as any[];

  const statusColor = (status: string) => {
    switch (status) {
      case "accepted": return "#22c55e";
      case "negotiating": return "#f59e0b";
      case "completed": return "#3b82f6";
      case "cancelled": return "#ef4444";
      default: return "#888";
    }
  };

  return (
    <div className="pt-12 px-4 pb-nav space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/users?tab=creators"
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{inf.users?.name ?? "Unknown"}</h1>
          <p className="text-xs text-muted-foreground">Creator</p>
        </div>
      </div>

      {/* Profile */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {inf.users?.email && (
          <p className="text-sm text-foreground">{inf.users.email}</p>
        )}
        {(inf.instagram_handle || inf.tiktok_handle) && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Instagram size={14} className="text-muted-foreground" />
            <span>
              {[inf.instagram_handle && `@${inf.instagram_handle}`, inf.tiktok_handle && `@${inf.tiktok_handle}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}
        {inf.niche && (
          <p className="text-sm text-muted-foreground">Niche: {inf.niche}</p>
        )}
        {inf.users?.created_at && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Calendar size={14} className="text-muted-foreground" />
            <span>Joined {format(new Date(inf.users.created_at), "MMM d, yyyy")}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">
            {inf.follower_count ? (inf.follower_count >= 1000 ? `${(inf.follower_count / 1000).toFixed(1)}K` : inf.follower_count) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Followers</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-foreground">{collabs.length}</p>
          <p className="text-[10px] text-muted-foreground">Collabs</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-green-400">
            {collabs.filter((c) => c.status === "completed").length}
          </p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Collabs */}
      {collabs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Collaborations
          </p>
          {collabs.map((c: any) => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {c.restaurants?.name ?? "Unknown restaurant"}
                  </p>
                  {c.restaurants?.city && (
                    <p className="text-xs text-muted-foreground">{c.restaurants.city}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(c.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium capitalize"
                  style={{ backgroundColor: `${statusColor(c.status)}20`, color: statusColor(c.status) }}
                >
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
