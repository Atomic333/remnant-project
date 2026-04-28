const GOOGLE_MAPS_API_KEY = "AIzaSyDnJ44MU2ZSj15ZBllE9qQpM6njANa-HCY";

interface StreetViewProps {
  lat: number;
  lng: number;
  name: string;
}

const StreetView = ({ lat, lng, name }: StreetViewProps) => {
  const src = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_MAPS_API_KEY}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-xl elevation-1 bg-surface-variant">
      <iframe
        title={`Street View of ${name}`}
        src={src}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
};

export default StreetView;
