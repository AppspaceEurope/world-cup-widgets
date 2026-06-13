/* wc-brand.js — maps the Appspace Brand API onto --wc-accent* CSS vars.
 * Registers WC.brand. Never rejects: any failure leaves the tokens.css defaults.
 *
 * Precedence: accentColor config override → Brand API palette → tokens.css defaults.
 * Brand API: callAppspaceAPI('getBrandProfiles') → [{ colorPalette: {
 *   darkColor, primaryColor, secondaryColor, paleColor } }] (first profile / default). */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  function setVars(palette) {
    var root = document.documentElement;
    if (palette.primaryColor) root.style.setProperty('--wc-accent', palette.primaryColor);
    if (palette.darkColor) root.style.setProperty('--wc-accent-dark', palette.darkColor);
    if (palette.paleColor) root.style.setProperty('--wc-accent-pale', palette.paleColor);
    if (palette.secondaryColor) root.style.setProperty('--wc-accent-2', palette.secondaryColor);
  }

  function applyOverride(hex) {
    var root = document.documentElement;
    root.style.setProperty('--wc-accent', hex);
    root.style.setProperty('--wc-accent-dark', hex);
    // derive a faint pale tint from the override
    root.style.setProperty('--wc-accent-pale', hexToTint(hex, 0.12));
  }

  function hexToTint(hex, alpha) {
    try {
      var h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
      var r = parseInt(h.slice(0, 2), 16);
      var g = parseInt(h.slice(2, 4), 16);
      var b = parseInt(h.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    } catch (e) { return 'rgba(0,0,0,0.05)'; }
  }

  // Returns a Promise that always resolves (never throws).
  function apply(widgetApi, accentOverride) {
    if (accentOverride) {
      applyOverride(accentOverride);
      return Promise.resolve('override');
    }
    if (!widgetApi || typeof widgetApi.callAppspaceAPI !== 'function') {
      return Promise.resolve('default');
    }
    return widgetApi.callAppspaceAPI('getBrandProfiles', {}).then(function (res) {
      var body = res && res.data;
      // Tolerate a few shapes: array, { data: [...] }, { profiles: [...] }
      var list = Array.isArray(body) ? body
        : (body && (body.data || body.profiles || body.items)) || [];
      var def = list.filter(function (p) { return p && p.isDefault; })[0] || list[0];
      var palette = def && (def.colorPalette || def.palette);
      if (palette) { setVars(palette); return 'brand'; }
      return 'default';
    }).catch(function (err) {
      console.warn('[WC] Brand API unavailable, using defaults:', err && err.message);
      return 'default';
    });
  }

  WC.brand = { apply: apply };
})();
