# A Guide to Getting Lost

**Ping means well. Check anyway.**

▶ **Play it: [pingmehome.us](https://pingmehome.us)**

A cozy pixel-art mystery about everyday cybersecurity, built for EmoryHacks 2026. It's Lantern Night in the harbor town of Lantern Bay. You have one evening to find dinner, see your favorite band play the Seawall, and catch the last ferry home at 10:45 PM. Ping, the friendly AI guide on your phone, keeps giving you advice. Some of it leads to a phishing page, a manipulated recommendation, or a fake Wi-Fi network. One piece of it is true.

Your only tool is a search bar into the town archive. **Search finds evidence; it never tells you the answer.** You compare sources, dates and addresses, pin what you trust, and decide. Every search costs five minutes of your evening.

---

## How to play

1. Read what's happening and what Ping suggests.
2. Open the **Archive** and search for anything Ping mentions: a place, a web address, a time.
3. Compare **Official** sources, **What people say**, and **Web & places**. Check dates, sources, "Featured" (paid) labels and distances.
4. **Pin** the records you trust. Some choices only appear once you have the evidence for them.
5. Choose. Watch the clock: the town gets darker as 10:45 approaches.
6. At the end, a debrief shows each thing Ping told you, what you did, and the records that settled it.

<details>
<summary><strong>The four beats (spoilers)</strong></summary>

| Time | Ping says | What's really going on | Evidence in the archive |
| --- | --- | --- | --- |
| 6:30 PM | "I found a page where you can get your return ticket now." | **Phishing / lookalike domain.** `lanternbay-ferry.example` was registered three days ago; the ferry operator only sells at the North Pier window or `ferry.lanternbay.example`. | Official ticket notice, domain record, a visitor whose confirmation number doesn't work |
| 7:00 PM | The Low Market is closed; book Calla. | **Prompt injection.** Calla's sponsored listing hides a note "for visitor assistants" in its page source. The market is open until 11. | Official market hours, a vendor saying "still cooking", Calla's page source |
| 8:20 PM | Connect to `CityNet Free`. | **Evil-twin Wi-Fi.** The city network is `CityNet_Public`; the other one asks for your city-account login and isn't on the city's hotspot map. | City Wi-Fi notice, visitor report, the network's location on the town map |
| 9:40 PM | The last ferry is 10:45; stay for the encore. | **Ping is right.** A "last ferry left at 10!" post is from last year on a weekday. | Lantern Night timetable, extended-service notice, the old post (hidden by "Recent only") |

</details>

---

## How we use Typesense

Search is the core mechanic, and every Typesense feature we use changes something the player can see.

| Typesense feature | How it's implemented | What the player experiences |
| --- | --- | --- |
| **Multi-search** | One `multi_search` request runs three searches, each filtered by `source_group` (`src/lib/typesense.ts`). | Every search fills three tabs at once (**Official · What people say · Web & places**) with live counts, so comparing sources is the default. |
| **Typo tolerance** | Default typo tolerance on `title`, `excerpt`, `tags`, `source_name`. | `lantren market` and `ferri tikets` still find the right records. Nobody gets stuck on spelling under time pressure. |
| **Synonyms** (v30 synonym sets) | `content/synonyms.json` is upserted as a synonym set and linked through the collection's `synonym_sets` (`scripts/import.ts`). | Natural searches work: `where to eat` and `hungry` find dinner evidence, `boat schedule` finds the timetable, `internet` finds Wi-Fi records. |
| **Numeric filter** | **Recent only** adds `date:>=` (last 30 days of the fictional night). | One toggle hides last year's "last ferry left at 10" post, which is exactly the trap in the final beat. |
| **Filter by field** | Source chips add `source_type:=[…]`. | Narrow to official notices, visitor posts, listings, vendors or domain records. |
| **Geo search** | `location` is a `geopoint`. Every search sorts by `location(lat, lng)` from the player's position; **Near me** adds a `location:(lat, lng, 0.25 km)` radius filter. | Results show distance badges. **Show on town map** drops the results as glowing pins on the pixel-art town, next to a "You" marker and the near-me radius. The fake Wi-Fi network shows up out on the docks, not at a city hotspot. |
| **Boolean / sponsored field** | `is_sponsored` on records. | Paid listings carry a **Featured** badge, which the player learns is not a trust signal. |
| **Scoped API keys** | The browser only holds a search-only key limited to `documents:search` on `archive`. The admin key is used only by the import script. | (Security, below.) |

We also prototyped **image search** (Typesense's built-in CLIP model) and **voice search** (built-in Whisper) against our Typesense 30.2 server. Both worked, but the final story doesn't need them, so they're off by default (`ENABLE_EXPERIMENTAL_MEDIA_SEARCH=1` turns them on in the importer). Every beat stays solvable with text search.

---

## Security design

The game teaches people to check before they trust, so we tried to hold ourselves to the same standard.

- **No admin key in the browser.** The browser gets a search-only key scoped to one collection. The deploy script scans the build and refuses to upload if any admin key appears in it.
- **Typesense is not on the internet.** It listens on `127.0.0.1` inside the server. nginx proxies **only** `POST /typesense/multi_search` (and a health check); every other Typesense endpoint (keys, collections, imports) returns 404 from outside.
- **Rate-limited search** (10 requests/second per IP with a small burst) and a 64 KB request body cap.
- **HTTPS everywhere** with a Let's Encrypt certificate, HSTS, and every http/www/IP request redirected to `https://pingmehome.us`.
- **Strict Content-Security-Policy** (`default-src 'self'`, no inline scripts or styles, no third-party resources), plus `X-Frame-Options: DENY`, `nosniff` and `Referrer-Policy: no-referrer`.
- **Locked-down server.** Firewall allows only SSH and web traffic, SSH is key-only, automatic security updates are on.
- **Admin work goes through an SSH tunnel.** Re-importing the archive opens a temporary encrypted tunnel to the server's Typesense, so the admin key never crosses the open internet.
- **Fake screens stay fake.** In-game ticket and login pages are mockups. The game never collects real payment or account details, and all web addresses use the reserved `.example` domain.

---

## Architecture

```
Browser (React + Vite, static)
   │  HTTPS
   ▼
nginx on Vultr ──────────── serves the built game from /var/www/lantern-bay
   │  POST /typesense/multi_search only (rate-limited)
   ▼
Typesense 30.2 in Docker, bound to 127.0.0.1:8108
   ▲
   │  SSH tunnel (admin key, imports only)
Developer laptop: npm run deploy:import
```

- `content/records.json`: the town archive (hand-written records; no AI-generated answers at runtime).
- `content/scenes.json`: scenes, choices, the 10:45 deadline, endings and the end-of-run debrief.
- `content/synonyms.json`, `content/settings.json`: search vocabulary, fictional date, near-me radius, map bounds.
- `src/game/engine.ts`: pure game logic (clock, pins, flags, scene transitions, endings, deadline).
- `src/lib/typesense.ts`: multi-search, filters, geo sorting. `src/lib/townMap.ts`: places geo results on the town art.
- `scripts/import.ts`: recreates the collection, synonym set and records. `scripts/deploy*.sh`: build, check, upload, re-import.

---

## Run it locally

Requires Node 22+ and Docker.

```bash
npm install
cp .env.example .env                 # set TYPESENSE_ADMIN_KEY to any long random string
npm run search:start                 # starts Typesense in Docker on localhost:8108
npm run search:import                # creates the archive, synonyms and a search-only key in .env
npm run dev                          # http://localhost:5173
```

Re-run `npm run search:import` after editing `content/records.json` or `content/synonyms.json`. In development the browser console warns about broken scene links, unknown record ids and unreachable flags.

## Deploy

`npm run deploy` builds with `.env.production.local` and uploads to the server. `npm run deploy:import` reloads the archive into the server's Typesense through an SSH tunnel. Both need SSH access to the server and two gitignored env files (see `CLAUDE.md`).

---

## Built with

Vite · React · TypeScript · plain CSS · [Typesense](https://typesense.org) 30.2 · Docker · nginx · Let's Encrypt · [Vultr](https://www.vultr.com) · `.us` domain from GoDaddy Registry (via Porkbun)

## Team

- Grace Xu: TODO role
- Leah Triantos: TODO role

TODO: art credit for `public/art/lantern-bay-map.jpg`.
