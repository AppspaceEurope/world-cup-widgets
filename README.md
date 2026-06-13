# World Cup Widgets for Appspace

Two custom widgets for the Appspace Employee App that show **FIFA World Cup 2026** scores and standings, ready to upload as `.zip` packages.

| Widget | What it shows |
|--------|---------------|
| **World Cup Games** | Today's matches (live scores, kick-off times, final scores), a browsable day pager for upcoming days, goal scorers, placeholders for undecided knockout teams, and a tap-through match-detail view. |
| **World Cup Tables** | All 12 group standings (or a chosen subset), with live points, goal difference and qualification positions. |

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

**World Cup Games**: widget title · days ahead to browse (0 to 30) · scorers shown per match (0 to 10) · show venue in match detail · accent colour override · live refresh interval (30 to 600s) · idle refresh interval (5 to 120min).

**World Cup Tables**: widget title · groups to show (any of A to L, or leave empty for all 12) · accent colour override · refresh interval (5 to 240min).

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
