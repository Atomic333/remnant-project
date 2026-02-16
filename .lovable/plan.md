

# Redesign Home Page to Match Figma Landing Style

## What Changes
The existing Home Page will be updated to precisely match the specified layout: teal-accented headline with "history" highlighted, a larger hero image card with shadow, cleaner city info section, and a full-width CTA button. The quick links section will be removed since it is not part of this design spec.

## Layout (top to bottom)

1. **Header row** -- "The Remnant Project" (teal, left) + hamburger icon (right, no menu)
2. **Headline** -- "Discover" on line 1, "history where you stand." on line 2, with "history" in teal
3. **Hero image card** -- Full-width rounded card with soft shadow, taller image (~220px)
4. **City title + progress** -- Bold "Tacoma, WA", sub-line "Progress: X/Y Markers"
5. **Progress bar** -- Thin rounded bar, muted track, teal fill
6. **CTA button** -- Full-width rounded teal button "Explore Tacoma" with arrow icon on the right side

## Technical Details

### File: `src/pages/HomePage.tsx`
- Restructure headline to use a `<span className="text-primary">` around "history"
- Wrap hero image in a card-style container with `rounded-2xl shadow-lg`
- Increase image height to `h-56`
- Combine progress label into single line: "Progress: {visited}/{total} Markers"
- Make CTA button full-width with `w-full rounded-full py-3`
- Remove the quick links section entirely (those routes are accessible via bottom nav)
- Keep all existing imports and data references

No new files or dependencies needed.
