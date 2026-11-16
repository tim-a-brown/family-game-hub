// Willy Crash's demo (demo.js; CLAUDE.md, Demos): the fly-over shows what each roof pays, a tap fires Willy onto the
// jackpot roof (the city is seed 4242, where 76.75 degrees lands on the flat deck; window.__willy.aimNext lines the swing
// up so the cannon gets there as the finger presses), and then you fire the second shot yourself. The demo ends before
// the fifth shot, so no game over and no high-score prompt.
(function () {
  'use strict';
  var W = window.__willy, C = window.__wc, SEED = 4242, JACKPOT = 76.75;
  function st() { return C.state(); }
  // a point on the city as a target (the canvas has nothing inside it)
  function spot(fx, fy, w, h) {
    return function () {
      var v = document.getElementById('scr'); if (!v) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var r = v.getBoundingClientRect(), x = r.left + r.width * fx, y = r.top + r.height * fy; return { left: x - w / 2, top: y - h / 2, right: x + w / 2, bottom: y + h / 2, width: w, height: h }; },
        contains: function (t) { return t === v || v.contains(t); }, dispatchEvent: function (e) { return document.getElementById('cv').dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  var tapSpot = spot(0.62, 0.55, 30, 30);
  var screen = function () { return document.getElementById('scr'); };
  Kit.demoScript({
    intro: 'Here’s how to fire Willy from the cannon, and then you take a shot yourself.',
    beats: 8,
    end: 'Tap to fire when the cannon points where you want, and land Willy on the rooftops. The middle roof pays the most.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      W.start(me);
      C.seed(SEED);
    },
    steps: async function (D) {
      await D.say('Willy the daredevil gets fired from a cannon onto the rooftops. Each roof pays the points painted on it.', { at: screen, pos: 'below' });
      await D.say('The middle building is the 5,000 point jackpot. Anywhere else, like the street or the bay, pays only 50.', { at: screen, pos: 'below' });
      await D.wait(function () { return st() === 'aim'; }, 8000);
      if (st() === 'intro') { await D.tap(tapSpot, { after: 400 }); }
      await D.say('The cannon swings up and down by itself. Every shot leaves at the same speed, so the angle decides where Willy lands.', { at: '#deck', wait: 4200 });
      await D.say('Tap anywhere to fire when the cannon points where you want.', { at: '#deck', wait: 1600 });
      W.aimNext(JACKPOT, 0.4);
      await D.tap(tapSpot, { after: 200 });
      await D.wait(function () { return st() === 'result'; }, 40000);
      await D.wait(1200);
      await D.say('Jackpot! Willy stopped on the flat deck in the middle of the slate roof, and that pays 5,000 points.', { at: '#p-score', pad: 6 });
      await D.say('After a jackpot, the cannon swings faster and the jackpot moves one building to the right.', { pos: 'top' });
      await D.tap(tapSpot, { after: 400 });
      await D.wait(function () { return st() === 'aim' || st() === 'intro'; }, 4000);
      if (st() === 'intro') { await D.wait(600); await D.tap(tapSpot, { after: 400 }); }
      await D.wait(function () { return st() === 'aim'; }, 6000);
      await D.you(screen, 'Your turn. Watch the cannon swing, and tap to fire Willy.', { pos: 'top', autoTap: tapSpot, until: function () { return st() === 'flight'; } });
      await D.wait(function () { return st() === 'result'; }, 40000);
      await D.wait(1200);
      var r = W.result() || {};
      await D.say(r.code === 'jackpot' ? 'Another jackpot! That’s 5,000 more points.' : r.code === 'roof' ? 'Willy stayed on a roof, and that pays ' + Number(r.tickets).toLocaleString('en-US') + ' points.' : 'Willy missed the roofs that time, so the shot pays 50 points.', { at: '#p-score', pad: 6 });
      await D.say('Willy crashes into everything on the way down, but only where he stops counts. You get five shots, and the points add up.', { at: '#hud' });
    }
  });
})();
