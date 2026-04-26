import { useState, useEffect } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import { markers, categories } from "@/data/markers";
import FilterChips from "@/components/FilterChips";
import MarkerCard from "@/components/MarkerCard";
import PageHeader from "@/components/PageHeader";

type UserLocation = { lat: number; lng: number } | null;

/** Haversine distance in miles between two coords */
function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(miles: number): string {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  return `${miles.toFixed(1)} mi`;
}

const NearbyPage = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [userLocation, setUserLocation] = useState<UserLocation>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationDenied(true); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationDenied(true),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const withDistance = markers.map((m) => ({
    ...m,
    _miles: userLocation ? distanceMiles(userLocation.lat, userLocation.lng, m.lat, m.lng) : null,
    _distanceLabel: userLocation
      ? formatDistance(distanceMiles(userLocation.lat, userLocation.lng, m.lat, m.lng))
      : m.distance ?? null,
  }));

  const filtered = withDistance
    .filter((m) => activeFilter === "All" || m.category === activeFilter)
    .sort((a, b) => {
      if (a._miles === null && b._miles === null) return 0;
      if (a._miles === null) return 1;
      if (b._miles === null) return -1;
      return a._miles - b._miles;
    });

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title="Tacoma Markers" />

      {/* Location status banner */}
      <div className="flex items-center gap-2 px-4 py-2">
        {locationDenied ? (
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            Enable location to sort by distance
          </p>
        ) : userLocation ? (
          <p className="text-xs text-primary flex items-center gap-1">
            <LocateFixed className="h-3.5 w-3.5" />
            Sorted by distance from you
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <LocateFixed className="h-3.5 w-3.5 animate-pulse" />
            Getting your location…
          </p>
        )}
      </div>

      <div className="px-4 pb-3">
        <FilterChips categories={categories} active={activeFilter} onChange={setActiveFilter} />
      </div>

      <div className="space-y-1 px-4">
        {filtered.map((m) => (
          <MarkerCard key={m.id} marker={m} distanceLabel={m._distanceLabel ?? undefined} showDistance />
        ))}
      </div>
    </div>
  );
};

export default NearbyPage;
