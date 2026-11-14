# Second Source: EmoryHacks 2026

A browser detective game where the only tool is a search bar. The player is a visitor in the fictional city of Larkhaven with one evening: get a good dinner and catch the Riverlight quartet at 9:00 PM before the last ferry. A friendly guide makes claims. Some are outdated, some are sponsored, some are about the wrong place, and some are true. The player searches a city archive (powered by Typesense), pins evidence, and makes choices. The city responds and the run ends in one of 2–3 endings with a "what you believed" recap.

**Core idea: search finds evidence; it never declares the truth. The player makes the judgment.**

## Deadlines (hard)

- Sat 12:00 PM: repo + team + track locked in a Devpost draft
- Sun 8:00 AM: final Devpost submission + 2-minute YouTube video
- Feature freeze: Saturday midnight. After that, bug fixes only.

## Prizes this project targets (keep these in mind when making choices)

- Cybersecurity track (helping users navigate digital information confidently)
- Best Use of Search with Typesense: judged on creativity, implementation, usefulness. Search must be the core mechanic, and each Typesense feature must have a visible effect on gameplay.
- Best Use of Vultr (deploy there), GoDaddy Registry domain, DEV write-up, SpaceXSI raffle (built with Cursor/Grok)

## Scope (do not expand without asking me)

- ONE neighborhood, THREE guide claims, 40–60 archive records, 2–3 endings.
- No AI-generated answers or LLM calls inside the game. All content is hand-authored in data files.
- A complete, polished mystery beats more map area or more features.
- Stretch goals (only after a full run works end to end): map view with geo search, searches costing time by vagueness, multiple run goals, guide trust meter.

## Stack

- Vite + React + TypeScript, plain CSS (no UI framework unless I approve it)
- `typesense` JS client
- Node script (TypeScript via `tsx`) to create the collection and import records
- Typesense Cloud or Typesense in Docker (possibly on a Vultr VPS)
- Deploy: static build on Vultr

## Project structure

```
/content
  records.json      # archive records (Typesense documents), authored by the writer
  scenes.json       # scenes, choices, conditions, endings
  synonyms.json     # synonym definitions (boat <-> ferry, food <-> dinner, etc.)
/scripts
  import.ts         # creates/recreates the collection, imports records + synonyms
/src
  lib/typesense.ts  # search client (search-only key), multi-search helper
  game/engine.ts    # pure game state logic: clock, pins, flags, scene transitions, ending
  components/       # SearchPanel, ResultCard, Notebook, SceneView, Clock, EndingRecap
.env.example
```

Game logic in `src/game/engine.ts` must be pure functions (state in, state out) so it is easy to test and reason about. Content never gets hardcoded in components; it lives in `/content`.

## Data model

### Archive record (Typesense collection `archive`)

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Human-readable, e.g. `vendor-notice`, `old-pier-poster`. Scenes reference these. |
| title | string | searchable |
| excerpt | string | searchable |
| tags | string[] | searchable |
| source_name | string | e.g. "Larkhaven Arts Council" |
| source_type | string, facet | `official`, `visitor`, `news`, `listing` |
| source_group | string, facet | `official`, `people`, `places`: drives the three result columns |
| date | int64 | Unix timestamp; filterable and sortable |
| is_sponsored | bool, facet | shown as a "Featured" badge |
| location | geopoint | [lat, lng] for distance and "near me" |

### Scene (scenes.json)

```json
{
  "id": "station",
  "text": "Narration shown to the player.",
  "guide": "What the guide says here (may be empty).",
  "choices": [
    {
      "label": "Head to the river market",
      "next": "market-dinner",
      "timeCost": 15,
      "requiresPinned": [],
      "setsFlags": ["ate_at_market"]
    }
  ]
}
```

- A choice with `requiresPinned` only appears if all listed record IDs are pinned.
- Ending scenes are chosen from flags (e.g. `ate_at_market`, `went_willow_steps`, `stayed_for_encore`).
- The recap lists each guide claim, what the player did, and the record that proved the truth (with its source and date).

## Game rules

- Clock starts at 6:30 PM. Each search costs 5 in-game minutes. Choices cost their `timeCost`.
- Time passing is visible (clock + darkening sky). Some choices become unavailable or lead elsewhere after certain times.
- Players can pin results to a notebook. Pinned record IDs unlock choices.

## How Typesense must be used (each feature visible to the player)

- **Multi-search:** one request returns three groups (filter by `source_group`) shown as columns: Official / What people say / Nearby places.
- **Typo tolerance:** "Lantren market" still finds Lantern results.
- **Filters:** "Recent only" toggle (date filter) and source-type filter chips.
- **Synonyms:** loaded from `content/synonyms.json` by the import script. Check the Typesense docs for the server version we run, since the synonyms API has changed between versions.
- **Geo (stretch):** sort or filter by distance from the player's current location.
- Result cards show badges for date, source type, "Featured" (sponsored), and distance.

## Security rules (we're on the Cybersecurity track, so this matters)

- The browser uses a **search-only API key** scoped to the `archive` collection, read from `VITE_TYPESENSE_SEARCH_KEY`.
- The **admin key** is used only in `scripts/import.ts`, read from `TYPESENSE_ADMIN_KEY`, and never imported into `/src`.
- `.env` is in `.gitignore`. Commit `.env.example` with empty values only. Never print or commit real keys.

## Milestones (do them in order)

1. **Scaffold:** Vite + React + TS app runs; folder structure above; `.env.example`; `.gitignore`.
2. **Typesense pipeline:** import script creates `archive` and loads 5 placeholder records; one search from the browser shows results.
3. **Search UI:** search bar, multi-search into three columns, result cards with badges, recent-only filter.
4. **Walking skeleton:** scene engine reads `scenes.json`; clock; pin-to-notebook; one choice unlocked by a pin; one ending. **Target: Saturday noon.**
5. **Full mystery:** all records, all scenes, 3 claims, 2–3 endings, ending recap, synonyms.
6. **Polish:** sky/time visuals, sound cue near the ferry deadline, responsive layout, empty/error states.
7. **Deploy:** production build on Vultr, custom domain, README with a table mapping each Typesense feature to what the player experiences.

## How I want you to work

- Work one milestone at a time. Before starting a milestone, give me a short plan (files you'll touch, in a few bullets), then build it.
- Keep changes small and runnable. After each step, tell me exactly how to run and test it.
- Ask before adding a dependency, changing the data model, or doing anything outside the current milestone.
- Don't invent the mystery's story content. Use clearly marked placeholders (`TODO-CONTENT`) unless I give you the content. My partner is writing it.
- Prefer simple, readable code over clever abstractions; this is a 36-hour hackathon.
- If something is blocked (Typesense connection, API change), say so plainly and propose the smallest workaround.
- Remind me to commit after each working milestone.
