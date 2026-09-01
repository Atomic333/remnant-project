# Guest Browsing

Let people explore the app without creating an account, while keeping account-only features clearly account-only.

## What changes
- On the Sign In screen, add a **Continue as guest** option below Google sign-in, with a short line explaining that progress stays on this device until they create an account.
- Guest mode unlocks browsing: Home (city cards), Map, Nearby, Progress, marker detail pages, the QR scanner, and the "Request a marker" form (already open to anonymous submissions).
- Guests can mark sites visited; those visits save on the device and already merge into the account on first sign-in, so nothing is lost when they sign up later.
- Account-only screens stay gated: Profile, Dashboard (shareable visit history), and Admin. Visiting them as a guest shows a small "Create a free account" prompt with a Sign in button instead of a blank redirect loop.
- A subtle "Guest mode — Sign in" chip in the header/menu lets guests convert at any time. Signing in exits guest mode.
- Guests never see the communication-preferences onboarding; that runs on first real sign-in as it does today.

## Technical notes
- Guest state: a `markerquest_guest` localStorage flag exposed through a small `useGuest` hook (`isGuest`, `enableGuest`, `exitGuest`); cleared automatically when a Supabase session exists.
- `RequireAuth` gains an `allowGuest` prop (default true for browse routes). With `allowGuest` and `isGuest`, it renders children and skips both the auth redirect and `PreferencesOnboarding`. Dashboard/Profile/Admin pass `allowGuest={false}` and render the upgrade prompt for guests rather than redirecting.
- `App.tsx`: keep the same route list, only adjust the `RequireAuth` props per route.
- `AuthPage`: "Continue as guest" calls `enableGuest()` then navigates to the `from` target (default `/`).
- Visit tracking needs no change — `useVisited` already falls back to localStorage when there is no user and merges on sign-in.
- Profile-dependent UI (avatar, share toggle) is only reachable from account-gated screens, so no guest null-profile handling is needed beyond the prompt.
