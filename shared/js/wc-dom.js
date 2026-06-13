/* wc-dom.js — DOM + formatting helpers. Registers WC.dom.
 * Data is always set via textContent (never innerHTML) — XSS-safe with feed strings. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  function el(tag, opts, children) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (typeof opts === 'string') {
      node.className = opts;
    } else {
      if (opts.class) node.className = opts.class;
      if (opts.text != null) node.textContent = String(opts.text);
      if (opts.title) node.title = opts.title;
      if (opts.role) node.setAttribute('role', opts.role);
      if (opts.tabindex != null) node.setAttribute('tabindex', String(opts.tabindex));
      if (opts.aria) {
        Object.keys(opts.aria).forEach(function (k) {
          node.setAttribute('aria-' + k, String(opts.aria[k]));
        });
      }
      if (opts.attrs) {
        Object.keys(opts.attrs).forEach(function (k) {
          node.setAttribute(k, String(opts.attrs[k]));
        });
      }
      if (opts.style) node.setAttribute('style', opts.style);
      if (opts.on) {
        Object.keys(opts.on).forEach(function (evt) {
          node.addEventListener(evt, opts.on[evt]);
        });
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  // Kick-off time in the viewer's local timezone, e.g. "20:00"
  function fmtKickoff(iso) {
    try {
      return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch (e) { return ''; }
  }

  // "Today" / "Tomorrow" / "Sat 14 Jun" relative to local now.
  function fmtDayLabel(date) {
    var d = new Date(date);
    var now = new Date();
    var startOf = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var diffDays = Math.round((startOf(d) - startOf(now)) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    try {
      return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
    } catch (e) { return d.toDateString(); }
  }

  // Short chip label: "Today" / "Sat 14"
  function fmtChip(date) {
    var d = new Date(date);
    var now = new Date();
    var startOf = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var diffDays = Math.round((startOf(d) - startOf(now)) / 86400000);
    if (diffDays === 0) return 'Today';
    try {
      return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(d);
    } catch (e) { return d.toDateString(); }
  }

  // "Updated 14:02" or "Updated 3 min ago"
  function relTime(ts) {
    if (!ts) return '';
    var mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return 'Updated just now';
    if (mins < 60) return 'Updated ' + mins + ' min ago';
    try {
      return 'Updated ' + new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
    } catch (e) { return ''; }
  }

  // yyyymmdd for the ESPN ?dates= param, based on local date + offset days.
  function ymdOffset(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
  }

  WC.dom = {
    el: el,
    clear: clear,
    fmtKickoff: fmtKickoff,
    fmtDayLabel: fmtDayLabel,
    fmtChip: fmtChip,
    relTime: relTime,
    ymdOffset: ymdOffset
  };
})();
