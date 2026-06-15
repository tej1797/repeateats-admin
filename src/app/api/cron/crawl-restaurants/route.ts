import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Allow the full Vercel timeout — scraping many websites takes time.
export const maxDuration = 300;

const ONTARIO_CITIES = [
  "Toronto", "Mississauga", "Brampton", "Markham", "Vaughan",
  "Richmond Hill", "Oakville", "Burlington", "Hamilton", "Ottawa",
  "Scarborough", "North York", "Etobicoke", "Pickering", "Ajax",
];

type Lead = {
  name: string;
  website: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string;
  google_place_id: string | null;
  source: string;
};

/* ------------------------------------------------------------------ */
/*  Email scraping — homepage + common contact pages                   */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g;
const BAD_EMAIL_DOMAINS = [
  "example.com", "sentry.io", "w3.org", "schema.org", "wordpress.com",
  "wixpress.com", "godaddy.com", "squarespace.com", "googleapis.com",
];
const BAD_EMAIL_EXT = /\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2)$/i;

function extractEmail(html: string): string | null {
  // Prefer explicit mailto: links — these are almost always real contact emails.
  const mailto = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
  if (mailto) {
    const e = mailto[1].toLowerCase();
    if (!BAD_EMAIL_DOMAINS.some((d) => e.includes(d)) && !BAD_EMAIL_EXT.test(e)) return e;
  }
  // Fall back to any email found in the visible text.
  const text = html.replace(/<[^>]+>/g, " ");
  const matches = text.match(EMAIL_RE);
  if (matches) {
    for (const raw of matches) {
      const e = raw.toLowerCase();
      if (BAD_EMAIL_EXT.test(e)) continue;
      if (BAD_EMAIL_DOMAINS.some((d) => e.includes(d))) continue;
      return e;
    }
  }
  return null;
}

async function fetchHtml(url: string, ms = 6000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RepeatEatsBot/1.0; +https://repeateats.ca)" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function scrapeEmail(website: string): Promise<string | null> {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return null;
  }

  // 1) Homepage
  const home = await fetchHtml(base.href);
  if (home) {
    const found = extractEmail(home);
    if (found) return found;
  }

  // 2) Common contact pages
  const contactPaths = ["/contact", "/contact-us", "/contactus", "/about", "/about-us"];
  for (const path of contactPaths) {
    const html = await fetchHtml(new URL(path, base.origin).href, 5000);
    if (html) {
      const found = extractEmail(html);
      if (found) return found;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Source A — Google Places API (New). Needs billing + API enabled.   */
/* ------------------------------------------------------------------ */

async function searchGooglePlaces(city: string): Promise<{ leads: Lead[]; error?: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { leads: [], error: "no_key" };

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
      return { leads: [], error: `Google Places: ${data.error?.message ?? res.statusText}` };
    }
    const leads: Lead[] = (data.places ?? []).map((p: any) => ({
      name: p.displayName?.text ?? "Unknown",
      website: p.websiteUri ?? null,
      address: p.formattedAddress ?? null,
      phone: p.nationalPhoneNumber ?? null,
      email: null,
      city,
      google_place_id: p.id ?? null,
      source: "google_places",
    }));
    return { leads };
  } catch (err: any) {
    return { leads: [], error: `Google Places: ${err.message}` };
  }
}

/* ------------------------------------------------------------------ */
/*  Source B — OpenStreetMap Overpass API. Free, no key, no billing.   */
/* ------------------------------------------------------------------ */

// Approximate bounding box for the province of Ontario, used to discard
// same-named cities elsewhere in the world (e.g. Brampton, UK).
const ONTARIO_BBOX = { minLat: 41.6, maxLat: 57.0, minLon: -95.2, maxLon: -74.3 };

function elementCoord(el: any): { lat: number; lon: number } | null {
  if (typeof el.lat === "number") return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

function inOntario(el: any): boolean {
  const c = elementCoord(el);
  if (!c) return false;
  return (
    c.lat >= ONTARIO_BBOX.minLat && c.lat <= ONTARIO_BBOX.maxLat &&
    c.lon >= ONTARIO_BBOX.minLon && c.lon <= ONTARIO_BBOX.maxLon
  );
}

// Public Overpass mirrors — tried in order so a rate-limited instance fails over.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function overpassFetch(query: string): Promise<any | null> {
  // Try each mirror, with one retry per mirror — Overpass returns transient
  // 406/429s under load that usually clear within a couple seconds.
  for (const endpoint of OVERPASS_MIRRORS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            // Accept header is REQUIRED — Overpass returns 406 without it.
            Accept: "application/json",
            "User-Agent": "RepeatEatsBot/1.0 (+https://repeateats.ca)",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch {
            /* HTML error page — fall through to retry/next mirror */
          }
        }
      } catch {
        /* timeout/network — fall through to retry/next mirror */
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

async function searchOverpass(city: string): Promise<{ leads: Lead[]; error?: string }> {
  // Match the city's administrative boundary, then filter to Ontario in code
  // (area-within-area filtering is unreliable on Overpass).
  const query = `
    [out:json][timeout:50];
    area["name"="${city}"]["boundary"="administrative"]->.a;
    (
      nwr["amenity"~"^(restaurant|fast_food|cafe)$"](area.a);
    );
    out tags center 200;
  `;

  const data = await overpassFetch(query);
  if (!data) {
    return { leads: [], error: "OSM unavailable (all mirrors rate-limited) — try again in a minute" };
  }

  try {
    const leads: Lead[] = [];
    for (const el of data.elements ?? []) {
      if (!inOntario(el)) continue; // drop same-named cities outside Ontario
      const t = el.tags ?? {};
      const name = t.name;
      if (!name) continue; // unnamed POIs aren't useful for outreach

      const website = t["contact:website"] || t.website || t["contact:url"] || null;
      const email = (t["contact:email"] || t.email || null)?.toLowerCase() ?? null;
      const phone = t["contact:phone"] || t.phone || null;

      const addrParts = [
        [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
        t["addr:city"] || city,
        t["addr:province"] || "ON",
        t["addr:postcode"],
      ].filter(Boolean);
      const address = addrParts.length ? `${addrParts.join(", ")}, Canada` : null;

      leads.push({
        name,
        website: website ? normalizeUrl(website) : null,
        address,
        phone,
        email,
        city,
        google_place_id: null,
        source: "openstreetmap",
      });
    }
    return { leads };
  } catch (err: any) {
    return { leads: [], error: `OSM: ${err.message}` };
  }
}

function normalizeUrl(url: string): string | null {
  let u = url.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    return new URL(u).href;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Concurrency helper                                                  */
/* ------------------------------------------------------------------ */

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const settled = await Promise.all(chunk.map(fn));
    results.push(...settled);
  }
  return results;
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                        */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const admin = createAdminClient();
  const errors: string[] = [];
  let totalAdded = 0;
  let emailsFound = 0;

  // Allow a manual run to target specific cities; otherwise rotate daily.
  let requestedCities: string[] | null = null;
  try {
    const body = await request.json();
    if (Array.isArray(body?.cities) && body.cities.length) requestedCities = body.cities;
    else if (typeof body?.city === "string") requestedCities = [body.city];
  } catch {
    /* no body — fine */
  }

  const dayIndex = new Date().getDate() % ONTARIO_CITIES.length;
  const citiesToProcess = requestedCities ?? [
    ONTARIO_CITIES[dayIndex % ONTARIO_CITIES.length],
    ONTARIO_CITIES[(dayIndex + 1) % ONTARIO_CITIES.length],
    ONTARIO_CITIES[(dayIndex + 2) % ONTARIO_CITIES.length],
  ];

  const sourcesUsed = new Set<string>();

  // ---- Phase 1: discover + insert prospects FAST (so data is saved even
  //      if email scraping later times out) ----
  for (const city of citiesToProcess) {
    // Try Google Places first (richer data) — fall back to free OSM on any failure.
    let leads: Lead[] = [];
    const google = await searchGooglePlaces(city);
    if (google.leads.length > 0) {
      leads = google.leads;
      sourcesUsed.add("google_places");
    } else {
      if (google.error && google.error !== "no_key") errors.push(`${city}: ${google.error} → using OpenStreetMap`);
      const osm = await searchOverpass(city);
      if (osm.error) {
        errors.push(`${city}: ${osm.error}`);
        continue;
      }
      leads = osm.leads;
      sourcesUsed.add("openstreetmap");
    }

    if (leads.length === 0) continue;

    // Fast in-memory dedupe: pull existing keys for this city in one query.
    const { data: existing } = await admin
      .from("email_prospects")
      .select("name, website, google_place_id")
      .eq("city", city);
    const existingNames = new Set((existing ?? []).map((e) => (e.name ?? "").toLowerCase()));
    const existingSites = new Set((existing ?? []).map((e) => e.website).filter(Boolean));
    const existingPlaceIds = new Set((existing ?? []).map((e) => e.google_place_id).filter(Boolean));

    const seen = new Set<string>();
    const newLeads = leads.filter((l) => {
      if (l.google_place_id && existingPlaceIds.has(l.google_place_id)) return false;
      if (l.website && existingSites.has(l.website)) return false;
      if (existingNames.has(l.name.toLowerCase())) return false;
      // also dedupe within this batch
      const key = l.website || `${l.name.toLowerCase()}|${city}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (newLeads.length > 0) {
      const rows = newLeads.map((l) => ({
        name: l.name,
        email: l.email,
        phone: l.phone,
        website: l.website,
        address: l.address,
        city: l.city,
        google_place_id: l.google_place_id,
        source: l.source,
        status: "prospect",
      }));
      const { error } = await admin.from("email_prospects").insert(rows);
      if (error) errors.push(`${city}: insert failed — ${error.message}`);
      else {
        totalAdded += rows.length;
        emailsFound += newLeads.filter((l) => l.email).length; // emails already in source tags
      }
    }
  }

  // ---- Phase 2: enrich emails for prospects that have a website but no email.
  //      Bounded so the request stays well within the timeout. Runs across the
  //      whole table, so repeated crawls keep filling in more emails. ----
  const SCRAPE_BUDGET = 60;
  const { data: toEnrich } = await admin
    .from("email_prospects")
    .select("id, website")
    .is("email", null)
    .not("website", "is", null)
    .order("created_at", { ascending: false })
    .limit(SCRAPE_BUDGET);

  if (toEnrich && toEnrich.length > 0) {
    await mapLimit(toEnrich, 8, async (row: any) => {
      const email = await scrapeEmail(row.website);
      if (email) {
        const { error } = await admin
          .from("email_prospects")
          .update({ email })
          .eq("id", row.id);
        if (!error) emailsFound++;
      }
    });
  }

  return NextResponse.json({
    added: totalAdded,
    emails_found: emailsFound,
    enriched_scanned: toEnrich?.length ?? 0,
    cities: citiesToProcess,
    sources: [...sourcesUsed],
    errors,
  });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  // Build a Request with no body so POST uses the daily rotation.
  return POST(new Request(request.url, { method: "POST" }));
}
