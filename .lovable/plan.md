# Pick any U.S. state and city when adding a marker

Today the admin form only offers Tacoma and Bremerton. This change lets you choose from every U.S. state and city, so you can add a marker anywhere without asking for a code change.

## What you'll see

- In the add or edit marker form, the single City dropdown is replaced by two fields:
  - **State**: a list of all 50 states plus D.C.
  - **City**: a searchable list of that state's cities (type to filter, for example "Spok…" shows Spokane).
- Picking a city moves the map center to that city, which helps you fill in coordinates.
- A new city appears on the Home screen city cards as soon as it has at least one published marker. Tacoma and Bremerton keep their custom photos. Other cities show a static map of the city as their card image until you add a photo.
- Map, Nearby, Progress, and the Dashboard work for any city in the same way they work now.

## Technical notes

- Add a bundled U.S. places dataset (states plus about 30k cities with lat/lng, from the public-domain U.S. Census Gazetteer) as a JSON file. It loads lazily, only on the admin page, so visitors don't download it.
- Database: an additive migration adds a nullable `state` text column to `public.markers` with default `'WA'` and backfills existing rows. The existing `city` column is kept. City ids become `"City, ST"` for new cities, and the legacy ids `Tacoma` and `Bremerton` stay as they are so existing markers and saved selections keep working.
- `src/data/cities.ts` keeps its curated entries (with photos). A new `useAvailableCities()` hook combines the curated cities with any city that appears on a published marker, using the dataset (or the markers' average coordinates) for the map center. Home, `useSelectedCity`, and `cityProgress` switch to this hook.
- Admin form: a State select plus a searchable City combobox (the existing shadcn Command/Popover). It saves `city` and `state` together.
- No Geocoding or Places API calls. Coordinates come from the static dataset.
- This also removes the "Geared exclusively to Tacoma" rule from project memory, since the app now covers more places.
