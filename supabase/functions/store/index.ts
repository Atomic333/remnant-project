import { adminClient, corsHeaders, getBalance, json, requireUser } from "../_shared/quest.ts";

/** Quest Coin store: atomic purchases (database function) and equipping owned items. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Sign in to use the store." }, 401);
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "purchase") {
      const code = String(body?.reward_code ?? "").slice(0, 80);
      const key = String(body?.idempotency_key ?? "").slice(0, 80);
      if (!code || key.length < 8) return json({ error: "reward_code and idempotency_key required" }, 400);
      const { data, error } = await admin.rpc("purchase_item", { _user: user.id, _code: code, _key: key });
      if (error) throw error;
      const r = data as { ok: boolean; error?: string; short?: number; redemption_code?: string | null; replayed?: boolean };
      if (!r.ok) return json({ error: r.error, short: r.short ?? null }, 409);
      return json({ ...r, balance: await getBalance(admin, user.id) });
    }

    if (action === "equip") {
      const code = String(body?.reward_code ?? "").slice(0, 80);
      const equip = body?.equip !== false;
      const { data: item } = await admin.from("rewards_catalog").select("item_type").eq("code", code).maybeSingle();
      if (!item || !["theme", "frame", "accessory"].includes(item.item_type)) return json({ error: "This item can't be equipped." }, 400);
      const { data: own } = await admin.from("entitlements").select("id").eq("user_id", user.id).eq("reward_code", code).is("revoked_at", null).maybeSingle();
      if (!own) return json({ error: "You don't own this item." }, 403);
      if (equip) {
        const { data: sameType } = await admin.from("rewards_catalog").select("code").eq("item_type", item.item_type);
        await admin.from("entitlements").update({ equipped: false }).eq("user_id", user.id).in("reward_code", (sameType ?? []).map((s) => s.code));
      }
      await admin.from("entitlements").update({ equipped: equip }).eq("id", own.id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("store error:", e);
    return json({ error: "Something went wrong. Nothing was charged." }, 500);
  }
});
