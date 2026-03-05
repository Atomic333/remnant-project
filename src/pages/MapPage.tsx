import { useState, useCallback } from "react";
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
import { GoogleMap, useJsApiLoader, Marker as GMarker } from "@react-google-maps/api";
import { useVisited } from "@/hooks/useVisited";

const GOOGLE_MAPS_API_KEY = "AIzaSyDnJ44MU2ZSj15ZBllE9qQpM6njANa-HCY";

const markerImages: Record<string, string> = {
  "union-station": unionStation,
  "history-museum": historyMuseum,
};

const TACOMA_CENTER = { lat: 47.2529, lng: -122.4443 };
const mapContainerStyle = { width: "100%", height: "100%" };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: "greedy",
  styles: [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  ],
};



const MapPage = () => {
  const navigate = useNavigate();
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showList, setShowList] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const filtered = markers.filter((m) => {
    const matchCat = activeFilter === "All" || m.category === activeFilter;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const onMarkerClick = useCallback((m: Marker) => {
    setSelectedMarker(m);
    setShowList(false);
  }, []);

  return (
    <div className="relative flex h-screen flex-col pb-20">
      <PageHeader title="Map" />

      {/* Search bar */}
      <div className="absolute left-0 right-0 top-[60px] z-[500] px-4">
        <div className={`flex items-center gap-3 bg-surface-variant px-4 py-3 elevation-2 ${search && filtered.length > 0 ? "rounded-t-xl" : "rounded-xl"}`}>
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
        {/* Search results dropdown */}
        {search && (
          <div className="max-h-64 overflow-y-auto rounded-b-xl bg-card elevation-2 border-t border-border">
            {filtered.length > 0 ? filtered.slice(0, 8).map((m) => (
              <button
                key={m.id}
                onClick={() => { navigate(`/marker/${m.id}`); setSearch(""); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-variant transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Search className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                  <p className="truncate text-xs text-on-surface-variant">{m.address}</p>
                </div>
              </button>
            )) : (
              <p className="px-4 py-3 text-sm text-on-surface-variant">No results for "{search}"</p>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={TACOMA_CENTER}
            zoom={14}
            options={mapOptions}
          >
            {filtered.map((m) => (
              <GMarker
                key={m.id}
                position={{ lat: m.lat, lng: m.lng }}
                onClick={() => onMarkerClick(m)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: m.visited ? "#22c55e" : "#ef4444",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
              />
            ))}
          </GoogleMap>
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <p className="text-sm text-on-surface-variant">Loading map…</p>
          </div>
        )}
      </div>

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
