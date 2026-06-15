/* state.js — turns the ESPN scoreboard into the card's view model.
 * Registers WC.cardState.
 *
 * fetchView(): today's matches; if today has none, scans forward to the next
 *   matchday (so between match days the card shows "what's next").
 * classify(): splits into live / upcoming / recent and picks the content mode. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  var MAX_FORWARD_DAYS = 16; // tournament gaps are short; cap the look-ahead

  function fetchDay(offset) {
    return WC.espn.fetchScoreboard(WC.dom.ymdOffset(offset)).then(function (r) {
      return { offset: offset, matches: (r && r.matches) || [] };
    });
  }

  function scanForward(offset) {
    return fetchDay(offset).then(function (day) {
      if (day.matches.length || offset >= MAX_FORWARD_DAYS) return day;
      return scanForward(offset + 1);
    });
  }

  function fetchView() {
    return fetchDay(0).then(function (today) {
      if (today.matches.length) return today;
      return scanForward(1); // nothing today → next matchday
    });
  }

  function byDateAsc(a, b) { return new Date(a.dateUtc) - new Date(b.dateUtc); }
  function byDateDesc(a, b) { return new Date(b.dateUtc) - new Date(a.dateUtc); }

  function classify(day) {
    var matches = (day && day.matches) || [];
    var offset = (day && day.offset) || 0;

    var live = matches.filter(function (m) { return m.state === 'in'; });
    var upcoming = matches.filter(function (m) { return m.state === 'pre'; }).sort(byDateAsc);
    var recent = matches.filter(function (m) { return m.state === 'post'; }).sort(byDateDesc);

    var mode = live.length ? 'live' : (offset === 0 ? 'today' : 'next');
    var dayLabel;
    if (mode === 'live') dayLabel = 'Live';
    else if (mode === 'today') dayLabel = 'Today';
    else {
      var first = upcoming[0] || matches[0];
      dayLabel = 'Next up · ' + (first ? WC.dom.fmtDayLabel(new Date(first.dateUtc)) : 'soon');
    }

    return { mode: mode, dayLabel: dayLabel, live: live, upcoming: upcoming, recent: recent, offset: offset };
  }

  // Live-ish: a match in play, or a pre-match within 10 min of kick-off.
  function isFast(day) {
    var matches = (day && day.matches) || [];
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

  WC.cardState = { fetchView: fetchView, classify: classify, isFast: isFast };
})();
