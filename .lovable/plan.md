# User Accounts, Communication Preferences & Profiles

Turn MarkerQuest from an anonymous app into an account-based one: everyone signs in, chooses which messages they want to receive, gets a profile with an uploadable image or GIF, and has their visited sites saved to their account.

## 1. Sign-in for everyone

- Rework `/auth` from "Admin Sign In" into a general Sign in / Create account screen (email + password, plus Continue with Google).
- New accounts work immediately after signup — no email confirmation step.
- Access rule: marker detail pages opened from a QR scan stay public. Home, Map, Nearby, Progress, Request, Settings, Profile and Admin require sign-in and redirect to `/auth` with a "continue where you left off" return path.
- Signed-out visitors on a marker page see a prompt to create an account to save the visit.

## 2. Communication preferences at signup

Right after account creation, a short onboarding step asks the user to opt in or out of:
- Email messages
- Notifications
- Advertisements / promotional offers

Choices save to their profile and are editable later on the profile page. Users who skip are recorded as opted out (no default opt-in). Users created before this change see the onboarding step once on next sign-in.

## 3. Profile page

New `/profile` screen showing:
- Profile image (upload photo or animated GIF, animation preserved; ~5MB cap, image types only) with a fallback initials avatar.
- Display name (editable) and email.
- The three communication preference toggles.
- Visit summary: sites visited count out of total, plus a list of visited markers with dates, newest first.
- Sign out, and an Admin shortcut for admins only.

Reachable from Settings and from the header.

## 4. Visited sites tied to the account

- Visits save to the database per user with a timestamp, so progress follows the account across devices.
- On first sign-in, visits already stored on the device are merged into the account, then the account becomes the source of truth.
- Home progress card, Progress page, and marker "visited" states all read from the synced data.

## Technical notes

- Database: add `avatar_url`, `email_opt_in`, `notifications_opt_in`, `ads_opt_in` (all boolean, default false) and `onboarded_at` to `public.profiles`; new `public.marker_visits` table (`user_id`, `marker_id`, `visited_at`, unique per pair) with GRANTs to `authenticated`/`service_role`, RLS enabled, and policies scoping every row to `auth.uid()`.
- Storage: new `avatars` bucket, private, with RLS on `storage.objects` restricting each user to their own folder; images served via signed URLs.
- Auth: enable auto-confirm email signups so signup logs the user in; keep Google provider configured.
- Frontend: `useVisited` becomes account-backed (database when signed in, local fallback for public QR views) so existing call sites keep working; new `useProfile` hook for profile fields and preferences; a `RequireAuth` wrapper applied to gated routes in `App.tsx`; onboarding preferences step rendered after signup.
- Validation with zod on the profile form (name length, file type/size limits).
