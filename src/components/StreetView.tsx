import { useJsApiLoader, StreetViewPanorama, GoogleMap } from "@react-google-maps/api";
import { useState } from "react";
import { MapPin } from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyDnJ44MU2ZSj15ZBllE9qQpM6njANa-HCY";
const containerStyle = { width: "100%", height: "100%" };

interface StreetViewProps {
  lat: number;
  lng: number;
  name: string;
}

const StreetView = ({ lat, lng, name }: StreetViewProps) => {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const [unavailable, setUnavailable] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-xl bg-surface-variant">
        <p className="text-xs text-on-surface-variant">Loading Street View…</p>
      </div>
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
    <div className="relative h-56 w-full overflow-hidden rounded-xl elevation-1">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat, lng }}
        zoom={14}
        options={{ disableDefaultUI: true }}
      >
        <StreetViewPanorama
          options={{
            position: { lat, lng },
            visible: true,
            addressControl: false,
            fullscreenControl: false,
            motionTracking: false,
            motionTrackingControl: false,
            enableCloseButton: false,
            showRoadLabels: false,
          }}
          onUnmount={() => {}}
        />
      </GoogleMap>
      <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur-sm">
        {name}
      </span>
    </div>
  );
};

export default StreetView;
