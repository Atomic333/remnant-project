import { ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Marker } from "@/data/markers";
import { useVisited } from "@/hooks/useVisited";
import { getMarkerImage } from "@/lib/markerImages";

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
      className="card-interactive focus-ring group flex w-full items-center gap-4 rounded-xl bg-card p-3 text-left elevation-1 hover:bg-card"
    >
      <div className="relative shrink-0 overflow-hidden rounded-xl">
        <img
          src={getMarkerImage(marker.id, marker.image)}
          alt={marker.name}
          className="h-14 w-14 rounded-xl object-cover transition-transform duration-500 ease-emphasized group-hover:scale-110"
        />
        {visited && (
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card animate-scale-in">
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
      <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant transition-transform duration-300 ease-emphasized group-hover:translate-x-1" />
    </button>
  );
};

export default MarkerCard;
