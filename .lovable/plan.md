# Improve activity visuals on markers and stories

## Direction
Use the selected **Elevated gold-accented challenge** design consistently across regular markers and Washington stories:
- Teal and gold palette: `#0F766E`, `#14B8A6`, `#F4C95D`, `#F8FAF9`
- Sora headings and Manrope body text
- A focused, single-column activity stage with generous spacing and strong contrast
- Restrained gold accents for Quest Coin rewards and completion states

## Changes
1. **Restyle the Activities section**
   - Give the section a clearer heading, activity count/reward context, and stronger visual hierarchy.
   - Turn each activity row into a distinct challenge panel with a readable title, activity type, reward amount, and obvious expand/collapse control.
   - Preserve the existing one-at-a-time expansion behavior and all reward logic.

2. **Create a focused H5P stage**
   - Frame the embedded activity in a clean teal-accented surface with stable dimensions, polished loading and error states, and a less cramped mobile layout.
   - Style the embedded H5P content so headings, prompts, answers, buttons, progress, feedback, and fullscreen controls remain legible at phone sizes.
   - Use at least 16px question and answer text, comfortable line height, large tap targets, and visible keyboard focus.

3. **Support both page themes**
   - Keep the selected design recognizable on standard light marker pages.
   - Add a compatible treatment for the dark Washington story setting without reducing contrast or changing its historical tone.

4. **Polish states and motion**
   - Add subtle opening and completion feedback only; avoid continuous or distracting animation.
   - Make loading, already-earned, success, and failure messages visually distinct and screen-reader friendly.
   - Continue honoring reduced-motion preferences.

5. **Verify the result**
   - Check a generated story challenge and timeline on both a regular marker and a Washington story.
   - Verify start, answering, progress, completion, reward messaging, fullscreen, collapsed/expanded states, keyboard focus, and narrow mobile rendering.
   - Confirm the preview builds cleanly and no activity content clips or overlaps.

## Technical details
- Update the shared activity wrapper and activity list rather than duplicating styles per page.
- Add scoped H5P overrides so third-party activity styles do not leak into the rest of the app.
- Define the chosen palette, typography, shadows, and states as semantic design tokens; avoid hardcoded component colors.
- Preserve attempt verification, idempotent Quest Coin awards, generated/shared-library loading, and existing activity data unchanged.
