import { cities, DEFAULT_CITY_ID, type City } from "@/data/cities";
import type { Marker } from "@/data/markers";

export interface CityProgress {
  city: City;
  total: number;
  visited: number;
  pct: number;
}

/** Per-city visited counts across every city the app knows about. */
export function cityProgress(markers: Marker[], visited: Set<string>): CityProgress[] {
  return cities.map((city) => {
    const inCity = markers.filter((m) => (m.city ?? DEFAULT_CITY_ID) === city.id);
    const visitedCount = inCity.filter((m) => visited.has(m.id)).length;
    return {
      city,
      total: inCity.length,
      visited: visitedCount,
      pct: inCity.length > 0 ? Math.round((visitedCount / inCity.length) * 100) : 0,
    };
  });
}

export function overallProgress(markers: Marker[], visited: Set<string>) {
  const total = markers.length;
  const visitedCount = markers.filter((m) => visited.has(m.id)).length;
  return {
    total,
    visited: visitedCount,
    pct: total > 0 ? Math.round((visitedCount / total) * 100) : 0,
  };
}

export function formatVisitDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
