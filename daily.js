'use strict';
// ── Daily puzzles: today's puzzle in each game that has one, and how far you've got ─────────────
// Used by the "Daily puzzles" button on the home screen (Puzzles & Words). Each game opens its daily
// straight away with ?daily=1. The day numbers and "done" checks here must match each game's own:
//   Wordle        today().day          (days since 2024-01-01 UTC, +1)   history dayNum, randomMode
//   Spelling Bee  dayNum()             (days since 1 Jan 2024 local, +1) spellingbee_state.daily
//   Sudoku        today(), DAILY_DIFF  (days since 1 Jan 2024 local, +1) history daily
//   Word Search   today(), DAILY_DIFF  (same as Sudoku)                   history daily
//   Mazes         today()              ('YYYY-MM-DD' local)               history daily, solved
//   Crossword     dayKey()             ('YYYY-MM-DD' local)               history daily, kind
//   Truth or Lies today(), DAILY_LV    (days since 1 Jan 2024 local, +1) history daily, solved
//   Cipher Cases  today(), DAILY       (days since 1 Jan 2024 local, +1) history daily, secs, revealed; ciphers_state S.g.daily
//   Logic Grids   today(), DAILY_LV  (days since 1 Jan 2024 local, +1) history daily, logicgrid_state.S.daily
//   Picture Mysteries  today()  (days since 1 Jan 2024 local, +1)   history daily, solved/revealed
//   Riddles       today()              (days since 1 Jan 2024 local, +1) history daily; riddles_state.daily
var Daily = window.Daily = (function () {
  var DAY = 86400000;
  function localDay() { return Math.floor((Date.now() - new Date(2024, 0, 1).getTime()) / DAY) + 1; }
  function isoDay() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hist(k) { try { return (window.GameHistory && GameHistory.load(k)) || []; } catch (e) { return []; } }
  function state(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function clock(s) { s = Math.max(0, Math.round(+s || 0)); var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + x).slice(-2); }
  var WD = new Date().getDay();
  var SUDOKU = ['Expert', 'Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Hard'];   // Sun..Sat
  var SEARCH = ['Hard 12×12', 'Easy 8×8', 'Easy 8×8', 'Medium 10×10', 'Medium 10×10', 'Hard 12×12', 'Hard 12×12'];
  var LOGIC = ['Hard 5×5', 'Easy 3×4', 'Easy 3×4', 'Medium 4×4', 'Medium 4×4', 'Hard 4×5', 'Hard 5×5'];   // Sun..Sat

  // each: {id (catalog), name, what, status: 'done'|'going'|'new', note}
  var games = [
    function wordle() {
      var day = Math.floor((Date.now() - new Date('2024-01-01').getTime()) / DAY) + 1;
      var e = hist('wordle').filter(function (x) { return x && x.dayNum === day && !x.randomMode; })[0];
      if (e) {
        var n = Array.isArray(e.guesses) ? e.guesses.length : e.guesses && typeof e.guesses === 'object' ? Object.keys(e.guesses).length : 0;
        return { id: 'wordle', what: 'Daily #' + day, status: 'done', note: e.won ? 'Solved ' + n + '/6' : 'Missed it' };
      }
      var s = state('wordle_state');
      if (s && !s.random && s.day === day && !s.over && s.guesses && s.guesses.length) return { id: 'wordle', what: 'Daily #' + day, status: 'going', note: s.guesses.length + ' of 6 guesses' };
      return { id: 'wordle', what: 'Daily #' + day + ' · the same word for everyone', status: 'new' };
    },
    function spellingbee() {
      var day = localDay(), all = state('spellingbee_state') || {}, d = all.daily;
      var n = d && d.day === day && Array.isArray(d.found) ? d.found.length : 0;
      return { id: 'spellingbee', what: 'Daily #' + day + ' · a new hive every day', status: n ? 'going' : 'new', note: n ? n + (n === 1 ? ' word' : ' words') : '' };
    },
    function sudoku() {
      var day = localDay(), best = null;
      hist('sudoku').forEach(function (e) { if (e && e.daily === day && (!best || e.seconds < best.seconds)) best = e; });
      if (best) return { id: 'sudoku', what: 'Daily · ' + SUDOKU[WD], status: 'done', note: clock(best.seconds) };
      var s = state('sudoku_state'); s = s && s.S;
      if (s && s.daily === day && !s.done) return { id: 'sudoku', what: 'Daily · ' + SUDOKU[WD], status: 'going', note: clock(s.time) };
      return { id: 'sudoku', what: 'Daily · ' + SUDOKU[WD] + ' today', status: 'new' };
    },
    function wordsearch() {
      var day = localDay(), best = null;
      hist('wordsearch').forEach(function (e) { if (e && e.daily === day && !e.gaveUp && (!best || e.seconds < best.seconds)) best = e; });
      if (best) return { id: 'wordsearch', what: 'Daily · ' + SEARCH[WD], status: 'done', note: clock(best.seconds) };
      var s = state('wordsearch_state');
      if (s && s.daily === day && !s.done) return { id: 'wordsearch', what: 'Daily · ' + SEARCH[WD], status: 'going', note: clock(s.seconds) };
      return { id: 'wordsearch', what: 'Daily · ' + SEARCH[WD] + ' today', status: 'new' };
    },
    function mazes() {
      var day = isoDay(), best = null;
      hist('mazes').forEach(function (e) { if (e && e.daily === day && e.solved && !e.revealed && (!best || e.secs < best.secs)) best = e; });
      if (best) return { id: 'mazes', what: 'Daily maze', status: 'done', note: clock(best.secs) };
      var s = state('mazes_state');
      if (s && s.daily === day && !s.done) return { id: 'mazes', what: 'Daily maze', status: 'going', note: s.ms ? clock(s.ms / 1000) : '' };
      return { id: 'mazes', what: 'Daily maze · small Monday, biggest Saturday', status: 'new' };
    },
    function logicgrid() {
      var day = localDay(), best = null;
      hist('logicgrid').forEach(function (e) { if (e && e.daily === day && (!best || e.seconds < best.seconds)) best = e; });
      if (best) return { id: 'logicgrid', what: 'Daily · ' + LOGIC[WD], status: 'done', note: clock(best.seconds) };
      var s = state('logicgrid_state'); s = s && s.S;
      if (s && s.daily === day && !s.done) return { id: 'logicgrid', what: 'Daily · ' + LOGIC[WD], status: 'going', note: clock(s.time) };
      return { id: 'logicgrid', what: 'Daily · ' + LOGIC[WD] + ' today', status: 'new' };
    },
    function mysteries() {
      var day = localDay(), e = hist('mysteries').filter(function (x) { return x && x.daily === day; })[0];
      if (e) return { id: 'mysteries', what: 'Daily case', status: 'done', note: e.solved ? clock(e.secs) : 'Solution seen' };
      var s = state('mysteries_state');
      if (s && s.daily === day && !s.done) return { id: 'mysteries', what: 'Daily case', status: 'going', note: clock(s.secs) };
      return { id: 'mysteries', what: 'Daily case · a new picture mystery every day', status: 'new' };
    },
    function riddles() {
      var day = localDay(), e = hist('riddles').filter(function (x) { return x && x.daily === day; })[0];
      if (e) return { id: 'riddles', what: 'Daily riddle', status: 'done', note: e.solved ? (e.stars === 3 ? 'No hints' : 'Solved') : 'Gave up' };
      var s = state('riddles_state');
      if (s && s.daily === day && !s.over && s.res && s.res[0] && (s.res[0].t.length || s.res[0].h)) return { id: 'riddles', what: 'Daily riddle', status: 'going', note: 'Keep thinking' };
      return { id: 'riddles', what: 'Daily riddle · the same one for everyone', status: 'new' };
    },
    function ciphers() {
      var day = localDay(), T = { caesar: 'Caesar shift', a1z26: 'Letter numbers', crypto: 'Cryptogram' };
      var d = [['crypto', 'Hard'], ['caesar', 'Easy'], ['a1z26', 'Medium'], ['caesar', 'Medium'], ['crypto', 'Easy'], ['caesar', 'Hard'], ['crypto', 'Medium']][WD];
      var what = 'Daily code · ' + T[d[0]] + ' · ' + d[1];
      var e = hist('ciphers').filter(function (x) { return x && x.daily === day; })[0];
      if (e) return { id: 'ciphers', what: what, status: 'done', note: e.revealed ? 'Answer shown' : clock(e.secs) };
      var s = state('ciphers_state'); s = s && s.S;
      if (s && s.g && s.g.daily === day && !s.done) return { id: 'ciphers', what: what, status: 'going', note: clock(s.time) };
      return { id: 'ciphers', what: what, status: 'new' };
    }
  ];
  // Crossword: today's Mini and today's big Crossword (ids dm-/db-YYYY-MM-DD, as games/crossword.html makes them)
  var XW_DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var XW_LVL = ['Easy 15×15', 'Easy 15×15', 'Medium 15×15', 'Medium 15×15', 'Hard 15×15', 'Hardest 15×15', 'Big 21×21'];
  function xwDaily(kind) {
    return function () {
      var id = (kind === 'mini' ? 'dm-' : 'db-') + isoDay(), dow = (new Date().getDay() + 6) % 7, best = null;
      hist('crossword').forEach(function (e) { if (e && e.pid === id && e.secs && (!best || e.secs < best.secs)) best = e; });
      var name = kind === 'mini' ? 'The Mini' : XW_DOW[dow] + ' Crossword', what = kind === 'mini' ? 'Daily 5×5 crossword' : 'Daily · ' + XW_LVL[dow];
      if (best) return { id: 'crossword', name: name, what: what, status: 'done', note: clock(best.secs), q: 'kind=' + kind };
      var st = state('crossword_state'), pr = st && st.prog && st.prog[id];
      var going = pr && !pr.solved && pr.fill && pr.fill.some(function (r) { return r.some(function (x) { return x && x !== '#'; }); });
      return { id: 'crossword', name: name, what: what, status: going ? 'going' : 'new', note: going && pr.secs ? clock(pr.secs) : '', q: 'kind=' + kind };
    };
  }
  games.push(xwDaily('mini'), xwDaily('big'));
  var TRUTHLIES = ['Hard', 'Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Hard'];   // Sun..Sat
  games.push(function truthlies() {
    var day = localDay(), best = null;
    hist('truthlies').forEach(function (e) { if (e && e.daily === day && e.solved && (!best || e.seconds < best.seconds)) best = e; });
    if (best) return { id: 'truthlies', what: 'Daily · ' + TRUTHLIES[WD], status: 'done', note: clock(best.seconds) };
    var s = state('truthlies_state'); s = s && s.S;
    if (s && s.daily === day && !s.done) return { id: 'truthlies', what: 'Daily · ' + TRUTHLIES[WD], status: 'going', note: clock(s.time) };
    return { id: 'truthlies', what: 'Daily · ' + TRUTHLIES[WD] + ' · who is lying?', status: 'new' };
  });
  // Other games add their own (the crossword adds its mini and big) with Daily.add(fn)
  function add(fn) { games.push(fn); }

  function list() {
    var out = [];
    games.forEach(function (fn) {
      try {
        var r = fn(); if (!r) return;
        var g = typeof findGame === 'function' ? findGame(r.id) : null; if (!g) return;
        r.name = r.name || g.name; r.file = (r.file || g.play) + '.html?daily=1' + (r.q ? '&' + r.q : '');
        out.push(r);
      } catch (e) {}
    });
    return out;
  }

  // The sheet: today's date, how many are done, one row per game
  function open() {
    var el = Kit.el, items = list(), done = items.filter(function (x) { return x.status === 'done'; }).length;
    css();
    var box = el('div', { class: 'dly' }, [
      el('p', { class: 'dly-sum', text: new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + done + ' of ' + items.length + ' done' })
    ]);
    items.forEach(function (x) {
      var right = x.status === 'done' ? el('span', { class: 'dly-st done', html: Kit.icon('check') + '<span>' + Kit.esc(x.note || 'Done') + '</span>' })
        : x.status === 'going' ? el('span', { class: 'dly-st going', text: x.note ? x.note : 'Keep going' })
        : el('span', { class: 'dly-st new', text: 'Play' });
      box.appendChild(el('a', { class: 'dly-row' + (x.status === 'done' ? ' is-done' : ''), href: 'games/' + x.file, onclick: function () { Kit.sfx('pop'); } }, [
        el('span', { class: 'gi', html: typeof GameIcon === 'function' ? GameIcon(x.id) : '' }),
        el('span', { class: 'tx' }, [el('b', { text: x.name }), el('small', { text: x.what })]),
        right
      ]));
    });
    Kit.sheet({ title: 'Daily puzzles', node: box, actions: [{ label: 'Close', cls: 'btn-soft' }] });
  }
  var cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    var s = document.createElement('style');
    s.textContent = '.dly{display:flex;flex-direction:column;gap:8px;}' +
      '.dly-sum{margin:0 2px 4px;color:var(--text-2);font-weight:700;font-size:.9rem;}' +
      '.dly-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:16px;background:var(--surface-2);color:var(--text);text-decoration:none;-webkit-tap-highlight-color:transparent;}' +
      '.dly-row:active{transform:scale(.99);}' +
      '.dly-row .gi{flex:none;width:44px;height:44px;border-radius:12px;overflow:hidden;}.dly-row .gi svg{width:100%;height:100%;display:block;}' +
      '.dly-row .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}' +
      '.dly-row .tx b{font-weight:800;}.dly-row .tx small{color:var(--text-2);font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dly-st{flex:none;display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:0 12px;border-radius:999px;font-weight:800;font-size:.82rem;font-variant-numeric:tabular-nums;}' +
      '.dly-st .ico{width:15px;height:15px;}' +
      '.dly-st.new{background:var(--blue,#3b82f6);color:#fff;}' +
      '.dly-st.going{background:color-mix(in srgb,var(--yellow) 22%,transparent);color:var(--text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--yellow) 55%,transparent);}' +
      '.dly-st.done{background:color-mix(in srgb,var(--green) 18%,transparent);color:var(--text);}.dly-st.done .ico{color:var(--green);}';
    document.head.appendChild(s);
  }
  // How many of today's are done, for the button on the home screen
  function count() { var l = list(); return { done: l.filter(function (x) { return x.status === 'done'; }).length, total: l.length }; }
  return { list: list, open: open, add: add, count: count, localDay: localDay, isoDay: isoDay };
})();
