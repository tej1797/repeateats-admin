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
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    clearTimeout(timeout);
    const html = await res.text();
    // Extract mailto: links
    const match = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function fetchPlacesPage(city: string, pageToken?: string): Promise<{
  results: any[];
  nextPageToken?: string;
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { results: [] };

  const baseUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json";
  const params = new URLSearchParams({
    query: `restaurant ${city} Ontario Canada`,
    type: "restaurant",
    key: apiKey,
    ...(pageToken ? { pagetoken: pageToken } : {}),
  });

  const res = await fetch(`${baseUrl}?${params}`);
  const data = await res.json();
  return { results: data.results ?? [], nextPageToken: data.next_page_token };
}

async function getPlaceDetails(placeId: string): Promise<{ website?: string; phone?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return {};
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,formatted_phone_number&key=${apiKey}`
  );
  const data = await res.json();
  return {
    website: data.result?.website,
    phone: data.result?.formatted_phone_number,
  };
}

export async function POST() {
  const admin = createAdminClient();
  let totalAdded = 0;

  // Only process 3 cities per run to avoid timeout (Vercel Cron has 10s limit on hobby)
  const citiesToProcess = ONTARIO_CITIES.slice(
    (new Date().getDate() % ONTARIO_CITIES.length) % ONTARIO_CITIES.length,
    ((new Date().getDate() % ONTARIO_CITIES.length) % ONTARIO_CITIES.length) + 3
  );

  for (const city of citiesToProcess) {
    try {
      const { results } = await fetchPlacesPage(city);

      for (const place of results.slice(0, 10)) {
        // Check if already exists
        const { data: existing } = await admin
          .from("email_prospects")
          .select("id")
          .eq("google_place_id", place.place_id)
          .single();

        if (existing) continue;

        // Get website + phone
        const details = await getPlaceDetails(place.place_id);

        // Try to scrape email from website
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
      }
    } catch (err) {
      console.error(`Error crawling ${city}:`, err);
    }
  }

  return NextResponse.json({ added: totalAdded, cities: citiesToProcess });
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
