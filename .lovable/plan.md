# Washington History Explorer

## What is in your files
- The research workbook has 35 markers, 113 sources and 47 images. These match the counts your brief expects.
- The upload draft holds 35 draft markers:
  - 14 have their coordinates deliberately left out. These stay unmapped, even though the research workbook lists coordinates for them.
  - 10 are sensitive sites.
  - None has a city assigned.
- 45 images are cleared for reuse. 2 are marked "rights not verified" and stay in the review area.
- The HTML report supplies the four regions, the recommended first ten and the editorial notes. It contains one script, which is removed and never run.

## What gets built

### 1. Admin: Washington Import (new screen under Admin)
- **Upload:** drop in the 2 workbooks and the report. The screen detects each sheet and shows its columns mapped to fields, and you can adjust the mapping.
- **Preview:** a table for every record before anything is saved, marked New, Update, Unchanged, Blocked or Conflict. Conflicts include cases like a different title in the two workbooks.
- **Import:** one-click import with progress, then a summary of imported, updated, skipped and blocked records, plus a downloadable error file (CSV).
- **Safe to rerun:** records are matched by their original Marker ID, so importing again never creates duplicates. Changes to existing records only happen after you approve them in the preview.
- **Review queue:**
  - markers with no city
  - markers with withheld coordinates
  - images that need permission
  - sources marked "listed for follow-up"
  - consultation notes, such as the Nisqually Tribe recommendation
- **Assigning cities:** suggested matches come from your existing city list, for example "Seattle, WA". You confirm each one; nothing is chosen for you.
- **Draft only:** everything imported stays a draft. "Ready for editorial review" never publishes anything. Admins and creators can preview the full experience.

### 2. Visitor collection page: "Washington: Stories That Shaped This Place"
- A short, skippable opening on a map of Washington with layered photos taken only from cleared images.
- Live counts calculated from the imported records.
- The four regions highlighted.
- "Explore the Map" and "Browse the Stories" buttons.
- A "Start Your Journey" section built from the report's recommended first ten.
- While everything is a draft, only admins and creators can open this page (preview mode).

### 3. Map and list
- The existing map gains a Washington collection view with animated pins, selection pulses, clustering, and pins and cards that highlight together.
- A map/list toggle and a bottom sheet on phones.
- Filters: history focus, community or nation, region, city, theme and period.
- Stories without coordinates appear only in the list, labeled "Location not shown."
- Approximate locations keep an "approximate" label.
- No decorative route lines. Only real trails you have set up draw routes.

### 4. Story pages
- Hero photo, or a designed title card if there's no cleared image.
- Title, community or nation, place and period, then summary, full story, "Why this place matters," and visitor and access notes (only notes marked verified).
- Gallery with full-size view, captions, credits and license links.
- Source cards showing title, publisher, date and what each source supports, with each marked checked or needing follow-up.
- Related stories and a reading progress bar.
- Each story carries a label saying whether it is an original research narrative or a verified plaque text.
- Nothing is invented. There are no generated quotes or dialogue.

### 5. Discoveries, postcards and coins
- Uses the existing discovery, postcard and Quest Coin systems.
- The imported 15 coins and reveal styles ("fade", "gentle glow") are saved as draft settings.
- Reveals and coins only happen after a verified on-site check. Previewing or reading never pays.
- Sensitive sites always get the quiet treatment: no bursts, confetti or celebratory sounds.

### 6. Activities
- The existing H5P activities work on these stories.
- Nothing is invented: no questions or annotations are created automatically. The editor can add them later as drafts, each linked to its source.

### 7. Look and motion
- A new "atlas" theme for this collection only:
  - midnight/charcoal backgrounds, parchment reading surfaces and antique gold accents
  - cedar green and river blue
  - an editorial serif for headlines with a readable sans-serif for text
  - subtle paper grain and map contours
- No tribal or sacred motifs.
- Shared motion presets. Quick feedback animations take 150–250ms and page transitions 300–600ms.
- Honors the phone's reduced-motion setting, plus a visible motion on/off setting. Everything works with motion off.

## Limits to know
- Photos are loaded from the original websites (Wikimedia, archives and similar) and shown with their required credit. They aren't copied into the app, and a styled fallback appears if one fails to load.
- It's a large build. It will be done in stages: importer and data, then story pages, then the landing page and map, then polish and full testing.

## Technical details
- **New tables** (all with grants and RLS; admin/creator write, no visitor access while drafts):
  - `collections`
  - `collection_markers` (original marker_id, city_id nullable, lat/lng nullable, coord_precision, withheld flag, all story fields, draft settings jsonb, status, review_status, import_hash)
  - `collection_sources`
  - `collection_images` (reuse_status, cleared flag, attribution, license, alt, caption, notes)
  - `import_runs`
  - `import_issues`
- Staging is separate from `markers`, because `markers` requires city and lat/lng. Publishing into `markers` becomes a later reviewed step once a city and coordinates are confirmed.
- **Parsing** happens in the browser with SheetJS: cell values only, formulas never evaluated. The report is parsed with DOMParser, cleaned with DOMPurify, and URLs are checked to be http or https.
- Imports are upserts keyed by Marker ID plus a content hash, and the diff is shown before writing.
- **New routes:**
  - `/admin/import`
  - `/explore/washington`
  - `/explore/washington/story/:markerId`
- Map integration reuses `MapPage` components with a collection filter.
- **New dependencies:** `xlsx` and `dompurify`. Animation uses CSS and the existing libraries, with framer-motion only if it is already installed.
- **Tests:**
  - counts match (35/113/47) and every source and image joins to its Marker ID
  - rerunning the import makes no duplicates
  - withheld coordinates stay empty
  - restricted images are hidden from visitors
  - nothing is published
  - reduced motion works
  - preview pays no coins
  - fallbacks for broken images and map failure
  - Playwright checks at mobile and desktop sizes
