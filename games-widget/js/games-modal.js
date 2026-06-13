/* games-modal.js — match-detail view. Registers WC.gamesModal.
 * Primary: host modal via setViewMode('modalLarge'). Fallback: inline overlay
 * inside the widget iframe when setViewMode is unavailable or rejects. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});
  var el = WC.dom.el;

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

    // Lineups load asynchronously after open() — placeholder slot here.
    if (cfg.showLineups) panel.appendChild(el('div', 'wc-lineups-slot'));

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

  // --- Lineups (loaded async after open) ---
  function lineupColumn(lineup) {
    var col = el('div', 'wc-lineup-col');
    col.appendChild(el('div', { class: 'wc-lineup-team', text: lineup.name }));
    if (lineup.formation) col.appendChild(el('div', { class: 'wc-lineup-formation', text: lineup.formation }));
    function playerRow(p) {
      var r = el('div', 'wc-lineup-player');
      r.appendChild(el('span', { class: 'wc-lineup-jersey', text: p.jersey || '' }));
      r.appendChild(el('span', { class: 'wc-lineup-name', text: p.name }));
      if (p.pos) r.appendChild(el('span', { class: 'wc-lineup-pos', text: p.pos }));
      return r;
    }
    lineup.starters.forEach(function (p) { col.appendChild(playerRow(p)); });
    if (lineup.subs && lineup.subs.length) {
      col.appendChild(el('div', { class: 'wc-lineup-subs-label', text: 'Substitutes' }));
      lineup.subs.forEach(function (p) { col.appendChild(playerRow(p)); });
    }
    return col;
  }

  function renderLineups(slot, match, summary) {
    WC.dom.clear(slot);
    var lineups = (summary && summary.lineups) || [];
    if (!lineups.length || !lineups.some(function (l) { return l.starters && l.starters.length; })) {
      slot.appendChild(el('div', { class: 'wc-empty', text: 'Lineups not announced yet.' }));
      return;
    }
    slot.appendChild(el('div', { class: 'wc-lineups-title', text: 'Lineups' }));
    var grid = el('div', 'wc-lineups');
    var home = lineups.filter(function (l) { return l.teamId === match.home.id; })[0] || lineups[0];
    var away = lineups.filter(function (l) { return l.teamId === match.away.id; })[0] || lineups[1];
    if (home) grid.appendChild(lineupColumn(home));
    if (away) grid.appendChild(lineupColumn(away));
    slot.appendChild(grid);
  }

  function open(match, cfg, widgetApi) {
    var handle = WC.modal.open({
      build: function (close) { return buildPanel(match, cfg, close); },
      widgetApi: widgetApi
    });

    if (widgetApi && typeof widgetApi.raiseAnalyticsEvent === 'function') {
      widgetApi.raiseAnalyticsEvent('matchDetailOpened', {
        matchId: match.id, home: match.home.name, away: match.away.name, status: match.state
      }).catch(function () {});
    }

    // Lineups: load on demand into the placeholder slot.
    var slot = handle.panel.querySelector('.wc-lineups-slot');
    if (cfg.showLineups && slot && match.id && WC.espn.fetchMatchSummary) {
      slot.appendChild(el('div', { class: 'wc-lineups-loading', text: 'Loading lineups…' }));
      WC.espn.fetchMatchSummary(match.id).then(function (summary) {
        renderLineups(slot, match, summary);
      }).catch(function () {
        renderLineups(slot, match, { lineups: [] });
      });
    }
  }

  WC.gamesModal = { open: open, close: function () { WC.modal.close(); } };
})();
