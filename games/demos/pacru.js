// Pacru's demo (demo.js; CLAUDE.md, Demos): a first move across a border that puts down a marker, a connection that
// turns a line of fields your color, and a pincer that takes a chevron off the board.
(function () {
  'use strict';
  var T = window.__pacru;
  function S() { return T.state(); }
  function sq(n) { return function () { return T.sq(n); }; }
  function chev(n) { return function () { return T.chev(n); }; }
  function btn(re) { return function () { return [].slice.call(document.querySelectorAll('.acts .btn, .choice .btn')).filter(function (b) { return re.test(b.textContent); })[0] || null; }; }
  // a connection: Black's chevron on c3, four black markers in its borderland, c7 black too, c5 red between them
  var CONN = {
    rows: ['.........', '......bb.', '..a......', '.....b...', '..b......', '.........', '..a......', 'a........', 'aa.......'],
    chev: { c3: '0,N', e1: '0,N', i1: '0,NW', h3: '0,W', g9: '1,S', a9: '1,SE', i5: '1,W', g5: '1,S' }, turn: 0
  };
  // a pincer: Black's chevrons on e3 and c5 both reach Red's chevron on e5
  var PIN = {
    rows: ['.........', '.......b.', '.........', '.........', '....b....', 'aa.......', '.........', '.........', '...aa....'],
    chev: { e3: '0,N', c5: '0,E', g1: '0,N', i1: '0,NW', e5: '1,S', g9: '1,S', a9: '1,SE', i5: '1,W' }, turn: 0
  };

  Kit.demoScript({
    intro: 'Here’s how chevrons move, how markers go down, how a connection fills a line, and how a pincer takes a chevron.',
    beats: 13,
    end: 'Cross borders to put markers down, build up the borderlands you use, connect your fields, and pincer the chevrons that come close.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      T.start({ mode: 'cpu', players: [{ name: me, cpu: false }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: true, level: 'normal' }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play the black chevrons and ' + them + ' plays red. The first to put 42 markers on the board wins. The thick lines split the board into nine borderlands.', { at: '.frame' });
      await D.you(chev('c9'), 'Your turn. Tap this chevron to pick it up.', { until: function () { return T.sel().f === T.C.idx('c9'); } });
      await D.say('A chevron moves straight ahead or forward at 45 degrees. The lit fields are where it can go. It moves one field for now, because you have no markers in its borderland yet.', { at: '.frame', avoid: '.frame' });
      await D.you(sq('d8'), 'This field is across a border. The gold 1 means the move puts one marker down. Tap it.', { until: function () { return T.sel().t === T.C.idx('d8'); } });
      await D.you(btn(/^Move/), 'Tap Move to make the move.', { until: function () { var p = T.sel().pm; return !!(p && p.need === 'mark') || S().n > 0; } });
      await D.you(sq('d8'), 'Your marker goes on a neutral field in the borderland you crossed into. The fields it can go on pulse. Put it under your chevron.', { allow: '.bd', until: function () { return S().n > 0; } });
      await D.wait(function () { return S().n >= 2; }, 8000);
      await D.wait(900);
      await D.set(function () { T.set(CONN); });
      await D.say('Later in the game. You have four markers in this corner borderland, so the chevron on c3 can move up to four fields.', { at: chev('c3') });
      await D.you(chev('c3'), 'Tap the chevron.', { until: function () { return T.sel().f === T.C.idx('c3'); } });
      await D.you(sq('c7'), 'A move from one of your fields to another is a connection. It turns every field in between your color, even a red one. Tap the gold 3.', { until: function () { return T.sel().t === T.C.idx('c7'); } });
      await D.you(btn(/^Move/), 'Tap Move.', { until: function () { var p = T.sel().pm; return !!(p && p.need === 'kind') || S().n > 2; } });
      await D.you(btn(/Fill the line/), 'This connection also crosses a border, so you choose one benefit: the line, or one marker. Fill the line.', { until: function () { return S().n > 0 && S().ml.length && /c3-c7/.test(S().ml[S().ml.length - 1]); } });
      await D.wait(1600);
      await D.set(function () { T.set(PIN); });
      await D.say('A pincer. Your chevrons on e3 and c5 can both reach the red chevron on e5. Two attackers let one of them take it.', { at: chev('e5') });
      await D.you(chev('e3'), 'Tap the chevron on e3.', { until: function () { return T.sel().f === T.C.idx('e3'); } });
      await D.you(chev('e5'), 'The red ring is the pincer. Tap it, then Move.', { allow: '.bd, .acts', until: function () { var p = T.sel().pm; return !!(p && p.need) || S().ml.some(function (m) { return /^e3-e5/.test(m); }); } });
      await D.you(sq('d5'), 'The red chevron is off the board and e5 is yours. You crossed into the middle borderland too, so put a marker there.', { allow: '.bd', until: function () { return S().ml.some(function (m) { return /^e3-e5/.test(m); }); } });
      await D.wait(1800);
      await D.say('Two more things: a chevron that can’t move can turn round for two of your markers, and a player with no chevron that can move is out.', { pos: 'center' });
    }
  });
})();
