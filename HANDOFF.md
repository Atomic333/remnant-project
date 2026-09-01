# MarkerQuest — Team Handoff

_Last updated: May 29, 2026_

Welcome to **MarkerQuest** (a.k.a. The Remnant Project), a mobile-first web app for exploring Tacoma, WA historical markers. This document is the single source of truth for future maintainers.

---

## 1. Product Overview

- **What it is:** A mobile-first web app that lets visitors discover, scan, and learn about 28 hand-curated historical markers in Tacoma, WA.
- **Platforms:** Mobile browsers only (iOS Safari + Android Chrome). **Not** a PWA, **not** a native app.
- **Primary user flows:**
  1. Browse markers on Home / Map / Nearby panel.
  2. Scan a physical QR code at a marker, or open via deep link.
  3. View the marker page and chat with the AI Heritage Guide about its history.
  4. Track visited markers (stored in `localStorage`).
- **Out of scope (do not add without product sign-off):** desktop layouts, native apps, markers outside Tacoma, user accounts, social features.

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript 5 |
| Styling | Tailwind CSS v3 + shadcn/ui + semantic HSL tokens in `src/index.css` |
| Routing | `react-router-dom` (client-side) |
| State | React hooks + `@tanstack/react-query` |
| Backend | **Lovable Cloud** (managed Supabase) — Edge Functions + secrets |
| AI | Lovable AI Gateway → `google/gemini-2.5-flash` (marker chat) |
| Maps | Google Maps Static + Street View Static APIs (client-side key, referrer-restricted) |

---

## 3. Domains & URLs

| Purpose | URL |
|---|---|
| **Production (custom domain)** | https://markerquest.ai |
| Production (alt) | https://www.markerquest.ai |
| Lovable-hosted production | https://markerquest-ai.lovable.app |
| Preview / staging | https://id-preview--05659085-10c1-4742-8045-cd4047d38adc.lovable.app |
| Lovable project | https://lovable.dev/projects/05659085-10c1-4742-8045-cd4047d38adc |

**⚠️ Printed QR codes** point at `https://remnant-project.lovable.app` (legacy). Any reprint must use `https://markerquest.ai/marker/{id}` and `src/data/markers.ts` should be updated in lockstep.

---

## 4. Repository Map

```
src/
  pages/
    HomePage.tsx          Dashboard: Tacoma card, My Progress, Explore action
    MapPage.tsx           Google Map + Nearby panel + location tracking
    MarkerDetailPage.tsx  Marker page with always-visible AI chatbot
    ScanPage.tsx          QR scanner (camera + manual fallback)
    NearbyPage.tsx        Standalone nearby list
    ProgressPage.tsx      Visited progress
    RequestPage.tsx       Submit-a-marker form
    SettingsPage.tsx      AI / Privacy dialogs, permission toggles
  components/
    BottomNav.tsx         3-tab bottom bar (Home / Map / Settings)
    MarkerChat.tsx        Streaming AI chat UI (SSE)
    StreetView.tsx        Street View image embed
    SplashScreen.tsx      Brand intro on load
    HamburgerMenu.tsx     Overflow menu
    ui/                   shadcn primitives (do not hand-edit unless needed)
  data/
    markers.ts            ⭐ Source of truth for all 28 markers
    mockData.ts           Legacy / mock helpers
  hooks/
    useVisited.ts         localStorage-backed visit tracking
  lib/
    googleMapsKey.ts      Client-side Google Maps key (referrer-restricted)
    staticMap.ts          Static Map URL builder
    streetViewImage.ts    Street View URL builder
    markerImages.ts       Marker image resolver
  integrations/supabase/  AUTO-GENERATED — do not edit
public/
  favicon.png             Tab/favicon (square, transparent)
supabase/
  functions/
    marker-chat/          AI Heritage Guide (streaming SSE)
    fetch-streetview/     One-off helper: find best panoId/heading per marker
    geocode-markers/      One-off helper (not used at runtime)
  config.toml             Project + per-function config
```

**Never edit:**
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- Project-level keys in `supabase/config.toml`

---

## 5. Data Model: Markers

The original 28 markers are **hardcoded** in `src/data/markers.ts` as a single `markers: Marker[]`. Additional markers live in the `markers` table in Lovable Cloud and are added through the in-app admin screen at `/admin`. The `useAllMarkers()` hook (`src/hooks/useAllMarkers.ts`) merges both sources, so every screen sees one list. No runtime Geocoding / Places calls are made — coordinates are always entered by hand.

Each marker has:

```ts
{
  id: "marker-001",
  name, address, lat, lng,
  summary,            // 1–2 sentence teaser
  story,              // Long-form, grounding for the AI chatbot
  sources: [{ name, url }],
  image: "union-station",   // key resolved by src/lib/markerImages.ts
  visited: false,           // unused — visit state lives in localStorage
  category: "Indigenous",
  qrUrl: "https://.../marker/marker-001",
  streetView: { panoId, heading, pitch?, copyright? }
}
```

**To add a marker:**
1. Append to `markers` in `src/data/markers.ts` with a unique `id`.
2. Add the marker image asset and register its key in `src/lib/markerImages.ts`.
3. Optionally fetch its Street View `panoId` + `heading` via the `fetch-streetview` edge function (POST `{ markers: [{id, lat, lng}] }`), then paste into the marker entry.
4. Generate the printed QR pointing at `https://markerquest.ai/marker/{id}`.

---

## 6. AI Heritage Guide

- **Edge function:** `supabase/functions/marker-chat/index.ts`
- **Model:** `google/gemini-2.5-flash` via Lovable AI Gateway (no API key required — uses `LOVABLE_API_KEY` auto-injected).
- **Grounding:** The system prompt is built from the marker's `name`, `address`, `summary`, `story`, and `sources`. The model is instructed to answer **only** from this content and to admit when something isn't covered.
- **Transport:** Server-Sent Events (SSE) streamed to `MarkerChat.tsx`.
- **Rate-limit handling:** the function surfaces 429 / 402 from the gateway so the UI can show "rate-limited" / "credits exhausted" messages — preserve this behavior.

---

## 7. Maps & Location

- Client-side Google Maps key lives in `src/lib/googleMapsKey.ts`. **Security relies on Google Cloud HTTP referrer restrictions** — they must include:
  - `https://markerquest.ai/*`
  - `https://www.markerquest.ai/*`
  - `https://markerquest-ai.lovable.app/*`
  - `https://*.lovable.app/*` (for previews)
- Enabled APIs: **Maps Static**, **Street View Static**. Do **not** enable Geocoding or Places — markers are hardcoded.
- Geolocation: `MapPage.tsx` uses `navigator.geolocation.watchPosition`; nearby ordering uses Haversine distance.

---

## 8. Visit Tracking

- Hook: `src/hooks/useVisited.ts`
- Storage: `localStorage` key managed inside the hook; broadcasts updates via a custom event so every screen stays in sync.
- No server-side persistence — clearing browser data resets progress. Acceptable per product.

---

## 9. Design System

- **Theme:** Teal-forward with frosted glass (`backdrop-blur`) overlays.
- **Tokens:** All colors are HSL semantic tokens defined in `src/index.css` and mapped in `tailwind.config.ts`. **Never hardcode colors** in components — always use tokens (`bg-primary`, `text-foreground`, etc.).
- **Navigation:** 3-tab bottom bar (Home / Map / Settings). Do not add more tabs.
- **Mobile-first:** preview at 390×844. Components must look correct at small widths first.

---

## 10. Lovable Cloud (Backend)

- Backend is a managed Supabase project provisioned via Lovable Cloud. Access via the Lovable dashboard → **Connectors → Lovable Cloud**.
- **Secrets** are managed in Lovable Cloud settings, not in `.env`. Current secrets used:
  - `LOVABLE_API_KEY` (auto-managed, powers AI Gateway)
  - `GOOGLE_MAPS_API_KEY` (server-side, used by `fetch-streetview`)
- **Edge functions auto-deploy** on save — no manual deploy step.
- **Migrations** run via the Lovable migration tool. Today there are no app tables — only the auto-managed `auth` + system schemas.

---

## 11. Local Development

```sh
npm install
npm run dev      # vite dev server with HMR
npm run build    # production build
npm run lint
npm run test     # vitest
```

The app expects `.env` to be auto-populated by Lovable Cloud (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`). Do not commit overrides.

---

## 12. Deployment & Publishing

- **Deploy:** Click **Publish** in the Lovable editor. There is no separate CI/CD pipeline.
- **Custom domain:** `markerquest.ai` is configured via Lovable → Project → Domains. DNS lives with the domain registrar.
- **Cache busting after favicon / asset changes:** Chrome needs Cmd/Ctrl+Shift+R; Safari often needs Settings → Privacy → Manage Website Data.

---

## 13. Known Issues & Watch-outs

1. **Legacy QR domain.** All 28 printed QR codes point to `remnant-project.lovable.app`, which now 404s. Any reprint must switch to `markerquest.ai` and `src/data/markers.ts` must be updated together. The in-app scanner is domain-agnostic (it just extracts `/marker/{id}`), so existing scans through the app still work.
2. **No marker DB.** Edits to markers require a code change + redeploy. This is intentional for cost control.
3. **localStorage-only progress.** Users on private/incognito or clearing data lose history.
4. **Single Google Maps key client-side.** Compromise risk is mitigated only by referrer restrictions — verify them quarterly.
5. **Splash screen** runs on every load; if you remove it, also clean up its mount in `App.tsx`.

---

## 14. Common Tasks — Quick Recipes

**Add a new marker (recommended):** sign in at `/auth`, then use `/admin` — name, address, category, coordinates, optional AI-drafted summary/story, optional photo upload, optional Street View pano ID. The first account that signs up automatically becomes the admin; later accounts get the plain `user` role and admins can grant roles in the `user_roles` table.

**Add a new marker in code:** §5 above.

**Print QR codes:** every marker (code-based or added via `/admin`) encodes `https://markerquest.ai/marker/{id}`.
- Single code: in `/admin`, each marker row has a QR thumbnail and a **PNG** button — downloads a ~1200x1400 print-ready PNG with the marker name and ID captioned underneath.
- All codes: `/admin/qr-codes` shows a grid of every marker's QR with **Print / PDF** (browser print dialog; nav and buttons are hidden in print). New markers appear automatically via `useAllMarkers()`.
- Implementation: `src/components/MarkerQrCard.tsx` + `src/lib/qrDownload.ts` (SVG → canvas, no extra dependencies).

**Change the favicon:** Replace `public/favicon.png` (square, transparent PNG, ideally 512×512). Referenced from `index.html` via `<link rel="icon">` and `<link rel="apple-touch-icon">`.

**Update AI behavior:** Edit the system prompt in `supabase/functions/marker-chat/index.ts`. Save → auto-deploys.

**Swap AI model:** Change the `model` field in the same file. Supported models are listed in the Lovable docs; stick to `google/gemini-*` or `openai/gpt-5*` families.

**Reset a user's progress (manual test):** DevTools → Application → Local Storage → clear the visited key.

---

## 15. Contacts & Ownership

| Area | Owner |
|---|---|
| Product | _fill in_ |
| Engineering | _fill in_ |
| Content (marker stories, sources) | _fill in_ |
| Google Cloud project (Maps APIs) | _fill in_ |
| Domain registrar (markerquest.ai) | _fill in_ |
| Lovable workspace admin | _fill in_ |

Please fill in the contacts table before this document is circulated.

---

_End of handoff._
