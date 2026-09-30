import {
  adminClient, corsHeaders, evaluateAchievements, getBalance, insertEvent, json, QUEST_RULES, requireUser,
} from "../_shared/quest.ts";
import { RoutingSetupError, validPt, walkRoute } from "../_shared/trailRoutes.ts";

interface Stop { marker_id: string; name: string; required: boolean; lat: number; lng: number }

/**
 * Trail walking sessions. Check-ins, completion and the trail bonus are all
 * decided here; the browser only asks.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // Walking route from the walker to a stop. The position is used once, never stored.
    if (action === "approach") {
      const from = body?.from, to = body?.to;
      if (!validPt(from) || !validPt(to)) return json({ error: "Valid from/to required" }, 400);
      const r = await walkRoute(from, to);
      if (!r) return json({ error: "No walking route found" }, 404);
      return json(r);
    }

    if (action === "start") {
      const trailId = String(body?.trail_id ?? "");
      const { data: trail } = await admin.from("trails").select("id, status, current_revision_id").eq("id", trailId).maybeSingle();
      if (!trail || trail.status !== "published" || !trail.current_revision_id) return json({ error: "Trail is not available" }, 404);
      const { data: open } = await admin.from("trail_sessions").select("*").eq("user_id", user.id).eq("trail_id", trailId)
        .in("status", ["active", "paused"]).maybeSingle();
      if (open) {
        if (open.status === "paused") await admin.from("trail_sessions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", open.id);
        return json({ session: { ...open, status: "active" } });
      }
      const { data: session, error } = await admin.from("trail_sessions")
        .insert({ user_id: user.id, trail_id: trailId, revision_id: trail.current_revision_id }).select("*").single();
      if (error) throw error;
      return json({ session });
    }

    const sessionId = String(body?.session_id ?? "");
    const { data: session } = await admin.from("trail_sessions").select("*").eq("id", sessionId).eq("user_id", user.id).maybeSingle();
    if (!session) return json({ error: "Session not found" }, 404);

    if (action === "pause" || action === "resume" || action === "exit") {
      if (session.status === "completed") return json({ session });
      const status = action === "pause" ? "paused" : action === "resume" ? "active" : "exited";
      const { data } = await admin.from("trail_sessions").update({ status, updated_at: new Date().toISOString() })
        .eq("id", sessionId).select("*").single();
      return json({ session: data });
    }

    if (action === "checkin") {
      if (session.status === "exited") return json({ error: "This walk was exited" }, 409);
      const markerId = String(body?.marker_id ?? "").slice(0, 120);
      const method = body?.method === "qr" ? "qr" : "manual";
      const { data: rev } = await admin.from("trail_revisions").select("stops, trail_id").eq("id", session.revision_id).single();
      const stops = (rev.stops ?? []) as Stop[];
      if (!stops.some((s) => s.marker_id === markerId)) return json({ error: "That marker is not on this trail" }, 400);

      // QR check-ins count only when the server saw a verified scan of this marker during the walk.
      let verified = false;
      if (method === "qr") {
        const { data: scan } = await admin.from("scan_tokens").select("token").eq("user_id", user.id).eq("marker_id", markerId)
          .gte("consumed_at", session.started_at).limit(1).maybeSingle();
        verified = Boolean(scan);
        if (!verified) return json({ error: "Scan could not be verified" }, 403);
      }

      const { data: existing } = await admin.from("trail_checkins").select("*").eq("session_id", sessionId).eq("marker_id", markerId).maybeSingle();
      let duplicate = false;
      if (existing) {
        duplicate = existing.verified || !verified;
        if (!duplicate) await admin.from("trail_checkins").update({ method: "qr", verified: true }).eq("id", existing.id);
      } else {
        const { error } = await admin.from("trail_checkins").insert({ session_id: sessionId, user_id: user.id, marker_id: markerId, method, verified });
        if (error && error.code !== "23505") throw error;
        duplicate = error?.code === "23505";
      }
      if (method === "manual") {
        await admin.from("marker_visits").upsert({ user_id: user.id, marker_id: markerId }, { onConflict: "user_id,marker_id" });
      }

      const { data: all } = await admin.from("trail_checkins").select("marker_id, verified").eq("session_id", sessionId);
      const done = new Map((all ?? []).map((c) => [c.marker_id, c.verified]));
      const required = stops.filter((s) => s.required !== false);
      const complete = required.every((s) => done.has(s.marker_id));
      let reward = null;
      if (complete && session.status !== "completed") {
        await admin.from("trail_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", sessionId);
      }
      if (complete && required.every((s) => done.get(s.marker_id))) {
        const { data: trail } = await admin.from("trails").select("title").eq("id", rev.trail_id).single();
        const event = await insertEvent(admin, {
          userId: user.id,
          eventType: "marker_trail_complete",
          sourceType: "trail",
          sourceId: rev.trail_id,
          amount: QUEST_RULES.trailComplete,
          title: `Completed ${trail?.title ?? "a trail"}`,
          metadata: { session_id: sessionId, stops: required.length },
        });
        if (event) {
          reward = { amount: QUEST_RULES.trailComplete, title: event.title, achievements: await evaluateAchievements(admin, user.id), balance: await getBalance(admin, user.id) };
        }
      }
      return json({ ok: true, duplicate, verified, complete, reward, checkins: all });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    if (e instanceof RoutingSetupError) return json({ error: e.message, setup: true }, 503);
    console.error("trail-session error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
