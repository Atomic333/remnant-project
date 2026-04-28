import { useState } from "react";
import { MapPin } from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyDnJ44MU2ZSj15ZBllE9qQpM6njANa-HCY";

interface StreetViewProps {
  lat: number;
  lng: number;
  name: string;
}

const StreetView = ({ lat, lng, name }: StreetViewProps) => {
  const [errored, setErrored] = useState(false);

  const src = `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${lat},${lng}&fov=80&pitch=0&radius=200&source=outdoor&return_error_code=true&key=${GOOGLE_MAPS_API_KEY}`;
  const mapsUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

  if (errored) {
    return (
      <div className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface-variant text-center px-4">
        <MapPin className="h-8 w-8 text-on-surface-variant" />
        <p className="text-xs text-on-surface-variant">Street View unavailable for this location.</p>
      </div>
    );
  }

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-56 w-full overflow-hidden rounded-xl elevation-1"
    >
      <img
        src={src}
        alt={`Street View of ${name}`}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
      <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur-sm">
        {name}
      </span>
    </a>
  );
};

export default StreetView;
