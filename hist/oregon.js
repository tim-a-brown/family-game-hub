'use strict';
// History view: The Oregon Trail
// A trip reads like the game's own black screen: how it ended (Oregon and the points, or where it stopped), the
// party with a small tombstone and epitaph for each who died, then the route taken.
(function () {
  if (!window.HistView) return;

  HistView.css('hv-oregon', [
    '@font-face{font-family:"Jersey 10";src:url("/fonts/jersey-10.woff2") format("woff2");font-display:swap;}',
    '.or-scr{border-radius:14px;padding:12px 14px;background:#000;color:#fff;font:400 1.25rem/1.1 "Jersey 10",ui-monospace,monospace;display:flex;flex-direction:column;gap:10px;',
    'box-shadow:inset 0 0 0 2px #555,0 8px 20px -10px rgba(0,0,0,.8);}',
    '.or-top{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap;}',
    '.or-ttl{font-size:1.05rem;color:#aaa;letter-spacing:.06em;text-transform:uppercase;}',
    '.or-big{font-size:2.3rem;line-height:1;color:#ffff55;}',
    '.or-big.dead{color:#ff5555;font-size:1.7rem;}',
    '.or-rate{border:2px solid #ffff55;color:#ffff55;padding:2px 8px 3px;white-space:nowrap;}',
    '.or-party{display:flex;flex-wrap:wrap;gap:8px;}',
    '.or-p{flex:1 1 120px;min-width:110px;border:2px solid #555;padding:5px 8px;display:flex;flex-direction:column;gap:2px;}',
    '.or-p.ok b{color:#55ff55;font-weight:400;}',
    '.or-p.rip{border-color:#333;align-items:center;text-align:center;background:linear-gradient(#2a2a2a,#151515);}',
    '.or-p.rip i{display:block;width:30px;height:34px;border-radius:15px 15px 2px 2px;background:#aaa;box-shadow:inset -5px 0 0 #777;margin-bottom:2px;}',
    '.or-p b{font-weight:400;font-size:1.3rem;}',
    '.or-p small{color:#aaa;font-size:1.02rem;}',
    '.or-p em{font-style:normal;color:#ddd;font-size:1.05rem;}',
    '.or-route{display:flex;flex-wrap:wrap;gap:2px 0;color:#aaa;font-size:1.05rem;}',
    '.or-route span::after{content:" \\203A ";color:#555;padding:0 3px;}',
    '.or-route span:last-child::after{content:"";}',
    '.or-route span:last-child{color:#ffff55;}',
    '.or-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 10px;}',
    '.or-facts div{display:flex;flex-direction:column;}',
    '.or-facts b{font-weight:400;font-size:1.35rem;color:#fff;}',
    '.or-facts small{color:#888;font-size:.95rem;text-transform:uppercase;letter-spacing:.06em;}'
  ].join(''));

  var OCC = { banker: 'Banker from Boston', carpenter: 'Carpenter from Ohio', farmer: 'Farmer from Illinois' };
  function cause(c) { return c === 'drowning' ? 'Drowned' : c === 'starvation' ? 'Starved' : 'Died of ' + c; }

  HistView.register('oregon', function (e, ui) {
    var d = e.dt; if (!d || !d.p) return null;
    var el = ui.el, n = function (v) { return (Number(v) || 0).toLocaleString('en-US'); };
    var scr = el('div', { class: 'or-scr' });
    var top = el('div', { class: 'or-top' });
    var left = el('div');
    left.appendChild(el('div', { class: 'or-ttl', text: d.a ? 'Reached Oregon · ' + d.en : 'The journey ended · ' + d.en }));
    left.appendChild(el('div', { class: 'or-big' + (d.a ? '' : ' dead'), text: d.a ? n(d.s) + ' points' : 'Near ' + (d.w || 'the trail') + ', ' + n(d.mi) + ' miles' }));
    top.appendChild(left);
    if (d.a && d.r) top.appendChild(el('div', { class: 'or-rate', text: d.r }));
    scr.appendChild(top);
    var party = el('div', { class: 'or-party' });
    d.p.forEach(function (p, i) {
      if (p.a) party.appendChild(el('div', { class: 'or-p ok' }, [el('b', { text: p.n }), el('small', { text: (i === 0 ? 'Wagon leader · ' : '') + (d.a ? 'made it, ' + (d.h || 'good') + ' health' : 'still on the trail') })]));
      else party.appendChild(el('div', { class: 'or-p rip' }, [el('i'), el('b', { text: p.n }), el('small', { text: cause(p.c) + (p.at ? ' near ' + p.at : '') }), p.e ? el('em', { text: '"' + p.e + '"' }) : null]));
    });
    scr.appendChild(party);
    var facts = el('div', { class: 'or-facts' });
    [[d.dy + ' days', 'On the trail'], [n(d.mi), 'Miles'], [OCC[d.o] || '', 'Occupation'], ['$' + n(d.c), 'Cash left'], [n(d.f) + ' lb', 'Food left'], [d.hu ? n(d.hu) + ' lb' : 'none', 'Hunted']].forEach(function (f) {
      facts.appendChild(el('div', null, [el('b', { text: f[0] }), el('small', { text: f[1] })]));
    });
    scr.appendChild(facts);
    if (d.route) { var r = el('div', { class: 'or-route' }); String(d.route).split('|').forEach(function (s) { r.appendChild(el('span', { text: s })); }); scr.appendChild(r); }
    return scr;
  });
})();
