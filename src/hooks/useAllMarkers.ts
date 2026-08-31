import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { markers as staticMarkers, type Marker } from "@/data/markers";
import { getStaticMapUrl } from "@/lib/staticMap";
import { getStreetViewImageUrl } from "@/lib/streetViewImage";

interface DbSource {
  name?: string;
  url?: string;
}

/** Map a database row into the Marker shape used across the app. */
function toMarker(row: Record<string, unknown>): Marker {
  const slug = String(row.slug);
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  const streetView = (row.street_view as Marker["streetView"]) ?? undefined;

  const base: Marker = {
    id: slug,
    name: String(row.name ?? ""),
    address: String(row.address ?? ""),
    lat,
    lng,
    summary: String(row.summary ?? ""),
    story: String(row.story ?? ""),
    sources: Array.isArray(row.sources)
      ? (row.sources as DbSource[])
          .filter((s) => s?.name)
          .map((s) => ({ name: String(s.name), url: String(s.url ?? "") }))
      : [],
    image: "",
    visited: false,
    category: String(row.category ?? "Other"),
    qrUrl: `https://markerquest.ai/marker/${slug}`,
    streetView: streetView?.panoId ? streetView : undefined,
  };

  const imagePath = row.image_path ? String(row.image_path) : "";
  if (imagePath) {
    const { data } = supabase.storage.from("marker-photos").getPublicUrl(imagePath);
    base.image = data.publicUrl;
  } else if (base.streetView?.panoId) {
    base.image = getStreetViewImageUrl(base);
  } else {
    base.image = getStaticMapUrl(lat, lng, { size: 600, zoom: 17 });
  }

  return base;
}

export function useDbMarkers() {
  return useQuery({
    queryKey: ["db-markers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("markers")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => toMarker(row as Record<string, unknown>));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** The 28 curated markers in code, merged with markers added through /admin. */
export function useAllMarkers(): Marker[] {
  const { data } = useDbMarkers();
  return data && data.length ? [...staticMarkers, ...data] : staticMarkers;
}
