import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Service-role client — the only thing allowed to write the ledger. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Validate the caller's JWT in code (functions deploy with verify_jwt = false). */
export async function requireUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

export async function isAdmin(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return Boolean(data);
}

/** Fallback amounts only — live amounts come from the reward_rules table. */
export const QUEST_RULES = {
  discovery: 25,
  rareDiscovery: 25,
  triviaPerCorrect: 10,
  triviaPerfectBonus: 0,
  trailComplete: 100,
  contributionApproved: 50,
} as const;

export interface AwardInput {
  userId: string;
  eventType: string;
  sourceType?: string | null;
  sourceId?: string | null;
  amount: number;
  title: string;
  metadata?: Record<string, unknown>;
  awardKey?: string | null;
}

export interface LedgerRow {
  id: string;
  quest_amount: number;
  title: string;
  event_type: string;
  created_at: string;
}

/**
 * Insert one ledger row. Idempotent: a duplicate (user, event_type, source_id) or
 * award_key is silently ignored and `null` is returned.
 */
export async function insertEvent(admin: SupabaseClient, input: AwardInput): Promise<LedgerRow | null> {
  const { data, error } = await admin
    .from("reward_events")
    .insert({
      user_id: input.userId,
      event_type: input.eventType,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      quest_amount: input.amount,
      title: input.title,
      metadata: input.metadata ?? {},
      award_key: input.awardKey ?? null,
    })
    .select("id, quest_amount, title, event_type, created_at")
    .maybeSingle();

  if (error) {
    // 23505 = unique violation → already awarded.
    if (error.code === "23505") return null;
    throw error;
  }
  return data as LedgerRow | null;
}

/** Ledger event_type per rule (kept stable so progress counters keep working). */
export const RULE_EVENT_TYPE: Record<string, string> = {
  marker_visit: "marker_discovery",
  digital_discovery: "discovery_reward",
  history_challenge: "trivia",
  trail_complete: "marker_trail_complete",
  event_quest: "event_quest",
  contribution: "contribution_approved",
  h5p_activity: "h5p_activity",
};

export interface RuleAwardInput {
  userId: string;
  ruleCode: string;
  sourceType: string;
  sourceId: string;
  title: string;
  /** Overrides the rule amount (e.g. an event's own amount). Server-decided only. */
  amount?: number | null;
  campaignCode?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RuleAwardResult {
  awarded: boolean;
  amount: number;
  title: string;
  reason?: string;
  event?: LedgerRow | null;
}

/**
 * The one path every earn goes through: reads the live rule, enforces dates, caps,
 * cooldowns, budgets and rate limits, then writes with a deterministic award key.
 */
export async function awardByRule(admin: SupabaseClient, input: RuleAwardInput): Promise<RuleAwardResult> {
  const { data: rule } = await admin.from("reward_rules").select("*").eq("code", input.ruleCode).maybeSingle();
  if (!rule || !rule.active) return { awarded: false, amount: 0, title: input.title, reason: "This reward is not active." };
  const now = Date.now();
  if (rule.starts_at && now < Date.parse(rule.starts_at)) return { awarded: false, amount: 0, title: input.title, reason: "This reward hasn't started." };
  if (rule.ends_at && now > Date.parse(rule.ends_at)) return { awarded: false, amount: 0, title: input.title, reason: "This reward has ended." };

  const amount = Math.max(0, Math.min(5000, Math.round(Number(input.amount ?? rule.amount))));
  if (amount <= 0) return { awarded: false, amount: 0, title: input.title, reason: "No coins for this activity." };

  let awardKey = `${rule.code}:${input.userId}:${input.sourceId}`;
  if (rule.repeatable) {
    const { data: prior } = await admin.from("reward_events").select("created_at")
      .eq("user_id", input.userId).eq("event_type", RULE_EVENT_TYPE[rule.code] ?? rule.code).eq("status", "confirmed")
      .order("created_at", { ascending: false }).limit(1000);
    const rows = prior ?? [];
    if (rule.cap_per_user && rows.length >= rule.cap_per_user) return { awarded: false, amount: 0, title: input.title, reason: "Reward limit reached." };
    if (rule.cooldown_hours > 0 && rows[0] && now - Date.parse(rows[0].created_at) < rule.cooldown_hours * 3600_000) {
      return { awarded: false, amount: 0, title: input.title, reason: "Come back later to earn this again." };
    }
    const bucket = rule.cooldown_hours > 0 ? Math.floor(now / (rule.cooldown_hours * 3600_000)) : rows.length;
    awardKey += `:${bucket}`;
  } else {
    const { data: dup } = await admin.from("reward_events").select("id").eq("award_key", awardKey).maybeSingle();
    if (dup) return { awarded: false, amount: 0, title: "Already collected", reason: "Already collected" };
  }

  // Rate limit: at most 30 earns per 10 minutes per visitor.
  const since = new Date(now - 10 * 60 * 1000).toISOString();
  const { count: recent } = await admin.from("reward_events").select("id", { count: "exact", head: true })
    .eq("user_id", input.userId).gt("quest_amount", 0).gte("created_at", since);
  if ((recent ?? 0) >= 30) {
    await admin.from("review_flags").insert({ user_id: input.userId, kind: "rate_limit", details: { rule: rule.code } });
    return { awarded: false, amount: 0, title: input.title, reason: "Too many rewards in a short time. Try again later." };
  }

  if (input.campaignCode) {
    const { data: ok } = await admin.rpc("spend_campaign_budget", { _code: input.campaignCode, _amount: amount });
    if (!ok) return { awarded: false, amount: 0, title: input.title, reason: "This campaign's coins have run out or it isn't running." };
  }

  const event = await insertEvent(admin, {
    userId: input.userId,
    eventType: RULE_EVENT_TYPE[rule.code] ?? rule.code,
    sourceType: input.sourceType,
    sourceId: rule.repeatable ? `${input.sourceId}:${awardKey.split(":").pop()}` : input.sourceId,
    amount,
    title: input.title,
    metadata: { ...(input.metadata ?? {}), rule: rule.code, campaign: input.campaignCode ?? null },
    awardKey,
  });
  if (!event && input.campaignCode) {
    await admin.rpc("spend_campaign_budget", { _code: input.campaignCode, _amount: -amount });
  }
  return event
    ? { awarded: true, amount, title: input.title, event }
    : { awarded: false, amount: 0, title: "Already collected", reason: "Already collected" };
}

/** Flag (never block) impossible travel between two plaque visits. */
export async function checkTravel(admin: SupabaseClient, userId: string, markerSlug: string) {
  const { data: here } = await admin.from("markers").select("lat,lng").eq("slug", markerSlug).maybeSingle();
  if (!here) return;
  const { data: last } = await admin.from("reward_events").select("source_id, created_at")
    .eq("user_id", userId).eq("event_type", "marker_discovery").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!last?.source_id || last.source_id === markerSlug) return;
  const { data: prev } = await admin.from("markers").select("lat,lng").eq("slug", last.source_id).maybeSingle();
  if (!prev) return;
  const R = 6371, toR = Math.PI / 180;
  const dLat = (here.lat - prev.lat) * toR, dLng = (here.lng - prev.lng) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * toR) * Math.cos(here.lat * toR) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(h));
  const hours = Math.max((Date.now() - Date.parse(last.created_at)) / 3600_000, 1 / 3600);
  if (km > 2 && km / hours > 200) {
    await admin.from("review_flags").insert({ user_id: userId, kind: "impossible_travel", details: { from: last.source_id, to: markerSlug, km: Math.round(km), kmh: Math.round(km / hours) } });
  }
}

export async function audit(admin: SupabaseClient, actorId: string, action: string, targetType: string, targetId: string, reason?: string | null, details: Record<string, unknown> = {}) {
  await admin.from("admin_audit_log").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, reason: reason ?? null, details });
}

export async function getBalance(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from("explorer_balances")
    .select("balance, lifetime_earned, lifetime_spent")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };
}

interface Counters {
  discoveries: number;
  rareDiscoveries: number;
  trivia: number;
  perfectTrivia: number;
  trails: number;
  contributions: number;
}

async function countStats(admin: SupabaseClient, userId: string): Promise<Counters> {
  const { data: events } = await admin
    .from("reward_events")
    .select("event_type, metadata")
    .eq("user_id", userId);
  const { data: completions } = await admin
    .from("quest_completions")
    .select("completion_type, score, max_score")
    .eq("user_id", userId);

  const rows = events ?? [];
  const comps = completions ?? [];
  return {
    discoveries: rows.filter((r) => r.event_type === "marker_discovery").length,
    rareDiscoveries: rows.filter(
      (r) => r.event_type === "marker_discovery" &&
        (r.metadata as Record<string, unknown> | null)?.rarity === "rare",
    ).length,
    trivia: comps.filter((c) => c.completion_type === "trivia").length,
    perfectTrivia: comps.filter((c) => c.completion_type === "trivia" && c.max_score > 0 && c.score === c.max_score).length,
    trails: comps.filter((c) => c.completion_type === "trail").length,
    contributions: rows.filter((r) => r.event_type === "contribution_approved").length,
  };
}

export interface UnlockedAchievement {
  code: string;
  name: string;
  description: string;
  tier: string;
  icon: string;
  quest_reward: number;
}

/** Re-evaluate every achievement server-side and award any newly met ones. */
export async function evaluateAchievements(
  admin: SupabaseClient,
  userId: string,
): Promise<UnlockedAchievement[]> {
  const [{ data: catalog }, { data: owned }, stats] = await Promise.all([
    admin.from("achievements").select("*").eq("active", true),
    admin.from("user_achievements").select("achievement_code").eq("user_id", userId),
    countStats(admin, userId),
  ]);

  const has = new Set((owned ?? []).map((r) => r.achievement_code));
  const unlocked: UnlockedAchievement[] = [];

  for (const a of catalog ?? []) {
    if (has.has(a.code)) continue;
    const criteria = (a.criteria ?? {}) as { type?: string; count?: number };
    const need = Number(criteria.count ?? 1);
    const value = {
      discoveries: stats.discoveries,
      rare_discoveries: stats.rareDiscoveries,
      trivia: stats.trivia,
      perfect_trivia: stats.perfectTrivia,
      trails: stats.trails,
      contributions: stats.contributions,
    }[criteria.type ?? ""] ?? 0;

    if (value < need) continue;

    const { error } = await admin
      .from("user_achievements")
      .insert({ user_id: userId, achievement_code: a.code });
    if (error) continue; // already unlocked in a concurrent call

    await insertEvent(admin, {
      userId,
      eventType: "achievement",
      sourceType: "achievement",
      sourceId: a.code,
      amount: a.quest_reward,
      title: `Achievement — ${a.name}`,
      metadata: { tier: a.tier },
    });

    unlocked.push({
      code: a.code,
      name: a.name,
      description: a.description,
      tier: a.tier,
      icon: a.icon,
      quest_reward: a.quest_reward,
    });
  }

  return unlocked;
}


/** 6-digit code for a time window, shared by staff display and visitor check-in. */
export async function rotatingCode(secret: string, window: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(window))));
  const n = ((sig[0] << 24) | (sig[1] << 16) | (sig[2] << 8) | sig[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, "0");
}
