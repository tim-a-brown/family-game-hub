// Fortune Teller's demo (demo.js; CLAUDE.md, Demos): the four tellers, then you choose the Oracle Dial and drop its coin
// yourself; the ticket prints. Then the title switches tellers, and The Great Zandor prints a fortune card.
(function () {
  'use strict';
  var F = window.__fortune;
  function card(id) { return '.ft-grid .ft-card[data-id="' + id + '"]'; }
  function oracleDone() { var c = document.querySelector('.orc-card'); return !!(c && c.classList.contains('out')); }

  Kit.demoScript({
    intro: 'Here’s how the Fortune Teller works. You’ll ask the Oracle Dial yourself.',
    beats: 10,
    end: 'Choose a teller, then follow its lead: drop a coin, crack a cookie, or ask the 8 Ball a question and shake it.',
    start: function () { F.picker(); },
    steps: async function (D) {
      await D.say('Four fortune tellers live here, and each one tells your fortune its own way.', { at: '.ft-grid', ring: false });
      await D.you(card('oracle'), 'Tap the Oracle Dial to ask it.', { until: function () { return !!window.__oracle; } });
      await D.wait(function () { var c = document.querySelector('.orc-cv'); return c && c.classList.contains('on'); }, 6000);
      await D.wait(400);
      await D.say('The Oracle Dial is an old penny-arcade machine with thirty fortunes printed around its dial.', { at: '.orc-cv' });
      await D.you('.orc-coin', 'Tap the coin to drop it in the slot.', { until: function () { var s = window.__oracle && window.__oracle.state(); return s && s.phase !== 'idle'; } });
      await D.say('The coin sets the dial whirring round until it clicks to a stop.', { at: '.orc-cv', wait: false });
      await D.wait(oracleDone, 25000);
      await D.wait(700);
      await D.say('The fortune under the black pointer is yours, and the machine prints it on a ticket.', { at: '.orc-card' });
      await D.say('You can switch tellers any time by tapping the teller’s name at the top of the screen.', { pos: 'center', ring: false });
      await D.set(function () { F.picker(); });
      await D.wait(function () { return document.querySelector(card('swami')); }, 4000);
      await D.say('The Fortune Cookie and the Mystic 8 Ball are here too. This time, try The Great Zandor.', { at: card('swami') });
      await D.tap(card('swami'), { after: 300 });
      await D.wait(function () { return !!window.__zandor && document.querySelector('.zd-hit.coin'); }, 6000);
      await D.wait(900);
      await D.tap('.zd-hit.coin', { say: 'Drop a token in Zandor’s slot, and he waves his hands over the crystal ball.' });
      await D.wait(function () { return document.querySelector('.zd-card'); }, 15000);
      await D.wait(2400);
      await D.tap('.zd-card', { after: 900 });
      await D.say('Zandor printed your fortune on a card, with your lucky number and your lucky day.', { at: function () { return document.querySelector('.zd-big') || document.querySelector('.zd-card'); } });
    }
  });
})();
