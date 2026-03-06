import { ArrowRight, MapPin, Trophy, Compass, Scan } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/mockData";
import tacomaHero from "@/assets/tacoma-hero.jpg";
import { useVisited } from "@/hooks/useVisited";

const HomePage = () => {
  const navigate = useNavigate();
  const { visited } = useVisited();
  const visitedCount = visited.size;
  const total = markers.length;
  const pct = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
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
              <p className="mt-1 font-display text-3xl font-medium text-foreground">
                {visitedCount}
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

        {/* Explore CTA */}
        <button
          onClick={() => navigate("/map")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-base font-medium text-primary-foreground elevation-1 transition-all active:scale-[0.99]"
        >
          Explore Tacoma
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default HomePage;
