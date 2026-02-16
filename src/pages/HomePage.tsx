import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/mockData";
import tacomaHero from "@/assets/tacoma-hero.jpg";

const HomePage = () => {
  const navigate = useNavigate();
  const visited = markers.filter((m) => m.visited).length;
  const pct = Math.round((visited / markers.length) * 100);

  return (
    <div className="min-h-screen pb-20">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4">
        <span className="font-display text-base font-medium text-primary">The Remnant Project</span>
        <button
          onClick={() => navigate("/settings")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <div className="px-5">
        {/* Headline */}
        <h2 className="font-display text-3xl font-medium leading-tight text-foreground">
          Discover<br />
          <span className="text-primary">history</span> where you stand.
        </h2>

        {/* Hero Image Card */}
        <div className="mt-6 overflow-hidden rounded-xl elevation-2">
          <img
            src={tacomaHero}
            alt="Tacoma cityscape with Mount Rainier"
            className="h-56 w-full object-cover"
          />
        </div>

        {/* City + Progress */}
        <div className="mt-6 rounded-xl bg-card p-4 elevation-1">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-medium text-foreground">Tacoma, WA</h3>
            <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {pct}%
            </span>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            {visited}/{markers.length} markers visited
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-variant">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/map")}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display text-base font-medium text-primary-foreground elevation-1 transition-shadow hover:elevation-2"
        >
          Explore Tacoma
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default HomePage;
