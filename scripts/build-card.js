#!/usr/bin/env node
/**
 * build-card.js — produce a cross-device build of the scores card.
 *
 * Signage players range from modern Chromium (PWA/Chromebox/UWP) down to
 * BrightSign (Chromium 45), old Android System WebView and the legacy Windows
 * player. The raw card is modern ES6+ with Google Fonts + a direct fetch, which
 * dies on the older engines. This build makes it run everywhere:
 *   - Babel transpiles the card JS to ES5 (arrow fns, const/let, etc.)
 *   - core-js + whatwg-fetch polyfill the ES6+ APIs (padStart, Promise, fetch…)
 *   - fonts are self-hosted (no Google Fonts network/TLS dependency)
 *   - a prod index.html loads polyfills.js then card.js, with one bundled card.css
 *
 * Dev stays raw/no-build (scores-card/index.html + the shared/ scripts).
 * Output: scores-card/build/  (packaged by scripts/package.js).
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.join(__dirname, '..');
const cardDir = path.join(root, 'scores-card');
const buildDir = path.join(cardDir, 'build');
const fontsOut = path.join(buildDir, 'assets', 'fonts');

fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(fontsOut, { recursive: true });

// --- 1) JS → ES5 -----------------------------------------------------------
// Same modules the card loads in dev, in dependency order. (wc-brand/wc-height/
// wc-modal are widget-host only and intentionally excluded.)
const jsSources = [
  'shared/js/wc-dom.js', 'shared/js/wc-cache.js', 'shared/js/espn-adapter.js',
  'shared/js/wc-poller.js', 'shared/js/wc-teams.js',
  'scores-card/js/card-config.js', 'scores-card/js/state.js',
  'scores-card/js/render.js', 'scores-card/js/main.js'
];
const concatJs = jsSources
  .map((f) => '/* ' + f + ' */\n' + fs.readFileSync(path.join(root, f), 'utf8'))
  .join('\n;\n');
const es5 = babel.transform(concatJs, {
  compact: false,
  presets: [['@babel/preset-env', {
    targets: { ie: '11', chrome: '45', android: '4.4', safari: '9' },
    useBuiltIns: false // APIs come from polyfills.js; this only lowers syntax
  }]]
}).code;
fs.writeFileSync(path.join(buildDir, 'card.js'), es5);

// --- 2) polyfills (prebuilt, ES5-safe) -------------------------------------
const polyfills = [
  '/* core-js */', fs.readFileSync(require.resolve('core-js-bundle/minified.js'), 'utf8'),
  '/* whatwg-fetch */', fs.readFileSync(require.resolve('whatwg-fetch/dist/fetch.umd.js'), 'utf8')
].join('\n');
fs.writeFileSync(path.join(buildDir, 'polyfills.js'), polyfills);

// --- 3) self-hosted fonts --------------------------------------------------
const fonts = [
  ['Inter', 400, '@fontsource/inter/files/inter-latin-400-normal.woff2', 'inter-400.woff2'],
  ['Inter', 500, '@fontsource/inter/files/inter-latin-500-normal.woff2', 'inter-500.woff2'],
  ['Inter', 600, '@fontsource/inter/files/inter-latin-600-normal.woff2', 'inter-600.woff2'],
  ['Inter', 700, '@fontsource/inter/files/inter-latin-700-normal.woff2', 'inter-700.woff2'],
  ['Poppins', 600, '@fontsource/poppins/files/poppins-latin-600-normal.woff2', 'poppins-600.woff2'],
  ['Poppins', 700, '@fontsource/poppins/files/poppins-latin-700-normal.woff2', 'poppins-700.woff2'],
  ['Poppins', 800, '@fontsource/poppins/files/poppins-latin-800-normal.woff2', 'poppins-800.woff2']
];
let faceCss = '';
fonts.forEach(function (f) {
  fs.copyFileSync(require.resolve(f[2]), path.join(fontsOut, f[3]));
  faceCss += "@font-face{font-family:'" + f[0] + "';font-style:normal;font-weight:" + f[1] +
    ";font-display:swap;src:url('assets/fonts/" + f[3] + "') format('woff2');}\n";
});

// --- 4) one bundled card.css (fonts + tokens + base + card) ----------------
const css = faceCss + '\n' +
  fs.readFileSync(path.join(root, 'shared/css/tokens.css'), 'utf8') + '\n' +
  fs.readFileSync(path.join(root, 'shared/css/base.css'), 'utf8') + '\n' +
  fs.readFileSync(path.join(cardDir, 'card.css'), 'utf8');
fs.writeFileSync(path.join(buildDir, 'card.css'), css);

// --- 5) prod index.html (no external CDNs; polyfills first) ----------------
const html = [
  '<!doctype html>',
  '<html lang="en"><head>',
  '<meta charset="utf-8"><title>World Cup Live Scores</title>',
  '<base href="./"><meta name="viewport" content="width=device-width, initial-scale=1">',
  '<link rel="stylesheet" href="card.css">',
  '</head><body>',
  '<div id="card" class="card-theme-dark is-loading"><div class="card-boot">Loading World Cup scores…</div></div>',
  '<script src="polyfills.js"></script>',
  '<script src="card.js"></script>',
  '</body></html>', ''
].join('\n');
fs.writeFileSync(path.join(buildDir, 'index.html'), html);

// --- 6) static card files --------------------------------------------------
['manifest.json', 'schema.json', 'model.json', 'theme.json', 'thumbnail.svg'].forEach(function (f) {
  fs.copyFileSync(path.join(cardDir, f), path.join(buildDir, f));
});

console.log('  ✅ card build → scores-card/build/  (ES5 + polyfills + local fonts)');
