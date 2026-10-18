// casino.js — shared bankroll across all casino games
// Bankroll stored in localStorage under 'casino_bank'
// Usage: Casino.balance(), Casino.bet(n), Casino.win(n), Casino.reset()
//        Casino.applyRemote(delta, info)  bankroll change from a game at a linked player's table (sync.js)
//        Casino.history()            ledger entries, newest first
//        Casino.forPlayer(name)      who's playing: you play from the bankroll; anyone else (a guest at the table)
//                                    gets play money for the session and the bankroll isn't touched. Returns true
//                                    when it's your bankroll. Call it when a session starts and when one resumes.
//        Casino.isMain(name)         is this you (the name this device plays as, or the PIN's account name)
//        Casino.playMoney()          true while a guest is playing with play money

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

  // Play money: a guest playing on this device gets $1,000 that goes nowhere (kept on this device only, so a
  // reload carries on with it). The bankroll, its history and the link profile never see it.
  var PLAYK = 'casino_play', PLAY = null;
  function playSave(){ try{ if(PLAY) localStorage.setItem(PLAYK, JSON.stringify(PLAY)); else localStorage.removeItem(PLAYK); } catch(e){} }
  function meName(){
    var me = ''; try{ me = (localStorage.getItem('my_name') || '').trim(); } catch(e){}
    if(!me) try{ me = String((typeof FGHSync !== 'undefined' && FGHSync.label && FGHSync.label()) || '').trim(); } catch(e){}
    return me.toLowerCase();
  }
  // You, or nobody known (a device with no name set plays from the bankroll, as before)
  function isMain(name){ var me = meName(), k = String(name || '').trim().toLowerCase(); return !me || !k || k === me; }
  function forPlayer(name){
    if(isMain(name)){ if(PLAY){ PLAY = null; playSave(); } return true; }
    var k = String(name).trim(), old = null;
    try{ old = JSON.parse(localStorage.getItem(PLAYK)); } catch(e){}
    if(S && !PLAY) flush();
    PLAY = old && old.name === k && typeof old.bal === 'number' ? old : { name: k, bal: DEFAULT };
    playSave();
    return false;
  }

  // A missing bankroll starts at $1,000; a real $0 stays $0 (not reset).
  function balance(){
    if(PLAY) return Math.max(0, PLAY.bal);
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
    if(PLAY){ S = null; return; }
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
    if(PLAY){ PLAY.bal = b - n; playSave(); return true; }
    var s = touch(); s.wagered += n; s.bets++;
    save(b - n);
    return true;
  }
  function win(n){
    n = Math.round(n);
    if(PLAY){ PLAY.bal += n; playSave(); return; }
    var s = touch(); s.won += n; if(n > s.best) s.best = n;
    save(balance() + n);
  }
  // A bankroll change from a game you played at someone else's table (sent to you through your link profile;
  // sync.js calls this when it files the game). delta in dollars, info = {gid, game, name, table, rev}.
  // The bank and the history line are written by sync.js (the same code runs on pages without casino.js);
  // here the running session's start moves too, so this page's own session doesn't count it again.
  function applyRemote(delta, info){
    if(typeof FGHSync === 'undefined' || !FGHSync.bankRemote) return false;
    var before = balance(), ok = FGHSync.bankRemote(delta, info);
    if(ok && S) S.start += balance() - before;
    return ok;
  }

  function reset(){
    if(PLAY){ PLAY.bal = DEFAULT; playSave(); return; }
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
      // played from your bankroll at someone else's table (or taken back with "Not me")
      var tbl = e.table ? (Kit.poss ? Kit.poss(e.table) : e.table + "'s") + ' table' : '';
      var t = !e.table ? (e.name || e.game) : e.rev ? (e.name || e.game) + ' at ' + tbl + ': not me' : 'At ' + tbl + ': ' + (e.name || e.game);
      box.appendChild(el('div', { class: 'cz-row' }, [
        el('span', { html: ic, style: { display: 'contents' } }),
        el('span', { class: 'tx' }, [el('div', { class: 't', text: t }), el('div', { class: 'd', text: when(e._date) + (e.bets ? ' · ' + e.bets + (e.bets === 1 ? ' bet' : ' bets') : '') + (e.best ? ' · best payout ' + money(e.best) : '') })]),
        el('span', { class: 'v ' + (e.net > 0 ? 'cz-up' : e.net < 0 ? 'cz-down' : '') }, [el('span', { text: (e.net > 0 ? '+' : '') + money(e.net) }), el('small', { text: money(e.start) + ' → ' + money(e.end) })])
      ]));
    });
    Kit.sheet({ title: 'Bankroll history', node: box, actions: [{ label: 'Close', cls: 'btn-soft' }] });
  }

  // ── Chip rack: drag chips out of a tray onto betting spots ────────────────
  // Every casino table game bets the same way: press a chip in the rack, drag
  // it onto a spot, let go. The chip lifts and follows the finger (held above
  // it on touch so it isn't hidden under the thumb), the spot it would land on
  // lights up, and letting go off a spot sends it back to the rack. A plain
  // tap on a rack chip calls opts.tap (select it, or add it to the current bet).
  //
  //   var rack = Casino.rack({
  //     denoms: [1, 5, 25, 100, 500],     // rack slots, left to right
  //     value: 5,                         // selected denomination (tap-to-bet)
  //     table: el | fn,                   // what holds the spots (default hit test + drop zone)
  //     hit(x, y, v) -> id | null,        // optional: client point -> spot id (default: [data-spot] under it)
  //     ok(id, v) -> bool,                // optional: false shows the spot as closed (drop still asks drop())
  //     mark(id | null, v, ok),           // optional: custom highlight (default: .cz-tgt / .cz-no on the spot el)
  //     spotEl(id) -> el | [el],          // optional: element(s) to light for a spot
  //     drop(id, v) -> bool,              // place the chip with the game's own rules; truthy = placed
  //     tap(v),                           // tap on a rack chip (default: select it)
  //     can(v) -> bool,                   // slot enabled? (default: v <= bankroll)
  //     enabled() -> bool,                // betting open right now? (default true)
  //     over(id | null, v, kind),         // optional: the spot under the chip changed (for hint text)
  //     done(placed, kind),               // optional: drag finished
  //     // Optional: pick a bet already on the table back up (move it, or drag it off to take it back)
  //     pick(x, y, pointerType) -> {id, v} | null,  lift(id, on),  move(from, to, v) -> bool,  remove(from, v) -> bool
  //     ghost: px | fn(v) -> px            // size of the chip in hand (default 50)
  //   });
  //   rack.el          the tray element to put in the page
  //   rack.value(v?)   get / set the selected denomination
  //   rack.refresh()   re-check which slots are enabled (call after bankroll or bets change)
  //   rack.dragging()  true while a chip is in hand
  // Casino.chip(v, px) and Casino.stack(amount, px) draw the same chips.
  var CHIP_CSS = '' +
    '.cz-chip{--cs:44px;--c:#c8202f;--s:#fff;--k:#fff;position:relative;width:var(--cs);height:var(--cs);border-radius:50%;flex:none;box-sizing:border-box;' +
      '--fs:.34;display:grid;place-items:center;color:var(--k);font:900 calc(var(--cs) * var(--fs))/1 var(--font,system-ui);letter-spacing:-.03em;text-shadow:0 1px 1px rgba(0,0,0,.35);' +
      'background:radial-gradient(circle,rgba(255,255,255,.16) 0 28%,transparent 29%),radial-gradient(circle,var(--c) 0 46%,var(--s) 47% 50%,var(--c) 51% 63%,transparent 64%),' +
      'repeating-conic-gradient(from 8deg,var(--s) 0 16deg,var(--c) 16deg 45deg);' +
      'box-shadow:0 calc(var(--cs) * .07) 0 color-mix(in srgb,var(--c) 55%,#000),0 calc(var(--cs) * .1) calc(var(--cs) * .14) rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,0,0,.2);}' +
    '.cz-chip.l3{--fs:.29;}.cz-chip.l4{--fs:.25;}' +
    '.cz-chip[data-v="1"]{--c:#f1ece0;--s:#2f6bd8;--k:#1d2440;text-shadow:none;}' +
    '.cz-chip[data-v="5"]{--c:#c8202f;--s:#fff;}' +
    '.cz-chip[data-v="25"]{--c:#1d8a4b;--s:#fff;}' +
    '.cz-chip[data-v="100"]{--c:#1b1b22;--s:#e8e2d0;}' +
    '.cz-chip[data-v="500"]{--c:#6a3aa2;--s:#f3d34a;}' +
    '.cz-chip[data-v="1000"]{--c:#e9b630;--s:#7a4a10;--k:#3a2400;text-shadow:none;}' +
    '.cz-stk{position:relative;width:var(--cs);height:var(--cs);}' +
    '.cz-stk .cz-chip{position:absolute;left:0;}' +
    '.cz-stk .cz-chip:not(:last-child){font-size:0;}' +
    // The rack: a dark wooden tray with felt-lined wells, a short stack of chips in each
    '.cz-rack{--cs:clamp(42px,12.6vw,54px);display:flex;justify-content:center;align-items:flex-end;gap:clamp(4px,1.8vw,10px);padding:7px 8px 8px;border-radius:16px;box-sizing:border-box;' +
      'width:100%;max-width:calc(5 * var(--cs) + 160px);margin-left:auto;margin-right:auto;' +
      'touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;' +
      'background:repeating-linear-gradient(92deg,rgba(255,255,255,.035) 0 2px,transparent 2px 9px),linear-gradient(180deg,#3a2112,#24130a);' +
      'box-shadow:inset 0 3px 8px rgba(0,0,0,.65),inset 0 -1px 0 rgba(255,255,255,.07),0 1px 0 rgba(255,255,255,.14);}' +
    '.cz-slot{position:relative;flex:0 1 calc(var(--cs) + 14px);min-width:0;height:calc(var(--cs) + 20px);border:0;padding:0;margin:0;border-radius:12px;cursor:grab;touch-action:none;' +
      '-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;' +
      'background:radial-gradient(120% 90% at 50% 30%,var(--felt-b,#0d5c3c),var(--felt-c,#0a4a30));' +
      'box-shadow:inset 0 5px 9px rgba(0,0,0,.72),inset 0 -1px 0 rgba(255,255,255,.08);transition:filter .2s,opacity .2s;}' +
    '.cz-slot .cz-stk{position:absolute;left:50%;bottom:5px;margin-left:calc(var(--cs) / -2);transition:transform .22s var(--spring,ease);}' +
    '.cz-slot .cz-chip:nth-child(1){top:0;}.cz-slot .cz-chip:nth-child(2){top:-4px;}.cz-slot .cz-chip:nth-child(3){top:-8px;}' +
    '.cz-slot .cz-chip:last-child{font-size:calc(var(--cs) * var(--fs));}' +
    '.cz-slot.on .cz-stk{transform:translateY(-3px);}' +
    '.cz-slot.on .cz-chip:last-child{box-shadow:0 0 0 3px #ffd54a,0 0 14px rgba(255,213,74,.65),0 calc(var(--cs) * .1) calc(var(--cs) * .14) rgba(0,0,0,.45);}' +
    '.cz-slot.out .cz-chip:last-child{visibility:hidden;}' +
    '.cz-slot.out .cz-chip:nth-last-child(2){font-size:calc(var(--cs) * var(--fs));}' +
    '.cz-slot:disabled{cursor:default;filter:grayscale(.85) brightness(.55);}' +
    '.cz-slot:focus-visible{outline:3px solid #ffd54a;outline-offset:2px;}' +
    // The chip in hand
    '.cz-ghost{position:fixed;left:0;top:0;z-index:500;width:0;height:0;pointer-events:none;will-change:transform;}' +
    '.cz-ghost .cz-gin{position:absolute;left:0;top:0;transform:translate(-50%,-50%) scale(1);transition:transform .16s var(--spring,ease),opacity .16s,filter .16s;' +
      'filter:drop-shadow(0 2px 2px rgba(0,0,0,.45));}' +
    '.cz-ghost.up .cz-gin{transform:translate(-50%,-50%) scale(1.14);filter:drop-shadow(0 16px 12px rgba(0,0,0,.5));}' +
    '.cz-ghost.off .cz-gin{opacity:.55;}' +
    '.cz-ghost.home{transition:transform .26s cubic-bezier(.3,.7,.3,1);}' +
    '.cz-ghost.home .cz-gin{transform:translate(-50%,-50%) scale(1);filter:drop-shadow(0 2px 2px rgba(0,0,0,.45));}' +
    '.cz-ghost.land .cz-gin{transform:translate(-50%,-50%) scale(.8);opacity:0;transition-duration:.12s;}' +
    // Spot under the chip
    '.cz-tgt{box-shadow:0 0 0 3px #ffd54a,0 0 22px rgba(255,213,74,.7),inset 0 0 22px rgba(255,213,74,.35)!important;background-color:rgba(255,213,74,.12)!important;}' +
    '.cz-no{box-shadow:0 0 0 3px rgba(255,92,98,.85),inset 0 0 16px rgba(255,92,98,.3)!important;}' +
    'html.cz-dragging,html.cz-dragging *{cursor:grabbing!important;}' +
    // Short screens (phones on their side): a slimmer rack so more of the table shows
    '@media (max-height:520px){.cz-rack.cz-rack{--cs:36px;padding:4px 6px 5px;}.cz-slot{height:calc(var(--cs) + 14px);}.cz-slot .cz-stk{bottom:3px;}}';
  function css(){
    if(document.getElementById('cz-chip-css')) return;
    var st = document.createElement('style'); st.id = 'cz-chip-css'; st.textContent = CHIP_CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  function shortAmt(a){ return a >= 10000 ? Math.round(a / 1000) + 'k' : a >= 1000 ? (Math.round(a / 100) / 10) + 'k' : String(a); }
  function chip(v, px, label){
    css();
    var c = document.createElement('span'); c.className = 'cz-chip'; c.setAttribute('data-v', v);
    c.textContent = label != null ? label : shortAmt(v);
    if(c.textContent.length > 2) c.classList.add(c.textContent.length > 3 ? 'l4' : 'l3');
    if(px) c.style.setProperty('--cs', px + 'px');
    return c;
  }
  var DENOMS = [1000, 500, 100, 25, 5, 1];
  function stack(amount, px){
    var parts = [], a = Math.round(amount);
    DENOMS.forEach(function(d){ while(a >= d && parts.length < 12){ parts.push(d); a -= d; } });
    parts = parts.reverse(); if(parts.length > 5) parts = parts.slice(parts.length - 5);
    var s = document.createElement('div'); s.className = 'cz-stk'; px = px || 44;
    s.style.setProperty('--cs', px + 'px');
    parts.forEach(function(d, i){
      var c = chip(d, px, i === parts.length - 1 ? shortAmt(amount) : '');
      c.style.top = (-i * Math.max(2, px * 0.1)) + 'px'; s.appendChild(c);
    });
    return s;
  }

  // One chip in hand at a time, across every rack on the page
  var D = null, dragEndAt = 0, racks = [];
  function now(){ return Date.now(); }
  function tableEl(o){ return typeof o.table === 'function' ? o.table() : o.table; }
  // Default hit test: the [data-spot] under the point, inside the table. Anything
  // else on top of the table (the chip rail, a sheet, the game bar) blocks the drop.
  function defaultHit(o, x, y){
    var t = tableEl(o); if(!t || !document.elementsFromPoint) return null;
    var list = document.elementsFromPoint(x, y);
    for(var i = 0; i < list.length; i++){
      var e = list[i];
      if(t.contains(e)){ var s = e.closest('[data-spot]'); if(s && t.contains(s)) return s.getAttribute('data-spot'); continue; }
      if(e.contains(t)) continue;
      if(e.closest && e.closest('.cz-ghost')) continue;
      return null;
    }
    return null;
  }
  function spotEls(o, id){
    if(id == null) return [];
    if(o.spotEl){ var r = o.spotEl(id); return !r ? [] : r.length != null ? Array.prototype.slice.call(r) : [r]; }
    var t = tableEl(o); if(!t) return [];
    var q = t.querySelectorAll('[data-spot]'), out = [];
    for(var i = 0; i < q.length; i++) if(q[i].getAttribute('data-spot') === String(id)) out.push(q[i]);
    return out;
  }
  function mark(o, id, v, ok){
    if(o.mark) { o.mark(id, v, ok); return; }
    document.querySelectorAll('.cz-tgt,.cz-no').forEach(function(n){ n.classList.remove('cz-tgt'); n.classList.remove('cz-no'); });
    spotEls(o, id).forEach(function(n){ n.classList.add(ok ? 'cz-tgt' : 'cz-no'); });
  }
  function ghostSize(o, v){ var g = o.ghost; return typeof g === 'function' ? g(v) : g || 50; }

  function begin(e){
    var d = D;
    d.on = true;
    var o = d.o, size = ghostSize(o, d.v);
    d.oy = d.touch ? -Math.round(size * 0.55 + 26) : 0;
    var inner = document.createElement('div'); inner.className = 'cz-gin';
    inner.appendChild(stack(d.v, size));
    d.ghost = document.createElement('div'); d.ghost.className = 'cz-ghost'; d.ghost.appendChild(inner);
    document.body.appendChild(d.ghost);
    document.documentElement.classList.add('cz-dragging');
    if(d.kind === 'new' && d.slot) d.slot.classList.add('out');
    if(d.kind === 'move' && o.lift) o.lift(d.id, true);
    if(d.kind === 'new' && o.select !== false) setValue(d.rack, d.v);
    requestAnimationFrame(function(){ if(d.ghost) d.ghost.classList.add('up'); });
    try{ Kit.haptic('light'); Kit.sfx('tick', 0.35); } catch(err){}
    if(o.start) o.start(d.kind, d.v, d.id);
    // Scroll the page when the chip nears the top or bottom edge (tall tables on phones)
    d.trayTop = d.rect ? d.rect.top : window.innerHeight;
    d.raf = requestAnimationFrame(function tick(){ if(D !== d) return; autoScroll(d); d.raf = requestAnimationFrame(tick); });
  }
  function autoScroll(d){
    if(d.gy == null) return;
    var se = document.scrollingElement || document.documentElement;
    if(se.scrollHeight <= window.innerHeight + 2) return;
    // Near the top edge (under the game bar) the page scrolls up; over a bet it waits for the very edge,
    // so a bet that sits near the top can still be dropped on
    var bar = document.querySelector('.gbar'), top = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0, sp = 0;
    var band = d.tgt != null ? 14 : 44;
    if(d.gy < top + band && se.scrollTop > 0) sp = -Math.ceil((top + band - d.gy) / 4);
    else if(d.armed && d.gy > d.trayTop - 46 && d.gy < d.trayTop + 30 && se.scrollTop + window.innerHeight < se.scrollHeight - 1) sp = Math.ceil((d.gy - (d.trayTop - 46)) / 5);
    if(!sp) return;
    window.scrollBy(0, Math.max(-14, Math.min(14, sp)));
    position(d, d.cx, d.cy);
  }
  function position(d, cx, cy){
    var o = d.o, gx = cx, gy = cy + d.oy;
    d.cx = cx; d.cy = cy; d.gx = gx; d.gy = gy;
    if(gy < d.trayTop - 90) d.armed = true;
    d.ghost.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
    var id = o.hit ? o.hit(gx, gy, d.v) : defaultHit(o, gx, gy);
    if(id === '' || id === undefined) id = null;
    var t = tableEl(o), off = true;
    if(t){ var r = t.getBoundingClientRect(); off = gx < r.left || gx > r.right || gy < r.top || gy > r.bottom; }
    d.off = off && id == null;
    d.ghost.classList.toggle('off', d.kind === 'move' && d.off);
    var ok = id != null && (!o.ok || o.ok(id, d.v, d.kind) !== false);
    if(id !== d.tgt || ok !== d.ok){
      d.tgt = id; d.ok = ok;
      if(d.kind === 'move' && id === d.id) mark(o, null, d.v, false);
      else mark(o, id, d.v, ok);
      if(o.over) o.over(id, d.v, d.kind, d.off);
    } else if(d.kind === 'move' && o.over && d.offWas !== d.off) o.over(id, d.v, d.kind, d.off);
    d.offWas = d.off;
  }
  function finish(cancelled){
    var d = D; D = null;
    if(!d) return;
    if(d.slot) d.slot.classList.remove('out');
    if(!d.on) return;
    cancelAnimationFrame(d.raf);
    dragEndAt = now();
    document.documentElement.classList.remove('cz-dragging');
    var o = d.o, tgt = cancelled ? null : d.tgt, placed = false;
    mark(o, null, d.v, false);
    if(d.kind === 'new'){ if(tgt != null) placed = !!o.drop(tgt, d.v); }
    else if(tgt != null && tgt !== d.id){ placed = !!(o.move && o.move(d.id, tgt, d.v)); }
    else if(tgt == null && d.off && !cancelled){ placed = !!(o.remove && o.remove(d.id, d.v)); }
    var g = d.ghost;
    if(placed){ g.classList.add('land'); setTimeout(function(){ g.remove(); }, 130); if(d.kind === 'move' && o.lift) o.lift(d.id, false); }
    else {
      // Back where it came from: the rack slot, or the spot it was picked up from
      var home = d.kind === 'new' && d.slot && d.slot.isConnected ? d.slot.getBoundingClientRect() : d.rect;
      var hx = home ? home.left + home.width / 2 : d.gx, hy = home ? home.top + home.height / 2 - (d.kind === 'new' ? 4 : 0) : d.gy;
      g.classList.remove('up'); g.classList.add('home');
      g.style.transform = 'translate3d(' + hx + 'px,' + hy + 'px,0)';
      if(d.slot) d.slot.classList.add('out');
      setTimeout(function(){ g.remove(); if(d.slot) d.slot.classList.remove('out'); if(d.kind === 'move' && o.lift) o.lift(d.id, false); }, 270);
    }
    if(o.done) o.done(placed, d.kind, tgt);
    else if(o.over) o.over(null, d.v, 'end');
  }
  function onMove(e){
    var d = D; if(!d || e.pointerId !== d.pid) return;
    if(!d.on){
      if(Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < (d.touch ? 7 : 4)) return;
      if(d.o.enabled && !d.o.enabled()){ D = null; if(d.slot) d.slot.classList.remove('out'); return; }
      begin(e);
    }
    if(e.cancelable) e.preventDefault();
    position(d, e.clientX, e.clientY);
  }
  if(typeof window !== 'undefined'){
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', function(e){ if(D && e.pointerId === D.pid) finish(false); });
    window.addEventListener('pointercancel', function(e){ if(D && e.pointerId === D.pid) finish(true); });
    window.addEventListener('blur', function(){ if(D) finish(true); });
    // iOS: stop the page scrolling under a chip in hand
    window.addEventListener('touchmove', function(e){ if(D && D.on && e.cancelable) e.preventDefault(); }, { passive: false });
  }
  function setValue(r, v){
    r.v = v;
    r.el.querySelectorAll('.cz-slot').forEach(function(b){ b.classList.toggle('on', +b.getAttribute('data-v') === v); });
  }
  function rack(o){
    css();
    var r = { o: o, v: 'value' in o ? o.value : 5 };
    var denoms = o.denoms || [1, 5, 25, 100, 500];
    r.el = document.createElement('div'); r.el.className = 'cz-rack'; r.el.setAttribute('role', 'group'); r.el.setAttribute('aria-label', 'Chip rack');
    denoms.forEach(function(v){
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cz-slot'; b.setAttribute('data-v', v);
      b.setAttribute('aria-label', '$' + v + ' chip');
      var s = document.createElement('div'); s.className = 'cz-stk';
      for(var i = 0; i < 3; i++) s.appendChild(chip(v));
      b.appendChild(s);
      b.addEventListener('click', function(){
        if(now() - dragEndAt < 350 || b.disabled) return;
        if(o.enabled && !o.enabled()) return;
        if(o.tap) o.tap(v); else { setValue(r, v); try{ Kit.sfx('chip'); Kit.haptic('light'); } catch(e){} }
        if(o.tap && o.select !== false) setValue(r, v);
      });
      b.addEventListener('pointerdown', function(e){
        if(D || b.disabled || e.button > 0) return;
        if(o.enabled && !o.enabled()) return;
        try{ b.setPointerCapture(e.pointerId); } catch(err){}
        D = { o: o, rack: r, kind: 'new', v: v, slot: b, rect: b.getBoundingClientRect(), pid: e.pointerId, x0: e.clientX, y0: e.clientY, touch: e.pointerType !== 'mouse', on: false };
      });
      // No long-press menu or text selection on the rack
      b.addEventListener('contextmenu', function(e){ e.preventDefault(); });
      r.el.appendChild(b);
    });
    setValue(r, r.v);
    // Picking a bet back up off the table
    if(o.pick){
      var bind = function(){
        var t = tableEl(o); if(!t || t._czPick) return; t._czPick = true;
        t.addEventListener('pointerdown', function(e){
          if(D || e.button > 0 || (o.enabled && !o.enabled())) return;
          var p = o.pick(e.clientX, e.clientY, e.pointerType); if(!p) return;
          D = { o: o, rack: r, kind: 'move', id: p.id, v: p.v, rect: p.rect || null, pid: e.pointerId, x0: e.clientX, y0: e.clientY, touch: e.pointerType !== 'mouse', on: false };
        });
      };
      r.bind = bind; bind();
    }
    r.value = function(v){ if(v == null) return r.v; setValue(r, v); return v; };
    r.refresh = function(){
      var open = !o.enabled || o.enabled();
      r.el.querySelectorAll('.cz-slot').forEach(function(b){
        var v = +b.getAttribute('data-v');
        b.disabled = !open || (o.can ? !o.can(v) : v > balance());
      });
      if(o.pick && r.bind) r.bind();
    };
    r.dragging = function(){ return !!(D && D.on); };
    r.justDragged = function(){ return now() - dragEndAt < 400; };
    r.cancel = function(){ if(D) finish(true); };
    r.refresh();
    racks.push(r);
    return r;
  }

  return { balance, bet, win, reset, applyRemote, history, showHistory, rack, chip, stack, forPlayer, isMain, playMoney: function(){ return !!PLAY; } };
})();
