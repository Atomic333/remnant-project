import tacomaHero from "@/assets/tacoma-hero.jpg";
import bremertonHero from "@/assets/bremerton-hero.jpg";

export interface City {
  /** Stable id, also stored on markers as `city`. */
  id: string;
  name: string;
  state: string;
  image: string;
  /** Map default center + zoom. */
  center: { lat: number; lng: number };
  zoom: number;
  /** No markers published yet — show the "More Markers Coming Soon!" wording. */
  comingSoon?: boolean;
}

export const COMING_SOON_TEXT = "More Markers Coming Soon!";

export const cities: City[] = [
  {
    id: "Tacoma",
    name: "Tacoma",
    state: "WA",
    image: tacomaHero,
    center: { lat: 47.2529, lng: -122.4443 },
    zoom: 14,
  },
  {
    id: "Bremerton",
    name: "Bremerton",
    state: "WA",
    image: bremertonHero,
    center: { lat: 47.5673, lng: -122.6329 },
    zoom: 14,
    comingSoon: true,
  },
];

export const DEFAULT_CITY_ID = "Tacoma";

export function getCity(id: string | null | undefined): City {
  return cities.find((c) => c.id === id) ?? cities[0];
}
