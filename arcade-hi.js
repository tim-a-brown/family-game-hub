/* arcade-hi.js — shared top-15 leaderboard with 3-letter arcade name entry
 * Usage:
 *   ArcadeHi.check(gameKey, score, onDone)
 *     - shows entry screen if score qualifies; calls onDone() when dismissed
 *   ArcadeHi.show(gameKey)
 *     - opens the leaderboard drawer
 *   ArcadeHi.btn(gameKey, label)
 *     - returns a button element that opens the leaderboard
 *
 * Boards that aren't "highest score first" (puzzle times, moves, marbles left)
 * are listed in HI_BOARDS in games.js, so sync.js knows their direction too:
 *   { low: 1 (lower is better), unit: 'time'|'moves'|'marbles'|'points'|'score',
 *     dec: decimals on times, label: 'Expert', tab: 'Expert', game: catalog id }
 *   ArcadeHi.config(key)          - the board's settings ({} for a plain score board)
 *   ArcadeHi.config(key, {...})   - add or override settings on this page (labels,
 *                                   format). A new low board must also go in HI_BOARDS.
 *   ArcadeHi.fmt(key, value, short) - a value as the board shows it ('4:05', '42 moves';
 *                                   short: '42', for a table headed MOVES)
 *   ArcadeHi.top(key)             - the board's best value, linked players included (null if none)
 *   ArcadeHi.better(key, a, b)    - is value a better than b on this board
 *   ArcadeHi.marbles(left, offCenter, seconds) - the value a marble solitaire finish is stored as
 * Boards with siblings (same game in HI_BOARDS) show tabs to switch between them. A game with lots of boards
 * shows tabs only for the boards with scores, plus any marked pin: 1; a board with tabIf() is a tab only while it says so.
 *   ArcadeHi.check(key, score, onDone, { also: [{ key, score }] })
 *     - one initials entry files the score on several boards (Peggle's last level: the full game and the level)
 */
const ArcadeHi = (function(){
  const MAX = 50;

  // ── Board settings: direction and how values read ─────────────────────────
  const CFG = {};
  function conf(key){
    let c = null;
    try{ if(typeof hiBoard === 'function') c = hiBoard(key); }catch(e){}
    return Object.assign({}, c || {}, CFG[key] || {});
  }
  function isLow(key){ return !!conf(key).low; }
  function order(key){ return isLow(key) ? (a,b)=>a.score-b.score : (a,b)=>b.score-a.score; }
  function better(key, a, b){ return isLow(key) ? a < b : a > b; }
  function clock(sec, dec){
    let s = Math.max(0, Number(sec) || 0);
    s = dec ? Math.round(s * 10) / 10 : Math.round(s);
    const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s - Math.floor(s / 60) * 60;
    const ss = (r < 10 ? '0' : '') + (dec ? r.toFixed(1) : String(Math.round(r)));
    return h ? h + ':' + (m < 10 ? '0' : '') + m + ':' + ss : m + ':' + ss;
  }
  // Marble solitaire: marbles left, then a last marble in the center hole beats one elsewhere, then time.
  // Stored as left + 0.5 (one marble, not in the center) + seconds / 1,000,000, so one number sorts right.
  function marblesCode(left, off, sec){ return Math.round(((Number(left) || 0) + (off ? 0.5 : 0) + Math.min(99999, Math.max(0, Math.round(Number(sec) || 0))) / 1e6) * 1e6) / 1e6; }
  function marblesRead(v){
    v = Number(v) || 0;
    const n = Math.floor(v + 1e-9), f = Math.round((v - n) * 1e6), off = f >= 500000;
    return { left: n, off: off, sec: off ? f - 500000 : f };
  }
  // short: for a table whose heading already names the unit ('42', '1 center 0:32')
  function fmt(key, v, short){
    const c = conf(key);
    v = Number(v) || 0;
    if(c.unit === 'time') return clock(v, c.dec);
    if(c.unit === 'cash') return '$' + v.toLocaleString();
    if(c.unit === 'moves') return v.toLocaleString() + (short ? '' : v === 1 ? ' move' : ' moves');
    if(c.unit === 'marbles'){
      const m = marblesRead(v);
      return (m.left === 1 && !m.off ? '1 center' : m.left + ' left') + (m.sec ? (short ? ' ' : ' in ') + clock(m.sec) : '');
    }
    return v.toLocaleString();
  }
  function unitName(key){ return ({ time: 'Time', moves: 'Moves', marbles: 'Finish', points: 'Points', cash: 'Cash' })[conf(key).unit] || 'Score'; }
  function boardTitle(key){
    const c = conf(key);
    if(c.title) return c.title;
    let g = null; try{ if(c.game && typeof findGame === 'function') g = findGame(c.game); }catch(e){}
    if(!g) return '';
    return g.name + (c.label ? ': ' + c.label : '');
  }
  // Other boards of the same game (Easy, Medium, Hard...) for the tabs
  function siblings(key){
    const c = conf(key);
    if(!c.game || typeof HI_BOARDS === 'undefined') return [];
    const all = Object.keys(HI_BOARDS).filter(k=>HI_BOARDS[k] && HI_BOARDS[k].game === c.game).filter(k=>{
      const f = conf(k).tabIf; if(k === key || typeof f !== 'function') return true;
      try{ return !!f(); }catch(e){ return true; }
    });
    if(all.length < 2) return [];
    // lots of boards (Math Puzzles): only the ones with scores, plus this one and any pinned
    return all.length > 8 ? all.filter(k=>k === key || conf(k).pin || merged(k).length) : all;
  }

  // Read the board, skipping any entry without a real score (a bad entry
  // used to show up as "NaN"), best first (highest, or lowest on a low board)
  // a board started again after its reader was fixed (sync.js HI_RESET): rows filed before come off, here and in the cloud
  function resetRev(key){ try{ return typeof FGHSync!=='undefined' && FGHSync.hiReset ? FGHSync.hiReset[key] || 0 : ({ console_smb: 1, console_smb3: 1, console_ducktales: 3, console_ikari: 3, console_megaman: 1, console_punchout: 1, console_contra: 1, console_smw: 1, console_ssf2: 3, console_superpunchout: 3, console_wolf3d: 1, console_superbomberman: 1, console_superbomberman2: 1, console_sonic: 1, console_sonic2: 1, console_castleofillusion: 1, console_pitfall: 1, console_junglehunt: 3, console_poleposition: 1 })[key] || 0; }catch(e){ return 0; } }
  function load(key){
    let list = [];
    try{ list = JSON.parse(localStorage.getItem('hi_'+key)||'[]'); }catch(e){ return []; }
    if(!Array.isArray(list)) return [];
    const rv = resetRev(key);
    if(rv){ const kept = list.filter(e=>e && (Number(e.rv)||0) >= rv); if(kept.length !== list.length){ list = kept; save(key, kept); } }
    return list.filter(e=>e && isFinite(Number(e.score)) && e.score !== null && e.score !== '')
      .map(e=>Object.assign({}, e, { score: Number(e.score), name: String(e.name || '???') }))
      .sort(order(key));
  }
  function save(key,list){ try{localStorage.setItem('hi_'+key,JSON.stringify(list));if(typeof FGHSync!=='undefined')FGHSync.noteWrite('hi_'+key);}catch(e){} }

  // Your initials (set on your profile, PIN accounts) and the scores of people you've linked
  function myIni(){ try{ return (typeof FGHSync!=='undefined' && FGHSync.initials && FGHSync.isPin && FGHSync.isPin()) ? FGHSync.initials() : ''; }catch(e){ return ''; } }
  function linked(key){ try{ return (typeof FGHSync!=='undefined' && FGHSync.linkHi) ? FGHSync.linkHi(key) : []; }catch(e){ return []; } }
  function myName(){ try{ return (localStorage.getItem('my_name')||'').trim(); }catch(e){ return ''; } }
  // Who's playing and their initials (Kit knows both: the player picked on the setup screen, their saved initials)
  function curWho(opts){ if(opts && opts.who) return String(opts.who); try{ return window.Kit && Kit.player ? Kit.player() : ''; }catch(e){ return ''; } }
  function iniOf(who){ try{ return who && window.Kit && Kit.initials ? Kit.initials.of(who) : ''; }catch(e){ return ''; } }
  function iniSave(who, v){ try{ if(who && window.Kit && Kit.initials) Kit.initials.set(who, v); }catch(e){} }
  // This device's board plus linked people's best scores (theirs not already on it), top MAX
  // A score that remembers its player (p) shows that person, whatever initials others share;
  // older scores without one count as yours when they carry your initials
  function personName(k){
    try{ const n = window.Kit && Kit.knownNames ? Kit.knownNames().filter(x=>String(x).trim().toLowerCase()===k)[0] : ''; if(n) return n; }catch(e){}
    return k.replace(/\b[a-z]/g, c=>c.toUpperCase());
  }
  function merged(key){
    const me = myName().toLowerCase();
    const own = load(key).map(e=>{
      if(e.p){ const mine = !!me && e.p === me; return Object.assign({}, e, { mine, by: mine ? '' : personName(e.p) }); }
      return Object.assign({}, e, { mine: !!myIni() && e.name.trim().toUpperCase()===myIni() });
    });
    const seen = {}; own.forEach(e=>{ seen[e.name.trim().toUpperCase()+'|'+e.score] = 1; });
    const theirs = linked(key).filter(e=>!seen[String(e.ini).toUpperCase()+'|'+e.score]).map(e=>({ name: e.ini || '???', score: e.score, date: e.date, who: e.who }));
    return own.concat(theirs).sort(order(key)).slice(0, MAX);
  }
  function avHTML(name, cls){
    try{ if(window.Kit && Kit.avatar && Kit.avatar.el) return Kit.avatar.el(name, cls||'sm', 'var(--surface-3)').outerHTML; }catch(e){}
    return '';
  }
  function esc(t){ return String(t).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  // the moment's title, in sentence case: a time board, a low board, any other board
  function titleOf(c){ return c.unit === 'time' ? 'Fast time!' : c.low ? 'Top ' + MAX + '!' : 'High score!'; }
  // the letter arrows: the kit's line chevron (turned over for up), a plain triangle where the kit isn't loaded
  function arrowIc(fb){ try{ if(window.Kit && Kit.icon) return Kit.icon('down'); }catch(e){} return fb; }
  // 'Nov 14, 2026 7:05 PM': the day over the time, each on its own line
  function dateHTML(d){
    const m = String(d||'').match(/^(.*\d{4})\s+(\d.*)$/);
    return m ? '<span>' + esc(m[1]) + '</span><span>' + esc(m[2]) + '</span>' : esc(d||'');
  }

  function qualifies(key, score){
    const list = load(key);
    if(list.length < MAX) return true;
    return better(key, score, list[list.length-1].score);
  }

  // who: the player's name; the row remembers them (p) so it follows if they change their initials later
  function insert(key, name, score, who){
    const list = load(key);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});   // e.g. 'Oct 9, 2026'
    const timeStr = now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const row = {name: name.toUpperCase().slice(0,3).padEnd(3,' '), score, date: dateStr+' '+timeStr};
    const rv = resetRev(key); if(rv) row.rv = rv;
    const pk = String(who||'').trim().toLowerCase(); if(pk && !/^player \d+$/.test(pk)) row.p = pk;
    list.push(row);
    list.sort(order(key));
    if(list.length > MAX) list.length = MAX;
    save(key, list);
    try{ if(typeof FGHSync!=='undefined' && FGHSync.linkPublishSoon) FGHSync.linkPublishSoon(); }catch(e){}
    return list.findIndex(e=>e.name===name&&e.score===score);
  }

  // ── CSS (injected once) ───────────────────────────────────────────────────
  let cssInjected = false;
  function injectCSS(){
    if(cssInjected) return; cssInjected = true;
    const s = document.createElement('style');
    s.textContent = `
/* Night glass (Tim, 2026-11-14): a glass card over the dimmed game, gold for your new score and whatever you pick */
.ahi-overlay{position:fixed;inset:0;background:var(--win-shade,rgba(6,7,16,.6));-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;animation:ahi-in .2s ease;}
@keyframes ahi-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
.ahi-box{color:var(--text);font-family:var(--font);border-radius:var(--r-xl,28px);padding:24px 20px;max-width:380px;width:100%;max-height:90vh;overflow-y:auto;
  background:linear-gradient(160deg,color-mix(in srgb,var(--h,#7a6cf0) 14%,transparent),transparent 55%),var(--sheet-bg);
  -webkit-backdrop-filter:blur(26px) saturate(1.2);backdrop-filter:blur(26px) saturate(1.2);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 0 0 1px var(--gl-line),0 30px 60px -24px rgba(0,0,0,.9);}
.ahi-title{display:flex;align-items:center;justify-content:center;gap:8px;font-family:var(--display);font-size:1.9rem;font-weight:800;letter-spacing:-.03em;line-height:1.1;text-align:center;color:var(--lit-ink);margin-bottom:4px;}
.ahi-title .ico{width:26px;height:26px;flex:none;color:var(--lit-ink);}
.ahi-title.board{color:var(--text);font-size:1.6rem;}
.ahi-sub{text-align:center;color:var(--text-3);font-size:.84rem;font-weight:550;margin-bottom:18px;}
/* 3-letter name entry: three letter tiles, the one you're on lit gold */
.ahi-slots{display:flex;gap:10px;justify-content:center;margin-bottom:18px;border-radius:18px;transition:box-shadow .2s;}
.ahi-slots.bad{box-shadow:0 0 0 2px var(--bad-ink,#ff8a8a);}
.ahi-slot{display:flex;flex-direction:column;align-items:center;gap:6px;}
.ahi-letters{display:flex;gap:8px;justify-content:center;margin-top:10px;}
.ahi-letter{width:64px;height:80px;background:var(--well);box-shadow:inset 0 0 0 1px var(--gl-line);border-radius:16px;font-family:var(--display);font-size:2.6rem;font-weight:800;color:var(--text);display:flex;align-items:center;justify-content:center;letter-spacing:0;user-select:none;transition:box-shadow .15s,background .15s,color .15s;}
.ahi-letter.active{color:var(--lit-ink);background:rgba(255,211,77,.12);box-shadow:inset 0 0 0 2px var(--lit),0 0 18px var(--litg);}
.ahi-arrows{display:flex;flex-direction:column;gap:4px;}
.ahi-arrow{width:64px;height:40px;background:var(--gl);box-shadow:inset 0 0 0 1px var(--gl-line);border:0;border-radius:13px;color:var(--text-2);cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation;transition:transform .12s,background .15s;}
.ahi-arrow .ico{width:20px;height:20px;}
.ahi-arrow.up .ico{transform:rotate(180deg);}
.ahi-arrow:active{background:var(--gl-2);transform:translateY(1px) scale(.96);}
.ahi-type{font-size:.84rem;font-weight:600;color:var(--text-2);margin-bottom:8px;}
.ahi-input{font-family:var(--display);font-size:2.2rem;font-weight:800;text-align:center;letter-spacing:12px;text-indent:12px;text-transform:uppercase;
  background:var(--well);border:0;box-shadow:inset 0 0 0 1px var(--gl-line);border-radius:18px;color:var(--text);width:170px;padding:12px 8px;outline:none;transition:box-shadow .15s;}
.ahi-input:focus{box-shadow:inset 0 0 0 2px var(--lit),0 0 16px var(--litg);}
.ahi-input::placeholder{color:var(--text-3);opacity:.6;}
.ahi-warn{display:none;color:var(--bad-ink,#ff8a8a);font-size:.84rem;font-weight:650;text-align:center;margin-bottom:10px;}
.ahi-acts{display:flex;flex-direction:column;align-items:stretch;gap:6px;max-width:260px;margin:0 auto;}
.ahi-score-disp{text-align:center;margin-bottom:16px;}
.ahi-score-val{font-family:var(--display);font-size:2.6rem;font-weight:800;letter-spacing:-.02em;line-height:1.05;color:var(--lit-ink);text-shadow:0 0 22px var(--litg);font-variant-numeric:tabular-nums;}
.ahi-score-lbl{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;font-size:.84rem;font-weight:600;color:var(--text-2);margin-top:4px;}
.ahi-score-lbl .ahi-tag{padding:2px 9px;border-radius:9px;background:var(--gl-3);box-shadow:inset 0 0 0 1px var(--gl-line);color:var(--text-2);font-weight:650;}
.ahi-score-lbl .ahi-rk{padding:2px 9px;border-radius:9px;background:rgba(255,211,77,.16);box-shadow:inset 0 0 0 1px rgba(255,211,77,.5);color:var(--lit-ink);font-weight:800;}
.ahi-also{font-size:.84rem;color:var(--text-2);margin-top:8px;}
.ahi-also b{color:var(--lit-ink);font-weight:800;}
.ahi-plate{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px auto 0;padding:10px 18px;width:max-content;max-width:100%;border-radius:20px;background:rgba(255,211,77,.12);box-shadow:inset 0 0 0 1.5px rgba(255,211,77,.55),0 0 22px rgba(255,190,60,.18);animation:ahi-plate .55s cubic-bezier(.3,1.6,.5,1) .15s backwards;}
.ahi-plate .avatar{width:34px;height:34px;font-size:.9rem;flex:none;}
.ahi-plate-ini{font-family:var(--display);font-size:1.7rem;font-weight:800;letter-spacing:.14em;color:var(--lit-ink);text-shadow:0 0 14px var(--litg);}
.ahi-plate small{font-size:.86rem;font-weight:700;color:var(--text-2);}
.ahi-change{display:block;margin:0 auto;padding:8px 12px;border:0;border-radius:12px;background:none;color:var(--text-3);font:inherit;font-size:.84rem;font-weight:650;cursor:pointer;}
.ahi-change:active{background:var(--gl);}
@keyframes ahi-plate{from{transform:scale(.6);opacity:0;}to{transform:scale(1);opacity:1;}}
/* the board right after a score files: the rows around it, the new one dropping into its place and the ones below
   stepping down to make room */
.ahi-snap{margin:4px 0 6px;display:flex;flex-direction:column;gap:5px;}
.ahi-sr{display:grid;grid-template-columns:26px 30px 1fr auto;align-items:center;gap:8px;padding:6px 12px 6px 10px;border-radius:14px;background:var(--gl);box-shadow:inset 0 0 0 1px var(--gl-line);}
.ahi-sr .avatar{width:28px;height:28px;font-size:.8rem;}
.ahi-sr-rk{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;font-size:.76rem;font-weight:800;color:var(--text-3);}
.ahi-sr-rk.m{color:#2b1a00;}
.ahi-sr-nm{min-width:0;font-family:var(--display);font-size:1.02rem;font-weight:800;letter-spacing:.1em;line-height:1.05;}
.ahi-sr-nm small{display:block;font-family:var(--font);font-size:.72rem;font-weight:650;letter-spacing:0;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ahi-sr-pt{font-family:var(--display);font-size:1rem;font-weight:800;font-variant-numeric:tabular-nums;}
.ahi-sr.me{background:rgba(255,211,77,.13);box-shadow:inset 0 0 0 1.5px rgba(255,211,77,.6),0 0 18px rgba(255,190,60,.2);color:var(--lit-ink);animation:ahi-drop .6s cubic-bezier(.3,1.5,.5,1) .45s backwards;}
.ahi-sr.me .ahi-sr-nm small{color:var(--lit-ink);opacity:.8;}
.ahi-sr.dn{animation:ahi-step .45s cubic-bezier(.3,1.2,.5,1) .2s backwards;}
.ahi-sr-gap{height:10px;margin:-2px 0;background:radial-gradient(circle,var(--text-3) 1.5px,transparent 2px) center/12px 10px repeat-x;width:40px;align-self:center;opacity:.7;}
@keyframes ahi-drop{from{transform:translateY(-14px) scale(1.12);opacity:0;}to{transform:none;opacity:1;}}
@keyframes ahi-step{from{transform:translateY(calc(-100% - 5px));}to{transform:none;}}
@media (prefers-reduced-motion:reduce){.ahi-sr.me,.ahi-sr.dn{animation:none;}}
.ahi-r .ahi-acts{margin-top:14px;}
/* sideways phone: the score on the left, the board and Continue on the right */
@media (max-height:540px) and (orientation:landscape){
  .ahi-box.ahi-two{max-width:720px;display:grid;grid-template-columns:1fr 1.35fr;gap:4px 22px;align-items:center;padding:16px 20px;}
  .ahi-two .ahi-score-disp{margin-bottom:0;}
  .ahi-two .ahi-sr{padding:3px 10px;}
  .ahi-two .ahi-sr .avatar{width:24px;height:24px;}
  .ahi-two .ahi-r .ahi-acts{margin-top:10px;}
}
/* Leaderboard table: glass rows, the new score lit gold */
.ahi-table{width:100%;border-collapse:separate;border-spacing:0 4px;font-size:.84rem;margin-top:-4px;}
.ahi-table th{color:var(--text-3);font-size:.78rem;font-weight:600;text-align:left;padding:2px 8px;}
.ahi-table td{padding:7px 8px;background:var(--gl);box-shadow:inset 0 1px 0 var(--gl-line),inset 0 -1px 0 var(--gl-line);}
.ahi-table td:first-child{border-radius:13px 0 0 13px;box-shadow:inset 1px 1px 0 var(--gl-line),inset 0 -1px 0 var(--gl-line);}
.ahi-table td:last-child{border-radius:0 13px 13px 0;box-shadow:inset -1px 1px 0 var(--gl-line),inset 0 -1px 0 var(--gl-line);}
.ahi-table tr.ahi-new td{color:var(--lit-ink);background:rgba(255,211,77,.13);box-shadow:inset 0 1.5px 0 rgba(255,211,77,.6),inset 0 -1.5px 0 rgba(255,211,77,.6);}
.ahi-table tr.ahi-new td:first-child{box-shadow:inset 1.5px 1.5px 0 rgba(255,211,77,.6),inset 0 -1.5px 0 rgba(255,211,77,.6);}
.ahi-table tr.ahi-new td:last-child{box-shadow:inset -1.5px 1.5px 0 rgba(255,211,77,.6),inset 0 -1.5px 0 rgba(255,211,77,.6);}
.ahi-table tr.ahi-new .ahi-who small,.ahi-table tr.ahi-new .ahi-dt{color:var(--lit-ink);opacity:.8;}
.ahi-quick{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:0 0 18px;}
.ahi-quick button{font-family:var(--display);font-size:1.15rem;font-weight:800;letter-spacing:.08em;padding:8px 14px;border-radius:14px;border:0;background:var(--gl-2);color:var(--text);box-shadow:inset 0 0 0 1px var(--gl-line),0 8px 18px -14px rgba(0,0,0,.9);cursor:pointer;touch-action:manipulation;transition:transform .12s,background .15s;}
.ahi-quick button.ahi-me{display:inline-flex;align-items:center;gap:8px;background:rgba(255,211,77,.14);color:var(--lit-ink);box-shadow:inset 0 0 0 1.5px rgba(255,211,77,.6),0 0 16px rgba(255,190,60,.18);}
.ahi-quick button.ahi-me .avatar{width:24px;height:24px;font-size:.75rem;}
.ahi-quick button:active{transform:translateY(1px) scale(.96);filter:brightness(.94);}
.ahi-quick-lbl{text-align:center;font-size:.84rem;font-weight:600;color:var(--text-2);margin-bottom:8px;}
.ahi-rank{color:var(--text-3);font-size:.78rem;font-weight:700;width:24px;}
.ahi-name{font-family:var(--display);font-size:1.1rem;font-weight:800;letter-spacing:.1em;}
.ahi-pts{font-family:var(--display);font-size:1.05rem;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;}
.ahi-dt{color:var(--text-3);font-size:.7rem;font-weight:550;text-align:right;line-height:1.3;white-space:nowrap;}
.ahi-dt span{display:block;}
.ahi-who{display:flex;align-items:center;gap:8px;}
.ahi-who .avatar{width:26px;height:26px;font-size:.8rem;flex:none;}
.ahi-who small{display:block;font-family:var(--font);font-size:.72rem;font-weight:650;letter-spacing:0;color:var(--text-3);}
.ahi-table tr.ahi-mine .ahi-name{color:var(--lit-ink);}
.ahi-table tr.ahi-them td{background:color-mix(in srgb,var(--blue,#4da3ff) 10%,var(--gl));}
.ahi-medal{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;font-weight:800;font-size:.76rem;color:#2b1a00;}
.ahi-mine-lbl{text-align:center;font-size:.8rem;color:var(--text-2);margin:-8px 0 14px;}
.ahi-table td.ahi-empty{text-align:center;color:var(--text-2);padding:24px;font-size:.92rem;font-weight:650;border-radius:16px;box-shadow:inset 0 0 0 1px var(--gl-line);}
.ahi-empty span{display:block;margin-top:6px;font-size:.8rem;font-weight:550;color:var(--text-3);}
.ahi-tabs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:-6px 0 14px;}
.ahi-tabs button{border:0;border-radius:13px;padding:7px 13px;font-family:var(--font);font-size:.82rem;font-weight:700;background:var(--gl);box-shadow:inset 0 0 0 1px var(--gl-line);color:var(--text-2);cursor:pointer;touch-action:manipulation;}
.ahi-tabs button.on{background:rgba(255,211,77,.14);color:var(--lit-ink);box-shadow:inset 0 0 0 1px rgba(255,211,77,.6),0 0 16px rgba(255,190,60,.18);}
.ahi-pts.ahi-low{font-size:.95rem;white-space:nowrap;}
.ahi-btns{display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap;}
.ahi-btns #ahi-close{min-width:120px;}
.ahi-btns #ahi-clear{color:var(--bad-ink,#ff8a8a);}
/* a narrow phone (320 wide): less padding, the board without its little avatars so every column fits */
@media (max-width:360px){
  .ahi-overlay{padding:12px;}
  .ahi-box{padding:20px 12px;}
  .ahi-table td,.ahi-table th{padding-left:5px;padding-right:5px;}
  .ahi-table .ahi-who .avatar{display:none;}
  .ahi-name{font-size:1rem;}
  .ahi-pts{font-size:.95rem;}
}
`;
    document.head.appendChild(s);
  }

  // ── Name entry screen ─────────────────────────────────────────────────────
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function showEntry(key, score, onDone, also, who){
    also = also || [];
    injectCSS();
    const forMe = !who || (myName() && who.trim().toLowerCase() === myName().toLowerCase());
    const mine = forMe ? myIni() : '';
    // someone without initials yet: start from their name (Cam → CAM), one tap to keep it
    const guess = mine || (who ? String(who).toUpperCase().replace(/[^A-Z]/g,'').slice(0,3) : '');
    const letters = guess.length >= 2 ? (guess+'AAA').slice(0,3).split('') : ['A','A','A'];
    let focusIdx = guess.length >= 2 ? Math.min(guess.length, 2) : 0;
    // whose initials these are: you, someone whose saved initials they are, or a regular whose name starts that way
    function ownerOf(t){
      if(!t) return '';
      if(mine && t===mine) return myName();
      let names = []; try{ names = window.Kit && Kit.knownNames ? Kit.knownNames() : []; }catch(e){}
      return names.filter(n=>iniOf(n)===t)[0] || names.filter(n=>!iniOf(n) && String(n).toUpperCase().replace(/[^A-Z]/g,'').slice(0,3)===t)[0] || '';
    }
    let picked = null;   // the person behind a tapped pick

    const overlay = document.createElement('div');
    overlay.className = 'ahi-overlay';
    const c = conf(key);
    overlay.innerHTML = `
      <div class="ahi-box">
        <div class="ahi-title">${titleOf(c)}</div>
        <div class="ahi-sub">${who && !forMe ? esc(who) + ' made the top ' + MAX + '. Their initials?' : 'You made the top ' + MAX + '. Enter your initials.'}</div>
        <div class="ahi-score-disp">
          <div class="ahi-score-val">${esc(fmt(key, score))}</div>
          <div class="ahi-score-lbl"><span>${unitName(key)}</span>${c.label ? '<span class="ahi-tag">' + esc(c.label) + '</span>' : ''}</div>
          ${also.map(a=>`<div class="ahi-also">Also on ${esc(conf(a.key).label || boardTitle(a.key) || a.key)}: <b>${esc(fmt(a.key, a.score))}</b></div>`).join('')}
        </div>
        <div id="ahi-quick-wrap"></div>
        <div class="ahi-slots" id="ahi-slots"></div>
        <div class="ahi-warn" id="ahi-warn"></div>
        <div class="ahi-acts">
          <button class="btn btn-primary btn-block" id="ahi-submit" type="button">Save initials</button>
          <button class="btn btn-ghost btn-block btn-sm" id="ahi-skip" type="button">Skip</button>
        </div>
      </div>`;
    document.body.style.overflow = 'hidden';
    // Always release the scroll lock however the overlay is dismissed
    { const _rm = overlay.remove.bind(overlay); overlay.remove = () => { document.body.style.overflow = ''; _rm(); }; }
    document.body.appendChild(overlay);

    // Detect mobile
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    function renderSlots(){
      const container = document.getElementById('ahi-slots');
      container.innerHTML = '';

      if(isMobile){
        // Mobile: single text input that brings up keyboard
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'text-align:center;';
        wrapper.innerHTML = `
          <div class="ahi-type">Type your 3 initials</div>
          <input id="ahi-mobile-input" class="ahi-input" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"
            maxlength="3" placeholder="AAA">
          <div class="ahi-letters">
            ${letters.map((l,i)=>`<div class="ahi-letter${i===focusIdx?' active':''}" style="pointer-events:none;">${l}</div>`).join('')}
          </div>`;
        container.appendChild(wrapper);
        const inp = document.getElementById('ahi-mobile-input');
        setTimeout(()=>{inp.focus();inp.click();},100);
        inp.addEventListener('input',()=>{
          const val = inp.value.toUpperCase().replace(/[^A-Z]/g,'');
          for(let i=0;i<3;i++) letters[i] = val[i]||'A';
          focusIdx = Math.min(val.length, 2);
          renderSlots();
        });
        inp.value = letters.join('').replace(/A+$/,'') || '';
      } else {
        // Desktop: arrow slot UI
        for(let i=0;i<3;i++){
          const slot = document.createElement('div');
          slot.className = 'ahi-slot';
          slot.innerHTML = `
            <div class="ahi-arrows">
              <button class="ahi-arrow up" type="button" data-i="${i}" data-dir="1" aria-label="Next letter">${arrowIc('▲')}</button>
            </div>
            <div class="ahi-letter${i===focusIdx?' active':''}" data-i="${i}">${letters[i]}</div>
            <div class="ahi-arrows">
              <button class="ahi-arrow" type="button" data-i="${i}" data-dir="-1" aria-label="Previous letter">${arrowIc('▼')}</button>
            </div>`;
          container.appendChild(slot);
        }
        container.querySelectorAll('.ahi-arrow').forEach(btn=>{
          btn.addEventListener('click',()=>{
            const i=+btn.dataset.i, dir=+btn.dataset.dir;
            focusIdx=i;
            const ci=(CHARS.indexOf(letters[i])+dir+26)%26;
            letters[i]=CHARS[ci];
            renderSlots();
          });
        });
        container.querySelectorAll('.ahi-letter').forEach(el=>{
          el.addEventListener('click',()=>{focusIdx=+el.dataset.i;renderSlots();});
        });
      }
    }
    renderSlots();

    // One-tap initials for the regulars: initials already on any leaderboard
    // (these sync across devices) plus names from the family's game history.
    (function quickPicks(){
      const count = {};
      try{
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i); if(!k||k.indexOf('hi_')!==0) continue;
          (JSON.parse(localStorage.getItem(k)||'[]')||[]).forEach(e=>{ const n=String(e&&e.name||'').trim().toUpperCase(); if(/^[A-Z]{2,3}$/.test(n)) count[n]=(count[n]||0)+1; });
        }
      }catch(e){}
      try{
        if(window.Kit && Kit.knownNames) Kit.knownNames().forEach((n,i)=>{ const t=String(n).toUpperCase().replace(/[^A-Z]/g,'').slice(0,3); if(t.length>=2) count[t]=(count[t]||0)+20-Math.min(i,19); });
      }catch(e){}
      let picks = Object.keys(count).sort((a,b)=>count[b]-count[a]);
      if(mine) picks = [mine].concat(picks.filter(t=>t!==mine));
      picks = picks.slice(0,8);
      if(!picks.length) return;
      const wrap = document.getElementById('ahi-quick-wrap');
      wrap.innerHTML = '<div class="ahi-quick-lbl">Tap your initials</div><div class="ahi-quick"></div>';
      const box = wrap.querySelector('.ahi-quick');
      picks.forEach(t=>{
        const b=document.createElement('button'); b.type='button'; b.textContent=t;
        if(t===mine){ b.innerHTML=avHTML(myName()||t,'sm')+'<span>'+esc(t)+'</span>'; b.className='ahi-me'; b.setAttribute('aria-label','Your initials, '+t); }
        b.addEventListener('click',()=>{ for(let i=0;i<3;i++) letters[i]=t[i]||' '; picked = ownerOf(t); dismiss(true); });
        box.appendChild(b);
      });
    })();

    // Keyboard support
    function onKey(e){
      if(e.key.length===1&&((e.key>='A'&&e.key<='Z')||(e.key>='a'&&e.key<='z'))){
        letters[focusIdx]=e.key.toUpperCase();
        focusIdx=Math.min(2,focusIdx+1);
        const warn=document.getElementById('ahi-warn');if(warn)warn.style.display='none';
        renderSlots();e.preventDefault();
      } else if(e.key==='Backspace'){
        focusIdx=Math.max(0,focusIdx-1);
        letters[focusIdx]='A';
        renderSlots();e.preventDefault();
      } else if(e.key==='ArrowRight') { focusIdx=Math.min(2,focusIdx+1);renderSlots();}
      else if(e.key==='ArrowLeft')  { focusIdx=Math.max(0,focusIdx-1);renderSlots();}
      else if(e.key==='ArrowUp')    { const ci=(CHARS.indexOf(letters[focusIdx])+1)%26;letters[focusIdx]=CHARS[ci];renderSlots();}
      else if(e.key==='ArrowDown')  { const ci=(CHARS.indexOf(letters[focusIdx])-1+26)%26;letters[focusIdx]=CHARS[ci];renderSlots();}
      else if(e.key==='Enter'||e.key===' ') { document.getElementById('ahi-submit')?.click(); }
    }
    document.addEventListener('keydown', onKey);

    function dismiss(submit){
      document.removeEventListener('keydown', onKey);
      if(submit){
        // Block default AAA — user hasn't actually typed initials
        if(letters.join('')==='AAA'){
          // Flash warning on the slots
          const slotsEl=document.getElementById('ahi-slots');
          if(slotsEl){slotsEl.classList.add('bad');setTimeout(()=>{slotsEl.classList.remove('bad');},600);}
          const warn=document.getElementById('ahi-warn');
          if(warn){warn.textContent='Enter your initials first!';warn.style.display='block';}
          document.addEventListener('keydown',onKey); // re-attach
          return;
        }
        const name = letters.join('').trim()||'???';
        // the score goes to whoever these initials belong to: the player when they're theirs (or they had none yet),
        // otherwise the person they match (TIM was playing, CAM tapped: it's Cam's score, and TIM stays Tim's)
        let person = picked !== null ? picked : '';
        if(picked === null) person = who && (!iniOf(who) || iniOf(who)===name) ? who : ownerOf(name);
        if(person && !iniOf(person)) iniSave(person, name);   // next time their scores file under these without asking
        insert(key, name, score, person);
        also.forEach(a=>insert(a.key, name, a.score, person));
        overlay.remove();
        // show where it went: the rank, their initials and who they are
        showFiled(key, score, name, person, also, onDone, true);
        return;
      }
      overlay.remove();
      onDone && onDone();
    }

    document.getElementById('ahi-submit').addEventListener('click',()=>dismiss(true));
    document.getElementById('ahi-skip').addEventListener('click',()=>dismiss(false));
  }

  // Known player: the score files under their initials straight away; a short moment shows it (tap to go on)
  // (filed: already on the boards, from the initials screen)
  function showFiled(key, score, ini, who, also, onDone, filed){
    injectCSS();
    if(!filed){ insert(key, ini, score, who); also.forEach(a=>insert(a.key, ini, a.score, who)); }
    const c = conf(key);
    const rank = load(key).findIndex(e=>e.name.trim()===ini && e.score===score) + 1;
    const snap = snapshot(key, ini, score);
    const overlay = document.createElement('div');
    overlay.className = 'ahi-overlay ahi-filed';
    overlay.innerHTML = `
      <div class="ahi-box${snap ? ' ahi-two' : ''}">
        <div class="ahi-l"><div class="ahi-title">${titleOf(c)}</div>
        <div class="ahi-score-disp">
          <div class="ahi-score-val">${esc(fmt(key, score))}</div>
          <div class="ahi-score-lbl"><span>${unitName(key)}</span>${c.label ? '<span class="ahi-tag">' + esc(c.label) + '</span>' : ''}${rank && !snap ? '<b class="ahi-rk">#' + rank + '</b>' : ''}</div>
          ${also.map(a=>`<div class="ahi-also">Also on ${esc(conf(a.key).label || boardTitle(a.key) || a.key)}: <b>${esc(fmt(a.key, a.score))}</b></div>`).join('')}
        </div></div>
        <div class="ahi-r">${snap || `<div class="ahi-plate">${avHTML(who || ini, 'sm')}<span class="ahi-plate-ini">${esc(ini)}</span><small>${esc(who || '')}</small></div>`}
        <div class="ahi-acts"><button class="btn btn-primary btn-block" id="ahi-go" type="button">Continue</button>
        <button class="ahi-change" id="ahi-change" type="button">Not ${esc(ini)}? Change</button></div></div>
      </div>`;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
    let done = false;
    function close(){ if(done) return; done = true; clearTimeout(t); overlay.remove(); document.body.style.overflow = ''; onDone && onDone(); }
    // long enough to find yourself on the board; touching it keeps it up until Continue
    const t = setTimeout(close, snap ? 8000 : 4200);
    overlay.querySelector('.ahi-box').addEventListener('pointerdown', ()=>clearTimeout(t));
    overlay.querySelector('#ahi-go').addEventListener('click', close);
    overlay.querySelector('#ahi-change').addEventListener('click', ()=>{
      if(done) return; done = true; clearTimeout(t);
      // take it back off the boards, then ask
      [{ key, score }].concat(also).forEach(a=>{ const l = load(a.key), i = l.findIndex(e=>e.name.trim()===ini && e.score===a.score); if(i >= 0){ l.splice(i, 1); save(a.key, l); } });
      overlay.remove(); document.body.style.overflow = '';
      showEntry(key, score, onDone, also, who);
    });
    try{ if(window.Kit){ Kit.sfx && Kit.sfx('good'); Kit.haptic && Kit.haptic('success'); } }catch(e){}
  }

  // The board around a score that just filed: up to five rows centred on it, with #1 above when it's further down
  function snapshot(key, ini, score){
    const list = merged(key), at = list.findIndex(e=>!e.who && e.name.trim()===ini && e.score===score);
    if(at < 0 || list.length < 2) return '';
    const start = Math.max(0, Math.min(at - 2, list.length - 5)), idx = [];
    if(start > 0) idx.push(0, -1);
    for(let i = start; i < Math.min(list.length, start + 5); i++) idx.push(i);
    const medal = ['#ffc83d','#cfd6e4','#d9925a'];
    return '<div class="ahi-snap">' + idx.map(i=>{
      if(i < 0) return '<div class="ahi-sr-gap"></div>';
      const e = list[i], nm = e.who || (e.mine ? (myName() || 'You') : e.by || '');
      return `<div class="ahi-sr${i===at?' me':i>at?' dn':''}">
        <span class="ahi-sr-rk${i<3?' m':''}"${i<3?` style="background:${medal[i]}"`:''}>${i+1}</span>
        ${avHTML(nm || e.name)}
        <span class="ahi-sr-nm">${esc(e.name.trim())}${nm ? `<small>${esc(nm)}</small>` : ''}</span>
        <span class="ahi-sr-pt">${esc(fmt(key, e.score, true))}</span></div>`;
    }).join('') + '</div>';
  }

  // ── Leaderboard display ───────────────────────────────────────────────────
  function showBoard(key, title, newScore=null){
    injectCSS();
    const list = merged(key);
    const newIdx = newScore!==null ? list.findIndex(e=>!e.who && e.score===newScore) : -1;
    const nLocal = load(key).length, nThem = list.filter(e=>e.who).length;
    const gameName = title || boardTitle(key) || 'High Scores';
    const low = isLow(key), sibs = siblings(key);

    const overlay = document.createElement('div');
    overlay.className = 'ahi-overlay';

    let rows = '';
    if(list.length===0){
      rows = `<tr><td colspan="4" class="ahi-empty">No scores yet. Be the first!<span>Play a game to get on the board.</span></td></tr>`;
    } else {
      list.forEach((e,i)=>{
        const isNew = i===newIdx;
        const isTop = i===0;
        const medal = i<3 ? `<span class="ahi-medal" style="background:${['#ffc83d','#cfd6e4','#d9925a'][i]}">${i+1}</span>` : '';
        const nm = e.who ? `<div class="ahi-who">${avHTML(e.who)}<div>${esc(e.name)}<small>${esc(e.who)}</small></div></div>`
          : e.mine ? `<div class="ahi-who">${avHTML(myName()||e.name)}<div>${esc(e.name)}<small>You</small></div></div>`
          : e.by ? `<div class="ahi-who">${avHTML(e.by)}<div>${esc(e.name)}<small>${esc(e.by)}</small></div></div>` : esc(e.name);
        rows += `<tr class="${isNew?'ahi-new':''}${e.who?' ahi-them':''}${e.mine?' ahi-mine':''}">
          <td class="ahi-rank">${medal||i+1}</td>
          <td class="ahi-name">${nm}</td>
          <td class="ahi-pts${conf(key).unit && conf(key).unit !== 'score' && conf(key).unit !== 'points' ? ' ahi-low' : ''}">${esc(fmt(key, e.score))}</td>
          <td class="ahi-dt">${dateHTML(e.date)}</td>
        </tr>`;
      });
    }

    const hasScores = nLocal > 0;
    overlay.innerHTML = `
      <div class="ahi-box">
        <div class="ahi-title board">${window.Kit&&Kit.icon?Kit.icon('trophy'):''}<span>${esc(gameName)}</span></div>
        <div class="ahi-sub">${low ? 'The ' + (conf(key).unit === 'time' ? 'fastest ' : 'fewest ') + MAX : 'The top ' + MAX} has ${list.length} entr${list.length===1?'y':'ies'}${nThem?', ' + nThem + ' of them from linked players':''}.</div>
        ${sibs.length ? '<div class="ahi-tabs" role="tablist">' + sibs.map(k=>`<button type="button" role="tab" data-k="${esc(k)}" class="${k===key?'on':''}" aria-selected="${k===key}">${esc(conf(k).tab || conf(k).label || k)}</button>`).join('') + '</div>' : ''}
        <table class="ahi-table">
          <thead><tr><th>#</th><th>Name</th><th style="text-align:right">${unitName(key)}</th><th style="text-align:right">Date</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="ahi-btns">
          <button class="btn btn-primary" id="ahi-close" type="button">Close</button>
          ${hasScores?`<button class="btn btn-ghost btn-sm" id="ahi-clear" type="button">Clear scores</button>`:''}
        </div>
      </div>`;
    document.body.style.overflow = 'hidden';
    // Always release the scroll lock however the overlay is dismissed
    { const _rm = overlay.remove.bind(overlay); overlay.remove = () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onEsc); _rm(); }; }
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
    document.getElementById('ahi-close').addEventListener('click', () => overlay.remove());
    // Tabs: the game's other boards (levels, sizes)
    overlay.querySelectorAll('.ahi-tabs button').forEach(b => b.addEventListener('click', () => {
      if(b.dataset.k === key) return;
      try{ if(window.Kit && Kit.sfx) Kit.sfx('tap'); }catch(e){}
      document.removeEventListener('keydown', onEsc);
      overlay.remove(); showBoard(b.dataset.k);
    }));

    if(hasScores){
      document.getElementById('ahi-clear').addEventListener('click', () => {
        const doClear = () => {
          save(key, []);
          overlay.remove();
          // Re-open to show empty state
          showBoard(key, title, null);
        };
        if(window.GN && GN.confirm){
          GN.confirm("This can't be undone.", {title:`Clear ${gameName} high scores?`, ok:'Clear scores', danger:true})
            .then(ok => { if(ok) doClear(); });
        } else if(confirm(`Clear all ${gameName} high scores?\n\nThis can't be undone.`)){
          doClear();
        }
      });
    }

    // Close on Escape
    function onEsc(e){ if(e.key==='Escape') overlay.remove(); }   // overlay.remove() also drops this listener
    document.addEventListener('keydown', onEsc);
  }

  const PAGE = /^(ast|breakout|flappy|flappywild|flappy_classic|pac|peggle|peggle_l\d+|peggle_run|paddleball|cubehopper|snake|tetris|crossyroad|willycrash|crazytower|centipede|centipede_chaos|invaders|invaders_frenzy|galaga|goblin|pinball_[a-z]+|console_[a-z0-9_]+)$/;   // (console_*: the console games that keep a score, games/console-hi.js)
  // ...and every board in HI_BOARDS (games.js): the puzzle games, each level or size on its own board
  function onPage(key){ key = String(key||''); if(PAGE.test(key)) return true; try{ return typeof hiBoard === 'function' && !!hiBoard(key); }catch(e){ return false; } }
  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    // The cleaned-up board (real scores only, highest first) and the top score
    list(key){ return load(key); },
    // this device's board plus linked players' best scores: [{name, score, date, mine, who, by}] (by: the player a score here belongs to)
    board(key){ return merged(key); },
    max: MAX,
    best(key){ const l = load(key); return l.length ? l[0].score : 0; },
    // Board settings (see the top of this file): config(key) reads, config(key, {...}) sets for this page
    config(key, c){ if(c && typeof c === 'object') CFG[key] = Object.assign(CFG[key] || {}, c); return conf(key); },
    low(key){ return isLow(key); },
    better(key, a, b){ return better(key, a, b); },
    fmt(key, v, short){ return fmt(key, v, short); },
    unit(key){ return unitName(key); },
    title(key){ return boardTitle(key); },
    // The board's best value, linked players included; null when the board is empty
    top(key){ const l = merged(key); return l.length ? l[0].score : null; },
    qualifies(key, score){ return score > 0 && qualifies(key, score); },
    marbles(left, offCenter, sec){ return marblesCode(left, offCenter, sec); },
    readMarbles(v){ return marblesRead(v); },
    // opts.who: the player (default: the one picked on the setup screen). Their saved initials file the score
    // without asking; a player with none types them once and they're kept for next time.
    check(key, score, onDone, opts){
      const also = ((opts && opts.also) || []).filter(a=>a && a.key && a.score>0 && qualifies(a.key, a.score));
      const who = curWho(opts), ini = iniOf(who);
      let k = key, sc = score;
      if(!(score>0 && qualifies(key, score))){
        if(!also.length){ onDone && onDone(); return; }
        const a = also.shift(); k = a.key; sc = a.score;
      }
      if(ini) showFiled(k, sc, ini, who, also, ()=>{ onDone && onDone(); });
      else showEntry(k, sc, ()=>{ onDone && onDone(); }, also, who);
    },
    // Games on the High Scores cabinet page open it with their board selected (the others keep the pop-up board)
    show(key, title){
      if(onPage(key)){ try{ location.href = (/\/games\//.test(location.pathname) ? '' : 'games/') + 'hiscores.html#' + encodeURIComponent(key); return; }catch(e){} }
      showBoard(key, title);
    },
    btn(key, title){
      injectCSS();
      const b = document.createElement('button');
      b.className = 'btn btn-soft btn-sm';
      b.innerHTML = (window.Kit&&Kit.icon?Kit.icon('trophy')+' ':'')+'Scores';
      b.addEventListener('click', ()=>ArcadeHi.show(key, title));
      return b;
    }
  };
})();
