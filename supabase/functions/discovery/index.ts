// Discovery reveals, digital markers and collectible postcards.
// Everything that decides eligibility or grants something happens here, on the server.
import { adminClient, awardByRule, corsHeaders, getBalance, isAdmin, json, requireUser } from "../_shared/quest.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type Admin = SupabaseClient;
const SIGN_TTL = 60 * 60 * 6;

interface MarkerRow {
  slug: string; name: string; city: string; lat: number; lng: number; published: boolean;
  created_by: string | null; marker_type: string; discovery_visibility: string; reveal_style: string;
  sensitivity: string; arrival_radius_m: number; available_from: string | null; available_until: string | null;
  availability_tz: string; clue: string | null; review_status: string;
}
const MARKER_COLS =
  "slug,name,city,lat,lng,published,created_by,marker_type,discovery_visibility,reveal_style,sensitivity,arrival_radius_m,available_from,available_until,availability_tz,clue,review_status";

async function getMarker(admin: Admin, slug: string) {
  const { data } = await admin.from("markers").select(MARKER_COLS).eq("slug", slug).maybeSingle();
  return data as MarkerRow | null;
}

function availability(m: MarkerRow): "upcoming" | "active" | "ended" {
  const now = Date.now();
  if (m.available_from && Date.parse(m.available_from) > now) return "upcoming";
  if (m.available_until && Date.parse(m.available_until) < now) return "ended";
  return "active";
}

async function canManage(admin: Admin, userId: string, slug: string) {
  if (await isAdmin(admin, userId)) return true;
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "creator").maybeSingle();
  if (!role) return false;
  const { data } = await admin.from("markers").select("created_by").eq("slug", slug).maybeSingle();
  return data?.created_by === userId;
}

async function sign(admin: Admin, path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await admin.storage.from("postcard-art").createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl ?? null;
}

/** Which prerequisites the user still lacks, as readable labels. */
async function missingPrereqs(admin: Admin, userId: string | null, slug: string) {
  const { data: reqs } = await admin.from("discovery_prerequisites").select("requires_type,requires_id").eq("marker_slug", slug);
  if (!reqs?.length) return [] as string[];
  const missing: string[] = [];
  for (const r of reqs) {
    let met = false;
    if (userId) {
      if (r.requires_type === "marker") {
        const [{ data: c }, { data: v }] = await Promise.all([
          admin.from("discovery_claims").select("id").eq("user_id", userId).eq("marker_slug", r.requires_id).maybeSingle(),
          admin.from("marker_visits").select("id").eq("user_id", userId).eq("marker_id", r.requires_id).maybeSingle(),
        ]);
        met = Boolean(c || v);
      } else {
        const { data: s } = await admin.from("trail_sessions").select("id").eq("user_id", userId).eq("trail_id", r.requires_id).eq("status", "completed").limit(1);
        met = Boolean(s?.length);
      }
    }
    if (!met) {
      if (r.requires_type === "marker") {
        const { data: m } = await admin.from("markers").select("name").eq("slug", r.requires_id).maybeSingle();
        missing.push(`Discover ${m?.name ?? r.requires_id}`);
      } else {
        const { data: t } = await admin.from("trails").select("title").eq("id", r.requires_id).maybeSingle();
        missing.push(`Complete the ${t?.title ?? "required"} trail`);
      }
    }
  }
  return missing;
}

async function getContent(admin: Admin, slug: string) {
  const { data } = await admin.from("discovery_content").select("*").eq("marker_slug", slug).maybeSingle();
  return data as Record<string, any> | null;
}

async function getPostcard(admin: Admin, slug: string) {
  const { data } = await admin.from("postcards").select("*").eq("marker_slug", slug).maybeSingle();
  return data as Record<string, any> | null;
}

/** Unlockable content, only ever returned after eligibility is proven (or to managers in preview). */
async function revealPayload(admin: Admin, m: MarkerRow, content: Record<string, any>) {
  const pc = await getPostcard(admin, m.slug);
  const gallery = Array.isArray(content.gallery) ? content.gallery : [];
  return {
    bonus_story: content.bonus_story ?? null,
    reflection_prompt: content.reflection_prompt ?? null,
    audio_url: await sign(admin, content.audio_path),
    gallery: await Promise.all(gallery.map(async (g: any) => ({ url: await sign(admin, g?.path), alt: String(g?.alt ?? ""), credit: String(g?.credit ?? "") }))),
    postcard: pc
      ? {
          id: pc.id, title: pc.title, location: pc.location, front_url: await sign(admin, pc.front_path),
          front_alt: pc.front_alt, back_text: pc.back_text, credits: pc.credits, sources: pc.sources,
          commemorative: pc.commemorative, marker_slug: m.slug,
        }
      : null,
  };
}

/** Grant everything a verified claim earns. Every step is idempotent via unique constraints. */
async function grant(admin: Admin, userId: string, m: MarkerRow, content: Record<string, any>) {
  const pc = await getPostcard(admin, m.slug);
  let postcardNew = false;
  if (pc) {
    const { error } = await admin.from("user_postcards").insert({ user_id: userId, postcard_id: pc.id });
    if (!error) postcardNew = true;
    else if (error.code !== "23505") throw error;
  }
  let quest = 0;
  let badge: string | null = null;
  // Plaque visits already earn the marker_visit award via the scanner; digital markers earn here.
  if (content.reward_kind === "quest" && (m.marker_type === "digital" || Number(content.reward_quest) > 0)) {
    const campaign = content.reward_scope === "campaign" && content.campaign_code ? String(content.campaign_code) : null;
    const r = await awardByRule(admin, {
      userId, ruleCode: m.marker_type === "digital" ? "digital_discovery" : "marker_visit",
      sourceType: campaign ? "campaign" : "discovery",
      sourceId: campaign ? `campaign:${campaign}` : m.slug,
      amount: Number(content.reward_quest) > 0 ? Math.min(Number(content.reward_quest), 1000) : null,
      campaignCode: campaign,
      title: `Discovery: ${m.name}`,
      metadata: { marker: m.slug, sensitive: m.sensitivity === "sensitive" },
    });
    quest = r.amount;
  }
  if (content.reward_kind === "badge" && content.reward_badge_code) {
    const { error } = await admin.from("user_achievements").insert({ user_id: userId, achievement_code: content.reward_badge_code });
    if (!error) badge = content.reward_badge_code;
  }
  return { postcard_new: postcardNew, quest, badge };
}

/** Shared eligibility gate for anything that grants or reveals. */
async function eligible(admin: Admin, userId: string | null, slug: string) {
  const m = await getMarker(admin, slug);
  if (!m || !m.published) return { error: "This discovery isn't available.", status: 404 } as const;
  const content = await getContent(admin, slug);
  if (!content?.enabled || m.review_status !== "approved") return { error: "There's no discovery at this marker yet.", status: 404 } as const;
  const state = availability(m);
  if (state === "upcoming") return { error: "This discovery hasn't opened yet.", status: 409 } as const;
  if (state === "ended") return { error: "This discovery has ended.", status: 409 } as const;
  const missing = await missingPrereqs(admin, userId, slug);
  if (missing.length) return { error: `Locked: ${missing.join(", ")}.`, status: 409, missing } as const;
  return { m, content } as const;
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Check a GPS reading against a digital marker. The reading itself is never stored. */
function checkArrival(m: MarkerRow, lat: number, lng: number, accuracy: number) {
  if (m.marker_type !== "digital") return { ok: false, error: "This marker has a physical plaque. Scan its QR code instead." };
  if (![lat, lng, accuracy].every(Number.isFinite)) return { ok: false, error: "We couldn't read your location." };
  const radius = Math.max(15, Math.min(m.arrival_radius_m || 75, 1000));
  const maxAccuracy = Math.max(radius, 30);
  if (accuracy > maxAccuracy) {
    return { ok: false, error: `Your GPS is only accurate to about ${Math.round(accuracy)} m. Step away from tall buildings or wait a few seconds, then try again.` };
  }
  const d = haversine({ lat, lng }, m);
  if (d > radius) return { ok: false, error: `You're about ${Math.round(d)} m away. Get within ${radius} m to discover it.`, distance: Math.round(d) };
  return { ok: true };
}

async function publicStatus(admin: Admin, userId: string | null, slug: string) {
  const m = await getMarker(admin, slug);
  if (!m) return null;
  const content = await getContent(admin, slug);
  const enabled = Boolean(content?.enabled && m.review_status === "approved");
  const pc = enabled ? await getPostcard(admin, slug) : null;
  let claimed = false;
  if (userId) {
    const { data } = await admin.from("discovery_claims").select("id").eq("user_id", userId).eq("marker_slug", slug).maybeSingle();
    claimed = Boolean(data);
  }
  const missing = enabled ? await missingPrereqs(admin, userId, slug) : [];
  return {
    marker_slug: slug, marker_type: m.marker_type, visibility: m.discovery_visibility,
    reveal_style: m.sensitivity === "sensitive" && m.reveal_style !== "none" ? "quiet_fade" : m.reveal_style,
    sensitivity: m.sensitivity, arrival_radius_m: m.arrival_radius_m, clue: m.clue,
    availability: availability(m), available_from: m.available_from, available_until: m.available_until, availability_tz: m.availability_tz,
    has_discovery: enabled, has_postcard: Boolean(pc),
    reward_kind: enabled ? content?.reward_kind : "none",
    reward_quest: enabled && content?.reward_kind === "quest" ? content?.reward_quest : 0,
    missing, claimed,
    content: claimed && enabled ? await revealPayload(admin, m, content!) : null,
  };
}

// ---------------- publishing validation ----------------
function findCycle(edges: Map<string, string[]>, start: string): string[] | null {
  const stack: string[] = [];
  const seen = new Set<string>();
  const dfs = (n: string): string[] | null => {
    if (stack.includes(n)) return [...stack.slice(stack.indexOf(n)), n];
    if (seen.has(n)) return null;
    seen.add(n); stack.push(n);
    for (const next of edges.get(n) ?? []) { const c = dfs(next); if (c) return c; }
    stack.pop();
    return null;
  };
  return dfs(start);
}

async function validate(admin: Admin, slug: string, prereqs: { requires_type: string; requires_id: string }[]) {
  const errors: string[] = [];
  const m = await getMarker(admin, slug);
  if (!m) return ["Save the marker first."];
  const content = await getContent(admin, slug);
  const pc = await getPostcard(admin, slug);
  if (!Number.isFinite(m.lat) || !Number.isFinite(m.lng) || (m.lat === 0 && m.lng === 0)) errors.push("The marker needs real coordinates.");
  if (m.review_status !== "approved") errors.push("Content is marked Needs review. Approve it before publishing.");
  if (m.available_from && m.available_until && Date.parse(m.available_until) <= Date.parse(m.available_from)) errors.push("The end date must be after the start date.");
  if (m.discovery_visibility === "mystery" && !m.clue?.trim()) errors.push("Mystery discoveries need a clue.");
  if (m.discovery_visibility === "unlisted" && !prereqs.length) errors.push("Unlisted discoveries need at least one requirement that reveals them.");
  if (m.marker_type === "digital" && (!m.arrival_radius_m || m.arrival_radius_m < 15 || m.arrival_radius_m > 1000)) errors.push("Arrival radius must be between 15 and 1000 m.");
  if (!content) errors.push("Save the discovery settings first.");
  else {
    const hasSomething = Boolean(pc || content.bonus_story?.trim() || content.audio_path || (content.gallery ?? []).length);
    if (!hasSomething) errors.push("Add at least one thing to unlock: a postcard, bonus story, images or audio.");
    if (content.reward_kind === "postcard" && !pc) errors.push("The reward is a postcard, but no postcard is set up.");
    if (content.reward_kind === "quest" && !(content.reward_quest > 0 && content.reward_quest <= 1000)) errors.push("QUEST reward must be between 1 and 1000.");
    if (content.reward_kind === "badge") {
      const { data } = content.reward_badge_code ? await admin.from("achievements").select("code").eq("code", content.reward_badge_code).maybeSingle() : { data: null };
      if (!data) errors.push("Pick an existing badge.");
    }
    if (content.reward_scope === "campaign" && !content.campaign_code?.trim()) errors.push("Campaign rewards need a campaign code.");
  }
  if (pc) {
    if (!pc.front_path) errors.push("The postcard needs front artwork.");
    if (!pc.front_alt?.trim()) errors.push("The postcard artwork needs alt text.");
    if (!pc.back_text?.trim()) errors.push("The postcard needs a short description on the back.");
  }
  for (const p of prereqs) {
    if (p.requires_type === "marker" && p.requires_id === slug) errors.push("A marker can't require itself.");
  }
  // Circular requirement detection across all marker prerequisites.
  const { data: all } = await admin.from("discovery_prerequisites").select("marker_slug,requires_id").eq("requires_type", "marker");
  const edges = new Map<string, string[]>();
  for (const r of all ?? []) if (r.marker_slug !== slug) edges.set(r.marker_slug, [...(edges.get(r.marker_slug) ?? []), r.requires_id]);
  edges.set(slug, prereqs.filter((p) => p.requires_type === "marker").map((p) => p.requires_id));
  const cycle = findCycle(edges, slug);
  if (cycle) {
    const names = await Promise.all(cycle.map(async (s) => (await getMarker(admin, s))?.name ?? s));
    errors.push(`Circular requirement: ${names.join(" → ")}. Remove one of these links.`);
  }
  return errors;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const slug = String(body?.marker_slug ?? "").slice(0, 120);

    if (action === "status") {
      if (!slug) return json({ error: "marker_slug required" }, 400);
      const s = await publicStatus(admin, user?.id ?? null, slug);
      return s ? json(s) : json({ error: "Not found" }, 404);
    }

    // Unlisted markers this visitor has unlocked (they're hidden from the public list).
    if (action === "unlocked_markers") {
      if (!user) return json({ markers: [] });
      const { data } = await admin.from("markers").select("*").eq("published", true).eq("discovery_visibility", "unlisted");
      const out = [];
      for (const row of data ?? []) if (!(await missingPrereqs(admin, user.id, row.slug)).length) out.push(row);
      return json({ markers: out });
    }

    if (action === "verify_qr" || action === "verify_arrival") {
      if (!slug) return json({ error: "marker_slug required" }, 400);
      const e = await eligible(admin, user?.id ?? null, slug);
      if ("error" in e) return json({ error: e.error, missing: (e as any).missing ?? [] }, e.status);
      const { m, content } = e;
      let method: "qr" | "gps";
      if (action === "verify_qr") {
        if (m.marker_type === "digital") return json({ error: "This is a digital discovery. Use Discover here at the location." }, 400);
        method = "qr";
        if (user) {
          // The in-app scanner's one-time token is consumed by award-quest moments earlier.
          const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
          const token = body?.scan_token ? String(body.scan_token) : null;
          let q = admin.from("scan_tokens").select("token, consumed_at").eq("user_id", user.id).eq("marker_id", slug);
          q = token ? q.eq("token", token) : q.gte("consumed_at", since);
          const { data: scans } = await q.limit(1);
          const scan = scans?.[0];
          if (!scan) return json({ error: "Scan could not be verified. Use the MarkerQuest scanner at the plaque." }, 403);
          if (!scan.consumed_at) await admin.from("scan_tokens").update({ consumed_at: new Date().toISOString() }).eq("token", scan.token);
        }
      } else {
        method = "gps";
        const r = checkArrival(m, Number(body?.lat), Number(body?.lng), Number(body?.accuracy));
        if (!r.ok) return json({ error: r.error, retry: true, distance: (r as any).distance ?? null }, 422);
      }

      if (!user) {
        // Guest: keep a server-side pending claim they can save after signing in.
        const secret = crypto.randomUUID();
        const { error } = await admin.from("discovery_claims").insert({
          user_id: null, marker_slug: slug, method, status: "pending", guest_secret: secret,
          expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
        });
        if (error) throw error;
        return json({ verified: true, pending: true, guest_secret: secret, reveal: await revealPayload(admin, m, content), sensitivity: m.sensitivity });
      }

      const { error: claimErr } = await admin.from("discovery_claims").insert({ user_id: user.id, marker_slug: slug, method, status: "claimed", claimed_at: new Date().toISOString() });
      const repeat = claimErr?.code === "23505";
      if (claimErr && !repeat) throw claimErr;
      const granted = await grant(admin, user.id, m, content);
      return json({
        verified: true, repeat, ...granted, sensitivity: m.sensitivity,
        reveal: await revealPayload(admin, m, content),
        balance: granted.quest ? await getBalance(admin, user.id) : undefined,
      });
    }

    if (action === "claim_pending") {
      if (!user) return json({ error: "Not authenticated" }, 401);
      const secrets = (Array.isArray(body?.secrets) ? body.secrets : []).map(String).slice(0, 50);
      const results = [];
      for (const secret of secrets) {
        const { data: c } = await admin.from("discovery_claims").select("*").eq("guest_secret", secret).eq("status", "pending").maybeSingle();
        if (!c || (c.expires_at && Date.parse(c.expires_at) < Date.now())) { results.push({ secret, ok: false }); continue; }
        const e = await eligible(admin, user.id, c.marker_slug);
        if ("error" in e) { results.push({ secret, ok: false, error: e.error }); continue; }
        const { error: insErr } = await admin.from("discovery_claims").insert({ user_id: user.id, marker_slug: c.marker_slug, method: c.method, status: "claimed", claimed_at: new Date().toISOString() });
        if (insErr && insErr.code !== "23505") throw insErr;
        await admin.from("discovery_claims").delete().eq("id", c.id);
        const granted = await grant(admin, user.id, e.m, e.content);
        results.push({ secret, ok: true, marker_slug: c.marker_slug, ...granted });
      }
      return json({ results });
    }

    if (action === "catalog") {
      const [{ data: cards }, { data: sets }] = await Promise.all([
        admin.from("postcards").select("id,marker_slug,set_code,title,location,front_path,front_alt,back_text,credits,sources,secret_title,commemorative"),
        admin.from("postcard_sets").select("code,name,city,trail_id"),
      ]);
      const slugs = (cards ?? []).map((c) => c.marker_slug);
      const { data: ms } = slugs.length
        ? await admin.from("markers").select("slug,name,city,published,review_status,discovery_visibility").in("slug", slugs)
        : { data: [] as any[] };
      const { data: contents } = slugs.length ? await admin.from("discovery_content").select("marker_slug,enabled").in("marker_slug", slugs) : { data: [] as any[] };
      const live = new Set((contents ?? []).filter((c) => c.enabled).map((c) => c.marker_slug));
      const byMarker = new Map((ms ?? []).map((m) => [m.slug, m]));
      const owned = new Map<string, string>();
      if (user) {
        const { data } = await admin.from("user_postcards").select("postcard_id,collected_at").eq("user_id", user.id);
        for (const o of data ?? []) owned.set(o.postcard_id, o.collected_at);
      }
      const out = [];
      for (const c of cards ?? []) {
        const mk = byMarker.get(c.marker_slug);
        const collected = owned.has(c.id);
        if (!collected && (!mk?.published || mk.review_status !== "approved" || !live.has(c.marker_slug))) continue;
        const hidden = !collected && (c.secret_title || mk?.discovery_visibility !== "visible");
        out.push(collected
          ? { id: c.id, collected: true, collected_at: owned.get(c.id), marker_slug: c.marker_slug, city: mk?.city ?? null, set_code: c.set_code,
              title: c.title, location: c.location, front_url: await sign(admin, c.front_path), front_alt: c.front_alt,
              back_text: c.back_text, credits: c.credits, sources: c.sources, commemorative: c.commemorative }
          : { id: c.id, collected: false, marker_slug: hidden ? null : c.marker_slug, city: mk?.city ?? null, set_code: c.set_code,
              title: hidden ? "Undiscovered postcard" : c.title, location: hidden ? "" : c.location });
      }
      return json({ postcards: out, sets: sets ?? [] });
    }

    // ---- Managers only below ----
    if (!user) return json({ error: "Not authenticated" }, 401);
    if (!slug || !(await canManage(admin, user.id, slug))) return json({ error: "You can't manage this marker." }, 403);

    if (action === "preview") {
      // Never writes a claim, check-in or reward.
      const m = await getMarker(admin, slug);
      const content = await getContent(admin, slug);
      if (!m || !content) return json({ error: "Save the discovery settings first." }, 400);
      return json({ preview: true, status: await publicStatus(admin, null, slug), reveal: await revealPayload(admin, m, content), sensitivity: m.sensitivity });
    }

    if (action === "validate") {
      const prereqs = Array.isArray(body?.prereqs) ? body.prereqs.slice(0, 20).map((p: any) => ({ requires_type: String(p.requires_type), requires_id: String(p.requires_id) })) : [];
      const errors = await validate(admin, slug, prereqs);
      return json({ ok: errors.length === 0, errors });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("discovery error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
