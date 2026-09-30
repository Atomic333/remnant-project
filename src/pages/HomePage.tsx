import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Footprints, Mail, Trophy, BookOpen } from "lucide-react";
import { toast } from "sonner";
import QuestCoinIcon from "@/components/QuestCoinIcon";
import { useAllMarkers } from "@/hooks/useAllMarkers";
import { cities as curated, citiesForMarkers, US_STATES } from "@/data/cities";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import { useVisited } from "@/hooks/useVisited";
import { usePublishedCollection } from "@/hooks/usePublishedCollection";
import { getMarkerImage } from "@/lib/markerImages";
import { getStaticMapUrl } from "@/lib/staticMap";
import logo from "@/assets/logo.png";
import HamburgerMenu from "@/components/HamburgerMenu";
import StateCitySheet, { type CityCard } from "@/components/globe/StateCitySheet";

const UsGlobe = lazy(() => import("@/components/globe/UsGlobe"));
const STATE_NAME = new Map(US_STATES);

function parseState(id: string) {
  const m = /,\s*([A-Z]{2})$/.exec(id);
  return m ? m[1] : "WA";
}

const HomePage = () => {
  const allMarkers = useAllMarkers();
  const stories = usePublishedCollection();
  const navigate = useNavigate();
  const { visited } = useVisited();
  const { setCityId } = useSelectedCity();
  const [stateAbbr, setStateAbbr] = useState<string | null>(null);

  const cityCards = useMemo(() => {
    const cards = new Map<string, CityCard & { state: string }>();
    for (const c of citiesForMarkers(allMarkers)) {
      const list = allMarkers.filter((m) => (m.city ?? "Tacoma") === c.id);
      const isCurated = curated.some((x) => x.id === c.id);
      const photo = isCurated ? c.image : list.map((m) => getMarkerImage(m.id, m.image)).find(Boolean) || c.image;
      cards.set(c.id, {
        id: c.id, name: c.name, state: c.state, image: photo,
        total: list.length, visited: list.filter((m) => visited.has(m.id)).length,
        lat: c.center.lat, lng: c.center.lng, zoom: c.zoom,
      });
    }
    // Cities that only have published collection stories.
    const byCity = new Map<string, typeof stories>();
    for (const s of stories) if (s.cityId) byCity.set(s.cityId, [...(byCity.get(s.cityId) ?? []), s]);
    for (const [id, list] of byCity) {
      const existing = cards.get(id);
      if (existing) { existing.total += list.length; continue; }
      const pts = list.filter((s) => s.lat != null && s.lng != null);
      if (!pts.length) continue;
      const lat = pts.reduce((a, s) => a + s.lat!, 0) / pts.length;
      const lng = pts.reduce((a, s) => a + s.lng!, 0) / pts.length;
      cards.set(id, {
        id, name: id.replace(/,\s*[A-Z]{2}$/, ""), state: parseState(id),
        image: list.find((s) => s.image)?.image ?? getStaticMapUrl(lat, lng, { size: 640, zoom: 12 }),
        total: list.length, visited: 0, lat, lng, zoom: 13,
      });
    }
    return [...cards.values()].filter((c) => c.total > 0);
  }, [allMarkers, stories, visited]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of cityCards) out[c.state] = (out[c.state] ?? 0) + c.total;
    return out;
  }, [cityCards]);

  const total = cityCards.reduce((a, c) => a + c.total, 0);
  const visitedCount = cityCards.reduce((a, c) => a + c.visited, 0);
  const pct = total ? Math.round((visitedCount / total) * 100) : 0;

  const pick = (c: CityCard) => {
    setCityId(c.id);
    navigate(`/map?city=${encodeURIComponent(c.id)}&lat=${c.lat}&lng=${c.lng}&z=${c.zoom}`);
  };

  const stateCities = cityCards
    .filter((c) => c.state === stateAbbr)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pb-8">
      <header className="flex shrink-0 items-center justify-between px-5 pb-2 pt-5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="MarkerQuest logo" className="h-8 w-8 object-contain" />
          <span className="font-display text-xl font-medium text-primary">MarkerQuest.ai</span>
        </div>
        <HamburgerMenu />
      </header>

      <section className="px-5">
        <h1 className="font-display text-2xl text-foreground">Where to next?</h1>
        <p className="text-xs text-on-surface-variant">Spin the globe and tap a glowing state.</p>
      </section>

      <div className="px-3 pt-2">
        <Suspense fallback={<div className="mx-auto aspect-square w-full max-w-[560px] animate-pulse rounded-full bg-surface-variant/40" />}>
          <UsGlobe
            counts={counts}
            selected={stateAbbr}
            onSelect={setStateAbbr}
            onEmpty={(n) => toast(`No markers in ${n} yet`)}
          />
        </Suspense>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {Object.keys(counts).sort().map((a) => (
            <button key={a} onClick={() => setStateAbbr(a)}
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {STATE_NAME.get(a)} · {counts[a]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 px-5">
        <Link to="/wallet" className="interactive flex items-center justify-between rounded-xl border border-quest-gold/30 bg-quest-gold/5 px-4 py-3">
          <span className="flex items-center gap-2 font-display text-sm text-foreground"><QuestCoinIcon className="h-4 w-4" /> Quest Wallet &amp; Store</span>
          <ChevronRight className="h-4 w-4 text-on-surface-variant" />
        </Link>
        <div className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-variant/40 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Trophy className="h-4 w-4 text-on-surface-variant" /></div>
          <div className="flex-1 text-left">
            <p className="font-display text-sm font-medium text-foreground">My Progress</p>
            <p className="text-xs text-muted-foreground">{visitedCount} of {total} markers visited</p>
          </div>
          <span className="text-xs font-medium text-primary">{pct}%</span>
          <button onClick={() => navigate("/dashboard")} className="ml-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">View</button>
        </div>
        {stories.length > 0 && (
          <Link to="/explore/washington" className="flex items-center gap-4 rounded-2xl border border-quest-gold/40 bg-card p-3 elevation-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-quest-gold/15"><BookOpen className="h-4 w-4 text-quest-gold" /></div>
            <div className="text-left">
              <p className="font-display text-sm font-medium text-foreground">Explore Washington</p>
              <p className="text-xs text-muted-foreground">Black &amp; Indigenous stories that shaped the state</p>
            </div>
          </Link>
        )}
        <button onClick={() => navigate("/trails")} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-3 elevation-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Footprints className="h-4 w-4 text-primary" /></div>
          <div className="text-left">
            <p className="font-display text-sm font-medium text-foreground">Trails</p>
            <p className="text-xs text-muted-foreground">Guided walks from marker to marker</p>
          </div>
        </button>
        <button onClick={() => navigate("/postcards")} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-3 elevation-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Mail className="h-4 w-4 text-primary" /></div>
          <div className="text-left">
            <p className="font-display text-sm font-medium text-foreground">My Postcards</p>
            <p className="text-xs text-muted-foreground">Collectibles you unlock at markers</p>
          </div>
        </button>
      </div>

      <StateCitySheet
        stateAbbr={stateAbbr}
        stateName={stateAbbr ? STATE_NAME.get(stateAbbr) ?? stateAbbr : null}
        cities={stateCities}
        showCollection={stories.length > 0}
        onClose={() => setStateAbbr(null)}
        onPick={pick}
      />
    </div>
  );
};

export default HomePage;
