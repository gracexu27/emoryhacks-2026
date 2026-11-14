# A Guide to Getting Lost — EmoryHacks 2026

**Tagline:** Ping means well. Check anyway.

A browser mystery about everyday cybersecurity, set during Lantern Night in the coastal town of Lantern Bay. The player has one evening to get dinner, see Small Hours at the Seawall, and catch the last ferry at 10:45 PM. Ping, the phone's friendly AI guide, gives four recommendations: three lead toward attacks and one is true.

1. **Ferry ticket phishing, 6:30 PM:** Ping offers `lanternbay-ferry.example`, a lookalike ticket page. The ferry operator's current notice points to `ferry.lanternbay.example` or the North Pier window. The lookalike was registered three days ago. These `.example` addresses are fictional in-game content, not live destinations.
2. **Restaurant prompt injection, 7:00 PM:** Ping says the Low Market is closed and recommends Calla. The market is open until 11:00 PM. Calla's sponsored listing contains `hidden_text` addressed to visitor assistants; the player can reveal it with “View page source.”
3. **Evil-twin Wi-Fi, 8:20 PM:** Ping recommends `CityNet Free` near the Flats when show details do not load. The city notice names `CityNet_Public`; the other network asks for a city-account login. Connecting alone does not mean credentials were stolen; that consequence requires entering them.
4. **True ferry time, 9:40 PM:** Ping says the last ferry leaves at 10:45 PM and there is time for the encore. A visitor post saying the last ferry left at 10:00 PM is from last year on a weekday. The current Lantern Night timetable confirms Ping is right.

The player clicks objects in a pixel-art scene, reads their details in legible phone panels, searches the archive, compares sources and dates, pins evidence, and makes choices. The clock and later scenes reflect those choices. The recap shows what happened and which records mattered.

**Core rule:** Search retrieves evidence; it does not announce which choice is safe. Never label a choice “use the official site” before the player has found and assessed that site.

## Deadlines from the plan

- Sat 12:00 PM: repo, team, and track in a Devpost draft.
- Sun 8:00 AM: final Devpost submission and two-minute video.
- Feature freeze: Saturday midnight; bug fixes after that.

## Prize targets

- Cybersecurity track: phishing, evil-twin Wi-Fi, and manipulated AI advice through play.
- Best Use of Search with Typesense: search is the core mechanic, and implemented features should have visible effects on gameplay.
- Other planned targets: Vultr hosting, a GoDaddy Registry domain, DEV write-up, and SpaceXSI raffle.

## Scope

- One complete first playthrough across Upper Station, the Low Market, the Flats, and the Seawall: three attacks plus one true claim, two or three endings.
- The planning target is 40–60 archive records; `content/records.json` currently has 13 authored records. Complete the route before expanding the archive just to meet a count.
- Ping's first-playthrough dialogue is hand-written. No live LLM or AI-generated answers are required for the game or demo. A live Ping is a later experiment only.
- Pixel art supplies atmosphere and clickable objects. Phone panels carry readable links, dates, source details, and choices; do not rely on tiny visual differences in the art to reveal a clue.
- The QR sticker and image search are not part of the ferry beat. Geo and voice search may be used only if the first route works without them. Every beat must remain solvable with text search.
- A complete, polished mystery comes before extra map area or features.

## Stack and current state

- Vite + React + TypeScript and plain CSS. Do not add a UI framework without approval.
- Local Typesense runs through Docker. `scripts/import.ts` recreates the `archive` collection and imports `content/records.json` on each run.
- The app now has a grouped search UI, filters, date and source badges, a schematic map, a clock, notebook, scene engine, and a basic ending. These are a walking skeleton, not a complete playthrough.
- `content/scenes.json` has the full route (ferry → dinner → Wi-Fi → encore), four endings including missed-ferry, and the debrief; most narration is still `TODO-CONTENT`.
- The opening ferry scene now has an original full-screen pixel map, title screen, on-map controls, and archive/notebook/pause overlays. Clicking a result title opens a record detail view in the archive window (all fields, pin button); Calla's “View page source” lives only there, never on search cards.
- **Deployed on Vultr** at `http://64.177.55.92` (Atlanta, Ubuntu 24.04, 1 vCPU / 2 GB). Custom domain + HTTPS still to do.
  - Typesense 30.2 runs in Docker bound to `127.0.0.1:8108` (not reachable from the internet). Its admin key lives only in `/root/typesense.env` on the server and in the local gitignored `.env.deploy`.
  - nginx serves `dist/` from `/var/www/lantern-bay` and proxies **only** `POST /typesense/multi_search` (rate-limited, 64 KB body cap) and `/typesense/health`; every other `/typesense/*` path returns 404. Strict CSP and security headers are set. UFW allows 22/80/443; SSH is key-only.
  - `npm run deploy` builds with `.env.production.local` (gitignored: server host, `VITE_TYPESENSE_PATH=/typesense`, the server's search-only key), refuses to ship if an admin key is in `dist/`, then uploads.
  - `npm run deploy:import` re-imports records and synonyms into the server's Typesense through a temporary SSH tunnel (`ENV_FILE=.env.deploy`). Run it after editing `records.json` or `synonyms.json`; scene/text changes only need `npm run deploy`.
  - Deploying needs SSH access to the server (currently Grace's key) plus the two gitignored env files.

## Project structure

Existing:

```text
content/records.json      # 13 authored archive records
content/scenes.json       # full route skeleton (ferry → dinner → Wi-Fi → encore), endings, debrief; TODO-CONTENT text
content/settings.json     # fictional day, near-me radius, schematic map bounds
content/synonyms.json     # Typesense synonym set (ferry/boat, dinner/food/where to eat, wifi/internet, …)
scripts/import.ts         # recreates archive, upserts the synonym set, imports records
src/lib/typesense.ts      # multi-search, filters, and geo sorting
src/game/engine.ts        # pure clock, pins, flags, scene transitions
src/components/           # search, results, map, notebook, scene, clock, recap
src/App.tsx               # wires the walking skeleton
public/art/lantern-bay-map.jpg # opening map artwork (JPEG q90 of the original PNG, 1.2 MB)
.env.example
```

Synonyms use Typesense 30 synonym sets: the import script `PUT`s the set from `content/synonyms.json` and links it via the collection's `synonym_sets`, so the browser's search-only key needs nothing extra. Avoid broad words that appear in unrelated records (e.g. "show" matched "doesn't show up").

Keep game logic as pure functions. Story content belongs in data files rather than components.

## Archive data model

The `archive` collection indexes `title`, `excerpt`, `tags`, and `source_name`. It also has faceted `source_type`, `source_group`, and `is_sponsored`; sortable Unix `date`; and optional `location` (geopoint). Records have stable human-readable IDs.

- `source_type` in the authored data includes `official`, `visitor`, `listing`, `vendor`, and `domain_record`.
- `source_group` in the authored data includes `official`, `web`, `places`, and `people`. The UI groups these as **Official**, **Web & places**, and **What people say**. Do not omit `web`, or the phishing evidence disappears from results.
- `hidden_text` is stored on `calla-listing` for the “View page source” action. It must not appear on ordinary result cards.
- `network_name` is stored on the two Wi-Fi records. The fake network is `CityNet Free`; the city-operated name is `CityNet_Public`.
- Fictional ferry addresses are in record excerpts. The import schema has optional `domain` and `domain_registered` fields, but the authored data does not use them yet.
- Several authored records have schematic `location` coordinates so the map and near-me filter can work. `content/settings.json` defines the map bounds; these coordinates are not real-world geography.
- The importer can enable CLIP and Whisper models with `ENABLE_EXPERIMENTAL_MEDIA_SEARCH=1`; they are off by default. The current story has no image records, QR clue, or voice UI. Keep those features out of the critical path.
- Show source and date on result cards; they are essential to the old-post and lookalike-site clues. Archive timestamps use UTC as the fictional night’s wall clock, matching the current date display. Show sponsored status as “Featured,” not as a trust signal.

## Scene and game rules

- `content/scenes.json` has `{ "start", "scenes", "endings", "debrief" }`. A choice has a `next` scene or `endsRun: true`, a `timeCost`, and may have `requiresPinned` and `setsFlags`. Ending order runs most-specific first, then a catch-all.
- A scene may set `place` (HUD location name) and `location` (map coordinates); scenes without them keep the previous values.
- The route is ferry → dinner → Wi-Fi → encore. Outcome flags: `avoided_phishing`/`fell_for_phishing`, `avoided_injection`/`fell_for_injection`, `avoided_evil_twin`/`fell_for_evil_twin`, `trusted_true_claim`/`doubted_true_claim`.
- `debrief` has one entry per claim: `title`, `claim` (Ping's words), `outcomes` (`flag`, `safe`, `text`; first matching flag wins) and `evidence` (record ids, shown with source and date, marked if the player pinned them).
- In dev, the browser console warns about broken scene links, unknown record ids, and flags no choice sets.
- The clock starts at 6:30 PM; the last ferry leaves at 10:45 PM. Each submitted archive search costs five in-game minutes (failed searches are free); scene choices can have their own time costs.
- `deadline: { "time": "22:45", "flag": "missed_last_ferry" }` in `scenes.json`: after any search or choice that pushes the clock past it, the run ends with that flag set, so `ending-missed-ferry` (listed first) wins. On the best route the player can afford about 15 searches.
- A player can discover and pin the ferry timetable early, then use it at the show without another search.
- Clicking a scene object can open a phone panel or record. Searching the archive finds related evidence. Do not reveal the verdict merely by clicking a hotspot.
- Pins may unlock actions, but choices must name what the player actually sees or does, not disclose that a source is correct.
- Endings answer whether the player heard the last song and made it home. The recap lists each claim, the player's action, and the evidence, without lecturing.
- Fake ticket and login screens are in-game mockups. Do not collect real payment or account information.

## Typesense implementation priorities

1. Ensure the three result groups include all authored records, including `source_group: web`; verify “ferry tickets,” “Low Market hours,” “dinner,” “Wi-Fi near me,” and “last ferry.”
2. Add readable record details and Calla's “View page source” action. The hidden text must not be displayed on an ordinary search card.
3. Replace the placeholder ferry scene with the approved Ping recommendation and neutral choices. Keep the clock, notebook, and ending working.
4. Add the dinner, Wi-Fi, and true ferry-time beats; then the full recap.
5. Refine the pixel art and add synonyms, geo refinements, or voice after the first route is playable. The ferry-time clue must remain available by text search.

## Security rules

- The browser uses a search-only API key scoped to `archive`, from `VITE_TYPESENSE_SEARCH_KEY`.
- The admin key is used only by `scripts/import.ts`, from `TYPESENSE_ADMIN_KEY`; never import it into `src`.
- `.env` stays out of git. Commit `.env.example` with empty values only. Never print or commit real keys.

## Milestones

1. **Scaffold and Typesense pipeline:** done.
2. **Search UI and walking skeleton:** grouped search, basic source disclosure, clock, notebook, map, and placeholder scenes exist; the story route is incomplete.
3. **First playable ferry beat (next):** Ping's link, archive evidence, neutral choice, clock, pinning, and a consequence.
4. **Full route:** dinner, Wi-Fi, true ferry-time claim, endings, and recap.
5. **Polish and deploy:** the first full-screen art pass and responsive layout exist; sound, error states, Vultr build, custom domain, and demo video remain.

## How I want you to work

- Work one milestone at a time. Before starting one, give a short plan naming the files to touch, then build it.
- Keep changes small and runnable. After each step, say exactly how to run and test it.
- Ask before adding a dependency, changing the data model, or expanding scope. Content and decisions already approved in the planning doc and archive do not need to be approved again.
- Do not invent new mystery content. Use `TODO-CONTENT` placeholders unless the content has been supplied or approved; the existing 13 records are authored content.
- Prefer simple, readable code over clever abstractions; this is a 48-hour hackathon.
- If blocked, explain the issue and propose the smallest workaround.
- Remind me to commit after each working milestone.
