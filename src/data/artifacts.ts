import type { Marker } from "@/data/markers";

import welcomeFigure from "@/assets/artifacts/welcome-figure.glb.asset.json";
import bronzePlaque from "@/assets/artifacts/bronze-plaque.glb.asset.json";
import memorialObelisk from "@/assets/artifacts/memorial-obelisk.glb.asset.json";
import harborLantern from "@/assets/artifacts/harbor-lantern.glb.asset.json";
import brickStorefront from "@/assets/artifacts/brick-storefront.glb.asset.json";
import parkBench from "@/assets/artifacts/park-bench.glb.asset.json";
import railSpike from "@/assets/artifacts/rail-spike.glb.asset.json";
import canoePaddle from "@/assets/artifacts/canoe-paddle.glb.asset.json";

export interface Artifact {
  /** Stable id — recorded in the reward ledger so a future mint can reference it. */
  id: string;
  name: string;
  /** Short line shown under the viewer. */
  blurb: string;
  modelUrl: string;
  /** Optional USDZ for iOS Quick Look placement. */
  iosModelUrl?: string;
  rarity: "common" | "rare";
  /** Credit line, if the model came from outside the project. */
  attribution?: string;
}

/** The curated artifact library. Models are authored for MarkerQuest. */
export const ARTIFACTS: Record<string, Artifact> = {
  "welcome-figure": {
    id: "welcome-figure",
    name: "Cedar Welcome Figure",
    blurb: "A carved cedar figure with upraised arms, greeting travellers to the water.",
    modelUrl: welcomeFigure.url,
    rarity: "rare",
  },
  "canoe-paddle": {
    id: "canoe-paddle",
    name: "Cedar Canoe Paddle",
    blurb: "The paddle of the People of the Water, worn smooth by the tide.",
    modelUrl: canoePaddle.url,
    rarity: "common",
  },
  "bronze-plaque": {
    id: "bronze-plaque",
    name: "Bronze Commemorative Plaque",
    blurb: "A cast bronze plaque on a stone footing — the classic marker of record.",
    modelUrl: bronzePlaque.url,
    rarity: "common",
  },
  "memorial-obelisk": {
    id: "memorial-obelisk",
    name: "Memorial Obelisk",
    blurb: "A gilt-capped stone obelisk raised in remembrance.",
    modelUrl: memorialObelisk.url,
    rarity: "rare",
  },
  "harbor-lantern": {
    id: "harbor-lantern",
    name: "Harbor Lantern",
    blurb: "An iron and amber-glass lantern that once guided vessels into the bay.",
    modelUrl: harborLantern.url,
    rarity: "rare",
  },
  "brick-storefront": {
    id: "brick-storefront",
    name: "Brick Storefront",
    blurb: "A miniature of the brick-and-stone facades that shaped the district.",
    modelUrl: brickStorefront.url,
    rarity: "common",
  },
  "park-bench": {
    id: "park-bench",
    name: "Park Bench & Grove",
    blurb: "A cedar bench beneath a young conifer — a place to sit with the story.",
    modelUrl: parkBench.url,
    rarity: "common",
  },
  "rail-spike": {
    id: "rail-spike",
    name: "Ceremonial Rail Spike",
    blurb: "A gilt spike standing in the ties, marking the line that built the city.",
    modelUrl: railSpike.url,
    rarity: "rare",
  },
};

/** Hand-picked artifacts for specific curated sites. */
const BY_MARKER_ID: Record<string, string> = {
  "marker-001": "welcome-figure",
  "marker-002": "canoe-paddle",
  "marker-003": "canoe-paddle",
  "marker-005": "harbor-lantern",
  "marker-006": "canoe-paddle",
  "marker-021": "park-bench",
};

const KEYWORD_RULES: { key: string; test: RegExp }[] = [
  { key: "harbor-lantern", test: /light ?(house|station)|harbor|harbour|dock|wharf|shipyard|navy|ferry|bay/i },
  { key: "rail-spike", test: /rail|railroad|locomotive|train|prairie line|depot|union station/i },
  { key: "canoe-paddle", test: /canoe|paddle|clam|fish|salish|puyallup|water/i },
  { key: "park-bench", test: /\bpark\b|garden|trail|grove/i },
  { key: "brick-storefront", test: /church|temple|club|house|hall|school|theatre|theater|building|store|hotel/i },
  { key: "memorial-obelisk", test: /memorial|expulsion|remember|reconciliation|monument|cemetery|veteran/i },
];

const BY_CATEGORY: Record<string, string> = {
  Indigenous: "welcome-figure",
  Memorials: "memorial-obelisk",
  "Civil Rights": "bronze-plaque",
  Architecture: "brick-storefront",
  Parks: "park-bench",
};

/**
 * The artifact a site awards. An admin-uploaded model always wins; otherwise a
 * curated artifact is chosen from the site's id, wording, then category.
 */
export function getMarkerArtifact(marker: Marker): Artifact | null {
  if (marker.artifactModelUrl) {
    return {
      id: `custom:${marker.id}`,
      name: marker.artifactName || `${marker.name} Artifact`,
      blurb: "A 3D artifact curated for this site.",
      modelUrl: marker.artifactModelUrl,
      rarity: marker.rarity ?? "common",
      attribution: marker.artifactAttribution || undefined,
    };
  }

  const picked = BY_MARKER_ID[marker.id];
  if (picked) return ARTIFACTS[picked] ?? null;

  const haystack = `${marker.name} ${marker.address} ${marker.category}`;
  for (const rule of KEYWORD_RULES) {
    if (rule.test.test(haystack)) return ARTIFACTS[rule.key];
  }

  return ARTIFACTS[BY_CATEGORY[marker.category] ?? "bronze-plaque"] ?? null;
}

/** Look an artifact up by the id stored on a reward event. */
export function getArtifactById(id: string | null | undefined): Artifact | null {
  if (!id) return null;
  return ARTIFACTS[id] ?? null;
}
