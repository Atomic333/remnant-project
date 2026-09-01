import {
  adminClient,
  corsHeaders,
  getBalance,
  insertEvent,
  json,
  requireUser,
} from "../_shared/quest.ts";

function makeRedemptionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `MQ-${out.slice(0, 4)}-${out.slice(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const rewardCode = String(body?.reward_code ?? "").slice(0, 80);
    if (!rewardCode) return json({ error: "reward_code required" }, 400);

    const { data: reward } = await admin
      .from("rewards_catalog")
      .select("*")
      .eq("code", rewardCode)
      .eq("active", true)
      .maybeSingle();
    if (!reward) return json({ error: "Reward not available" }, 404);

    // Cosmetics are owned once; perks can be redeemed repeatedly.
    if (reward.kind === "cosmetic") {
      const { data: owned } = await admin
        .from("redemptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("reward_code", rewardCode)
        .maybeSingle();
      if (owned) return json({ error: "You already own this reward" }, 409);
    }

    // Unlock criteria are checked server-side.
    const criteria = (reward.unlock_criteria ?? {}) as { discoveries?: number };
    if (criteria.discoveries) {
      const { count } = await admin
        .from("reward_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("event_type", "marker_discovery");
      if ((count ?? 0) < criteria.discoveries) {
        return json({ error: `Locked — ${criteria.discoveries} verified discoveries needed` }, 403);
      }
    }

    const balance = await getBalance(admin, user.id);
    if (balance.balance < reward.cost) {
      return json({ error: "Not enough QUEST" }, 402);
    }

    const redemptionCode = reward.kind === "perk" ? makeRedemptionCode() : null;
    const { data: redemption, error: redemptionError } = await admin
      .from("redemptions")
      .insert({
        user_id: user.id,
        reward_code: rewardCode,
        quest_spent: reward.cost,
        status: reward.kind === "perk" ? "issued" : "owned",
        redemption_code: redemptionCode,
      })
      .select("id")
      .single();
    if (redemptionError) throw redemptionError;

    const event = await insertEvent(admin, {
      userId: user.id,
      eventType: "redemption",
      sourceType: "redemption",
      sourceId: redemption.id,
      amount: -reward.cost,
      title: `Redeemed ${reward.name}`,
      metadata: { reward_code: rewardCode, kind: reward.kind },
    });

    // Ledger write failed → undo the redemption so nothing is issued for free.
    if (!event) {
      await admin.from("redemptions").delete().eq("id", redemption.id);
      return json({ error: "Redemption could not be completed" }, 500);
    }

    return json({
      redeemed: true,
      reward: { code: reward.code, name: reward.name, kind: reward.kind },
      redemption_code: redemptionCode,
      balance: await getBalance(admin, user.id),
    });
  } catch (error) {
    console.error("redeem-reward error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
