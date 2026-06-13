/* espn-adapter.js — the ONLY module that knows ESPN's response shapes.
 * Swap this file to change data feeds. Registers WC.espn.
 *
 * Normalised models (everything else in the widgets depends on these, not ESPN):
 *   Match = {
 *     id, dateUtc, state: 'pre'|'in'|'post', statusDetail, clock, isLive,
 *     groupNote, venue: { name, city, country },
 *     home/away: { id, name, shortName, abbr, logo, score, shootout, winner, isTbd },
 *     events: [{ kind:'goal'|'card', minute, teamId, player, ownGoal, penalty, card:'yellow'|'red' }]
 *   }
 *   Standings = { groups: [{ name, letter, entries: [{
 *       team:{id,name,abbr,logo}, rank, played, won, drawn, lost, gf, ga, gd, points, note, qualifies
 *   }] }] }
 */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});

  var SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
  var CORE = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world';

  var cfg = { mockName: null };

  // ?mock=group-stage drives the adapter from shared/mock/ instead of ESPN (dev only).
  function configureFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      cfg.mockName = params.get('mock');
    } catch (e) { cfg.mockName = null; }
    return cfg;
  }

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  // --- Scoreboard ---------------------------------------------------------

  function scoreboardUrl(yyyymmdd) {
    if (cfg.mockName) {
      // Map the URL date back to a fixture name where it makes sense.
      return 'shared/mock/scoreboard-' + cfg.mockName + '.json';
    }
    return SITE + '/scoreboard' + (yyyymmdd ? '?dates=' + yyyymmdd : '');
  }

  function isTbd(team) {
    return !(team && team.logo);
  }

  function teamLogo(team) {
    if (!team) return '';
    if (team.logo) return team.logo;
    if (team.logos && team.logos[0] && team.logos[0].href) return team.logos[0].href;
    return '';
  }

  function normalizeCompetitor(c) {
    var t = (c && c.team) || {};
    return {
      id: t.id || '',
      name: t.displayName || t.name || 'TBD',
      shortName: t.shortDisplayName || t.abbreviation || t.displayName || 'TBD',
      abbr: t.abbreviation || '',
      logo: teamLogo(t),
      score: c && c.score != null ? String(c.score) : '',
      shootout: c && c.shootoutScore != null ? String(c.shootoutScore) : '',
      winner: !!(c && c.winner),
      isTbd: isTbd(t)
    };
  }

  function normalizeEvents(details) {
    var out = [];
    (details || []).forEach(function (d) {
      try {
        var typeText = (d.type && d.type.text) || '';
        var minute = (d.clock && d.clock.displayValue) || '';
        var teamId = (d.team && d.team.id) || '';
        var who = (d.athletesInvolved && d.athletesInvolved[0] && d.athletesInvolved[0].displayName) || '';
        if (d.scoringPlay) {
          out.push({
            kind: 'goal', minute: minute, teamId: teamId, player: who,
            ownGoal: !!d.ownGoal, penalty: !!d.penaltyKick
          });
        } else if (/card/i.test(typeText)) {
          out.push({
            kind: 'card', minute: minute, teamId: teamId, player: who,
            card: /red/i.test(typeText) ? 'red' : 'yellow'
          });
        }
      } catch (e) { /* skip malformed detail */ }
    });
    return out;
  }

  function groupNoteFrom(altGameNote) {
    if (!altGameNote) return '';
    var m = /Group\s+([A-L])/i.exec(altGameNote);
    return m ? 'Group ' + m[1].toUpperCase() : '';
  }

  function normalizeMatch(ev) {
    try {
      var comp = (ev.competitions && ev.competitions[0]) || {};
      var status = ev.status || comp.status || {};
      var type = status.type || {};
      var state = type.state || 'pre'; // pre | in | post
      var competitors = comp.competitors || [];
      var homeC = competitors.filter(function (c) { return c.homeAway === 'home'; })[0] || competitors[0];
      var awayC = competitors.filter(function (c) { return c.homeAway === 'away'; })[0] || competitors[1];
      var home = normalizeCompetitor(homeC);
      var away = normalizeCompetitor(awayC);
      var venue = comp.venue || ev.venue || {};
      var addr = venue.address || {};
      return {
        id: ev.id || comp.id || '',
        dateUtc: ev.date || comp.date || '',
        state: state,
        statusDetail: type.shortDetail || type.description || '',
        clock: status.displayClock || '',
        isLive: state === 'in',
        groupNote: groupNoteFrom(comp.altGameNote),
        venue: { name: venue.fullName || '', city: addr.city || '', country: addr.country || '' },
        home: home,
        away: away,
        events: normalizeEvents(comp.details)
      };
    } catch (e) {
      return null; // a single bad match never breaks the day
    }
  }

  function fetchScoreboard(yyyymmdd) {
    return fetchJson(scoreboardUrl(yyyymmdd)).then(function (data) {
      var matches = (data.events || [])
        .map(normalizeMatch)
        .filter(Boolean)
        .sort(function (a, b) { return new Date(a.dateUtc) - new Date(b.dateUtc); });
      return { date: yyyymmdd || '', matches: matches };
    });
  }

  // --- Standings ----------------------------------------------------------

  function standingsUrl() {
    if (cfg.mockName) return 'shared/mock/standings.json';
    return CORE + '/standings';
  }

  function statByType(stats, type) {
    var s = (stats || []).filter(function (x) { return x.type === type; })[0];
    return s ? s.displayValue : '';
  }
  function numStat(stats, type) {
    var v = statByType(stats, type);
    var n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  }

  function normalizeEntry(en) {
    var t = en.team || {};
    var note = en.note || null;
    return {
      team: {
        id: t.id || '',
        name: t.displayName || t.name || 'TBD',
        abbr: t.abbreviation || '',
        logo: teamLogo(t)
      },
      rank: numStat(en.stats, 'rank'),
      played: numStat(en.stats, 'gamesplayed'),
      won: numStat(en.stats, 'wins'),
      drawn: numStat(en.stats, 'ties'),
      lost: numStat(en.stats, 'losses'),
      gf: numStat(en.stats, 'pointsfor'),
      ga: numStat(en.stats, 'pointsagainst'),
      gd: statByType(en.stats, 'pointdifferential') || '0',
      points: numStat(en.stats, 'points'),
      note: note ? (note.description || '') : '',
      qualifies: !!(note && note.rank && note.rank <= 2)
    };
  }

  function letterFromName(name) {
    var m = /Group\s+([A-L])/i.exec(name || '');
    return m ? m[1].toUpperCase() : (name || '');
  }

  function fetchStandings() {
    return fetchJson(standingsUrl()).then(function (data) {
      var groups = (data.children || []).map(function (g) {
        var entries = ((g.standings && g.standings.entries) || [])
          .map(normalizeEntry)
          .sort(function (a, b) { return (a.rank || 99) - (b.rank || 99); });
        return { name: g.name || '', letter: letterFromName(g.name), entries: entries };
      });
      return { groups: groups };
    });
  }

  WC.espn = {
    configureFromUrl: configureFromUrl,
    fetchScoreboard: fetchScoreboard,
    fetchStandings: fetchStandings,
    _config: cfg
  };
})();
