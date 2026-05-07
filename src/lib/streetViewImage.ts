import type { Marker } from "@/data/markers";
import { GOOGLE_MAPS_STATIC_KEY } from "./googleMapsKey";

const BASE = "https://maps.googleapis.com/maps/api/streetview";

/**
 * Build a Street View Static API URL for a marker.
 * Uses precomputed panoId + heading if present (sharp framing on the building),
 * otherwise falls back to lat/lng so we still get *something* useful.
 */
export function getStreetViewImageUrl(
  marker: Marker,
  opts: { width?: number; height?: number; fov?: number } = {}
): string {
  const { width = 800, height = 480, fov = 80 } = opts;
  const params = new URLSearchParams({
    size: `${width}x${height}`,
    fov: String(fov),
    key: GOOGLE_MAPS_STATIC_KEY,
    return_error_code: "true",
  });

  if (marker.streetView?.panoId) {
    params.set("pano", marker.streetView.panoId);
    params.set("heading", String(marker.streetView.heading));
    params.set("pitch", String(marker.streetView.pitch ?? 0));
  } else {
    params.set("location", `${marker.lat},${marker.lng}`);
    params.set("heading", "0");
    params.set("pitch", "0");
    params.set("radius", "100");
    params.set("source", "outdoor");
  }

  return `${BASE}?${params.toString()}`;
}
