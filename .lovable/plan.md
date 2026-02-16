

# Make All Page Designs Consistent

## Issues Found

After reviewing every page, here are the inconsistencies to fix:

### 1. Progress Bar Height Mismatch
- **HomePage**: uses `h-2` (thin)
- **ProgressPage**: uses `h-3` (thicker)
- **Fix**: Standardize both to `h-2` (matches the refined landing page style)

### 2. Button Padding Inconsistencies
- HomePage CTA: `py-3.5`
- ScanPage "Open Marker": `py-2.5`
- MarkerDetailPage "Mark as Visited": `py-3`
- RequestPage "Submit Request": `py-3`
- MapPage drawer "View Details": `py-3`
- **Fix**: Standardize all full-width primary action buttons to `py-3`

### 3. NotFound Page Uses Wrong Background
- Currently uses `bg-muted` instead of the app's standard `bg-background`
- Also lacks consistent typography and button styling
- **Fix**: Restyle to match the app: `bg-background`, teal button, proper font sizes

### 4. MarkerDetailPage Missing Bottom Padding
- Uses `pb-8` but the bottom nav is 5rem tall, so content gets hidden
- **Fix**: Change to `pb-20` to match all other pages

### 5. Dead NearbyPage Route
- `/nearby` route still exists in App.tsx but is no longer reachable (removed from BottomNav)
- **Fix**: Remove the route and the NearbyPage import from App.tsx

### 6. ScanPage Scanner Box Styling
- Uses `bg-foreground/90` (nearly black) which clashes with the light, airy theme
- **Fix**: Change to `bg-muted` with a subtle border, keeping the camera area visible but softer

### 7. ProgressPage Header Redundancy
- Shows "X/Y Markers Visited" as h2, then "Progress: X/Y markers" as subtext -- redundant
- **Fix**: Simplify to one clean heading + progress bar (matching HomePage pattern)

### 8. HomePage Header vs PageHeader
- HomePage uses a custom header (by design for the landing page) -- this is intentional and stays as-is
- All sub-pages correctly use the shared `PageHeader` component -- no change needed

---

## Technical Changes

### `src/pages/HomePage.tsx`
- Change CTA button padding from `py-3.5` to `py-3`

### `src/pages/ProgressPage.tsx`
- Change progress bar from `h-3` to `h-2`
- Remove redundant subtext line; keep just the bold heading and progress bar
- Ensure spacing matches HomePage pattern

### `src/pages/MarkerDetailPage.tsx`
- Change `pb-8` to `pb-20`

### `src/pages/ScanPage.tsx`
- Change scanner box from `bg-foreground/90` to `bg-muted border border-border`
- Update inner icon/text colors to work on light background (`text-muted-foreground` instead of `text-primary-foreground/60`)

### `src/pages/NotFound.tsx`
- Remove `bg-muted` wrapper, use standard page structure
- Add a teal "Go Home" button (`rounded-full bg-primary`) matching other pages
- Clean up typography to match app style

### `src/App.tsx`
- Remove NearbyPage import and `/nearby` route

### No changes needed:
- MapPage, SettingsPage, RequestPage, BottomNav, PageHeader, MarkerCard, FilterChips -- these are already consistent

