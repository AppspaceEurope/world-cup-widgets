/* card-config.js — config for the World Cup scores card. Registers WC.cardConfig.
 *
 * A card has no widget-api. Config precedence (low → high):
 *   built-in DEFAULTS  →  model.json (packaged defaults)  →  ?cfg= (dev/query)
 *   →  host api.init (the player/Console may post the user's resolved model).
 *
 * The card is fully functional on DEFAULTS alone (live scores need no config),
 * so we never block on the host: load() resolves immediately with what we have
 * and calls onUpdate() if a host message arrives later. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  var DEFAULTS = { title: 'World Cup', theme: 'dark', accentColor: '', showScorers: 'show' };

  // An input value can be a primitive or a richtext object ({ text }).
  function valueOf(input) {
    var v = input && input.value;
    if (v && typeof v === 'object' && 'text' in v) return v.text;
    return v;
  }

  function fromInputs(inputs, into) {
    (inputs || []).forEach(function (i) {
      // Apply any defined value (incl. '' so clearing a field in the editor is
      // reflected live). model.json carries the real defaults.
      if (i && i.name != null) {
        var v = valueOf(i);
        if (v !== undefined) into[i.name] = v;
      }
    });
    return into;
  }

  // Host api.init payloads vary; pull a config object from the likely shapes.
  function fromHostMessage(msg) {
    if (!msg || typeof msg !== 'object') return null;
    var c = msg.config || msg;
    var model = c.model || msg.model;
    if (model && Array.isArray(model.inputs)) return fromInputs(model.inputs, {});
    if (c && Array.isArray(c.inputs)) return fromInputs(c.inputs, {});
    if (c && (c.title != null || c.accentColor != null)) {
      var o = {};
      if (c.title != null) o.title = c.title;
      if (c.accentColor != null) o.accentColor = c.accentColor;
      return o;
    }
    return null;
  }

  function parseQuery(cfg) {
    try {
      var raw = new URLSearchParams(window.location.search).get('cfg');
      if (!raw) return;
      var json = /^[\{\[]/.test(raw) ? raw : atob(raw);
      Object.assign(cfg, JSON.parse(json));
    } catch (e) { /* ignore bad ?cfg= */ }
  }

  // Returns a Promise<config>. onUpdate(config) fires if the host posts config later.
  function load(onUpdate) {
    var cfg = Object.assign({}, DEFAULTS);

    // Tell the host we're ready (harmless if no host is listening).
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ message: 'onapiready' }, '*'); } catch (e) {}

    // The Console editor pushes config to the preview as `onmodelupdate`
    // (full model) on every field edit; `api.init` carries the initial config.
    window.addEventListener('message', function (ev) {
      var data = ev && ev.data;
      if (!data || (data.message !== 'api.init' && data.message !== 'onmodelupdate')) return;
      var hostCfg = fromHostMessage(data);
      if (hostCfg) {
        Object.assign(cfg, hostCfg);
        if (typeof onUpdate === 'function') onUpdate(Object.assign({}, cfg));
      }
    });

    return fetch('model.json', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (model) {
        if (model && Array.isArray(model.inputs)) fromInputs(model.inputs, cfg);
        parseQuery(cfg); // query overrides packaged defaults
        return Object.assign({}, cfg);
      });
  }

  WC.cardConfig = { load: load, DEFAULTS: DEFAULTS };
})();
