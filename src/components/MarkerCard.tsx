import { ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Marker } from "@/data/mockData";
import unionStation from "@/assets/union-station.jpg";
import historyMuseum from "@/assets/history-museum.jpg";
import { useVisited } from "@/hooks/useVisited";

const images: Record<string, string> = {
  "union-station": unionStation,
  "history-museum": historyMuseum,
};

interface MarkerCardProps {
  marker: Marker;
  showDistance?: boolean;
  distanceLabel?: string;
}

const MarkerCard = ({ marker, showDistance, distanceLabel }: MarkerCardProps) => {
  const navigate = useNavigate();
  const { isVisited } = useVisited();
  const visited = isVisited(marker.id);

  return (
    <button
      onClick={() => navigate(`/marker/${marker.id}`)}
      className="flex w-full items-center gap-4 rounded-xl bg-card p-3 text-left transition-colors hover:bg-surface-variant elevation-1"
    >
      <div className="relative shrink-0">
        <img
          src={images[marker.image] || unionStation}
          alt={marker.name}
          className="h-14 w-14 rounded-xl object-cover"
        />
        {visited && (
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display font-medium text-card-foreground">{marker.name}</h3>
        <p className="truncate text-sm text-on-surface-variant">
          {showDistance && (distanceLabel ?? marker.distance) ? `${distanceLabel ?? marker.distance} • ` : ""}
          {marker.address}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant" />
    </button>
  );
};

export default MarkerCard;
