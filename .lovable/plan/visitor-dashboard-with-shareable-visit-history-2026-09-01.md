# Visitor Dashboard with Shareable Visit History

A new personal dashboard page for signed-in visitors: everything they've visited, progress in every city, a public share link, and a downloadable progress card image.

## What the visitor sees

**New page at `/dashboard`** (reachable from the Home "My Progress" card, the hamburger menu, and the Profile page). The existing `/progress` page stays as it is.

1. **Header stats** — total markers visited across all cities, overall completion percentage, and the date of their most recent visit.
2. **City progress** — one row per city (Tacoma, Bremerton) with visited/total counts and a progress bar. Cities with no published markers yet show "More Markers Coming Soon!".
3. **Visit history** — their visited markers in reverse-chronological order, each with the marker photo, name, city, and the date they marked it visited. Tapping one opens the marker page.
4. **Share section** — two actions:
   - **Share link**: a toggle that turns public sharing on and generates a link like `markerquest.ai/u/ab12cd34`. Buttons to copy the link and to open the native share sheet. Turning the toggle off makes the link stop working immediately.
   - **Download card**: generates a portrait PNG "MarkerQuest passport" with the logo, their display name, visited count, percentage, per-city breakdown, and their share link — ready to post or text.

**New public page at `/u/:code`** — anyone with the link (no account needed) sees the visitor's display name and avatar, their overall and per-city progress, and the list of markers they've visited. It carries a "Start your own MarkerQuest" button linking to sign-up. If sharing is disabled or the code is unknown, the page shows a friendly "This visit history isn't shared" message. Private data (email, preferences) is never exposed.

## Technical notes

**Database migration**
- Add to `public.profiles`: `share_code text unique` (short random code, generated on first enable) and `share_enabled boolean not null default false`.
- Add a security-definer function `public.get_shared_visits(_code text)` returning the shared visitor's `display_name`, `avatar_url`, and their `(marker_id, visited_at)` rows — only when `share_enabled` is true. `grant execute` to `anon` and `authenticated`. This is the only path that exposes another user's visits; `marker_visits` RLS stays user-scoped and no new policies are added to it.
- Avatars live in a private bucket, so the shared page resolves the avatar through a signed URL fetched inside the same function's response payload path (falls back to initials if unavailable).

**Frontend**
- `src/pages/DashboardPage.tsx` — the dashboard; uses `useVisited()` (already returns `records` with `visited_at`), `useAllMarkers()` (all cities, unfiltered), and `cities` from `src/data/cities.ts` for per-city grouping.
- `src/pages/SharedVisitsPage.tsx` — public page calling `get_shared_visits` via `supabase.rpc`, matching marker ids against `useAllMarkers()`.
- `src/hooks/useShareLink.ts` — reads/creates `share_code`, toggles `share_enabled` through `useProfile`.
- `src/lib/progressCard.ts` — canvas-rendered PNG download, following the existing pattern in `src/lib/qrDownload.ts` (no new dependencies).
- Routes in `src/App.tsx`: `/dashboard` behind `RequireAuth`, `/u/:code` public alongside `/marker/:id`.
- Entry points: the Home "My Progress" card's View button and the hamburger menu gain a Dashboard link; Profile gets a "View my dashboard" row.
- Styling uses existing semantic tokens and the mobile-first 390px-wide layout; no new colors.

**Not included**
- Following other visitors, leaderboards, or comments.
- Server-side image rendering (the card is generated on the device).
