import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/mockData";
import tacomaHero from "@/assets/tacoma-hero.jpg";

const HomePage = () => {
  const navigate = useNavigate();
  const visited = markers.filter((m) => m.visited).length;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-primary">The Remnant Project</span>
        <button onClick={() => navigate("/settings")} className="text-muted-foreground">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <div className="px-4">
        {/* Hero */}
        <h2 className="mb-1 text-2xl font-bold text-foreground">
          Discover history where you stand.
        </h2>

        <div className="mt-4 overflow-hidden rounded-xl">
          <img
            src={tacomaHero}
            alt="Tacoma cityscape with Mount Rainier"
            className="h-48 w-full object-cover"
          />
        </div>

        {/* City Info */}
        <div className="mt-6">
          <h3 className="text-xl font-bold text-foreground">Tacoma, WA</h3>
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{visited} / {markers.length} Markers</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(visited / markers.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate("/map")}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Explore Tacoma
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Links */}
        <div className="mt-6 space-y-2">
          <button
            onClick={() => navigate("/progress")}
            className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left"
          >
            <span className="text-lg">📊</span>
            <span className="text-sm font-medium text-foreground">Your Progress</span>
          </button>
          <button
            onClick={() => navigate("/request")}
            className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left"
          >
            <span className="text-lg">📍</span>
            <span className="text-sm font-medium text-foreground">Request a Marker</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
