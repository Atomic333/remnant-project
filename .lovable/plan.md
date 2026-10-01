# Imported Story Feature Parity

## Goal
Make every published imported story behave like a regular marker while preserving the Washington collection’s richer storytelling, source review, image-rights controls, withheld coordinates, and sensitive-site presentation.

## Visitor experience
- Keep the existing Washington narrative page, gallery, timeline, source notes, and related stories.
- Add the regular marker interactions where applicable: visited state, saved progress, directions, Street View, sharing, QR entry, verified visit rewards, discovery/postcard collection, trivia, H5P activities, 3D/AR artifacts, trail check-ins, and the grounded history chat.
- Replace the current postcard preview with the real collectible state once content is configured; retain a clear unavailable state when no postcard or discovery has been published.
- Include imported-story visits in progress counts and shareable visit history.
- Make imported stories searchable and available in the main map’s nearby/list experience, not only as separate map dots.

## Safety and eligibility rules
- Only published stories can participate in visitor features, scans, progress, trails, rewards, or public search.
- Stories with withheld coordinates remain list/story-only: no pin, directions, Street View, proximity check, or location-revealing metadata.
- Sensitive stories keep quiet presentation, restrained motion, respectful copy, and no celebratory effects unless explicitly enabled by an editor.
- Quest Coins remain server-authoritative and scan-gated. Every award continues through `awardByRule` with an idempotent award key; repeat scans cannot pay twice.
- Guest behavior remains consistent with regular markers: local visit tracking and pending verified discovery claims, with account linking where supported.
- Collection rows remain separate from regular marker rows; shared behavior will use a safe published-marker resolver rather than duplicating imported stories into the regular marker table.

## Map pin treatment
- Use the exact regular marker icon for imported stories on both the main map and the Washington collection map.
- Add a soft golden halo around imported-story pins so they remain visually distinct.
- Add a subtle side-to-side sway on pointer hover/focus, using an HTML map overlay so the icon itself can animate cleanly.
- Disable sway when reduced motion is requested or motion is turned off; the golden halo remains visible.
- Preserve clustering on the Washington map and list-only handling for withheld locations.

## Administration
- Extend existing marker feature editors to recognize published imported stories without weakening creator/admin ownership checks.
- Allow configured trivia, discovery content, postcards, H5P activities, trail stops, and 3D/AR artifacts to target an imported story ID.
- Show why a location-dependent feature is unavailable for withheld-coordinate stories instead of exposing or inventing a location.

## Technical implementation
- Introduce a shared visitor-facing marker adapter/registry that resolves either a regular marker or a published collection story into one safe feature shape.
- Update scan preparation, reward validation, discovery, trivia, trails, chat context, progress, and shared-history lookups to use that resolver. Server checks will accept collection IDs only when the story is published and eligible.
- Extend the collection schema only for feature metadata that has no existing generic table, such as 3D artifact configuration and explicit feature eligibility. Apply grants and row-level policies with any new schema.
- Keep all existing generic content tables keyed by marker/story ID where safe; avoid parallel reward or visit ledgers.
- Add a reusable imported-story map-pin overlay shared by both maps, with semantic gold tokens and motion-state support.
- Update the scanner to recognize canonical imported-story URLs and route successful scans to the Washington story page.
- Add regression coverage for unpublished stories, duplicate awards, guest claims, withheld coordinates, sensitive presentation, trail check-ins, progress/share history, both map surfaces, and reduced motion.

## Validation
- Test a published exact-location story through map selection, directions, Street View, visit saving, QR scan, one-time Quest Coin award, trivia, postcard, chat, activity, artifact, trail, progress, and sharing.
- Confirm the same scan cannot award twice and rewards still use the configured server rule.
- Confirm draft stories remain private and absent from all public/game surfaces.
- Confirm withheld stories never expose coordinates or location-derived controls.
- Confirm sensitive stories avoid sway and celebration when quiet presentation applies.
- Verify both maps on phone and desktop, including clustering, selection, golden glow, pointer/focus sway, and reduced-motion behavior.
