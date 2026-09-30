import {
  adminClient,
  corsHeaders,
  awardByRule,
  checkTravel,
  evaluateAchievements,
  getBalance,
  json,
  requireUser,
  rotatingCode,
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

      if (!scan || scan.marker_id !== markerId || scan.created_at < tenMinutesAgo) {
        return json({ error: "Scan could not be verified" }, 403);
      }
      // A retried request after a lost response: the token is spent, so just report the saved result.
      if (scan.consumed_at) {
        const { data: prior } = await admin.from("reward_events").select("quest_amount, title")
          .eq("user_id", user.id).eq("event_type", "marker_discovery").eq("source_id", markerId).maybeSingle();
        if (!prior) return json({ error: "Scan could not be verified" }, 403);
        return json({ awarded: false, amount: 0, title: "Already collected", already: true, achievements: [], balance: await getBalance(admin, user.id) });
      }
      await admin.from("scan_tokens").update({ consumed_at: new Date().toISOString() }).eq("token", token);

      const { data: marker } = await admin
        .from("markers")
        .select("rarity, city, name, sensitivity")
        .eq("slug", markerId)
        .maybeSingle();
      const rarity = marker?.rarity === "rare" ? "rare" : "common";

      // Save the verified visit before any coins move.
      await admin
        .from("marker_visits")
        .upsert({ user_id: user.id, marker_id: markerId }, { onConflict: "user_id,marker_id" });

      await checkTravel(admin, user.id, markerId);
      const result = await awardByRule(admin, {
        userId: user.id,
        ruleCode: "marker_visit",
        sourceType: "marker",
        sourceId: markerId,
        title: `Discovered ${marker?.name ?? markerName}`,
        metadata: { rarity, city: marker?.city ?? city, city_total: cityTotal },
      });

      const achievements = await evaluateAchievements(admin, user.id);
      return json({
        awarded: result.awarded,
        amount: result.amount,
        title: result.title,
        already: result.reason === "Already collected",
        reason: result.reason,
        rarity,
        quiet: marker?.sensitivity === "sensitive",
        achievements,
        balance: await getBalance(admin, user.id),
      });
    }

    // ---- Special event check-in with a rotating staff code ----
    if (action === "event_checkin") {
      const code = String(body?.event_code ?? "").slice(0, 80);
      const entered = String(body?.checkin_code ?? "").replace(/\D/g, "").slice(0, 6);
      const { data: ev } = await admin.from("quest_events").select("*").eq("code", code).eq("published", true).maybeSingle();
      if (!ev) return json({ error: "Event not found" }, 404);
      const now = Date.now();
      if (ev.starts_at && now < Date.parse(ev.starts_at)) return json({ error: "This event hasn't started yet." }, 409);
      if (ev.ends_at && now > Date.parse(ev.ends_at)) return json({ error: "This event has ended." }, 409);
      if (ev.verification !== "staff") {
        const w = Math.floor(now / 1000 / ev.rotate_seconds);
        const valid = [await rotatingCode(ev.checkin_secret, w), await rotatingCode(ev.checkin_secret, w - 1)];
        if (!valid.includes(entered)) return json({ error: "That code didn't match. Ask staff for the current code." }, 403);
      } else {
        return json({ error: "Staff will confirm your attendance at this event." }, 403);
      }
      const result = await awardByRule(admin, {
        userId: user.id, ruleCode: "event_quest", sourceType: "event", sourceId: ev.id,
        title: `Event: ${ev.name}`, amount: ev.amount, campaignCode: ev.campaign_code,
      });
      return json({ ...result, event: undefined, balance: await getBalance(admin, user.id) });
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

      const result = await awardByRule(admin, {
        userId: user.id,
        ruleCode: "trail_complete",
        sourceType: "city",
        sourceId: `city:${city}`,
        title: `Completed the ${city} trail`,
        metadata: { city, discovered, city_total: cityTotal },
      });

      const achievements = await evaluateAchievements(admin, user.id);
      return json({
        awarded: result.awarded,
        amount: result.amount,
        title: result.awarded ? result.title : "Trail already completed",
        achievements,
        balance: await getBalance(admin, user.id),
      });
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
