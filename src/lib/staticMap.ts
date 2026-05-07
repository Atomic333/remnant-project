import { GOOGLE_MAPS_STATIC_KEY } from "./googleMapsKey";

const BASE = "https://maps.googleapis.com/maps/api/staticmap";

interface StaticMapOpts {
  size?: number; // square px
  zoom?: number;
  scale?: 1 | 2;
}

/**
 * Build a Google Static Maps URL with a teal pin centered on the marker.
 */
export function getStaticMapUrl(
  lat: number,
  lng: number,
  { size = 112, zoom = 16, scale = 2 }: StaticMapOpts = {}
): string {
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: `${size}x${size}`,
    scale: String(scale),
    maptype: "roadmap",
    markers: `color:0x0d9488|${lat},${lng}`,
    key: GOOGLE_MAPS_STATIC_KEY,
  });
  return `${BASE}?${params.toString()}`;
}
