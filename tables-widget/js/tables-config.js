/* tables-config.js — parse + coerce Tables widget configuration. Registers WC.tablesConfig. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  function num(c, name, def, min, max) {
    var n = parseInt(c[name] && c[name].value, 10);
    if (isNaN(n)) n = def;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return n;
  }
  function str(c, name, def) {
    var v = c[name] && c[name].value;
    return v != null && v !== '' ? String(v) : def;
  }
  function list(c, name) {
    var v = c[name] && c[name].value;
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string' && v) return v.split(',').map(function (s) { return s.trim(); });
    return [];
  }

  function parse(widgetConfig) {
    var c = (widgetConfig && widgetConfig.data && widgetConfig.data.configuration) || {};
    return {
      title: str(c, 'title', ''),
      groups: list(c, 'groups'),           // [] = all
      accentColor: str(c, 'accentColor', ''),
      refreshMinutes: num(c, 'refreshMinutes', 15, 5, 240)
    };
  }

  WC.tablesConfig = { parse: parse };
})();
