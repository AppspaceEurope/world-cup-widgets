# World Cup Widgets for Appspace

Two custom widgets for the Appspace Employee App that show **FIFA World Cup 2026** scores and standings, ready to upload as `.zip` packages.

| Widget | What it shows |
|--------|---------------|
| **World Cup Games** | Matches (live scores, kick-off times, final scores) with a browsable day pager for previous and upcoming days, goal scorers, placeholders for undecided knockout teams, and a tap-through match-detail view with lineups and formation. |
| **World Cup Tables** | All 12 group standings (or a chosen subset), with live points, goal difference and qualification positions. Click a team for its recent results and upcoming fixtures. |

Both have a transparent background and no border, pick up your Appspace brand colour automatically, and are responsive from a narrow sidebar to a wide column.

---

## ⚠️ No warranty (please read)

**These widgets are provided as-is, with no warranty or support from Appspace.** They were built by an Appspace employee over a weekend as a bit of fun for the World Cup. They are **not an official Appspace product**, are not covered by any SLA, support agreement, or roadmap commitment, and may stop working at any time.

In particular, the data comes from a **free, unofficial public feed** (ESPN). If that feed changes or goes away, the widgets will stop updating. Use them at your own risk. You're very welcome to take the code and adapt it.

---

## Install

1. In the Appspace Console, go to **Settings → Widgets**.
2. Click **Import** and select the `.zip`:
   - `world-cup-games-1.0.1.zip`
   - `world-cup-tables-1.0.1.zip`
3. Add the widget to an Employee App homepage and configure it.

Both widgets work with no configuration; every setting has a sensible default.

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

## Data source

Live data is fetched directly in the browser from ESPN's public soccer API (free, no API key). It carries scores, goal scorers, team crests, group standings, fixtures, and placeholder names for undecided knockout teams. All the feed-specific logic lives in one file, [`shared/js/espn-adapter.js`](shared/js/espn-adapter.js), so the data source can be swapped by editing that single file. Scores are cached locally and shown with an "offline" note if a refresh fails.

## Rebuild / local development

No build step or framework: plain HTML, CSS and JavaScript.

```bash
npm install            # one-time (just the zip packager)

npm run dev:games      # preview Games on http://localhost:5173/widget.html
npm run dev:tables     # preview Tables on http://localhost:5174/widget.html
npm run package        # rebuild both .zip packages
```

The dev server injects a small mock of the Appspace Widget API so the widgets run standalone in a browser. Append `?mock=group-stage` (or `live`, `knockout-tbd`, `shootout`, `empty`) to preview against bundled sample data, and `?cfg=<urlencoded-json>` to try different settings.

## Layout

```
shared/            code shared by both widgets (data adapter, polling, cache, brand, rendering helpers)
games-widget/      the Games widget (schema.json, widget.html, widget.css, js/)
tables-widget/     the Tables widget
scripts/           dev server + zip packager
*.zip              the packaged widgets, ready to upload
```
