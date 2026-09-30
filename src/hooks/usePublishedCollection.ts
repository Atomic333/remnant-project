import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COLLECTION_CODE } from "@/lib/collectionImport";

export interface PublishedStory {
  id: string;
  title: string;
  cityId: string | null;
  lat: number | null;
  lng: number | null;
  image: string | null;
}

/** Published collection stories only — drafts are excluded even for editors. */
export function usePublishedCollection(): PublishedStory[] {
  const { data } = useQuery({
    queryKey: ["published-collection", COLLECTION_CODE],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: m } = await supabase
        .from("collection_markers")
        .select("marker_id, title, city_id, lat, lng, coord_withheld")
        .eq("collection_code", COLLECTION_CODE)
        .eq("status", "published");
      const rows = m ?? [];
      if (!rows.length) return [];
      const { data: imgs } = await supabase
        .from("collection_images")
        .select("marker_id, image_url, position")
        .eq("cleared", true)
        .in("marker_id", rows.map((r) => r.marker_id))
        .order("position");
      const firstImg = new Map<string, string>();
      for (const i of imgs ?? []) if (i.image_url && !firstImg.has(i.marker_id)) firstImg.set(i.marker_id, i.image_url);
      return rows.map((r): PublishedStory => ({
        id: r.marker_id,
        title: r.title,
        cityId: r.city_id,
        lat: r.coord_withheld ? null : r.lat,
        lng: r.coord_withheld ? null : r.lng,
        image: firstImg.get(r.marker_id) ?? null,
      }));
    },
  });
  return data ?? [];
}
