# Make Every Site Editable in Admin

Today `/admin` can only edit markers that were created in the database. The 42 curated markers (28 Tacoma + 14 Bremerton) live in app code (`src/data/markers.ts`), so admins see them in lists but can't change a name, address, coordinates, summary, story, sources, photo, or Street View framing. This makes all sites editable from `/admin`.

## Approach: edit-on-adopt (no data migration, QR codes stay valid)

- The admin marker list shows **every** site — code-based and database-based — with a badge showing which source it came from.
- Pressing Edit on a code-based site opens the same form, prefilled from the code entry.
- On Save, a database row is created that reuses the marker's existing id as its slug (e.g. `marker-014`). Because the id is unchanged, all printed QR codes and `/marker/{id}` links keep working.
- App-wide, database rows now **override** code entries with the same id instead of being appended, so the edited version is what visitors see everywhere (Home, Map, Nearby, detail page, dashboard, QR sheet).
- "Revert to original" on an adopted marker deletes its database row, restoring the code version. Delete stays destructive only for markers that exist purely in the database; code-based ones can't be permanently deleted (they'd reappear from code) — the action becomes Revert instead.

## Admin list changes

- One combined list, grouped/searchable by city, with a filter (All / Edited / Original / Database-only).
- Each row: QR thumbnail, name, address, source badge (`Original`, `Edited`, `Added`), Edit, and Revert-or-Delete.
- Editing a code marker prefills the photo field as empty; if no photo is uploaded the existing image resolution (uploaded photo → Street View → static map) applies as it does now.

## Technical notes

- `src/hooks/useAllMarkers.ts`: merge by id — build a map from the static array, then overwrite entries whose `slug` matches a static id, appending the rest. `useCityMarkers` and every consumer are unaffected.
- `src/pages/AdminPage.tsx`: list source becomes `useAllMarkers()` plus the raw db rows for override detection; `editMarker` accepts either a db row (existing query) or a static `Marker` (prefill from the in-memory object, `form.id = null`, slug locked to the marker id).
- Preserve fields the form doesn't expose (e.g. `rarity`) by defaulting them from the static entry on first save; add a rarity select to the form so it stays editable.
- Saving an adopted marker uses `upsert` on `slug` so a second edit updates rather than duplicating; a unique constraint on `markers.slug` is required — added by migration if not already present.
- Static image keys (`src/lib/markerImages.ts`) still resolve for un-adopted markers; adopted rows without an uploaded photo fall back to Street View / static map. If a curated site has a bundled asset, its image key is carried into the db row so the local asset keeps rendering.
- No changes to RLS beyond existing admin-only write policies.

## Out of scope

- Bulk migrating all 42 markers into the database up front (only edited sites get rows).
- Editing markers from the public app; admin-only as today.
