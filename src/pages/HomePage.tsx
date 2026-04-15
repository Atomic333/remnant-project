import { Compass, Trophy } from "lucide-react";
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
      <header className="flex shrink-0 items-center justify-between px-6 pt-6 pb-2">
        <span className="font-display text-lg font-bold text-foreground tracking-tight">
          The Remnant Project
        </span>
        <button
          onClick={() => navigate("/settings")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-5 overflow-hidden px-6 mt-2 pb-4">
        {/* City card */}
        <div className="shrink-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Cities
          </p>
        </div>

        {cities.map((city) => (
          <div
            key={city.id}
            className={`relative flex-1 overflow-hidden rounded-[20px] elevation-1 ${
              city.active ? "cursor-pointer" : "cursor-default"
            }`}
            onClick={() => city.active && navigate("/map")}
          >
            {city.image ? (
              <img src={city.image} alt={city.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-surface-variant" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2 className="font-display text-2xl font-bold text-white leading-tight">
                {city.name}, {city.state}
              </h2>
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        <div className="flex shrink-0 flex-col gap-3">
          {/* Progress display */}
          <div className="flex w-full items-center gap-4 rounded-xl border border-border bg-background p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-variant">
              <Trophy className="h-4 w-4 text-on-surface-variant" />
            </div>
            <div className="text-left flex-1">
              <p className="font-display text-sm font-semibold text-foreground">My Progress</p>
              <p className="text-xs text-on-surface-variant">
                {visitedCount} of {total} markers visited
              </p>
            </div>
            <span className="text-xs font-bold text-primary">{pct}%</span>
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/progress"); }}
              className="ml-1 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-foreground/90 active:scale-95"
            >
              View
            </button>
          </div>

          <button
            onClick={() => navigate("/map")}
            className="flex w-full items-center gap-4 rounded-xl bg-foreground p-4 transition-all active:scale-[0.98] hover:bg-foreground/90"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background/20">
              <Compass className="h-6 w-6 text-background" />
            </div>
            <div className="text-left">
              <p className="font-display text-base font-bold text-background">Explore Tacoma</p>
              <p className="text-xs text-background/70">Browse all markers</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
