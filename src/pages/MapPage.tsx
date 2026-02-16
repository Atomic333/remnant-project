import { useState } from "react";
import { Search } from "lucide-react";
import { markers, categories } from "@/data/mockData";
import FilterChips from "@/components/FilterChips";
import MarkerCard from "@/components/MarkerCard";
import tacomaHero from "@/assets/tacoma-hero.jpg";

const MapPage = () => {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = markers.filter((m) => {
    const matchCat = activeFilter === "All" || m.category === activeFilter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex min-h-screen flex-col pb-20">
      {/* Header */}
      <header className="bg-card px-4 py-3">
        <h1 className="text-lg font-semibold text-primary">Tacoma Markers</h1>
      </header>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search markers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Map placeholder */}
      <div className="relative mx-4 h-48 overflow-hidden rounded-xl bg-muted">
        <img src={tacomaHero} alt="Map view" className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-card/80 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm">
            Explore Tacoma
          </span>
        </div>
        {/* Marker pins */}
        <div className="absolute left-1/3 top-1/3 h-3 w-3 rounded-full bg-primary shadow-lg" />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-primary shadow-lg" />
        <div className="absolute left-2/3 top-1/4 h-3 w-3 rounded-full bg-primary shadow-lg" />
      </div>

      {/* Filters */}
      <div className="px-4 py-3">
        <FilterChips categories={categories} active={activeFilter} onChange={setActiveFilter} />
      </div>

      {/* Marker list */}
      <div className="flex-1 space-y-1 px-4">
        <p className="mb-2 text-sm text-muted-foreground">
          View all Tacoma markers →
        </p>
        {filtered.map((m) => (
          <MarkerCard key={m.id} marker={m} showDistance />
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No markers found.
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
