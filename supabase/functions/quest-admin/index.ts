import { adminClient, audit, awardByRule, corsHeaders, isAdmin, json, requireUser, rotatingCode } from "../_shared/quest.ts";

const RULE_FIELDS = ["name", "description", "amount", "repeatable", "cooldown_hours", "cap_per_user", "starts_at", "ends_at", "timezone", "verification", "stacks_with_trail", "active"];
const ITEM_FIELDS = ["name", "description", "cost", "item_type", "preview", "published", "active", "inventory", "starts_at", "ends_at", "partner_name", "sponsor_url", "redemption_instructions", "code_expires_days", "sort_order"];
const EVENT_FIELDS = ["name", "description", "location", "amount", "starts_at", "ends_at", "timezone", "verification", "rotate_seconds", "campaign_code", "published"];
const CAMPAIGN_FIELDS = ["name", "budget", "starts_at", "ends_at", "active"];

function pick(src: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f in src) out[f] = src[f] === "" ? null : src[f];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const isAdm = await isAdmin(admin, user.id);
    const { data: creatorRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "creator").maybeSingle();
    const isCreator = Boolean(creatorRow);
    if (!isAdm && !isCreator) return json({ error: "Not allowed" }, 403);
    const adminOnly = () => (isAdm ? null : json({ error: "Admins only" }, 403));
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";

    // ---------- Reads ----------
    if (action === "overview") {
      const own = (q: any) => (isAdm ? q : q.eq("created_by", user.id));
      const [rules, items, events, campaigns] = await Promise.all([
        admin.from("reward_rules").select("*").order("sort_order"),
        isAdm ? admin.from("rewards_catalog").select("*").order("sort_order") : Promise.resolve({ data: [] }),
        own(admin.from("quest_events").select("id,code,name,description,location,amount,starts_at,ends_at,timezone,verification,rotate_seconds,campaign_code,published,created_by").order("created_at", { ascending: false })),
        own(admin.from("campaigns").select("*").order("created_at", { ascending: false })),
      ]);
      let extra: Record<string, unknown> = {};
      if (isAdm) {
        const [flags, auditLog, requests, codes] = await Promise.all([
          admin.from("review_flags").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
          admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
          admin.from("marker_requests").select("id,location_name,why_it_matters,status,submitted_by,submitter_email,created_at").order("created_at", { ascending: false }).limit(50),
          admin.from("partner_codes").select("reward_code,status"),
        ]);
        const codeCounts: Record<string, Record<string, number>> = {};
        for (const c of codes.data ?? []) { codeCounts[c.reward_code] ??= {}; codeCounts[c.reward_code][c.status] = (codeCounts[c.reward_code][c.status] ?? 0) + 1; }
        extra = { flags: flags.data, audit: auditLog.data, requests: requests.data, code_counts: codeCounts };
      }
      return json({ is_admin: isAdm, rules: rules.data, items: items.data, events: events.data, campaigns: campaigns.data, ...extra });
    }

    if (action === "analytics") {
      if (adminOnly()) return adminOnly()!;
      const { data: ev } = await admin.from("reward_events").select("event_type, quest_amount").limit(100000);
      let issued = 0, spent = 0, refunded = 0, adjusted = 0;
      for (const e of ev ?? []) {
        if (e.event_type === "refund") refunded += e.quest_amount;
        else if (e.event_type === "adjustment") adjusted += e.quest_amount;
        else if (e.quest_amount > 0) issued += e.quest_amount;
        else spent += -e.quest_amount;
      }
      const { data: bal } = await admin.from("explorer_balances").select("balance");
      const outstanding = (bal ?? []).reduce((s, b) => s + Number(b.balance), 0);
      const { count: trails } = await admin.from("trail_sessions").select("id", { count: "exact", head: true }).eq("status", "completed");
      const { count: redemptions } = await admin.from("redemptions").select("id", { count: "exact", head: true }).is("refunded_at", null);
      const { count: partnerUsed } = await admin.from("partner_codes").select("id", { count: "exact", head: true }).eq("status", "redeemed");
      return json({ issued, spent, refunded, adjusted, outstanding, trail_completions: trails ?? 0, redemptions: redemptions ?? 0, partner_redeemed: partnerUsed ?? 0 });
    }

    if (action === "event_code") {
      const { data: ev } = await admin.from("quest_events").select("checkin_secret, rotate_seconds, created_by").eq("id", String(body?.id ?? "")).maybeSingle();
      if (!ev || (!isAdm && ev.created_by !== user.id)) return json({ error: "Not found" }, 404);
      const now = Date.now() / 1000;
      const w = Math.floor(now / ev.rotate_seconds);
      return json({ code: await rotatingCode(ev.checkin_secret, w), expires_in: Math.ceil((w + 1) * ev.rotate_seconds - now) });
    }

    // ---------- Writes ----------
    if (action === "save_rule") {
      if (adminOnly()) return adminOnly()!;
      const code = String(body?.code ?? "");
      const patch = pick(body?.rule ?? {}, RULE_FIELDS);
      const { error } = await admin.from("reward_rules").update({ ...patch, updated_at: new Date().toISOString() }).eq("code", code);
      if (error) return json({ error: error.message }, 400);
      await audit(admin, user.id, "save_rule", "reward_rule", code, null, patch);
      return json({ ok: true });
    }

    if (action === "save_item") {
      if (adminOnly()) return adminOnly()!;
      const code = String(body?.code ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 60);
      if (!code) return json({ error: "Code required" }, 400);
      const patch = pick(body?.item ?? {}, ITEM_FIELDS);
      if (patch.item_type === "partner" && patch.published) {
        if (!patch.partner_name || !patch.redemption_instructions) return json({ error: "Partner rewards need a real partner name and redemption instructions before publishing." }, 400);
      }
      const { data: exists } = await admin.from("rewards_catalog").select("code").eq("code", code).maybeSingle();
      const row = { ...patch, kind: patch.item_type === "partner" ? "perk" : "cosmetic" };
      const { error } = exists
        ? await admin.from("rewards_catalog").update(row).eq("code", code)
        : await admin.from("rewards_catalog").insert({ code, icon: "gift", unlock_criteria: {}, name: "New item", description: "", cost: 100, ...row });
      if (error) return json({ error: error.message }, 400);
      await audit(admin, user.id, "save_item", "store_item", code, null, patch);
      return json({ ok: true });
    }

    if (action === "add_partner_codes") {
      if (adminOnly()) return adminOnly()!;
      const code = String(body?.reward_code ?? "");
      const codes = (Array.isArray(body?.codes) ? body.codes : []).map((c: unknown) => String(c).trim()).filter((c: string) => c.length >= 4 && c.length <= 60).slice(0, 1000);
      if (!codes.length) return json({ error: "Paste at least one code." }, 400);
      const { error } = await admin.from("partner_codes").upsert(codes.map((c: string) => ({ reward_code: code, code: c })), { onConflict: "code", ignoreDuplicates: true });
      if (error) return json({ error: error.message }, 400);
      const { count } = await admin.from("partner_codes").select("id", { count: "exact", head: true }).eq("reward_code", code).neq("status", "void");
      await admin.from("rewards_catalog").update({ inventory: count ?? 0 }).eq("code", code);
      await audit(admin, user.id, "add_partner_codes", "store_item", code, null, { added: codes.length });
      return json({ ok: true, total: count });
    }

    if (action === "validate_partner_code") {
      if (adminOnly()) return adminOnly()!;
      const code = String(body?.code ?? "").trim();
      const { data: row } = await admin.from("partner_codes").update({ status: "redeemed", redeemed_at: new Date().toISOString(), redeemed_by: user.id })
        .eq("code", code).eq("status", "assigned").select("redemption_id, reward_code").maybeSingle();
      if (!row) {
        const { data: any } = await admin.from("partner_codes").select("status").eq("code", code).maybeSingle();
        return json({ ok: false, error: any ? (any.status === "redeemed" ? "This code was already used." : "This code isn't valid for redemption.") : "Code not found." }, 409);
      }
      const { data: red } = await admin.from("redemptions").select("expires_at").eq("id", row.redemption_id).maybeSingle();
      if (red?.expires_at && Date.now() > Date.parse(red.expires_at)) {
        await admin.from("partner_codes").update({ status: "assigned", redeemed_at: null, redeemed_by: null }).eq("code", code);
        return json({ ok: false, error: "This code has expired." }, 409);
      }
      await admin.from("redemptions").update({ redeemed_at: new Date().toISOString(), status: "redeemed" }).eq("id", row.redemption_id);
      await audit(admin, user.id, "validate_partner_code", "partner_code", code);
      return json({ ok: true, reward_code: row.reward_code });
    }

    if (action === "save_event" || action === "save_campaign") {
      const isEvent = action === "save_event";
      const table = isEvent ? "quest_events" : "campaigns";
      const patch = pick(body?.data ?? {}, isEvent ? EVENT_FIELDS : CAMPAIGN_FIELDS);
      const key = isEvent ? "id" : "code";
      const id = body?.[key] ? String(body[key]) : null;
      if (id) {
        const { data: row } = await admin.from(table).select("created_by").eq(key, id).maybeSingle();
        if (!row || (!isAdm && row.created_by !== user.id)) return json({ error: "Not allowed" }, 403);
        const { error } = await admin.from(table).update(patch).eq(key, id);
        if (error) return json({ error: error.message }, 400);
      } else {
        const code = String(body?.new_code ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 60);
        if (!code) return json({ error: "Code required" }, 400);
        const { error } = await admin.from(table).insert({ ...patch, code, created_by: user.id, name: patch.name ?? code });
        if (error) return json({ error: error.code === "23505" ? "That code is already used." : error.message }, 400);
      }
      await audit(admin, user.id, action, table, id ?? String(body?.new_code), null, patch);
      return json({ ok: true });
    }

    if (action === "adjust") {
      if (adminOnly()) return adminOnly()!;
      let target = String(body?.user_id ?? "");
      if (!target && body?.email) {
        const { data: p } = await admin.from("profiles").select("id").ilike("email", String(body.email).trim()).maybeSingle();
        target = p?.id ?? "";
      }
      if (!target) return json({ error: "Visitor not found." }, 404);
      const { data, error } = await admin.rpc("admin_adjust", { _actor: user.id, _user: target, _amount: Math.round(Number(body?.amount)), _reason: reason, _key: String(body?.idempotency_key ?? "") });
      if (error) throw error;
      return json(data, (data as { ok: boolean }).ok ? 200 : 400);
    }

    if (action === "refund") {
      if (adminOnly()) return adminOnly()!;
      const { data, error } = await admin.rpc("refund_redemption", { _actor: user.id, _redemption: String(body?.redemption_id ?? ""), _reason: reason });
      if (error) throw error;
      return json(data, (data as { ok: boolean }).ok ? 200 : 400);
    }

    if (action === "lookup_redemptions") {
      if (adminOnly()) return adminOnly()!;
      const { data: p } = await admin.from("profiles").select("id").ilike("email", String(body?.email ?? "").trim()).maybeSingle();
      if (!p) return json({ error: "Visitor not found." }, 404);
      const { data } = await admin.from("redemptions").select("id,reward_code,quest_spent,status,created_at,refunded_at,redeemed_at").eq("user_id", p.id).order("created_at", { ascending: false });
      return json({ user_id: p.id, redemptions: data });
    }

    if (action === "review_contribution") {
      if (adminOnly()) return adminOnly()!;
      const id = String(body?.id ?? "");
      const approve = body?.approve === true;
      const { data: reqRow } = await admin.from("marker_requests").select("*").eq("id", id).maybeSingle();
      if (!reqRow) return json({ error: "Not found" }, 404);
      await admin.from("marker_requests").update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
      let award = null;
      if (approve && reqRow.submitted_by) {
        award = await awardByRule(admin, { userId: reqRow.submitted_by, ruleCode: "contribution", sourceType: "marker_request", sourceId: id, title: `Contribution approved: ${reqRow.location_name}` });
      }
      await audit(admin, user.id, approve ? "approve_contribution" : "reject_contribution", "marker_request", id, reason || null);
      return json({ ok: true, awarded: award?.awarded ?? false, note: approve && !reqRow.submitted_by ? "Submitted without an account, so no coins were paid." : null });
    }

    if (action === "confirm_attendance") {
      const { data: ev } = await admin.from("quest_events").select("*").eq("id", String(body?.id ?? "")).maybeSingle();
      if (!ev || (!isAdm && ev.created_by !== user.id)) return json({ error: "Not found" }, 404);
      const { data: p } = await admin.from("profiles").select("id").ilike("email", String(body?.email ?? "").trim()).maybeSingle();
      if (!p) return json({ error: "Visitor not found." }, 404);
      const r = await awardByRule(admin, { userId: p.id, ruleCode: "event_quest", sourceType: "event", sourceId: ev.id, title: `Event: ${ev.name}`, amount: ev.amount, campaignCode: ev.campaign_code });
      await audit(admin, user.id, "confirm_attendance", "quest_event", ev.id, null, { visitor: p.id, awarded: r.awarded });
      return json({ ...r, event: undefined });
    }

    if (action === "resolve_flag") {
      if (adminOnly()) return adminOnly()!;
      await admin.from("review_flags").update({ status: "resolved" }).eq("id", String(body?.id ?? ""));
      await audit(admin, user.id, "resolve_flag", "review_flag", String(body?.id ?? ""), reason || null);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("quest-admin error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
