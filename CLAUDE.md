# A Guide to Getting Lost: EmoryHacks 2026

**Tagline:** Ping means well. Check anyway.

*A Guide to Getting Lost* is a cybersecurity education game disguised as a cozy cyberpunk mystery. Your AI tour guide leads you through a coastal town, but some directions put your accounts and information at risk. Search town records, verify sources, and decide what to trust before the last ferry leaves. Each choice shows its consequences, giving players hands-on practice spotting phishing, fake Wi-Fi, and manipulated AI advice.

**Setting:** Lantern Bay, a cyberpunk East Asian harbor town on Lantern Night (neon, lanterns, a floating night market, rain). The player has one night to see a favorite band (Small Hours) play the Seawall at 9:00 PM, eat dinner, and catch the last ferry at 10:45. Tone: cozy, quiet, small-stakes; no villains, nobody explains the lesson. The full story is in the team's story doc; ask me for content rather than inventing it.

**The guide is Ping**, the town's free AI assistant. It is sincere and never glitches; it repeats what it read. Four beats, each cracked by a different kind of search:

1. **QR phishing (image search):** Ping says to scan the QR on the ferry poster; a sticker covers the real code and leads to a lookalike site registered 3 days ago.
2. **Prompt injection (text search):** Ping says the Low Market is closed and pushes Calla; Calla's listing hides a line written for AI assistants. The market is open until 11.
3. **Evil-twin Wi-Fi (geo search):** Ping suggests "CityNet Free"; the official network is CityNet_Public and the map shows the fake isn't an official hotspot.
4. **The true claim (voice search):** Ping says the last ferry is 10:45, and it's right; a "left at 10!" post is from last year.

The player searches the town archive (powered by Typesense), compares sources, domains and dates, pins evidence, and makes choices. The city responds and the run ends in one of 2–3 endings with a security debrief ("You avoided 2 of 3 attacks: phishing ✓, evil-twin Wi-Fi ✗, AI manipulation ✓").

**Core idea: search finds evidence; it never declares the truth. The player makes the judgment.**

## Deadlines (hard)

- Sat 12:00 PM: repo + team + track locked in a Devpost draft
- Sun 8:00 AM: final Devpost submission + 2-minute YouTube video
- Feature freeze: Saturday midnight. After that, bug fixes only.

## Prizes this project targets (keep these in mind when making choices)

- Cybersecurity track: phishing, evil-twin networks, and securing AI agents against misuse (prompt injection)
- Best Use of Search with Typesense: judged on creativity, implementation, usefulness. Search must be the core mechanic, and each Typesense feature must have a visible effect on gameplay.
- Best Use of Vultr (deploy there), GoDaddy Registry domain, DEV write-up, SpaceXSI raffle (built with Cursor/Grok)

## Scope (do not expand without asking me)

- ONE neighborhood, FOUR beats (3 attacks + 1 true claim), 40–60 archive records, 2–3 endings.
- No AI-generated answers or LLM calls inside the game. All content is hand-authored in data files.
- A complete, polished mystery beats more map area or more features.
- **Every beat must be solvable with plain text search.** Geo, image and voice are the intended way to crack their beat, but each needs a text-search fallback record so cutting a feature never breaks the story.
- **Feature tiers** (build in this order; cut from the bottom):
  1. Core: text search + multi-search + filters + synonyms; beats 2 (prompt injection) and 4 (true claim) work via text.
  2. Geo search for beat 3 (evil-twin Wi-Fi): simple map / distance-sorted hotspot list.
  3. Image search for beat 1 (QR phishing) via Typesense CLIP.
  4. Voice search for beat 4 via Typesense Whisper. Most likely to be cut.
- **Cut checkpoint:** spike image + voice right after Milestone 4. Anything not working by Saturday ~4 PM is cut.
- Stretch goals (only after a full run works end to end): searches costing time by vagueness, multiple run goals, guide trust meter, live Ping via conversational search.

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
| domain | string, optional | e.g. `ferry.larkhaven.gov` vs `larkhaven-ferries.com`; shown on the card |
| domain_registered | int64, optional | Unix timestamp; exposes freshly registered lookalike domains |
| image_url | string, optional | e.g. `/archive-images/ferry-poster.jpg`. File lives in `public/archive-images/`; shown on the card and read by the import script |
| image | image, optional, `store: false` | Not in records.json. The import script fills it with the base64 of `image_url`'s file; Typesense only uses it to build `embedding` |
| embedding | float[], optional, auto | CLIP (`ts/clip-vit-b-p32`) embedding of `image`. Powers image search; always excluded from search responses |

The collection also sets `voice_query_model: ts/whisper/base.en` for voice search. Voice queries must be base64 16 kHz 16-bit mono WAV sent via multi-search; the transcription comes back in `request_params.voice_query.transcribed_query`. The import script drops and recreates `archive` on every run, so `records.json` is the single source of truth.
| network_name | string, optional | Wi-Fi network named in a record (e.g. `LarkNet` vs `Larkhaven_Free_WiFi`) |
| hidden_text | string, optional | Text hidden in a listing (the prompt injection). Revealed only when the player inspects the record ("view source"), not shown in normal results. |

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
- A choice with `"endsRun": true` (instead of `next`) ends the run.
- A scene may have `"location": [lat, lng]`: where the player stands. Scenes without one keep the previous location. It drives "Near me" (radius in `content/settings.json`), distance badges, and the "You" dot on the map.
- The map is a plain SVG schematic of the bounds in `content/settings.json` (`map.south/north/west/east`). All record and scene coordinates must fall inside those bounds.
- `scenes.json` shape: `{ "start": "<scene id>", "scenes": [...], "endings": [...] }`.
- Endings are chosen from flags: `{ "id", "title", "text", "requiresFlags": [] }`. The first ending whose flags are all set wins, so order them most-specific first and end with a catch-all (empty `requiresFlags`).
- Each beat sets its own outcome flag (e.g. `avoided_phishing`, `fell_for_phishing`); the debrief reads these flags rather than needing one ending per combination.
- The recap is a security debrief: each attack (and the one true claim), whether the player fell for it, and the record that proved the truth (with its source, date and domain).

## Game rules

- Clock starts at 6:30 PM. Each search costs 5 in-game minutes. Choices cost their `timeCost`.
- Time passing is visible (clock + darkening sky). Some choices become unavailable or lead elsewhere after certain times.
- Players can pin results to a notebook. Pinned record IDs unlock choices.

## How Typesense must be used (each feature visible to the player)

- **Multi-search:** one request returns three groups (filter by `source_group`) shown as columns: Official / What people say / Nearby places.
- **Typo tolerance:** "Lantren market" still finds Lantern results.
- **Filters:** "Recent only" toggle (date filter) and source-type filter chips.
- **Synonyms:** loaded from `content/synonyms.json` by the import script. Check the Typesense docs for the server version we run, since the synonyms API has changed between versions.
- **Geo search (beat 3):** "Wi-Fi near me" plots official hotspots on a simple map, sorted by distance from the player's location.
- **Image search (beat 1):** uses Typesense's built-in CLIP model. The player picks a "photo" of the ferry poster from in-game options; it is matched against official posters and scam-report photos. No real camera needed.
- **Voice search (beat 4):** uses Typesense's built-in Whisper voice-query model through multi-search. Audio must be a 16 kHz 16-bit mono WAV, base64-encoded; browser recordings need converting. Prototype this early.
- **Build order:** text + multi-search → geo → image → voice. Each of the last three powers one beat and can be cut without breaking the story.
- **Stretch only:** a live Ping using Typesense conversational search (RAG), so the prompt injection happens for real. Keep the scripted Ping as the fallback.
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