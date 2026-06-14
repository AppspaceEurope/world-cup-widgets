/* wc-modal.js — generic modal shell shared by Games + Tables. Registers WC.modal.
 * Primary: host modal via setViewMode(<viewport-appropriate mode>). Fallback:
 * inline overlay inside the widget iframe when setViewMode is unavailable/rejects.
 *
 * WC.modal.open({ build, widgetApi }) — build(close) returns the panel node and
 *   wires its own close control via the passed close fn. Single instance.
 * WC.modal.close() */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});
  var el = WC.dom.el;

  var current = null; // { backdrop, widgetApi, usedHostModal }

  function onKey(ev) { if (ev.key === 'Escape') close(); }

  // The host gives each modal mode a FIXED width (modalLarge ≈ 800px) with no
  // viewport cap, so a wide mode overflows a phone. Pick the mode that fits the
  // current viewport: full-screen on phones, a mid modal on small windows, the
  // large modal only when there's room for it.
  function pickViewMode() {
    var w = window.innerWidth || document.documentElement.clientWidth || 800;
    if (w < 600) return 'modalFullScreen'; // phones — fills 100vw × 100vh
    if (w < 840) return 'modal';           // tablets / narrow windows — 560px
    return 'modalLarge';                   // 800px
  }

  function close() {
    if (!current) return;
    var c = current;
    current = null;
    if (c.backdrop && c.backdrop.parentNode) c.backdrop.parentNode.removeChild(c.backdrop);
    // Restore the widget's normal content (hidden while the modal was open).
    if (c.root) c.root.style.display = c.rootDisplay;
    if (c.usedHostModal && c.widgetApi && typeof c.widgetApi.setViewMode === 'function') {
      c.widgetApi.setViewMode('default').catch(function () {});
    }
    document.removeEventListener('keydown', onKey);
  }

  function open(opts) {
    opts = opts || {};
    var widgetApi = opts.widgetApi;
    close(); // ensure single instance

    var backdrop = el('div', 'wc-modal-backdrop');
    var panel = opts.build ? opts.build(close) : el('div', 'wc-modal-panel');
    backdrop.appendChild(panel);
    // Clicking the dim area closes the inline fallback (host modal manages its own backdrop).
    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) close(); });
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey);

    // The host modal (setViewMode) expands the whole iframe, so the widget's
    // own content would otherwise show above/around the modal panel. Hide it
    // for the host-modal path only (the inline fallback already dims it with a
    // fixed overlay, and hiding it there could collapse the iframe height).
    var root = document.getElementById('widget-container');
    var rootDisplay = root ? root.style.display : '';

    var usedHostModal = false;
    if (widgetApi && typeof widgetApi.setViewMode === 'function') {
      usedHostModal = true;
      backdrop.classList.add('is-host-modal'); // host draws the dim; we go full-bleed
      if (root) root.style.display = 'none';
      widgetApi.setViewMode(pickViewMode()).catch(function () {
        backdrop.classList.remove('is-host-modal');
        if (root) root.style.display = rootDisplay; // host rejected — fall back to inline
        if (current) current.usedHostModal = false;
      });
    }

    current = { backdrop: backdrop, widgetApi: widgetApi, usedHostModal: usedHostModal, root: root, rootDisplay: rootDisplay };

    var first = panel.querySelector('.wc-modal-close');
    if (first) first.focus();
    return { panel: panel, close: close };
  }

  WC.modal = { open: open, close: close };
})();
