import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { COLLECTION_CODE } from "@/lib/collectionImport";

export type CMarker = Tables<"collection_markers">;
export type CSource = Tables<"collection_sources">;
export type CImage = Tables<"collection_images">;
export type CCollection = Tables<"collections">;

export interface CollectionData {
  collection: CCollection | null;
  markers: CMarker[];
  images: CImage[];
  sources: CSource[];
  loading: boolean;
  error: string | null;
}

/** Loads the collection. Visitors only see cleared images (enforced in the database too). */
export function useCollection(withSources = false): CollectionData {
  const [state, setState] = useState<CollectionData>({ collection: null, markers: [], images: [], sources: [], loading: true, error: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, m, i, s] = await Promise.all([
        supabase.from("collections").select("*").eq("code", COLLECTION_CODE).maybeSingle(),
        supabase.from("collection_markers").select("*").eq("collection_code", COLLECTION_CODE).order("marker_id"),
        supabase.from("collection_images").select("*").eq("cleared", true).order("position"),
        withSources ? supabase.from("collection_sources").select("*").order("position") : Promise.resolve({ data: [], error: null }),
      ]);
      if (!alive) return;
      const ids = new Set((m.data ?? []).map((x) => x.marker_id));
      setState({
        collection: c.data ?? null,
        markers: m.data ?? [],
        images: (i.data ?? []).filter((x) => ids.has(x.marker_id)),
        sources: ((s.data ?? []) as CSource[]).filter((x) => ids.has(x.marker_id)),
        loading: false,
        error: c.error?.message ?? m.error?.message ?? null,
      });
    })();
    return () => { alive = false; };
  }, [withSources]);
  return state;
}

/** Location label that never presents an approximate point as exact. */
export function locationLabel(m: CMarker) {
  if (m.lat == null || m.lng == null) return "Location not shown";
  return /address|building/i.test(m.coord_precision ?? "") ? "Mapped location" : "Approximate location";
}

export const focusTone = (f: string | null) =>
  /overlap/i.test(f ?? "") ? "Overlapping" : /indigenous/i.test(f ?? "") ? "Indigenous" : /black/i.test(f ?? "") ? "Black" : "History";
