import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

export async function POST(request: Request) {
  const text = await request.text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in CSV" }, { status: 400 });
  }

  const admin = createAdminClient();
  let inserted = 0;
  let skipped = 0;

  const records = rows
    .filter((r) => r.name)
    .map((r) => ({
      name: r.name,
      email: r.email || null,
      phone: r.phone || null,
      website: r.website || null,
      address: r.address || null,
      city: r.city || null,
      source: "manual" as const,
      status: "prospect" as const,
    }));

  for (const record of records) {
    const { error } = await admin.from("email_prospects").insert(record);
    if (error) { skipped++; } else { inserted++; }
  }

  return NextResponse.json({ inserted, skipped, total: rows.length });
}
