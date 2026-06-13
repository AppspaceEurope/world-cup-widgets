#!/usr/bin/env node
/**
 * Capture ESPN responses into shared/mock/ as fixtures.
 *
 * These fixtures (a) drive the widgets offline in the local tester via the
 * ?mock= URL param, and (b) act as the adapter's contract — committed to git
 * so ESPN schema drift is visible in a diff after re-running this script.
 *
 * Usage: node scripts/capture-snapshots.js
 *
 * Note: dates are computed from the current tournament window. Re-run during
 * the knockouts to refresh knockout-tbd / capture a real shootout.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
const mockDir = path.join(__dirname, '..', 'shared', 'mock');

// yyyymmdd for ESPN ?dates= param
function ymd(d) {
  return d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
}

const today = new Date();
const plus = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

// Fixtures to capture. Dates are tournament-aware:
//  - group-stage: a near future day still in the group stage
//  - live: today (whatever is on now)
//  - knockout-tbd: a Round-of-32 day (~28-29 Jun) where teams are still TBD
//  - empty: a day before the tournament started (no events)
const targets = [
  { name: 'scoreboard-live', url: `${BASE}/scoreboard` },
  { name: 'scoreboard-group-stage', url: `${BASE}/scoreboard?dates=${ymd(plus(1))}` },
  { name: 'scoreboard-knockout-tbd', url: `${BASE}/scoreboard?dates=20260629` },
  { name: 'scoreboard-empty', url: `${BASE}/scoreboard?dates=20260601` },
  { name: 'standings', url: STANDINGS }
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(mockDir)) fs.mkdirSync(mockDir, { recursive: true });

  for (const t of targets) {
    try {
      const data = await fetchJson(t.url);
      const out = path.join(mockDir, `${t.name}.json`);
      fs.writeFileSync(out, JSON.stringify(data, null, 2));
      const count = Array.isArray(data.events) ? data.events.length
        : Array.isArray(data.children) ? data.children.length : '?';
      console.log(`  ✓ ${t.name}.json  (${count} items)`);
    } catch (e) {
      console.error(`  ✗ ${t.name}: ${e.message}`);
    }
  }
  console.log('\n  Done. Synthesise scoreboard-shootout.json by hand from a post match.');
}

main();
