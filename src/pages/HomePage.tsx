import { ArrowRight, MapPin, Trophy, Compass, Scan, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers, categories } from "@/data/mockData";
import tacomaHero from "@/assets/tacoma-hero.jpg";
import { useVisited } from "@/hooks/useVisited";

const categoryIcons: Record<string, string> = {
  Indigenous: "🪶",
  Memorials: "🏛️",
  "Civil Rights": "✊",
  Architecture: "🏗️",
  Commerce: "🏪",
  All: "📍",
};

const HomePage = () => {
  const navigate = useNavigate();
  const { visited, isVisited } = useVisited();
  const visitedCount = visited.size;
  const total = markers.length;
  const pct = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  const recentMarkers = markers.slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
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

      <div className="px-5 space-y-6 mt-4">

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl elevation-2">
          <img
            src={tacomaHero}
            alt="Tacoma cityscape with Mount Rainier"
            className="h-52 w-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h1 className="font-display text-2xl font-medium leading-tight text-white">
              Discover history<br />where you stand.
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-white/70" />
              <p className="text-xs text-white/70">Tacoma, Washington</p>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="rounded-2xl bg-card p-4 elevation-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-sm font-medium text-on-surface-variant uppercase tracking-wide">Your Progress</h2>
              <p className="mt-1 font-display text-3xl font-medium text-foreground">{visitedCount}
                <span className="text-base font-normal text-on-surface-variant">/{total}</span>
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">markers discovered</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-xs text-on-surface-variant">Progress</span>
              <span className="text-xs font-medium text-primary">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-medium text-foreground">Browse by Category</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.filter(c => c !== "All").map((cat) => (
              <button
                key={cat}
                onClick={() => navigate(`/map`)}
                className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl bg-card px-4 py-3 elevation-1 transition-all active:scale-[0.97] hover:bg-accent"
              >
                <span className="text-xl">{categoryIcons[cat] ?? "📍"}</span>
                <span className="text-xs font-medium text-foreground whitespace-nowrap">{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent / Featured Markers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-medium text-foreground">Featured Markers</h2>
            <button
              onClick={() => navigate("/nearby")}
              className="flex items-center gap-0.5 text-xs font-medium text-primary"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {recentMarkers.map((m) => {
              const done = isVisited(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(`/marker/${m.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left elevation-1 transition-all active:scale-[0.99] hover:bg-accent"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${done ? "bg-success/15" : "bg-primary/10"}`}>
                    <MapPin className={`h-5 w-5 ${done ? "text-success" : "text-primary"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                    <p className="truncate text-xs text-on-surface-variant">{m.address}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {done && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">✓</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-on-surface-variant" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explore CTA */}
        <button
          onClick={() => navigate("/map")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-base font-medium text-primary-foreground elevation-1 transition-all active:scale-[0.99] hover:elevation-2"
        >
          Explore Tacoma
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default HomePage;
