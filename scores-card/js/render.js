/* render.js — builds the card DOM from a view model. Registers WC.cardRender.
 * Layout (hero size, columns vs stack, compact) is handled by CSS media/orientation
 * queries; this module only decides WHAT goes in the hero vs the secondary strip.
 *
 *   LIVE  → hero = the focused live match (big); secondary = Up next + Recent.
 *   TODAY/NEXT → hero = today's/next matchday's upcoming fixtures; secondary = Recent. */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});
  var el = WC.dom.el;

  function teamName(t) { return (t && (t.shortName || t.name)) || 'TBD'; }

  // Crest sized by CSS (rem) per context — mirrors wc-teams.badge but no inline px.
  function crest(team, ctxClass) {
    var wrap = el('span', { class: 'wc-badge ' + (ctxClass || ''), aria: { label: teamName(team) } });
    if (team.isTbd) { wrap.classList.add('is-tbd'); wrap.textContent = team.abbr || '–'; return wrap; }
    if (team.logo) {
      var img = el('img', { attrs: { src: team.logo, alt: '', loading: 'lazy' } });
      img.addEventListener('error', function () { WC.dom.clear(wrap); wrap.textContent = WC.teams.initials(team); });
      wrap.appendChild(img);
    } else {
      wrap.textContent = WC.teams.initials(team);
    }
    return wrap;
  }

  function goalsFor(match, teamId) {
    return (match.events || []).filter(function (e) { return e.kind === 'goal' && e.teamId === teamId; });
  }
  function scorerText(g) {
    var suffix = [];
    if (g.minute) suffix.push(g.minute);
    if (g.penalty) suffix.push('pen');
    if (g.ownGoal) suffix.push('OG');
    return (g.player || 'Goal') + (suffix.length ? ' ' + suffix.join(' ') : '');
  }
  function scorerList(match, teamId, alignClass) {
    var list = el('ul', 'hl-scorers ' + (alignClass || ''));
    goalsFor(match, teamId).forEach(function (g) {
      list.appendChild(el('li', { text: scorerText(g) }));
    });
    return list;
  }

  // --- Hero: live match ---------------------------------------------------
  function liveHero(m) {
    var hero = el('div', 'hero-live');

    var row = el('div', 'hl-row');
    var home = el('div', 'hl-side is-home');
    home.appendChild(crest(m.home, 'crest-hero'));
    home.appendChild(el('div', { class: 'hl-name', text: teamName(m.home) }));
    var center = el('div', 'hl-center');
    center.appendChild(el('div', { class: 'hl-score', text: (m.home.score || '0') + ' – ' + (m.away.score || '0') }));
    center.appendChild(el('div', { class: 'hl-clock', text: (m.clock || m.statusDetail || 'LIVE') }));
    var away = el('div', 'hl-side is-away');
    away.appendChild(crest(m.away, 'crest-hero'));
    away.appendChild(el('div', { class: 'hl-name', text: teamName(m.away) }));
    row.appendChild(home); row.appendChild(center); row.appendChild(away);
    hero.appendChild(row);

    var scorers = el('div', 'hl-scorers-row');
    scorers.appendChild(scorerList(m, m.home.id, 'align-left'));
    scorers.appendChild(scorerList(m, m.away.id, 'align-right'));
    hero.appendChild(scorers);

    var meta = [m.groupNote, m.venue && m.venue.name].filter(Boolean).join(' · ');
    if (meta) hero.appendChild(el('div', { class: 'hl-meta', text: meta }));
    return hero;
  }

  // --- Hero: upcoming fixtures (no live) ----------------------------------
  function fixtureCard(m, featured) {
    var card = el('div', 'fx-card' + (featured ? ' is-featured' : ''));
    card.appendChild(el('div', { class: 'fx-time', text: WC.dom.fmtKickoff(m.dateUtc) }));
    var teams = el('div', 'fx-teams');
    [m.home, m.away].forEach(function (t, i) {
      var line = el('div', 'fx-team');
      line.appendChild(crest(t, 'crest-fx'));
      line.appendChild(el('span', { class: 'fx-team-name', text: teamName(t) }));
      teams.appendChild(line);
      if (i === 0) teams.appendChild(el('div', { class: 'fx-v', text: 'v' }));
    });
    card.appendChild(teams);
    if (m.groupNote) card.appendChild(el('div', { class: 'fx-group', text: m.groupNote }));
    return card;
  }

  function fixturesHero(view) {
    var hero = el('div', 'hero-fixtures');
    if (!view.upcoming.length) {
      hero.appendChild(el('div', { class: 'card-empty', text: 'No upcoming matches' }));
      return hero;
    }
    var grid = el('div', 'fx-grid');
    view.upcoming.slice(0, 6).forEach(function (m, i) { grid.appendChild(fixtureCard(m, i === 0)); });
    hero.appendChild(grid);
    return hero;
  }

  // --- Secondary rows -----------------------------------------------------
  function fixtureRow(m) {
    var row = el('div', 'sx-row');
    row.appendChild(el('span', { class: 'sx-time', text: WC.dom.fmtKickoff(m.dateUtc) }));
    var t = el('span', 'sx-teams');
    t.appendChild(crest(m.home, 'crest-sx'));
    t.appendChild(el('span', { class: 'sx-abbr', text: m.home.abbr || teamName(m.home) }));
    t.appendChild(el('span', { class: 'sx-v', text: 'v' }));
    t.appendChild(crest(m.away, 'crest-sx'));
    t.appendChild(el('span', { class: 'sx-abbr', text: m.away.abbr || teamName(m.away) }));
    row.appendChild(t);
    return row;
  }
  function resultRow(m) {
    var row = el('div', 'sx-row is-result');
    var t = el('span', 'sx-teams');
    t.appendChild(crest(m.home, 'crest-sx'));
    t.appendChild(el('span', { class: 'sx-abbr' + (m.home.winner ? ' is-win' : ''), text: m.home.abbr || teamName(m.home) }));
    t.appendChild(el('span', { class: 'sx-score', text: (m.home.score || '0') + '–' + (m.away.score || '0') }));
    t.appendChild(el('span', { class: 'sx-abbr' + (m.away.winner ? ' is-win' : ''), text: m.away.abbr || teamName(m.away) }));
    row.appendChild(t);
    return row;
  }

  function col(title, rows, emptyText) {
    var c = el('div', 'card-col');
    c.appendChild(el('div', { class: 'col-title', text: title }));
    if (!rows.length) {
      c.appendChild(el('div', { class: 'card-empty', text: emptyText }));
    } else {
      var body = el('div', 'col-body');
      rows.forEach(function (r) { body.appendChild(r); });
      c.appendChild(body);
    }
    return c;
  }

  // --- Head / foot --------------------------------------------------------
  function head(view, cfg) {
    var h = el('div', 'card-head');
    h.appendChild(el('div', { class: 'card-title', text: (cfg && cfg.title) || 'World Cup' }));
    var label = el('div', 'card-label');
    if (view.mode === 'live') {
      label.classList.add('is-live');
      label.appendChild(el('span', 'live-dot'));
      label.appendChild(el('span', { text: view.live.length > 1 ? view.live.length + ' LIVE' : 'LIVE' }));
    } else {
      label.appendChild(el('span', { text: view.dayLabel }));
    }
    h.appendChild(label);
    return h;
  }

  function foot(meta) {
    meta = meta || {};
    if (!meta.savedAt) return null;
    var f = el('div', 'card-foot' + (meta.stale ? ' is-stale' : ''));
    f.textContent = (meta.stale ? 'Offline · ' : '') + WC.dom.relTime(meta.savedAt);
    return f;
  }

  // --- Top-level render ---------------------------------------------------
  function render(root, view, cfg, meta) {
    root.classList.remove('is-loading');
    ['state-live', 'state-today', 'state-next'].forEach(function (c) { root.classList.remove(c); });
    root.classList.add('state-' + view.mode);
    WC.dom.clear(root);

    root.appendChild(head(view, cfg));

    var hero = el('div', 'card-hero');
    if (view.mode === 'live' && view.focus) hero.appendChild(liveHero(view.focus));
    else hero.appendChild(fixturesHero(view));
    root.appendChild(hero);

    var sec = el('div', 'card-secondary');
    if (view.mode === 'live') {
      sec.appendChild(col('Up next', view.upcoming.slice(0, 5).map(fixtureRow), 'No more today'));
      sec.appendChild(col('Recent', view.recent.slice(0, 5).map(resultRow), 'No results yet'));
    } else if (view.recent.length) {
      sec.appendChild(col('Recent results', view.recent.slice(0, 6).map(resultRow), ''));
    }
    if (sec.childNodes.length) root.appendChild(sec);

    var f = foot(meta);
    if (f) root.appendChild(f);
  }

  WC.cardRender = { render: render };
})();
