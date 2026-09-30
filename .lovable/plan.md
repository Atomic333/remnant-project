# H5P Activities on Marker Pages

## What visitors get
- A new "Activities" section on marker pages that shows each published H5P activity (quiz, drag-and-drop, timeline, and so on). It plays right on the page and is sized for phones.
- Anyone can play, guests included. Signed-in visitors who finish an activity earn Quest Coins once per activity and see the usual reward reveal. Guests see "Sign in to earn Quest Coins."
- No QR scan and no passing score needed. Finishing is enough.
- Sensitive sites and reduced-motion settings keep the quiet reward presentation.

## What admins get
- In a saved marker's editor, an "H5P Activities" panel where you can:
  - upload an .h5p file (up to 50MB)
  - set a title and a reward amount (default 10 Quest Coins, 0 means no reward)
  - reorder, publish or unpublish, preview, and delete
- Creators can manage activities only on their own markers. Admins can manage them on every marker.
- A new editable rule, "H5P activity completed", in the Quest Coin Manager, with a per-person cap and on/off switch.

## How finishing is checked
The app can't watch someone play, so it relies on signals the server can check:
1. When a signed-in visitor opens an activity, the server starts a one-time attempt for them. The attempt lasts 2 hours.
2. The player reports "completed" when the H5P activity says it is finished. The browser sends that report to the server together with the attempt.
3. The server pays out only if all of these are true:
   - the attempt belongs to this visitor, hasn't been used, and hasn't expired
   - the activity is still published
   - enough time has passed since opening (the admin sets a minimum, 20 seconds by default)
   - the visitor hasn't already been paid for this activity
4. Payment goes through the existing Quest Coin earning path, so the usual limits and duplicate protection apply.

The limitation: a determined person could fake the "completed" report. The attempt, minimum time and one-reward-per-activity rules keep the possible coins small, and unusual activity is flagged for admin review.

## Technical details
- **Player:** `h5p-standalone` library. Uploaded .h5p files are unzipped by an edge function into a private `h5p-content` bucket, one folder per activity. The player loads files using short-lived signed links. The library's `xAPI` `completed` or `answered` statement (verb `completed`, or `result.completion=true`) triggers the report.
- **Upload checks:** the file must contain `h5p.json`. Only allowed file types are unpacked, which blocks scripts other than the H5P library bundle. Size limit is 50MB. Main library and title are read from `h5p.json`.
- **New tables:**
  - `h5p_activities`: id, marker_slug, title, library, storage_prefix, reward_amount, min_seconds, position, published, created_by, timestamps. Anyone can read published rows. Changes go through `can_manage_marker`.
  - `h5p_attempts`: id, user_id, activity_id, started_at, expires_at, completed_at, raw_result jsonb. Visitors can't access it directly; only the service role can.
  - Both tables get grants and RLS.
- **Edge function `h5p`:** actions `upload` (manager only), `start` (returns attempt id and signed base URL; guests get only the URL), and `complete`. `complete` validates and then calls `awardByRule('h5p_activity', award_key 'h5p:{user}:{activity}', amount override)`. A new `reward_rules` row is added, plus a `RULE_EVENT_TYPE` mapping.
- **Frontend:**
  - `H5PActivity.tsx` (lazy-loads the player)
  - `MarkerActivities.tsx` on `MarkerDetailPage`
  - `H5PManager.tsx` in `AdminPage` marker editor
  - hook `useH5P.ts`
- **Tests:** upload a sample .h5p file, then test:
  - completing too early is rejected
  - a reused or expired attempt is rejected
  - another user's attempt is rejected
  - a second completion pays once
  - an unpublished activity is rejected
  - guests don't earn
  - Playwright check that the player renders on a marker page
