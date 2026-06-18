# World Cup for Appspace

**FIFA World Cup 2026** components for Appspace, ready to upload as `.zip` packages. They split across the two Appspace surfaces:

- 🧩 **Widgets → Intranet / Employee App** (homepages, communities) — installed via **Settings → Widgets**.
- 📺 **Card → Digital Signage** (players, channels, media zones) — uploaded to the **Content Library**.

| Component | Runs on | What it shows |
|-----------|---------|---------------|
| **World Cup Games** | 🧩 **Widget** — Intranet / Employee App | Matches (live scores, kick-off times, final scores) with a browsable day pager, goal scorers, placeholders for undecided knockout teams, and a tap-through match-detail view with lineups and formation. |
| **World Cup Tables** | 🧩 **Widget** — Intranet / Employee App | All 12 group standings (or a chosen subset), with live points, goal difference and qualification positions. Click a team for its recent results and upcoming fixtures. |
| **World Cup Live Scores** | 📺 **Card** — Digital Signage | Today's fixtures when nothing is live, a live-focused view when matches are in play (big scoreline, clock, scorers), with up-next and recent results. Responsive from a small media zone to full-screen 16:9 and 9:16. |

The widgets (Intranet) have a transparent background and pick up your Appspace brand colour; the card (Signage) is a self-contained dark full-screen view. All three share one ESPN data layer.

---

## ⚠️ No warranty (please read)

**These widgets are provided as-is, with no warranty or support from Appspace.** They were built by an Appspace employee over a weekend as a bit of fun for the World Cup. They are **not an official Appspace product**, are not covered by any SLA, support agreement, or roadmap commitment, and may stop working at any time.

In particular, the data comes from a **free, unofficial public feed** (ESPN). If that feed changes or goes away, the widgets will stop updating. Use them at your own risk. You're very welcome to take the code and adapt it.

---

## Install

**Widgets** (Employee App):
1. In the Appspace Console, go to **Settings → Widgets**.
2. Click **Import** and select the `.zip`: `world-cup-games-1.2.1.zip` / `world-cup-tables-1.2.1.zip`.
3. Add the widget to an Employee App homepage and configure it.

**Card** (digital signage):
1. In the Appspace Console **Content Library**, upload `world-cup-scores-card-1.2.0.zip`.
2. Add the card to a signage channel or media zone. It needs no configuration.

Everything works with no configuration; every setting has a sensible default.

## Configuration

Every setting has a default, so both widgets work with no configuration. Settings appear in the widget's configuration panel when you add it to a homepage.

### World Cup Games

| Setting | Type | Default | What it does |
|---------|------|---------|--------------|
| Widget title | Text | `World Cup` | Shown above the match list. Leave empty to hide the title. |
| Days ahead to browse | Number (0 to 30) | `7` | How many future days the day pager can reach. `0` shows today only. |
| Days behind to browse | Number (0 to 14) | `3` | How many previous days the day pager can reach. `0` shows no past days. |
| Scorers shown per match | Number (0 to 10) | `3` | Goal scorers listed under each match before the "+n more" link. `0` hides scorers. |
| Show venue in match detail | Toggle | On | Whether the match-detail view shows the stadium and city. |
| Show lineups in match detail | Toggle | On | Load team lineups and formation in the match-detail view (when announced). |
| Accent colour override | Colour | (empty) | A specific accent colour. Leave empty to use your Appspace brand colour. |
| Live refresh interval | Number, seconds (30 to 600) | `60` | How often scores refresh while a match is in play. |
| Idle refresh interval | Number, minutes (5 to 120) | `10` | How often fixtures refresh when nothing is live. |

### World Cup Tables

| Setting | Type | Default | What it does |
|---------|------|---------|--------------|
| Widget title | Text | `Group Tables` | Shown above the tables. Leave empty to hide the title. |
| Groups to show | Multi-select (A to L) | (empty) | Which group tables to display. Leave empty to show all 12 groups. |
| Team detail on click | Toggle | On | Click a team to open its recent results and upcoming fixtures. Turn off for display-only tables. |
| Accent colour override | Colour | (empty) | A specific accent colour. Leave empty to use your Appspace brand colour. |
| Refresh interval | Number, minutes (5 to 240) | `15` | How often the standings refresh. |

### World Cup Live Scores (Card)

The card is built for signage and needs no configuration. Optional editor fields:

| Setting | Type | Default | What it does |
|---------|------|---------|--------------|
| Title | Text | `World Cup` | Heading shown top-left. |
| Theme | Dark / Light | `Dark` | Overall look for the display. |
| Accent colour | Colour | (empty) | Accent for the featured match and live highlights. Leave empty for the default. |
| Goalscorers (live match) | Show / Hide | `Show` | Whether to list scorers under a live scoreline. |
| Timezone | Device default + zones | `Device` | Pin the venue's timezone so kick-off times are right even if the player's clock is on UTC. (Falls back to the device timezone on older players that lack full timezone data.) |
| Time format | Device / 24-hour / 12-hour | `Device` | Force 24-hour or 12-hour (am/pm) times. Device default follows the player's locale. |

**Times** show in the device's timezone and locale by default (each match's UTC kick-off is converted on the player). For correct times the player's **clock and timezone should be set right** — or pin the **Timezone** option above. (A correct clock also avoids the TLS errors some players hit on a wrong date.)

It refreshes itself (faster while matches are live), shows a cached view if the network drops, and adapts its layout to the display: full hero + up-next/recent on a TV (16:9 or 9:16), and a single focal match in a small media zone.

## Data source

Live data is fetched directly in the browser from ESPN's public soccer API (free, no API key). It carries scores, goal scorers, team crests, group standings, fixtures, and placeholder names for undecided knockout teams. All the feed-specific logic lives in one file, [`shared/js/espn-adapter.js`](shared/js/espn-adapter.js), so the data source can be swapped by editing that single file. Scores are cached locally and shown with an "offline" note if a refresh fails.

## Rebuild / local development

The **widgets** are plain HTML/CSS/JS, no build. The **card** has a small build step so it runs on older signage players (BrightSign, old Android WebView, the legacy Windows player) as well as modern ones: it transpiles the card JS to **ES5**, bundles **polyfills** (core-js + whatwg-fetch), and **self-hosts the fonts**. Dev stays raw — the build only runs at package time.

The card talks to the signage player over the Appspace card **host protocol** (a `postMessage` handshake — announce `onapiready`, then post `loaded` with the player's `cardId` once rendered, or the player leaves it hidden). Rather than bundle the full SDK + jQuery, `scores-card/js/card-config.js` implements that protocol directly. For the official starter and the protocol's source of truth, see Appspace's [`card-boilerplate`](https://bitbucket.org/appspace-cloud/card-boilerplate) and [`card-api`](https://bitbucket.org/appspace-cloud/card-api) repos.

```bash
npm install            # one-time (zip packager + the card's build toolchain)

npm run dev:games      # preview Games on http://localhost:5173/widget.html
npm run dev:tables     # preview Tables on http://localhost:5174/widget.html
npm run dev:card       # preview the Card on http://localhost:5175/index.html (raw, modern)
npm run build:card     # produce the ES5 + polyfilled build in scores-card/build/
npm run package        # rebuild all .zip packages (widgets + card; the card builds first)
```

The widget dev server injects a small mock of the Appspace Widget API so widgets run standalone. Append `?mock=group-stage` (or `live`, `knockout-tbd`, `shootout`, `empty`) to preview against bundled sample data, and `?cfg=<urlencoded-json>` to try settings.

For the card, open `http://localhost:5175/dev/host.html` — a mock signage host that embeds the card in a resizable iframe with **16:9 / 9:16 / compact** aspect presets and data presets, so you can check every layout.

## Layout

```
shared/            code shared across widgets + card (ESPN adapter, polling, cache, brand, rendering helpers)
games-widget/      the Games widget (schema.json, widget.html, widget.css, js/)
tables-widget/     the Tables widget
scores-card/       the digital-signage Card (manifest.json, schema.json, model.json, index.html, card.css, js/, dev/host.html)
scripts/           dev server + zip packager (handle both widgets and cards)
*.zip              the packaged widgets + card, ready to upload
```

## Changelog

- **Card 1.2.0** — **Now plays on real signage players** (verified on BrightSign-class and modern Android). The fix: the card now speaks the Appspace card **host protocol** — it announces `onapiready` and, once it has painted, posts `loaded` (both tagged with the player's `cardId`). Without that the player keeps the card hidden (black) and logs "Failed to load content". (`window.$cardApi` is created *by the card*, not injected by the player — see the [card-boilerplate](https://bitbucket.org/appspace-cloud/card-boilerplate) reference.) Developer field is "Mike Gibbs" (this is not an official Appspace card).
- **Card 1.1.7** — Removed the runtime `fetch('model.json')`: a signage player serves the card from `file://`, where browsers block the Fetch API — the throw was one of the things stopping the card loading. It now runs on built-in defaults; `model.json` still ships for the editor. (Necessary but not sufficient — the host protocol in 1.2.0 was the missing piece.)
- **Card 1.1.6** — Older-WebView CSS compatibility (Android): the stock cards autoprefix their CSS and avoid `clamp()` and CSS Grid; this card now does the same — score row uses flexbox (not Grid, unsupported < Chrome 57), font scaling is done in JS (not `clamp()`, < Chrome 79), and the CSS is run through Autoprefixer.
- **Card 1.1.5** — Portrait fix: the Up next / Recent columns no longer collapse to just their titles (they were using the landscape side-by-side flex rule when stacked), and the match + lists are centred as a tidy block instead of a tall sparse hero.
- **Card 1.1.4** — Up next / Recent strip now sizes to its content (no more rows clipped mid-row at shorter viewports), capped so the live match keeps the bigger share.
- **Card 1.1.3** — Time handling: kick-off times follow the device timezone/locale by default; added **Timezone** and **Time format** (24h/12h) options to pin a venue's zone (with a device-timezone fallback on older players). Editor changes update the preview live.
- **Card 1.1.2** — Live preview: the card now reacts to editor config changes (`onmodelupdate`).
- **Card 1.1.1** — Editor config: **Title**, **Theme** (dark/light), **Accent colour**, **Goalscorers** show/hide. Fixed the Title field (cards use `textbox`, not the widgets' `text`, which the editor rejected).
- **Card 1.1.0** — Cross-device build: the card is now transpiled to **ES5** with **polyfills** (core-js + fetch) and **self-hosted fonts**, so it plays on older signage engines (BrightSign, old Android WebView, the legacy Windows player), not just modern Chromium (PWA / Chromebox / UWP). No Google Fonts / external CDN dependency.
- **Card 1.0.0** — New **World Cup Live Scores** card for digital signage: adaptive live / today / next-matchday states, responsive across 16:9, 9:16 and small media zones, reusing the widgets' ESPN data layer.
- **1.2.x** — Detail views (match detail, team detail) open as a full-screen modal that renders as a tidy centred card: it fills a phone and stays a neat panel on larger screens. Both widgets behave the same.
- **1.1.x** — Tables: tap a team for its recent results (with scores and goalscorers) and upcoming fixtures. Games: lineups and formation added to the match-detail view.
- **1.0.x** — Initial release: live scores, browsable day pager, all 12 group tables, automatic brand colours, ESPN feed.
