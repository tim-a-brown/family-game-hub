// Picture Mysteries' demo (demo.js; CLAUDE.md, Demos): the first Easy case, The Cookie Jar Caper. The case file and the
// picture, a hint, the magnifying glass following the trail of crumbs to Max, and you name him and make the accusation.
(function () {
  'use strict';
  var MS = window.__ms;
  function view() { return document.querySelector('.ms-view svg'); }
  function who(id) { return function () { var s = view(); return s && s.querySelector('[data-id="' + id + '"]'); }; }
  function tag(label) { return function () { return [].slice.call(document.querySelectorAll('.ms-tags .ms-tag')).filter(function (t) { return t.textContent.trim() === label; })[0]; }; }
  // a point of the picture (in its own 400 by 300 units) on the screen
  function at(x, y) { var r = view().getBoundingClientRect(); return [r.left + x * r.width / 400, r.top + y * r.height / 300]; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // the magnifying glass slides along the crumbs from the jar to Max's face
  async function follow(D) {
    var pts = [[150, 246], [196, 262], [252, 272], [305, 280], [336, 282]];
    var face = who('max')(), fr = face.getBoundingClientRect();
    var end = [fr.left + fr.width * 0.5, fr.top + fr.height * 0.16], path = pts.map(function (p) { return at(p[0], p[1]); }).concat([end]);
    for (var i = 0; i < path.length - 1; i++) {
      for (var k = 0; k <= 12; k++) { if (D.aborted) return; var t = k / 12; MS.loupe(path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t); await sleep(40); }
    }
  }

  Kit.demoScript({
    intro: 'Here’s how to study a case, and then you name the culprit.',
    beats: 8,
    end: 'Read the case, look closely at the picture for clues, and pick your answer when the clues all point one way.',
    start: function () { MS.open('cookie-jar'); },
    steps: async function (D) {
      await D.say('Every case comes with a story and a question. Grandma’s cookies are gone, and the four grandkids all say it wasn’t them.', { at: '.ms-file' });
      await D.say('Everything you need is in the picture. Small things matter, like crumbs, hands and faces.', { at: '.ms-photo' });
      await D.tap('.ms-dock .hint', { after: 700 });
      await D.say('Stuck? Hint gives you a nudge. Each case has two hints.', { at: '.ms-notes .ms-note' });
      await D.say('Touch and hold the picture to look through a magnifying glass. The crumbs lead from the jar across the floor.', { at: '.ms-photo', wait: false });
      await follow(D);
      await D.wait(2600);
      MS.hideLoupe();
      await D.tap('.ms-dock .hint', { after: 1500 });
      await D.say('The second hint circles where the trail ends. Max has chocolate on his mouth and crumbs down his shirt, and he’s hiding his hands.', { at: who('max'), pos: 'below' });
      await D.you(tag('Max'), 'Tap Max’s name to pick him.', { allow: [tag('Max'), who('max')], until: function () { var s = MS.get(); return s && s.sel === 'max'; } });
      await D.you('.ms-dock .go', 'Now make your accusation.', { until: function () { var s = MS.get(); return s && s.done; } });
      await D.wait(3200);
      await D.say('Case solved! The file shows how it was worked out, clue by clue. A new daily case comes every day.', { pos: 'top' });
    }
  });
})();
