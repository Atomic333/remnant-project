
# Complete Missing Features for The Remnant Project

## Overview
After comparing every page against the project description and Figma design, several features are incomplete or missing. This plan addresses all gaps.

---

## 1. Fix MarkerCard placeholder text
The MarkerCard currently shows "Supporting line text lorem ipsum dolor sit amet" instead of real data. Replace with the marker's address.

## 2. Fix Home page quick links
Currently shows "Share Link" and "Report Issue" -- should show contextual links matching the app purpose:
- "Your Progress" (links to /progress)
- "Request a Marker" (links to /request)

## 3. Add Marker Detail location display
The marker detail page is missing the address/location line beneath the title. Add the marker address below the hero.

## 4. Add Scan success state
After scanning or entering a code, show a brief success animation/screen before navigating to the marker detail page, including the marker name and a checkmark.

## 5. Add Map page bottom sheet preview
When tapping a marker card or pin on the map, show a slide-up bottom sheet with a marker preview (image, name, distance, "View Details" button) instead of immediately navigating away.

## 6. Add Marker Detail loading/generating state
Add a skeleton loading state for the story section with a "Generating story..." indicator, simulated with a brief delay on first expand.

## 7. Add Settings content pages
"How we use AI" and "Privacy Policy" buttons currently do nothing. Add simple content screens/modals for each with placeholder policy text.

---

## Technical Details

### Files to modify:
- `src/components/MarkerCard.tsx` -- Replace lorem ipsum with `marker.address`
- `src/pages/HomePage.tsx` -- Fix quick link labels and icons
- `src/pages/MarkerDetailPage.tsx` -- Add address display below hero, add story loading state with skeleton
- `src/pages/ScanPage.tsx` -- Add success state with animation before navigation
- `src/pages/MapPage.tsx` -- Add bottom sheet component for marker preview on pin/card tap
- `src/pages/SettingsPage.tsx` -- Add dialog/sheet content for AI and Privacy sections

### New files:
- None required; all changes fit within existing files using existing UI components (Sheet from shadcn for bottom sheet, Dialog for settings content)

### Approach:
- Use the existing `vaul` Drawer component for the map bottom sheet (already installed)
- Use Dialog for settings content pages
- Add a `useState` timer to simulate story generation loading
- Maintain the existing teal design system throughout
