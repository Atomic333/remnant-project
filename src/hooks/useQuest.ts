import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QuestBalance {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

export interface UnlockedAchievement {
  code: string;
  name: string;
  description: string;
  tier: string;
  icon: string;
  quest_reward: number;
}

/** Result of any server-side award. The client never computes amounts. */
export interface QuestAward {
  awarded: boolean;
  amount: number;
  title: string;
  rarity?: string;
  achievements?: UnlockedAchievement[];
  balance?: QuestBalance;
  error?: string;
  reason?: string;
  already?: boolean;
}

const EMPTY: QuestBalance = { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };

/** Rank titles — flavor only, derived from lifetime earnings. */
export const QUEST_RANKS = [
  { min: 0, title: "Wanderer" },
  { min: 100, title: "Street Historian" },
  { min: 400, title: "Archive Walker" },
  { min: 900, title: "Relic Seeker" },
  { min: 1800, title: "Keeper of Stories" },
  { min: 3500, title: "Chronicler" },
] as const;

export function questRank(lifetimeEarned: number) {
  type Rank = { min: number; title: string };
  let current: Rank = QUEST_RANKS[0];
  let next: Rank | null = null;
  for (const rank of QUEST_RANKS) {
    if (lifetimeEarned >= rank.min) current = rank;
    else if (!next) next = rank;
  }
  return { title: current.title, next };
}

export function useQuestBalance() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["quest-balance", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<QuestBalance> => {
      const { data, error } = await supabase
        .from("explorer_balances")
        .select("balance, lifetime_earned, lifetime_spent")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as QuestBalance | null) ?? EMPTY;
    },
  });

  return { ...(query.data ?? EMPTY), loading: query.isLoading, signedIn: Boolean(userId) };
}

export interface RewardEventRow {
  id: string;
  event_type: string;
  source_type: string | null;
  source_id: string | null;
  quest_amount: number;
  title: string;
  created_at: string;
  settlement_status: string;
}

export function useRewardHistory() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["quest-history", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RewardEventRow[]> => {
      const { data, error } = await supabase
        .from("reward_events")
        .select("id, event_type, source_type, source_id, quest_amount, title, created_at, settlement_status")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as RewardEventRow[];
    },
  });
}

export interface AchievementRow {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  quest_reward: number;
  criteria: unknown;
  sort_order: number;
}

export function useAchievements() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["quest-achievements", userId],
    queryFn: async () => {
      const [catalog, owned] = await Promise.all([
        supabase
          .from("achievements")
          .select("code, name, description, icon, tier, quest_reward, criteria, sort_order")
          .eq("active", true)
          .order("sort_order"),
        userId
          ? supabase.from("user_achievements").select("achievement_code, unlocked_at")
          : Promise.resolve({ data: [], error: null } as never),
      ]);
      if (catalog.error) throw catalog.error;
      const unlocked = new Map(
        ((owned.data ?? []) as { achievement_code: string; unlocked_at: string }[]).map((r) => [
          r.achievement_code,
          r.unlocked_at,
        ]),
      );
      return ((catalog.data ?? []) as AchievementRow[]).map((a) => ({
        ...a,
        unlocked_at: unlocked.get(a.code) ?? null,
      }));
    },
  });
}

export interface RewardCatalogRow {
  code: string;
  item_type: "accessory" | "frame" | "theme" | "collectible" | "partner" | string;
  preview: { color?: string; emoji?: string; from?: string; to?: string } | null;
  inventory: number | null;
  sold: number;
  starts_at: string | null;
  ends_at: string | null;
  redemption_instructions: string | null;
  name: string;
  description: string;
  kind: string;
  cost: number;
  icon: string;
  unlock_criteria: { discoveries?: number } | null;
  partner_name: string | null;
  sort_order: number;
}

export function useRewardsCatalog() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["rewards-catalog", userId],
    queryFn: async () => {
      const [catalog, mine] = await Promise.all([
        supabase
          .from("rewards_catalog")
          .select("code, name, description, kind, cost, icon, unlock_criteria, partner_name, sort_order, item_type, preview, inventory, sold, starts_at, ends_at, redemption_instructions")
          .eq("active", true)
          .eq("published", true)
          .order("sort_order"),
        userId
          ? supabase.from("redemptions").select("id, reward_code, redemption_code, status, created_at, expires_at").order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null } as never),
      ]);
      if (catalog.error) throw catalog.error;
      return {
        rewards: (catalog.data ?? []) as RewardCatalogRow[],
        redemptions: (mine.data ?? []) as {
          id: string;
          reward_code: string;
          redemption_code: string | null;
          status: string;
          created_at: string;
          expires_at: string | null;
        }[],
      };
    },
  });
}

/** Number of verified (QR-scanned) discoveries — drives reward unlocks. */
export function useVerifiedDiscoveryCount() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["quest-discovery-count", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("reward_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "marker_discovery");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Has this explorer verifiably scanned this marker's QR code on site? */
export function useMarkerDiscovered(markerId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["quest-marker-discovered", userId, markerId],
    enabled: Boolean(userId && markerId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("reward_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "marker_discovery")
        .eq("source_id", markerId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}


// ---- Server calls: the only way QUEST ever moves ----

async function invokeQuest<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    // Edge function errors carry a JSON body with a human-readable message.
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) message = String(parsed.error);
      } catch {
        /* keep default */
      }
    }
    throw new Error(message);
  }
  return data as T;
}

const SCAN_TOKEN_PREFIX = "markerquest_scan_token_";

/** Hand a freshly minted scan token to the marker page the scanner navigates to. */
export function stashScanToken(markerId: string, token: string) {
  try {
    sessionStorage.setItem(SCAN_TOKEN_PREFIX + markerId, token);
  } catch {
    /* ignore */
  }
}

export function consumeScanToken(markerId: string): string | null {
  try {
    const key = SCAN_TOKEN_PREFIX + markerId;
    const token = sessionStorage.getItem(key);
    if (token) sessionStorage.removeItem(key);
    return token;
  } catch {
    return null;
  }
}

/**
 * Called by every in-app QR scanner. Signed-in visitors get a one-time server token;
 * guests get a marker so the page knows the visit came from the scanner (their claim stays
 * pending on the server until they sign in).
 */
export async function prepareVerifiedScan(markerId: string) {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      stashScanToken(markerId, "guest");
      return;
    }
    const { token } = await mintScanToken(markerId);
    stashScanToken(markerId, token);
  } catch {
    /* offline scans just skip verification */
  }
}

export function mintScanToken(markerId: string) {
  return invokeQuest<{ token: string }>("award-quest", { action: "mint_scan_token", marker_id: markerId });
}

export function awardDiscovery(input: {
  markerId: string;
  markerName: string;
  scanToken: string;
  city?: string;
  cityTotal?: number;
}) {
  return invokeQuest<QuestAward>("award-quest", {
    action: "discovery",
    marker_id: input.markerId,
    marker_name: input.markerName,
    scan_token: input.scanToken,
    city: input.city,
    city_total: input.cityTotal,
  });
}

export function awardTrail(city: string) {
  return invokeQuest<QuestAward>("award-quest", { action: "trail", city });
}

export function syncAchievements() {
  return invokeQuest<QuestAward>("award-quest", { action: "sync" });
}

export interface TriviaSet {
  questions: { question: string; options: string[] }[];
  already_completed: boolean;
  previous_score: number | null;
  max_score: number;
  /** True when the user has not scanned this marker's QR code on site. */
  locked?: boolean;
}


export function fetchTrivia(markerId: string, context: {
  name: string;
  summary: string;
  story: string;
  sources: string;
}) {
  return invokeQuest<TriviaSet>("marker-trivia", { action: "get", marker_id: markerId, context });
}

export interface TriviaResult extends QuestAward {
  score: number;
  max_score: number;
  perfect: boolean;
  results: { correct: boolean; answer_index: number; explanation: string }[];
}

export function gradeTrivia(markerId: string, answers: number[]) {
  return invokeQuest<TriviaResult>("marker-trivia", {
    action: "grade",
    marker_id: markerId,
    answers,
  });
}

/** Stable per-attempt key so a retried purchase never charges twice. */
export function newIdempotencyKey() {
  return crypto.randomUUID();
}

export function purchaseItem(rewardCode: string, idempotencyKey: string) {
  return invokeQuest<{ ok: boolean; replayed?: boolean; redemption_code: string | null; balance: QuestBalance }>(
    "store",
    { action: "purchase", reward_code: rewardCode, idempotency_key: idempotencyKey },
  );
}

export function equipItem(rewardCode: string, equip = true) {
  return invokeQuest<{ ok: boolean }>("store", { action: "equip", reward_code: rewardCode, equip });
}

export function eventCheckin(eventCode: string, checkinCode: string) {
  return invokeQuest<QuestAward>("award-quest", { action: "event_checkin", event_code: eventCode, checkin_code: checkinCode });
}

export function questAdmin<T = any>(action: string, body: Record<string, unknown> = {}) {
  return invokeQuest<T>("quest-admin", { action, ...body });
}

export interface EntitlementRow {
  reward_code: string;
  equipped: boolean;
  created_at: string;
  item: RewardCatalogRow | null;
}

/** Items this visitor owns (from purchases), with the catalog row joined client-side. */
export function useEntitlements() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: ["entitlements", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<EntitlementRow[]> => {
      const [{ data: ents, error }, { data: items }] = await Promise.all([
        supabase.from("entitlements").select("reward_code, equipped, created_at").is("revoked_at", null),
        supabase.from("rewards_catalog").select("*"),
      ]);
      if (error) throw error;
      const byCode = new Map(((items ?? []) as unknown as RewardCatalogRow[]).map((i) => [i.code, i]));
      return (ents ?? []).map((e) => ({ ...e, item: byCode.get(e.reward_code) ?? null }));
    },
  });
}

/** Equipped theme / frame / accessory for the signed-in visitor. */
export function useEquipped() {
  const { data } = useEntitlements();
  const eq = (type: string) => data?.find((e) => e.equipped && e.item?.item_type === type)?.item ?? null;
  return { theme: eq("theme"), frame: eq("frame"), accessory: eq("accessory") };
}

export interface RewardRuleRow {
  code: string;
  name: string;
  description: string;
  amount: number;
  stacks_with_trail: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export function useRewardRules() {
  return useQuery({
    queryKey: ["reward-rules"],
    queryFn: async (): Promise<RewardRuleRow[]> => {
      const { data, error } = await supabase.from("reward_rules").select("code,name,description,amount,stacks_with_trail,starts_at,ends_at").order("sort_order");
      if (error) throw error;
      return (data ?? []) as RewardRuleRow[];
    },
  });
}

// ---- Offline-safe retry for plaque awards (keyed by marker, server is idempotent) ----
const PENDING_KEY = "markerquest_pending_awards";
interface PendingAward { markerId: string; markerName: string; scanToken: string; at: number }

export function readPendingAwards(): PendingAward[] {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]"); } catch { return []; }
}
function writePending(list: PendingAward[]) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
export function queuePendingAward(p: Omit<PendingAward, "at">) {
  writePending([...readPendingAwards().filter((x) => x.markerId !== p.markerId), { ...p, at: Date.now() }]);
}
export function clearPendingAward(markerId: string) {
  writePending(readPendingAwards().filter((x) => x.markerId !== markerId));
}

/** True when the failure is a connectivity problem worth retrying (not a server refusal). */
export function isNetworkError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return !navigator.onLine || /fetch|network|Failed to send|timeout/i.test(msg);
}
