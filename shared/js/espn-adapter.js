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

  // Scoreboard gives a plain score; the team-schedule endpoint gives a {$ref}
  // object instead — treat any non-primitive score as absent.
  function plainScore(s) {
    if (s == null) return '';
    if (typeof s === 'object') return (s.displayValue != null ? String(s.displayValue) : '');
    return String(s);
  }

  function normalizeCompetitor(c) {
    var t = (c && c.team) || {};
    return {
      id: t.id || '',
      name: t.displayName || t.name || 'TBD',
      shortName: t.shortDisplayName || t.abbreviation || t.displayName || 'TBD',
      abbr: t.abbreviation || '',
      logo: teamLogo(t),
      score: plainScore(c && c.score),
      shootout: plainScore(c && c.shootoutScore),
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

  // --- Team schedule (previous results + upcoming fixtures) ---------------
  // ESPN's /teams/{id}/schedule only returns a team's *played* games for the
  // World Cup, so it never shows upcoming fixtures. Instead pull a date-range
  // scoreboard covering the tournament window and filter for the team — that
  // carries both results and future fixtures.

  function ymd(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
  }

  function teamScheduleUrl() {
    if (cfg.mockName) return 'shared/mock/team-schedule.json';
    // Rolling window wide enough to cover the whole tournament from any vantage.
    return SITE + '/scoreboard?dates=' + ymd(-40) + '-' + ymd(50) + '&limit=400';
  }

  function fetchTeamSchedule(teamId) {
    var id = String(teamId);
    return fetchJson(teamScheduleUrl()).then(function (data) {
      var all = (data.events || []).map(normalizeMatch).filter(Boolean);
      var mine = all.filter(function (m) { return m.home.id === id || m.away.id === id; });
      var matches = mine.length ? mine : all; // mock fixtures use a fixed team
      var past = matches.filter(function (m) { return m.state === 'post'; })
        .sort(function (a, b) { return new Date(b.dateUtc) - new Date(a.dateUtc); }); // newest first
      var future = matches.filter(function (m) { return m.state !== 'post'; })
        .sort(function (a, b) { return new Date(a.dateUtc) - new Date(b.dateUtc); }); // soonest first
      return {
        team: { id: id, name: '', logo: '' },
        past: past,
        future: future
      };
    });
  }

  // --- Match summary (lineups / formation) --------------------------------

  function summaryUrl(eventId) {
    if (cfg.mockName) return 'shared/mock/match-summary.json';
    return SITE + '/summary?event=' + eventId;
  }

  function fetchMatchSummary(eventId) {
    return fetchJson(summaryUrl(eventId)).then(function (data) {
      var lineups = (data.rosters || []).map(function (r) {
        var players = (r.roster || []).map(function (p) {
          var a = p.athlete || {};
          return {
            name: a.displayName || a.shortName || a.lastName || '',
            pos: (p.position && p.position.abbreviation) || '',
            jersey: p.jersey != null ? String(p.jersey) : '',
            starter: !!p.starter
          };
        });
        return {
          teamId: (r.team && r.team.id) || '',
          name: (r.team && r.team.displayName) || '',
          formation: r.formation || '',
          starters: players.filter(function (x) { return x.starter; }),
          subs: players.filter(function (x) { return !x.starter; })
        };
      });
      return { lineups: lineups };
    }).catch(function () { return { lineups: [] }; });
  }

  WC.espn = {
    configureFromUrl: configureFromUrl,
    fetchScoreboard: fetchScoreboard,
    fetchStandings: fetchStandings,
    fetchTeamSchedule: fetchTeamSchedule,
    fetchMatchSummary: fetchMatchSummary,
    _config: cfg
  };
})();
