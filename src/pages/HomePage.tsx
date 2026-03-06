import { ArrowRight, Compass, Scan } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/mockData";
import tacomaHero from "@/assets/tacoma-hero.jpg";
import { useVisited } from "@/hooks/useVisited";

const cities = [
  {
    id: "tacoma",
    name: "Tacoma",
    state: "WA",
    image: tacomaHero,
    active: true,
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { visited } = useVisited();
  const visitedCount = visited.size;
  const total = markers.length;
  const pct = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  return (
    <div className="flex h-[100dvh] flex-col bg-background pb-20">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between px-5 pt-5 pb-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">Welcome to</p>
          <span className="font-display text-xl font-medium text-primary">The Remnant Project</span>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden px-5 mt-3 pb-4">

        {/* City card — grows to fill available space */}
        <div className="shrink-0">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-on-surface-variant">Cities</p>
        </div>

        {cities.map((city) => (
          <div
            key={city.id}
            className={`relative flex-1 overflow-hidden rounded-2xl elevation-2 ${city.active ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => city.active && navigate("/map")}
          >
            {city.image ? (
              <img src={city.image} alt={city.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-surface-variant" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="font-display text-2xl font-medium text-white leading-tight">
                    {city.name}, {city.state}
                  </h2>
                  {city.active && (
                    <p className="text-xs text-white/70 mt-0.5">{visitedCount} of {total} markers visited</p>
                  )}
                </div>
                {city.active && (
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {pct}%
                  </span>
                )}
              </div>
              {city.active && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        <div className="grid shrink-0 grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/map")}
            className="flex flex-col items-start gap-3 rounded-2xl bg-primary p-4 elevation-1 transition-all active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="font-display text-sm font-medium text-primary-foreground">Explore Map</p>
              <p className="text-xs text-primary-foreground/70">Browse all markers</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/scan")}
            className="flex flex-col items-start gap-3 rounded-2xl bg-secondary p-4 elevation-1 transition-all active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-foreground/10">
              <Scan className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div className="text-left">
              <p className="font-display text-sm font-medium text-secondary-foreground">Scan QR</p>
              <p className="text-xs text-secondary-foreground/60">Mark as visited</p>
            </div>
          </button>
        </div>

        {/* Explore CTA */}
        <button
          onClick={() => navigate("/map")}
          className="flex shrink-0 w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-base font-medium text-primary-foreground elevation-1 transition-all active:scale-[0.99]"
        >
          Explore Tacoma
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default HomePage;
