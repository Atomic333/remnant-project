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

/** Server-side reward table. The frontend never decides amounts. */
export const QUEST_RULES = {
  discovery: 50,
  rareDiscovery: 100,
  triviaPerCorrect: 10,
  triviaPerfectBonus: 15,
  trailComplete: 250,
  contributionApproved: 150,
} as const;

export interface AwardInput {
  userId: string;
  eventType: string;
  sourceType?: string | null;
  sourceId?: string | null;
  amount: number;
  title: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerRow {
  id: string;
  quest_amount: number;
  title: string;
  event_type: string;
  created_at: string;
}

/**
 * Insert one ledger row. Idempotent: a duplicate (user, event_type, source_id)
 * is silently ignored and `null` is returned.
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
