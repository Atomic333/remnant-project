# Admin login for clientservices@blackmuse.net

## Current state

An account for `clientservices@blackmuse.net` already exists in the backend and already holds the `admin` role (confirmed by querying `public.profiles` and `public.user_roles`). So no new account or role grant is needed — only the password needs to be set to the one you gave, and the email needs to be confirmed so sign-in works immediately.

## What I'll do

1. Set that existing account's password to the value you provided in chat.
2. Make sure the account's email is marked confirmed, so `/auth` sign-in works without waiting on a confirmation email.
3. Verify sign-in end to end: load `/auth`, sign in with the credentials, and confirm it lands on `/admin` with admin-only controls visible (not the redirect back to sign-in).

## Technical notes

- Password and confirmation are applied through the backend admin user API against the existing user id `a3392c84-...`, not by re-signing-up (which would fail with "user already registered").
- No schema migration, no new tables, no changes to RLS or the `has_role` function.
- No app code changes; `AuthPage.tsx`, `useAuth.ts`, and `AdminPage.tsx` stay as they are.
- The password will not be written into any project file or committed anywhere — it is only sent to the auth service.

## Security note

You shared the password in chat. After you confirm sign-in works, consider changing it from the app so the value in this conversation is no longer live.
