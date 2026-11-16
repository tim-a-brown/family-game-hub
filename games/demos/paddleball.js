// Pong's demo (demo.js; CLAUDE.md, Demos): the Classic table against the computer, you serving first. A finger slides
// along your strip to move the paddle and taps to serve; a short rally shows the ball speeding up; then you return three
// shots yourself with the big paddle power on for the try.
(function () {
  'use strict';
  var P = window.__pong;
  function g() { return P.get() || {}; }
  function cv() { return document.querySelector('.ar-cab canvas'); }
  // your strip, or the court near your end when there is no strip (a mouse)
  function strip() { var t = document.querySelector('.ar-thumb.near'); return t && !t.hidden ? t : document.querySelector('.ar-cab'); }
  // a point along your strip, f of the way from one end to the other
  function along(f) {
    return function () {
      var s = strip(); if (!s) return null;
      var r = s.getBoundingClientRect(), side = P.land(), x = side ? r.left + r.width / 2 : r.left + 20 + (r.width - 40) * f, y = side ? r.top + 20 + (r.height - 40) * f : r.top + r.height / 2;
      return { nodeType: 1, isConnected: true, tagName: 'DIV', getBoundingClientRect: function () { return { left: x - 2, top: y - 2, right: x + 2, bottom: y + 2, width: 4, height: 4 }; },
        contains: function (t) { return t === s || s.contains(t); }, dispatchEvent: function (e) { return s.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function hits() { return P.hits()[0]; }

  Kit.demoScript({
    intro: 'Here’s how to move your paddle, serve and keep a rally going.',
    beats: 7,
    end: 'Slide along your strip to move the paddle, tap to serve, and bounce the ball past the computer. First to 11, by 2, wins.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      P.begin(me);
      P.waitServe(true);
    },
    steps: async function (D) {
      await D.wait(1400);
      await D.say('Your paddle is the one at your end of the court, and the computer plays the far end. Bounce the ball past its paddle to score.', { at: '.ar-cab' });
      await D.say('Slide a finger along the strip at your end, and the paddle follows it. Your thumb never covers the court.', { at: strip, pad: 4, wait: 2600 });
      await D.drag(along(0.5), [along(0.2), along(0.8), along(0.5)], { after: 300 });
      await D.say('The ball waits on your paddle when it’s your serve. A quick tap sends it.', { at: strip, pad: 4, wait: 2400 });
      await D.tap(along(0.5), { after: 200 });
      P.autopilot(true);
      await D.say('The ball speeds up every time it’s hit. Hit it near the end of your paddle to send it off at a sharp angle.', { at: '.ar-cab', wait: 5200 });
      // (you take over the paddle mid-rally; from here a serve of yours goes by itself if you don't tap)
      P.autopilot(false); P.waitServe(false);
      P.big(0, 40);
      var h0 = hits();
      try {
        await D.you(strip, 'Your turn. Slide along the strip to return the ball three times. Your paddle is extra long for this try.', {
          allow: function () { return [strip(), document.querySelector('.ar-wrap')]; },
          autoTap: function () { P.autopilot(true); return along(0.5)(); },
          until: function () { return hits() >= h0 + 3; }
        });
      } finally { P.autopilot(false); }
      P.autopilot(true);   // (the rally carries on behind the last words)
      await D.wait(600);
      await D.say('Nicely played. The score for each side is up here, and the first to 11 points wins, by 2.', { at: '.ar-hud' });
      await D.say('In the setup you can turn on power-ups, or pick the Tunnel, a 3-D table you play on your own.', { pos: 'top' });
    }
  });
})();
