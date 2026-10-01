import type { Marker } from "@/data/markers";
import type { CImage, CMarker, CSource } from "@/hooks/useCollection";

export type CollectionMarker = Marker & { collectionCode: string };

/** Adapt one published collection story for shared visitor features without copying it into markers. */
export function collectionMarker(
  story: CMarker,
  sources: CSource[] = [],
  image?: CImage,
): CollectionMarker | null {
  if (story.status !== "published") return null;
  const hasLocation = !story.coord_withheld && story.lat != null && story.lng != null;
  return {
    id: story.marker_id,
    name: story.title,
    address: hasLocation ? story.address ?? story.city_name ?? "Washington" : "Location not shown",
    lat: hasLocation ? story.lat as number : 0,
    lng: hasLocation ? story.lng as number : 0,
    category: story.category ?? "History",
    summary: story.summary ?? "",
    story: story.story ?? "",
    sources: sources.map((s) => ({ name: s.title, url: s.url ?? "" })),
    image: image?.image_url ?? "history-museum",
    visited: false,
    city: story.city_id ?? undefined,
    rarity: story.rarity === "rare" ? "rare" : "common",
    artifactModelUrl: story.artifact_model_url ?? undefined,
    artifactName: story.artifact_name ?? undefined,
    artifactAttribution: story.artifact_attribution ?? undefined,
    streetView: hasLocation && story.street_view && typeof story.street_view === "object"
      ? story.street_view as Marker["streetView"]
      : undefined,
    markerType: "physical",
    discoveryVisibility: story.discovery_visibility as Marker["discoveryVisibility"],
    clue: story.clue ?? undefined,
    collectionCode: story.collection_code,
  };
}

export function collectionStoryUrl(id: string) {
  return `/explore/washington/story/${encodeURIComponent(id)}`;
}