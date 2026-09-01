# Custom Map Pin Icon

Replace the plain colored circles on the Map page with the uploaded MarkerQuest pin graphic.

## What changes
- The uploaded pin image becomes the icon for every historical marker on the map.
- Sizing: ~40x52 px on screen, anchored so the pin's tip sits exactly on the location (no visual drift when zooming).
- Visited vs. unvisited stays distinguishable: unvisited pins render at full opacity, visited pins render dimmed (~45%) with a small green check dot badge kept as-is elsewhere. Drop-in and bounce-on-select animations continue to work.
- The user-location dot, trail polylines, and nearest-unvisited hint line are unchanged.

## Technical notes
- Upload `marker_icon.png` via the assets CLI to `src/assets/marker-icon.png.asset.json` (no binary added to the repo).
- In `src/pages/MapPage.tsx`, change `getMarkerIcon` to return a `google.maps.Icon` (`url`, `scaledSize`, `anchor`) instead of a `SymbolPath.CIRCLE` symbol; keep it inside `useCallback` and guard on `isLoaded` since `google.maps.Size`/`Point` need the API loaded.
- Visited state handled via the `opacity` prop on `GMarker` (symbol `fillOpacity` no longer applies to image icons); merge with the existing filter-based opacity.
- Bottom-sheet preview and Nearby list are untouched.
