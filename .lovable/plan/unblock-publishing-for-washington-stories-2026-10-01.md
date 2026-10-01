# Unblock publishing for Washington stories

## What's wrong
Every story still has an open **"Blocked in upload draft"** review item. For all 35 stories that item gives the same reason: "cityId must be assigned from MarkerQuest city list". Some stories also say their coordinates are withheld.

You have already assigned a city to all 35 stories. Assigning a city closed the separate "missing city" item but not this "blocked" item. So the Publish check still treats every story as blocked and shows "0 ready".

Withheld coordinates don't block publishing anyway, because those stories are shown in the list only.

Other open items:
- 2 stories (MQ-WA-B10 and MQ-WA-B14) have a "Needs verification" item. These stay blocked until you mark them resolved.
- The remaining open items (follow-up sources, no cleared image, coordinates withheld) are notes and don't block publishing.

## Fix
1. **Close the stale items now.** Mark "Blocked in upload draft" resolved for every story that has a city, where the only reasons were the missing city and/or withheld coordinates. That is all 35. After this, 33 stories become ready, and B10 and B14 stay blocked until verified.
2. **Close them automatically in future.** When you confirm or choose a city in the review queue, a "blocked" item whose only reason was the missing city closes too. Any other reason in the item keeps it open.
3. **Clearer Publish panel.**
   - Each row shows exactly what's still stopping it, for example "Needs verification: opening date discrepancy".
   - Each blocker gets a "Mark resolved" button on the same row, so you don't have to scroll down to the queue.
   - A disabled Publish button shows its reason when you hover or tap it.
4. **Check it works.** Publish one story and confirm it appears on the collection page, the Home globe (Washington count) and the main map, as a pin or list-only if its location is withheld. Then confirm "Publish all ready" handles the rest. The 2 verification stories stay as drafts.

## Technical details
- The cleanup goes through the database query tool: set `import_issues.resolved = true` where `kind = 'blocked'`, the story's `collection_markers.city_id` is set, and the message has no reasons other than the missing city and withheld coordinates.
- `assignCity` in `AdminImportPage.tsx` also resolves the matching `blocked` issue when its message has only those reasons.
- `PublishPanel` loads open blocking issues with their messages and renders per-issue resolve buttons. The server-side readiness check (`collection_marker_blockers`) and the publish trigger stay as they are.
