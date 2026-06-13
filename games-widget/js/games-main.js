/* games-main.js — orchestration for the Games widget.
 * Wires config → adapter → poller → render, with cache-first paint and a
 * fast/slow refresh cadence that follows whether anything is live. */
(function () {
  'use strict';
  var WC = window.WC || {};
  var el = WC.dom.el;

  var TEMPLATE_KEY = 'world-cup-games';
  var container = document.getElementById('widget-container');

  var state = {
    cfg: null,
    widgetApi: null,
    offset: 0,
    poller: null,
    stale: false,
    savedAt: null
  };

  // Stable layout: header / pager / content slots rendered once, updated in place.
  var slots = {};
  function buildLayout() {
    WC.dom.clear(container);
    container.classList.remove('loading');
    slots.header = el('div', 'wc-slot-header');
    slots.pager = el('div', 'wc-slot-pager');
    slots.content = el('div', 'wc-slot-content');
    container.appendChild(slots.header);
    container.appendChild(slots.pager);
    container.appendChild(slots.content);
  }

  function cacheKey(offset) {
    return 'wc:' + TEMPLATE_KEY + ':sb:' + WC.dom.ymdOffset(offset);
  }

  function renderHeader() {
    WC.dom.clear(slots.header);
    slots.header.appendChild(WC.gamesRender.header(state.cfg, { savedAt: state.savedAt, stale: state.stale }));
  }

  function renderPager() {
    WC.dom.clear(slots.pager);
    if (state.cfg.daysAhead <= 0) return; // single-day mode: no pager
    slots.pager.appendChild(WC.gamesRender.pager(
      { offset: state.offset, daysAhead: state.cfg.daysAhead },
      selectDay
    ));
  }

  function onOpenDetail(match) {
    WC.gamesModal.open(match, state.cfg, state.widgetApi);
  }

  function renderContent(dayData) {
    WC.dom.clear(slots.content);
    slots.content.appendChild(WC.gamesRender.day(dayData, state.cfg, onOpenDetail));
  }

  function renderSkeleton() {
    WC.dom.clear(slots.content);
    slots.content.appendChild(WC.gamesRender.skeleton(3));
  }

  function renderError() {
    WC.dom.clear(slots.content);
    slots.content.appendChild(WC.gamesRender.errorState(function () {
      if (state.poller) state.poller.refreshNow();
    }));
  }

  function dayLabel(offset) {
    var d = new Date(); d.setDate(d.getDate() + offset);
    return WC.dom.fmtDayLabel(d);
  }

  function toDayData(offset, result) {
    return { dateLabel: dayLabel(offset), matches: (result && result.matches) || [] };
  }

  // Any match live, or a pre-match kicking off within 10 min, or one that just finished.
  function isFast(result) {
    var matches = (result && result.matches) || [];
    var now = Date.now();
    return matches.some(function (m) {
      if (m.state === 'in') return true;
      if (m.state === 'pre' && m.dateUtc) {
        var diff = new Date(m.dateUtc).getTime() - now;
        return diff > 0 && diff < 10 * 60000;
      }
      return false;
    });
  }

  function fireAnalytics(name, meta) {
    if (state.widgetApi && typeof state.widgetApi.raiseAnalyticsEvent === 'function') {
      state.widgetApi.raiseAnalyticsEvent(name, meta || {}).catch(function () {});
    }
  }

  function startPollerForDay() {
    if (state.poller) state.poller.stop();
    var offset = state.offset;
    state.poller = WC.poller.create({
      fetchFn: function () { return WC.espn.fetchScoreboard(WC.dom.ymdOffset(offset)); },
      isFastFn: isFast,
      fastMs: state.cfg.livePollSeconds * 1000,
      slowMs: state.cfg.idlePollMinutes * 60000,
      onData: function (result) {
        // Ignore late responses from a day we've navigated away from.
        if (offset !== state.offset) return;
        state.stale = false;
        var entry = WC.cache.set(cacheKey(offset), result);
        state.savedAt = entry.savedAt;
        renderHeader();
        renderContent(toDayData(offset, result));
      },
      onError: function (err) {
        if (offset !== state.offset) return;
        fireAnalytics('refreshFailed', { reason: (err && err.message) || 'error', endpoint: 'scoreboard' });
        var cached = WC.cache.get(cacheKey(offset));
        if (cached && cached.data) {
          state.stale = true;
          state.savedAt = cached.savedAt;
          renderHeader();
          renderContent(toDayData(offset, cached.data));
        } else {
          renderError();
        }
      }
    });
    state.poller.start();
  }

  function selectDay(offset) {
    state.offset = offset;
    state.stale = false;
    fireAnalytics('dayChanged', { offset: offset, date: WC.dom.ymdOffset(offset) });
    renderPager();

    // Cache-first paint, then the poller fetches fresh.
    var cached = WC.cache.get(cacheKey(offset));
    if (cached && cached.data) {
      state.savedAt = cached.savedAt;
      renderHeader();
      renderContent(toDayData(offset, cached.data));
    } else {
      state.savedAt = null;
      renderHeader();
      renderSkeleton();
    }
    startPollerForDay();
  }

  function init() {
    WC.espn.configureFromUrl();
    WC.cache.prune('wc:' + TEMPLATE_KEY + ':sb:', 3);

    state.widgetApi.getConfiguration().then(function (widgetConfig) {
      state.cfg = WC.gamesConfig.parse(widgetConfig);

      buildLayout();
      WC.height.observe(container, state.widgetApi);
      // Brand is non-blocking; re-render header once it resolves (in case title colours change).
      WC.brand.apply(state.widgetApi, state.cfg.accentColor);

      selectDay(0);

      if (typeof state.widgetApi.onReady === 'function') {
        state.widgetApi.onReady().catch(function () {});
      }
    }).catch(function (err) {
      console.error('[WC Games] init failed:', err);
      buildLayout();
      renderError();
      if (typeof state.widgetApi.onError === 'function') state.widgetApi.onError().catch(function () {});
    });
  }

  if (window.appspace && window.appspace.waitForWidgetApi) {
    window.appspace.waitForWidgetApi().then(function (api) {
      state.widgetApi = api;
      init();
    }).catch(function (err) {
      console.error('[WC Games] Widget API failed to load:', err);
      if (container) {
        container.classList.remove('loading');
        WC.dom.clear(container);
        container.appendChild(el('div', { class: 'wc-error', text: 'Widget failed to load. Please refresh.' }));
      }
    });
  }
})();
