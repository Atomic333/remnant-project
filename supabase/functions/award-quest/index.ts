import {
  adminClient,
  corsHeaders,
  evaluateAchievements,
  getBalance,
  insertEvent,
  isAdmin,
  json,
  QUEST_RULES,
  requireUser,
} from "../_shared/quest.ts";

/**
 * The single authorization point for QUEST. Nothing else may write reward_events.
 * Amounts, proof-of-scan and idempotency are all decided here, never by the client.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // ---- Mint a short-lived proof-of-scan nonce (called by the QR scanner) ----
    if (action === "mint_scan_token") {
      const markerId = String(body?.marker_id ?? "").slice(0, 120);
      if (!markerId) return json({ error: "marker_id required" }, 400);
      const { data, error } = await admin
        .from("scan_tokens")
        .insert({ user_id: user.id, marker_id: markerId })
        .select("token")
        .single();
      if (error) throw error;
      return json({ token: data.token });
    }

    // ---- Verified marker discovery (QR scan only) ----
    if (action === "discovery") {
      const markerId = String(body?.marker_id ?? "").slice(0, 120);
      const markerName = String(body?.marker_name ?? markerId).slice(0, 200);
      const city = body?.city ? String(body.city).slice(0, 80) : null;
      const cityTotal = Number.isFinite(Number(body?.city_total)) ? Number(body.city_total) : null;
      const token = String(body?.scan_token ?? "");
      if (!markerId || !token) return json({ error: "marker_id and scan_token required" }, 400);

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: scan } = await admin
        .from("scan_tokens")
        .select("token, marker_id, consumed_at, created_at")
        .eq("token", token)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!scan || scan.marker_id !== markerId || scan.consumed_at || scan.created_at < tenMinutesAgo) {
        return json({ error: "Scan could not be verified" }, 403);
      }
      await admin.from("scan_tokens").update({ consumed_at: new Date().toISOString() }).eq("token", token);

      // Rarity is read from the database, never trusted from the client.
      const { data: marker } = await admin
        .from("markers")
        .select("rarity, city, name")
        .eq("slug", markerId)
        .maybeSingle();
      const rarity = marker?.rarity === "rare" ? "rare" : "common";
      const amount = rarity === "rare" ? QUEST_RULES.rareDiscovery : QUEST_RULES.discovery;

      // Keep the account's visit log in step with the discovery.
      await admin
        .from("marker_visits")
        .upsert({ user_id: user.id, marker_id: markerId }, { onConflict: "user_id,marker_id" });

      const event = await insertEvent(admin, {
        userId: user.id,
        eventType: "marker_discovery",
        sourceType: "marker",
        sourceId: markerId,
        amount,
        title: `Discovered ${marker?.name ?? markerName}`,
        metadata: { rarity, city: marker?.city ?? city, city_total: cityTotal },
      });

      const achievements = await evaluateAchievements(admin, user.id);
      return json({
        awarded: Boolean(event),
        amount: event ? amount : 0,
        title: event?.title ?? "Already discovered",
        rarity,
        achievements,
        balance: await getBalance(admin, user.id),
      });
    }

    // ---- Trail / city completion: the server recounts the discoveries ----
    if (action === "trail") {
      const city = String(body?.city ?? "").slice(0, 80);
      if (!city) return json({ error: "city required" }, 400);

      const { data: events } = await admin
        .from("reward_events")
        .select("source_id, metadata")
        .eq("user_id", user.id)
        .eq("event_type", "marker_discovery");

      const inCity = (events ?? []).filter(
        (e) => (e.metadata as Record<string, unknown> | null)?.city === city,
      );
      const totals = inCity
        .map((e) => Number((e.metadata as Record<string, unknown> | null)?.city_total ?? 0))
        .filter((n) => n > 0);
      const cityTotal = totals.length ? Math.max(...totals) : 0;
      const discovered = new Set(inCity.map((e) => e.source_id)).size;

      if (cityTotal === 0 || discovered < cityTotal) {
        return json({ awarded: false, reason: "Trail not complete", discovered, cityTotal });
      }

      const { error: compError } = await admin
        .from("quest_completions")
        .insert({
          user_id: user.id,
          completion_type: "trail",
          target_id: city,
          score: discovered,
          max_score: cityTotal,
        });
      if (compError && compError.code !== "23505") throw compError;

      const event = await insertEvent(admin, {
        userId: user.id,
        eventType: "trail_complete",
        sourceType: "city",
        sourceId: city,
        amount: QUEST_RULES.trailComplete,
        title: `Completed the ${city} trail`,
        metadata: { city, discovered, city_total: cityTotal },
      });

      const achievements = await evaluateAchievements(admin, user.id);
      return json({
        awarded: Boolean(event),
        amount: event ? QUEST_RULES.trailComplete : 0,
        title: event?.title ?? "Trail already completed",
        achievements,
        balance: await getBalance(admin, user.id),
      });
    }

    // ---- Admin-granted: events and approved contributions ----
    if (action === "grant") {
      if (!(await isAdmin(admin, user.id))) return json({ error: "Admins only" }, 403);
      const targetUser = String(body?.user_id ?? "");
      const kind = body?.kind === "contribution" ? "contribution_approved" : "event_participation";
      const amount = kind === "contribution_approved"
        ? QUEST_RULES.contributionApproved
        : Math.max(0, Math.min(5000, Number(body?.amount ?? 0)));
      const title = String(body?.title ?? "Event reward").slice(0, 200);
      const sourceId = body?.source_id ? String(body.source_id).slice(0, 120) : null;
      if (!targetUser || amount <= 0) return json({ error: "user_id and amount required" }, 400);

      const event = await insertEvent(admin, {
        userId: targetUser,
        eventType: kind,
        sourceType: kind === "contribution_approved" ? "marker_request" : "event",
        sourceId,
        amount,
        title,
      });
      const achievements = await evaluateAchievements(admin, targetUser);
      return json({ awarded: Boolean(event), amount: event ? amount : 0, achievements });
    }

    // ---- Catch-up: evaluate achievements without a new earn ----
    if (action === "sync") {
      const achievements = await evaluateAchievements(admin, user.id);
      return json({ awarded: achievements.length > 0, achievements, balance: await getBalance(admin, user.id) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("award-quest error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
