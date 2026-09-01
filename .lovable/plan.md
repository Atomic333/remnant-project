# Add real Bremerton markers

Bremerton currently has zero published markers, so every progress surface falls back to "More Markers Coming Soon!". This adds a researched set of 12–15 Bremerton, WA historical sites as real database markers, manageable from /admin, with verified open-license hero photos.

## What gets built

1. **Research pass (double-verified).** Compile 12–15 documented Bremerton historical sites — likely candidates include the USS Turner Joy memorial, Puget Sound Naval Shipyard, Manette Bridge, Bremerton Harborside/ferry terminal area, Evergreen Rotary Park, the Admiral Theatre, Bremerton's Naval Museum area, Charleston district, and Kitsap County heritage plaques. Each site must be confirmed by two independent sources (Historical Marker Database, Kitsap County / City of Bremerton records, HistoryLink, National Register listings) before it ships.
2. **Precise locations.** Verify each street address, then geocode it with the existing geocoding function so pins land on the real site rather than a block centroid.
3. **Content.** For each marker: name, address, category, a short plaque-style summary, a longer story, and 2+ source links — matching the shape and tone of the existing Tacoma markers.
4. **Hero images.** For each site, find a Wikimedia Commons (or equivalent public-domain / CC) photo and confirm it depicts the correct location. Verified photos are uploaded into the existing marker photo storage so they load exactly like admin-uploaded images; sites with no trustworthy photo fall back to the automatic static-map thumbnail already used elsewhere.
5. **Publish + unlock the city.** Insert the markers with `city = "Bremerton"` and `published = true`, then clear the `comingSoon` flag on Bremerton so the home card, progress page, nearby list, dashboard, and shared-profile pages all show real counts.
6. **QR codes.** Each marker gets its canonical `https://markerquest.ai/marker/{slug}` URL, so the printable QR sheet and scanner pick them up with no extra work.

## Verification

- Confirm in /admin that all new markers appear, are editable, and are attributed to Bremerton.
- Switch the city to Bremerton in the app and check the map pins, nearby list, marker detail pages, and hero images render.
- Confirm the "More Markers Coming Soon!" text no longer appears for Bremerton and the progress count reads "0 of N".

## Technical notes

- Markers go into the `markers` table (slug, name, address, lat, lng, category, summary, story, sources, image_path, city, published) via data inserts — no schema change needed; `useAllMarkers` already merges DB markers with the static Tacoma set.
- Photos are stored in the existing `marker-photos` bucket and referenced by `image_path`, which the marker loader turns into a signed URL; this keeps image handling identical to admin uploads and avoids storing hotlinked third-party URLs in a new column.
- Only `comingSoon: true` is removed from the Bremerton entry in `src/data/cities.ts`; no other code changes are required.
- Bremerton's map center/zoom already exist and will be sanity-checked against the final marker spread.
