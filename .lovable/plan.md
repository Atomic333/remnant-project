# Discovery Reveals, Digital Markers and Collectible Postcards

This builds on the existing markers, QR scanning, trails, QUEST rewards and the admin marker editor. It does not create a second reward system.

## Decisions (tell me if you want any of these changed)
- **"Muse Coins" = QUEST.** Completion rewards pay QUEST through the existing ledger. No new currency.
- **Creators:** a new "creator" role. Creators can manage only the markers, postcards and discoveries they created. Admins can manage everything.
- **Guests:** a guest scan saves a pending claim on the server, tied to that scan. When they sign in, the claim is saved without scanning again. Nothing is paid out from the guest's device.
- **No invented content:** there will be no sample postcards or discoveries. Anything drafted with AI is marked "Needs review" and can't be published until someone approves it.

## What visitors get
1. **Reveal after a QR scan.** The marker's history appears right away. Below it:
   - A card says "Stop somewhere safe to reveal your discovery," with a **Reveal Discovery** button.
   - Pressing the button plays one of five reveals: Postcard Flip, Envelope, Time Capsule, Echo Ripple or Quiet Fade.
   - There are Skip and Mute buttons. Sound plays only after a tap. If the phone is set to reduce motion, a simple still reveal shows instead.
   - You can replay a reveal as often as you like. Rewards are paid only once.
2. **Digital discoveries** are markers with no plaque. They are labeled "Digital discovery — no physical plaque at this location." Each has one of three visibility settings:
   - **Visible:** shown like any other marker.
   - **Mystery:** a "?" pin and a clue.
   - **Unlisted:** appears only after a set requirement is met.

   "Discover here" asks for location only when tapped. It checks the arrival distance and how accurate the GPS reading is, and gives retry tips if it can't confirm. Once arrival is confirmed, the same safe-stop reveal appears. Nothing plays on its own while you move around the map.
3. **Availability windows.** Discoveries can show "Upcoming," "Active now" or "Ended" in the creator's timezone. The history always stays readable.
4. **My Postcards:**
   - A grid of cards you tap to flip. You can filter by city, trail and collected.
   - Set progress, e.g. "4 of 8 collected."
   - A detail view, and a share image that contains no dates or personal info.
   - Postcards you haven't collected show only a locked outline. The artwork and any secret title stay hidden.
5. **Sensitive or memorial sites:**
   - Quiet Fade by default.
   - No confetti, celebration sounds, rarity wording or coin celebrations.
   - Wording like "Explore this story" and "Save this remembrance."
   - QUEST rewards off by default, and an optional reflection prompt.

## What creators and admins get
A new **Discovery & Rewards** section in the marker editor with:
- Marker type (physical QR or digital only), visibility, reveal style or none, and site sensitivity.
- What's unlocked: postcard, bonus story, image gallery, audio, or a mix.
- Postcard front and back: artwork upload, alt text, credits and sources.
- Availability: start and end time with timezone, or always available.
- Reward: none, postcard, an existing badge, or an amount of QUEST.
- Reward scope: the first time someone completes this marker, or the first time within a named campaign.
- Arrival radius (digital markers only), and requirements such as another marker or a trail completed.
- Save draft, publish checks and a phone-style preview that never records anything.
- The existing QR code link and download stay as they are.
- Publishing is blocked when something required is missing or invalid, with a plain explanation. This includes requirement loops, e.g. "A needs B, B needs A — remove one link."

## Technical details
- **Migration (additive only):**
  - `app_role` gets `creator`.
  - `markers` gets `marker_type` (default `physical`), `discovery_visibility` (default `visible`), `reveal_style`, `sensitivity` (default `standard`), `arrival_radius_m`, `available_from/until` (timestamptz), `availability_tz`, `clue`, `review_status` and `campaign_code`.
  - New tables:
    - `discovery_content`: secret content with no public read.
    - `postcards` (+ `postcard_sets`): the public, non-secret fields go through a sanitised view or function.
    - `discovery_prerequisites`.
    - `discovery_claims`: unique on (user, marker) and (user, campaign), with a pending state for guests.
    - `user_postcards`: unique on (user, postcard).
  - All with GRANTs and RLS. Creator access goes through `has_role` plus `created_by = auth.uid()`. The private `postcard-art` bucket allows admin and creator writes.
- **`discovery` edge function:**
  - Actions: `status`, `verify_qr` (reuses the scan token from `award-quest`), `verify_arrival` (Haversine distance, rejects accuracy worse than the radius, stores no location), `claim`, `claim_pending` (after sign-in) and `preview` (admin or creator, no writes).
  - Checks the availability window, requirements and sensitivity rules, all on the server.
  - `claim` is one atomic step: upsert the claim, insert the postcard, then call `insertEvent` with source `discovery:<marker>` or `campaign:<code>`. The existing unique key blocks double payment from marker and trail flows.
- **`discovery-admin` edge function:** checks the whole setup before publishing, including detecting requirement loops (a depth-first search over the requirements).
- **Front end:**
  - `DiscoveryReveal` with the five styles in CSS/Framer Motion. Brief, no flashing, follows `prefers-reduced-motion`.
  - `DiscoveryPanel` on `MarkerDetailPage`, and mystery/unlisted pins in `MapPage` and `TrailMap`.
  - `/postcards` page with a canvas share image, a menu link and a Home card, plus the editor section in `AdminPage`.
  - A reward is shown only after the server confirms it. Pending retries are queued and safe to repeat.
- **Checks:**
  - Playwright: admin setup and preview, the QR reveal flow, the digital arrival flow using simulated location, and a repeat scan.
  - Backend: date window and requirements enforced, one user can't claim for another, and guest claims carry over after sign-in.
  - Test data is removed afterward.
- **Before release:** nothing new is needed. The existing Google key covers maps. Audio and artwork use your uploads.
