# A Guide to Getting Lost — EmoryHacks 2026

**Pitch:** Your AI travel guide has been fed bad information. Search the town's records to check its advice before you lose your evening, your account, or your way home.

A browser detective game about everyday cybersecurity, set during Lantern Night in the coastal town of Lantern Bay. The player has one evening to get dinner, see a show at the Seawall, and catch the last ferry at 10:45 PM. Ping, the phone's friendly AI guide, gives four recommendations: three lead toward attacks and one is true.

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
- The planning target is 40–60 archive records; the current `content/records.json` has 13 authored records. Complete the route before expanding the archive just to meet a count.
- Ping's first-playthrough dialogue is hand-written. No live LLM or AI-generated answers are required for the game or demo. A live Ping is a later experiment only.
- Pixel art supplies atmosphere and clickable objects. Phone panels carry readable links, dates, source details, and choices; do not rely on tiny visual differences in the art to reveal a clue.
- Image search and a QR sticker are not part of the ferry beat. Geo and voice search are optional extensions after a complete run works.
- A complete, polished mystery comes before extra map area or features.

## Stack and current state

- Vite + React + TypeScript and plain CSS. Do not add a UI framework without approval.
- Local Typesense runs through Docker. The existing `typesense` client and `scripts/import.ts` import `content/records.json`; a browser search works.
- The current page is a temporary, ungrouped search check. It does not yet show dates, badges, record details, scenes, or a clock.
- The intended deployment is a static build on Vultr, with the search service and a custom domain configured separately.

## Project structure

Existing:

```text
content/records.json      # authored archive records imported into Typesense
scripts/import.ts         # creates archive if absent, then upserts records
src/lib/typesense.ts      # current basic search client
src/App.tsx               # temporary search UI
.env.example
```

Planned, not yet created:

```text
content/scenes.json       # scenes, choices, time costs, flags, endings
content/synonyms.json     # synonym definitions, if added
src/game/engine.ts        # pure clock, pins, flags, transitions, ending logic
src/components/           # archive, result detail, notebook, scene, clock, recap
```

Keep game logic as pure functions when the engine is built. Story content belongs in data files rather than components.

## Archive data model

The current `archive` collection indexes `title`, `excerpt`, `tags`, and `source_name`. It also has faceted `source_type`, `source_group`, and `is_sponsored`; sortable Unix `date`; and optional `location` (geopoint). Records have stable human-readable IDs.

- `source_type` currently includes `official`, `visitor`, `listing`, `vendor`, and `domain_record`.
- `source_group` currently includes `official`, `web`, `places`, and `people`. Planned multi-search groups these as **Official**, **Web & places**, and **What people say**.
- `hidden_text` is stored on `calla-listing` for the “View page source” detail action. It must not appear on ordinary result cards. The UI action is not built yet.
- `network_name` is stored on the two Wi-Fi records. The fake network is `CityNet Free`; the city-operated name is `CityNet_Public`.
- Fictional ferry addresses are currently in record excerpts. There is no separate indexed `domain` or `domain_registered` field yet. Add structured fields only when an approved UI or query needs them.
- Show source and date on result cards; they are essential to the old-post and lookalike-site clues. Show sponsored status as “Featured” rather than as a trust signal.

## Scene and game rules

- The clock starts at 6:30 PM; the last ferry leaves at 10:45 PM. Each archive search costs five in-game minutes; scene choices can have their own time costs.
- The first run has a fixed sequence of four beats. A player can discover and pin the ferry timetable early, then use it at the show without another search.
- Clicking a scene object can open a phone panel or record. Searching the archive finds related evidence. Do not reveal the verdict merely by clicking a hotspot.
- Pins may unlock actions, but choices must name what the player actually sees or does, not disclose that a source is correct.
- Endings answer whether the player heard the last song and made it home. The recap lists each claim, the player's action, and the evidence, without lecturing.
- Fake ticket and login screens are in-game mockups. Do not collect real payment or account information.

## Typesense implementation priorities

1. Replace the temporary search check with archive results grouped as Official / Web & places / What people say. Multi-search is planned but not implemented yet.
2. Show title, excerpt, source, date, and “Featured” status. Clicking a result opens a readable detail panel; Calla alone offers “View page source.”
3. Verify natural queries: “ferry tickets,” “Low Market hours,” “dinner,” “Wi-Fi near me,” and “last ferry.” The first should surface both the lookalike listing and the operator notice; the last should surface both the old post and tonight's timetable.
4. Add recent/source filters, typo tolerance checks, and synonyms when the core result flow works.
5. Add geo search or voice search only if the full route is playable. The ferry-time clue must remain available by text search.

## Security rules

- The browser uses a search-only API key scoped to `archive`, from `VITE_TYPESENSE_SEARCH_KEY`.
- The admin key is used only by `scripts/import.ts`, from `TYPESENSE_ADMIN_KEY`; never import it into `src`.
- `.env` stays out of git. Commit `.env.example` with empty values only. Never print or commit real keys.

## Milestones

1. **Scaffold:** Vite/React/TypeScript app, environment example, and local search setup — done.
2. **Typesense pipeline:** import script and browser search — done. The archive now has 13 records, not a finished story.
3. **Archive UI (next):** grouped results, source/date/Featured badges, result details, and Calla's source view.
4. **First playable ferry beat:** scene, Ping's link, archive, choice, clock, pinning, and a consequence.
5. **Full route:** dinner, Wi-Fi, true ferry-time claim, endings, and recap.
6. **Polish and deploy:** pixel art, sound, responsive layout, error states, Vultr build, custom domain, demo video.

## How I want you to work

- Work one milestone at a time. Before starting one, give a short plan naming the files to touch, then build it.
- Keep changes small and runnable. After each step, say exactly how to run and test it.
- Ask before adding a dependency, changing the data model, or expanding scope. Content and decisions already approved in the planning doc and archive do not need to be approved again.
- Do not invent new mystery content. Use `TODO-CONTENT` placeholders unless the content has been supplied or approved; the existing 13 records are authored content.
- Prefer simple, readable code over clever abstractions; this is a 48-hour hackathon.
- If blocked, explain the issue and propose the smallest workaround.
- Remind me to commit after each working milestone.
