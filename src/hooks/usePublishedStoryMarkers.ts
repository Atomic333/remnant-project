import { useMemo } from "react";
import { useCollection } from "@/hooks/useCollection";
import { collectionMarker } from "@/lib/collectionMarker";

/** Published collection stories adapted for progress, search, QR sheets and trail building. */
export function usePublishedStoryMarkers() {
  const { markers, images, sources, loading } = useCollection(true);
  const items = useMemo(() => markers.flatMap((story) => {
    const marker = collectionMarker(
      story,
      sources.filter((s) => s.marker_id === story.marker_id),
      images.find((i) => i.marker_id === story.marker_id),
    );
    return marker ? [marker] : [];
  }), [markers, images, sources]);
  return { markers: items, loading };
}

export default usePublishedStoryMarkers;