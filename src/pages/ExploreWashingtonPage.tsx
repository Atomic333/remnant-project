import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, List, Map as MapIcon, MapPin, Sparkles, SlidersHorizontal, Pause, Play } from "lucide-react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useCollection, locationLabel, focusTone, type CMarker, type CImage } from "@/hooks/useCollection";
import { useAuth } from "@/hooks/useAuth";
import { useMotion, motion, stagger } from "@/lib/motion";
import { REGIONS, COLLECTION_TITLE } from "@/lib/collectionImport";
import { GOOGLE_MAPS_STATIC_KEY } from "@/lib/googleMapsKey";
import AtlasImage, { sized } from "@/components/atlas/AtlasImage";
import CollectionMapMarker from "@/components/CollectionMapMarker";

const WA_CENTER = { lat: 47.4, lng: -120.6 };
const decade = (p: string | null) => {
  const y = /\b(1[6-9]\d\d|20\d\d)\b/.exec(p ?? "")?.[1];
  return y ? `${y.slice(0, 2)}00s` : null;
};

type Filters = { focus: string; community: string; region: string; city: string; theme: string; period: string };
const EMPTY: Filters = { focus: "", community: "", region: "", city: "", theme: "", period: "" };

const ExploreWashingtonPage = () => {
  const { markers, images, sources, collection, loading } = useCollection(true);
  const { isAdmin, isCreator } = useAuth();
  const m = useMotion();
  const navigate = useNavigate();
  const [intro, setIntro] = useState(true);
  const [view, setView] = useState<"map" | "list">(() => (localStorage.getItem("mq-wa-view") as "map" | "list") || "list");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const browseRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem("mq-wa-view", view); }, [view]);
  useEffect(() => { const t = setTimeout(() => setIntro(false), 2200); return () => clearTimeout(t); }, []);

  const imgBy = useMemo(() => {
    const map = new Map<string, CImage[]>();
    for (const i of images) map.set(i.marker_id, [...(map.get(i.marker_id) ?? []), i]);
    return map;
  }, [images]);
  const firstImg = (id: string) => imgBy.get(id)?.[0];

  const options = useMemo(() => {
    const uniq = (f: (x: CMarker) => string | null) => [...new Set(markers.map(f).filter(Boolean) as string[])].sort();
    return {
      focus: uniq((x) => focusTone(x.history_focus)), community: uniq((x) => x.community), region: REGIONS.filter((r) => markers.some((x) => x.region === r)),
      city: uniq((x) => x.city_name), theme: uniq((x) => x.category), period: uniq((x) => decade(x.period)),
    };
  }, [markers]);

  const shown = markers.filter((x) =>
    (!filters.focus || focusTone(x.history_focus) === filters.focus) && (!filters.community || x.community === filters.community) &&
    (!filters.region || x.region === filters.region) && (!filters.city || x.city_name === filters.city) &&
    (!filters.theme || x.category === filters.theme) && (!filters.period || decade(x.period) === filters.period));
  const mapped = shown.filter((x) => x.lat != null && x.lng != null);
  const featured = ((collection?.featured as string[] | null) ?? []).map((id) => markers.find((x) => x.marker_id === id)).filter(Boolean) as CMarker[];
  const heroImgs = useMemo(() => images.filter((i) => i.kind === "historical").slice(0, 3).concat(images.slice(0, 3)).slice(0, 3), [images]);
  const editor = isAdmin || isCreator;
  const sel = markers.find((x) => x.marker_id === selected) ?? null;

  const goBrowse = (v: "map" | "list") => { setView(v); browseRef.current?.scrollIntoView({ behavior: m.enabled ? "smooth" : "auto" }); };

  if (!loading && !markers.length) {
    return (
      <div className="atlas atlas-grain flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-atlas text-3xl">{COLLECTION_TITLE}</h1>
        <p className="max-w-sm font-atlas-sans text-sm text-atlas-mist">
          {editor ? "Nothing imported yet. Use Admin › Washington Import to bring in the research files." : "These stories are being prepared and aren't published yet."}
        </p>
        <Link to={editor ? "/admin/import" : "/"} className="rounded-full bg-atlas-gold px-5 py-2 font-atlas-sans text-sm text-atlas-ink">{editor ? "Open import" : "Back home"}</Link>
      </div>
    );
  }

  return (
    <div className="atlas atlas-grain min-h-dvh pb-24 font-atlas-sans" data-motion={m.enabled ? "on" : "off"}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-atlas-night/85 px-3 py-2 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="Back" className="rounded-full p-2 hover:bg-atlas-char"><ArrowLeft className="h-5 w-5" /></button>
        {collection?.status !== "published" && (
          <span className="rounded-full border border-atlas-gold/50 px-2.5 py-0.5 text-[11px] text-atlas-gold">Draft preview · editors only</span>
        )}
        <button onClick={m.toggle} aria-pressed={!m.enabled} className="ml-auto flex items-center gap-1 rounded-full border border-atlas-mist/30 px-3 py-1 text-xs">
          {m.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} Motion {m.enabled ? "on" : "off"}
        </button>
      </div>

      {/* Hero */}
      <header className="relative isolate overflow-hidden" onClick={() => setIntro(false)}>
        <div className="absolute inset-0 -z-10 grid grid-cols-3 opacity-40">
          {heroImgs.map((i) => (
            <div key={i.image_key} className="h-full overflow-hidden">
              <img src={sized(i.image_url!, 600)} alt="" aria-hidden loading="eager" referrerPolicy="no-referrer" className={`h-full w-full object-cover ${motion.drift}`} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-atlas-night/40 via-atlas-night/70 to-atlas-night" />
        <div className="atlas-contours absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto max-w-5xl px-5 pb-10 pt-16 md:pt-24">
          <p className={`text-[11px] uppercase tracking-[0.22em] text-atlas-gold ${motion.enter}`}>Black &amp; Indigenous history · Washington State</p>
          <h1 className={`mt-3 max-w-3xl font-atlas text-4xl leading-[1.05] md:text-6xl ${motion.enter}`} style={stagger(1, 120)}>
            Washington: Stories That Shaped This Place
          </h1>
          {intro && m.enabled && <button onClick={() => setIntro(false)} className="mt-2 text-xs text-atlas-mist underline">Skip intro</button>}
          <dl className={`mt-6 flex flex-wrap gap-6 ${motion.enter}`} style={stagger(3, 120)}>
            {[["stories", markers.length], ["sources", sources.length], ["cleared photographs", images.length], ["regions", options.region.length]].map(([l, n]) => (
              <div key={l as string}><dt className="text-[11px] uppercase tracking-wider text-atlas-mist">{l}</dt><dd className="font-atlas text-3xl text-atlas-paper">{n}</dd></div>
            ))}
          </dl>
          <div className={`mt-7 flex flex-wrap gap-3 ${motion.enter}`} style={stagger(4, 120)}>
            <button onClick={() => goBrowse("map")} className="flex items-center gap-2 rounded-full bg-atlas-gold px-5 py-2.5 text-sm font-medium text-atlas-ink atlas-lift"><MapIcon className="h-4 w-4" /> Explore the Map</button>
            <button onClick={() => goBrowse("list")} className="flex items-center gap-2 rounded-full border border-atlas-paper/40 px-5 py-2.5 text-sm atlas-lift"><List className="h-4 w-4" /> Browse the Stories</button>
          </div>
        </div>
      </header>

      {/* Regions */}
      <section className="mx-auto max-w-5xl px-5 py-6" aria-labelledby="regions-h">
        <h2 id="regions-h" className="font-atlas text-2xl">Four regions</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {REGIONS.map((r, i) => {
            const n = markers.filter((x) => x.region === r).length;
            const on = filters.region === r;
            return (
              <button key={r} onClick={() => { setFilters((f) => ({ ...f, region: on ? "" : r })); goBrowse(view); }} aria-pressed={on}
                className={`atlas-contours rounded-xl border p-4 text-left atlas-lift ${motion.rise} ${on ? "border-atlas-gold bg-atlas-char" : "border-atlas-mist/20 bg-atlas-char/60"}`} style={stagger(i, 80)}>
                <span className="block font-atlas text-lg leading-tight">{r}</span>
                <span className="mt-1 block text-xs text-atlas-mist">{n} {n === 1 ? "story" : "stories"}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Start your journey */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-5xl py-6" aria-labelledby="journey-h">
          <h2 id="journey-h" className="px-5 font-atlas text-2xl">Start Your Journey</h2>
          <p className="px-5 text-xs text-atlas-mist">The report's recommended first ten, chosen for evidence quality, public access and geographic spread.</p>
          <ol className="mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
            {featured.map((x, i) => (
              <li key={x.marker_id} className={`w-60 shrink-0 snap-start ${motion.rise}`} style={stagger(i)}>
                <Link to={`/explore/washington/story/${x.marker_id}`} className="block overflow-hidden rounded-xl bg-atlas-char atlas-lift">
                  <AtlasImage image={firstImg(x.marker_id)} title={x.title} subtitle={x.city_name} width={480} className="aspect-[4/3]" />
                  <div className="p-3">
                    <span className="text-[10px] uppercase tracking-widest text-atlas-gold">{String(i + 1).padStart(2, "0")} · {x.city_name}</span>
                    <p className="mt-1 line-clamp-2 font-atlas text-base leading-snug">{x.title}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Browse */}
      <section ref={browseRef} className="mx-auto max-w-5xl scroll-mt-14 px-5 py-6" aria-labelledby="browse-h">
        <div className="flex items-center gap-2">
          <h2 id="browse-h" className="font-atlas text-2xl">All stories</h2>
          <div role="group" aria-label="View" className="ml-auto flex rounded-full border border-atlas-mist/30 p-0.5 text-xs">
            {(["map", "list"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`flex items-center gap-1 rounded-full px-3 py-1 ${view === v ? "bg-atlas-paper text-atlas-ink" : ""}`}>
                {v === "map" ? <MapIcon className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />} {v === "map" ? "Map" : "List"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <SlidersHorizontal className="h-4 w-4 text-atlas-mist" />
          {([["focus", "History focus"], ["community", "Community or nation"], ["region", "Region"], ["city", "City"], ["theme", "Theme"], ["period", "Period"]] as const).map(([k, l]) => (
            <select key={k} value={filters[k]} aria-label={l} onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))}
              className="max-w-[11rem] rounded-full border border-atlas-mist/30 bg-atlas-char px-3 py-1.5 text-atlas-paper">
              <option value="">{l}</option>
              {(options[k] as string[]).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {Object.values(filters).some(Boolean) && <button onClick={() => setFilters(EMPTY)} className="text-atlas-gold underline">Clear</button>}
          <span className="ml-auto text-atlas-mist" aria-live="polite">{shown.length} of {markers.length}</span>
        </div>

        {view === "map" && (
          <div className="mt-4">
            <WaMap markers={mapped} selected={selected} onSelect={setSelected} animate={m.enabled} />
            <p className="mt-2 text-[11px] text-atlas-mist">
              {shown.length - mapped.length} stories have no public location (withheld or unverified) and appear only in the list. Pins marked approximate are not exact historical sites. No routes are drawn.
            </p>
          </div>
        )}

        <ul key={JSON.stringify(filters) + view} className="mt-4 grid gap-3">
          {shown.map((x, i) => (
            <li key={x.marker_id} className={motion.rise} style={stagger(i, 40, 400)}>
              <Link to={`/explore/washington/story/${x.marker_id}`}
                onMouseEnter={() => setSelected(x.marker_id)} onFocus={() => setSelected(x.marker_id)}
                className={`flex h-full gap-3 overflow-hidden rounded-xl bg-atlas-char p-2 atlas-lift ${selected === x.marker_id ? "ring-1 ring-atlas-gold" : ""}`}>
                <AtlasImage image={firstImg(x.marker_id)} title={x.title} subtitle={x.city_name} width={240} className="h-24 w-24 shrink-0 rounded-lg" />
                <div className="min-w-0 py-1">
                  <span className="text-[10px] uppercase tracking-widest text-atlas-gold">{focusTone(x.history_focus)} · {x.city_name}</span>
                  <p className="line-clamp-2 font-atlas text-base leading-snug">{x.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-atlas-mist"><MapPin className="h-3 w-3" /> {locationLabel(x)}{x.sensitive ? " · Place of remembrance" : ""}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {!shown.length && <p className="mt-6 text-center text-sm text-atlas-mist">No stories match these filters.</p>}
      </section>

      {/* Mobile bottom sheet for map selection */}
      <Drawer open={view === "map" && !!sel && window.matchMedia("(max-width: 767px)").matches} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent className="atlas border-atlas-char">
          {sel && (
            <div className="p-4 font-atlas-sans">
              <DrawerTitle className="font-atlas text-xl text-atlas-paper">{sel.title}</DrawerTitle>
              <p className="mt-1 text-xs text-atlas-mist">{sel.city_name} · {locationLabel(sel)}</p>
              <p className="mt-2 line-clamp-3 text-sm text-atlas-paper/90">{sel.summary}</p>
              <Link to={`/explore/washington/story/${sel.marker_id}`} className="mt-3 inline-flex items-center gap-1 rounded-full bg-atlas-gold px-4 py-2 text-sm text-atlas-ink">
                <Sparkles className="h-4 w-4" /> Read the story
              </Link>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#16222a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#b9c4c2" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1a20" }] },
  { featureType: "water", stylers: [{ color: "#1f3d52" }] },
  { featureType: "road", stylers: [{ color: "#26343b" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

function WaMap({ markers, selected, onSelect, animate }: { markers: CMarker[]; selected: string | null; onSelect: (id: string) => void; animate: boolean }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_STATIC_KEY });
  const mapRef = useRef<google.maps.Map | null>(null);
  const sel = markers.find((x) => x.marker_id === selected);
  useEffect(() => {
    if (sel && mapRef.current) mapRef.current[animate ? "panTo" : "setCenter"]({ lat: sel.lat!, lng: sel.lng! });
  }, [sel]);
  if (loadError) return <div className="flex h-72 items-center justify-center rounded-xl bg-atlas-char text-sm text-atlas-mist">The map is unavailable right now. Every story is still listed below.</div>;
  if (!isLoaded) return <div className="h-72 animate-pulse rounded-xl bg-atlas-char md:h-[28rem]" />;
  return (
    <div className="h-72 overflow-hidden rounded-xl md:h-[28rem]">
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={WA_CENTER}
        zoom={6}
        onLoad={(mp) => { mapRef.current = mp; }}
        onUnmount={() => { mapRef.current = null; }}
        options={{ styles: MAP_STYLE, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy", clickableIcons: false }}
      >
        {markers.map((x) => (
          <CollectionMapMarker
            key={x.marker_id}
            lat={x.lat as number}
            lng={x.lng as number}
            title={`${x.title} (${locationLabel(x)})`}
            selected={selected === x.marker_id}
            motion={animate}
            onClick={() => onSelect(x.marker_id)}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

export default ExploreWashingtonPage;
