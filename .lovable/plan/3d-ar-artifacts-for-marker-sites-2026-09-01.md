# 3D AR Artifacts for Marker Sites

Give every site a collectible 3D artifact that visitors can view in 3D and place in the real world with their phone's built-in AR. The artifact is viewable by everyone; earning it (QUEST + "collected" status) still requires the on-site QR scan, keeping the reward path scan-gated and NFT-ready later.

## What visitors get

- **Artifact card on the marker page** — an interactive 3D turntable of that site's artifact (drag to rotate, pinch to zoom), themed to the site's story.
- **"View in AR" button** — opens the artifact in the phone's native AR: Scene Viewer on Android, Quick Look on iOS. It appears only on devices that support it; other devices just see the 3D viewer.
- **Collected vs. preview state** — before an on-site scan the artifact shows as a translucent "preview" with a prompt to visit and scan to claim it. After a verified scan it becomes a solid, gold-ringed "collected" artifact with the claim date, consistent with the existing artifact reveal animation.
- **Artifact shelf** — the rewards/dashboard page gains a grid of collected artifacts, each opening its 3D/AR viewer.

## Where the models come from

Two sources, in this order:
1. **Admin upload** — `/admin` gets a 3D model field on every site (built-in or added) so a curator can attach a `.glb`. Uploaded models take precedence.
2. **Curated CC0 defaults** — for sites without an upload, a small library of free, game-ready CC0 models mapped by site theme (Indigenous carving, rail locomotive, ship's lantern, commemorative plaque, streetcar, brick storefront, etc.), with an attribution line shown under the viewer.

If a site has neither, the artifact card is simply hidden.

## NFT readiness

The claim is recorded in the existing server-authoritative reward ledger with the artifact's identity (artifact id, model reference, rarity, claim timestamp) so a future mint can read a canonical, tamper-proof record without a schema rewrite. No blockchain work in this phase.

## Technical outline

- Add `@google/model-viewer` and render it through a small React wrapper (`ArtifactViewer`) with `ar`, `ar-modes="webxr scene-viewer quick-look"`, `camera-controls`, and a poster image; lazy-load the component so the marker page's initial load is unaffected.
- Extend the `Marker` type with an optional `artifact` block: `{ id, name, modelUrl, iosModelUrl?, scale?, rarity, attribution }`. Curated defaults live in a new `src/data/artifacts.ts`; CC0 GLB/USDZ files are uploaded as CDN assets rather than committed.
- Admin: add `artifact_model_url` / `artifact_name` / `artifact_attribution` columns to the `markers` table (with grants) plus a storage bucket for `.glb` uploads; merge overrides in `useAllMarkers` exactly as photo overrides work today.
- Claim state comes from the existing discovery record (verified scan token → `award-quest`); the client only reads it. `award-quest` also writes the artifact metadata into the reward event payload.
- iOS Quick Look needs a `.usdz` for real-world placement; where one isn't available, iOS falls back to the inline 3D viewer. USDZ conversion for the curated set is a follow-up if you want full iOS AR coverage.

## Phasing

1. `ArtifactViewer` + artifact data model + curated defaults for a handful of Tacoma sites, with preview/collected states.
2. Admin upload field and DB columns.
3. Artifact shelf on the rewards page, plus artifact metadata in the ledger.
4. Roll curated artifacts out to all remaining Tacoma and Bremerton sites.
