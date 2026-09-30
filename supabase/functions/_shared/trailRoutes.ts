import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Pt { lat: number; lng: number }
export interface Leg {
  from: number;
  to: number;
  ok: boolean;
  polyline?: string;
  distance_m?: number;
  duration_s?: number;
  error?: string;
}

export class RoutingSetupError extends Error {}

function key(a: Pt, b: Pt) {
  const r = (n: number) => n.toFixed(5);
  return `walk:${r(a.lat)},${r(a.lng)}>${r(b.lat)},${r(b.lng)}`;
}

/** One walking route via Google Routes API. Returns null when no route exists. */
export async function walkRoute(a: Pt, b: Pt): Promise<{ polyline: string; distance_m: number; duration_s: number } | null> {
  const apiKey = Deno.env.get("GOOGLE_GEOCODING_API_KEY");
  if (!apiKey) throw new RoutingSetupError("Walking directions need a Google API key on the server (GOOGLE_GEOCODING_API_KEY).");
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
      destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
      travelMode: "WALK",
    }),
  });
  const text = await res.text();
  if (res.status === 403 || /PERMISSION_DENIED|API_KEY_SERVICE_BLOCKED|not been used|disabled/i.test(text)) {
    throw new RoutingSetupError("Turn on the Google \"Routes API\" for the server's Google key to calculate walking directions.");
  }
  if (!res.ok) throw new Error(`Routes API ${res.status}: ${text.slice(0, 200)}`);
  const body = JSON.parse(text || "{}");
  const r = body.routes?.[0];
  if (!r?.polyline?.encodedPolyline) return null;
  return {
    polyline: r.polyline.encodedPolyline,
    distance_m: Number(r.distanceMeters ?? 0),
    duration_s: parseInt(String(r.duration ?? "0").replace("s", ""), 10) || 0,
  };
}

/** Walking legs between consecutive points, cached by coordinates. */
export async function computeLegs(admin: SupabaseClient, pts: Pt[], loop: boolean): Promise<Leg[]> {
  const pairs: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) pairs.push([i, i + 1]);
  if (loop && pts.length > 2) pairs.push([pts.length - 1, 0]);

  return Promise.all(pairs.map(async ([i, j]) => {
    const k = key(pts[i], pts[j]);
    const { data: hit } = await admin.from("trail_route_cache").select("*").eq("key", k).maybeSingle();
    if (hit) return { from: i, to: j, ok: true, polyline: hit.polyline, distance_m: hit.distance_m, duration_s: hit.duration_s };
    const r = await walkRoute(pts[i], pts[j]);
    if (!r) return { from: i, to: j, ok: false, error: "No walking route found" };
    await admin.from("trail_route_cache").upsert({ key: k, ...r });
    return { from: i, to: j, ok: true, ...r };
  }));
}

export function validPt(p: unknown): p is Pt {
  const o = p as Pt;
  return !!o && Number.isFinite(o.lat) && Number.isFinite(o.lng) && Math.abs(o.lat) <= 90 && Math.abs(o.lng) <= 180 && !(o.lat === 0 && o.lng === 0);
}
