/* wc-teams.js — team badge rendering. Registers WC.teams.
 * Logo <img> with graceful fallback to an initials disc; TBD teams get a
 * neutral dashed placeholder showing the seed code ("1C"). */
(function () {
  'use strict';
  var WC = (window.WC = window.WC || {});
  var el = WC.dom.el;

  function initials(team) {
    var src = team.abbr || team.shortName || team.name || '';
    return src.slice(0, 3).toUpperCase();
  }

  // size in px (square)
  function badge(team, size) {
    size = size || 28;
    var styleSize = 'width:' + size + 'px;height:' + size + 'px;';

    if (team.isTbd) {
      return el('span', {
        class: 'wc-badge is-tbd',
        style: styleSize,
        text: team.abbr || '–',
        title: team.name,
        aria: { label: team.name }
      });
    }

    var wrap = el('span', { class: 'wc-badge', style: styleSize, aria: { label: team.name } });
    if (team.logo) {
      var img = el('img', {
        attrs: { src: team.logo, alt: '', loading: 'lazy' }
      });
      img.addEventListener('error', function () {
        WC.dom.clear(wrap);
        wrap.textContent = initials(team);
      });
      wrap.appendChild(img);
    } else {
      wrap.textContent = initials(team);
    }
    return wrap;
  }

  WC.teams = { badge: badge, initials: initials };
})();
