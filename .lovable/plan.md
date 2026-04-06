

## Problem

All 28 printed QR codes will point to the **wrong domain** (`remnant-pathfinder.lovable.app`). Your actual published site is `remnant-project.lovable.app`. This means:

- Scanning with a phone camera (Safari/Chrome) opens a broken link
- The in-app scanner happens to work because it only checks the `/marker/{id}` path, but that only helps users already in the app
- The fallback URL uses yet another nonexistent domain (`markerquest.app`)

## Plan

### Step 1 — Update all 28 QR URLs to the correct published domain

In `src/data/mockData.ts`, replace every instance of `remnant-pathfinder.lovable.app` with `remnant-project.lovable.app`.

### Step 2 — Fix the fallback URL in MarkerDetailPage

In `src/pages/MarkerDetailPage.tsx`, change the fallback from `https://markerquest.app/m/tacoma_wa/${marker.id}` to `https://remnant-project.lovable.app/marker/${marker.id}`.

### Step 3 — Make the scanner domain-agnostic

The scanner in `ScanPage.tsx` already extracts marker IDs from any URL path containing `/marker/`. No changes needed here — it will work regardless of domain.

---

## Important consideration for permanence

Since you are printing physical QR codes, the domain baked into them can never change. If you ever rename or move your Lovable project, those printed codes will break. Two options to future-proof:

- **Option A (recommended)**: Buy a custom domain (e.g., `remnantproject.org`) and connect it in Project Settings → Domains. Then use that domain in all QR codes. You own the domain forever and can point it anywhere.
- **Option B**: Use the current `remnant-project.lovable.app` domain and accept that it is tied to this Lovable project permanently.

## Technical details

- **Files changed**: `src/data/mockData.ts` (28 URL replacements), `src/pages/MarkerDetailPage.tsx` (1 fallback URL)
- **No scanner changes needed** — it already parses `/marker/{id}` from any domain
- **QR codes auto-update** in the app since they are generated from the `qrUrl` field at render time

