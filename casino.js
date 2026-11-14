// casino.js — shared bankroll across all casino games
// Bankroll stored in localStorage under 'casino_bank'
// Usage: Casino.balance(), Casino.bet(n), Casino.win(n), Casino.reset()
//        Casino.applyRemote(delta, info)  bankroll change from a game at a linked player's table (sync.js)
//        Casino.history()            ledger entries, newest first
//        Casino.forPlayer(name)      who's playing, when a session starts and when one resumes. Returns:
//                                    'mine'  you: your bankroll
//                                    'link'  a player linked to their own profile: their bankroll, as their app last
//                                            shared it; what they win or lose goes back to it through the game's
//                                            history record (add Casino.linkRecord(seat) to the record, see below)
//                                    'player' a frequent player (Frequent players, this PIN) not linked: their own
//                                            bankroll here (casino_pb_<name>, synced with the PIN), resettable
//                                    'play'  anyone else, or an unnamed seat ("Player 1"): $1,000 in play money for
//                                            this game; no bankroll is touched
//        Casino.home()               back to your bankroll (forPlayer() with no name does the same)
//        Casino.mode()               'mine' | 'link' | 'player' | 'play' right now
//        Casino.pbKey(name)          a frequent player's bankroll key (casino_pb_<name>)
//        Casino.linkRecord(seat)     for a linked player's session: {bk: {seat: {s, e, c}}} to merge into the
//                                    Kit.record entry (sync.js sends the change to their bankroll); {} otherwise.
//                                    Each call covers the money since the last one, so record as often as you like.
//                                    Casino.reset() for a linked player resets their bankroll (to $1,000) the same way.
//        Casino.isMain(name)         is this you (the name this device plays as, or the PIN's account name)
//        Casino.playMoney()          true while someone other than you plays (play money or a linked bankroll)

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

  // Someone other than you playing on this device: PLAY = {name, bal, link?: their profile code, s0: their bankroll
  // when this device last filed a game for them}. A guest's $1,000 goes nowhere; a linked player's bankroll changes
  // reach them through the history record. Kept on this device only (a reload carries on with it); your bankroll,
  // its history and your link profile never see it.
  // PLAY = {name, bal, link?, s0?, r?, fp?}: someone other than you is playing. fp: a frequent player's own bankroll,
  // kept in casino_pb_<name> (a synced setting, so it's theirs on every device signed in with this PIN)
  var PLAY = null;
  function PLAYK(){ return 'casino_play_' + gameInfo().id; }   // (each game keeps its own, so one left saved can't lose another's)
  function slug(n){ return String(n || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'x'; }
  function fpKey(n){ return 'casino_pb_' + slug(n); }
  function playSave(){
    try{
      if(PLAY && PLAY.fp){ localStorage.setItem(fpKey(PLAY.name), JSON.stringify({ name: PLAY.name, bal: Math.max(0, Math.round(PLAY.bal)) })); if(typeof FGHSync !== 'undefined' && FGHSync.noteWrite) FGHSync.noteWrite(fpKey(PLAY.name)); }
      if(PLAY && !PLAY.fp) localStorage.setItem(PLAYK(), JSON.stringify(PLAY)); else localStorage.removeItem(PLAYK());
    } catch(e){}
  }
  function meName(){
    var me = ''; try{ me = (localStorage.getItem('my_name') || '').trim(); } catch(e){}
    if(!me) try{ me = String((typeof FGHSync !== 'undefined' && FGHSync.label && FGHSync.label()) || '').trim(); } catch(e){}
    return me.toLowerCase();
  }
  // a seat left with its default name ("Player 1", "You"): play money
  function unnamed(name){ return /^(|you|me|player\s*\d*|p\d)$/i.test(String(name || '').trim()); }
  // you (or, on a device with no name set, anyone named)
  function isMain(name){ var me = meName(), k = String(name || '').trim().toLowerCase(); return !unnamed(k) && (!me || k === me); }
  function isFrequent(name){
    var k = String(name || '').trim().toLowerCase(); if(!k) return false;
    try{ return typeof FrequentPlayers !== 'undefined' && FrequentPlayers.list().some(function(n){ return String(n).trim().toLowerCase() === k; }); } catch(e){ return false; }
  }
  // Who's playing: 'mine' (you), 'link' (their own linked bankroll), 'player' (a frequent player's bankroll on this
  // PIN), or 'play' (play money, for this game). forPlayer() with no name at all goes back to your bankroll.
  function forPlayer(name){
    var k = name == null ? '' : String(name).trim();
    // (a running session begun under someone else's money, e.g. at page load, isn't yours: drop it so it can't log a fake change)
    if(!k || isMain(k)){ if(PLAY){ PLAY = null; playSave(); S = null; } return 'mine'; }
    var old = null, lb = null;
    try{ old = JSON.parse(localStorage.getItem(PLAYK())); } catch(e){}
    try{ lb = !unnamed(k) && typeof FGHSync !== 'undefined' && FGHSync.linkBank ? FGHSync.linkBank(k) : null; } catch(e){}
    if(S && !PLAY) flush();
    if(lb && lb.code){
      // the same linked player carrying on here keeps their running amount; otherwise start from what they shared
      PLAY = old && old.name === k && old.link === lb.code && typeof old.bal === 'number' ? old : { name: k, bal: lb.bank, link: lb.code, s0: lb.bank };
    } else if(!unnamed(k) && isFrequent(k)){
      var fb = null; try{ fb = JSON.parse(localStorage.getItem(fpKey(k))); } catch(e){}
      PLAY = { name: k, bal: fb && typeof fb.bal === 'number' ? fb.bal : DEFAULT, fp: 1 };
    } else PLAY = old && old.name === k && !old.link && !old.fp && typeof old.bal === 'number' ? old : { name: k, bal: DEFAULT };
    playSave();
    return mode();
  }
  // your bankroll again (leaving to the setup screen)
  function home(){ return forPlayer(null); }
  function mode(){ return !PLAY ? 'mine' : PLAY.link ? 'link' : PLAY.fp ? 'player' : 'play'; }
  function linkRecord(seat){
    if(!PLAY || !PLAY.link) return {};
    var o = {}; o[seat || 0] = { s: PLAY.s0, e: Math.max(0, PLAY.bal), c: PLAY.link };
    if(PLAY.r) o[seat || 0].r = PLAY.r;
    PLAY.s0 = Math.max(0, PLAY.bal); PLAY.r = 0; playSave();
    return { bk: o };
  }

  // A missing bankroll starts at $1,000; a real $0 stays $0 (not reset).
  function balance(){
    if(PLAY) return Math.max(0, PLAY.bal);
    return realBank();
  }
  // your own bankroll, whoever is playing (the bankroll history)
  function realBank(){
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
    // a linked player's reset is theirs: it goes to their bankroll with the next record (r: the amount it added),
    // and their bankroll history shows it as a reset
    if(PLAY){ if(PLAY.link) PLAY.r = (PLAY.r || 0) + (DEFAULT - Math.max(0, PLAY.bal)); PLAY.bal = DEFAULT; playSave(); return; }
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
    pts.push(realBank());
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
        '.cz-fh{margin:14px 2px 2px;font-size:.72rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)}' +
        '.cz-row .avatar{width:34px;height:34px;flex:none;font-size:.8rem}.cz-row .btn-sm{flex:none}' +
        '.cz-rs{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:rgba(255,200,61,.15);color:var(--yellow);flex:none}';
      document.head.appendChild(st);
    }
    var sessions = list.filter(function(e){ return e.kind === 'session'; });
    var wins = sessions.filter(function(e){ return e.net > 0; }).length, losses = sessions.filter(function(e){ return e.net < 0; }).length;
    var resets = list.filter(function(e){ return e.kind === 'reset'; }).length;
    var net = sessions.reduce(function(a, e){ return a + (e.net || 0); }, 0);
    box.appendChild(el('div', { class: 'cz-top' }, [el('span', { class: 'muted', text: 'Bankroll now' }), el('span', { class: 'cz-bal', text: money(realBank()) })]));
    if(list.length) box.appendChild(el('div', { html: spark(list) }));
    box.appendChild(el('div', { class: 'cz-sum' }, [
      el('div', null, [el('b', { class: net >= 0 ? 'cz-up' : 'cz-down', text: (net > 0 ? '+' : '') + money(net) }), el('small', { text: 'Net' })]),
      el('div', null, [el('b', { text: wins + ' / ' + losses }), el('small', { text: 'Up / down' })]),
      el('div', null, [el('b', { class: 'cz-reset', text: String(resets) }), el('small', { text: resets === 1 ? 'Reset' : 'Resets' })])
    ]));
    // Frequent players' own bankrolls on this account, each with its own reset
    var fps = []; try{ if(typeof FrequentPlayers !== 'undefined') fps = FrequentPlayers.list().filter(function(n){ return !isMain(n) && !(typeof FGHSync !== 'undefined' && FGHSync.linkOf && FGHSync.linkOf(n)); }); }catch(e){}
    if(fps.length){
      box.appendChild(el('div', { class: 'cz-fh', text: 'Players’ bankrolls' }));
      fps.forEach(function(n){
        var amt = el('span', { class: 'v' }), row;
        function cur(){ var fb = null; try{ fb = JSON.parse(localStorage.getItem(fpKey(n))); }catch(e){} return fb && typeof fb.bal === 'number' ? fb.bal : DEFAULT; }
        function paint(){ amt.textContent = money(cur()); }
        var btn = el('button', { type: 'button', class: 'btn btn-soft btn-sm', text: 'Reset', onclick: function(){
          Kit.confirm('Reset ' + (Kit.poss ? Kit.poss(n) : n + '’s') + ' bankroll to ' + money(DEFAULT) + '?', { ok: 'Reset' }).then(function(ok){
            if(!ok) return;
            try{ localStorage.setItem(fpKey(n), JSON.stringify({ name: n, bal: DEFAULT })); if(typeof FGHSync !== 'undefined' && FGHSync.noteWrite) FGHSync.noteWrite(fpKey(n)); }catch(e){}
            if(PLAY && PLAY.fp && PLAY.name.toLowerCase() === String(n).toLowerCase()) PLAY.bal = DEFAULT;
            paint(); if(Kit.sfx) Kit.sfx('chip');
          });
        } });
        row = el('div', { class: 'cz-row' }, [Kit.avatar && Kit.avatar.el ? Kit.avatar.el(n) : el('span'), el('span', { class: 'tx' }, [el('div', { class: 't', text: n })]), amt, btn]);
        paint(); box.appendChild(row);
      });
      box.appendChild(el('div', { class: 'cz-fh', text: 'Your bankroll history' }));
    }
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

  return { balance, bet, win, reset, applyRemote, history, showHistory, rack, chip, stack, forPlayer, home, mode, linkRecord, isMain, isFrequent, pbKey: fpKey, playMoney: function(){ return !!PLAY; } };
})();

// ═══════════════════════════════════════════════════════════════════════════
// CasinoNet: the house games (Roulette, Craps, Baccarat, Three Card Poker, Pai Gow, Horse Race) at one online table
// through turnnet.js. Everyone sits at the same table and plays against the house. The host chooses the money
// (Tim, 2026-11-14: "host gets to pick buy in with bankrolls or play money"): Table money, where nobody's bankroll
// changes, or Bankrolls, where what each person wins or loses at the table goes to their own casino bankroll (each
// device files its own seat's result once, through Casino.applyRemote, when the table cashes out or it leaves). Either
// way each seat starts with the same amount (the review's "Everyone starts with") and buys back in for it when it runs out. Everyone bets at the same time (TurnNet's turn holds every seat still to bet); the last bet in
// settles the round (the spin, the roll, the deal, the race) for every seat at once, and each device plays the result
// out with the game's own animation. Cash out ends the table for everyone, between rounds.
//
//   CasinoNet.wallet()   the Casino object a game uses (var Casino = CasinoNet.wallet() inside the game): the same calls,
//                        playing from a seat's table money while .use(seat) is set ({bank}), your own money otherwise
//   CasinoNet.quiet(fn)  fn with the game's sounds, haptics and messages switched off (a table worked out in a move)
//   CasinoNet.table(cfg) TurnNet.setup for the table; returns {move(st, seat, m) -> {state, mv} | null} for net.act. cfg:
//     game, title, max, unit    as TurnNet (min is 2); unit names a round ('spin', 'roll', 'hand', 'race')
//     opts(o, saved) -> o       the table's settings from the setup (o.stake is filled in)
//     seat(player, opts, i) -> the seat's own game state (its S, as the game keeps one for a player)
//     shared(opts) -> st.g      what the whole table shares (a shoe, the shooter)
//     onTable(S, st, i) -> $    money a seat has on the table (counted in its result)
//     take(st, i, m) -> false to refuse   a 'bet' move from seat i (the seat is then in)
//     resolve(st)               every seat is in: the round is played for all of them (sets st.prev); leave
//                               st.phase 'bet' to open the next round, or set the game's own phase (decisions)
//     turn(st), move(st, i, m)  the game's own phases: who is to act, and their moves (move returns a truthy value,
//                               an object adds to mv; call CasinoNet.next(st) once that round is settled)
//     sitOut(st, i)             a person who leaves: the game takes their bets back or decides for them
//     next(st)                  the game's part of opening a new round
//     show(net, info), leave()  as TurnNet
//   Table state: {online, started, o, stake, round, phase 'bet'|game's|'over', seats [{name, bank, rebuys, out, S}],
//                 ready [seat is in this round], g (shared), prev (the round just settled, for the devices to play out)}
//   Moves: {t: 'bet', ...} (the game's take() reads the rest), {t: 'end'} (Cash out: the whole table), the game's own.
//   Also: CasinoNet.next(st), .nets(st), .left(st) (names still to act), .listAnd(names), .strip(net, o), .end(net, o),
//   .once(key), .moneyOption(), .stakeOption(), .settle(st, seat, code, net, game) (a seat's result to its bankroll)
// ═══════════════════════════════════════════════════════════════════════════
var CasinoNet = (function () {
  'use strict';
  var STAKES = [500, 1000, 2500, 5000];
  var CFG = null, LAST = null;

  function wallet() {
    var cur = null, w = {};
    Object.keys(Casino).forEach(function (k) { w[k] = typeof Casino[k] === 'function' ? function () { return Casino[k].apply(Casino, arguments); } : Casino[k]; });
    w.use = function (seat) { cur = seat || null; };
    w.seat = function () { return cur; };
    w.balance = function () { return cur ? Math.max(0, cur.bank) : Casino.balance(); };
    w.bet = function (n) { if (!cur) return Casino.bet(n); if (n > cur.bank + 1e-9) return false; cur.bank -= n; return true; };
    w.win = function (n) { if (!cur) return Casino.win(n); cur.bank += Math.round(n); };
    w.reset = function () { if (!cur) return Casino.reset(); };
    w.mode = function () { return cur ? 'play' : Casino.mode(); };   // (table money is play money: no bankroll is touched)
    w.forPlayer = function (n) { return cur ? 'play' : Casino.forPlayer(n); };
    w.home = function () { if (!cur) Casino.home(); };
    w.linkRecord = function (s) { return cur ? {} : Casino.linkRecord(s); };
    w.playMoney = function () { return cur ? true : Casino.playMoney(); };
    return w;
  }
  function quiet(fn) {
    var k = { sfx: Kit.sfx, haptic: Kit.haptic, callout: Kit.callout, toast: Kit.toast, confetti: Kit.confetti }, nop = function () {};
    Kit.sfx = nop; Kit.haptic = nop; Kit.callout = nop; Kit.toast = nop; Kit.confetti = nop;
    try { return fn(); } finally { Kit.sfx = k.sfx; Kit.haptic = k.haptic; Kit.callout = k.callout; Kit.toast = k.toast; Kit.confetti = k.confetti; }
  }
  function listAnd(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function onT(st, i) { try { return CFG && CFG.onTable ? CFG.onTable(st.seats[i].S, st, i) || 0 : 0; } catch (e) { return 0; } }
  // each seat's result for the session: what it has (money and chips on the table) less what it was given
  function nets(st) { return st.seats.map(function (s, i) { return Math.round(s.bank + onT(st, i) - st.stake * (1 + (s.rebuys || 0))); }); }
  function allIn(st) { return st.seats.every(function (s, i) { return s.out || st.ready[i]; }); }
  function turnOf(st) {
    if (!st || st.phase === 'over') return [];
    if (st.phase === 'bet') { var out = []; st.seats.forEach(function (s, i) { if (!s.out && !st.ready[i]) out.push(i); }); return out; }
    return CFG.turn ? CFG.turn(st) : [];
  }
  function left(st) { return turnOf(st).map(function (i) { return st.seats[i].name; }); }
  // a new round of betting: anyone out of money (with nothing on the table) buys back in for the starting amount
  function next(st) {
    st.round++; st.phase = 'bet';
    st.seats.forEach(function (s, i) { if (!s.out && s.bank < 1 && onT(st, i) < 1) { s.bank += st.stake; s.rebuys = (s.rebuys || 0) + 1; s.rebuy = st.round; } });
    st.ready = st.seats.map(function (s) { return !!s.out; });
    if (CFG.next) CFG.next(st);
  }
  function settle(st) {
    CFG.resolve(st);
    if (st.phase === 'bet') next(st);
  }
  // Bankrolls: a seat's result for the table goes to this device's own casino bankroll, once (the ledger's gid keeps it to
  // one entry however often it is called), as a session at the host's table. Table money: nothing.
  function bankSettle(st, seat, code, net, game) {
    if (!st || st.money !== 'bank' || seat == null || seat < 0 || !Math.round(net || 0) || typeof Casino === 'undefined' || !Casino.applyRemote) return false;
    var who = st.seats || st.players, host = who && who[0] && who[0].name;
    return Casino.applyRemote(Math.round(net), { game: game || (CFG && CFG.game) || '', name: ((CFG && CFG.title) || 'Casino') + ' online',
      table: host ? Kit.poss(host) + ' table' : 'Online table', gid: 'tbl:' + (game || (CFG && CFG.game)) + ':' + code + ':' + st.started + ':' + seat });
  }
  function setupSaved() { try { return JSON.parse(localStorage.getItem('gn_setup_' + CFG.game)) || {}; } catch (e) { return {}; } }
  function table(cfg) {
    CFG = cfg;
    function start(players, o) {
      var stake = STAKES.indexOf(+o.stake) >= 0 ? +o.stake : 1000;
      var st = { v: 1, online: 1, started: Date.now(), o: o, stake: stake, money: o.money === 'bank' ? 'bank' : 'table', round: 1, phase: 'bet', g: cfg.shared ? cfg.shared(o) : {},
        seats: players.map(function (p, i) { return { name: p.name, bank: stake, rebuys: 0, S: cfg.seat(p, o, i) }; }), ready: players.map(function () { return false; }) };
      if (cfg.next) cfg.next(st);
      return st;
    }
    function moveOn(st, i, m) {
      if (!st || st.phase === 'over' || !m) return null;
      if (m.t === 'end') {
        if (st.phase !== 'bet' || (cfg.canEnd && !cfg.canEnd(st))) return null;
        st.phase = 'over'; st.endBy = i;
        return { state: st, mv: { t: 'end', s: i } };
      }
      if (m.t === 'bet') {
        if (st.phase !== 'bet' || st.ready[i] || !st.seats[i] || st.seats[i].out) return null;
        if (cfg.take(st, i, m) === false) return null;
        st.ready[i] = true;
        var mv = { t: 'bet', s: i };
        if (allIn(st)) { mv.settled = st.round; settle(st); }
        return { state: st, mv: mv };
      }
      if (st.phase === 'bet' || !cfg.move || turnOf(st).indexOf(i) < 0) return null;
      var r0 = st.round, r = cfg.move(st, i, m);
      if (!r) return null;
      var mv2 = Object.assign({ t: m.t, s: i }, typeof r === 'object' ? r : {});
      if (st.round !== r0) mv2.settled = r0;
      return { state: st, mv: mv2 };
    }
    TurnNet.setup({
      game: cfg.game, title: cfg.title, min: 2, max: cfg.max || 6,
      opts: function () {
        var s = setupSaved(), o = Object.assign({}, s.options || {});
        o.stake = STAKES.indexOf(+o.stake) >= 0 ? +o.stake : 1000;
        var money = o.money === 'bank' ? 'bank' : 'table', r = cfg.opts ? cfg.opts(o, s) : o;
        r.money = money; return r;
      },
      start: start,
      turn: turnOf,
      over: function (st) {
        if (st.phase !== 'over') return null;
        var n = nets(st), hi = Math.max.apply(null, n), win = [];
        n.forEach(function (x, i) { if (x === hi) win.push(i); });
        return { win: win, text: 'Cashed out after ' + (st.round - 1) + ' ' + (cfg.unit || 'round') + (st.round - 1 === 1 ? '' : 's') };
      },
      // someone who leaves sits out: their seat stays with its money, and the others play on
      resign: function (st, i) {
        st.seats[i].out = true;
        if (cfg.sitOut) cfg.sitOut(st, i);
        if (st.phase === 'bet') { st.ready[i] = true; if (allIn(st)) settle(st); }
        return { state: st };
      },
      leaveNote: function (st) { return st && st.money === 'bank' ? 'The others play on without you. What you have won or lost so far goes to your bankroll.' : 'The others play on without you, and your money stays at the table.'; },
      // (Bankrolls: whoever leaves takes their result to their bankroll as it stands when they go)
      show: function (net, info) { LAST = net; return cfg.show(net, info); },
      leave: function () { var n = LAST; LAST = null; if (n && n.state && n.seat >= 0) bankSettle(n.state, n.seat, n.code, nets(n.state)[n.seat], cfg.game); return cfg.leave && cfg.leave.apply(this, arguments); }
    });
    return { move: moveOn };
  }

  // ── The seats on screen: each player's money, and whoever still has to bet glows ──
  var CSS = '.cz-net{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:2px 0 6px;}' +
    '.cz-net .czs{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 3px;border-radius:999px;background:rgba(0,0,0,.3);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);font-weight:800;font-size:.8rem;color:#e9e4f7;max-width:100%;transition:background .25s,box-shadow .25s,opacity .25s;}' +
    '.cz-net .czs .avatar{width:24px;height:24px;font-size:.66rem;flex:none;}' +
    '.cz-net .czs > span{white-space:nowrap;}' +
    '.cz-net .czs b{font-variant-numeric:tabular-nums;color:#f6d77b;font-weight:900;white-space:nowrap;}' +
    '.cz-net .czs.up{background:color-mix(in srgb,var(--yellow,#f5c542) 30%,rgba(0,0,0,.3));box-shadow:inset 0 0 0 1.5px var(--yellow,#f5c542),0 0 12px color-mix(in srgb,var(--yellow,#f5c542) 45%,transparent);color:#fff;}' +
    '.cz-net .czs .ck{width:14px;height:14px;color:#3ddc84;flex:none;display:inline-flex;}.cz-net .czs .ck svg{width:14px;height:14px;}' +
    '.cz-net .czs.me:not(.up){box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4);}' +
    '.cz-net .czs.out{opacity:.45;}' +
    '.cz-net .czs .mk{display:inline-flex;width:16px;height:16px;margin-right:-2px;color:#f6d77b;flex:none;}.cz-net .czs .mk svg{width:16px;height:16px;}' +
    '.cz-net .czs .d{font-size:.74rem;font-weight:900;}.cz-net .czs .d.pos{color:#3ddc84;}.cz-net .czs .d.neg{color:#ff8a8a;}';
  function css() { if (document.getElementById('cz-net-css')) return; var s = document.createElement('style'); s.id = 'cz-net-css'; s.textContent = CSS; document.head.appendChild(s); }
  function money(n) { n = Math.round(n); return (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString(); }
  // o: {st: the table as this device shows it (default the table), amount(i) -> $ (default the seat's money),
  //     delta(i) -> $ won or lost in the round just played, mark(i) -> {icon, title} beside the name (Craps: the shooter),
//     up: [seats still to act] (default: whose turn it is)}
  function strip(net, o) {
    css(); o = o || {};
    var st = o.st || net.state, me = net.seat, up = o.up || turnOf(net.state), box = Kit.el('div', { class: 'cz-net', 'aria-label': 'Players at the table' });
    st.seats.forEach(function (s, i) {
      var isUp = up.indexOf(i) >= 0, inn = !isUp && !s.out && net.state.phase !== 'over' && (net.state.phase === 'bet' ? !!net.state.ready[i] : true);
      var amt = o.amount ? o.amount(i) : s.bank, d = o.delta ? o.delta(i) : null;
      var c = Kit.el('span', { class: 'czs' + (isUp ? ' up' : '') + (inn ? ' in' : '') + (i === me ? ' me' : '') + (s.out ? ' out' : ''), title: s.out ? s.name + ' left the table' : '' }, [
        Kit.avatar && Kit.avatar.el ? Kit.avatar.el(s.name, null, Kit.color ? Kit.color(i) : null) : Kit.el('span', { class: 'avatar', text: s.name.charAt(0) }),
        Kit.el('span', { text: i === me ? 'You' : s.name }), Kit.el('b', { text: money(amt) })]);
      var mk = o.mark ? o.mark(i) : null;
      if (mk) c.insertBefore(Kit.el('span', { class: 'mk', title: mk.title || '', html: Kit.icon(mk.icon || mk) }), c.children[1]);
      if (d) c.appendChild(Kit.el('span', { class: 'd ' + (d > 0 ? 'pos' : 'neg'), text: (d > 0 ? '+' : '−') + '$' + Math.abs(Math.round(d)).toLocaleString() }));
      else if (inn && o.check !== false) c.appendChild(Kit.el('span', { class: 'ck', html: Kit.icon('check') }));
      box.appendChild(c);
    });
    return box;
  }
  // The results card when the table cashes out: everyone's result for the session, best first. o: {unit}
  var winRef = null;
  function end(net, o) {
    o = o || {};
    var st = net.state, res = net.result, left = !!(res && res.left != null), me = net.seat, n = nets(st), played = st.round - 1;
    var rank = st.seats.map(function (s, i) { return { name: i === me ? 'You' : s.name, score: (n[i] > 0 ? '+' : n[i] < 0 ? '−' : '') + '$' + Math.abs(n[i]).toLocaleString(), n: n[i], color: Kit.color(i), i: i }; }).sort(function (a, b) { return b.n - a.n; });
    var top = rank[0], tie = rank[1] && rank[1].n === top.n;
    var bk = st.money === 'bank' && me >= 0 && n[me] && st.phase === 'over';
    if (bk) bankSettle(st, me, net.code, n[me]);
    if (winRef) winRef.close();
    var by = st.endBy != null && st.seats[st.endBy] ? (st.endBy === me ? 'You' : st.seats[st.endBy].name) + ' cashed out the table after ' : 'The table cashed out after ';
    winRef = Kit.win({
      title: left ? res.text : top.n > 0 && !tie ? (top.i === me ? 'You win the table!' : top.name + ' wins the table!') : 'Nobody came out ahead',
      sub: by + played + ' ' + (o.unit || 'round') + (played === 1 ? '.' : 's.'),
      rank: rank, lose: me >= 0 && n[me] < 0, icon: me >= 0 && n[me] >= 0 ? 'trophy' : 'meh',
      notes: bk ? ['You have ' + money(+localStorage.getItem('casino_bank') || 0) + ' in your bankroll now.'] : undefined, notesTitle: bk ? 'Bankroll' : undefined,
      againLabel: left ? 'Back to the lobby' : 'New session',
      again: function () { winRef = null; if (left) { TurnNet.leave(); TurnNet.open(); } else net.again(); },
      look: o.look !== false
    });
    return winRef;
  }
  function closeEnd() { if (winRef) { winRef.close(); winRef = null; } }
  // true the first time this device sees a key (a table's session is filed once on each device)
  function once(key) {
    var K = 'casino_net_rec', done = [];
    try { done = JSON.parse(localStorage.getItem(K)) || []; } catch (e) {}
    if (done.indexOf(key) >= 0) return false;
    done.push(key); try { localStorage.setItem(K, JSON.stringify(done.slice(-30))); } catch (e) {}
    return true;
  }
  // the setup's "Everyone starts with": it only matters online, so the Play online review asks it
  function moneyOption(id) {
    return { id: id || 'money', label: 'Money', value: 'table', when: function (m) { return m === 'online'; }, help: 'Where everyone’s money at the online table comes from.',
      choices: [['bank', 'Bankrolls', 'Everyone buys in from their own casino bankroll, and what they win or lose at the table stays with it.'],
        ['table', 'Table money', 'Everyone starts with the same amount, and nobody’s bankroll changes.']] };
  }
  function stakeOption() {
    return { id: 'stake', label: 'Everyone starts with', value: 1000, when: function (m) { return m === 'online'; },
      help: 'What each player sits down with. Anyone who runs out buys back in for the same amount.',
      choices: STAKES.map(function (v) { return [v, money(v)]; }) };
  }
  return { wallet: wallet, quiet: quiet, table: table, next: next, nets: nets, left: left, turn: turnOf, allIn: allIn,
    listAnd: listAnd, strip: strip, end: end, closeEnd: closeEnd, once: once, stakeOption: stakeOption, moneyOption: moneyOption, settle: bankSettle, STAKES: STAKES };
})();
