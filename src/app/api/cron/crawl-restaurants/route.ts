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
    // Try mailto: links first
    const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (mailtoMatch) return mailtoMatch[1].toLowerCase();
    // Fallback: look for email pattern in text (avoid common false positives)
    const textMatch = html.replace(/<[^>]+>/g, " ").match(
      /\b([a-zA-Z0-9._%+\-]+@(?!.*\.(png|jpg|gif|svg|webp|css|js))[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6})\b/
    );
    if (textMatch) {
      const email = textMatch[1].toLowerCase();
      // Filter out common false positives
      if (!email.includes("example.com") && !email.includes("sentry.io") &&
          !email.includes("w3.org") && !email.includes("schema.org")) {
        return email;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchPlacesPage(city: string): Promise<{ results: any[]; error?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { results: [], error: "GOOGLE_PLACES_API_KEY not set" };

  try {
    const params = new URLSearchParams({
      query: `restaurant in ${city} Ontario Canada`,
      type: "restaurant",
      key: apiKey,
    });
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
    );
    const data = await res.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return { results: [], error: `Places API: ${data.status} — ${data.error_message ?? ""}` };
    }
    return { results: data.results ?? [] };
  } catch (err: any) {
    return { results: [], error: err.message };
  }
}

async function getPlaceDetails(placeId: string): Promise<{ website?: string; phone?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return {};
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,formatted_phone_number&key=${apiKey}`
    );
    const data = await res.json();
    return {
      website: data.result?.website,
      phone: data.result?.formatted_phone_number,
    };
  } catch {
    return {};
  }
}

export async function POST() {
  const admin = createAdminClient();
  let totalAdded = 0;
  const errors: string[] = [];

  // Rotate through 3 cities per run based on day of month
  const dayIndex = new Date().getDate() % ONTARIO_CITIES.length;
  const citiesToProcess = [
    ONTARIO_CITIES[dayIndex % ONTARIO_CITIES.length],
    ONTARIO_CITIES[(dayIndex + 1) % ONTARIO_CITIES.length],
    ONTARIO_CITIES[(dayIndex + 2) % ONTARIO_CITIES.length],
  ];

  for (const city of citiesToProcess) {
    const { results, error } = await fetchPlacesPage(city);
    if (error) {
      errors.push(`${city}: ${error}`);
      continue;
    }

    for (const place of results.slice(0, 10)) {
      try {
        // Skip if already exists
        const { data: existing } = await admin
          .from("email_prospects")
          .select("id")
          .eq("google_place_id", place.place_id)
          .single();
        if (existing) continue;

        const details = await getPlaceDetails(place.place_id);

        let email: string | null = null;
        if (details.website) {
          email = await scrapeEmailFromWebsite(details.website);
        }

        await admin.from("email_prospects").insert({
          name: place.name,
          email,
          phone: details.phone ?? null,
          website: details.website ?? null,
          address: place.formatted_address ?? null,
          city,
          google_place_id: place.place_id,
          source: "google_places",
          status: "prospect",
        });

        totalAdded++;
      } catch (err: any) {
        errors.push(`${place.name}: ${err.message}`);
      }
    }
  }

  return NextResponse.json({ added: totalAdded, cities: citiesToProcess, errors });
}

// Vercel Cron handler (GET)
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
