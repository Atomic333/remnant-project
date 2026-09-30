# Quest Coin rewards system

The app already has a working QUEST currency (server-only ledger, cached balances, trivia, trail bonus, redemptions, discoveries). This plan upgrades it to **Quest Coin** instead of building a second currency. All existing balances and history are kept.

## What visitors will see

- **Name everywhere:** "Quest Coin" / "Quest Coins" with a new small coin icon that stays clear at small sizes.
- **Earning (new defaults, all editable by admins):**
  - First verified plaque visit: 25 (once per marker)
  - Hidden digital marker discovered: 15 (once per marker)
  - History challenge (trivia) completed: 10 (once per challenge)
  - Trail completed: 100 (once per trail, every required stop verified)
  - Special event quest: 150 (once per event)
  - Approved historical contribution: 50 (once per contribution)
  - A clear "What stacks" note: a plaque visit and a trail bonus both pay; repeating a marker inside a trail does not pay twice.
- **Scan flow:** history opens first, then the visit is saved, coins are confirmed by the server, then the postcard reveal and "You earned 25 Quest Coins." Repeat scans show "Already collected." Sensitive sites get a quiet acknowledgment. Reduced motion and a sound on/off setting are respected. If offline or verification fails, a "Pending" state appears and retries safely.
- **Quest Wallet** (menu, Home, and profile): spendable balance, lifetime earned, full history with dates, amounts, status and links back to markers/trails/rewards, owned collectibles and rewards, "How to earn", big link to the store.
- **Reward Store:** badge/avatar accessory (100), postcard frame (100), profile theme (200), special digital collectible (300). Each has a preview, price, availability, "Owned" status and a confirm step; not enough coins is clearly explained. Purchases can be **equipped** (theme changes the profile/passport look, frame wraps postcards, accessory decorates the avatar).
- **Partner rewards:** supported (stock, expiry, instructions, one-time codes) but none published. No sponsors or discounts will be invented.

## What admins and creators get (Admin page)

- Reward rules editor: amounts, once-only vs repeatable with cooldowns and caps, availability dates and time zone, verification level, stacking.
- Events and campaigns with coin budgets; creators manage only their own.
- Store item manager: price, preview, stock, publish status, sponsor details and redemption instructions.
- Contribution approvals (from existing marker requests) that pay 50 coins.
- Refunds and balance adjustments (admins only, reason required).
- Audit log of every privileged action.
- Staff redemption check: validate a partner code once.
- Review flags: unusually fast collections or impossible travel between markers.
- Analytics: coins issued, spent, refunded, outstanding, trail completions, redemptions.

## Decisions to confirm

- **Existing amounts change:** plaque discoveries drop 50 to 25, trail bonus 250 to 100, contributions 150 to 50. Coins already earned stay as they are.
- **Blockchain removed:** the unused wallet/chain fields on the ledger are retired (kept, marked unused) per the spec.
- **Higher-value events** can require a rotating check-in code shown by staff; normal markers keep the current scanner check plus optional proximity.
- Only coarse "was within range" results are stored, never location history.

## Technical details

- Migration (additive): `reward_rules`, `quest_events` (event quests + rotating code secret), `campaigns` (+ budget spent), `store_items` (extends/replaces use of `rewards_catalog`; kind: accessory/frame/theme/collectible/partner, inventory, starts/ends, published), `partner_codes` (single-use, status), `entitlements` (user, item, equipped), `admin_audit_log`, `review_flags`, `contributions` link on `marker_requests` (approved_user_id). `reward_events` gains `award_key text unique`, `status` (confirmed/reversed), `reverses_event_id`; balances gain a CHECK balance >= 0; wallet/chain columns get DEPRECATED comments. GRANTs + RLS: users read own rows only; no client writes to ledger/balances/entitlements.
- Postgres `SECURITY DEFINER` functions called only by service role: `purchase_item(user, item, idempotency_key)` locks balance and item rows (`FOR UPDATE`), checks stock/price/dates, inserts ledger debit, entitlement, redemption and partner-code assignment atomically; `refund_redemption(id, reason, key)` writes a compensating entry once; `admin_adjust(user, amount, reason, key)`.
- Edge functions: shared `awardByRule(ruleCode, sourceId)` in `_shared/quest.ts` reads `reward_rules`, enforces dates, caps, cooldowns, campaign budget, per-user rate limit, then inserts with a deterministic award key. Update `award-quest`, `marker-trivia`, `discovery`, `trail-session`; replace `redeem-reward` with `store` (list/purchase/equip) and add `quest-admin` (rules, items, adjustments, refunds, approvals, analytics, code validation, audit).
- Client: rename labels, new `QuestCoinIcon`, `/wallet` and `/store` pages (keep `/rewards` redirecting), pending/retry queue in localStorage keyed by award key, equipped theme/frame/accessory applied in profile, passport and Postcard.
- Verification: backend tests for first visit, repeat and retried awards, trail requirement, expired rules, purchase math, parallel purchases vs stock of 1, refund retries, unauthorized writes, reused partner codes; Playwright for wallet, store confirm, reduced motion. Test data clearly labeled and removed afterward.
- Update memory (QUEST Economy) and AGENTS.md with the ledger/award-key rule.
