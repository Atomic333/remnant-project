import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { markers as staticMarkers, type Marker } from "@/data/markers";
import { getStaticMapUrl } from "@/lib/staticMap";
import { getStreetViewImageUrl } from "@/lib/streetViewImage";
import { getLocalMarkerImage } from "@/lib/markerImages";
import { DEFAULT_CITY_ID } from "@/data/cities";
import { useSelectedCity } from "@/hooks/useSelectedCity";

interface DbSource {
  name?: string;
  url?: string;
}

/** Map a database row into the Marker shape used across the app. */
async function toMarker(row: Record<string, unknown>): Promise<Marker> {
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
    city: String(row.city ?? DEFAULT_CITY_ID),
    rarity: row.rarity === "rare" ? "rare" : "common",
    qrUrl: `https://markerquest.ai/marker/${slug}`,
    streetView: streetView?.panoId ? streetView : undefined,
    artifactName: row.artifact_name ? String(row.artifact_name) : undefined,
    artifactAttribution: row.artifact_attribution ? String(row.artifact_attribution) : undefined,
  };

  const modelPath = row.artifact_model_url ? String(row.artifact_model_url) : "";
  if (modelPath) {
    if (/^https?:\/\//.test(modelPath) || modelPath.startsWith("/")) {
      base.artifactModelUrl = modelPath;
    } else {
      const { data } = await supabase.storage
        .from("marker-models")
        .createSignedUrl(modelPath, 60 * 60 * 24 * 7);
      if (data?.signedUrl) base.artifactModelUrl = data.signedUrl;
    }
  }

  const imagePath = row.image_path ? String(row.image_path) : "";
  if (imagePath) {
    const { data } = await supabase.storage
      .from("marker-photos")
      .createSignedUrl(imagePath, 60 * 60 * 24 * 7);
    if (data?.signedUrl) base.image = data.signedUrl;
  }

  if (!base.image) {
    // Curated markers adopted into the database keep their bundled asset.
    const local = getLocalMarkerImage(slug);
    base.image =
      local ??
      (base.streetView?.panoId
        ? getStreetViewImageUrl(base)
        : getStaticMapUrl(lat, lng, { size: 600, zoom: 17 }));
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
      return Promise.all((data ?? []).map((row) => toMarker(row as Record<string, unknown>)));
    },
    staleTime: 5 * 60 * 1000,
  });
}


/**
 * The curated markers in code, with database rows layered on top: a database
 * marker whose slug matches a curated id replaces it, everything else is added.
 */
export function useAllMarkers(): Marker[] {
  const { data } = useDbMarkers();
  return useMemo(() => {
    if (!data || !data.length) return staticMarkers;
    const overrides = new Map(data.map((m) => [m.id, m]));
    const merged = staticMarkers.map((m) => overrides.get(m.id) ?? m);
    const staticIds = new Set(staticMarkers.map((m) => m.id));
    return [...merged, ...data.filter((m) => !staticIds.has(m.id))];
  }, [data]);
}


/** Markers belonging to the city the user is currently exploring. */
export function useCityMarkers(): Marker[] {
  const all = useAllMarkers();
  const { cityId } = useSelectedCity();
  return useMemo(() => all.filter((m) => (m.city ?? DEFAULT_CITY_ID) === cityId), [all, cityId]);
}
