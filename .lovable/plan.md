# Globe home, state and city picker, and Washington on the map

## Why you don't see Washington yet
- All 35 Washington stories now have a city, but they are all still **drafts**. On purpose, drafts are never shown on the main map and never go to visitors.
- The collection page can only be opened from the Admin page ("Collection preview"). Nothing on Home or the map links to it.
- There is no "Publish" step yet that moves ready stories onto the main map. That step is the missing piece.

## 1. New home page: spinning globe
- A full-width globe (dark atlas style, teal accents) with the United States facing the viewer.
- Swipe or drag to spin it. It keeps turning a little after you let go, then eases to a stop. Pinch to zoom, and a "Recenter" button brings it back.
- States that have markers glow teal and show a small count badge. Other states stay muted and can't be tapped (tapping shows "No markers here yet").
- The globe spins slowly on its own until you touch it. It stays still if the phone's reduced-motion setting is on.
- Tapping a highlighted state zooms to it and opens the city step.
- The progress card and the "Explore Washington" collection card stay below the globe.

## 2. City cards
- A pull-up sheet lists the cities in the chosen state as photo cards. Each card shows the city name, number of markers and your visited count.
- Photos: Tacoma and Bremerton keep their custom photos. Other cities use the best cleared photo from one of their markers, and fall back to the map snapshot.
- Washington also gets a featured card, "Washington: Stories That Shaped This Place", that opens the collection page.
- Tapping a city opens the main map centered and zoomed on that city.

## 3. Main map from any page
- The Map tab in the bottom bar stays.
- Pages that hide the bottom bar (marker details, stories, trails, wallet, admin and similar) get a small floating Map button. It opens the map where you left off.

## 4. Publishing Washington stories to the map
- In the Washington Import review queue, add **Publish** for each story and **Publish all ready**.
- A story counts as ready when it has a city, no open blocking or consultation items, and nothing waiting for verification.
- Published stories:
  - appear on the collection page for all visitors, and show on the Home globe and city cards
  - show on the main map as pins in a distinct atlas style, when their location is public; stories with a withheld location appear only in the list
  - open their story page from the pin
- **Unpublish** takes a story off again. Quest Coins, QR discovery and postcards stay off for these stories for now.
- Editors can still see drafts in the draft preview.

## Technical details
- Globe: `d3-geo` orthographic projection drawn with SVG paths from `us-atlas` and `world-atlas` topojson (`topojson-client`). Pointer-drag rotates the view with inertia, and requestAnimationFrame runs only while the globe is moving. No WebGL, so it stays fast on phones.
- State marker counts come from `useAllMarkers` (the curated and database `state` field) plus published `collection_markers`.
- The map is opened as `/map?city=<id>` (or `?lat&lng&z`). MapPage reads these on load.
- Collection pins come from a new `usePublishedCollection` hook: status `published` and `coord_withheld = false`. This is a separate pin layer, so the `markers` table is not touched.
- Publish and Unpublish go through a small admin-only edge function (or a database function run by the service role). It checks readiness on the server and writes to `admin_audit_log`. Row security already limits visitors to published rows.
- The floating Map button is a shared layout component rendered on routes without the BottomNav.
- Add the route and publish rule to AGENTS.md, and the globe home to memory. This also replaces the "Tacoma city card" note on the home page.
