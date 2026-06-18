/* card-config.js — config + host handshake for the World Cup scores card.
 *
 * Faithful to the Appspace card SDK (bitbucket appspace-cloud/card-api · cardapi.js).
 * KEY FACTS that earlier versions got wrong:
 *   • `window.$cardApi` is NOT injected by the player — the SDK CREATES it. A card
 *     that doesn't speak the protocol simply never talks to the host.
 *   • The host talks to the card by postMessage; the card replies in kind. EVERY
 *     message carries `cardId` (from the `?cardId=` query param) so the host can
 *     correlate it to the content slot.
 *   • The card MUST post {message:'loaded', cardId} once it has rendered, or the
 *     player keeps the card hidden (black) and eventually logs "Failed to load
 *     content". Config arrives via api.init / onmodelupdate; readiness is announced
 *     with onapiready. The host may (re)establish the postMessage target via
 *     appspaceapp.webview.postmessage.init (iframe/native) or .mswebview… (UWP).
 *
 * We replicate that host protocol here (no jQuery/SDK bundle) and also expose a
 * minimal window.$cardApi for any host-side "is this a card?" detection. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  // Keep in sync with model.json — packaged defaults the card runs on.
  var DEFAULTS = { title: 'World Cup', theme: 'dark', accentColor: '', showScorers: 'show', timezone: '', timeFormat: '' };

  // An input value can be a primitive or a richtext object ({ text }).
  function valueOf(input) {
    var v = input && input.value;
    if (v && typeof v === 'object' && 'text' in v) return v.text;
    return v;
  }

  function fromInputs(inputs, into) {
    (inputs || []).forEach(function (i) {
      if (i && i.name != null) {
        var v = valueOf(i);
        if (v !== undefined) into[i.name] = v; // apply '' too, so clearing reflects
      }
    });
    return into;
  }

  // Host messages vary in shape (api.init carries .config, onmodelupdate carries
  // .model). Pull a config object out of the likely shapes.
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

  // ---- Host communication (matches cardapi.js raiseMessage / onParentMessage) ----
  function param(n) {
    try { return new URLSearchParams(window.location.search).get(n) || ''; } catch (e) { return ''; }
  }

  var cardId = param('cardId');
  var appWindow = null;   // set when the host establishes a postMessage target
  var appOrigin = null;
  var msMessaging = null; // UWP/MS-webview: buffer messages for host polling
  var cfg = Object.assign({}, DEFAULTS);
  var onUpdateCb = null;

  // Send a message to the host, mirroring the SDK's target fallback chain.
  function raiseMessage(msg) {
    try {
      if (appWindow) appWindow.postMessage(msg, appOrigin || '*');
      else if (msMessaging) msMessaging.push(msg);
      else if (window.opener && window.opener.postMessage) window.opener.postMessage(msg, '*');
      else if (window.parent && window.parent.postMessage) window.parent.postMessage(msg, '*');
    } catch (e) {}
  }

  function announce() { raiseMessage({ message: 'onapiready', cardId: cardId }); }

  function applyHostCfg(hostCfg) {
    if (!hostCfg) return;
    Object.assign(cfg, hostCfg);
    if (typeof onUpdateCb === 'function') onUpdateCb(Object.assign({}, cfg));
  }

  function onHostMessage(ev) {
    var d = ev && ev.data;
    if (!d || !d.message) return;
    var m = String(d.message).toLowerCase();
    // Host establishing the reply channel — capture it and re-announce.
    if (m === 'appspaceapp.webview.postmessage.init') { appWindow = ev.source; appOrigin = ev.origin; announce(); return; }
    if (m === 'appspaceapp.mswebview.postmessage.init') { msMessaging = []; announce(); return; }
    if (m === 'api.init' || m === 'onmodelupdate') { applyHostCfg(fromHostMessage(d)); }
  }

  // UWP/MS-webview bridge globals (the host pushes in / polls out through these).
  window.msPostMessaging = function (message) { try { onHostMessage({ data: JSON.parse(message) }); } catch (e) {} };
  window.msRetrieveMessaging = function () {
    var out = msMessaging ? JSON.stringify(msMessaging) : '[]';
    if (msMessaging) msMessaging = [];
    return out;
  };

  // Listen + announce as early as possible (the host may send the init handshake
  // the moment the page loads, before main.js calls load()).
  try { window.addEventListener('message', onHostMessage, false); } catch (e) {}
  announce();

  // Minimal window.$cardApi for host-side detection + SDK-method parity.
  if (!window.$cardApi) {
    window.$cardApi = {
      init: announce,
      isReady: function () { return window.Promise ? Promise.resolve() : { then: function (f) { f(); return this; } }; },
      subscribeModelUpdate: function (cb) { onUpdateCb = cb; },
      subscribeSchemaUpdate: function () {}, subscribeModeChange: function () {}, subscribeToMessages: function () {},
      getConfig: function () { return {}; },
      getModel: function () { return { inputs: [] }; },
      getMode: function () { return param('mode') || 'tv'; },
      notifyOnLoad: function () { raiseMessage({ message: 'loaded', cardId: cardId }); },
      notifyOnComplete: function () { raiseMessage({ message: 'complete', cardId: cardId }); },
      notifyOnError: function () { raiseMessage({ message: 'error', cardId: cardId }); }
    };
  }

  // Returns Promise<config>. onUpdate(config) fires when the host pushes config.
  function load(onUpdate) {
    onUpdateCb = onUpdate;
    parseQuery(cfg);   // dev/query ?cfg= override
    announce();        // (re)tell the host we're ready — it replies api.init / postmessage.init
    return Promise.resolve(Object.assign({}, cfg));
  }

  // Tell the host the card has rendered → it reveals the card. Without this the
  // player keeps it hidden (black) and reports "Failed to load content".
  function signalLoaded() { raiseMessage({ message: 'loaded', cardId: cardId }); }
  function signalError() { raiseMessage({ message: 'error', cardId: cardId }); }

  WC.cardConfig = { load: load, signalLoaded: signalLoaded, signalError: signalError, DEFAULTS: DEFAULTS };
})();
