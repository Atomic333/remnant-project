# QUEST earning requires an on-site QR scan

Right now the marker page shows the "Earn QUEST" trivia card to anyone who opens a marker, including people who arrived from the map or the nearby list. Trivia should only be playable by explorers who actually scanned the plaque's QR code at the site. Everyone else sees an invitation to go visit.

## Behavior

- **Scanned this marker (verified discovery on the ledger):** trivia card works exactly as today — questions, grading, QUEST awards.
- **Not scanned:** the card becomes a locked "Visit to earn" state: gold lock treatment, a line explaining that QUEST is earned on location by scanning the plaque's QR code, and two actions — "Scan QR code" (to the scanner) and "Open in Maps"/directions to the marker.
- **Guests / signed-out:** same locked state, with a sign-in nudge since QUEST needs an account.
- The AI chat, summary, sources and Street View stay open to everyone — only the earning surface is gated.

## Server enforcement

Gating is not just visual. The trivia function will refuse to serve or grade questions for a marker the user has not verifiably discovered:

- `marker-trivia` (`get` and `grade`): look up a `marker_discovery` reward event for this user and marker slug. If absent, return a "visit and scan this marker first" response instead of questions or a score. This is checked with the service-role client, so the browser cannot bypass it.
- Discovery awards themselves already require a one-time scan token, so no change is needed there.

## Technical notes

- `supabase/functions/marker-trivia/index.ts`: add a shared `hasDiscovered(admin, userId, markerId)` check (query `reward_events` for `event_type = 'marker_discovery'`, `source_id = marker_id`) at the top of both the `get` and `grade` branches; return `{ locked: true }` with a 403 for `grade`.
- `src/hooks/useQuest.ts`: extend `TriviaSet` with an optional `locked` flag so the UI can render the encouragement state without treating it as an error.
- `src/components/MarkerTrivia.tsx`: render the locked/encouragement panel when `locked` is true or the user has no discovery for the marker; add Scan and Directions actions.
- `src/pages/MarkerDetailPage.tsx`: keep the card container, relabel it "Earn QUEST — visit to unlock" when locked.
