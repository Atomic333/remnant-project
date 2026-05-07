import { useEffect, useRef, useState } from "react";
import { MapPin, Eye } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = "AIzaSyDnJ44MU2ZSj15ZBllE9qQpM6njANa-HCY";

interface StreetViewProps {
  lat: number;
  lng: number;
  name: string;
  panoId?: string;
  heading?: number;
  pitch?: number;
  autoActivate?: boolean;
}

const StreetView = ({ lat, lng, name, panoId, heading, pitch, autoActivate = false }: StreetViewProps) => {
  const [activated, setActivated] = useState(autoActivate);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    preventGoogleFontsLoading: true,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!activated || !isLoaded || !containerRef.current) return;
    setUnavailable(false);

    const pov = { heading: heading ?? 0, pitch: pitch ?? 0 };

    // Fast path: precomputed panoId + heading → no metadata lookup needed
    if (panoId) {
      new google.maps.StreetViewPanorama(containerRef.current, {
        pano: panoId,
        pov,
        zoom: 0,
        addressControl: false,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        showRoadLabels: false,
      });
      return;
    }

    // Fallback: search for nearest pano by lat/lng
    const sv = new google.maps.StreetViewService();
    sv.getPanorama(
      { location: { lat, lng }, radius: 200, source: google.maps.StreetViewSource.OUTDOOR },
      (data, status) => {
        if (status !== google.maps.StreetViewStatus.OK || !data?.location?.latLng) {
          setUnavailable(true);
          return;
        }
        if (!containerRef.current) return;
        new google.maps.StreetViewPanorama(containerRef.current, {
          position: data.location.latLng,
          pov,
          zoom: 0,
          addressControl: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          showRoadLabels: false,
        });
      }
    );
  }, [activated, isLoaded, lat, lng, panoId, heading, pitch]);

  if (!activated) {
    return (
      <button
        type="button"
        onClick={() => setActivated(true)}
        className="focus-ring flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface-variant text-center px-4 transition-transform active:scale-[0.99]"
      >
        <Eye className="h-8 w-8 text-primary" />
        <span className="font-display text-sm font-medium text-foreground">Show Street View</span>
        <span className="text-xs text-on-surface-variant">Tap to load an interactive view of this spot</span>
      </button>
    );
  }

  if (unavailable) {
    return (
      <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface-variant text-center px-4">
        <MapPin className="h-8 w-8 text-on-surface-variant" />
        <p className="text-xs text-on-surface-variant">Street View unavailable for this location.</p>
      </div>
    );
  }

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-xl elevation-1 bg-surface-variant">
      <div ref={containerRef} className="h-full w-full" />
      <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur-sm">
        {name}
      </span>
    </div>
  );
};

export default StreetView;
