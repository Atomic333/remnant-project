import * as XLSX from "xlsx";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";

/**
 * Washington collection importer. Reads cell VALUES only (formulas are never
 * evaluated), treats the HTML report as untrusted (sanitized, scripts dropped),
 * and builds a reviewable plan keyed by the original Marker ID.
 */

export const COLLECTION_CODE = "wa-black-indigenous";
export const COLLECTION_TITLE = "Washington: Stories That Shaped This Place";
export const REGIONS = [
  "South Sound & Southwest Washington",
  "Seattle & King County",
  "North Sound, Kitsap & Olympic Peninsula",
  "Eastern Washington",
] as const;

export type SheetKind = "research_markers" | "upload_markers" | "sources" | "images" | "blocked" | "summary";

/** App field -> expected column header. Editable in the mapping UI. */
export const DEFAULT_MAPPINGS: Record<Exclude<SheetKind, "summary">, Record<string, string>> = {
  research_markers: {
    marker_id: "Marker ID", title: "Title", history_focus: "History focus", community: "Community or nation",
    city_name: "City", county: "County", region_label: "Region (Western/Eastern)", address: "Location / address",
    coord_precision: "Coordinate precision", location_relationship: "Location relationship", period: "Historical period",
    summary: "Short summary (40–60 words)", story: "Marker story (150–250 words)", why_it_matters: "Why it matters",
    visitor_connection: "Visitor connection", access_notes: "Access notes (verified only)", review_status: "Review status",
    plaque_status: "Existing marker / plaque status", marker_type: "Marker type (proposed)", sensitive: "Sensitive site",
    category: "Category", tags: "Tags", featured_article: "Featured article",
    research_lat: "Latitude", research_lng: "Longitude",
  },
  upload_markers: {
    marker_id: "markerId", city_id: "cityId", title: "title", lat: "lat", lng: "lng", status: "status",
    sensitive: "sensitiveSite", quest_coins: "questCoins", reveal_animation: "revealAnimation", is_hidden: "isHidden",
    discovery_hint: "discoveryHint", postcard_title: "postcardTitle", image_url: "imageUrl", image_alt: "imageAlt",
    media_credit: "mediaCredit", visitor_instructions: "visitorInstructions", accessibility_notes: "accessibilityNotes",
  },
  sources: {
    marker_id: "Marker ID", title: "Source title", author: "Author / originating organization",
    publisher: "Publisher / collection", pub_date: "Publication date", url: "URL", access_date: "Access date",
    source_type: "Source type", archival_ref: "Archival identifier / page refs", supports: "What it supports",
    checked: "Opened and checked?",
  },
  images: {
    marker_id: "Marker ID", kind: "Image kind", title: "Image title", description: "Description",
    creator: "Creator / photographer", image_date: "Date", rights_holder: "Holding institution / rights holder",
    record_url: "Source record URL", image_url: "Direct image URL", license: "License / rights statement",
    attribution: "Required attribution", commercial: "Cleared for commercial reuse in MarkerQuest?",
    reuse_status: "Reuse status (filter)", caption: "Caption", alt: "Alt text", notes: "Notes",
  },
  blocked: {
    marker_id: "markerId", title: "title", missing: "Missing required fields", why: "Why blocked",
    review: "Research review status", image: "Cleared image attached?",
  },
};

export interface ParsedSheet {
  file: string;
  name: string;
  kind: SheetKind | null;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ParsedReport {
  file: string;
  regionByMarker: Record<string, string>;
  featured: string[];
  overview: string;
  scriptsRemoved: number;
}

const ID_RE = /^MQ-WA-[A-Z0-9]+$/;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const nul = (v: unknown) => { const s = str(v); return s && s.toLowerCase() !== "nan" ? s : null; };
const bool = (v: unknown) => /^(true|yes|1)$/i.test(str(v));
export const safeUrl = (v: unknown) => {
  const s = nul(v);
  if (!s) return null;
  try { const u = new URL(s); return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null; } catch { return null; }
};

function detectKind(name: string, headers: string[]): SheetKind | null {
  const h = new Set(headers);
  const n = name.toLowerCase();
  if (n.includes("summary")) return "summary";
  if (h.has("markerId") && h.has("Why blocked")) return "blocked";
  if (h.has("markerId") && h.has("cityId")) return "upload_markers";
  if (h.has("Source title")) return "sources";
  if (h.has("Direct image URL") || h.has("Image title")) return "images";
  if (h.has("Marker ID") && h.has("Marker story (150–250 words)")) return "research_markers";
  return null;
}

export async function parseWorkbook(file: File): Promise<ParsedSheet[]> {
  // cellFormula:false + raw values: formulas are never evaluated; we read cached values only.
  const wb = XLSX.read(await file.arrayBuffer(), { cellFormula: false, cellHTML: false, cellStyles: false });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
    const headers = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, range: 0 })[0] ?? []).map(str);
    return { file: file.name, name, kind: detectKind(name, headers), headers, rows };
  });
}

export async function parseReport(file: File): Promise<ParsedReport> {
  const raw = await file.text();
  const scriptsRemoved = (raw.match(/<script/gi) ?? []).length;
  const clean = DOMPurify.sanitize(raw, { WHOLE_DOCUMENT: true, FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link"] });
  const doc = new DOMParser().parseFromString(clean, "text/html");
  const regionByMarker: Record<string, string> = {};
  let region: string | null = null;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  doc.body.querySelectorAll("h2, [id]").forEach((el) => {
    if (el.tagName === "H2") {
      const t = norm(el.textContent ?? "");
      region = (REGIONS as readonly string[]).includes(t) ? t : null;
      return;
    }
    const id = el.getAttribute("id") ?? "";
    if (region && ID_RE.test(id) && !regionByMarker[id]) regionByMarker[id] = region;
  });
  const featured: string[] = [];
  const firstTen = [...doc.body.querySelectorAll("h2")].find((h) => norm(h.textContent ?? "") === "Recommended first ten");
  firstTen?.parentElement?.querySelectorAll("ol a[href^='#']").forEach((a) => {
    const id = (a.getAttribute("href") ?? "").slice(1);
    if (ID_RE.test(id) && !featured.includes(id)) featured.push(id);
  });
  const overviewH = [...doc.body.querySelectorAll("h2")].find((h) => norm(h.textContent ?? "") === "Research overview");
  const overview = norm(overviewH?.parentElement?.textContent ?? "").replace(/^Research overview\s*/, "").slice(0, 3000);
  return { file: file.name, regionByMarker, featured, overview, scriptsRemoved };
}

// ---------------------------------------------------------------- plan

export interface Issue {
  issue_key: string;
  marker_id: string | null;
  kind: string;
  severity: "blocked" | "review" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface MarkerRec { [k: string]: unknown; marker_id: string; title: string }
export interface SourceRec { [k: string]: unknown; source_key: string; marker_id: string; title: string }
export interface ImageRec { [k: string]: unknown; image_key: string; marker_id: string }

export interface Plan {
  markers: MarkerRec[];
  sources: SourceRec[];
  images: ImageRec[];
  issues: Issue[];
  featured: string[];
  regions: string[];
  mappingNotes: string[];
  overview: string;
  files: string[];
}

function pick(row: Record<string, unknown>, map: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const [field, col] of Object.entries(map)) out[field] = row[col];
  return out;
}

async function hash(obj: unknown) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(obj)));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildPlan(
  sheets: ParsedSheet[],
  report: ParsedReport | null,
  mappings: typeof DEFAULT_MAPPINGS,
): Promise<Plan> {
  const of = (k: SheetKind) => sheets.filter((s) => s.kind === k).flatMap((s) => s.rows);
  const issues: Issue[] = [];
  const issue = (i: Omit<Issue, "issue_key"> & { ref?: string }) =>
    issues.push({ ...i, issue_key: `${COLLECTION_CODE}:${i.kind}:${i.marker_id ?? "-"}:${i.ref ?? ""}` });

  const research = new Map<string, Record<string, unknown>>();
  for (const row of of("research_markers")) {
    const r = pick(row, mappings.research_markers);
    const id = str(r.marker_id);
    if (!ID_RE.test(id)) { issue({ marker_id: id || null, kind: "invalid_id", severity: "error", message: `Skipped a marker row with an invalid Marker ID "${id}".`, ref: String(research.size) }); continue; }
    research.set(id, r);
  }
  const upload = new Map<string, Record<string, unknown>>();
  for (const row of of("upload_markers")) {
    const r = pick(row, mappings.upload_markers);
    const id = str(r.marker_id);
    if (ID_RE.test(id)) upload.set(id, r);
  }
  const mappingNotes: string[] = [];
  for (const row of of("blocked")) {
    const r = pick(row, mappings.blocked);
    const id = str(r.marker_id);
    if (ID_RE.test(id)) {
      if (nul(r.why)) issue({ marker_id: id, kind: "blocked", severity: "blocked", message: `Blocked in upload draft: ${str(r.why)}`, details: { missing: nul(r.missing) } });
    } else if (id) mappingNotes.push(id.slice(0, 1000));
  }

  const markers: MarkerRec[] = [];
  const ids = new Set([...research.keys(), ...upload.keys()]);
  for (const id of ids) {
    const r = research.get(id);
    const u = upload.get(id);
    if (!r) { issue({ marker_id: id, kind: "missing_research", severity: "error", message: "In the upload draft but not in the research workbook; not imported." }); continue; }
    const title = str(r.title);
    if (!title || !nul(r.story)) { issue({ marker_id: id, kind: "missing_content", severity: "error", message: "Missing title or story; not imported." }); continue; }
    if (u && nul(u.title) && str(u.title) !== title) {
      issue({ marker_id: id, kind: "conflict_title", severity: "review", message: "Title differs between the workbooks. The research title is shown until resolved.", details: { research: title, upload: str(u.title) } });
    }
    const rSens = bool(r.sensitive), uSens = u ? bool(u.sensitive) : rSens;
    if (u && rSens !== uSens) issue({ marker_id: id, kind: "conflict_sensitive", severity: "review", message: "Sensitive-site flag differs between the workbooks; treated as sensitive until resolved.", details: { research: rSens, upload: uSens } });

    // Coordinates come ONLY from the upload draft; research coordinates are never restored.
    const lat = u ? Number(nul(u.lat)) : NaN, lng = u ? Number(nul(u.lng)) : NaN;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && nul(u?.lat) !== null;
    const withheld = !hasCoords && nul(r.research_lat) !== null;
    if (!hasCoords) issue({ marker_id: id, kind: withheld ? "coords_withheld" : "coords_missing", severity: "review", message: withheld ? "Coordinates withheld in the upload draft; not shown on the map." : "No coordinates; not shown on the map." });
    const cityId = u ? nul(u.city_id) : null;
    if (!cityId) issue({ marker_id: id, kind: "missing_city", severity: "blocked", message: `No city assigned (research city: ${str(r.city_name) || "unknown"}).`, details: { city_name: nul(r.city_name) } });
    const review = str(r.review_status);
    if (/consult/i.test(review)) issue({ marker_id: id, kind: "consultation", severity: "review", message: review });
    else if (/needs verification/i.test(review)) issue({ marker_id: id, kind: "needs_verification", severity: "review", message: review });
    const region = report?.regionByMarker[id] ?? null;
    if (report && !region) issue({ marker_id: id, kind: "missing_region", severity: "review", message: "Not found in a regional section of the report." });

    const rec: MarkerRec = {
      marker_id: id, collection_code: COLLECTION_CODE, title,
      history_focus: nul(r.history_focus), community: nul(r.community), city_name: nul(r.city_name), county: nul(r.county),
      region_label: nul(r.region_label), region, address: nul(r.address),
      lat: hasCoords ? lat : null, lng: hasCoords ? lng : null, coord_withheld: withheld,
      coord_precision: nul(r.coord_precision), location_relationship: nul(r.location_relationship), period: nul(r.period),
      summary: nul(r.summary), story: nul(r.story), why_it_matters: nul(r.why_it_matters), visitor_connection: nul(r.visitor_connection),
      access_notes: nul(r.access_notes), review_status: nul(r.review_status), plaque_status: nul(r.plaque_status),
      narrative_kind: /transcription verified/i.test(str(r.plaque_status)) ? "plaque" : "research",
      marker_type: nul(r.marker_type), sensitive: rSens || uSens, category: nul(r.category),
      tags: str(r.tags).split(/[;,]/).map((t) => t.trim()).filter(Boolean),
      featured_article: nul(r.featured_article),
      draft_settings: u ? {
        questCoins: Number(nul(u.quest_coins)) || null, revealAnimation: nul(u.reveal_animation), isHidden: bool(u.is_hidden),
        discoveryHint: nul(u.discovery_hint), postcardTitle: nul(u.postcard_title), uploadStatus: nul(u.status),
        visitorInstructions: nul(u.visitor_instructions), accessibilityNotes: nul(u.accessibility_notes),
        primaryImageUrl: safeUrl(u.image_url),
      } : {},
      status: "draft",
    };
    if (cityId) rec.city_id = cityId;
    rec.import_hash = await hash(rec);
    markers.push(rec);
  }
  const known = new Set(markers.map((m) => m.marker_id));

  const sources: SourceRec[] = [];
  const seenS = new Set<string>();
  for (const row of of("sources")) {
    const r = pick(row, mappings.sources);
    const id = str(r.marker_id);
    if (!known.has(id)) { issue({ marker_id: id || null, kind: "orphan_source", severity: "error", message: `Source "${str(r.title).slice(0, 80)}" has no matching marker.`, ref: str(r.title).slice(0, 40) }); continue; }
    const url = safeUrl(r.url);
    if (nul(r.url) && !url) issue({ marker_id: id, kind: "bad_url", severity: "error", message: `Invalid source link removed: ${str(r.url).slice(0, 80)}`, ref: str(r.url).slice(0, 40) });
    let key = `${id}:${(url ?? str(r.title)).slice(0, 200)}`;
    for (let n = 2; seenS.has(key); n++) key = `${id}:${(url ?? str(r.title)).slice(0, 200)}#${n}`;
    seenS.add(key);
    const checked = /^yes/i.test(str(r.checked));
    const rec: SourceRec = {
      source_key: key, marker_id: id, position: sources.filter((s) => s.marker_id === id).length,
      title: str(r.title) || "Untitled source", author: nul(r.author), publisher: nul(r.publisher), pub_date: nul(r.pub_date),
      url, access_date: nul(r.access_date), source_type: nul(r.source_type), archival_ref: nul(r.archival_ref),
      supports: nul(r.supports), checked,
    };
    if (!checked) issue({ marker_id: id, kind: "source_followup", severity: "review", message: `Source listed for follow-up: ${rec.title.slice(0, 120)}`, ref: key.slice(-60) });
    rec.import_hash = await hash(rec);
    sources.push(rec);
  }

  const images: ImageRec[] = [];
  const seenI = new Set<string>();
  for (const row of of("images")) {
    const r = pick(row, mappings.images);
    const id = str(r.marker_id);
    if (!known.has(id)) { issue({ marker_id: id || null, kind: "orphan_image", severity: "error", message: `Image "${str(r.title).slice(0, 80)}" has no matching marker.`, ref: str(r.title).slice(0, 40) }); continue; }
    const img = safeUrl(r.image_url), rec_url = safeUrl(r.record_url);
    let key = `${id}:${(img ?? rec_url ?? str(r.title)).slice(0, 200)}`;
    for (let n = 2; seenI.has(key); n++) key = `${id}:${(img ?? rec_url ?? str(r.title)).slice(0, 200)}#${n}`;
    seenI.add(key);
    const notes = nul(r.notes);
    const statusOk = /^cleared$/i.test(str(r.reuse_status));
    const held = notes ? /hold|not verified|unverified|unidentified/i.test(notes) : false;
    const cleared = statusOk && !held && Boolean(img);
    if (!cleared) issue({ marker_id: id, kind: "image_restricted", severity: "review", message: `Image held for review: ${str(r.title).slice(0, 100)} (${notes ?? (str(r.reuse_status) || "no direct image link")})`, ref: key.slice(-60) });
    const rec: ImageRec = {
      image_key: key, marker_id: id, position: images.filter((i) => i.marker_id === id).length,
      kind: nul(r.kind), title: nul(r.title), description: nul(r.description), creator: nul(r.creator), image_date: nul(r.image_date),
      rights_holder: nul(r.rights_holder), record_url: rec_url, image_url: img, license: nul(r.license), attribution: nul(r.attribution),
      cleared, reuse_status: nul(r.reuse_status), caption: nul(r.caption), alt: nul(r.alt), notes,
    };
    rec.import_hash = await hash(rec);
    images.push(rec);
  }
  for (const m of markers) if (!images.some((i) => i.marker_id === m.marker_id && i.cleared)) {
    issue({ marker_id: m.marker_id, kind: "no_cleared_image", severity: "review", message: "No cleared image; a designed title card is shown." });
  }

  return {
    markers, sources, images, issues,
    featured: (report?.featured ?? []).filter((id) => known.has(id)),
    regions: [...REGIONS], mappingNotes, overview: report?.overview ?? "",
    files: [...new Set([...sheets.map((s) => s.file), ...(report ? [report.file] : [])])],
  };
}

// ---------------------------------------------------------------- diff + commit

export type RowState = "new" | "update" | "unchanged";
export interface Diff {
  markers: Record<string, { state: RowState; changed: string[] }>;
  sources: Record<string, RowState>;
  images: Record<string, RowState>;
}

async function existing<T extends Record<string, unknown>>(table: "collection_markers" | "collection_sources" | "collection_images", key: string, keys: string[]) {
  const out = new Map<string, T>();
  for (let i = 0; i < keys.length; i += 100) {
    const { data, error } = await supabase.from(table).select("*").in(key, keys.slice(i, i + 100));
    if (error) throw error;
    for (const r of data ?? []) out.set(String((r as Record<string, unknown>)[key]), r as unknown as T);
  }
  return out;
}

export async function diffPlan(plan: Plan): Promise<Diff> {
  const em = await existing<Record<string, unknown>>("collection_markers", "marker_id", plan.markers.map((m) => m.marker_id));
  const es = await existing<Record<string, unknown>>("collection_sources", "source_key", plan.sources.map((s) => s.source_key));
  const ei = await existing<Record<string, unknown>>("collection_images", "image_key", plan.images.map((i) => i.image_key));
  const markers: Diff["markers"] = {};
  for (const m of plan.markers) {
    const e = em.get(m.marker_id);
    if (!e) { markers[m.marker_id] = { state: "new", changed: [] }; continue; }
    if (e.import_hash === m.import_hash) { markers[m.marker_id] = { state: "unchanged", changed: [] }; continue; }
    const changed = Object.keys(m).filter((k) => k !== "import_hash" && JSON.stringify(m[k] ?? null) !== JSON.stringify(e[k] ?? null));
    markers[m.marker_id] = { state: changed.length ? "update" : "unchanged", changed };
  }
  const st = (e: Record<string, unknown> | undefined, h: unknown): RowState => (!e ? "new" : e.import_hash === h ? "unchanged" : "update");
  return {
    markers,
    sources: Object.fromEntries(plan.sources.map((s) => [s.source_key, st(es.get(s.source_key), s.import_hash)])),
    images: Object.fromEntries(plan.images.map((i) => [i.image_key, st(ei.get(i.image_key), i.import_hash)])),
  };
}

export interface CommitSummary { imported: number; updated: number; skipped: number; blocked: number; sources: number; images: number; issues: number; errors: string[] }

export async function commitPlan(plan: Plan, diff: Diff, approveUpdates: boolean, onProgress: (pct: number, label: string) => void): Promise<CommitSummary> {
  const { data: u } = await supabase.auth.getUser();
  const errors: string[] = [];
  onProgress(2, "Saving collection");
  const { error: ce } = await supabase.from("collections").upsert({
    code: COLLECTION_CODE, title: COLLECTION_TITLE, regions: plan.regions, featured: plan.featured,
    report_notes: { overview: plan.overview, mappingNotes: plan.mappingNotes },
  });
  if (ce) throw ce;
  const { data: run, error: re } = await supabase.from("import_runs").insert({ collection_code: COLLECTION_CODE, created_by: u.user?.id, files: plan.files }).select("id").single();
  if (re) throw re;

  const allowed = (state: RowState) => state === "new" || (state === "update" && approveUpdates);
  const mRows = plan.markers.filter((m) => allowed(diff.markers[m.marker_id].state));
  const blockedIds = new Set(plan.issues.filter((i) => i.severity === "blocked").map((i) => i.marker_id));
  const chunks = async <T,>(label: string, rows: T[], fn: (c: T[]) => Promise<void>, from: number, to: number) => {
    for (let i = 0; i < rows.length; i += 50) {
      await fn(rows.slice(i, i + 50));
      onProgress(from + ((to - from) * Math.min(rows.length, i + 50)) / Math.max(rows.length, 1), label);
    }
  };
  await chunks("Markers", mRows, async (c) => {
    const { error } = await supabase.from("collection_markers").upsert(c as never);
    if (error) errors.push(`Markers: ${error.message}`);
  }, 5, 40);
  const sRows = plan.sources.filter((s) => allowed(diff.sources[s.source_key]));
  await chunks("Sources", sRows, async (c) => {
    const { error } = await supabase.from("collection_sources").upsert(c as never);
    if (error) errors.push(`Sources: ${error.message}`);
  }, 40, 65);
  const iRows = plan.images.filter((i) => allowed(diff.images[i.image_key]));
  await chunks("Images", iRows, async (c) => {
    const { error } = await supabase.from("collection_images").upsert(c as never);
    if (error) errors.push(`Images: ${error.message}`);
  }, 65, 85);
  // Issues: insert new ones only; existing (possibly resolved) issues are left alone.
  const issueRows = plan.issues.map((i) => ({ ...i, run_id: run.id, collection_code: COLLECTION_CODE, details: i.details ?? {} }));
  await chunks("Review items", issueRows, async (c) => {
    const { error } = await supabase.from("import_issues").upsert(c as never, { onConflict: "issue_key", ignoreDuplicates: true });
    if (error) errors.push(`Review items: ${error.message}`);
  }, 85, 98);

  const summary: CommitSummary = {
    imported: mRows.filter((m) => diff.markers[m.marker_id].state === "new").length,
    updated: mRows.filter((m) => diff.markers[m.marker_id].state === "update").length,
    skipped: plan.markers.length - mRows.length,
    blocked: plan.markers.filter((m) => blockedIds.has(m.marker_id)).length,
    sources: sRows.length, images: iRows.length, issues: plan.issues.length, errors,
  };
  await supabase.from("import_runs").update({ summary: summary as never }).eq("id", run.id);
  onProgress(100, "Done");
  return summary;
}

export function issuesCsv(issues: Pick<Issue, "marker_id" | "kind" | "severity" | "message">[]) {
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  return ["marker_id,kind,severity,message", ...issues.map((i) => [i.marker_id, i.kind, i.severity, i.message].map(esc).join(","))].join("\n");
}

export function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
