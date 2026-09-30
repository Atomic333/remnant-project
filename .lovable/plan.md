# Marker Trails

Visitors can find a trail, preview its stops, and walk it from marker to marker on an animated map. Admins build trails without writing code. The feature uses the markers, Google map, sign-in, QR scanning and QUEST rewards that already exist. No trails are published automatically. Admins create every real trail.

## What visitors get

- **Trails page (/trails)**: opened from a new "Trails" card on Home and from the menu. The bottom bar keeps its 3 tabs.
  - List view and map view.
  - Each trail card shows its cover, name, city, theme, number of stops, distance, walking time, start and finish, and whether it is a loop.
  - Accessibility and terrain notes show, or "Not verified" when none were given.
  - Filters for city, theme, distance and number of stops.
- **Trail page (/trails/:slug)**: this is the link people share.
  - The map shows numbered stops. The route draws itself in when the page opens, with moving dashes that show the walking direction.
  - The next stop has a pulsing halo. Upcoming, current and completed stops each have their own icon and color.
  - Buttons for Recenter, Show entire trail and Follow me. You can pan freely without the map snapping back.
  - Your live location shows as a dot with an accuracy circle, only after you allow it.
  - Tapping a stop opens a sheet with the stop number, photo, story and visit status. On mobile it slides up from the bottom; on desktop it is a side panel.
  - A plain list of the stops is available as an alternative to the map.
  - Animations are reduced when your device asks for reduced motion.
- **Walking mode (Start Trail)**:
  - Shows the next stop, the distance and walking time to it, and "3 of 8 stops visited".
  - Walking directions follow real streets and paths. The walk from where you are to the first stop is drawn in a different style from the trail itself.
  - You can pause, resume and exit.
  - Progress survives a refresh. Signed-in walkers' progress is saved to their account; guests' progress is saved on their device.
  - An "You've arrived" prompt appears when you are close, allowing for GPS accuracy. Being close alone never completes a stop.
  - A QR scan counts as a verified visit. "Mark as visited" is also available, but it is labeled unverified and gives no QUEST.
  - A short celebration plays after each check-in, then the next stop is highlighted.
  - A finish screen lists your stops and offers a shareable achievement card.
  - Walking time is estimated from the route, kept separate from time spent reading. Time the session was open is never shown as walking time.
- **QR scans**: scanning a marker during a trail opens that marker and keeps you on the trail. Visits count once. Trail completion and the trail QUEST bonus are checked on the server and given only once.

## What admins get

- **Trail Manager (/admin/trails)**, linked from Admin.
  - Create, edit, duplicate, archive and publish trails.
  - Set the title, description, cover image, city, theme, accessibility and terrain notes, and whether it is a loop.
  - Add stops by searching or by clicking the map. Reorder them by dragging or with up/down buttons, and remove them. Removing a stop never deletes the marker.
  - Add trail-only notes to any stop without changing the marker's own content.
  - A live preview shows the numbered stops, the route, total distance and walking time.
  - Save as draft, and preview the visitor experience.
- **Before publishing, the trail must pass these checks**:
  - It has at least 2 different markers with valid coordinates.
  - A walking route can be found for every leg. Any leg that fails is named, and publishing is blocked.
  - Legs longer than 2 km show a warning.
- **Stable trails**: each publish saves a frozen version. People already walking keep their version, so edits never change their stops or erase their progress.

## Setup you'll need

Walking directions use Google's Routes service, called from the server. It must be turned on for the Google key the server already has. If it isn't, the admin screen says exactly that, and the app never draws fake straight-line directions.

## Technical notes

- **Database** (additive only, with GRANT and RLS on every table):
  - `trails`: slug, title, description, cover_path, city, theme, accessibility, terrain, is_loop, status (draft, published, archived), current_revision_id.
  - `trail_stops`: the draft stops — trail_id, marker_id (text, same as the existing marker ids), position, required, note.
  - `trail_revisions`: a frozen copy of the stops, the route polyline for each leg, and the distance and duration totals.
  - `trail_sessions`: user_id, trail_id, revision_id, status (active, paused, completed, exited), started_at, completed_at, walking_seconds_estimate.
  - `trail_checkins`: session_id, marker_id, method (qr, manual), verified, created_at, with unique (session_id, marker_id).
  - Access rules: anyone can read published trails and their revisions, only admins can read drafts or write trails, and users can read their own sessions and check-ins. The browser never writes check-ins or sessions directly; edge functions do.
- **Edge functions**:
  - `trail-route` (admin only): calls the Google Routes API with WALK mode for each leg. It caches each leg by a hash of its from/to coordinates, reports legs that fail, and powers the preview and publish.
  - `trail-publish`: validates the trail, writes a revision, and sets it as the trail's current revision.
  - `trail-session`: start, pause, resume and exit a walk.
  - `trail-checkin`: checks that the marker belongs to the walker's revision. QR check-ins use the existing scan-token check, so rewards reuse `award-quest`. It deduplicates visits, completes the trail once every required stop is visited, and inserts one `trail_complete` entry in reward_events, idempotent by source_id.
  - `trail-approach` (signed-in walkers): gets the walking route from the walker's position to the first stop, on request only. Positions are never stored.
- **Frontend**:
  - The map reuses the Google Maps loader from MapPage. The route uses Polyline icons with an animated dash offset; the halo is a CSS overlay.
  - Location watching starts only in walking mode and stops on pause or exit.
  - Guests keep sessions in localStorage. Check-ins waiting on the server show as "pending" until confirmed, and are retried when the connection returns.
  - Stops are reordered with @dnd-kit.
- **Verification**: use Playwright to check admin create, reorder, publish and archive; mobile sheet interactions; start, refresh and resume; and denied location. Use curl to check wrong-marker and duplicate check-ins and that non-admins are refused.
