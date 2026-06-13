/* tables-main.js — orchestration for the Tables widget.
 * Single standings fetch on a fixed slow cadence, cache-first paint, stale fallback. */
(function () {
  'use strict';
  var WC = window.WC || {};
  var el = WC.dom.el;

  var TEMPLATE_KEY = 'world-cup-tables';
  var CACHE_KEY = 'wc:' + TEMPLATE_KEY + ':standings';
  var container = document.getElementById('widget-container');

  var state = { cfg: null, widgetApi: null, poller: null, stale: false, savedAt: null };
  var slots = {};

  function buildLayout() {
    WC.dom.clear(container);
    container.classList.remove('loading');
    slots.header = el('div', 'wc-slot-header');
    slots.content = el('div', 'wc-slot-content');
    slots.footer = el('div', 'wc-slot-footer');
    container.appendChild(slots.header);
    container.appendChild(slots.content);
    container.appendChild(slots.footer);
  }

  function renderHeader() {
    WC.dom.clear(slots.header);
    slots.header.appendChild(WC.tablesRender.header(state.cfg));
  }

  function renderFooter() {
    WC.dom.clear(slots.footer);
    var bar = WC.tablesRender.statusBar({ savedAt: state.savedAt, stale: state.stale });
    if (bar) slots.footer.appendChild(bar);
  }

  function renderGrid(data) {
    WC.dom.clear(slots.content);
    slots.content.appendChild(WC.tablesRender.grid((data && data.groups) || [], state.cfg));
  }

  function renderSkeleton() {
    WC.dom.clear(slots.content);
    slots.content.appendChild(WC.tablesRender.skeleton(4));
  }

  function renderError() {
    WC.dom.clear(slots.content);
    slots.content.appendChild(WC.tablesRender.errorState(function () {
      if (state.poller) state.poller.refreshNow();
    }));
  }

  function fireAnalytics(name, meta) {
    if (state.widgetApi && typeof state.widgetApi.raiseAnalyticsEvent === 'function') {
      state.widgetApi.raiseAnalyticsEvent(name, meta || {}).catch(function () {});
    }
  }

  function startPoller() {
    state.poller = WC.poller.create({
      fetchFn: function () { return WC.espn.fetchStandings(); },
      isFastFn: function () { return false; }, // tables never need fast polling
      fastMs: state.cfg.refreshMinutes * 60000,
      slowMs: state.cfg.refreshMinutes * 60000,
      onData: function (data) {
        state.stale = false;
        var entry = WC.cache.set(CACHE_KEY, data);
        state.savedAt = entry.savedAt;
        renderGrid(data);
        renderFooter();
      },
      onError: function (err) {
        fireAnalytics('refreshFailed', { reason: (err && err.message) || 'error', endpoint: 'standings' });
        var cached = WC.cache.get(CACHE_KEY);
        if (cached && cached.data) {
          state.stale = true;
          state.savedAt = cached.savedAt;
          renderGrid(cached.data);
          renderFooter();
        } else {
          renderError();
          renderFooter();
        }
      }
    });
    state.poller.start();
  }

  function init() {
    WC.espn.configureFromUrl();

    state.widgetApi.getConfiguration().then(function (widgetConfig) {
      state.cfg = WC.tablesConfig.parse(widgetConfig);

      buildLayout();
      renderHeader();
      WC.height.observe(container, state.widgetApi);
      WC.brand.apply(state.widgetApi, state.cfg.accentColor);

      var cached = WC.cache.get(CACHE_KEY);
      if (cached && cached.data) {
        state.savedAt = cached.savedAt;
        renderGrid(cached.data);
      } else {
        renderSkeleton();
      }
      renderFooter();
      startPoller();

      if (typeof state.widgetApi.onReady === 'function') state.widgetApi.onReady().catch(function () {});
    }).catch(function (err) {
      console.error('[WC Tables] init failed:', err);
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
      console.error('[WC Tables] Widget API failed to load:', err);
      if (container) {
        container.classList.remove('loading');
        WC.dom.clear(container);
        container.appendChild(el('div', { class: 'wc-error', text: 'Widget failed to load. Please refresh.' }));
      }
    });
  }
})();
