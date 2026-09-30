import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { usePublishedTrails } from "@/lib/trails";
import DiscoveryReveal from "@/components/DiscoveryReveal";
import { callDiscovery, REVEAL_STYLES, type RevealContent, type RevealStyle } from "@/lib/discovery";

const input = "mt-1 w-full rounded-lg bg-surface-variant px-3 py-2.5 text-sm text-foreground outline-none";
const label = "block text-xs font-medium text-on-surface-variant";
const TIMEZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Anchorage", "Pacific/Honolulu", "America/Phoenix", "UTC"];

// ---- timezone helpers: creator enters wall-clock time in their chosen zone; we store UTC ----
function tzOffsetMs(date: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(date).map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - date.getTime();
}
function localToIso(local: string, tz: string) {
  if (!local) return null;
  const [d, t] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = (t ?? "00:00").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, h, min);
  return new Date(guess - tzOffsetMs(new Date(guess), tz)).toISOString();
}
function isoToLocal(iso: string | null, tz: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() + tzOffsetMs(d, tz)).toISOString().slice(0, 16);
}

interface Media { path: string; alt: string; credit: string; }
interface State {
  marker_type: "physical" | "digital";
  discovery_visibility: "visible" | "mystery" | "unlisted";
  reveal_style: RevealStyle;
  sensitivity: "standard" | "sensitive";
  arrival_radius_m: number;
  from: string; until: string; tz: string;
  clue: string;
  review_status: "approved" | "needs_review";
  enabled: boolean;
  bonus_story: string; reflection_prompt: string; audio_path: string | null; gallery: Media[];
  reward_kind: "none" | "postcard" | "badge" | "quest"; reward_quest: number; reward_badge_code: string;
  reward_scope: "marker" | "campaign"; campaign_code: string;
  hasPostcard: boolean;
  pc_title: string; pc_location: string; pc_front_path: string | null; pc_alt: string; pc_back: string; pc_credits: string;
  pc_set: string; pc_secret: boolean; pc_commemorative: boolean;
  prereqs: { requires_type: "marker" | "trail"; requires_id: string }[];
}

const empty: State = {
  marker_type: "physical", discovery_visibility: "visible", reveal_style: "postcard_flip", sensitivity: "standard",
  arrival_radius_m: 75, from: "", until: "", tz: "America/Los_Angeles", clue: "", review_status: "approved", enabled: false,
  bonus_story: "", reflection_prompt: "", audio_path: null, gallery: [],
  reward_kind: "postcard", reward_quest: 0, reward_badge_code: "", reward_scope: "marker", campaign_code: "",
  hasPostcard: false, pc_title: "", pc_location: "", pc_front_path: null, pc_alt: "", pc_back: "", pc_credits: "",
  pc_set: "", pc_secret: false, pc_commemorative: false, prereqs: [],
};

async function upload(slug: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("postcard-art").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

/** "Discovery & Rewards" section of the marker builder. */
const DiscoveryEditor = ({ slug, markerName }: { slug: string; markerName: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const allMarkers = useAllMarkers();
  const { data: trails } = usePublishedTrails();
  const [s, setS] = useState<State>(empty);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ content: RevealContent; sensitive: boolean } | null>(null);
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));

  const { data: badges } = useQuery({
    queryKey: ["achievements-list"],
    queryFn: async () => (await supabase.from("achievements").select("code,name").order("sort_order")).data ?? [],
  });
  const { data: sets, refetch: refetchSets } = useQuery({
    queryKey: ["postcard-sets"],
    queryFn: async () => (await supabase.from("postcard_sets").select("code,name")).data ?? [],
  });

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setErrors([]);
    (async () => {
      const [{ data: m }, { data: c }, { data: pc }, { data: pr }] = await Promise.all([
        supabase.from("markers").select("*").eq("slug", slug).maybeSingle(),
        supabase.from("discovery_content").select("*").eq("marker_slug", slug).maybeSingle(),
        supabase.from("postcards").select("*").eq("marker_slug", slug).maybeSingle(),
        supabase.from("discovery_prerequisites").select("requires_type,requires_id").eq("marker_slug", slug),
      ]);
      if (!active) return;
      const tz = m?.availability_tz || "America/Los_Angeles";
      setS({
        ...empty,
        marker_type: (m?.marker_type as State["marker_type"]) ?? "physical",
        discovery_visibility: (m?.discovery_visibility as State["discovery_visibility"]) ?? "visible",
        reveal_style: (m?.reveal_style as RevealStyle) ?? "postcard_flip",
        sensitivity: (m?.sensitivity as State["sensitivity"]) ?? "standard",
        arrival_radius_m: m?.arrival_radius_m ?? 75,
        from: isoToLocal(m?.available_from ?? null, tz), until: isoToLocal(m?.available_until ?? null, tz), tz,
        clue: m?.clue ?? "", review_status: (m?.review_status as State["review_status"]) ?? "approved",
        enabled: c?.enabled ?? false,
        bonus_story: c?.bonus_story ?? "", reflection_prompt: c?.reflection_prompt ?? "", audio_path: c?.audio_path ?? null,
        gallery: Array.isArray(c?.gallery) ? (c!.gallery as unknown as Media[]) : [],
        reward_kind: (c?.reward_kind as State["reward_kind"]) ?? "postcard", reward_quest: c?.reward_quest ?? 0,
        reward_badge_code: c?.reward_badge_code ?? "", reward_scope: (c?.reward_scope as State["reward_scope"]) ?? "marker",
        campaign_code: c?.campaign_code ?? "",
        hasPostcard: Boolean(pc),
        pc_title: pc?.title ?? "", pc_location: pc?.location ?? "", pc_front_path: pc?.front_path ?? null, pc_alt: pc?.front_alt ?? "",
        pc_back: pc?.back_text ?? "", pc_credits: pc?.credits ?? "", pc_set: pc?.set_code ?? "", pc_secret: pc?.secret_title ?? false,
        pc_commemorative: pc?.commemorative ?? false,
        prereqs: (pr ?? []) as State["prereqs"],
      });
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [slug]);

  const persist = async (enabled: boolean) => {
    const { error: mErr } = await supabase.from("markers").update({
      marker_type: s.marker_type, discovery_visibility: s.discovery_visibility, reveal_style: s.reveal_style,
      sensitivity: s.sensitivity, arrival_radius_m: Math.round(s.arrival_radius_m),
      available_from: localToIso(s.from, s.tz), available_until: localToIso(s.until, s.tz), availability_tz: s.tz,
      clue: s.clue.trim() || null, review_status: s.review_status,
    }).eq("slug", slug);
    if (mErr) throw mErr;
    const { error: cErr } = await supabase.from("discovery_content").upsert({
      marker_slug: slug, enabled, bonus_story: s.bonus_story.trim() || null, reflection_prompt: s.reflection_prompt.trim() || null,
      audio_path: s.audio_path, gallery: s.gallery as unknown as never, reward_kind: s.reward_kind,
      reward_quest: s.reward_kind === "quest" ? Math.round(s.reward_quest) : 0,
      reward_badge_code: s.reward_kind === "badge" ? s.reward_badge_code || null : null,
      reward_scope: s.reward_scope, campaign_code: s.reward_scope === "campaign" ? s.campaign_code.trim() || null : null,
      created_by: user?.id ?? null, updated_at: new Date().toISOString(),
    }, { onConflict: "marker_slug" });
    if (cErr) throw cErr;
    if (s.hasPostcard) {
      const { error } = await supabase.from("postcards").upsert({
        marker_slug: slug, title: s.pc_title.trim() || markerName, location: s.pc_location.trim(), front_path: s.pc_front_path,
        front_alt: s.pc_alt.trim(), back_text: s.pc_back.trim(), credits: s.pc_credits.trim(), set_code: s.pc_set || null,
        secret_title: s.pc_secret, commemorative: s.pc_commemorative, created_by: user?.id ?? null,
      }, { onConflict: "marker_slug" });
      if (error) throw error;
    } else {
      await supabase.from("postcards").delete().eq("marker_slug", slug);
    }
    await supabase.from("discovery_prerequisites").delete().eq("marker_slug", slug);
    const pr = s.prereqs.filter((p) => p.requires_id);
    if (pr.length) {
      const { error } = await supabase.from("discovery_prerequisites").insert(pr.map((p) => ({ marker_slug: slug, ...p })));
      if (error) throw error;
    }
    qc.invalidateQueries({ queryKey: ["discovery-status"] });
    qc.invalidateQueries({ queryKey: ["db-markers"] });
  };

  const run = async (kind: "draft" | "publish" | "unpublish") => {
    setBusy(kind);
    setErrors([]);
    try {
      if (s.from && s.until && s.until <= s.from) throw new Error("The end date must be after the start date.");
      if (kind === "publish") {
        await persist(s.enabled);
        const v = await callDiscovery<{ ok: boolean; errors: string[] }>({ action: "validate", marker_slug: slug, prereqs: s.prereqs });
        if (!v.ok) {
          setErrors(v.errors);
          toast({ title: "Fix these before publishing", variant: "destructive" });
          return;
        }
        await persist(true);
        set("enabled", true);
        toast({ title: "Discovery published" });
      } else {
        await persist(false);
        set("enabled", false);
        toast({ title: kind === "draft" ? "Draft saved" : "Discovery unpublished" });
      }
    } catch (e) {
      toast({ title: "Couldn't save", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const openPreview = async () => {
    setBusy("preview");
    try {
      await persist(s.enabled);
      const r = await callDiscovery<{ reveal: RevealContent; sensitivity: string }>({ action: "preview", marker_slug: slug });
      setPreview({ content: r.reveal, sensitive: r.sensitivity === "sensitive" });
    } catch (e) {
      toast({ title: "Preview failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (file: File | undefined, apply: (path: string) => void) => {
    if (!file) return;
    setBusy("upload");
    try {
      apply(await upload(slug, file));
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const createSet = async () => {
    const name = window.prompt("Postcard set name (e.g. Hilltop Stories)");
    if (!name?.trim()) return;
    const code = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const { error } = await supabase.from("postcard_sets").insert({ code, name: name.trim(), created_by: user?.id ?? null });
    if (error) return toast({ title: "Couldn't create set", description: error.message, variant: "destructive" });
    await refetchSets();
    set("pc_set", code);
  };

  const setSensitivity = (v: State["sensitivity"]) =>
    setS((p) => ({
      ...p, sensitivity: v,
      ...(v === "sensitive" ? { reveal_style: "quiet_fade" as RevealStyle, reward_kind: p.reward_kind === "quest" ? ("postcard" as const) : p.reward_kind, pc_commemorative: true } : {}),
    }));

  if (!loaded) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const markerOptions = allMarkers.filter((m) => m.id !== slug);

  return (
    <div className="space-y-4 rounded-xl bg-card p-4 elevation-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-display font-medium text-card-foreground">
          <Sparkles className="h-4 w-4 text-quest-gold" /> Discovery &amp; Rewards
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.enabled ? "bg-primary text-primary-foreground" : "bg-surface-variant text-on-surface-variant"}`}>
          {s.enabled ? "Published" : "Draft"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={label}>Marker type
          <select className={input} value={s.marker_type} onChange={(e) => set("marker_type", e.target.value as State["marker_type"])}>
            <option value="physical">Physical QR marker</option>
            <option value="digital">Digital only</option>
          </select>
        </label>
        <label className={label}>Visibility
          <select className={input} value={s.discovery_visibility} onChange={(e) => set("discovery_visibility", e.target.value as State["discovery_visibility"])}>
            <option value="visible">Visible</option>
            <option value="mystery">Mystery</option>
            <option value="unlisted">Unlisted until unlocked</option>
          </select>
        </label>
        <label className={label}>Site sensitivity
          <select className={input} value={s.sensitivity} onChange={(e) => setSensitivity(e.target.value as State["sensitivity"])}>
            <option value="standard">Standard</option>
            <option value="sensitive">Sensitive / commemorative</option>
          </select>
        </label>
        <label className={label}>Reveal animation
          <select className={input} value={s.reveal_style} onChange={(e) => set("reveal_style", e.target.value as RevealStyle)}>
            {REVEAL_STYLES.filter((r) => s.sensitivity !== "sensitive" || r.value === "quiet_fade" || r.value === "none").map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>
      {s.sensitivity === "sensitive" && (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
          Sensitive sites use Quiet Fade, no celebrations or rarity wording, and Quest Coin rewards default to off.
        </p>
      )}
      {s.marker_type === "digital" && (
        <label className={label}>Arrival radius (meters, 15–1000)
          <input type="number" min={15} max={1000} className={input} value={s.arrival_radius_m} onChange={(e) => set("arrival_radius_m", Number(e.target.value))} />
        </label>
      )}
      {s.marker_type === "physical" && (
        <p className="text-xs text-on-surface-variant">Uses this marker's existing QR code (shown above). Visitors must scan it with the MarkerQuest scanner.</p>
      )}
      {s.discovery_visibility === "mystery" && (
        <label className={label}>Clue shown on the map
          <input className={input} maxLength={200} value={s.clue} onChange={(e) => set("clue", e.target.value)} />
        </label>
      )}

      {/* Availability */}
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>Starts (optional)
          <input type="datetime-local" className={input} value={s.from} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label className={label}>Ends (optional)
          <input type="datetime-local" className={input} value={s.until} onChange={(e) => set("until", e.target.value)} />
        </label>
        <label className={`${label} col-span-2`}>Timezone
          <select className={input} value={s.tz} onChange={(e) => set("tz", e.target.value)}>
            {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>

      {/* Postcard */}
      <label className="flex items-center gap-2 text-sm text-card-foreground">
        <input type="checkbox" checked={s.hasPostcard} onChange={(e) => set("hasPostcard", e.target.checked)} />
        {s.sensitivity === "sensitive" ? "Commemorative postcard" : "Collectible postcard"}
      </label>
      {s.hasPostcard && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <label className={label}>Title<input className={input} value={s.pc_title} placeholder={markerName} onChange={(e) => set("pc_title", e.target.value)} /></label>
          <label className={label}>Location<input className={input} value={s.pc_location} onChange={(e) => set("pc_location", e.target.value)} /></label>
          <label className={label}>Front artwork
            <input type="file" accept="image/*" className="mt-1 block text-xs" onChange={(e) => onFile(e.target.files?.[0], (p) => set("pc_front_path", p))} />
            {s.pc_front_path && <span className="text-[11px] text-primary">Artwork uploaded</span>}
          </label>
          <label className={label}>Artwork alt text<input className={input} value={s.pc_alt} onChange={(e) => set("pc_alt", e.target.value)} /></label>
          <label className={label}>Back: short historical description
            <textarea rows={3} maxLength={600} className={input} value={s.pc_back} onChange={(e) => set("pc_back", e.target.value)} />
          </label>
          <label className={label}>Image credits / attribution<input className={input} value={s.pc_credits} onChange={(e) => set("pc_credits", e.target.value)} /></label>
          <div className="flex items-end gap-2">
            <label className={`${label} flex-1`}>Postcard set
              <select className={input} value={s.pc_set} onChange={(e) => set("pc_set", e.target.value)}>
                <option value="">No set</option>
                {(sets ?? []).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={createSet} className="rounded-lg bg-secondary px-3 py-2.5 text-xs font-medium text-secondary-foreground">New set</button>
          </div>
          <label className="flex items-center gap-2 text-xs text-card-foreground">
            <input type="checkbox" checked={s.pc_secret} onChange={(e) => set("pc_secret", e.target.checked)} /> Hide the title until collected
          </label>
        </div>
      )}

      {/* Other unlockables */}
      <label className={label}>{s.sensitivity === "sensitive" ? "Remembrance text" : "Bonus story"} (optional)
        <textarea rows={4} maxLength={8000} className={input} value={s.bonus_story} onChange={(e) => set("bonus_story", e.target.value)} />
      </label>
      <div>
        <span className={label}>Image gallery (optional)</span>
        {s.gallery.map((g, i) => (
          <div key={g.path} className="mt-1 flex gap-2">
            <input className={input} placeholder="Alt text" value={g.alt} onChange={(e) => set("gallery", s.gallery.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
            <input className={input} placeholder="Credit" value={g.credit} onChange={(e) => set("gallery", s.gallery.map((x, j) => (j === i ? { ...x, credit: e.target.value } : x)))} />
            <button type="button" aria-label="Remove image" onClick={() => set("gallery", s.gallery.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></button>
          </div>
        ))}
        <input type="file" accept="image/*" className="mt-1 block text-xs" onChange={(e) => onFile(e.target.files?.[0], (p) => set("gallery", [...s.gallery, { path: p, alt: "", credit: "" }]))} />
      </div>
      <label className={label}>Audio (optional)
        <input type="file" accept="audio/*" className="mt-1 block text-xs" onChange={(e) => onFile(e.target.files?.[0], (p) => set("audio_path", p))} />
        {s.audio_path && (
          <span className="text-[11px] text-primary">Audio uploaded · <button type="button" className="underline" onClick={() => set("audio_path", null)}>remove</button></span>
        )}
      </label>
      {s.sensitivity === "sensitive" && (
        <label className={label}>Reflection prompt (optional)
          <input className={input} maxLength={300} value={s.reflection_prompt} onChange={(e) => set("reflection_prompt", e.target.value)} />
        </label>
      )}

      {/* Reward */}
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>Completion reward
          <select className={input} value={s.reward_kind} onChange={(e) => set("reward_kind", e.target.value as State["reward_kind"])}>
            <option value="none">No reward</option>
            <option value="postcard">Postcard</option>
            <option value="badge">Existing badge</option>
            <option value="quest">Quest Coins</option>
          </select>
        </label>
        {s.reward_kind === "quest" && (
          <label className={label}>Quest Coin amount
            <input type="number" min={1} max={1000} className={input} value={s.reward_quest} onChange={(e) => set("reward_quest", Number(e.target.value))} />
          </label>
        )}
        {s.reward_kind === "badge" && (
          <label className={label}>Badge
            <select className={input} value={s.reward_badge_code} onChange={(e) => set("reward_badge_code", e.target.value)}>
              <option value="">Pick a badge</option>
              {(badges ?? []).map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </label>
        )}
        <label className={label}>Reward scope
          <select className={input} value={s.reward_scope} onChange={(e) => set("reward_scope", e.target.value as State["reward_scope"])}>
            <option value="marker">First completion of this marker</option>
            <option value="campaign">First completion in a campaign</option>
          </select>
        </label>
        {s.reward_scope === "campaign" && (
          <label className={label}>Campaign code<input className={input} value={s.campaign_code} onChange={(e) => set("campaign_code", e.target.value)} /></label>
        )}
      </div>
      {s.sensitivity === "sensitive" && s.reward_kind === "quest" && (
        <p className="text-xs text-on-surface-variant">Quest Coins on a sensitive site is paid quietly, with no celebration.</p>
      )}

      {/* Prerequisites */}
      <div>
        <span className={label}>Requirements (optional)</span>
        {s.prereqs.map((p, i) => (
          <div key={i} className="mt-1 flex gap-2">
            <select className={input} value={p.requires_type} onChange={(e) => set("prereqs", s.prereqs.map((x, j) => (j === i ? { requires_type: e.target.value as "marker" | "trail", requires_id: "" } : x)))}>
              <option value="marker">Marker discovered</option>
              <option value="trail">Trail completed</option>
            </select>
            <select className={input} value={p.requires_id} onChange={(e) => set("prereqs", s.prereqs.map((x, j) => (j === i ? { ...x, requires_id: e.target.value } : x)))}>
              <option value="">Choose…</option>
              {p.requires_type === "marker"
                ? markerOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)
                : (trails ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button type="button" aria-label="Remove requirement" onClick={() => set("prereqs", s.prereqs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></button>
          </div>
        ))}
        <button type="button" onClick={() => set("prereqs", [...s.prereqs, { requires_type: "marker", requires_id: "" }])} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
          <Plus className="h-3.5 w-3.5" /> Add requirement
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-card-foreground">
        <input type="checkbox" checked={s.review_status === "needs_review"} onChange={(e) => set("review_status", e.target.checked ? "needs_review" : "approved")} />
        Content needs review (blocks publishing)
      </label>

      {errors.length > 0 && (
        <ul role="alert" className="list-disc space-y-1 rounded-lg bg-destructive/10 py-2 pl-7 pr-3 text-xs text-destructive">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!!busy} onClick={() => run("draft")} className="rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground disabled:opacity-60">
          {busy === "draft" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save draft"}
        </button>
        <button type="button" disabled={!!busy} onClick={openPreview} className="flex items-center justify-center gap-1 rounded-xl border border-border py-3 text-sm font-medium text-card-foreground disabled:opacity-60">
          {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Eye className="h-4 w-4" /> Preview</>}
        </button>
        <button type="button" disabled={!!busy} onClick={() => run("publish")} className="col-span-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {busy === "publish" ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : s.enabled ? "Publish update" : "Publish discovery"}
        </button>
        {s.enabled && (
          <button type="button" disabled={!!busy} onClick={() => run("unpublish")} className="col-span-2 text-xs text-on-surface-variant underline">
            Unpublish
          </button>
        )}
      </div>

      {preview && (
        <DiscoveryReveal
          open
          preview
          onClose={() => setPreview(null)}
          style={s.reveal_style}
          sensitive={preview.sensitive}
          markerName={markerName}
          content={preview.content}
          outcome="Preview only. No check-in or reward was recorded."
        />
      )}
    </div>
  );
};

export default DiscoveryEditor;
