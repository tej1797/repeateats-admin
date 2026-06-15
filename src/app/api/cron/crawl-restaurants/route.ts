import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ONTARIO_CITIES = [
  "Toronto", "Mississauga", "Brampton", "Markham", "Vaughan",
  "Richmond Hill", "Oakville", "Burlington", "Hamilton", "Ottawa",
  "Scarborough", "North York", "Etobicoke", "Pickering", "Ajax",
];

async function scrapeEmailFromWebsite(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RepeatEatsBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (mailtoMatch) return mailtoMatch[1].toLowerCase();
    const textMatch = html.replace(/<[^>]+>/g, " ").match(
      /\b([a-zA-Z0-9._%+\-]+@(?!.*\.(png|jpg|gif|svg|webp|css|js))[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})\b/
    );
    if (textMatch) {
      const email = textMatch[1].toLowerCase();
      if (!["example.com", "sentry.io", "w3.org", "schema.org"].some(d => email.includes(d))) {
        return email;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Uses Places API (New) — legacy Text Search is disabled on this project
async function searchPlaces(city: string): Promise<{ results: any[]; error?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { results: [], error: "GOOGLE_PLACES_API_KEY not set" };

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.websiteUri",
          "places.nationalPhoneNumber",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery: `restaurants in ${city} Ontario Canada`,
        maxResultCount: 20,
        includedType: "restaurant",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { results: [], error: `Places API: ${data.error?.message ?? res.statusText}` };
    }
    return { results: data.places ?? [] };
  } catch (err: any) {
    return { results: [], error: err.message };
  }
}

export async function POST() {
  const admin = createAdminClient();
  let totalAdded = 0;
  const errors: string[] = [];

  const dayIndex = new Date().getDate() % ONTARIO_CITIES.length;
  const citiesToProcess = [
    ONTARIO_CITIES[dayIndex % ONTARIO_CITIES.length],
    ONTARIO_CITIES[(dayIndex + 1) % ONTARIO_CITIES.length],
    ONTARIO_CITIES[(dayIndex + 2) % ONTARIO_CITIES.length],
  ];

  for (const city of citiesToProcess) {
    const { results, error } = await searchPlaces(city);
    if (error) { errors.push(`${city}: ${error}`); continue; }

    for (const place of results) {
      try {
        const placeId = place.id;
        if (!placeId) continue;

        const { data: existing } = await admin
          .from("email_prospects")
          .select("id")
          .eq("google_place_id", placeId)
          .single();
        if (existing) continue;

        const website: string | undefined = place.websiteUri;
        let email: string | null = null;
        if (website) email = await scrapeEmailFromWebsite(website);

        await admin.from("email_prospects").insert({
          name: place.displayName?.text ?? "Unknown",
          email,
          phone: place.nationalPhoneNumber ?? null,
          website: website ?? null,
          address: place.formattedAddress ?? null,
          city,
          google_place_id: placeId,
          source: "google_places",
          status: "prospect",
        });

        totalAdded++;
      } catch (err: any) {
        errors.push(`${place.displayName?.text}: ${err.message}`);
      }
    }
  }

  return NextResponse.json({ added: totalAdded, cities: citiesToProcess, errors });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return POST();
}
