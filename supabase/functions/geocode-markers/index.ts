// One-shot geocoder: takes a list of { id, query } and returns { id, lat, lng, formatted, status } for each.
// Uses GOOGLE_GEOCODING_API_KEY (server-side, no referrer restriction).
import { corsHeaders } from "@supabase/supabase-js/cors";

const TACOMA_BOUNDS = "47.18,-122.60|47.35,-122.32";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("GOOGLE_GEOCODING_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GOOGLE_GEOCODING_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { items?: { id: string; query: string }[] };
  try { body = await req.json(); } catch { body = {}; }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return new Response(JSON.stringify({ error: "items array required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];
  for (const it of items) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(it.query)}&bounds=${encodeURIComponent(TACOMA_BOUNDS)}&region=us&key=${apiKey}`;
    try {
      const r = await fetch(url);
      const d = await r.json();
      if (d.status === "OK" && d.results?.[0]) {
        const loc = d.results[0].geometry.location;
        results.push({ id: it.id, lat: loc.lat, lng: loc.lng, formatted: d.results[0].formatted_address, status: "OK" });
      } else {
        results.push({ id: it.id, status: d.status, error_message: d.error_message });
      }
    } catch (e) {
      results.push({ id: it.id, status: "FETCH_ERROR", error_message: String(e) });
    }
    await new Promise((r) => setTimeout(r, 60));
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
