// casino.js — shared bankroll across all casino games
// Bankroll stored in localStorage under 'casino_bank'
// Usage: Casino.balance(), Casino.bet(n), Casino.win(n), Casino.reset()
//        Casino.history()            ledger entries, newest first
//        Casino.showHistory()        bankroll history sheet (needs kit.js)
//
// Bankroll history: every bet and payout is added to a running session for
// the current game. The session is written to the ledger (synced key
// 'gh_casino_ledger') when the page is hidden or closed, and resets are
// logged as their own entries, so the family can see wins, losses and
// top-ups over time.

const Casino = (function(){
  const KEY = 'casino_bank';
  const LEDGER = 'gh_casino_ledger';
  const DEFAULT = 1000;
  const MAX = 300;

  // A missing bankroll starts at $1,000; a real $0 stays $0 (not reset).
  function balance(){
    try{ var v = localStorage.getItem(KEY); if(v === null || v === '') return DEFAULT; var n = parseInt(v, 10); return isNaN(n) ? DEFAULT : Math.max(0, n); }
    catch(e){ return DEFAULT; }
  }
  function save(n){
    try{
      localStorage.setItem(KEY, Math.max(0, Math.round(n)));
      if(typeof FGHSync !== 'undefined') FGHSync.noteWrite('casino_bank');
    } catch(e){}
  }

  // ── Ledger ────────────────────────────────────────────────────────────────
  function history(){
    try{ var a = JSON.parse(localStorage.getItem(LEDGER)); return Array.isArray(a) ? a : []; }
    catch(e){ return []; }
  }
  function writeLedger(list){
    list.sort(function(a, b){ return (b._date || 0) - (a._date || 0); });
    if(list.length > MAX) list.length = MAX;
    try{
      localStorage.setItem(LEDGER, JSON.stringify(list));
      if(typeof FGHSync !== 'undefined') FGHSync.noteWrite(LEDGER);
    } catch(e){}
  }
  function gameInfo(){
    var file = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    var g = null;
    try{ if(typeof findGame === 'function') g = findGame(file); } catch(e){}
    return { id: g ? g.id : file, name: g ? g.name : (document.title || file).split(' · ')[0] };
  }
  var S = null;   // running session for this page
  function touch(){
    if(!S){ var gi = gameInfo(); S = { game: gi.id, name: gi.name, start: balance(), t0: Date.now(), wagered: 0, won: 0, bets: 0, best: 0 }; }
    return S;
  }
  // Casino pages watch the bankroll from the moment they load, so games that
  // write 'casino_bank' directly (blackjack, pai gow, three card poker) are
  // still logged by their net change.
  function isCasinoPage(){ try{ var g = typeof findGame === 'function' && findGame(gameInfo().id); return !!(g && g.cat === 'casino'); } catch(e){ return false; } }
  function flush(){
    var end = balance();
    if(!S || (!S.bets && !S.won && end === S.start)) { S = null; if(isCasinoPage()) touch(); return; }
    var e = { _date: Date.now(), kind: 'session', game: S.game, name: S.name, start: S.start, end: end,
      net: end - S.start, wagered: S.wagered, won: S.won, bets: S.bets, best: S.best, t0: S.t0 };
    var list = history(); list.push(e); writeLedger(list);
    S = null;
    if(isCasinoPage()) touch();
  }
  if(typeof window !== 'undefined'){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ if(!S && isCasinoPage()) touch(); });
    else if(isCasinoPage()) touch();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'hidden') flush(); });
  }

  function bet(n){
    const b = balance();
    if(n > b) return false;
    var s = touch(); s.wagered += n; s.bets++;
    save(b - n);
    return true;
  }
  function win(n){
    n = Math.round(n);
    var s = touch(); s.won += n; if(n > s.best) s.best = n;
    save(balance() + n);
  }
  function reset(){
    flush();
    var from = balance();
    save(DEFAULT);
    if(S) S.start = DEFAULT;
    var list = history(); list.push({ _date: Date.now(), kind: 'reset', from: from, end: DEFAULT, game: gameInfo().id }); writeLedger(list);
  }

  // ── History sheet ─────────────────────────────────────────────────────────
  function money(n){ return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString(); }
  function when(ts){
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function spark(list){
    // Balance after each entry, oldest to newest, ending at the current bankroll
    var pts = list.slice().reverse().map(function(e){ return e.end; }).filter(function(v){ return typeof v === 'number'; });
    pts.push(balance());
    if(pts.length < 2) return '';
    var W = 320, H = 80, lo = Math.min.apply(null, pts.concat([0])), hi = Math.max.apply(null, pts.concat([DEFAULT]));
    var sx = function(i){ return 4 + i * (W - 8) / (pts.length - 1); }, sy = function(v){ return H - 6 - (v - lo) * (H - 12) / ((hi - lo) || 1); };
    var d = pts.map(function(v, i){ return (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); }).join('');
    var base = sy(DEFAULT).toFixed(1);
    return '<svg class="cz-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" stroke="rgba(255,255,255,.18)" stroke-dasharray="4 4"/>' +
      '<path d="' + d + '" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + sx(pts.length - 1) + '" cy="' + sy(pts[pts.length - 1]) + '" r="4" fill="var(--green)"/></svg>';
  }
  function showHistory(){
    if(typeof Kit === 'undefined') return;
    flush();
    var list = history(), el = Kit.el, box = el('div', { class: 'cz-hist' });
    if(!document.getElementById('cz-hist-css')){
      var st = document.createElement('style'); st.id = 'cz-hist-css';
      st.textContent = '.cz-hist .cz-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px}' +
        '.cz-hist .cz-bal{font-family:var(--display);font-size:2rem;color:var(--green)}' +
        '.cz-hist .cz-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 14px}' +
        '.cz-hist .cz-sum div{background:rgba(255,255,255,.06);border-radius:12px;padding:8px 10px}' +
        '.cz-hist .cz-sum b{display:block;font-size:1.05rem}.cz-hist .cz-sum small{color:var(--text-3);font-weight:800;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em}' +
        '.cz-spark{display:block;width:100%;height:80px;margin:4px 0 6px}' +
        '.cz-row{display:flex;align-items:center;gap:10px;padding:10px 2px;border-top:1px solid var(--line)}' +
        '.cz-row .gicon{width:34px;height:34px;flex:none}.cz-row .tx{flex:1;min-width:0}.cz-row .t{font-weight:800}' +
        '.cz-row .d{font-size:.78rem;color:var(--text-3);font-weight:700}.cz-row .v{font-weight:900;font-variant-numeric:tabular-nums;text-align:right}' +
        '.cz-row .v small{display:block;font-size:.72rem;color:var(--text-3);font-weight:700}' +
        '.cz-up{color:var(--green)}.cz-down{color:var(--red)}.cz-reset{color:var(--yellow)}' +
        '.cz-rs{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:rgba(255,200,61,.15);color:var(--yellow);flex:none}';
      document.head.appendChild(st);
    }
    var sessions = list.filter(function(e){ return e.kind === 'session'; });
    var wins = sessions.filter(function(e){ return e.net > 0; }).length, losses = sessions.filter(function(e){ return e.net < 0; }).length;
    var resets = list.filter(function(e){ return e.kind === 'reset'; }).length;
    var net = sessions.reduce(function(a, e){ return a + (e.net || 0); }, 0);
    box.appendChild(el('div', { class: 'cz-top' }, [el('span', { class: 'muted', text: 'Bankroll now' }), el('span', { class: 'cz-bal', text: money(balance()) })]));
    if(list.length) box.appendChild(el('div', { html: spark(list) }));
    box.appendChild(el('div', { class: 'cz-sum' }, [
      el('div', null, [el('b', { class: net >= 0 ? 'cz-up' : 'cz-down', text: (net > 0 ? '+' : '') + money(net) }), el('small', { text: 'Net' })]),
      el('div', null, [el('b', { text: wins + ' / ' + losses }), el('small', { text: 'Up / down' })]),
      el('div', null, [el('b', { class: 'cz-reset', text: String(resets) }), el('small', { text: resets === 1 ? 'Reset' : 'Resets' })])
    ]));
    if(!list.length) box.appendChild(el('p', { class: 'muted', text: 'No casino sessions yet. Every game you play adds a line here.' }));
    list.forEach(function(e){
      if(e.kind === 'reset'){
        box.appendChild(el('div', { class: 'cz-row' }, [
          el('span', { class: 'cz-rs', html: Kit.icon('undo') }),
          el('span', { class: 'tx' }, [el('div', { class: 't', text: 'Bankroll reset' }), el('div', { class: 'd', text: when(e._date) })]),
          el('span', { class: 'v cz-reset' }, [el('span', { text: money(e.from) + ' → ' + money(e.end) })])
        ]));
        return;
      }
      var ic = (typeof GameIcon === 'function' && typeof findGame === 'function' && findGame(e.game)) ? GameIcon(e.game) : '';
      box.appendChild(el('div', { class: 'cz-row' }, [
        el('span', { html: ic, style: { display: 'contents' } }),
        el('span', { class: 'tx' }, [el('div', { class: 't', text: e.name || e.game }), el('div', { class: 'd', text: when(e._date) + (e.bets ? ' · ' + e.bets + (e.bets === 1 ? ' bet' : ' bets') : '') + (e.best ? ' · best payout ' + money(e.best) : '') })]),
        el('span', { class: 'v ' + (e.net > 0 ? 'cz-up' : e.net < 0 ? 'cz-down' : '') }, [el('span', { text: (e.net > 0 ? '+' : '') + money(e.net) }), el('small', { text: money(e.start) + ' → ' + money(e.end) })])
      ]));
    });
    Kit.sheet({ title: 'Bankroll history', node: box, actions: [{ label: 'Close', cls: 'btn-soft' }] });
  }

  return { balance, bet, win, reset, history, showHistory };
})();
