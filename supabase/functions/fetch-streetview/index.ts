// One-time helper: fetch best Street View panoId + heading aimed at each marker.
// Call: GET /fetch-streetview  -> JSON keyed by marker id, paste into markers.ts
// Requires GOOGLE_MAPS_API_KEY (server-side, with Street View Static API enabled).
import { corsHeaders } from "@supabase/supabase-js/cors";

interface MarkerInput {
  id: string;
  lat: number;
  lng: number;
}

function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!KEY) {
    return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let markers: MarkerInput[];
  try {
    const body = req.method === "POST" ? await req.json() : null;
    markers = body?.markers ?? [];
  } catch {
    markers = [];
  }

  if (!markers.length) {
    return new Response(
      JSON.stringify({ error: "POST { markers: [{id,lat,lng}, ...] }" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results: Record<string, unknown> = {};

  for (const m of markers) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/streetview/metadata");
      url.searchParams.set("location", `${m.lat},${m.lng}`);
      url.searchParams.set("radius", "100");
      url.searchParams.set("source", "outdoor");
      url.searchParams.set("key", KEY);

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" || !data.pano_id || !data.location) {
        results[m.id] = { status: data.status ?? "ERROR" };
        continue;
      }

      const heading = bearing(
        { lat: data.location.lat, lng: data.location.lng },
        { lat: m.lat, lng: m.lng }
      );

      results[m.id] = {
        panoId: data.pano_id,
        heading: Math.round(heading),
        pitch: 0,
        copyright: data.copyright ?? undefined,
        date: data.date ?? undefined,
      };
    } catch (e) {
      results[m.id] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
