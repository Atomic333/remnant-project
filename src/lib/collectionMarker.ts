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
    image: image?.image_url ?? undefined,
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
    revealStyle: story.reveal_style as Marker["revealStyle"],
    sensitivity: story.sensitive ? "sensitive" : "standard",
    arrivalRadiusM: story.arrival_radius_m,
    availableFrom: story.available_from ?? undefined,
    availableUntil: story.available_until ?? undefined,
    availabilityTz: story.availability_tz,
    clue: story.clue ?? undefined,
    reviewStatus: "approved",
    collectionCode: story.collection_code,
  };
}

export function collectionStoryUrl(id: string) {
  return `/explore/washington/story/${encodeURIComponent(id)}`;
}