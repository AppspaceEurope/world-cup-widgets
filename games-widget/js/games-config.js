/* games-config.js — parse + coerce widget configuration. Registers WC.gamesConfig. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  function num(configData, name, def, min, max) {
    var raw = configData[name] && configData[name].value;
    var n = parseInt(raw, 10);
    if (isNaN(n)) n = def;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return n;
  }
  function str(configData, name, def) {
    var v = configData[name] && configData[name].value;
    return v != null && v !== '' ? String(v) : def;
  }
  function bool(configData, name, def) {
    var v = configData[name] && configData[name].value;
    if (v == null) return def;
    return v === true || v === 'true';
  }

  function parse(widgetConfig) {
    var c = (widgetConfig && widgetConfig.data && widgetConfig.data.configuration) || {};
    return {
      title: str(c, 'title', ''),
      daysAhead: num(c, 'daysAhead', 7, 0, 30),
      daysBehind: num(c, 'daysBehind', 3, 0, 14),
      maxScorersShown: num(c, 'maxScorersShown', 3, 0, 10),
      showVenue: bool(c, 'showVenue', true),
      showLineups: bool(c, 'showLineups', true),
      accentColor: str(c, 'accentColor', ''),
      livePollSeconds: num(c, 'livePollSeconds', 60, 30, 600),
      idlePollMinutes: num(c, 'idlePollMinutes', 10, 5, 120)
    };
  }

  WC.gamesConfig = { parse: parse };
})();
