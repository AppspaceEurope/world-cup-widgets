/* wc-height.js — reports content height to the Console. Registers WC.height.
 * ResizeObserver + MutationObserver, debounced, deduped. The observed container
 * must NOT have height:100% or it will lock to the iframe size. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  function observe(container, widgetApi) {
    if (!container) return function () {};
    var lastHeight = 0;
    var debounceTimer;

    function report() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        var height = container.scrollHeight;
        if (height > 0 && height !== lastHeight) {
          lastHeight = height;
          if (widgetApi && typeof widgetApi.setHeight === 'function') {
            widgetApi.setHeight(height).catch(function (err) {
              console.error('[WC] setHeight failed:', err);
            });
          }
        }
      }, 100);
    }

    var ro = new ResizeObserver(report);
    ro.observe(container);
    var mo = new MutationObserver(report);
    mo.observe(container, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['style', 'class']
    });
    report();

    return function disconnect() {
      clearTimeout(debounceTimer);
      ro.disconnect();
      mo.disconnect();
    };
  }

  WC.height = { observe: observe };
})();
