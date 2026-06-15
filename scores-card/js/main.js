/* main.js — orchestration for the World Cup scores card.
 * config → poller(fetchView) → classify → render, cache-first, with a fast/slow
 * cadence that follows whether anything is live, and a rotation timer that cycles
 * the hero focus when more than one match is live. */
(function () {
  'use strict';
  var WC = window.WC || {};
  var el = WC.dom.el;

  var CACHE_KEY = 'wc:card:scores:day';
  var FAST_MS = 45000;     // refresh while live / about to kick off
  var SLOW_MS = 300000;    // idle refresh
  var ROTATE_MS = 10000;   // hero focus cycle when >1 live

  var root = document.getElementById('card');
  var st = { cfg: null, view: null, focusIndex: 0, poller: null, rotateTimer: null, savedAt: null, stale: false };

  function applyAccent(hex) {
    if (!hex) return;
    var r = document.documentElement;
    r.style.setProperty('--wc-accent', hex);
    r.style.setProperty('--wc-accent-dark', hex);
  }

  // Attach the currently-focused live match to the view (rotates when >1 live).
  function focusedView() {
    var v = st.view;
    if (!v) return v;
    var focus = (v.mode === 'live' && v.live.length) ? v.live[st.focusIndex % v.live.length] : null;
    return Object.assign({}, v, { focus: focus });
  }

  function paint() {
    if (!st.view) return;
    WC.cardRender.render(root, focusedView(), st.cfg, { savedAt: st.savedAt, stale: st.stale });
  }

  function setupRotation() {
    clearInterval(st.rotateTimer);
    st.rotateTimer = null;
    if (st.view && st.view.mode === 'live' && st.view.live.length > 1) {
      st.rotateTimer = setInterval(function () { st.focusIndex += 1; paint(); }, ROTATE_MS);
    }
  }

  function applyDay(day, stale, savedAt) {
    st.stale = !!stale;
    st.savedAt = savedAt;
    st.view = WC.cardState.classify(day);
    if (st.focusIndex >= Math.max(st.view.live.length, 1)) st.focusIndex = 0;
    paint();
    setupRotation();
  }

  function onData(day) {
    var entry = WC.cache.set(CACHE_KEY, day);
    applyDay(day, false, entry.savedAt);
  }

  function onError() {
    var cached = WC.cache.get(CACHE_KEY);
    if (cached && cached.data) {
      applyDay(cached.data, true, cached.savedAt);
    } else {
      WC.dom.clear(root);
      root.classList.remove('is-loading');
      root.appendChild(el('div', { class: 'card-empty card-fatal', text: 'Scores unavailable' }));
    }
  }

  function startPoller() {
    st.poller = WC.poller.create({
      fetchFn: WC.cardState.fetchView,
      isFastFn: WC.cardState.isFast,
      fastMs: FAST_MS,
      slowMs: SLOW_MS,
      onData: onData,
      onError: onError
    });
    st.poller.start();
  }

  function init() {
    WC.espn.configureFromUrl();
    WC.cardConfig.load(function (updated) {
      st.cfg = updated;
      applyAccent(updated.accentColor);
      if (st.view) paint();
    }).then(function (cfg) {
      st.cfg = cfg;
      applyAccent(cfg.accentColor);
      // Cache-first paint so a player shows something instantly after a reboot.
      var cached = WC.cache.get(CACHE_KEY);
      if (cached && cached.data) applyDay(cached.data, false, cached.savedAt);
      startPoller();
    });
  }

  init();
})();
