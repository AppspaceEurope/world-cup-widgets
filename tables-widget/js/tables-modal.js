/* tables-modal.js — team detail panel (previous results + upcoming fixtures).
 * Registers WC.tablesModal. Uses the shared WC.modal shell. Flat — no nested
 * match detail. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});
  var el = WC.dom.el;

  // Opponent-centric row, relative to the focused team. The schedule feed does
  // not carry an inline score, so past games show a W/D/L result, not a scoreline.
  function matchRow(m, teamId) {
    var isHome = m.home.id === teamId;
    var focused = isHome ? m.home : m.away;
    var opp = isHome ? m.away : m.home;
    var row = el('div', 'wc-tm-row');

    var line = el('div', 'wc-tm-teams');
    if (m.state === 'post') {
      var result = (!m.home.winner && !m.away.winner) ? 'D' : (focused.winner ? 'W' : 'L');
      line.appendChild(el('span', { class: 'wc-tm-result is-' + result.toLowerCase(), text: result }));
    } else {
      line.appendChild(el('span', { class: 'wc-tm-time', text: WC.dom.fmtKickoff(m.dateUtc) }));
    }
    line.appendChild(el('span', { class: 'wc-tm-vs', text: isHome ? 'v' : '@' }));
    var oppCell = el('span', 'wc-tm-team');
    oppCell.appendChild(WC.teams.badge(opp, 16));
    oppCell.appendChild(el('span', { text: ' ' + (opp.shortName || opp.name) }));
    line.appendChild(oppCell);
    row.appendChild(line);

    var meta = el('div', 'wc-tm-meta');
    meta.textContent = WC.dom.fmtDayLabel(m.dateUtc) + (m.groupNote ? ' · ' + m.groupNote : '');
    row.appendChild(meta);
    return row;
  }

  function section(title, matches, emptyText, teamId) {
    var wrap = el('div', 'wc-tm-section');
    wrap.appendChild(el('div', { class: 'wc-tm-section-title', text: title }));
    if (!matches.length) {
      wrap.appendChild(el('div', { class: 'wc-empty', text: emptyText }));
    } else {
      matches.forEach(function (m) { wrap.appendChild(matchRow(m, teamId)); });
    }
    return wrap;
  }

  function buildPanel(team, close) {
    var panel = el('div', 'wc-modal-panel');
    var head = el('div', 'wc-tm-head');
    head.appendChild(WC.teams.badge(team, 40));
    head.appendChild(el('div', { class: 'wc-tm-name', text: team.name }));
    panel.appendChild(head);

    var body = el('div', 'wc-tm-body');
    body.appendChild(el('div', { class: 'wc-tm-loading', text: 'Loading matches…' }));
    panel.appendChild(body);

    panel.appendChild(el('button', { class: 'wc-modal-close', text: 'Close', on: { click: close } }));
    panel._body = body;
    return panel;
  }

  function open(team, cfg, widgetApi) {
    var handle = WC.modal.open({
      build: function (close) { return buildPanel(team, close); },
      widgetApi: widgetApi
    });

    if (widgetApi && typeof widgetApi.raiseAnalyticsEvent === 'function') {
      widgetApi.raiseAnalyticsEvent('teamDetailOpened', { teamId: team.id, team: team.name }).catch(function () {});
    }

    var body = handle.panel._body;
    WC.espn.fetchTeamSchedule(team.id).then(function (data) {
      WC.dom.clear(body);
      body.appendChild(section('Recent results', data.past, 'No results yet.', team.id));
      body.appendChild(section('Upcoming fixtures', data.future, 'No upcoming fixtures.', team.id));
    }).catch(function () {
      WC.dom.clear(body);
      body.appendChild(el('div', { class: 'wc-error', text: 'Could not load matches.' }));
    });
  }

  WC.tablesModal = { open: open, close: function () { WC.modal.close(); } };
})();
