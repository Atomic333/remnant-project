# QUEST — MarkerQuest's Exploration Currency

A server-authoritative rewards economy. Every signed-in explorer earns QUEST for verified discoveries, trivia, trails, achievements and approved contributions, spends it on cosmetics and partner perks, and sees it all on a new Rewards page. Earning feels like unearthing an artifact — gold shimmer, seal-breaking motion, sound of discovery — not a bank notification.

## 1. How QUEST is earned

| Action | QUEST | Verification |
| --- | --- | --- |
| Verified marker discovery | 50 | QR scan of the physical plaque only. Marking a marker visited by hand earns nothing. |
| Rare marker discovery | 100 | Same, on markers flagged rare |
| Marker trivia (3 AI questions) | 10 per correct, +15 perfect bonus | Graded server-side; one scored attempt per marker |
| Completing a trail / all markers in a city | 250 | Server recounts verified discoveries |
| Achievement unlocked | 25–200 | Server-evaluated criteria |
| Event participation | variable | Admin-granted |
| Approved marker contribution | 150 | Granted when an admin approves the request |

Every earn is idempotent: the same discovery, trivia set or achievement can never pay twice.

## 2. Trivia

After a verified scan, the marker page offers "Test your knowledge". Three multiple-choice questions are generated server-side from that marker's own story and sources by Lovable AI, cached per marker so everyone gets a consistent set. Answers are graded on the server — the correct option never reaches the browser before grading.

## 3. Rewards page (`/rewards`)

- Artifact-style balance card: current QUEST, lifetime earned, rank title.
- Transaction history: every earn and spend with reason, marker name and date.
- Available rewards — affordable now, with a Redeem action.
- Locked rewards — cost, plus what's still needed to unlock.
- Achievements grid: unlocked ones in gold, locked ones as dim silhouettes.

Redeemable catalog at launch: cosmetics (profile frames, map pin skins, passport badges) and admin-managed partner perks that issue a one-time redemption code on redeem.

## 4. Balance in header and profile

A compact gold QUEST chip sits in the app header and on the profile page, tappable straight to `/rewards`. When QUEST is earned, an artifact-reveal overlay plays: a glowing seal cracks open, the amount counts up in gold, particles drift out, the header chip pulses and the balance rolls to its new value.

## 5. Progressive map marker states

| State | Look |
| --- | --- |
| Undiscovered | Dim pin, low opacity, no glow |
| Nearby (within ~150 m) | Cyan halo, gentle pulse — "you're close" |
| Available (scannable range) | Purple glow, bounce, hint to scan |
| Discovered | Full-color pin with a gold ring |
| Rare | Gold-tinted pin with a rotating shimmer ring |

Legend added to the map so states read clearly. Existing drop-in, bounce and visited-trail animations stay.

## 6. Visual language

Dark navy surfaces, electric purple primary, cyan for proximity and info, gold reserved exclusively for QUEST and rarity. New semantic tokens (`--quest-gold`, `--quest-cyan`, artifact glow shadows) go in the theme rather than hardcoded colors.

## Technical notes

**Tables (all in `public`, RLS on, GRANTs in the same migration; frontend gets SELECT only — no INSERT/UPDATE on ledger or balances):**
- `reward_events` — append-only ledger: `user_id`, `event_type`, `source_type`, `source_id`, `quest_amount` (signed), `metadata` jsonb, `created_at`, plus blockchain-ready columns from day one: `wallet_address`, `chain_tx_hash`, `chain_id`, `settlement_status` (default `off_chain`), `settled_at`. Unique partial index on (`user_id`,`event_type`,`source_id`) for idempotency.
- `explorer_balances` — derived cache: `user_id` (PK), `balance`, `lifetime_earned`, `lifetime_spent`, `updated_at`. Maintained only by a trigger on `reward_events`, so it can always be rebuilt from the ledger.
- `quest_completions` — per-user completion records for trivia/trails: `user_id`, `completion_type`, `target_id`, `score`, `max_score`, `completed_at`, unique per (`user_id`,`completion_type`,`target_id`).
- `achievements` (catalog: `code`, `name`, `description`, `icon`, `quest_reward`, `criteria` jsonb, `tier`) + `user_achievements` (`user_id`, `achievement_code`, `unlocked_at`).
- `rewards_catalog` (`code`, `name`, `description`, `cost`, `kind` cosmetic/perk, `unlock_criteria` jsonb, `active`) + `redemptions` (`user_id`, `reward_code`, `quest_spent`, `status`, `redemption_code`, `created_at`).
- `marker_trivia` — cached AI questions per marker slug, with correct answers readable only by `service_role`.
- `markers` gains a nullable `rarity` column (default `common`).
- `scan_tokens` — short-lived nonce written when the QR flow starts, consumed by the award function to prove a scan.

**Edge Functions (all validate the JWT in code, use the service-role client, and are the only writers to `reward_events`):**
- `award-quest` — single authorization point: validates event type, verifies the scan token or completion record, enforces idempotency, inserts the ledger row, re-evaluates achievements, returns the new balance and any unlocked achievements.
- `marker-trivia` — generates/serves questions (no answers) and grades submissions, then calls the award logic.
- `redeem-reward` — checks affordability and unlock criteria, writes a negative ledger row plus the `redemptions` row atomically.

**Blockchain readiness:** the ledger is already the source of truth with wallet/tx/chain/settlement columns present and unused. A future on-chain phase fills them in and flips `settlement_status` — no schema redesign, no rewrite of balance math.

**Frontend:** `useQuestBalance`, `useRewardHistory`, `useAchievements` hooks (read-only queries + realtime on balance); `QuestChip` in `PageHeader`; `ArtifactRewardOverlay` triggered by an award response; `RewardsPage` at `/rewards` behind `RequireAuth` (guests see the existing upgrade prompt); scan flow in `ScanPage`/`MarkerDetailPage` mints and spends the scan token; `MapPage` marker icons switch on the new state model.
