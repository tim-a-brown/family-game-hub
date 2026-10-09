'use strict';
// History views: Lorcana (the game, and the lore counter)
(function () {
  if (!window.HistView) return;
  var INKS = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];
  var INKC = { Amber: '#f2b01e', Amethyst: '#8a4bb0', Emerald: '#2e9a4c', Ruby: '#d0213f', Sapphire: '#1679c0', Steel: '#9aa8b4' };
  var LCP = 'https://cards.lorcast.io/', BACKUP = 'https://firebasestorage.googleapis.com/v0/b/familygames-da3e5.firebasestorage.app/o/';
  // the ink symbols cut from the cards (games/lorcana-inks.webp, one per ink in INKS order)
  var base = (function () { try { var s = document.querySelector('script[src*="hist-view.js"]'); return new URL('games/', s.src).href; } catch (e) { return ''; } })();
  function inkIco(k) { var i = INKS.indexOf(k); return i < 0 ? '' : '<i class="hv-ink" role="img" aria-label="' + k + '" title="' + k + '" style="background-image:url(' + base + 'lorcana-inks.webp);background-position:' + (i * 20) + '% 0"></i>'; }

  HistView.css('hv-lorc', [
    '.hv-lp{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:16px;background:linear-gradient(160deg,rgba(232,193,106,.10),rgba(255,255,255,.03));box-shadow:inset 0 0 0 1px rgba(232,193,106,.22);}',
    '.hv-lp-h{display:flex;align-items:center;gap:10px;}',
    '.hv-lp-h .grow{flex:1;min-width:0;}',
    '.hv-lp-h b{display:block;font-weight:900;font-size:1.02rem;}',
    '.hv-lp-dk{display:flex;align-items:center;gap:6px;color:var(--text-2);font-weight:800;font-size:.86rem;}',
    '.hv-lp-dk span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.hv-ink{display:inline-block;flex:none;width:17px;height:19px;background:0 0/600% 100% no-repeat;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.55));}',
    '.hv-lp-board{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}',
    '.hv-lc{position:relative;flex:none;width:52px;height:72px;border-radius:5px;overflow:hidden;background:var(--lc,#444);box-shadow:0 2px 6px rgba(0,0,0,.45);transition:transform .2s;}',
    '.hv-lc img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.hv-lc span{position:absolute;inset:0;display:flex;align-items:flex-end;padding:3px;font-size:.5rem;font-weight:800;line-height:1.1;color:#fff;text-shadow:0 1px 2px #000;}',
    '.hv-lc.x{transform:rotate(90deg) scale(.86);margin:0 10px;}',
    '.hv-lc.l{width:72px;height:52px;}',
    '.hv-lp-note{font-size:.78rem;color:var(--text-3);font-weight:700;}'
  ].join(''));

  function cardTile(c, ui, ink) {
    var src = c.i ? (/^https?:/.test(c.i) ? c.i : LCP + c.i) : '';
    var t = ui.el('span', { class: 'hv-lc' + (c.x ? ' x' : '') + (c.t === 'l' ? ' l' : ''), title: c.n + (c.x ? ' (exerted)' : ''), style: { '--lc': INKC[ink] || '#555' } });
    function nameOnly() { t.innerHTML = ''; t.appendChild(ui.el('span', { text: c.n })); }
    if (!src) { nameOnly(); return t; }
    var img = ui.el('img', { src: src, alt: c.n, loading: 'lazy' }), tried = false;
    // the card art host is down or offline: try the backup copy, then just the name
    img.addEventListener('error', function () {
      if (!tried && src.indexOf(LCP) === 0) { tried = true; try { img.src = BACKUP + encodeURIComponent('lorcana/' + new URL(src).pathname.slice(1)) + '?alt=media'; return; } catch (e) {} }
      nameOnly();
    });
    t.appendChild(img);
    return t;
  }

  function kindName(k) { return k === 'quick' ? 'Quick deck' : k === 'saved' ? 'Saved deck' : k === 'random' ? 'Random deck' : ''; }

  HistView.register(['lorcana-play'], play);
  function play(e, ui) {
    var d = e.dt; if (!d || !d.p) return null;
    var players = e.players || [], out = [];
    var decks = ui.el('div', { class: 'hv', style: { gap: '10px' } });
    d.p.forEach(function (p, i) {
      var pl = players[i] || {}, won = e.winner && pl.name === e.winner;
      var head = ui.el('div', { class: 'hv-lp-h' }, [
        ui.who(pl.name || 'Player ' + (i + 1), i),
        ui.el('div', { class: 'grow' }),
        won ? ui.el('span', { class: 'hv-chip on', style: { '--cc': '#e8c16a' }, text: 'Winner' }) : null
      ]);
      var dk = ui.el('div', { class: 'hv-lp-dk', html: (p.k || []).map(inkIco).join('') + '<span>' + ui.esc(p.d || 'Deck') + '</span>' + (kindName(p.kd) ? '<small style="color:var(--text-3)">· ' + kindName(p.kd) + '</small>' : '') });
      var box = ui.el('div', { class: 'hv-lp' }, [head, dk]);
      if (p.b && p.b.length) {
        var board = ui.el('div', { class: 'hv-lp-board' });
        p.b.forEach(function (c, j) { board.appendChild(cardTile(c, ui, (p.k || [])[j % Math.max(1, (p.k || []).length)])); });
        box.appendChild(ui.el('div', { class: 'hv-lp-note', text: 'In play at the end' }));
        box.appendChild(board);
      } else box.appendChild(ui.el('div', { class: 'hv-lp-note', text: 'Nothing in play at the end' }));
      box.appendChild(ui.stats([['Lore quested', p.ql], ['Quests', p.q], ['Cards played', p.pl], ['Inked', p.ink], ['Banished', p.ban], ['Lost', p.lost]]));
      var notes = [];
      if (p.big && p.big.l >= 2) notes.push('Biggest quest: ' + p.big.n + ' for ' + p.big.l + ' lore');
      if (p.so && p.so.length) notes.push('Sang ' + p.so.join(', '));
      if (p.sh && p.sh.length) notes.push('Shifted ' + p.sh.join(', '));
      if (p.loc >= 2) notes.push(p.loc + ' lore from locations');
      if (notes.length) box.appendChild(ui.log(notes));
      decks.appendChild(box);
    });
    out.push(ui.section('Decks', decks, { icon: 'cards' }));
    var first = players[d.first] ? players[d.first].name : '';
    out.push(ui.facts([['Turns', d.turns], ['Went first', first], ['Won by', d.how === 'deck' ? 'Opponent ran out of cards' : 'Reaching 20 lore']]));
    return ui.wrap(out);
  }

  // The lore counter (games/lorcana.html): each player's ink colour
  HistView.register('lorcana', function (e, ui) {
    if (e.dt && e.dt.p) return play(e, ui);   // a game from the Lorcana table, saved under the same game
    var inks = e.inks; if (!Array.isArray(inks) || !inks.length) return null;
    var players = e.players || [];
    var rows = players.map(function (p, i) { var k = String(inks[i] || ''), nm = k.charAt(0).toUpperCase() + k.slice(1); return ui.el('div', { class: 'hv-lp-dk', html: inkIco(nm) + '<span>' + ui.esc(p.name) + ' · ' + ui.esc(nm) + '</span>' }); });
    return ui.wrap([ui.section('Inks', ui.el('div', { class: 'hv', style: { gap: '6px' } }, rows)), ui.facts([['Turns', e.turns], ['Played to', e.target ? e.target + ' lore' : '']])]);
  });
})();
