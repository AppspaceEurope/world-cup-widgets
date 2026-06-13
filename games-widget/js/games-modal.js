/* games-modal.js — match-detail view. Registers WC.gamesModal.
 * Primary: host modal via setViewMode('modalLarge'). Fallback: inline overlay
 * inside the widget iframe when setViewMode is unavailable or rejects. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});
  var el = WC.dom.el;

  var current = null; // { backdrop, widgetApi, usedHostModal }

  function timeline(match) {
    var list = el('div', 'wc-timeline');
    var evts = (match.events || []).slice();
    if (!evts.length) {
      list.appendChild(el('div', { class: 'wc-empty', text: 'No events yet.' }));
      return list;
    }
    evts.forEach(function (e) {
      var isHome = e.teamId === match.home.id;
      var row = el('div', 'wc-tl-row ' + (isHome ? 'is-home' : 'is-away'));
      var icon = e.kind === 'goal' ? '⚽'
        : e.card === 'red' ? '🟥' : '🟨';
      var bits = [e.player || (e.kind === 'goal' ? 'Goal' : 'Card')];
      var tags = [];
      if (e.penalty) tags.push('pen');
      if (e.ownGoal) tags.push('OG');
      var name = bits[0] + (tags.length ? ' (' + tags.join(', ') + ')' : '');

      var min = el('span', { class: 'wc-tl-min', text: e.minute || '' });
      var ic = el('span', { class: 'wc-tl-icon', text: icon });
      var who = el('span', { class: 'wc-tl-who', text: name });

      // Home events read left→right, away events mirror right→left for clarity.
      if (isHome) { row.appendChild(min); row.appendChild(ic); row.appendChild(who); }
      else { row.appendChild(who); row.appendChild(ic); row.appendChild(min); }
      list.appendChild(row);
    });
    return list;
  }

  function buildPanel(match, cfg, onClose) {
    var panel = el('div', 'wc-modal-panel');

    var head = el('div', 'wc-modal-head');
    if (match.groupNote) head.appendChild(el('div', { class: 'wc-group', text: match.groupNote }));

    var score = el('div', 'wc-modal-score');
    var homeBox = el('div', 'wc-modal-team');
    homeBox.appendChild(WC.teams.badge(match.home, 44));
    homeBox.appendChild(el('div', { class: 'wc-modal-team-name', text: match.home.name }));
    var mid = el('div', 'wc-modal-mid');
    if (match.state === 'pre') {
      mid.appendChild(el('div', { class: 'wc-modal-vs', text: WC.dom.fmtKickoff(match.dateUtc) }));
      mid.appendChild(el('div', { class: 'wc-modal-status', text: WC.dom.fmtDayLabel(match.dateUtc) }));
    } else {
      var sc = match.home.score + ' – ' + match.away.score;
      mid.appendChild(el('div', { class: 'wc-modal-vs', text: sc }));
      var statusText = match.state === 'in' ? (match.clock || 'Live') : (match.statusDetail || 'Full Time');
      if ((match.home.shootout || match.away.shootout)) {
        statusText += ' · pens ' + match.home.shootout + '–' + match.away.shootout;
      }
      mid.appendChild(el('div', { class: 'wc-modal-status' + (match.state === 'in' ? ' is-live' : ''), text: statusText }));
    }
    var awayBox = el('div', 'wc-modal-team');
    awayBox.appendChild(WC.teams.badge(match.away, 44));
    awayBox.appendChild(el('div', { class: 'wc-modal-team-name', text: match.away.name }));
    score.appendChild(homeBox); score.appendChild(mid); score.appendChild(awayBox);
    head.appendChild(score);
    panel.appendChild(head);

    panel.appendChild(timeline(match));

    if (cfg.showVenue && match.venue && match.venue.name) {
      var v = [match.venue.name, match.venue.city, match.venue.country].filter(Boolean).join(', ');
      panel.appendChild(el('div', { class: 'wc-modal-venue', text: v }));
    }

    var closeBtn = el('button', {
      class: 'wc-modal-close', text: 'Close', on: { click: onClose }
    });
    panel.appendChild(closeBtn);
    return panel;
  }

  function close() {
    if (!current) return;
    var c = current;
    current = null;
    if (c.backdrop && c.backdrop.parentNode) c.backdrop.parentNode.removeChild(c.backdrop);
    if (c.usedHostModal && c.widgetApi && typeof c.widgetApi.setViewMode === 'function') {
      c.widgetApi.setViewMode('default').catch(function () {});
    }
    document.removeEventListener('keydown', onKey);
  }

  function onKey(ev) { if (ev.key === 'Escape') close(); }

  function open(match, cfg, widgetApi) {
    close(); // ensure single instance

    var backdrop = el('div', 'wc-modal-backdrop');
    var panel = buildPanel(match, cfg, close);
    backdrop.appendChild(panel);
    // Clicking the dim area closes the inline fallback (host modal manages its own backdrop).
    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) close(); });
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey);

    var usedHostModal = false;
    if (widgetApi && typeof widgetApi.setViewMode === 'function') {
      usedHostModal = true;
      backdrop.classList.add('is-host-modal'); // host draws the dim; we go full-bleed
      widgetApi.setViewMode('modalLarge').catch(function () {
        // Host rejected — fall back to inline overlay styling.
        backdrop.classList.remove('is-host-modal');
        if (current) current.usedHostModal = false;
      });
    }

    current = { backdrop: backdrop, widgetApi: widgetApi, usedHostModal: usedHostModal };

    // Analytics (best-effort).
    if (widgetApi && typeof widgetApi.raiseAnalyticsEvent === 'function') {
      widgetApi.raiseAnalyticsEvent('matchDetailOpened', {
        matchId: match.id, home: match.home.name, away: match.away.name, status: match.state
      }).catch(function () {});
    }

    var first = panel.querySelector('.wc-modal-close');
    if (first) first.focus();
  }

  WC.gamesModal = { open: open, close: close };
})();
