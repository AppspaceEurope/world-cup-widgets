#!/usr/bin/env node
/**
 * Dev static server for World Cup widgets.
 *
 * Serves a single widget directory at "/" while rewriting "/shared/*" requests
 * to the repo-root shared/ folder. This gives dev/prod path parity: in the
 * packaged zip, shared/ sits next to widget.html, so the same relative URLs
 * (shared/js/..., js/...) resolve in both environments — no copy step in dev.
 *
 * Usage: node scripts/dev-server.js <widget-dir> <port>
 *   node scripts/dev-server.js games-widget 5173
 *
 * Load in the widget-tester by pointing it at:
 *   http://localhost:5173/widget.html
 * Add ?mock=group-stage (etc.) to drive the adapter from shared/mock/.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const widgetDir = process.argv[2] || 'games-widget';
const port = parseInt(process.argv[3], 10) || 5173;

const repoRoot = path.join(__dirname, '..');
const widgetRoot = path.join(repoRoot, widgetDir);
const sharedRoot = path.join(repoRoot, 'shared');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Card dirs ship index.html; widget dirs ship widget.html.
const defaultDoc = fs.existsSync(path.join(widgetRoot, 'index.html')) ? '/index.html' : '/widget.html';

function resolvePath(urlPath) {
  // Strip query string, decode, normalise.
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '') p = defaultDoc;

  // "/shared/*" always resolves against the repo-root shared/ folder.
  if (p.startsWith('/shared/')) {
    const rel = p.slice('/shared/'.length);
    return safeJoin(sharedRoot, rel);
  }
  return safeJoin(widgetRoot, p.replace(/^\//, ''));
}

function safeJoin(base, rel) {
  const target = path.normalize(path.join(base, rel));
  if (!target.startsWith(base)) return null; // path traversal guard
  return target;
}

const mockSdkPath = path.join(__dirname, 'mock-sdk.js');

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // Dev-only mock SDK served at /__mock-sdk.js (never in the packaged zip).
  if (urlPath === '/__mock-sdk.js') {
    fs.readFile(mockSdkPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('no mock'); return; }
      res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-cache' });
      res.end(data);
    });
    return;
  }

  const filePath = resolvePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + req.url);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();

    // Inject the mock SDK into widget.html so it runs standalone in dev.
    // The mock self-guards: a real Console (?consoleUrl=) disables it.
    if (path.basename(filePath) === 'widget.html') {
      let html = data.toString('utf8');
      html = html.replace('</head>', '  <script src="/__mock-sdk.js"></script>\n</head>');
      res.writeHead(200, {
        'Content-Type': MIME['.html'],
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(html);
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(port, () => {
  const doc = defaultDoc.replace(/^\//, '');
  const isCard = doc === 'index.html';
  console.log(`\n  World Cup ${isCard ? 'card' : 'widget'} dev server`);
  console.log(`  Serving:   ${widgetDir}/  (shared/ → repo shared/)`);
  console.log(`  URL:       http://localhost:${port}/${doc}`);
  if (isCard) console.log(`  Mock host: http://localhost:${port}/dev/host.html`);
  console.log(`  Mock mode: http://localhost:${port}/${doc}?mock=group-stage\n`);
});
