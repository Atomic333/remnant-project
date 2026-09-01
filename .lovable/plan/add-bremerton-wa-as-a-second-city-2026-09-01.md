# Add Bremerton, WA as a second city

Bremerton joins Tacoma on the Home screen with the uploaded waterfront/Olympics photo as its card image. Tapping it opens the map centered on Bremerton, with the wording "More Markers Coming Soon!" on the card.

## What the user sees

- Home shows two city cards: Tacoma and Bremerton. Bremerton's card uses the uploaded photo and carries a "More Markers Coming Soon!" label.
- Tapping either card selects that city and opens the Map centered on it.
- Map, Nearby, and Progress reflect only the selected city's markers. Bremerton starts with none, so those screens show an empty state with the same "More Markers Coming Soon!" wording.
- Home copy adapts to the selected city (e.g. "Explore Bremerton", progress counted against that city's markers).
- Admin's add-marker form gets a City selector (Tacoma / Bremerton), defaulting to Tacoma.

## Technical notes

- Upload the photo as a CDN asset pointer (`src/assets/bremerton-hero.jpg.asset.json`) and reference it from the cities list.
- Move the inline `cities` array out of `HomePage.tsx` into `src/data/cities.ts`: id, name, state, image, map center lat/lng and zoom, plus a `comingSoon` flag.
- Add an optional `city` field to the `Marker` type; all 28 entries in `src/data/markers.ts` are Tacoma, set via a default rather than editing each record.
- Database: additive migration adding a nullable `city` text column to `public.markers` with default `'Tacoma'`, then backfill existing rows in the same migration. `useAllMarkers` maps it through; rows without a city fall back to Tacoma.
- Selected city lives in a small `useSelectedCity` hook backed by `localStorage` (same pattern as `useVisited`), so Map/Nearby/Progress/Home read one source. Default: Tacoma.
- Marker detail pages stay reachable regardless of selected city, so QR scans keep working.
- Visit tracking and progress percentages are computed against the filtered city list; stored visit records are unchanged.
