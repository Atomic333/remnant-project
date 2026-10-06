# H5P activities for every marker

## What visitors get
Every marker page (Tacoma, Bremerton, and the 33 published Washington stories, about 75 in total) gets two activities in its Activities section. Both go live straight away and pay Quest Coins the way activities already do.

1. **Story challenge.** One activity with about 6 questions, mixed from three kinds:
   - multiple-choice questions
   - true/false questions
   - one "drag the missing words" passage taken from the story
2. **Timeline.** Visitors put the marker's dated events in order. A marker only gets this when its story has at least 3 clear dates. Markers without enough dates get the story challenge only.

## Content rules
- Every question and every date comes only from that marker's own story, plaque text and sources, so nothing new is invented. A question is dropped if its answer can't be matched word for word to the marker text.
- Sensitive sites (the ones already marked for quiet presentation) get respectful, fact-based questions only. They get no light-hearted wording and no "gotcha" true/false items.
- Each activity has a short credit line saying it was based on the marker's sources.
- Running the generator again replaces a marker's generated activities instead of adding copies. Activities you uploaded yourself are never touched.

## Admin
- In Admin > Activities, a new **Generate activities for all markers** button runs the batch and shows progress (created, skipped, failed).
- Each marker also gets a **Regenerate** button.
- Generated activities appear in the same list as uploads, so you can preview, unpublish or delete them.

## Technical details
- **Packaging.** The `h5p` function packs each activity as a real `.h5p` package: `h5p.json`, `content/content.json`, and the needed library folders. The libraries are H5P.QuestionSet, H5P.MultiChoice, H5P.TrueFalse, H5P.DragText, H5P.Timeline, and their dependencies such as H5P.Question, H5P.JoubelUI, FontAwesome, and H5P.Transition. The package is then stored through the existing unpack/storage path, so playback, attempts and the minimum-time check stay the same.
- **Library files.** Official library releases go into the bucket once, under a shared library prefix. Each package refers to these shared copies instead of storing its own. A fallback copies them per package if h5p-standalone needs that.
- **New action.** A `generate` action is added to the `h5p` function, for admins only. It calls Lovable AI (google/gemini-2.5-flash, structured tool output) with the marker text, through the existing dual-source lookup (regular markers and published collection stories). It then checks every answer against the source text before building the package.
- **New columns.** One migration adds `generated boolean default false` and `kind text` (`challenge`/`timeline`) to `h5p_activities`, so regeneration only replaces generated rows.
- **Batch run.** The batch handles 5 markers at a time from the admin page, so no single function call runs too long.
- **Risk.** H5P.Timeline relies on TimelineJS and may not render in h5p-standalone. If it fails in testing, the timeline becomes an "order the events" drag activity (H5P.DragText-based sequencing) instead.
- **Testing.** The plan is to generate for 3 markers (one Tacoma, one Bremerton, one sensitive Washington story), play them in the browser, confirm one coin payout per activity, and then run the full batch.
