import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMarkerImage } from "@/lib/markerImages";
import type { QuestAward } from "@/hooks/useQuest";

export const TRAIL_THEMES = [
  "Black history",
  "Indigenous heritage",
  "Public art",
  "Community stories",
  "Architecture",
  "Industry & labor",
  "Waterfront",
  "Other",
];

export interface RevisionStop {
  marker_id: string;
  name: string;
  lat: number;
  lng: number;
  required: boolean;
  note: string;
}
export interface Leg {
  from: number;
  to: number;
  ok: boolean;
  polyline?: string;
  distance_m?: number;
  duration_s?: number;
  error?: string;
}
export interface TrailRevision {
  id: string;
  trail_id: string;
  version: number;
  stops: RevisionStop[];
  legs: Leg[];
  distance_m: number;
  duration_s: number;
}
export interface TrailRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_path: string | null;
  city: string;
  theme: string;
  accessibility: string | null;
  terrain: string | null;
  is_loop: boolean;
  status: "draft" | "published" | "archived";
  current_revision_id: string | null;
  updated_at: string;
}
export interface PublishedTrail extends TrailRow {
  revision: TrailRevision;
  coverUrl: string;
}

// ---------- geometry ----------

/** Decode a Google encoded polyline. */
export function decodePolyline(str: string): { lat: number; lng: number }[] {
  const out: { lat: number; lng: number }[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d; else lng += d;
    }
    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number) {
  const mi = m / 1609.344;
  return mi < 0.1 ? `${Math.round(m * 3.281)} ft` : `${mi.toFixed(mi < 10 ? 1 : 0)} mi`;
}
export function formatDuration(s: number) {
  const min = Math.max(1, Math.round(s / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}
/** Walking pace used for estimates when only a straight-line distance is known (~4.8 km/h). */
export const WALK_MPS = 1.34;

// ---------- data ----------

function coverFor(t: TrailRow, rev?: TrailRevision | null): string {
  if (t.cover_path) {
    const { data } = supabase.storage.from("trail-covers").getPublicUrl(t.cover_path);
    // Bucket is private; signed URLs are resolved lazily in useCoverUrl. Public URL kept as a fallback key.
    return data.publicUrl;
  }
  const first = rev?.stops?.[0]?.marker_id;
  return first ? getMarkerImage(first) : "";
}

async function signCover(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("trail-covers").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

async function attachRevisions(rows: TrailRow[]): Promise<PublishedTrail[]> {
  const ids = rows.map((r) => r.current_revision_id).filter(Boolean) as string[];
  if (!ids.length) return [];
  const { data: revs } = await supabase.from("trail_revisions").select("*").in("id", ids);
  const byId = new Map((revs ?? []).map((r) => [r.id, r as unknown as TrailRevision]));
  const out: PublishedTrail[] = [];
  for (const t of rows) {
    const revision = t.current_revision_id ? byId.get(t.current_revision_id) : undefined;
    if (!revision) continue;
    const signed = await signCover(t.cover_path);
    out.push({ ...t, revision, coverUrl: signed ?? coverFor({ ...t, cover_path: null }, revision) });
  }
  return out;
}

export function usePublishedTrails() {
  return useQuery({
    queryKey: ["trails", "published"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trails").select("*").eq("status", "published").order("title");
      if (error) throw error;
      return attachRevisions((data ?? []) as TrailRow[]);
    },
  });
}

/** A trail by slug. Admins may also load drafts (preview) via `?preview=1`. */
export function useTrail(slug: string | undefined) {
  return useQuery({
    queryKey: ["trail", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await supabase.from("trails").select("*").eq("slug", slug!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [t] = await attachRevisions([data as TrailRow]);
      return t ?? { ...(data as TrailRow), revision: null, coverUrl: "" };
    },
  });
}

export async function loadRevision(id: string): Promise<TrailRevision | null> {
  const { data } = await supabase.from("trail_revisions").select("*").eq("id", id).maybeSingle();
  return (data as unknown as TrailRevision) ?? null;
}

// ---------- server calls ----------

export async function invokeFn<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let message = error.message;
    let extra: Record<string, unknown> = {};
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        extra = await ctx.json();
        if (extra?.error) message = String(extra.error);
      } catch { /* keep */ }
    }
    const err = new Error(message) as Error & { details?: Record<string, unknown> };
    err.details = extra;
    throw err;
  }
  return data as T;
}

// ---------- walking sessions ----------

export type CheckinMethod = "qr" | "manual";
export interface Checkin { marker_id: string; method: CheckinMethod; verified: boolean; pending?: boolean }
export interface WalkSession {
  id: string;
  trail_id: string;
  revision_id: string;
  status: "active" | "paused" | "completed" | "exited";
  started_at: string;
}

const GUEST_KEY = (trailId: string) => `markerquest_trail_guest_${trailId}`;
const PENDING_KEY = "markerquest_trail_pending";
const ACTIVE_KEY = "markerquest_active_trail";

export interface ActiveTrailContext { trailId: string; slug: string; sessionId: string | null; markerIds: string[] }
export function getActiveTrail(): ActiveTrailContext | null {
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null"); } catch { return null; }
}
function setActiveTrail(ctx: ActiveTrailContext | null) {
  try {
    if (ctx) localStorage.setItem(ACTIVE_KEY, JSON.stringify(ctx));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch { /* ignore */ }
}

interface PendingCheckin { sessionId: string; marker_id: string; method: CheckinMethod }
function readPending(): PendingCheckin[] {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]"); } catch { return []; }
}
function writePending(p: PendingCheckin[]) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export interface CheckinResult {
  ok: boolean;
  duplicate: boolean;
  verified: boolean;
  complete: boolean;
  reward: (QuestAward & { amount: number }) | null;
}

/** Record a QR-verified check-in for the active trail, if this marker belongs to it. */
export async function checkinActiveTrailFromScan(markerId: string): Promise<CheckinResult | null> {
  const ctx = getActiveTrail();
  if (!ctx?.sessionId || !ctx.markerIds.includes(markerId)) return null;
  return invokeFn<CheckinResult>("trail-session", { action: "checkin", session_id: ctx.sessionId, marker_id: markerId, method: "qr" });
}

interface GuestState { revisionId: string; status: WalkSession["status"]; startedAt: string; checkins: Checkin[] }

/**
 * Progress for one trail walk. Signed-in walkers are stored on the server; guests
 * keep progress on this device (unverified, no rewards).
 */
export function useTrailWalk(trail: PublishedTrail | null | undefined, userId: string | null) {
  const qc = useQueryClient();
  const trailId = trail?.id;
  const [guest, setGuest] = useState<GuestState | null>(null);
  const [pending, setPending] = useState<PendingCheckin[]>(readPending);

  useEffect(() => {
    if (!trailId || userId) return;
    try { setGuest(JSON.parse(localStorage.getItem(GUEST_KEY(trailId)) || "null")); } catch { setGuest(null); }
  }, [trailId, userId]);

  const saveGuest = useCallback((g: GuestState | null) => {
    if (!trailId) return;
    setGuest(g);
    try {
      if (g) localStorage.setItem(GUEST_KEY(trailId), JSON.stringify(g));
      else localStorage.removeItem(GUEST_KEY(trailId));
    } catch { /* ignore */ }
  }, [trailId]);

  const serverQ = useQuery({
    queryKey: ["trail-walk", trailId, userId],
    enabled: Boolean(trailId && userId),
    queryFn: async () => {
      const { data: sessions } = await supabase.from("trail_sessions").select("*")
        .eq("trail_id", trailId!).eq("user_id", userId!).order("started_at", { ascending: false }).limit(1);
      const session = (sessions?.[0] ?? null) as WalkSession | null;
      if (!session) return { session: null, checkins: [] as Checkin[] };
      const { data: rows } = await supabase.from("trail_checkins").select("marker_id, method, verified").eq("session_id", session.id);
      return { session, checkins: (rows ?? []) as Checkin[] };
    },
  });

  const session: WalkSession | null = userId
    ? (serverQ.data?.session ?? null)
    : guest ? { id: "guest", trail_id: trailId ?? "", revision_id: guest.revisionId, status: guest.status, started_at: guest.startedAt } : null;

  const baseCheckins: Checkin[] = userId ? (serverQ.data?.checkins ?? []) : (guest?.checkins ?? []);
  const checkins = useMemo(() => {
    const list = [...baseCheckins];
    for (const p of pending) {
      if (session && p.sessionId === session.id && !list.some((c) => c.marker_id === p.marker_id)) {
        list.push({ marker_id: p.marker_id, method: p.method, verified: false, pending: true });
      }
    }
    return list;
  }, [baseCheckins, pending, session]);

  // The walk may be on an older revision than the trail's current one.
  const [sessionRevision, setSessionRevision] = useState<TrailRevision | null>(null);
  useEffect(() => {
    if (!session || !trail?.revision) return setSessionRevision(null);
    if (session.revision_id === trail.revision.id) return setSessionRevision(trail.revision);
    loadRevision(session.revision_id).then(setSessionRevision);
  }, [session?.revision_id, trail?.revision]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOpen = session && (session.status === "active" || session.status === "paused");
  const revision = isOpen ? sessionRevision ?? trail?.revision ?? null : trail?.revision ?? null;

  // Keep the QR-scan context in step with the open walk.
  useEffect(() => {
    if (!trail) return;
    if (isOpen && session && revision) {
      setActiveTrail({ trailId: trail.id, slug: trail.slug, sessionId: userId ? session.id : null, markerIds: revision.stops.map((s) => s.marker_id) });
    } else if (getActiveTrail()?.trailId === trail.id) {
      setActiveTrail(null);
    }
  }, [trail, isOpen, session?.id, revision, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["trail-walk", trailId, userId] }), [qc, trailId, userId]);

  const flushPending = useCallback(async () => {
    const list = readPending();
    if (!list.length) return;
    const remaining: PendingCheckin[] = [];
    for (const p of list) {
      try {
        await invokeFn("trail-session", { action: "checkin", session_id: p.sessionId, marker_id: p.marker_id, method: p.method });
      } catch (e) {
        if (!navigator.onLine || /fetch|network/i.test(String((e as Error).message))) remaining.push(p);
      }
    }
    writePending(remaining);
    setPending(remaining);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    flushPending();
    window.addEventListener("online", flushPending);
    return () => window.removeEventListener("online", flushPending);
  }, [userId, flushPending]);

  const start = useCallback(async () => {
    if (!trail?.revision) return;
    if (!userId) {
      if (guest && (guest.status === "active" || guest.status === "paused")) return saveGuest({ ...guest, status: "active" });
      return saveGuest({ revisionId: trail.revision.id, status: "active", startedAt: new Date().toISOString(), checkins: [] });
    }
    await invokeFn("trail-session", { action: "start", trail_id: trail.id });
    await refresh();
  }, [trail, userId, guest, saveGuest, refresh]);

  const setStatus = useCallback(async (action: "pause" | "resume" | "exit") => {
    const status = action === "pause" ? "paused" : action === "resume" ? "active" : "exited";
    if (!userId) return guest && saveGuest({ ...guest, status });
    if (!session) return;
    await invokeFn("trail-session", { action, session_id: session.id });
    await refresh();
  }, [userId, guest, saveGuest, session, refresh]);

  const manualCheckin = useCallback(async (markerId: string): Promise<CheckinResult | null> => {
    if (!userId) {
      if (!guest || !revision) return null;
      if (guest.checkins.some((c) => c.marker_id === markerId)) return { ok: true, duplicate: true, verified: false, complete: false, reward: null };
      const next = [...guest.checkins, { marker_id: markerId, method: "manual" as const, verified: false }];
      const complete = revision.stops.filter((s) => s.required !== false).every((s) => next.some((c) => c.marker_id === s.marker_id));
      saveGuest({ ...guest, checkins: next, status: complete ? "completed" : guest.status });
      return { ok: true, duplicate: false, verified: false, complete, reward: null };
    }
    if (!session) return null;
    try {
      const res = await invokeFn<CheckinResult>("trail-session", { action: "checkin", session_id: session.id, marker_id: markerId, method: "manual" });
      await refresh();
      return res;
    } catch (e) {
      if (!navigator.onLine || /fetch|network|Failed to send/i.test(String((e as Error).message))) {
        const next = [...readPending(), { sessionId: session.id, marker_id: markerId, method: "manual" as const }];
        writePending(next);
        setPending(next);
        return null;
      }
      throw e;
    }
  }, [userId, guest, revision, saveGuest, session, refresh]);

  return { session, checkins, revision, loading: Boolean(userId) && serverQ.isLoading, start, setStatus, manualCheckin, refresh };
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function slugifyTrail(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").slice(0, 60);
}
