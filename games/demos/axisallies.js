// Axis & Allies' demo (demo.js; CLAUDE.md, Demos): the opening of the Soviet Union's first turn in the 1942 game. You
// buy infantry; the troops in Karelia attack Belorussia; you roll the battle's dice. The rest of the turn is told, not played.
(function () {
  'use strict';
  var A = window.__aa;
  function S() { return A.S; }
  function ter(name) { return function () { return document.querySelector('#gLand #tp' + A.NAME[name]); }; }
  function btn(re, scope) { return function () { return [].slice.call(document.querySelectorAll((scope || '.aa-side') + ' .btn')).filter(function (b) { return re.test(b.textContent.trim()); })[0]; }; }
  function tileFor(name) { return function () { return document.querySelector('.aa-side .btile[aria-label^="Buy a ' + name + ',"]'); }; }
  function battle() { return S() && S().B; }
  function step() { var B = battle(); return B ? B.step : ''; }

  Kit.demoScript({
    intro: 'Here’s the start of a turn in Axis & Allies. You’ll buy troops and roll for a battle yourself.',
    beats: 12,
    end: 'Each turn, buy units, attack with what can reach, roll the battles, then move, place and collect your income.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      A.newGame({ map: 'full', vc: 'std', cas: 'auto', speed: 'normal', limit: '0', order: 'su', tech: 'off', neu: 'off', guide: false,
        seats: [{ name: me, cpu: false, powers: ['su', 'uk', 'us'] }, { name: 'Bender', cpu: true, powers: ['de', 'jp'] }] });
    },
    steps: async function (D) {
      await D.wait(function () { return document.querySelector('.aa-banner.show .btn'); }, 5000);
      await D.say('You command the Allies, and Bender commands Germany and Japan. The Soviet Union moves first.', { at: '.aa-banner .card' });
      await D.tap('.aa-banner .btn', { after: 700 });
      await D.say('A turn starts with buying units. The Soviet Union has 24 IPCs to spend.', { at: '.aa-side .shop-top .money' });
      await D.you(tileFor('Infantry'), 'Infantry cost 3 IPCs each. Tap Infantry to buy one. New units join the board at the end of the turn.', { until: function () { return (S().buy.inf || 0) >= 1; } });
      await D.tap(tileFor('Infantry'), { after: 300 });
      await D.tap(tileFor('Infantry'), { after: 300 });
      await D.tap(tileFor('Artillery'), { after: 500 });
      await D.tap(btn(/^Buy for/), { after: 700 });
      await D.wait(function () { return S().phase === 'cm'; }, 4000);
      await D.set(function () { A.focusOn(A.NAME['Belorussia'], Math.max(A.V.s, 1.25)); });
      await D.wait(600);
      await D.say('Next comes the combat move: units march into enemy land to attack it. Tap a territory to pick up its units.', { at: ter('Karelia') });
      await D.tap(ter('Karelia'), { after: 600 });
      await D.tap(btn(/^Select all$/), { after: 500 });
      await D.say('Karelia has four infantry, an artillery and a fighter, all picked up now. The red places are enemy land they can reach.', { at: '.aa-side .urows' });
      await D.you(ter('Belorussia'), 'Tap Belorussia, held by three German infantry, to attack it.', { until: function () { return !!document.querySelector('.aa-side .preview'); } });
      await D.wait(400);
      await D.say('Before you commit, the game shows your chance of winning the battle.', { at: '.aa-side .preview .pv-odds', wait: 2600 });
      await D.tap(btn(/^Attack$/), { after: 600 });
      await D.tap(btn(/^Fight the battle$/), { after: 700 });
      await D.tap(btn(/^Fight:/), { after: 700 });
      await D.wait(function () { return document.querySelector('.bt.show') && step() === 'pre'; }, 5000);
      await D.wait(500);
      await D.say('In a battle, every unit rolls one die. Each one stands in the column of the number it hits on: that number or lower is a hit.', { at: '.bt .bdb', avoid: ['.bt .bacts'] });
      await D.you(btn(/^Roll the dice$/, '.bt'), 'Tap Roll the dice.', { until: function () { return step() !== 'pre'; } });
      // rounds go on until one side is gone or the attacker stops
      for (var r = 0; r < 6; r++) {
        await D.wait(function () { var s = step(); return s === 'decide' || s === 'end' || s === 'cas'; }, 12000);
        if (step() === 'end') break;
        if (r === 0) await D.say('Each hit takes away one enemy unit. The defenders fire back, so the battle goes on round by round.', { at: '.bt .bdb', avoid: ['.bt .bacts'], wait: 3600 });
        await D.tap(btn(/^Roll again$/, '.bt'), { after: 600 });
      }
      await D.wait(function () { return step() === 'end'; }, 12000);
      await D.wait(900);
      await D.say('Belorussia is yours, and its income goes to the Soviet Union from now on.', { at: '.bt .bdb', avoid: ['.bt .bacts'] });
      await D.tap(btn(/^Done$/, '.bt'), { after: 1200 });
      await D.say('Then you move the rest of your units, place what you bought, and collect income. Britain and the United States take their turns too, with Germany and Japan between them.', { at: '.aa-steps' });
    }
  });
})();
