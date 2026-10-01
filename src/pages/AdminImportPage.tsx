import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Download, Eye, FileSpreadsheet, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { loadUsCities, makeCityId } from "@/data/cities";
import {
  buildPlan, commitPlan, DEFAULT_MAPPINGS, diffPlan, download, issuesCsv, parseReport, parseWorkbook,
  type CommitSummary, type Diff, type ParsedReport, type ParsedSheet, type Plan, type SheetKind, COLLECTION_CODE,
} from "@/lib/collectionImport";

const KIND_LABEL: Record<SheetKind, string> = {
  research_markers: "Research markers", upload_markers: "Upload draft markers", sources: "Sources & articles",
  images: "Images", blocked: "Blocked & mapping notes", summary: "Summary (read only, formulas not run)",
};
const EXPECTED = { markers: 35, sources: 113, images: 47 };

type IssueRow = { issue_key: string; marker_id: string | null; kind: string; severity: string; message: string; details: unknown; resolved: boolean };

const AdminImportPage = () => {
  const [tab, setTab] = useState<"import" | "review">("import");
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [report, setReport] = useState<ParsedReport | null>(null);
  const [mappings, setMappings] = useState(DEFAULT_MAPPINGS);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [approve, setApprove] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);
  const [summary, setSummary] = useState<CommitSummary | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy("Reading files"); setPlan(null); setDiff(null); setSummary(null);
    try {
      const next: ParsedSheet[] = [...sheets];
      let rep = report;
      for (const f of Array.from(files)) {
        if (/\.xlsx$/i.test(f.name)) {
          const parsed = await parseWorkbook(f);
          for (const p of parsed) {
            const i = next.findIndex((s) => s.file === p.file && s.name === p.name);
            if (i >= 0) next[i] = p; else next.push(p);
          }
        } else if (/\.html?$/i.test(f.name)) rep = await parseReport(f);
        else toast.error(`${f.name}: only .xlsx and .html files are accepted.`);
      }
      setSheets(next); setReport(rep);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that file");
    } finally { setBusy(null); }
  };

  const preview = async () => {
    setBusy("Building preview");
    try {
      const p = await buildPlan(sheets, report, mappings);
      setPlan(p); setDiff(await diffPlan(p)); setApprove(false); setSummary(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Preview failed"); } finally { setBusy(null); }
  };

  const commit = async () => {
    if (!plan || !diff) return;
    setBusy("Importing");
    try {
      const s = await commitPlan(plan, diff, approve, (pct, label) => setProgress({ pct, label }));
      setSummary(s);
      setDiff(await diffPlan(plan));
      s.errors.length ? toast.error(`${s.errors.length} batch errors — see summary`) : toast.success("Import finished");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Import failed"); } finally { setBusy(null); }
  };

  const missingCols = (kind: keyof typeof DEFAULT_MAPPINGS) => {
    const headers = new Set(sheets.filter((s) => s.kind === kind).flatMap((s) => s.headers));
    return Object.entries(mappings[kind]).filter(([, col]) => !headers.has(col)).map(([f]) => f);
  };

  const counts = plan && diff ? {
    new: Object.values(diff.markers).filter((d) => d.state === "new").length,
    update: Object.values(diff.markers).filter((d) => d.state === "update").length,
    unchanged: Object.values(diff.markers).filter((d) => d.state === "unchanged").length,
    blocked: new Set(plan.issues.filter((i) => i.severity === "blocked").map((i) => i.marker_id)).size,
    errors: plan.issues.filter((i) => i.severity === "error").length,
  } : null;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title="Washington Import" back />
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="flex gap-2">
          {(["import", "review"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
              className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? "bg-primary text-primary-foreground" : "bg-card text-on-surface-variant elevation-1"}`}>
              {t === "import" ? "Import" : "Review queue"}
            </button>
          ))}
          <Link to="/explore/washington" className="ml-auto flex items-center gap-1 rounded-full bg-card px-4 py-1.5 text-sm elevation-1">
            <Eye className="h-4 w-4" /> Preview collection
          </Link>
        </div>

        {tab === "review" ? <ReviewQueue /> : (
          <>
            <section className="space-y-3 rounded-xl bg-card p-4 elevation-1">
              <h2 className="font-display text-sm font-semibold">1. Choose files</h2>
              <p className="text-xs text-on-surface-variant">
                Research workbook, upload draft (.xlsx) and the illustrated report (.html). Workbook formulas are never run and report scripts are removed.
              </p>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm">
                <Upload className="h-4 w-4" /> Select files
                <input type="file" multiple accept=".xlsx,.html,.htm" className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
              </label>
              {sheets.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {sheets.map((s, i) => (
                    <li key={s.file + s.name} className="flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{s.file} › <strong>{s.name}</strong> ({s.rows.length} rows)</span>
                      <select aria-label={`Sheet type for ${s.name}`} value={s.kind ?? ""} className="rounded border border-border bg-background px-1 py-0.5"
                        onChange={(e) => setSheets((p) => p.map((x, j) => (j === i ? { ...x, kind: (e.target.value || null) as SheetKind | null } : x)))}>
                        <option value="">Ignore</option>
                        {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
              {report && (
                <p className="flex items-center gap-2 text-xs">
                  <FileText className="h-3.5 w-3.5 text-primary" /> {report.file}: {Object.keys(report.regionByMarker).length} markers in regions,
                  {" "}{report.featured.length} recommended, {report.scriptsRemoved} script(s) removed
                </p>
              )}
            </section>

            {sheets.length > 0 && (
              <section className="space-y-2 rounded-xl bg-card p-4 elevation-1">
                <h2 className="font-display text-sm font-semibold">2. Field mapping</h2>
                {(Object.keys(DEFAULT_MAPPINGS) as (keyof typeof DEFAULT_MAPPINGS)[]).filter((k) => sheets.some((s) => s.kind === k)).map((kind) => {
                  const headers = [...new Set(sheets.filter((s) => s.kind === kind).flatMap((s) => s.headers))];
                  const missing = missingCols(kind);
                  return (
                    <details key={kind} className="rounded-lg border border-border p-2 text-xs">
                      <summary className="cursor-pointer">
                        {KIND_LABEL[kind]} — {missing.length ? <span className="text-destructive">{missing.length} unmapped</span> : "all fields mapped"}
                      </summary>
                      <div className="mt-2 grid grid-cols-[auto,1fr] items-center gap-x-3 gap-y-1">
                        {Object.entries(mappings[kind]).map(([field, col]) => (
                          <div key={field} className="contents">
                            <span className="font-mono text-[11px]">{field}</span>
                            <select value={headers.includes(col) ? col : ""} aria-label={`Column for ${field}`}
                              className={`rounded border bg-background px-1 py-0.5 ${headers.includes(col) ? "border-border" : "border-destructive"}`}
                              onChange={(e) => setMappings((m) => ({ ...m, [kind]: { ...m[kind], [field]: e.target.value } }))}>
                              <option value="">— not mapped —</option>
                              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
                <button onClick={preview} disabled={!!busy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm text-primary-foreground disabled:opacity-60">
                  {busy === "Building preview" && <Loader2 className="h-4 w-4 animate-spin" />} Build preview
                </button>
              </section>
            )}

            {plan && diff && counts && (
              <section className="space-y-3 rounded-xl bg-card p-4 elevation-1">
                <h2 className="font-display text-sm font-semibold">3. Preview</h2>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {([["Markers", plan.markers.length, EXPECTED.markers], ["Sources", plan.sources.length, EXPECTED.sources], ["Images", plan.images.length, EXPECTED.images]] as const).map(([l, n, e]) => (
                    <div key={l} className="rounded-lg bg-background p-2">
                      <div className="font-display text-lg">{n}</div>
                      <div>{l}</div>
                      <div className={n === e ? "text-primary" : "text-destructive"}>{n === e ? "matches" : `expected ${e}`}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant">
                  {counts.new} new · {counts.update} changed · {counts.unchanged} unchanged · {counts.blocked} blocked · {counts.errors} errors · {plan.issues.length} review items.
                  Everything imports as a draft.
                </p>
                <div className="max-h-80 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-card"><tr><th className="p-1.5">ID</th><th>Title</th><th>State</th><th>Issues</th></tr></thead>
                    <tbody>
                      {plan.markers.map((m) => {
                        const d = diff.markers[m.marker_id];
                        const iss = plan.issues.filter((i) => i.marker_id === m.marker_id);
                        return (
                          <tr key={m.marker_id} className="border-t border-border align-top">
                            <td className="p-1.5 font-mono">{m.marker_id}</td>
                            <td className="pr-2">{m.title}</td>
                            <td className="pr-2">{d.state}{d.changed.length ? <span className="block text-on-surface-variant">{d.changed.join(", ")}</span> : null}</td>
                            <td title={iss.map((i) => i.message).join("\n")}>
                              {iss.some((i) => i.severity === "blocked") && <span className="mr-1 text-destructive">blocked</span>}{iss.length}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {counts.update > 0 && (
                  <label className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} />
                    I reviewed the {counts.update} changed record(s) above and approve overwriting them. Unchecked, they are skipped.
                  </label>
                )}
                <div className="flex gap-2">
                  <button onClick={commit} disabled={!!busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm text-primary-foreground disabled:opacity-60">
                    {busy === "Importing" && <Loader2 className="h-4 w-4 animate-spin" />} Import as drafts
                  </button>
                  <button onClick={() => download("washington-import-issues.csv", issuesCsv(plan.issues))}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 text-xs"><Download className="h-4 w-4" /> Issues CSV</button>
                </div>
                {progress && busy === "Importing" && (
                  <div role="progressbar" aria-valuenow={Math.round(progress.pct)} aria-valuemin={0} aria-valuemax={100} className="space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} /></div>
                    <p className="text-[11px] text-on-surface-variant">{progress.label}</p>
                  </div>
                )}
                {summary && (
                  <div role="status" className="rounded-lg bg-background p-3 text-xs">
                    <p className="flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" /> Import summary</p>
                    <p>{summary.imported} imported · {summary.updated} updated · {summary.skipped} skipped (unchanged or not approved) · {summary.blocked} blocked from publishing</p>
                    <p>{summary.sources} sources and {summary.images} images written · {summary.issues} review items recorded</p>
                    {summary.errors.map((e) => <p key={e} className="text-destructive">{e}</p>)}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const KIND_TITLE: Record<string, string> = {
  missing_city: "Needs a city", coords_withheld: "Coordinates withheld", coords_missing: "No coordinates",
  image_restricted: "Image rights / identity", source_followup: "Sources to follow up", consultation: "Consultation recommended",
  needs_verification: "Needs verification", blocked: "Blocked in upload draft", no_cleared_image: "No cleared image",
  conflict_title: "Conflicts", conflict_sensitive: "Conflicts", missing_region: "No region",
};

function ReviewQueue() {
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [show, setShow] = useState<"open" | "all">("open");
  const [kind, setKind] = useState<string>("");
  const [wa, setWa] = useState<string[]>([]);
  const load = useCallback(async () => {
    let q = supabase.from("import_issues").select("issue_key, marker_id, kind, severity, message, details, resolved")
      .eq("collection_code", COLLECTION_CODE).order("marker_id").limit(1000);
    if (show === "open") q = q.eq("resolved", false);
    const { data } = await q;
    setRows((data ?? []) as IssueRow[]);
  }, [show]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadUsCities().then((d) => setWa((d.WA ?? []).map((c) => c[0]))); }, []);

  const kinds = useMemo(() => [...new Set(rows.map((r) => r.kind))], [rows]);
  const list = rows.filter((r) => !kind || r.kind === kind);

  const resolve = async (r: IssueRow, value = true) => {
    const { error } = await supabase.from("import_issues").update({ resolved: value }).eq("issue_key", r.issue_key);
    if (error) toast.error(error.message); else load();
  };
  const assignCity = async (r: IssueRow, cityId: string) => {
    if (!r.marker_id || !cityId) return;
    const { error } = await supabase.from("collection_markers").update({ city_id: cityId }).eq("marker_id", r.marker_id);
    if (error) return toast.error(error.message);
    // Also close the upload-draft "blocked" note when its only reason was the missing city.
    const { data: blocked } = await supabase.from("import_issues").select("issue_key, message")
      .eq("marker_id", r.marker_id).eq("kind", "blocked").eq("resolved", false);
    const stale = (blocked ?? []).filter((b) => onlyCityBlock(b.message)).map((b) => b.issue_key);
    if (stale.length) await supabase.from("import_issues").update({ resolved: true }).in("issue_key", stale);
    await resolve(r);
    toast.success(`${r.marker_id} assigned to ${cityId}`);
  };

  return (
    <>
    <PublishPanel />
    <section className="space-y-3 rounded-xl bg-card p-4 elevation-1">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by type" className="rounded border border-border bg-background px-2 py-1">
          <option value="">All types ({rows.length})</option>
          {kinds.map((k) => <option key={k} value={k}>{KIND_TITLE[k] ?? k} ({rows.filter((r) => r.kind === k).length})</option>)}
        </select>
        <select value={show} onChange={(e) => setShow(e.target.value as "open" | "all")} aria-label="Show" className="rounded border border-border bg-background px-2 py-1">
          <option value="open">Open</option><option value="all">All</option>
        </select>
        <button onClick={() => download("washington-review-queue.csv", issuesCsv(list))} className="ml-auto flex items-center gap-1 rounded border border-border px-2 py-1">
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
      </div>
      {!list.length && <p className="text-xs text-on-surface-variant">Nothing to review. Import the files first.</p>}
      <ul className="divide-y divide-border">
        {list.map((r) => {
          const cityName = String((r.details as { city_name?: string } | null)?.city_name ?? "").replace(/\s*\(.*\)\s*$/, "");
          const suggestion = cityName && wa.includes(cityName) ? makeCityId(cityName, "WA") : null;
          return (
            <li key={r.issue_key} className="space-y-1 py-2 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${r.severity === "blocked" || r.severity === "error" ? "text-destructive" : "text-quest-gold"}`} />
                <div className="min-w-0 flex-1">
                  <span className="font-mono">{r.marker_id}</span> · <span className="text-on-surface-variant">{KIND_TITLE[r.kind] ?? r.kind}</span>
                  <p>{r.message}</p>
                  {r.kind.startsWith("conflict") && <p className="text-on-surface-variant">{JSON.stringify(r.details)}</p>}
                </div>
                <button onClick={() => resolve(r, !r.resolved)} className="shrink-0 rounded border border-border px-2 py-0.5">{r.resolved ? "Reopen" : "Mark resolved"}</button>
              </div>
              {r.kind === "missing_city" && !r.resolved && (
                <div className="ml-5 flex flex-wrap items-center gap-2">
                  {suggestion ? (
                    <button onClick={() => assignCity(r, suggestion)} className="rounded bg-primary px-2 py-0.5 text-primary-foreground">Confirm “{suggestion}”</button>
                  ) : <span className="text-on-surface-variant">No confident match for “{cityName || "unknown"}”.</span>}
                  <select defaultValue="" aria-label="Choose a Washington city" onChange={(e) => e.target.value && assignCity(r, makeCityId(e.target.value, "WA"))}
                    className="max-w-[12rem] rounded border border-border bg-background px-1 py-0.5">
                    <option value="">Choose another WA city…</option>
                    {wa.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
    </>
  );
}

const BLOCKING = new Set(["blocked", "consultation", "needs_verification", "missing_city"]);
type StoryRow = { marker_id: string; title: string; city_id: string | null; status: string };
type OpenIssue = { issue_key: string; marker_id: string; kind: string; message: string };

/** True when a "blocked" note only cites the missing city and/or withheld coordinates. */
export function onlyCityBlock(message: string) {
  return message
    .replace(/^Blocked in upload draft:\s*/, "")
    .replace(/cityId not invented — must be assigned from MarkerQuest city list|coordinates withheld \([^)]*\)|[;\s]/g, "") === "";
}

/** Publish ready stories to visitors and the main map. The database re-checks readiness. */
function PublishPanel() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [open, setOpen] = useState<Record<string, OpenIssue[]>>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [m, i] = await Promise.all([
      supabase.from("collection_markers").select("marker_id, title, city_id, status").eq("collection_code", COLLECTION_CODE).order("marker_id"),
      supabase.from("import_issues").select("issue_key, marker_id, kind, message").eq("collection_code", COLLECTION_CODE).eq("resolved", false).limit(1000),
    ]);
    setStories((m.data ?? []) as StoryRow[]);
    const o: Record<string, OpenIssue[]> = {};
    for (const r of (i.data ?? []) as OpenIssue[]) if (r.marker_id && BLOCKING.has(r.kind)) (o[r.marker_id] ??= []).push(r);
    setOpen(o);
  }, []);
  useEffect(() => { load(); }, [load]);

  const blockers = (s: StoryRow) => [...(s.city_id ? [] : ["No city"]), ...(open[s.marker_id] ?? []).map((r) => `${KIND_TITLE[r.kind] ?? r.kind}: ${r.message}`)];
  const ready = stories.filter((s) => s.status !== "published" && !blockers(s).length);
  const published = stories.filter((s) => s.status === "published").length;

  const resolveIssue = async (key: string) => {
    const { error } = await supabase.from("import_issues").update({ resolved: true }).eq("issue_key", key);
    if (error) toast.error(error.message); else load();
  };

  const run = async (ids: string[], publish: boolean) => {
    if (!ids.length) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("set_collection_status", { _ids: ids, _publish: publish });
    setBusy(false);
    const res = data as { ok: boolean; error?: string; changed?: string[]; skipped?: unknown[] } | null;
    if (error || !res?.ok) return toast.error(error?.message ?? res?.error ?? "Failed");
    toast.success(`${res.changed?.length ?? 0} ${publish ? "published" : "unpublished"}${res.skipped?.length ? ` · ${res.skipped.length} not ready` : ""}`);
    load();
  };

  return (
    <section className="space-y-3 rounded-xl bg-card p-4 elevation-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-base">Publish stories</h2>
        <span className="text-xs text-on-surface-variant">{published} live · {ready.length} ready · {stories.length - published - ready.length} need review</span>
        <button disabled={busy || !ready.length} onClick={() => run(ready.map((s) => s.marker_id), true)}
          className="ml-auto rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
          Publish all ready ({ready.length})
        </button>
      </div>
      <p className="text-xs text-on-surface-variant">Published stories appear on the collection page, the Home globe and the main map. Withheld locations stay list-only. Quest Coins, QR discovery and postcards stay off.</p>
      <ul className="max-h-96 divide-y divide-border overflow-y-auto text-xs">
        {stories.map((s) => {
          const b = blockers(s);
          const live = s.status === "published";
          const issues = open[s.marker_id] ?? [];
          return (
            <li key={s.marker_id} className="space-y-1 py-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono">{s.marker_id}</span>
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                {live && <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Live</span>}
                {live ? (
                  <button disabled={busy} onClick={() => run([s.marker_id], false)} className="shrink-0 rounded border border-border px-2 py-0.5">Unpublish</button>
                ) : (
                  <button disabled={busy || b.length > 0} title={b.length ? `Not ready: ${b.join(" · ")}` : "Publish this story"}
                    onClick={() => run([s.marker_id], true)} className="shrink-0 rounded border border-primary px-2 py-0.5 text-primary disabled:opacity-40">Publish</button>
                )}
              </div>
              {!live && !s.city_id && <p className="ml-1 text-destructive">No city assigned — choose one in the queue below.</p>}
              {!live && issues.map((r) => (
                <div key={r.issue_key} className="ml-1 flex items-start gap-2 text-on-surface-variant">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-quest-gold" />
                  <span className="flex-1"><b className="font-medium text-foreground">{KIND_TITLE[r.kind] ?? r.kind}:</b> {r.message}</span>
                  <button onClick={() => resolveIssue(r.issue_key)} className="shrink-0 rounded border border-border px-2 py-0.5 text-foreground">Mark resolved</button>
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default AdminImportPage;
