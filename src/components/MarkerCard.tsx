import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Marker } from "@/data/mockData";
import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";

const images: Record<string, string> = {
  "union-station": unionStation,
  "history-museum": historyMuseum,
};

interface MarkerCardProps {
  marker: Marker;
  showDistance?: boolean;
}

const MarkerCard = ({ marker, showDistance }: MarkerCardProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/marker/${marker.id}`)}
      className="flex w-full items-center gap-3 rounded-lg bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      <img
        src={images[marker.image] || unionStation}
        alt={marker.name}
        className="h-12 w-12 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-card-foreground">{marker.name}</h3>
        <p className="truncate text-sm text-muted-foreground">
          {showDistance && marker.distance
            ? `${marker.distance} • `
            : ""}
          Supporting line text lorem ipsum dolor sit amet, consectetur.
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
};

export default MarkerCard;
