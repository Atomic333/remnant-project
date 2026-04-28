import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = "AIzaSyDnJ44MU2ZSj15ZBllE9qQpM6njANa-HCY";

interface StreetViewProps {
  lat: number;
  lng: number;
  name: string;
}

const StreetView = ({ lat, lng, name }: StreetViewProps) => {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;
    setUnavailable(false);
    const position = { lat, lng };
    const sv = new google.maps.StreetViewService();
    sv.getPanorama({ location: position, radius: 200, source: google.maps.StreetViewSource.OUTDOOR }, (data, status) => {
      if (status !== google.maps.StreetViewStatus.OK || !data?.location?.latLng) {
        setUnavailable(true);
        return;
      }
      if (!containerRef.current) return;
      new google.maps.StreetViewPanorama(containerRef.current, {
        position: data.location.latLng,
        pov: { heading: 0, pitch: 0 },
        zoom: 0,
        addressControl: false,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        showRoadLabels: false,
      });
    });
  }, [isLoaded, lat, lng]);

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
