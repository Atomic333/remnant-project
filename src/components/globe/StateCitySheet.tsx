import { Link } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

export interface CityCard {
  id: string;
  name: string;
  image: string;
  total: number;
  visited: number;
  lat: number;
  lng: number;
  zoom: number;
}

interface Props {
  stateName: string | null;
  stateAbbr: string | null;
  cities: CityCard[];
  showCollection: boolean;
  onClose: () => void;
  onPick: (c: CityCard) => void;
}

export default function StateCitySheet({ stateName, stateAbbr, cities, showCollection, onClose, onPick }: Props) {
  return (
    <Drawer open={!!stateAbbr} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85dvh]">
        <div className="overflow-y-auto px-5 pb-8 pt-2">
          <DrawerTitle className="font-display text-2xl">{stateName}</DrawerTitle>
          <p className="mb-4 text-xs text-on-surface-variant">Choose a city to open the map.</p>

          {showCollection && stateAbbr === "WA" && (
            <Link
              to="/explore/washington"
              className="interactive mb-3 flex items-center gap-3 rounded-2xl border border-quest-gold/40 bg-quest-gold/10 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-quest-gold">Featured collection</p>
                <p className="font-display text-base text-foreground">Washington: Stories That Shaped This Place</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant" />
            </Link>
          )}

          <div className="grid grid-cols-2 gap-3">
            {cities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c)}
                className="relative h-40 overflow-hidden rounded-2xl text-left elevation-2 transition-transform active:scale-[0.98]"
              >
                <img src={c.image} alt={`${c.name}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="font-display text-lg leading-tight text-foreground">{c.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-on-surface-variant">
                    <MapPin className="h-3 w-3" /> {c.total} marker{c.total === 1 ? "" : "s"} · {c.visited} visited
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
