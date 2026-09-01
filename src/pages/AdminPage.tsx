import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Sparkles, Trash2, Pencil, LogOut, Inbox, X, QrCode, Undo2, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import MarkerQrCard from "@/components/MarkerQrCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDbMarkers, useAllMarkers } from "@/hooks/useAllMarkers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cities, DEFAULT_CITY_ID } from "@/data/cities";
import { categories, markers as staticMarkers, type Marker } from "@/data/markers";

interface SourceInput {
  name: string;
  url: string;
}

interface FormState {
  id: string | null;
  slug: string;
  /** True when editing a curated (code-based) marker, so the slug must stay fixed. */
  lockSlug: boolean;
  name: string;
  address: string;
  category: string;
  city: string;
  rarity: "common" | "rare";
  lat: string;
  lng: string;
  summary: string;
  story: string;
  sources: SourceInput[];
  panoId: string;
  heading: string;
  published: boolean;
}

const emptyForm: FormState = {
  id: null,
  slug: "",
  lockSlug: false,
  name: "",
  address: "",
  category: "Architecture",
  city: DEFAULT_CITY_ID,
  rarity: "common",
  lat: "",
  lng: "",
  summary: "",
  story: "",
  sources: [{ name: "", url: "" }],
  panoId: "",
  heading: "",
  published: true,
};

type SourceFilter = "all" | "edited" | "original" | "added";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);


const inputClass =
  "mt-1 w-full rounded-lg bg-surface-variant px-3 py-2.5 text-sm text-foreground outline-none";

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: dbMarkers, isLoading: markersLoading } = useDbMarkers();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const { data: requests } = useQuery({
    queryKey: ["marker-requests"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marker_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const dbRows = useMemo(() => dbMarkers ?? [], [dbMarkers]);
  const allMarkers = useAllMarkers();
  const staticIds = useMemo(() => new Set(staticMarkers.map((m) => m.id)), []);
  const dbSlugs = useMemo(() => new Set(dbRows.map((m) => m.id)), [dbRows]);

  /** Every site, tagged with where its current content comes from. */
  const listed = useMemo(() => {
    const rows = allMarkers.map((m) => {
      const inDb = dbSlugs.has(m.id);
      const curated = staticIds.has(m.id);
      const origin: SourceFilter = curated ? (inDb ? "edited" : "original") : "added";
      return { marker: m, origin, inDb, curated };
    });
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.origin === filter) &&
        (!q ||
          r.marker.name.toLowerCase().includes(q) ||
          (r.marker.address ?? "").toLowerCase().includes(q) ||
          r.marker.id.toLowerCase().includes(q)),
    );
  }, [allMarkers, dbSlugs, staticIds, filter, search]);


  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setPhoto(null);
    setExistingImagePath(null);
  };

  const draftWithAi = async () => {
    if (!form.name.trim()) {
      toast({ title: "Enter the marker name first.", variant: "destructive" });
      return;
    }
    setDrafting(true);
    const { data, error } = await supabase.functions.invoke("draft-marker", {
      body: { name: form.name.trim(), address: form.address.trim(), notes: form.summary.trim() },
    });
    setDrafting(false);

    if (error) {
      toast({ title: "Couldn't draft content", description: error.message, variant: "destructive" });
      return;
    }
    setForm((prev) => ({
      ...prev,
      summary: data?.summary || prev.summary,
      story: data?.story || prev.story,
    }));
    toast({ title: "Draft ready — review and edit before saving." });
  };

  const editMarker = async (slug: string) => {
    const { data, error } = await supabase.from("markers").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) {
      toast({ title: "Couldn't load that marker.", variant: "destructive" });
      return;
    }
    const sv = (data.street_view ?? {}) as { panoId?: string; heading?: number };
    const sources = Array.isArray(data.sources)
      ? (data.sources as unknown as SourceInput[]).map((s) => ({ name: s?.name ?? "", url: s?.url ?? "" }))
      : [];
    setForm({
      id: data.id,
      slug: data.slug,
      lockSlug: staticIds.has(data.slug),
      name: data.name,
      address: data.address ?? "",
      category: data.category ?? "Architecture",
      city: data.city ?? DEFAULT_CITY_ID,
      rarity: data.rarity === "rare" ? "rare" : "common",
      lat: String(data.lat),
      lng: String(data.lng),
      summary: data.summary ?? "",
      story: data.story ?? "",
      sources: sources.length ? sources : [{ name: "", url: "" }],
      panoId: sv.panoId ?? "",
      heading: sv.heading != null ? String(sv.heading) : "",
      published: data.published,
    });
    setExistingImagePath(data.image_path ?? null);
    setPhoto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Prefill the form from a curated marker that lives in app code. */
  const editStaticMarker = (marker: Marker) => {
    setForm({
      id: null,
      slug: marker.id,
      lockSlug: true,
      name: marker.name,
      address: marker.address ?? "",
      category: marker.category ?? "Architecture",
      city: marker.city ?? DEFAULT_CITY_ID,
      rarity: marker.rarity === "rare" ? "rare" : "common",
      lat: String(marker.lat),
      lng: String(marker.lng),
      summary: marker.summary ?? "",
      story: marker.story ?? "",
      sources: marker.sources?.length
        ? marker.sources.map((s) => ({ name: s.name, url: s.url }))
        : [{ name: "", url: "" }],
      panoId: marker.streetView?.panoId ?? "",
      heading: marker.streetView?.heading != null ? String(marker.streetView.heading) : "",
      published: true,
    });
    setExistingImagePath(null);
    setPhoto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteMarker = async (slug: string) => {
    const isCurated = staticIds.has(slug);
    const message = isCurated
      ? "Revert this marker to its original built-in version? Your edits will be discarded."
      : "Delete this marker? This can't be undone.";
    if (!window.confirm(message)) return;
    const { error } = await supabase.from("markers").delete().eq("slug", slug);
    if (error) {
      toast({ title: "Couldn't save change", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["db-markers"] });
    if (form.slug === slug) resetForm();
    toast({ title: isCurated ? "Reverted to the original." : "Marker deleted." });
  };


  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const name = form.name.trim();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const slug = (form.slug.trim() || slugify(name)) as string;

    if (!name || name.length > 200) {
      toast({ title: "Enter a marker name (under 200 characters).", variant: "destructive" });
      return;
    }
    if (!slug) {
      toast({ title: "Enter a valid slug.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast({ title: "Enter valid latitude and longitude.", variant: "destructive" });
      return;
    }
    if (form.summary.length > 1000 || form.story.length > 20000) {
      toast({ title: "Summary or story is too long.", variant: "destructive" });
      return;
    }

    setSaving(true);

    let imagePath = existingImagePath;
    if (photo) {
      if (photo.size > 10 * 1024 * 1024) {
        setSaving(false);
        toast({ title: "Photo must be under 10MB.", variant: "destructive" });
        return;
      }
      const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${slug}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("marker-photos")
        .upload(path, photo, { upsert: true, contentType: photo.type });
      if (uploadError) {
        setSaving(false);
        toast({ title: "Photo upload failed", description: uploadError.message, variant: "destructive" });
        return;
      }
      imagePath = path;
    }

    const heading = Number(form.heading);
    const payload = {
      slug,
      name,
      address: form.address.trim(),
      category: form.category,
      city: form.city,
      lat,
      lng,
      summary: form.summary.trim(),
      story: form.story.trim(),
      sources: form.sources.filter((s) => s.name.trim()).map((s) => ({
        name: s.name.trim(),
        url: s.url.trim(),
      })),
      image_path: imagePath,
      street_view: form.panoId.trim()
        ? { panoId: form.panoId.trim(), heading: Number.isFinite(heading) ? heading : 0 }
        : null,
      published: form.published,
      rarity: form.rarity,
      created_by: user?.id ?? null,
    };

    const { error } = form.id
      ? await supabase.from("markers").update(payload).eq("id", form.id)
      : await supabase.from("markers").upsert(payload, { onConflict: "slug" });

    setSaving(false);

    if (error) {
      toast({ title: "Couldn't save marker", description: error.message, variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["db-markers"] });
    toast({
      title: form.id || form.lockSlug ? "Marker updated." : "Marker added.",
    });
    resetForm();

  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen pb-20">
        <PageHeader title="Admin" />
        <div className="px-5 pt-6 text-center">
          <h2 className="font-display text-lg font-medium text-foreground">Admin access required</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            You're signed in as {user?.email}, but this account doesn't have the admin role yet.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-6 rounded-xl bg-primary px-8 py-3 font-display text-sm font-medium text-primary-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Manage Markers" />

      <div className="space-y-3 px-5 pt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRequests((v) => !v)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-card py-2.5 font-display text-xs font-medium text-card-foreground elevation-1"
          >
            <Inbox className="h-4 w-4 text-primary" />
            Requests {requests?.length ? `(${requests.length})` : ""}
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center gap-2 rounded-xl bg-card px-4 py-2.5 font-display text-xs font-medium text-card-foreground elevation-1"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        {showRequests && (
          <div className="rounded-xl bg-card p-4 elevation-1">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm font-medium text-card-foreground">
                Submitted requests
              </span>
              <button onClick={() => setShowRequests(false)}>
                <X className="h-4 w-4 text-on-surface-variant" />
              </button>
            </div>
            {!requests?.length && (
              <p className="text-sm text-on-surface-variant">No requests yet.</p>
            )}
            <ul className="space-y-2">
              {requests?.map((r) => (
                <li key={r.id} className="rounded-lg bg-surface-variant p-3">
                  <p className="font-display text-sm font-medium text-foreground">{r.location_name}</p>
                  {r.address && <p className="text-xs text-on-surface-variant">{r.address}</p>}
                  <p className="mt-1 text-xs text-on-surface-variant">{r.why_it_matters}</p>
                  <button
                    onClick={() => {
                      setForm({
                        ...emptyForm,
                        name: r.location_name,
                        slug: slugify(r.location_name),
                        address: r.address ?? "",
                        summary: r.why_it_matters ?? "",
                      });
                      setShowRequests(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-2 rounded-lg bg-primary px-3 py-1.5 font-display text-xs font-medium text-primary-foreground"
                  >
                    Use for new marker
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Form */}
        <form onSubmit={save} className="space-y-3 rounded-xl bg-card p-4 elevation-1">
          <div className="flex items-center justify-between">
            <span className="font-display font-medium text-card-foreground">
              {form.id || form.lockSlug ? "Edit marker" : "Add a marker"}
            </span>
            {(form.id || form.lockSlug) && (
              <button type="button" onClick={resetForm} className="text-xs text-primary underline">
                New instead
              </button>
            )}
          </div>

          {form.lockSlug && !form.id && (
            <p className="rounded-lg bg-surface-variant px-3 py-2 text-[11px] text-on-surface-variant">
              This is one of the built-in curated sites. Saving stores your edited version and it
              replaces the original everywhere — the marker id and printed QR codes stay the same.
            </p>
          )}

          <div>
            <label className="text-xs font-medium text-on-surface-variant">Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={200}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant">
              Slug (used in the URL and QR code)
            </label>
            <input
              value={form.slug}
              onChange={(e) => set("slug", slugify(e.target.value))}
              placeholder={slugify(form.name) || "e.g. old-city-hall"}
              readOnly={form.lockSlug}
              className={`${inputClass} ${form.lockSlug ? "opacity-60" : ""}`}
            />
            <p className="mt-1 text-[11px] text-on-surface-variant">
              https://markerquest.ai/marker/{form.slug || slugify(form.name) || "…"}
            </p>
          </div>


          <div>
            <label className="text-xs font-medium text-on-surface-variant">Address</label>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              maxLength={500}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant">Category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputClass}
            >
              {categories
                .filter((c) => c !== "All")
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant">City</label>
            <select
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className={inputClass}
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.state}
                </option>
              ))}
            </select>
          </div>



          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-on-surface-variant">Latitude</label>
              <input
                value={form.lat}
                onChange={(e) => set("lat", e.target.value)}
                inputMode="decimal"
                placeholder="47.2529"
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-on-surface-variant">Longitude</label>
              <input
                value={form.lng}
                onChange={(e) => set("lng", e.target.value)}
                inputMode="decimal"
                placeholder="-122.4443"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={draftWithAi}
            disabled={drafting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 font-display text-xs font-medium text-secondary-foreground disabled:opacity-60"
          >
            {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Draft summary & story with AI
          </button>

          <div>
            <label className="text-xs font-medium text-on-surface-variant">Summary</label>
            <textarea
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              rows={3}
              maxLength={1000}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant">
              Story (grounds the AI guide)
            </label>
            <textarea
              value={form.story}
              onChange={(e) => set("story", e.target.value)}
              rows={8}
              maxLength={20000}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant">Sources</label>
            {form.sources.map((s, i) => (
              <div key={i} className="mt-1 flex gap-2">
                <input
                  value={s.name}
                  onChange={(e) =>
                    set(
                      "sources",
                      form.sources.map((v, idx) => (idx === i ? { ...v, name: e.target.value } : v)),
                    )
                  }
                  placeholder="Source name"
                  className="w-1/2 rounded-lg bg-surface-variant px-3 py-2.5 text-sm text-foreground outline-none"
                />
                <input
                  value={s.url}
                  onChange={(e) =>
                    set(
                      "sources",
                      form.sources.map((v, idx) => (idx === i ? { ...v, url: e.target.value } : v)),
                    )
                  }
                  placeholder="https://"
                  className="w-1/2 rounded-lg bg-surface-variant px-3 py-2.5 text-sm text-foreground outline-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("sources", [...form.sources, { name: "", url: "" }])}
              className="mt-2 flex items-center gap-1 text-xs text-primary underline"
            >
              <Plus className="h-3 w-3" /> Add source
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-on-surface-variant">
              Photo (optional — falls back to Street View, then a static map)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-xs text-on-surface-variant"
            />
            {existingImagePath && !photo && (
              <p className="mt-1 text-[11px] text-on-surface-variant">Current photo: {existingImagePath}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-on-surface-variant">Street View pano ID</label>
              <input
                value={form.panoId}
                onChange={(e) => set("panoId", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-on-surface-variant">Heading</label>
              <input
                value={form.heading}
                onChange={(e) => set("heading", e.target.value)}
                inputMode="numeric"
                className={inputClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set("published", e.target.checked)}
            />
            Published (visible to visitors)
          </label>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground elevation-1 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {form.id ? "Save changes" : "Add marker"}
          </button>
        </form>

        {/* Existing DB markers */}
        <div className="rounded-xl bg-card p-4 elevation-1">
          <span className="font-display font-medium text-card-foreground">Markers you've added</span>
          {markersLoading && <Loader2 className="mt-3 h-4 w-4 animate-spin text-primary" />}
          {!markersLoading && !dbRows.length && (
            <p className="mt-2 text-sm text-on-surface-variant">
              None yet — the 28 curated markers live in the app code.
            </p>
          )}
          <ul className="mt-2 space-y-2">
            {dbRows.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-lg bg-surface-variant p-3">
                <MarkerQrCard marker={m} size={56} showCaption={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-medium text-foreground">{m.name}</p>
                  <p className="truncate text-xs text-on-surface-variant">{m.address || m.id}</p>
                </div>
                <button onClick={() => editMarker(m.id)} aria-label={`Edit ${m.name}`}>
                  <Pencil className="h-4 w-4 text-primary" />
                </button>
                <button onClick={() => deleteMarker(m.id)} aria-label={`Delete ${m.name}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* All markers QR sheet */}
        <button
          onClick={() => navigate("/admin/qr-codes")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-card py-3 font-display text-sm font-medium text-card-foreground elevation-1"
        >
          <QrCode className="h-4 w-4 text-primary" />
          QR codes for all markers
        </button>
      </div>
    </div>
  );
};

export default AdminPage;
