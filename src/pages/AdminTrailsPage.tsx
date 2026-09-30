import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, Eye, GripVertical, Loader2, Plus, Archive, Trash2, Upload, AlertTriangle, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TrailMap from "@/components/TrailMap";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { citiesForMarkers, getCity } from "@/data/cities";
import { formatDistance, formatDuration, haversineM, invokeFn, slugifyTrail, TRAIL_THEMES, type Leg, type TrailRow } from "@/lib/trails";

interface DraftStop { marker_id: string; required: boolean; note: string }
interface Draft {
  id: string | null;
  slug: string;
  title: string;
  description: string;
  city: string;
  theme: string;
  accessibility: string;
  terrain: string;
  is_loop: boolean;
  cover_path: string | null;
  status: TrailRow["status"];
  stops: DraftStop[];
}
const empty: Draft = { id: null, slug: "", title: "", description: "", city: "Tacoma", theme: TRAIL_THEMES[0], accessibility: "", terrain: "", is_loop: false, cover_path: null, status: "draft", stops: [] };
const LONG_LEG_M = 2000;
const input = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground";

function SortableStop({ id, index, total, name, stop, onMove, onRemove, onChange }: {
  id: string; index: number; total: number; name: string; stop: DraftStop;
  onMove: (d: -1 | 1) => void; onRemove: () => void; onChange: (s: DraftStop) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-xl bg-card p-3 elevation-1 ${isDragging ? "opacity-70 ring-2 ring-primary" : ""}`}>
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} aria-label={`Drag to reorder ${name}`} className="flex h-9 w-7 cursor-grab items-center justify-center text-on-surface-variant"><GripVertical className="h-4 w-4" /></button>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{name}</p>
        <button aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
        <button aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
        <button aria-label={`Remove ${name} from trail`} onClick={onRemove} className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
      <textarea value={stop.note} onChange={(e) => onChange({ ...stop, note: e.target.value.slice(0, 1000) })} rows={2}
        placeholder="Trail-only note or instructions for this stop (optional)" className={`${input} mt-2 text-xs`} />
      <label className="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
        <input type="checkbox" checked={stop.required} onChange={(e) => onChange({ ...stop, required: e.target.checked })} /> Required to complete the trail
      </label>
    </li>
  );
}

const AdminTrailsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const markers = useAllMarkers();
  const markerById = useMemo(() => new Map(markers.map((m) => [m.id, m])), [markers]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [legs, setLegs] = useState<Leg[]>([]);
  const [routeState, setRouteState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [cover, setCover] = useState<File | null>(null);

  const { data: trails, isLoading } = useQuery({
    queryKey: ["admin-trails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trails").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as TrailRow[];
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const stopsResolved = useMemo(() => (draft?.stops ?? []).map((s) => {
    const m = markerById.get(s.marker_id);
    return { ...s, name: m?.name ?? `${s.marker_id} (missing marker)`, lat: m?.lat ?? NaN, lng: m?.lng ?? NaN };
  }), [draft?.stops, markerById]);

  // Live route preview, debounced.
  const routeKey = JSON.stringify([stopsResolved.map((s) => [s.lat, s.lng]), draft?.is_loop]);
  useEffect(() => {
    if (!draft || stopsResolved.length < 2 || stopsResolved.some((s) => !Number.isFinite(s.lat))) { setLegs([]); return; }
    setRouteState({ loading: true, error: null });
    const t = setTimeout(() => {
      invokeFn<{ legs: Leg[] }>("trail-admin", { action: "route", points: stopsResolved.map(({ lat, lng }) => ({ lat, lng })), loop: draft.is_loop })
        .then((r) => { setLegs(r.legs); setRouteState({ loading: false, error: null }); })
        .catch((e) => { setLegs([]); setRouteState({ loading: false, error: (e as Error).message }); });
    }, 600);
    return () => clearTimeout(t);
  }, [routeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = { d: legs.reduce((s, l) => s + (l.distance_m ?? 0), 0), t: legs.reduce((s, l) => s + (l.duration_s ?? 0), 0) };
  const failedLegs = legs.filter((l) => !l.ok);
  const longLegs = legs.filter((l) => (l.distance_m ?? 0) > LONG_LEG_M);

  const candidates = useMemo(() => {
    if (!draft) return [];
    const q = search.trim().toLowerCase();
    const inTrail = new Set(draft.stops.map((s) => s.marker_id));
    return markers.filter((m) => !inTrail.has(m.id) && (m.city ?? "Tacoma") === draft.city && (!q || m.name.toLowerCase().includes(q))).slice(0, 8);
  }, [markers, draft, search]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const addStop = (id: string) => setDraft((d) => d && !d.stops.some((s) => s.marker_id === id) ? { ...d, stops: [...d.stops, { marker_id: id, required: true, note: "" }] } : d);
  const moveStop = (i: number, dir: -1 | 1) => setDraft((d) => d ? { ...d, stops: arrayMove(d.stops, i, i + dir) } : d);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id || !draft) return;
    const from = draft.stops.findIndex((s) => s.marker_id === e.active.id);
    const to = draft.stops.findIndex((s) => s.marker_id === e.over!.id);
    setDraft({ ...draft, stops: arrayMove(draft.stops, from, to) });
  };
  const onMapClick = (p: { lat: number; lng: number }) => {
    const cityMarkers = markers.filter((m) => (m.city ?? "Tacoma") === draft?.city);
    let best: (typeof markers)[number] | null = null, bestD = Infinity;
    for (const m of cityMarkers) { const d = haversineM(p, m); if (d < bestD) { bestD = d; best = m; } }
    if (best && bestD < 250) { addStop(best.id); toast({ title: `Added ${best.name}` }); }
    else toast({ title: "No marker near that spot", description: "Tap closer to a marker, or search by name." });
  };

  const edit = async (t: TrailRow, duplicate = false) => {
    const { data: rows } = await supabase.from("trail_stops").select("*").eq("trail_id", t.id).order("position");
    setDraft({
      id: duplicate ? null : t.id,
      slug: duplicate ? `${t.slug}-copy` : t.slug,
      title: duplicate ? `${t.title} (copy)` : t.title,
      description: t.description, city: t.city, theme: t.theme,
      accessibility: t.accessibility ?? "", terrain: t.terrain ?? "", is_loop: t.is_loop, cover_path: t.cover_path,
      status: duplicate ? "draft" : t.status,
      stops: (rows ?? []).map((r) => ({ marker_id: r.marker_id, required: r.required, note: r.note })),
    });
    setProblems([]); setCover(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (): Promise<string | null> => {
    if (!draft) return null;
    const title = draft.title.trim();
    if (!title) { toast({ title: "Add a trail name first", variant: "destructive" }); return null; }
    const slug = slugifyTrail(draft.slug || title);
    setSaving(true);
    try {
      let coverPath = draft.cover_path;
      if (cover) {
        const path = `${slug}-${Date.now()}.${cover.name.split(".").pop() || "jpg"}`;
        const { error } = await supabase.storage.from("trail-covers").upload(path, cover, { upsert: true, contentType: cover.type });
        if (error) throw error;
        coverPath = path;
      }
      const row = {
        slug, title, description: draft.description.trim().slice(0, 2000), city: draft.city, theme: draft.theme,
        accessibility: draft.accessibility.trim() || null, terrain: draft.terrain.trim() || null, is_loop: draft.is_loop, cover_path: coverPath,
      };
      let id = draft.id;
      if (id) {
        const { error } = await supabase.from("trails").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("trails").insert({ ...row, status: "draft" }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      await supabase.from("trail_stops").delete().eq("trail_id", id);
      if (draft.stops.length) {
        const { error } = await supabase.from("trail_stops").insert(draft.stops.map((s, i) => ({ trail_id: id!, marker_id: s.marker_id, position: i, required: s.required, note: s.note.trim() })));
        if (error) throw error;
      }
      setDraft({ ...draft, id, slug, cover_path: coverPath });
      setCover(null);
      qc.invalidateQueries({ queryKey: ["admin-trails"] });
      qc.invalidateQueries({ queryKey: ["trails"] });
      qc.invalidateQueries({ queryKey: ["trail"] });
      return id;
    } catch (e) {
      const msg = (e as Error).message;
      toast({ title: "Couldn't save", description: /duplicate|unique/i.test(msg) ? "Another trail already uses that link name." : msg, variant: "destructive" });
      return null;
    } finally { setSaving(false); }
  };

  const publish = async () => {
    const local: string[] = [];
    if (new Set(stopsResolved.map((s) => s.marker_id)).size < 2) local.push("A trail needs at least 2 different markers.");
    stopsResolved.forEach((s) => { if (!Number.isFinite(s.lat)) local.push(`"${s.name}" has no valid coordinates.`); });
    failedLegs.forEach((l) => local.push(`No walking route from "${stopsResolved[l.from]?.name}" to "${stopsResolved[l.to]?.name}".`));
    if (routeState.error) local.push(routeState.error);
    setProblems(local);
    if (local.length) return;
    const id = await save();
    if (!id) return;
    setSaving(true);
    try {
      const coords = Object.fromEntries(stopsResolved.map((s) => [s.marker_id, { lat: s.lat, lng: s.lng, name: s.name }]));
      await invokeFn("trail-admin", { action: "publish", trail_id: id, coords });
      setDraft((d) => d && { ...d, status: "published" });
      toast({ title: "Trail published", description: "People already walking keep their current version." });
      qc.invalidateQueries({ queryKey: ["admin-trails"] });
      qc.invalidateQueries({ queryKey: ["trails"] });
      qc.invalidateQueries({ queryKey: ["trail"] });
    } catch (e) {
      const d = (e as Error & { details?: { problems?: string[] } }).details;
      setProblems(d?.problems ?? [(e as Error).message]);
    } finally { setSaving(false); }
  };

  const setStatus = async (t: TrailRow, status: TrailRow["status"]) => {
    const { error } = await supabase.from("trails").update({ status }).eq("id", t.id);
    if (error) toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["admin-trails"] });
    qc.invalidateQueries({ queryKey: ["trails"] });
  };

  const cityOptions = useMemo(() => citiesForMarkers(markers), [markers]);

  return (
    <div className="min-h-[100dvh] bg-background pb-12">
      <PageHeader title="Trail Manager" back />
      <div className="space-y-6 px-4">
        {!draft ? (
          <button onClick={() => { setDraft({ ...empty }); setProblems([]); setLegs([]); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground elevation-1">
            <Plus className="h-4 w-4" /> New trail
          </button>
        ) : (
          <section className="space-y-4 rounded-2xl bg-surface-variant/40 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">{draft.id ? "Edit trail" : "New trail"}</h2>
              <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium capitalize text-foreground">{draft.status}</span>
            </div>
            <input className={input} placeholder="Trail name" value={draft.title} onChange={(e) => set("title", e.target.value.slice(0, 120))} />
            <input className={input} placeholder={`Link name (e.g. ${slugifyTrail(draft.title) || "downtown-heritage-walk"})`} value={draft.slug} onChange={(e) => set("slug", slugifyTrail(e.target.value))} />
            <textarea className={input} rows={3} placeholder="Description" value={draft.description} onChange={(e) => set("description", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select className={input} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} aria-label="City">
                {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
              </select>
              <select className={input} value={draft.theme} onChange={(e) => set("theme", e.target.value)} aria-label="Theme">
                {TRAIL_THEMES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <input className={input} placeholder="Accessibility (e.g. step-free, curb cuts) — leave blank if not verified" value={draft.accessibility} onChange={(e) => set("accessibility", e.target.value.slice(0, 300))} />
            <input className={input} placeholder="Terrain (e.g. steep hill on 9th St) — leave blank if not verified" value={draft.terrain} onChange={(e) => set("terrain", e.target.value.slice(0, 300))} />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={draft.is_loop} onChange={(e) => set("is_loop", e.target.checked)} /> Loop (ends where it starts)
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-medium text-foreground">
                <Upload className="h-3.5 w-3.5" /> {cover ? cover.name.slice(0, 18) : draft.cover_path ? "Replace cover" : "Cover image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            {/* Stops */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">Stops</h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-on-surface-variant" />
                <input className={`${input} pl-9`} placeholder={`Search ${getCity(draft.city).name} markers to add`} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {search && (
                <ul className="space-y-1">
                  {candidates.map((m) => (
                    <li key={m.id}>
                      <button onClick={() => { addStop(m.id); setSearch(""); }} className="flex w-full items-center gap-2 rounded-lg bg-card px-3 py-2 text-left text-sm text-foreground">
                        <Plus className="h-4 w-4 text-primary" /> {m.name}
                      </button>
                    </li>
                  ))}
                  {!candidates.length && <li className="px-3 text-xs text-on-surface-variant">No matching markers in this city.</li>}
                </ul>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={draft.stops.map((s) => s.marker_id)} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-2">
                    {draft.stops.map((s, i) => (
                      <SortableStop key={s.marker_id} id={s.marker_id} index={i} total={draft.stops.length} stop={s} name={stopsResolved[i]?.name ?? s.marker_id}
                        onMove={(d) => moveStop(i, d)}
                        onRemove={() => setDraft({ ...draft, stops: draft.stops.filter((x) => x.marker_id !== s.marker_id) })}
                        onChange={(ns) => setDraft({ ...draft, stops: draft.stops.map((x, j) => (j === i ? ns : x)) })} />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
              {!draft.stops.length && <p className="text-xs text-on-surface-variant">Search above, or tap a marker's spot on the map below.</p>}
            </div>

            {/* Live preview */}
            <div className="h-72 overflow-hidden rounded-xl elevation-1">
              <TrailMap
                stops={stopsResolved.filter((s) => Number.isFinite(s.lat))}
                legs={legs}
                states={stopsResolved.map(() => "upcoming")}
                currentIndex={null}
                onMapClick={onMapClick}
              />
            </div>
            <div className="space-y-1 text-xs">
              {routeState.loading ? <p className="flex items-center gap-1 text-on-surface-variant"><Loader2 className="h-3 w-3 animate-spin" />Calculating walking route…</p>
                : legs.length > 0 && <p className="text-foreground">{formatDistance(totals.d)} · ~{formatDuration(totals.t)} walking (not counting time at stops)</p>}
              {routeState.error && <p className="flex gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{routeState.error}</p>}
              {failedLegs.map((l) => <p key={`f${l.from}`} className="flex gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />No walking route from stop {l.from + 1} to stop {l.to + 1}.</p>)}
              {longLegs.map((l) => <p key={`l${l.from}`} className="flex gap-1 text-on-surface-variant"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Stop {l.from + 1} to {l.to + 1} is a long walk ({formatDistance(l.distance_m ?? 0)}).</p>)}
            </div>
            {problems.length > 0 && (
              <ul className="space-y-1 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button disabled={saving} onClick={async () => { if (await save()) toast({ title: "Draft saved", description: draft.status === "published" ? "Visitors still see the published version until you publish again." : undefined }); }}
                className="h-11 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground disabled:opacity-60">Save draft</button>
              <button disabled={saving} onClick={async () => { const id = await save(); if (id) navigate(`/trails/${slugifyTrail(draft.slug || draft.title)}?preview=1`); }}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-card text-sm font-medium text-foreground disabled:opacity-60"><Eye className="h-4 w-4" />Preview</button>
              <button disabled={saving} onClick={publish} className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}{draft.status === "published" ? "Publish update" : "Publish"}
              </button>
              <button onClick={() => setDraft(null)} className="col-span-2 h-10 text-xs text-on-surface-variant">Close editor</button>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-on-surface-variant">All trails</h2>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : !trails?.length ? (
            <p className="text-sm text-on-surface-variant">No trails yet.</p>
          ) : (
            <ul className="space-y-2">
              {trails.map((t) => (
                <li key={t.id} className="rounded-xl bg-card p-3 elevation-1">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-[11px] capitalize text-on-surface-variant">{t.status} · {getCity(t.city).name} · {t.theme}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button onClick={() => edit(t)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">Edit</button>
                    <button onClick={() => edit(t, true)} className="flex items-center gap-1 rounded-lg bg-surface-variant px-3 py-1.5 text-xs text-foreground"><Copy className="h-3 w-3" />Duplicate</button>
                    <button onClick={() => navigate(`/trails/${t.slug}${t.status === "published" ? "" : "?preview=1"}`)} className="flex items-center gap-1 rounded-lg bg-surface-variant px-3 py-1.5 text-xs text-foreground"><Eye className="h-3 w-3" />View</button>
                    {t.status === "archived" ? (
                      <button onClick={() => setStatus(t, t.current_revision_id ? "published" : "draft")} className="rounded-lg bg-surface-variant px-3 py-1.5 text-xs text-foreground">Restore</button>
                    ) : (
                      <button onClick={() => setStatus(t, "archived")} className="flex items-center gap-1 rounded-lg bg-surface-variant px-3 py-1.5 text-xs text-foreground"><Archive className="h-3 w-3" />Archive</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminTrailsPage;
