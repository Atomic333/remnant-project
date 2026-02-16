import { useState, useEffect, useRef } from "react";
import { Search, List, X, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers, categories } from "@/data/mockData";
import type { Marker } from "@/data/mockData";
import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";
import FilterChips from "@/components/FilterChips";
import MarkerCard from "@/components/MarkerCard";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerImages: Record<string, string> = {
  "union-station": unionStation,
  "history-museum": historyMuseum,
};

const TACOMA_CENTER: [number, number] = [47.2529, -122.4443];

const MapPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const leafletMarkers = useRef<L.Marker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showList, setShowList] = useState(false);

  const filtered = markers.filter((m) => {
    const matchCat = activeFilter === "All" || m.category === activeFilter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView(TACOMA_CENTER, 14);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update markers when filter/search changes
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Remove old markers
    leafletMarkers.current.forEach((m) => m.remove());
    leafletMarkers.current = [];

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    filtered.forEach((m) => {
      const lm = L.marker([m.lat, m.lng], { icon })
        .addTo(map)
        .on("click", () => {
          setSelectedMarker(m);
          setShowList(false);
        });
      leafletMarkers.current.push(lm);
    });
  }, [filtered]);

  return (
    <div className="relative flex min-h-screen flex-col pb-20">
      {/* Search bar overlay */}
      <div className="absolute left-0 right-0 top-0 z-[1000] p-3">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 shadow-lg">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search markers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={() => setShowList(!showList)}
            className="ml-1 rounded-lg bg-primary p-1.5"
          >
            <List className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Full-screen map */}
      <div ref={mapRef} className="flex-1 min-h-[calc(100vh-5rem)]" />

      {/* Nearby list panel */}
      {showList && (
        <div className="absolute bottom-20 left-0 right-0 z-[1000] max-h-[60vh] overflow-y-auto rounded-t-2xl bg-background shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="sticky top-0 bg-background px-4 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Nearby ({filtered.length})
              </h2>
              <button onClick={() => setShowList(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="mt-2">
              <FilterChips
                categories={categories}
                active={activeFilter}
                onChange={setActiveFilter}
              />
            </div>
          </div>
          <div className="space-y-1 px-4 pb-4">
            {filtered.map((m) => (
              <MarkerCard key={m.id} marker={m} showDistance />
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No markers found.</p>
            )}
          </div>
        </div>
      )}

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
