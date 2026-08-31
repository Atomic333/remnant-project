# Admin Flow for Adding Marker Sites

Today the 28 markers are hardcoded in `src/data/markers.ts`, so every new site needs a code change. This adds an in-app admin page where you create markers through a form, with an AI-drafted summary/story you can edit, optional photo upload, and automatic Street View / static map fallback when no photo is provided.

The existing 28 markers stay in code. New markers live in the database and are merged with them at runtime, so Home, Map, Nearby, marker detail, and QR routing all pick them up with no further work.

## What you get

1. **Sign-in + admin access**
   - Email/password sign-in plus Google sign-in on a new `/auth` page.
   - Admin rights are stored server-side in a roles table (not on the user record), so they can't be faked from the browser.
   - `/admin` is only reachable by an admin; visitors never see it. The first admin is granted directly in the database.

2. **Add / edit marker form (`/admin`)**
   - Fields: name, address, category, latitude, longitude, summary, story, sources (name + URL, repeatable), optional Street View pano ID + heading.
   - **"Draft with AI"** button: given name + address, AI writes a suggested summary and story; both land in editable text fields so you always have the final say. Nothing is saved until you press Save.
   - **Photo**: optional upload. If you skip it, the marker hero and list thumbnail fall back to Street View (when a pano ID exists) and then to a static map of the coordinates.
   - List of existing database markers with edit and delete.
   - QR URL is generated automatically as `https://markerquest.ai/marker/{id}` and the marker detail page keeps rendering its scannable QR code.

3. **Promote a user request (optional shortcut)**
   - From the admin list you can open a submitted request from the Request-a-Marker form and prefill the add-marker form with its name, address, and notes.

## Technical notes

- **Database**: new `markers` table (id, slug, name, address, lat, lng, category, summary, story, sources JSONB, image_path, street_view JSONB, published flag, timestamps). Public read of published rows; insert/update/delete restricted to admins via a `has_role` security-definer function. Grants issued in the same migration. New `user_roles` table + `app_role` enum, and a `profiles` table for the signed-in user.
- **Storage**: `marker-photos` bucket, public read, admin-only writes.
- **AI drafting**: new edge function `draft-marker` calling the Lovable AI Gateway, admin-JWT-validated, returning `{ summary, story }`. Input validated with Zod.
- **Data access**: `src/data/markers.ts` keeps its array and exports it as the static source; a new `useMarkers()` hook (react-query) fetches database markers, maps them to the existing `Marker` shape, and returns the merged list. Pages that read `markers` directly switch to the hook.
- **Image resolution**: `src/lib/markerImages.ts` gains a database branch — uploaded photo URL, else `streetViewImage`, else `staticMap`.
- **Reads stay cheap**: no Geocoding/Places calls; you enter coordinates manually as today.

## Out of scope

- Bulk CSV import, marker reordering, desktop-specific admin layout, and public user editing.
