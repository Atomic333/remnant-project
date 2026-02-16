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
      {/* Headline */}
        <h2 className="text-3xl font-bold leading-tight text-foreground">
          Discover<br />
          <span className="text-primary">history</span> where you stand.
        </h2>

        {/* Hero Image Card */}
        <div className="mt-5 overflow-hidden rounded-2xl shadow-lg">
          <img
            src={tacomaHero}
            alt="Tacoma cityscape with Mount Rainier"
            className="h-56 w-full object-cover"
          />
        </div>

        {/* City Title + Progress */}
        <div className="mt-6">
          <h3 className="text-xl font-bold text-foreground">Tacoma, WA</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Progress: {visited}/{markers.length} Markers
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(visited / markers.length) * 100}%` }}
            />
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate("/map")}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Explore Tacoma
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default HomePage;
