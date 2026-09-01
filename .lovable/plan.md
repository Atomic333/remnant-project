# Map Animations & Effects

Add lightweight, coordinated animations to the Map page that guide users without hurting performance on mid-range phones.

## Goals

- Make marker discovery feel alive on first load.
- Give clear feedback when a marker is selected or the user recenters.
- Surface visited progress visually on the map itself.
- Add a tasteful location "radar" so users know where they are.
- Keep effects optional and avoid extra paid API calls.

## Scope

### 1. Marker load animation
- Staggered `DROP` animation for markers when the map first loads for a city.
- Only animate on initial mount or city change; filter changes should not re-drop pins.
- Visited markers use a distinct icon (filled ring + small check badge) instead of the current solid circle.
- Unvisited markers keep a pin-style icon tinted with the app's primary color.

### 2. Selection & filter transitions
- When a marker is tapped, the selected pin briefly `BOUNCE`s and the map smoothly pans/zooms to it.
- When filters change, matching markers fade in/out by toggling opacity rather than remounting.
- The selected marker preview sheet opens in sync with the pan animation.

### 3. User location pulse
- Replace the static blue dot with:
  - A small central blue dot marker.
  - A concentric `Circle` overlay whose radius and opacity pulse gently (CSS keyframe style via periodic state update, throttled to ~30 fps).
- The pulse pauses when the user is not actively locating themselves to save battery.

### 4. Visited trail / nearby route
- Add a toggle in the floating action button area to "Show my trail".
- When enabled, draw a straight `Polyline` connecting visited markers in chronological visit order (no Directions API, no extra cost).
- Animate the line with a small traveling dot using the Google Maps `icons` offset animation.
- Optionally show a faint dashed line from the user's location to the nearest unvisited marker when location is active.

### 5. City-switch smoothness
- When the selected city changes, animate the map to the new city's center and zoom instead of jumping.
- Use `panTo` + `setZoom` with a short timeout or `fitBounds` if the city has a defined bounds.

## Technical approach

- Use `@react-google-maps/api` components: `Marker`, `Circle`, `Polyline`.
- Store animation frame / interval IDs in refs and clean them up on unmount.
- Track `hasDropped` per city in a ref so load animation only fires once per city visit.
- Use `google.maps.Animation.DROP` and `google.maps.Animation.BOUNCE` via the Marker `animation` prop.
- For the pulse ring, update `Circle` radius/opacity on a 33 ms interval, clearing it when the component unmounts or location is hidden.
- For the trail, compute straight-line paths from `marker_visits` / local visit state and render a `Polyline` with `icons: [{ icon: { path: CIRCLE, scale: 4 }, offset: '0%', repeat: '0%' }]` plus a small interval that advances `offset`.
- Avoid paid APIs: straight lines between known coordinates, no Directions/Places calls.

## Files to change

- `src/pages/MapPage.tsx` — add animations, Circle, Polyline, pulse state, trail toggle.
- `src/index.css` — add a subtle keyframe for the location pulse if used via overlay class.
- `src/hooks/useVisited.ts` — expose chronological visit order for the trail.

## Out of scope

- 3D building tilt, custom WebGL overlays, or WebGL-based heatmaps.
- Real-time marker clustering (can be added later if marker density increases).
- Directions API routes or turn-by-turn guidance.

## Acceptance criteria

- [ ] Markers drop in with a staggered animation on first city load.
- [ ] Tapping a marker bounces it and smoothly centers the map.
- [ ] Filter changes fade non-matching markers instead of snapping.
- [ ] User location shows a gentle pulsing accuracy ring.
- [ ] "Show my trail" toggle draws an animated line through visited markers.
- [ ] City switch smoothly pans/zooms the map.
- [ ] No new paid Google Maps API calls are introduced.
