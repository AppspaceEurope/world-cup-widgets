/* tables-render.js — group-standings rendering. Registers WC.tablesRender.
 * Responsive grid: 1 column (sidebar) → up to 3 columns (wide). textContent only. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});
  var el = WC.dom.el;

  function skeleton(n) {
    var wrap = el('div', 'wc-skeleton');
    for (var i = 0; i < (n || 4); i++) wrap.appendChild(el('div', { class: 'wc-skel-row', style: 'height:120px;' }));
    return wrap;
  }

  function header(cfg) {
    var h = el('div', 'wc-header');
    h.appendChild(el('div', { class: 'wc-title', text: cfg.title || '' }));
    if (!cfg.title) h.style.display = 'none';
    return h;
  }

  // Footer status bar: last-updated / stale. Returns null if nothing to show.
  function statusBar(statusInfo) {
    if (!statusInfo || (!statusInfo.savedAt && !statusInfo.stale)) return null;
    var s = el('div', { class: 'wc-statusbar' + (statusInfo.stale ? ' is-stale' : '') });
    s.textContent = statusInfo.stale
      ? 'Offline. Showing cached tables'
      : WC.dom.relTime(statusInfo.savedAt);
    return s;
  }

  function teamCell(team) {
    var cell = el('div', 'wc-std-team');
    cell.appendChild(WC.teams.badge(team, 20));
    cell.appendChild(el('span', { class: 'wc-std-name', text: team.name }));
    return cell;
  }

  function groupTable(group) {
    var card = el('div', 'wc-group-card');
    card.appendChild(el('div', { class: 'wc-group-title', text: group.name }));

    var table = el('div', { class: 'wc-std', role: 'table', aria: { label: group.name + ' standings' } });

    // Header row
    var head = el('div', { class: 'wc-std-row wc-std-head', role: 'row' });
    head.appendChild(el('span', { class: 'wc-std-rank', text: '#' }));
    head.appendChild(el('span', { class: 'wc-std-team-h', text: 'Team' }));
    ['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].forEach(function (h) {
      head.appendChild(el('span', { class: 'wc-std-stat col-' + h.toLowerCase(), text: h }));
    });
    table.appendChild(head);

    group.entries.forEach(function (en) {
      var row = el('div', { class: 'wc-std-row' + (en.qualifies ? ' is-q' : ''), role: 'row' });
      row.appendChild(el('span', { class: 'wc-std-rank', text: en.rank || '' }));
      row.appendChild(teamCell(en.team));
      var stats = [
        ['p', en.played], ['w', en.won], ['d', en.drawn], ['l', en.lost],
        ['gf', en.gf], ['ga', en.ga], ['gd', en.gd], ['pts', en.points]
      ];
      stats.forEach(function (s) {
        row.appendChild(el('span', {
          class: 'wc-std-stat col-' + s[0] + (s[0] === 'pts' ? ' is-pts' : ''),
          text: String(s[1])
        }));
      });
      table.appendChild(row);
    });

    card.appendChild(table);
    return card;
  }

  function grid(groups, cfg) {
    var wrap = el('div', 'wc-grid');
    var wanted = cfg.groups && cfg.groups.length
      ? groups.filter(function (g) { return cfg.groups.indexOf(g.letter) !== -1; })
      : groups;
    if (!wanted.length) {
      wrap.appendChild(el('div', { class: 'wc-empty', text: 'No standings available yet.' }));
      return wrap;
    }
    wanted.forEach(function (g) { wrap.appendChild(groupTable(g)); });
    return wrap;
  }

  function errorState(onRetry) {
    var wrap = el('div', 'wc-error');
    wrap.appendChild(el('div', { text: 'Could not load standings.' }));
    wrap.appendChild(el('button', { class: 'wc-retry', text: 'Retry', on: { click: onRetry } }));
    return wrap;
  }

  WC.tablesRender = {
    skeleton: skeleton,
    header: header,
    statusBar: statusBar,
    grid: grid,
    errorState: errorState
  };
})();
