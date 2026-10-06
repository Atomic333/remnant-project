import { unzipSync } from "npm:fflate@0.8.2";
import { adminClient, awardByRule, corsHeaders, getBalance, json, requireUser } from "../_shared/quest.ts";
import { generateFor, type SourceInput } from "./generate.ts";

/**
 * H5P activities: upload/unpack (managers), serve unpacked files, start attempts
 * and verify completions before paying Quest Coins through awardByRule.
 */
const BUCKET = "h5p-content";
const MAX_BYTES = 50 * 1024 * 1024;
const TYPES: Record<string, string> = {
  json: "application/json", js: "application/javascript", css: "text/css",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
  mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg",
  mp4: "video/mp4", webm: "video/webm", vtt: "text/vtt", txt: "text/plain",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", eot: "application/vnd.ms-fontobject", otf: "font/otf",
};
const ext = (p: string) => p.split(".").pop()?.toLowerCase() ?? "";
const UUID = /^[0-9a-f-]{36}$/i;

async function canManage(admin: ReturnType<typeof adminClient>, userId: string, slug: string) {
  const { data } = await admin.rpc("can_manage_marker", { _user_id: userId, _slug: slug });
  return Boolean(data);
}

async function serveFile(url: URL) {
  // /h5p/file/<activityId>/<path...>
  const parts = url.pathname.split("/file/")[1]?.split("/") ?? [];
  const id = parts.shift() ?? "";
  const path = parts.map(decodeURIComponent).join("/");
  if (!UUID.test(id) || !path || path.includes("..") || !TYPES[ext(path)]) {
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
  const admin = adminClient();
  const { data: act } = await admin.from("h5p_activities").select("storage_prefix").eq("id", id).maybeSingle();
  if (!act) return new Response("Not found", { status: 404, headers: corsHeaders });
  const { data, error } = await admin.storage.from(BUCKET).download(`${act.storage_prefix}/${path}`);
  if (error || !data) return new Response("Not found", { status: 404, headers: corsHeaders });
  return new Response(data, {
    headers: {
      ...corsHeaders,
      "Content-Type": TYPES[ext(path)],
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function upload(req: Request) {
  const user = await requireUser(req);
  if (!user) return json({ error: "Sign in first." }, 401);
  const admin = adminClient();
  const form = await req.formData();
  const file = form.get("file");
  const slug = String(form.get("marker_slug") ?? "").slice(0, 120);
  let title = String(form.get("title") ?? "").trim().slice(0, 120);
  if (!(file instanceof File) || !slug) return json({ error: "Choose an .h5p file." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "That file is over 50MB." }, 400);
  if (!(await canManage(admin, user.id, slug))) return json({ error: "You can't manage this marker." }, 403);

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    return json({ error: "That isn't a valid .h5p file." }, 400);
  }
  if (!files["h5p.json"]) return json({ error: "This package is missing h5p.json." }, 400);
  let meta: { title?: string; mainLibrary?: string };
  try { meta = JSON.parse(new TextDecoder().decode(files["h5p.json"])); } catch { return json({ error: "h5p.json is unreadable." }, 400); }
  if (!meta.mainLibrary) return json({ error: "This package has no main library." }, 400);
  if (!files["content/content.json"]) return json({ error: "This package has no content." }, 400);
  if (!title) title = String(meta.title ?? "Activity").slice(0, 120);

  const id = crypto.randomUUID();
  const prefix = `${slug}/${id}`;
  const entries = Object.entries(files).filter(([p, b]) => !p.endsWith("/") && b.length && !p.includes("..") && TYPES[ext(p)]);
  for (let i = 0; i < entries.length; i += 12) {
    await Promise.all(entries.slice(i, i + 12).map(async ([p, b]) => {
      const { error } = await admin.storage.from(BUCKET).upload(`${prefix}/${p}`, b, { contentType: TYPES[ext(p)], upsert: true });
      if (error) throw error;
    }));
  }
  const { count } = await admin.from("h5p_activities").select("id", { count: "exact", head: true }).eq("marker_slug", slug);
  const { data, error } = await admin.from("h5p_activities").insert({
    id, marker_slug: slug, title, library: meta.mainLibrary, storage_prefix: prefix,
    position: count ?? 0, created_by: user.id,
  }).select("*").single();
  if (error) throw error;
  return json({ activity: data, skipped: Object.keys(files).length - entries.length });
}

/** Admin-only: build grounded activities for one marker from its own text. */
async function generate(req: Request, body: Record<string, unknown>) {
  const user = await requireUser(req);
  if (!user) return json({ error: "Sign in first." }, 401);
  const admin = adminClient();
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Only admins can generate activities." }, 403);
  const slug = String(body?.slug ?? "").slice(0, 120);
  if (!slug) return json({ error: "slug required" }, 400);

  let src: SourceInput | null = null;
  const { data: story } = await admin.from("collection_markers")
    .select("marker_id, title, summary, story, why_it_matters, period, sensitive, status").eq("marker_id", slug).maybeSingle();
  if (story) {
    if (story.status !== "published") return json({ error: "Only published stories get activities." }, 409);
    const { data: srcs } = await admin.from("collection_sources").select("title").eq("marker_id", slug).order("position").limit(3);
    const text = [story.summary, story.story, story.why_it_matters, story.period ? `Period: ${story.period}` : ""].filter(Boolean).join("\n\n");
    src = { slug, title: story.title, text, sensitive: story.sensitive,
      credits: srcs?.length ? `Based on: ${srcs.map((s) => s.title).join("; ")}.` : "Based on this story's research sources." };
  } else {
    const title = String(body?.title ?? "").trim().slice(0, 160);
    const text = String(body?.text ?? "").trim().slice(0, 12000);
    if (!title || text.length < 80) return json({ error: "Marker text is too short." }, 400);
    const { data: row } = await admin.from("markers").select("sensitivity").eq("slug", slug).maybeSingle();
    const sources = Array.isArray(body?.sources) ? (body.sources as unknown[]).map(String).slice(0, 3) : [];
    src = { slug, title, text, sensitive: Boolean(body?.sensitive) || (row?.sensitivity && row.sensitivity !== "standard") || false,
      credits: sources.length ? `Based on: ${sources.join("; ")}.` : "Based on this marker's plaque and sources." };
  }
  try {
    return json(await generateFor(admin, user.id, src));
  } catch (e) {
    const status = (e as { status?: number }).status;
    return json({ error: e instanceof Error ? e.message : "Generation failed." }, status === 402 || status === 429 ? status : 502);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  try {
    if (req.method === "GET" && url.pathname.includes("/file/")) return await serveFile(url);
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) return await upload(req);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    if (action === "generate") return await generate(req, body);
    const activityId = String(body?.activity_id ?? "");
    if (!UUID.test(activityId)) return json({ error: "activity_id required" }, 400);
    const admin = adminClient();
    const { data: act } = await admin.from("h5p_activities").select("*").eq("id", activityId).maybeSingle();
    if (!act) return json({ error: "Activity not found." }, 404);

    if (action === "delete") {
      const user = await requireUser(req);
      if (!user || !(await canManage(admin, user.id, act.marker_slug))) return json({ error: "Not allowed." }, 403);
      // Remove unpacked files (walk folders), then the row.
      const walk = async (dir: string): Promise<string[]> => {
        const { data } = await admin.storage.from(BUCKET).list(dir, { limit: 1000 });
        const out: string[] = [];
        for (const f of data ?? []) {
          if (f.id) out.push(`${dir}/${f.name}`); else out.push(...await walk(`${dir}/${f.name}`));
        }
        return out;
      };
      const paths = await walk(act.storage_prefix);
      for (let i = 0; i < paths.length; i += 100) await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
      await admin.from("h5p_activities").delete().eq("id", act.id);
      return json({ ok: true });
    }

    const user = await requireUser(req);

    if (action === "start") {
      if (!act.published && !(user && await canManage(admin, user.id, act.marker_slug))) return json({ error: "Activity not found." }, 404);
      if (!user) return json({ attempt_id: null, earnable: false });
      const { data: paid } = await admin.from("reward_events").select("id")
        .eq("award_key", `h5p_activity:${user.id}:${act.id}`).maybeSingle();
      if (paid) return json({ attempt_id: null, earnable: false, collected: true });
      const { data: att, error } = await admin.from("h5p_attempts").insert({ user_id: user.id, activity_id: act.id }).select("id").single();
      if (error) throw error;
      return json({ attempt_id: att.id, earnable: act.reward_amount > 0, min_seconds: act.min_seconds });
    }

    if (action === "complete") {
      if (!user) return json({ error: "Sign in to earn Quest Coins." }, 401);
      const attemptId = String(body?.attempt_id ?? "");
      if (!UUID.test(attemptId)) return json({ error: "attempt_id required" }, 400);
      if (!act.published) return json({ error: "This activity isn't available." }, 409);
      const { data: att } = await admin.from("h5p_attempts").select("*").eq("id", attemptId).maybeSingle();
      if (!att || att.user_id !== user.id || att.activity_id !== act.id) return json({ error: "This attempt isn't yours." }, 403);
      if (att.completed_at) return json({ awarded: false, amount: 0, title: "Already collected", reason: "Already collected" });
      if (Date.now() > Date.parse(att.expires_at)) return json({ error: "This attempt expired. Open the activity again." }, 409);
      const elapsed = (Date.now() - Date.parse(att.started_at)) / 1000;
      if (elapsed < act.min_seconds) {
        if (elapsed < 3) await admin.from("review_flags").insert({ user_id: user.id, kind: "h5p_fast_complete", details: { activity: act.id, elapsed } });
        return json({ error: "Take a little more time with this activity before finishing." }, 409);
      }
      // Mark the attempt used first (only one caller wins).
      const raw = body?.result && typeof body.result === "object" ? body.result : null;
      const { data: claimed } = await admin.from("h5p_attempts")
        .update({ completed_at: new Date().toISOString(), raw_result: raw ? JSON.parse(JSON.stringify(raw).slice(0, 4000)) : null })
        .eq("id", att.id).is("completed_at", null).select("id").maybeSingle();
      if (!claimed) return json({ awarded: false, amount: 0, title: "Already collected", reason: "Already collected" });
      const result = await awardByRule(admin, {
        userId: user.id, ruleCode: "h5p_activity", sourceType: "h5p_activity", sourceId: act.id,
        title: `Finished ${act.title}`, amount: act.reward_amount,
        metadata: { marker: act.marker_slug, seconds: Math.round(elapsed) },
      });
      return json({ ...result, balance: result.awarded ? await getBalance(admin, user.id) : undefined });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("h5p error:", e);
    return json({ error: "Something went wrong with this activity." }, 500);
  }
});
