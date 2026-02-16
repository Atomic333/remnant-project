import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers, categories } from "@/data/mockData";
import type { Marker } from "@/data/mockData";
import FilterChips from "@/components/FilterChips";
import MarkerCard from "@/components/MarkerCard";
import tacomaHero from "@/assets/tacoma-hero.jpg";
import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

const markerImages: Record<string, string> = {
  "union-station": unionStation,
  "history-museum": historyMuseum,
};

const MapPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);

  const filtered = markers.filter((m) => {
    const matchCat = activeFilter === "All" || m.category === activeFilter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const pinPositions = [
    "left-1/3 top-1/3",
    "left-1/2 top-1/2",
    "left-2/3 top-1/4",
  ];

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
        {filtered.slice(0, 3).map((m, i) => (
          <button
            key={m.id}
            onClick={() => setSelectedMarker(m)}
            className={`absolute ${pinPositions[i]} h-4 w-4 rounded-full bg-primary shadow-lg transition-transform hover:scale-150`}
          />
        ))}
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
          <div key={m.id} onClick={() => setSelectedMarker(m)} className="cursor-pointer">
            <MarkerCard marker={m} showDistance />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No markers found.
          </div>
        )}
      </div>

      {/* Bottom sheet preview */}
      <Drawer open={!!selectedMarker} onOpenChange={(open) => !open && setSelectedMarker(null)}>
        <DrawerContent className="px-4 pb-6">
          {selectedMarker && (
            <div className="pt-2">
              <DrawerTitle className="sr-only">{selectedMarker.name}</DrawerTitle>
              <div className="flex items-center gap-4">
                <img
                  src={markerImages[selectedMarker.image] || unionStation}
                  alt={selectedMarker.name}
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">{selectedMarker.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedMarker.address}</p>
                  {selectedMarker.distance && (
                    <p className="mt-1 text-xs text-muted-foreground">{selectedMarker.distance}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/marker/${selectedMarker.id}`)}
                className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
              >
                View Details
              </button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default MapPage;