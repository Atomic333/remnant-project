import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Crosshair, Maximize2, Navigation, Pause, Play, X, QrCode, Check, Share2, Footprints, Loader2, Repeat, MapPin, ChevronRight, Clock,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TrailMap, { type StopState, type TrailMapHandle } from "@/components/TrailMap";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { useQuestReward } from "@/components/QuestRewardProvider";
import { getMarkerImage } from "@/lib/markerImages";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCity } from "@/data/cities";
import {
  decodePolyline, formatDistance, formatDuration, haversineM, invokeFn, useTrail, useTrailWalk, WALK_MPS,
  type Leg, type PublishedTrail, type RevisionStop, type TrailRevision,
} from "@/lib/trails";

type Pos = { lat: number; lng: number; accuracy: number };

/** Admin draft preview: build a temporary revision from the draft stops. */
function useDraftPreview(trail: PublishedTrail | null | undefined, enabled: boolean) {
  const markers = useAllMarkers();
  const [rev, setRev] = useState<TrailRevision | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !trail) return;
    (async () => {
      const { data: rows } = await supabase.from("trail_stops").select("*").eq("trail_id", trail.id).order("position");
      const byId = new Map(markers.map((m) => [m.id, m]));
      const stops: RevisionStop[] = (rows ?? []).map((r) => {
        const m = byId.get(r.marker_id);
        return { marker_id: r.marker_id, name: m?.name ?? r.marker_id, lat: m?.lat ?? 0, lng: m?.lng ?? 0, required: r.required, note: r.note };
      });
      let legs: Leg[] = [];
      if (stops.length >= 2) {
        try {
          const res = await invokeFn<{ legs: Leg[] }>("trail-admin", { action: "route", points: stops.map(({ lat, lng }) => ({ lat, lng })), loop: trail.is_loop });
          legs = res.legs;
        } catch (e) { setError((e as Error).message); }
      }
      setRev({ id: "preview", trail_id: trail.id, version: 0, stops, legs,
        distance_m: legs.reduce((s, l) => s + (l.distance_m ?? 0), 0), duration_s: legs.reduce((s, l) => s + (l.duration_s ?? 0), 0) });
    })();
  }, [enabled, trail?.id, markers.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return { rev, error };
}

const TrailDetailPage = () => {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, isAdmin } = useAuth();
  const { celebrate } = useQuestReward();
  const { data: trail, isLoading } = useTrail(slug);
  const wantsPreview = params.get("preview") === "1" && isAdmin;
  const draft = useDraftPreview(trail, Boolean(trail && (wantsPreview || (!trail.revision && isAdmin))));
  const walk = useTrailWalk(trail?.revision ? trail : null, user?.id ?? null);
  const markers = useAllMarkers();
  const markerById = useMemo(() => new Map(markers.map((m) => [m.id, m])), [markers]);

  const isPreview = Boolean(draft.rev) && (wantsPreview || !trail?.revision);
  const revision = isPreview ? draft.rev : walk.revision;
  const stops = revision?.stops ?? [];
  const walking = walk.session?.status === "active";
  const paused = walk.session?.status === "paused";
  const open = walking || paused;

  const checked = useMemo(() => new Map(walk.checkins.map((c) => [c.marker_id, c])), [walk.checkins]);
  const showProgress = open || walk.session?.status === "completed";
  const nextIndex = useMemo(() => {
    if (!showProgress) return null;
    const i = stops.findIndex((s) => !checked.has(s.marker_id));
    return i === -1 ? null : i;
  }, [stops, checked, showProgress]);
  const states: StopState[] = stops.map((s, i) => {
    const c = showProgress ? checked.get(s.marker_id) : undefined;
    if (c?.pending) return "pending";
    if (c) return "done";
    return i === nextIndex ? "current" : "upcoming";
  });
  const required = stops.filter((s) => s.required !== false);
  const visitedCount = required.filter((s) => checked.has(s.marker_id)).length;
  const complete = walk.session?.status === "completed" || (showProgress && required.length > 0 && visitedCount === required.length);

  // ---- location (only while walking, or once when asked) ----
  const [pos, setPos] = useState<Pos | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const watchRef = useRef<number | null>(null);
  const stopWatch = () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; };
  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) { setGeoError("This browser can't share your location. You can still follow the stop list."); return; }
    if (watchRef.current != null) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => { setGeoError(null); setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); },
      (e) => {
        setGeoError(e.code === 1
          ? "Location is off, so we can't show where you are. Turn it on in your browser settings, or follow the numbered stops."
          : "We can't find your location right now (weak GPS). The trail and stops still work.");
        if (e.code === 1) stopWatch();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, []);
  useEffect(() => {
    if (walking) startWatch(); else { stopWatch(); setFollow(false); }
    return stopWatch;
  }, [walking, startWatch]);

  // ---- approach route to the next stop (real walking directions, signed-in only) ----
  const [approach, setApproach] = useState<{ path: { lat: number; lng: number }[]; distance_m: number; duration_s: number } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const lastReq = useRef<{ idx: number; at: { lat: number; lng: number } } | null>(null);
  const next = nextIndex != null ? stops[nextIndex] : null;
  useEffect(() => {
    if (!walking || !pos || !next || !user || pos.accuracy > 150) return;
    const prev = lastReq.current;
    if (prev && prev.idx === nextIndex && haversineM(prev.at, pos) < 120) return;
    lastReq.current = { idx: nextIndex!, at: { lat: pos.lat, lng: pos.lng } };
    invokeFn<{ polyline: string; distance_m: number; duration_s: number }>("trail-session", { action: "approach", from: { lat: pos.lat, lng: pos.lng }, to: { lat: next.lat, lng: next.lng } })
      .then((r) => { setRouteError(null); setApproach({ path: decodePolyline(r.polyline), distance_m: r.distance_m, duration_s: r.duration_s }); })
      .catch((e) => { setApproach(null); setRouteError((e as Error).message); });
  }, [walking, pos, nextIndex, next, user]);
  useEffect(() => { setApproach(null); }, [nextIndex]);

  const straight = pos && next ? haversineM(pos, next) : null;
  const toNext = approach ? { d: approach.distance_m, t: approach.duration_s, exact: true } : straight != null ? { d: straight, t: straight / WALK_MPS, exact: false } : null;
  const arrived = walking && next && pos && straight != null && pos.accuracy <= 75 && straight <= Math.max(35, pos.accuracy);
  const walkingLeft = useMemo(() => {
    if (!revision || nextIndex == null) return 0;
    return revision.legs.filter((l) => l.from >= nextIndex).reduce((s, l) => s + (l.duration_s ?? 0), 0);
  }, [revision, nextIndex]);

  // ---- sheet ----
  const [selected, setSelected] = useState<number | null>(null);
  const mapHandle = useRef<TrailMapHandle | null>(null);
  const select = (i: number) => { setSelected(i); mapHandle.current?.focus(stops[i]); };

  // ---- actions ----
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try { await walk.start(); if (params.get("start")) { params.delete("start"); setParams(params, { replace: true }); } }
    catch (e) { toast({ title: "Couldn't start the trail", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const autoStarted = useRef(false);
  useEffect(() => {
    if (params.get("start") === "1" && trail?.revision && !isPreview && !walk.loading && !open && !autoStarted.current) {
      autoStarted.current = true; start();
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const markVisited = async (i: number) => {
    setBusy(true);
    try {
      const res = await walk.manualCheckin(stops[i].marker_id);
      if (!res) toast({ title: "Saved on this device", description: "We'll confirm this visit when you're back online." });
      else if (res.duplicate) toast({ title: "Already visited", description: "This stop only counts once." });
      else toast({ title: `Stop ${i + 1} visited`, description: "Marked as unverified. Scan the marker's QR code to verify it." });
      if (res?.reward) celebrate({ awarded: true, ...res.reward });
      const nxt = stops.findIndex((s, j) => j !== i && !checked.has(s.marker_id));
      if (nxt >= 0) setTimeout(() => mapHandle.current?.focus(stops[nxt]), 400);
      setSelected(null);
    } catch (e) {
      toast({ title: "Check-in failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const share = async () => {
    const url = `${window.location.origin}/trails/${slug}`;
    const text = complete ? `I walked the ${trail?.title} trail on MarkerQuest: ${visitedCount} historical stops.` : trail?.title ?? "MarkerQuest trail";
    try {
      if (navigator.share) await navigator.share({ title: trail?.title, text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); toast({ title: "Link copied" }); }
    } catch { /* cancelled */ }
  };

  if (isLoading) return <div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!trail || (!trail.revision && !isAdmin)) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h2 className="font-display text-lg font-medium text-foreground">Trail not found</h2>
        <p className="text-sm text-on-surface-variant">This trail isn't published, or the link is wrong.</p>
        <button onClick={() => navigate("/trails")} className="h-11 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground">See all trails</button>
      </div>
    );
  }

  const sel = selected != null ? stops[selected] : null;
  const selMarker = sel ? markerById.get(sel.marker_id) : null;
  const selState = selected != null ? states[selected] : "upcoming";
  const selCheck = sel ? checked.get(sel.marker_id) : undefined;

  const stopSheet = sel && (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">{selected! + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-tight text-foreground">{sel.name}</h3>
          <p className="text-xs text-on-surface-variant">
            {selCheck?.pending ? "Pending confirmation" : selCheck ? (selCheck.verified ? "Visited · QR verified" : "Visited · unverified") : selState === "current" ? "Next stop" : "Not visited yet"}
          </p>
        </div>
      </div>
      <img src={getMarkerImage(sel.marker_id)} alt={sel.name} className="h-40 w-full rounded-xl object-cover" />
      {sel.note && <p className="rounded-xl bg-primary/10 p-3 text-sm text-foreground">{sel.note}</p>}
      {selMarker?.summary && <p className="text-sm text-on-surface-variant">{selMarker.summary}</p>}
      <div className="flex flex-col gap-2">
        <button onClick={() => navigate(`/marker/${sel.marker_id}`)} className="flex h-11 items-center justify-center gap-1 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground">
          Read full history <ChevronRight className="h-4 w-4" />
        </button>
        {open && !selCheck && (
          <>
            {user && (
              <button onClick={() => navigate("/map?scan=1")} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground">
                <QrCode className="h-4 w-4" /> Scan QR to check in
              </button>
            )}
            <button disabled={busy} onClick={() => markVisited(selected!)} className="h-11 rounded-xl border border-border text-sm font-medium text-foreground disabled:opacity-60">
              Mark as visited (unverified)
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <PageHeader title={trail.title} back right={
        <button onClick={share} aria-label="Share trail" className="flex h-10 w-10 items-center justify-center rounded-xl text-primary"><Share2 className="h-5 w-5" /></button>
      } />

      {isPreview && (
        <p className="mx-4 mb-2 rounded-xl bg-accent/20 px-3 py-2 text-xs text-foreground">
          Admin preview of the draft. Visitors don't see this until it's published.{draft.error ? ` Route: ${draft.error}` : ""}
        </p>
      )}

      {/* Map */}
      <div className="relative mx-4 h-[52dvh] overflow-hidden rounded-2xl elevation-1">
        <TrailMap
          stops={stops}
          legs={revision?.legs ?? []}
          states={states}
          currentIndex={nextIndex}
          user={pos}
          approach={approach?.path}
          follow={follow}
          onSelect={select}
          onUserPan={() => setFollow(false)}
          handleRef={mapHandle}
        />
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button aria-label="Show entire trail" onClick={() => mapHandle.current?.fitAll()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-card/90 text-foreground backdrop-blur elevation-1"><Maximize2 className="h-5 w-5" /></button>
          <button aria-label="Recenter on my location" onClick={() => { startWatch(); mapHandle.current?.recenter(); }} className="flex h-11 w-11 items-center justify-center rounded-xl bg-card/90 text-foreground backdrop-blur elevation-1"><Crosshair className="h-5 w-5" /></button>
          <button aria-label={follow ? "Stop following my location" : "Follow my location"} aria-pressed={follow} onClick={() => { startWatch(); setFollow((f) => !f); }}
            className={`flex h-11 w-11 items-center justify-center rounded-xl backdrop-blur elevation-1 ${follow ? "bg-primary text-primary-foreground" : "bg-card/90 text-foreground"}`}><Navigation className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="space-y-4 px-4 pb-10 pt-4">
        {geoError && <p className="rounded-xl bg-surface-variant p-3 text-xs text-on-surface-variant">{geoError}</p>}

        {/* Walking panel */}
        {open && !complete && (
          <section className="space-y-3 rounded-2xl bg-card p-4 elevation-1" aria-live="polite">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">{paused ? "Paused" : "Next stop"}</p>
              <p className="text-xs font-medium text-primary">{visitedCount} of {required.length} stops visited</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-variant">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${required.length ? (visitedCount / required.length) * 100 : 0}%` }} />
            </div>
            {next && (
              <button onClick={() => select(nextIndex!)} className="flex w-full items-center gap-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">{nextIndex! + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold text-foreground">{next.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {toNext
                      ? `${formatDistance(toNext.d)} · ~${formatDuration(toNext.t)} walk${toNext.exact ? "" : " (straight-line estimate)"}`
                      : "Turn on location to see the distance"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-on-surface-variant" />
              </button>
            )}
            {approach && visitedCount === 0 && <p className="text-xs text-on-surface-variant">The dotted gray line is your walk to the start. The colored line is the trail.</p>}
            {routeError && <p className="text-xs text-on-surface-variant">Walking directions from your location aren't available: {routeError}</p>}
            {!user && <p className="text-xs text-on-surface-variant">You're walking as a guest. Progress is saved on this device, and visits stay unverified. Sign in to verify with QR and earn Quest Coins.</p>}
            <p className="flex items-center gap-1 text-xs text-on-surface-variant"><Clock className="h-3 w-3" /> About {formatDuration(walkingLeft)} of walking left, not counting time at stops.</p>
            <div className="flex gap-2">
              <button onClick={() => walk.setStatus(paused ? "resume" : "pause")} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground">
                {paused ? <><Play className="h-4 w-4" />Resume</> : <><Pause className="h-4 w-4" />Pause</>}
              </button>
              <button onClick={() => { if (confirm("Exit this trail? Your visits so far stay on your record.")) walk.setStatus("exit"); }} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium text-foreground">
                <X className="h-4 w-4" />Exit
              </button>
            </div>
          </section>
        )}

        {/* Arrival prompt */}
        {arrived && next && !checked.has(next.marker_id) && (
          <section className="space-y-2 rounded-2xl border-2 border-primary bg-primary/10 p-4" role="status">
            <p className="font-display text-base font-semibold text-foreground">You're near {next.name}</p>
            <p className="text-xs text-on-surface-variant">Check in to count this stop. Being nearby doesn't count on its own.</p>
            <div className="flex gap-2">
              {user && <button onClick={() => navigate("/map?scan=1")} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground"><QrCode className="h-4 w-4" />Scan QR</button>}
              <button disabled={busy} onClick={() => markVisited(nextIndex!)} className="h-11 flex-1 rounded-xl border border-border text-sm font-medium text-foreground">Mark visited</button>
            </div>
          </section>
        )}

        {/* Completion */}
        {complete && (
          <section className="space-y-3 rounded-2xl p-5 text-center elevation-2" style={{ background: "var(--gradient-quest, hsl(var(--card)))" }}>
            <p className="text-xs font-medium uppercase tracking-widest text-quest-gold">Trail complete</p>
            <h2 className="font-display text-2xl font-semibold text-foreground">{trail.title}</h2>
            <p className="text-sm text-on-surface-variant">{visitedCount} stops · {formatDistance(revision?.distance_m ?? 0)} · {getCity(trail.city).name}</p>
            <ul className="space-y-1 text-left">
              {stops.map((s, i) => {
                const c = checked.get(s.marker_id);
                return (
                  <li key={s.marker_id} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary" />{i + 1}. {s.name}
                    <span className="ml-auto text-[11px] text-on-surface-variant">{c?.verified ? "QR verified" : c ? "Unverified" : "Optional"}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <button onClick={share} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground"><Share2 className="h-4 w-4" />Share</button>
              <button onClick={() => navigate("/trails")} className="h-11 flex-1 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground">More trails</button>
            </div>
          </section>
        )}

        {/* Overview + start */}
        {!open && !complete && (
          <section className="space-y-3">
            {trail.description && <p className="text-sm text-foreground">{trail.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
              <span>{stops.length} stops</span>
              <span>{formatDistance(revision?.distance_m ?? 0)}</span>
              <span>~{formatDuration(revision?.duration_s ?? 0)} walking</span>
              {trail.is_loop && <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />Loop</span>}
              <span>{trail.theme}</span>
            </div>
            <p className="text-xs text-on-surface-variant">Accessibility: {trail.accessibility || "Not verified"} · Terrain: {trail.terrain || "Not verified"}</p>
            {!isPreview && (
              <button disabled={busy} onClick={start} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground elevation-1 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Footprints className="h-4 w-4" />}
                {walk.session?.status === "exited" ? "Start again" : "Start Trail"}
              </button>
            )}
          </section>
        )}

        {/* Accessible stop list */}
        <section aria-label="Trail stops">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-on-surface-variant">Stops in suggested order</h2>
          <ol className="space-y-2">
            {stops.map((s, i) => (
              <li key={s.marker_id}>
                <button onClick={() => select(i)} className={`flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left elevation-1 ${states[i] === "current" ? "ring-2 ring-primary" : ""}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${states[i] === "done" ? "bg-quest-gold text-foreground" : states[i] === "current" ? "bg-primary text-primary-foreground" : "bg-surface-variant text-foreground"}`}>
                    {states[i] === "done" ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {states[i] === "pending" ? "Pending confirmation" : states[i] === "done" ? (checked.get(s.marker_id)?.verified ? "Visited · QR verified" : "Visited · unverified") : states[i] === "current" ? "Next stop" : s.required === false ? "Optional" : "Upcoming"}
                      {revision?.legs.find((l) => l.from === i && l.ok) && ` · ${formatDistance(revision!.legs.find((l) => l.from === i)!.distance_m ?? 0)} to next`}
                    </p>
                  </div>
                  <MapPin className="h-4 w-4 text-on-surface-variant" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {isMobile ? (
        <Drawer open={selected != null} onOpenChange={(o) => !o && setSelected(null)}>
          <DrawerContent className="max-h-[85dvh] overflow-y-auto">
            <DrawerTitle className="sr-only">{sel?.name ?? "Stop"}</DrawerTitle>
            {stopSheet}
          </DrawerContent>
        </Drawer>
      ) : selected != null && (
        <aside className="fixed right-4 top-20 z-40 max-h-[80vh] w-96 overflow-y-auto rounded-2xl bg-card elevation-3" aria-label="Stop details">
          <button aria-label="Close" onClick={() => setSelected(null)} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant"><X className="h-4 w-4" /></button>
          {stopSheet}
        </aside>
      )}
    </div>
  );
};

export default TrailDetailPage;
