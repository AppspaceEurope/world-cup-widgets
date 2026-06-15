#!/usr/bin/env node
/**
 * Package a World Cup widget into a self-contained Appspace widget .zip.
 *
 * The zip is self-contained: the repo-root shared/ folder (js + css only —
 * NOT mock/) is copied into the zip under shared/, sitting next to widget.html,
 * so the relative <script src="shared/js/..."> tags resolve at runtime.
 *
 * Usage: node scripts/package.js <widget-dir> [--with-mocks]
 *   node scripts/package.js games-widget
 *
 * Output: <repo-root>/<templateKey>-<version>.zip  (named from schema.json)
 */
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const widgetDir = process.argv[2];
const withMocks = process.argv.includes('--with-mocks');

if (!widgetDir) {
  console.error('Usage: node scripts/package.js <widget-dir> [--with-mocks]');
  process.exit(1);
}

const repoRoot = path.join(__dirname, '..');
const widgetRoot = path.join(repoRoot, widgetDir);
const sharedRoot = path.join(repoRoot, 'shared');

// A card dir has manifest.json (Appspace Card); a widget dir has schema.json + templateKey.
const manifestPath = path.join(widgetRoot, 'manifest.json');
const schemaPath = path.join(widgetRoot, 'schema.json');
const isCard = fs.existsSync(manifestPath);

let key, version;
if (isCard) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  version = manifest.Version || '0.0.0';
  key = 'world-cup-' + path.basename(widgetRoot); // scores-card → world-cup-scores-card
} else {
  if (!fs.existsSync(schemaPath)) {
    console.error(`No manifest.json or schema.json found in ${widgetDir}/`);
    process.exit(1);
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  key = schema.templateKey || widgetDir;
  version = schema.version || '0.0.0';
}

const outputPath = path.join(repoRoot, `${key}-${version}.zip`);
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`\n  ✅ ${key} v${version}  (${isCard ? 'card' : 'widget'})`);
  console.log(`  📦 ${(archive.pointer() / 1024).toFixed(1)} KB`);
  console.log(`  📍 ${outputPath}\n`);
});
archive.on('warning', (err) => { if (err.code !== 'ENOENT') throw err; });
archive.on('error', (err) => { throw err; });
archive.pipe(output);

if (isCard) {
  // Card package: manifest/schema/model/index.html at the root + assets, no dev/.
  ['manifest.json', 'schema.json', 'model.json', 'theme.json', 'index.html', 'card.css', 'thumbnail.svg'].forEach((f) => {
    const full = path.join(widgetRoot, f);
    if (fs.existsSync(full)) archive.file(full, { name: f });
  });
  ['js', 'assets', 'images'].forEach((dir) => {
    const full = path.join(widgetRoot, dir);
    if (fs.existsSync(full)) archive.directory(full, dir);
  });
} else {
  // Widget package.
  archive.file(path.join(widgetRoot, 'widget.html'), { name: 'widget.html' });
  archive.file(schemaPath, { name: 'schema.json' });
  const widgetCss = path.join(widgetRoot, 'widget.css');
  if (fs.existsSync(widgetCss)) archive.file(widgetCss, { name: 'widget.css' });
  ['js', 'images', 'passport'].forEach((dir) => {
    const full = path.join(widgetRoot, dir);
    if (fs.existsSync(full)) archive.directory(full, dir);
  });
}

// --- Shared modules copied in (js + css; mock only with --with-mocks) ---
archive.directory(path.join(sharedRoot, 'js'), 'shared/js');
archive.directory(path.join(sharedRoot, 'css'), 'shared/css');
if (withMocks) {
  archive.directory(path.join(sharedRoot, 'mock'), 'shared/mock');
}

archive.finalize();
