import tacomaHero from "@/assets/tacoma-hero.jpg";
import bremertonHero from "@/assets/bremerton-hero.jpg";
import type { Marker } from "@/data/markers";
import { getStaticMapUrl } from "@/lib/staticMap";

export interface City {
  /** Stable id, also stored on markers as `city`. Legacy ids are plain names; new ones are "Name, ST". */
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

/** Curated cities with custom photos. Always shown. */
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
  },
];

export const DEFAULT_CITY_ID = "Tacoma";

export const US_STATES: [string, string][] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],
  ["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],
  ["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],
  ["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],
  ["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],
  ["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],
  ["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],
  ["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],
  ["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
];

/** Build the stored city id for a city + state. Keeps the legacy WA ids. */
export function makeCityId(name: string, state: string): string {
  const curated = cities.find((c) => c.name === name && c.state === state);
  return curated ? curated.id : `${name}, ${state}`;
}

function parseId(id: string): { name: string; state: string } {
  const m = /^(.*),\s*([A-Z]{2})$/.exec(id);
  return m ? { name: m[1], state: m[2] } : { name: id, state: "WA" };
}

/** Curated cities plus any city that has at least one marker. */
export function citiesForMarkers(markers: Marker[]): City[] {
  const byId = new Map<string, Marker[]>();
  for (const m of markers) {
    const id = m.city ?? DEFAULT_CITY_ID;
    if (cities.some((c) => c.id === id)) continue;
    const list = byId.get(id) ?? [];
    list.push(m);
    byId.set(id, list);
  }
  const extra: City[] = [...byId.entries()]
    .map(([id, list]) => {
      const { name, state } = parseId(id);
      const lat = list.reduce((s, m) => s + m.lat, 0) / list.length;
      const lng = list.reduce((s, m) => s + m.lng, 0) / list.length;
      return {
        id,
        name,
        state,
        image: getStaticMapUrl(lat, lng, { size: 640, zoom: 12 }),
        center: { lat, lng },
        zoom: 13,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...cities, ...extra];
}

export function getCity(id: string | null | undefined, markers?: Marker[]): City {
  const list = markers ? citiesForMarkers(markers) : cities;
  const found = list.find((c) => c.id === id);
  if (found) return found;
  if (id && id.includes(",")) {
    const { name, state } = parseId(id);
    return { ...cities[0], id, name, state };
  }
  return cities[0];
}

export type UsCityData = Record<string, [string, number, number][]>;
let cityDataPromise: Promise<UsCityData> | null = null;
/** Lazily load every U.S. city (Census Gazetteer). Admin only. */
export function loadUsCities(): Promise<UsCityData> {
  cityDataPromise ??= fetch("/data/us-cities.json").then((r) => r.json());
  return cityDataPromise;
}
