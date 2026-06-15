import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function toCSV(rows: Record<string, any>[], columns: string[]): string {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((col) => {
      const val = row[col] ?? "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const admin = createAdminClient();

  let csv = "";
  let filename = "export.csv";

  if (type === "customers") {
    const { data } = await admin
      .from("users")
      .select("id, name, email, city, created_at")
      .order("name", { ascending: true })
      .limit(5000);
    csv = toCSV(data ?? [], ["id", "name", "email", "city", "created_at"]);
    filename = "customers.csv";

  } else if (type === "restaurants") {
    const { data } = await admin
      .from("restaurants")
      .select("id, name, city, cuisine, address, phone, website, is_live, created_at")
      .order("name", { ascending: true })
      .limit(5000);
    csv = toCSV(data ?? [], ["id", "name", "city", "cuisine", "address", "phone", "website", "is_live", "created_at"]);
    filename = "restaurants.csv";

  } else if (type === "creators") {
    const { data } = await admin
      .from("influencers")
      .select("id, users(name, email), instagram_handle, tiktok_handle, niche, follower_count, total_collabs, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    const flat = (data ?? []).map((r: any) => ({
      id: r.id,
      name: (r.users as any)?.name ?? "",
      email: (r.users as any)?.email ?? "",
      instagram_handle: r.instagram_handle ?? "",
      tiktok_handle: r.tiktok_handle ?? "",
      niche: r.niche ?? "",
      follower_count: r.follower_count ?? "",
      total_collabs: r.total_collabs ?? 0,
      created_at: r.created_at,
    }));
    csv = toCSV(flat, ["id", "name", "email", "instagram_handle", "tiktok_handle", "niche", "follower_count", "total_collabs", "created_at"]);
    filename = "creators.csv";

  } else if (type === "prospects") {
    const { data } = await admin
      .from("email_prospects")
      .select("id, name, email, phone, website, address, city, status, source, created_at")
      .order("name", { ascending: true })
      .limit(10000);
    csv = toCSV(data ?? [], ["id", "name", "email", "phone", "website", "address", "city", "status", "source", "created_at"]);
    filename = "prospects.csv";

  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
