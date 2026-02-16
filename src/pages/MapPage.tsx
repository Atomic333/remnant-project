import { useState, useEffect, useRef } from "react";
import { Search, List, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { markers, categories } from "@/data/mockData";
import type { Marker } from "@/data/mockData";
import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";
import FilterChips from "@/components/FilterChips";
import MarkerCard from "@/components/MarkerCard";
import PageHeader from "@/components/PageHeader";
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

    leafletMarkers.current.forEach((m) => m.remove());
    leafletMarkers.current = [];

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:32px;height:32px;border-radius:16px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
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
    <div className="relative flex h-screen flex-col pb-20">
      <PageHeader title="Map" back />

      {/* M3 Search bar */}
      <div className="absolute left-0 right-0 top-[60px] z-[500] px-4">
        <div className="flex items-center gap-3 rounded-xl bg-surface-variant px-4 py-3 elevation-2">
          <Search className="h-5 w-5 shrink-0 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search markers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-5 w-5 text-on-surface-variant" />
            </button>
          )}
          <button
            onClick={() => setShowList(!showList)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1" />

      {/* Nearby list */}
      {showList && (
        <div className="absolute bottom-20 left-0 right-0 z-[500] max-h-[60vh] overflow-y-auto rounded-t-xl bg-card elevation-3">
          <div className="sticky top-0 bg-card px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-medium text-foreground">
                Nearby ({filtered.length})
              </h2>
              <button
                onClick={() => setShowList(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-variant"
              >
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="mt-3">
              <FilterChips
                categories={categories}
                active={activeFilter}
                onChange={setActiveFilter}
              />
            </div>
          </div>
          <div className="space-y-2 px-4 pb-4">
            {filtered.map((m) => (
              <MarkerCard key={m.id} marker={m} showDistance />
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-on-surface-variant">No markers found.</p>
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
                  <h3 className="font-display text-lg font-medium text-foreground">{selectedMarker.name}</h3>
                  <p className="text-sm text-on-surface-variant">{selectedMarker.address}</p>
                  {selectedMarker.distance && (
                    <p className="mt-1 text-xs text-on-surface-variant">{selectedMarker.distance}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/marker/${selectedMarker.id}`)}
                className="mt-4 w-full rounded-xl bg-primary py-3 font-display text-sm font-medium text-primary-foreground"
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
