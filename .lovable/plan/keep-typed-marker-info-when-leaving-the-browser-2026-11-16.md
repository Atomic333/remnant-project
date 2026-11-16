# Keep typed marker info when leaving the browser

## What's happening
When someone switches away and comes back, the app quietly refreshes their sign-in. That refresh makes the admin page briefly show its "loading" screen, which throws away the form, so everything typed is lost. On phones, the browser may also reload a background tab, which loses it too.

## Fix
1. Stop the sign-in refresh from flashing the loading screen once someone is already signed in. The admin role check only runs again when a different person signs in.
2. Auto-save the marker form as you type (on this device only). If the page reloads, the typed text comes back, with a small "Restored your unsaved draft" note and a "Discard draft" button.
3. The saved draft is cleared after a successful save, on "Cancel/Clear", or when starting a new marker.
4. Chosen photo and 3D model files can't be kept by the browser after a reload; if that happens, the note says to re-pick them. Text, city, coordinates and other fields are kept.

## Technical details
- `src/hooks/useAuth.ts`: role effect depends on `user?.id`, not the `user` object; only set `loading` true on the first check.
- `src/pages/AdminPage.tsx`: persist `form` (plus editing id) to `localStorage` key per user, debounced; restore on mount; clear on save/reset.

## Check
Type in the form, simulate leaving and returning (token refresh + reload) in a test browser, confirm fields are still filled.
