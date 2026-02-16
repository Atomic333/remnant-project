import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { markers } from "@/data/mockData";
import type { Marker } from "@/data/mockData";
import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";
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
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView(TACOMA_CENTER, 14);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Custom teal marker icon
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    markers.forEach((m) => {
      L.marker([m.lat, m.lng], { icon })
        .addTo(map)
        .on("click", () => setSelectedMarker(m));
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col pb-20">
      {/* Full-screen map */}
      <div ref={mapRef} className="flex-1 min-h-[calc(100vh-5rem)]" />

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
