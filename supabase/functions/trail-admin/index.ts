import { adminClient, corsHeaders, isAdmin, json, requireUser } from "../_shared/quest.ts";
import { computeLegs, RoutingSetupError, validPt, type Pt } from "../_shared/trailRoutes.ts";

const LONG_LEG_M = 2000;

/** Admin-only: preview walking routes and publish trail revisions. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);
    const admin = adminClient();
    if (!(await isAdmin(admin, user.id))) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "route") {
      const pts = Array.isArray(body?.points) ? body.points.slice(0, 40) : [];
      if (pts.length < 2 || !pts.every(validPt)) return json({ error: "Need at least 2 valid points" }, 400);
      const legs = await computeLegs(admin, pts as Pt[], Boolean(body?.loop));
      return json({ legs, longLegMeters: LONG_LEG_M });
    }

    if (action === "publish") {
      const trailId = String(body?.trail_id ?? "");
      const coords = (body?.coords ?? {}) as Record<string, { lat: number; lng: number; name?: string }>;
      const { data: trail } = await admin.from("trails").select("*").eq("id", trailId).maybeSingle();
      if (!trail) return json({ error: "Trail not found" }, 404);
      const { data: stopRows } = await admin.from("trail_stops").select("*").eq("trail_id", trailId).order("position");
      const stops = (stopRows ?? []).map((s) => ({
        marker_id: s.marker_id,
        name: String(coords[s.marker_id]?.name ?? s.marker_id).slice(0, 200),
        lat: Number(coords[s.marker_id]?.lat),
        lng: Number(coords[s.marker_id]?.lng),
        required: s.required,
        note: s.note,
      }));
      const problems: string[] = [];
      const collectionIds = stops.map((s) => s.marker_id);
      const { data: collectionStops } = collectionIds.length
        ? await admin.from("collection_markers").select("marker_id,coord_withheld,status").in("marker_id", collectionIds)
        : { data: [] };
      for (const story of collectionStops ?? []) {
        if (story.status !== "published") problems.push(`"${story.marker_id}" is not published.`);
        if (story.coord_withheld) problems.push(`"${story.marker_id}" has a withheld location and cannot be a trail stop.`);
      }
      if (new Set(stops.map((s) => s.marker_id)).size < 2) problems.push("A trail needs at least 2 different markers.");
      stops.forEach((s) => { if (!validPt(s)) problems.push(`"${s.name}" has no valid coordinates.`); });
      if (problems.length) return json({ error: "Trail is not ready", problems }, 422);

      const legs = await computeLegs(admin, stops, trail.is_loop);
      const failed = legs.filter((l) => !l.ok);
      if (failed.length) {
        return json({
          error: "Some legs have no walking route",
          problems: failed.map((l) => `No walking route from "${stops[l.from].name}" to "${stops[l.to].name}".`),
          legs,
        }, 422);
      }
      const { data: last } = await admin.from("trail_revisions").select("version").eq("trail_id", trailId)
        .order("version", { ascending: false }).limit(1).maybeSingle();
      const { data: rev, error } = await admin.from("trail_revisions").insert({
        trail_id: trailId,
        version: (last?.version ?? 0) + 1,
        stops,
        legs,
        distance_m: legs.reduce((s, l) => s + (l.distance_m ?? 0), 0),
        duration_s: legs.reduce((s, l) => s + (l.duration_s ?? 0), 0),
      }).select("id, version").single();
      if (error) throw error;
      await admin.from("trails").update({ status: "published", current_revision_id: rev.id }).eq("id", trailId);
      return json({ ok: true, revision: rev });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    if (e instanceof RoutingSetupError) return json({ error: e.message, setup: true }, 503);
    console.error("trail-admin error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
