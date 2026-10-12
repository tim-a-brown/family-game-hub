'use strict';
// ── Casino coach: the "best move" chip and the plain-language breakdown sheet ─────────────────
// Shared by the casino games' "Strategy help" option (Blackjack has its own, older copy).
//
//   Coach.option(o)            setup option {id:'coach'} for Kit.setup; o = {label, on, off, help, value}
//   Coach.chip(html, onTap)    small button for the table: e.g. Coach.chip('Best move: <b>Hold 3</b>', open)
//   Coach.sheet({              opens the breakdown
//     title,                     sheet title
//     best: {label, value, text} the recommendation card (label = small caps line, value = the move, text = why)
//     intro,                     a plain sentence above the moves
//     moves: [{name, w, p, l, value, valueText, note, best, bar:false}]   w/p/l = win/tie/lose chances (0..1)
//     sections: [{title, text | items:[html] | node}]
//   })
//   Coach.pct(x) '42%' · Coach.cash(x) '−$1.20' · Coach.esc(s)
var Coach = window.Coach = (function () {
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent = [
      '.cch-chip{border:0;cursor:pointer;padding:3px 10px;border-radius:999px;background:rgba(20,16,10,.55);box-shadow:inset 0 0 0 1px rgba(255,216,74,.55);color:#fff;font:inherit;',
      'font-size:.78rem;font-weight:800;white-space:nowrap;-webkit-tap-highlight-color:transparent;animation:cch-in .25s ease;display:inline-flex;align-items:center;gap:5px;}',
      '.cch-chip b{color:#ffd84a;}.cch-chip .ico{width:13px;height:13px;opacity:.75;}.cch-chip:active{transform:scale(.96);}',
      '.cch-chip:focus:not(:focus-visible){outline:none;}',
      '@keyframes cch-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}',
      '.cch{display:flex;flex-direction:column;gap:14px;}',
      '.cch-best{border-radius:16px;padding:12px 14px;background:color-mix(in srgb,var(--green) 16%,transparent);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--green) 55%,transparent);}',
      '.cch-best small{display:block;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);}',
      '.cch-best b{display:block;font-size:1.45rem;font-weight:900;margin:2px 0 4px;}',
      '.cch-best p{margin:0;font-size:.92rem;line-height:1.4;color:var(--text-2);}',
      '.cch h4{margin:4px 0 0;font-size:.74rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);}',
      '.cch p.plain{margin:0;font-size:.92rem;line-height:1.45;color:var(--text-2);}',
      '.cch-mv{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:var(--w05);}',
      '.cch-mv.top{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--green) 60%,transparent);}',
      '.cch-mv .r1{display:flex;align-items:baseline;gap:8px;}.cch-mv .r1 b{font-size:1.02rem;font-weight:900;min-width:0;}',
      '.cch-mv .r1 .tag{font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:999px;background:color-mix(in srgb,var(--green) 22%,transparent);color:var(--text);flex:none;}',
      '.cch-mv .r1 .ev{margin-left:auto;font-weight:900;font-variant-numeric:tabular-nums;white-space:nowrap;}',
      '.cch-mv .r1 .ev.up{color:var(--green);}.cch-mv .r1 .ev.dn{color:var(--red);}.cch-mv .r1 .ev.nt{color:var(--text-2);}',
      '.cch-bar{display:flex;height:10px;border-radius:999px;overflow:hidden;background:var(--w08);}',
      '.cch-bar i{display:block;height:100%;}.cch-bar .w{background:#3ddc84;}.cch-bar .p{background:#a9b0c4;}.cch-bar .l{background:#ff6b78;}',
      '.cch-mv .r3{display:flex;gap:12px;flex-wrap:wrap;font-size:.78rem;font-weight:800;color:var(--text-2);font-variant-numeric:tabular-nums;}',
      '.cch-mv .r3 span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;}',
      '.cch-mv .r3 .w::before{background:#3ddc84;}.cch-mv .r3 .p::before{background:#a9b0c4;}.cch-mv .r3 .l::before{background:#ff6b78;}',
      '.cch-mv .note{font-size:.8rem;color:var(--text-3);line-height:1.35;}',
      '.cch ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:.92rem;line-height:1.45;color:var(--text-2);}',
      '.cch ul b{color:var(--text);}'
    ].join('');
    document.head.appendChild(s);
  }
  function el(t, a, kids) { return Kit.el(t, a, kids); }
  function esc(s) { return Kit.esc(String(s == null ? '' : s)); }
  function pct(x) { x = Math.max(0, Math.min(1, +x || 0)); return (x > 0 && x < .005 ? '<1' : Math.round(x * 100)) + '%'; }
  function cash(x) { var a = Math.abs(x); return (x < -0.005 ? '−' : x > 0.005 ? '+' : '') + '$' + (a >= 100 ? Math.round(a).toLocaleString('en-US') : a.toFixed(2)); }
  function option(o) {
    o = o || {};
    return { id: 'coach', label: o.label || 'Strategy help', help: o.help || 'Shows the best move as you play. Tap it for the odds behind it, explained in plain words.',
      value: o.value || 'off', choices: [['off', 'Off', o.off || 'No help: you play on your own.'], ['on', 'On', o.on || 'A “best move” tag on the table; tap it for every option’s odds.']] };
  }
  function chip(html, onTap) {
    css();
    return el('button', { type: 'button', class: 'cch-chip', html: html + Kit.icon('right'), onclick: function (e) { e.stopPropagation(); Kit.sfx('tap'); onTap(); } });
  }
  function moveRow(m) {
    var bar = m.bar !== false && m.w != null;
    var w = Math.max(0, m.w || 0), p = Math.max(0, m.p || 0), l = Math.max(0, m.l || 0), s = w + p + l || 1;
    var cls = m.value == null ? 'nt' : m.value >= 0.005 ? 'up' : m.value <= -0.005 ? 'dn' : 'nt';
    return el('div', { class: 'cch-mv' + (m.best ? ' top' : '') }, [
      el('div', { class: 'r1' }, [el('b', { text: m.name }), m.best ? el('span', { class: 'tag', text: 'Best' }) : null,
        m.valueText != null || m.value != null ? el('span', { class: 'ev ' + cls, text: m.valueText != null ? m.valueText : cash(m.value) }) : null]),
      bar ? el('div', { class: 'cch-bar' }, [el('i', { class: 'w', style: { width: (w / s * 100) + '%' } }), el('i', { class: 'p', style: { width: (p / s * 100) + '%' } }), el('i', { class: 'l', style: { width: (l / s * 100) + '%' } })]) : null,
      bar ? el('div', { class: 'r3' }, [el('span', { class: 'w', text: (m.wLabel || 'Win') + ' ' + pct(w) }), m.p != null ? el('span', { class: 'p', text: (m.pLabel || 'Tie') + ' ' + pct(p) }) : null, el('span', { class: 'l', text: (m.lLabel || 'Lose') + ' ' + pct(l) })]) : null,
      m.note ? el('div', { class: 'note', html: m.note }) : null
    ]);
  }
  function sheet(o) {
    css();
    var out = [];
    if (o.best) out.push(el('div', { class: 'cch-best' }, [o.best.label ? el('small', { text: o.best.label }) : null, el('b', { text: o.best.value }), o.best.text ? el('p', { html: o.best.text }) : null]));
    if (o.moves && o.moves.length) {
      out.push(el('h4', { text: o.movesTitle || 'Every option, compared' }));
      if (o.intro) out.push(el('p', { class: 'plain', html: o.intro }));
      o.moves.forEach(function (m) { out.push(moveRow(m)); });
    } else if (o.intro) out.push(el('p', { class: 'plain', html: o.intro }));
    (o.sections || []).forEach(function (sec) {
      if (!sec) return;
      if (sec.title) out.push(el('h4', { text: sec.title }));
      if (sec.text) out.push(el('p', { class: 'plain', html: sec.text }));
      if (sec.items) out.push(el('ul', null, sec.items.filter(Boolean).map(function (h) { return el('li', { html: h }); })));
      if (sec.node) out.push(sec.node);
    });
    Kit.sheet({ title: o.title || 'Your best move', node: el('div', { class: 'cch' }, out), actions: [{ label: 'Close', cls: 'btn-soft' }] });
  }
  return { option: option, chip: chip, sheet: sheet, pct: pct, cash: cash, esc: esc, css: css };
})();
