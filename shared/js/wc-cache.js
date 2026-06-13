/* wc-cache.js — localStorage cache with in-memory fallback. Registers WC.cache.
 * Sandboxed iframes can throw on localStorage access, so every call is guarded. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  var mem = {};
  var ls = null;
  try {
    var t = '__wc_probe__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    ls = window.localStorage;
  } catch (e) {
    ls = null; // fall back to in-memory only
  }

  function get(key) {
    try {
      if (ls) {
        var raw = ls.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
    } catch (e) { /* fall through */ }
    return mem[key] || null;
  }

  function set(key, data) {
    var entry = { data: data, savedAt: Date.now() };
    mem[key] = entry;
    try {
      if (ls) ls.setItem(key, JSON.stringify(entry));
    } catch (e) { /* quota / disabled — in-memory copy still set */ }
    return entry;
  }

  // Drop scoreboard entries older than maxAgeDays to keep storage tidy.
  function prune(prefix, maxAgeDays) {
    if (!ls) return;
    var cutoff = Date.now() - (maxAgeDays || 3) * 86400000;
    try {
      var toRemove = [];
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (k && k.indexOf(prefix) === 0) {
          var v = JSON.parse(ls.getItem(k));
          if (v && v.savedAt && v.savedAt < cutoff) toRemove.push(k);
        }
      }
      toRemove.forEach(function (k) { ls.removeItem(k); });
    } catch (e) { /* ignore */ }
  }

  WC.cache = { get: get, set: set, prune: prune, hasLocalStorage: !!ls };
})();
