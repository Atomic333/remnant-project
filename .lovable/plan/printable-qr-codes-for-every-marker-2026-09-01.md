# Printable QR Codes for Every Marker

Every marker page already renders a QR code pointing at `https://markerquest.ai/marker/{id}`, and markers added through `/admin` get the same URL from their slug. What's missing is a way to actually get those codes out of the app for printing. This adds downloads plus a print sheet that covers all 28 code-based markers and every new database marker automatically.

## What you get

1. **Per-marker QR download in `/admin`**
   - Each marker in the admin list gets a small QR preview and a "Download PNG" button.
   - The downloaded image is high-resolution (about 1200x1400 px, safe for print) with the marker name and ID printed under the code, plus a white quiet-zone border so scanners read it reliably.
   - Works identically for the 28 code markers and any newly created one.

2. **Printable sheet of all markers (`/admin/qr-codes`)**
   - A grid page with every marker's QR code, name, and ID, laid out for letter-size paper.
   - A "Print / Save as PDF" button uses the browser print dialog, so you can print directly or save a PDF.
   - Includes both code markers and database markers, always current.

3. **Verified links**
   - Each QR encodes the canonical `https://markerquest.ai/marker/{id}`.
   - I'll verify a sample of generated codes by decoding the rendered image and confirming the URL opens the right marker page, including a freshly created database marker.

## Technical notes

- New `src/lib/qrDownload.ts`: renders the QR to an offscreen canvas at print resolution, draws the name + ID caption, and triggers a PNG download. Uses the existing `qrcode.react` dependency (SVG → canvas), no new packages.
- New `src/components/MarkerQrCard.tsx`: shared QR preview + download button, used in the admin list and the print sheet.
- New `src/pages/QrSheetPage.tsx` at `/admin/qr-codes`, admin-guarded the same way `/admin` is, reading markers from `useAllMarkers()` so new markers appear with no extra work.
- Print styles scoped to the sheet page (hide nav/buttons, page-break-inside avoid per card) via a small print CSS block, using existing design tokens.
- `src/pages/AdminPage.tsx` gains the QR column in its marker list and a link to the sheet. No changes to the markers table, edge functions, or marker data shape.
- `HANDOFF.md` gets a short "Printing QR codes" recipe.

## Out of scope

- Server-side PDF generation, custom sizes/branding on the printed labels, and reprinting instructions for existing physical signage.
