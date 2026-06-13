/* mock-sdk.js — LOCAL DEV ONLY. Never packaged into the widget .zip.
 *
 * The dev-server injects this into widget.html so the widget can run standalone
 * in a browser/preview without the real Appspace Console or the widget-tester.
 * It self-guards: if a real Console is present (?consoleUrl=) or a real widgetApi
 * already exists, it does nothing.
 *
 * Dev URL params it understands:
 *   ?mock=group-stage|live|knockout-tbd|empty|shootout  (consumed by espn-adapter)
 *   ?cfg=<urlencoded-json>   override getConfiguration() values, e.g. {"daysAhead":3}
 *   ?viewmode=1              expose setViewMode (tests host-modal path; default off → inline modal)
 *   ?brand=ok|fail|none      brand API: ok=returns palette, fail=rejects, none=no method (default none)
 */
(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);

  // Real Console present — stand down.
  if (params.get('consoleUrl') || (window.appspace && window.appspace.widgetApi)) return;

  var appspace = window.appspace = window.appspace || {};

  function resolved(v) { return Promise.resolve(v); }

  // Build a getConfiguration() payload from ?cfg= overrides.
  var overrides = {};
  try { if (params.get('cfg')) overrides = JSON.parse(params.get('cfg')); } catch (e) { overrides = {}; }
  var configuration = {};
  Object.keys(overrides).forEach(function (k) { configuration[k] = { value: overrides[k] }; });

  var api = {
    getInfo: function () { return { version: 'mock-dev', libraryUrl: 'mock' }; },
    getConfiguration: function () {
      return resolved({ data: { configuration: configuration } });
    },
    getUserInfo: function () {
      return resolved({ displayName: 'Dev User', email: 'dev@example.com', language: 'en' });
    },
    setHeight: function () { return resolved(true); },
    onReady: function () { return resolved(true); },
    onLoading: function () { return resolved(true); },
    onLoaded: function () { return resolved(true); },
    onError: function () { return resolved(true); },
    raiseAnalyticsEvent: function (name, meta) {
      console.log('[mock-sdk] analytics:', name, meta);
      return resolved(true);
    },
    navigate: function (url, target) { window.open(url, target || '_blank'); return resolved(true); },
    callAppspaceAPI: function (name) {
      var mode = params.get('brand') || 'none';
      if (name === 'getBrandProfiles') {
        if (mode === 'fail') return Promise.reject(new Error('mock brand failure'));
        if (mode === 'ok') {
          return resolved({
            status: 200, statusText: 'OK',
            data: [{
              isDefault: true,
              colorPalette: {
                primaryColor: '#7c3aed', darkColor: '#4c1d95',
                paleColor: '#f3e8ff', secondaryColor: '#a78bfa'
              }
            }]
          });
        }
      }
      return resolved({ status: 404, statusText: 'Not Found', data: null });
    }
  };

  // setViewMode only when ?viewmode=1 — lets us test both modal paths.
  if (params.get('viewmode') === '1') {
    api.setViewMode = function (mode) { console.log('[mock-sdk] setViewMode:', mode); return resolved(true); };
  }

  appspace.widgetApi = api;
  // Dispatch on next tick so listeners registered by the bootstrap are ready.
  setTimeout(function () {
    window.dispatchEvent(new Event('appspace:widgetapi:ready'));
  }, 0);
})();
