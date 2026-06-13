/* wc-poller.js — fast/slow polling engine. Registers WC.poller.
 * Picks the next interval from the just-fetched data, pauses when the tab is
 * hidden, and jitters ±10% so a fleet of devices doesn't hammer ESPN in lockstep. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  function create(opts) {
    var fetchFn = opts.fetchFn;          // () => Promise<data>
    var isFastFn = opts.isFastFn || function () { return false; };
    var fastMs = opts.fastMs || 60000;
    var slowMs = opts.slowMs || 600000;
    var onData = opts.onData || function () {};
    var onError = opts.onError || function () {};

    var timer = null;
    var stopped = false;
    var inFlight = false;

    function jitter(ms) {
      var spread = ms * 0.1;
      // deterministic-ish jitter without Math.random (varies by time)
      var f = (Date.now() % 1000) / 1000; // 0..1
      return Math.round(ms - spread + f * spread * 2);
    }

    function schedule(ms) {
      clearTimeout(timer);
      if (stopped) return;
      timer = setTimeout(tick, jitter(ms));
    }

    function tick() {
      if (stopped || inFlight) return;
      if (document.hidden) { schedule(slowMs); return; }
      inFlight = true;
      Promise.resolve(fetchFn()).then(function (data) {
        inFlight = false;
        if (stopped) return;
        onData(data);
        schedule(isFastFn(data) ? fastMs : slowMs);
      }).catch(function (err) {
        inFlight = false;
        if (stopped) return;
        onError(err);
        schedule(slowMs); // back off on error
      });
    }

    function onVisible() {
      if (!stopped && !document.hidden) refreshNow();
    }
    document.addEventListener('visibilitychange', onVisible);

    function start() { stopped = false; tick(); }
    function stop() {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    }
    function refreshNow() { clearTimeout(timer); tick(); }

    return { start: start, stop: stop, refreshNow: refreshNow };
  }

  WC.poller = { create: create };
})();
