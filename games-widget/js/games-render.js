/* games-render.js — pure rendering for the Games widget. Registers WC.gamesRender.
 * Every function returns a DOM node; the orchestrator places it. textContent only. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});
  var el = WC.dom.el;

  // --- Loading skeleton ---
  function skeleton(rows) {
    var wrap = el('div', 'wc-skeleton');
    for (var i = 0; i < (rows || 3); i++) wrap.appendChild(el('div', 'wc-skel-row'));
    return wrap;
  }

  // --- Header: title + last-updated / stale badge ---
  function header(cfg, statusInfo) {
    var h = el('div', 'wc-header');
    h.appendChild(el('div', { class: 'wc-title', text: cfg.title || '' }));
    var s = el('div', { class: 'wc-status' + (statusInfo && statusInfo.stale ? ' is-stale' : '') });
    if (statusInfo && statusInfo.stale) {
      s.textContent = 'Offline. Showing cached scores';
    } else if (statusInfo && statusInfo.savedAt) {
      s.textContent = WC.dom.relTime(statusInfo.savedAt);
    }
    h.appendChild(s);
    if (!cfg.title && (!statusInfo || (!statusInfo.savedAt && !statusInfo.stale))) {
      h.style.display = 'none';
    }
    return h;
  }

  // --- Day pager: horizontally scrollable chips Today → +daysAhead ---
  function pager(state, onSelect) {
    var wrap = el('div', { class: 'wc-pager', role: 'tablist', aria: { label: 'Match days' } });
    for (var off = 0; off <= state.daysAhead; off++) {
      (function (offset) {
        var d = new Date();
        d.setDate(d.getDate() + offset);
        var chip = el('button', {
          class: 'wc-chip' + (offset === state.offset ? ' is-active' : ''),
          text: WC.dom.fmtChip(d),
          role: 'tab',
          aria: { selected: offset === state.offset ? 'true' : 'false' },
          on: { click: function () { onSelect(offset); } }
        });
        wrap.appendChild(chip);
      })(off);
    }
    return wrap;
  }

  // --- Goal-scorer summary line, clamped, with "+n more" → modal ---
  function scorersLine(match, max, onOpenDetail) {
    if (max <= 0) return null;
    var goals = (match.events || []).filter(function (e) { return e.kind === 'goal'; });
    if (!goals.length) return null;

    var line = el('div', 'wc-scorers');
    var shown = goals.slice(0, max);
    shown.forEach(function (g) {
      var isHome = g.teamId === match.home.id;
      var item = el('span', 'wc-scorer');
      item.appendChild(el('span', 'wc-scorer-dot ' + (isHome ? 'is-home' : 'is-away')));
      var label = g.player || 'Goal';
      var suffix = [];
      if (g.minute) suffix.push(g.minute);
      if (g.penalty) suffix.push('pen');
      if (g.ownGoal) suffix.push('OG');
      item.appendChild(el('span', { class: 'wc-scorer-name', text: label + (suffix.length ? ' ' + suffix.join(' ') : '') }));
      line.appendChild(item);
    });
    var extra = goals.length - shown.length;
    if (extra > 0) {
      line.appendChild(el('button', {
        class: 'wc-more wc-clickable',
        text: '+' + extra + ' more',
        on: { click: function () { onOpenDetail(match); } }
      }));
    }
    return line;
  }

  // --- One match card ---
  function teamRow(team, scoreText, opts) {
    opts = opts || {};
    var row = el('div', 'wc-team' + (opts.winner ? ' is-winner' : '') + (team.isTbd ? ' is-tbd' : ''));
    row.appendChild(WC.teams.badge(team, 26));
    row.appendChild(el('span', { class: 'wc-team-name', text: team.shortName || team.name }));
    var score = el('span', 'wc-score');
    score.textContent = scoreText;
    if (team.shootout) {
      score.appendChild(el('span', { class: 'wc-pens', text: ' (' + team.shootout + ')' }));
    }
    row.appendChild(score);
    return row;
  }

  function statusPill(match) {
    if (match.state === 'in') {
      return el('span', { class: 'wc-pill is-live', text: (match.clock || 'LIVE') });
    }
    if (match.state === 'post') {
      var label = /pen/i.test(match.statusDetail) ? 'FT (pens)'
        : /aet|extra/i.test(match.statusDetail) ? 'AET' : 'FT';
      return el('span', { class: 'wc-pill is-ft', text: label });
    }
    // pre — show local kickoff time
    return el('span', { class: 'wc-pill is-pre', text: WC.dom.fmtKickoff(match.dateUtc) });
  }

  function matchCard(match, cfg, onOpenDetail) {
    var pre = match.state === 'pre';
    var card = el('div', {
      class: 'wc-match wc-clickable',
      role: 'button',
      tabindex: 0,
      aria: { label: match.home.name + ' versus ' + match.away.name },
      on: {
        click: function () { onOpenDetail(match); },
        keydown: function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpenDetail(match); }
        }
      }
    });

    var meta = el('div', 'wc-match-meta');
    if (match.groupNote) meta.appendChild(el('span', { class: 'wc-group', text: match.groupNote }));
    meta.appendChild(statusPill(match));
    card.appendChild(meta);

    var teams = el('div', 'wc-teams');
    teams.appendChild(teamRow(match.home, pre ? '' : match.home.score, { winner: match.home.winner }));
    teams.appendChild(teamRow(match.away, pre ? '' : match.away.score, { winner: match.away.winner }));
    card.appendChild(teams);

    var scorers = scorersLine(match, cfg.maxScorersShown, onOpenDetail);
    if (scorers) card.appendChild(scorers);

    return card;
  }

  // --- Day content: list of cards, or empty state ---
  function day(dayData, cfg, onOpenDetail) {
    var wrap = el('div', 'wc-day');
    if (!dayData.matches || !dayData.matches.length) {
      wrap.appendChild(el('div', { class: 'wc-empty', text: 'No matches on ' + dayData.dateLabel + '.' }));
      return wrap;
    }
    dayData.matches.forEach(function (m) {
      wrap.appendChild(matchCard(m, cfg, onOpenDetail));
    });
    return wrap;
  }

  function errorState(onRetry) {
    var wrap = el('div', 'wc-error');
    wrap.appendChild(el('div', { text: 'Could not load matches.' }));
    wrap.appendChild(el('button', { class: 'wc-retry', text: 'Retry', on: { click: onRetry } }));
    return wrap;
  }

  WC.gamesRender = {
    skeleton: skeleton,
    header: header,
    pager: pager,
    day: day,
    matchCard: matchCard,
    errorState: errorState
  };
})();
