import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { List, Map as MapIcon, Footprints, Repeat, Loader2, Route } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TrailMap from "@/components/TrailMap";
import { formatDistance, formatDuration, usePublishedTrails, type PublishedTrail } from "@/lib/trails";
import { getCity } from "@/data/cities";

const DISTANCES = [
  { id: "any", label: "Any length", max: Infinity },
  { id: "short", label: "Under 1 mi", max: 1609 },
  { id: "mid", label: "Under 3 mi", max: 4828 },
];
const STOPS = [
  { id: "any", label: "Any stops", max: Infinity },
  { id: "few", label: "Up to 5", max: 5 },
  { id: "mid", label: "Up to 10", max: 10 },
];

const selectClass = "h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground";

export function TrailCard({ t, onOpen, onStart }: { t: PublishedTrail; onOpen: () => void; onStart: () => void }) {
  const s = t.revision.stops;
  return (
    <article className="overflow-hidden rounded-2xl bg-card elevation-1">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative h-36 bg-surface-variant">
          {t.coverUrl && <img src={t.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
          <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur">{t.theme}</span>
        </div>
        <div className="space-y-2 p-4">
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight text-foreground">{t.title}</h3>
            <p className="text-xs text-on-surface-variant">{getCity(t.city).name}, {getCity(t.city).state}</p>
          </div>
          {t.description && <p className="line-clamp-2 text-sm text-on-surface-variant">{t.description}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground">
            <span>{s.length} stops</span>
            <span>{formatDistance(t.revision.distance_m)}</span>
            <span>~{formatDuration(t.revision.duration_s)} walking</span>
            {t.is_loop && <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />Loop</span>}
          </div>
          <p className="text-xs text-on-surface-variant">
            Start: {s[0]?.name} · Finish: {t.is_loop ? s[0]?.name : s[s.length - 1]?.name}
          </p>
          <p className="text-xs text-on-surface-variant">
            Accessibility: {t.accessibility || "Not verified"} · Terrain: {t.terrain || "Not verified"}
          </p>
        </div>
      </button>
      <div className="flex gap-2 px-4 pb-4">
        <button onClick={onOpen} className="h-11 flex-1 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground">Preview Trail</button>
        <button onClick={onStart} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground">
          <Footprints className="h-4 w-4" /> Start Trail
        </button>
      </div>
    </article>
  );
}

const TrailsPage = () => {
  const navigate = useNavigate();
  const { data: trails, isLoading, error } = usePublishedTrails();
  const [view, setView] = useState<"list" | "map">("list");
  const [city, setCity] = useState("all");
  const [theme, setTheme] = useState("all");
  const [dist, setDist] = useState("any");
  const [stops, setStops] = useState("any");

  const cityOpts = useMemo(() => [...new Set((trails ?? []).map((t) => t.city))], [trails]);
  const themeOpts = useMemo(() => [...new Set((trails ?? []).map((t) => t.theme))], [trails]);
  const filtered = useMemo(() => (trails ?? []).filter((t) =>
    (city === "all" || t.city === city) &&
    (theme === "all" || t.theme === theme) &&
    t.revision.distance_m <= DISTANCES.find((d) => d.id === dist)!.max &&
    t.revision.stops.length <= STOPS.find((d) => d.id === stops)!.max,
  ), [trails, city, theme, dist, stops]);

  const mapStops = filtered.map((t) => ({ ...t.revision.stops[0], name: t.title, marker_id: t.id }));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-8">
      <PageHeader
        title="Trails"
        back
        right={
          <div className="flex rounded-xl bg-surface-variant p-1" role="tablist" aria-label="Trail view">
            {(["list", "map"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={`flex h-9 w-10 items-center justify-center rounded-lg ${view === v ? "bg-card text-primary elevation-1" : "text-on-surface-variant"}`}
                aria-label={v === "list" ? "List view" : "Map view"}>
                {v === "list" ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
              </button>
            ))}
          </div>
        }
      />
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        <select aria-label="City" value={city} onChange={(e) => setCity(e.target.value)} className={selectClass}>
          <option value="all">All cities</option>
          {cityOpts.map((c) => <option key={c} value={c}>{getCity(c).name}</option>)}
        </select>
        <select aria-label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} className={selectClass}>
          <option value="all">All themes</option>
          {themeOpts.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Distance" value={dist} onChange={(e) => setDist(e.target.value)} className={selectClass}>
          {DISTANCES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <select aria-label="Stops" value={stops} onChange={(e) => setStops(e.target.value)} className={selectClass}>
          {STOPS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : error ? (
        <p className="px-6 py-12 text-center text-sm text-on-surface-variant">Trails couldn't load. Check your connection and try again.</p>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <Route className="h-8 w-8 text-on-surface-variant" />
          <p className="font-display text-base font-medium text-foreground">{trails?.length ? "No trails match these filters" : "No trails yet"}</p>
          <p className="text-sm text-on-surface-variant">{trails?.length ? "Try widening your filters." : "Walking trails will appear here once they're published."}</p>
        </div>
      ) : view === "map" ? (
        <div className="mx-4 h-[65dvh] overflow-hidden rounded-2xl elevation-1">
          <TrailMap stops={mapStops} legs={[]} states={mapStops.map(() => "upcoming")} currentIndex={null}
            onSelect={(i) => navigate(`/trails/${filtered[i].slug}`)} />
        </div>
      ) : (
        <div className="space-y-4 px-4">
          {filtered.map((t) => (
            <TrailCard key={t.id} t={t} onOpen={() => navigate(`/trails/${t.slug}`)} onStart={() => navigate(`/trails/${t.slug}?start=1`)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TrailsPage;
