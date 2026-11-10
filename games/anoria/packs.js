// Anoria: choosing your starter and opening packs. STAND-IN until the real screens are built.
//   AnoriaPacks.chooseStarter(app, done)  the first time: pick a Guide's deck, then open the welcome packs
//   AnoriaPacks.open(done)                open the packs that are waiting
//   AnoriaPacks.earned(list, done)        show what a game earned ([{t:'pack', pack} | {t:'guide', g}]), then open packs
(function () {
  'use strict';
  function openAll(done) {
    var U = window.AnoriaUI, Coll = U.Coll, got = [], r; while ((r = Coll.openPack())) got = got.concat(r.cards);
    if (!got.length) { Kit.sheet({ title: 'No packs to open', html: '<p>' + Kit.esc(Coll.nextUp()[0].when) + ' earns the next one.</p>', actions: [{ label: 'OK', primary: true }], onClose: function () { if (done) done(); } }); return; }
    Kit.sheet({ title: 'You opened ' + got.length + ' cards', html: '<p>' + got.map(function (x) { return Kit.esc(U.CARDS[x.c].n) + (x.first ? ' (new)' : ''); }).join(', ') + '</p>', actions: [{ label: 'Done', primary: true }], onClose: function () { if (done) done(); } });
  }
  window.AnoriaPacks = {
    chooseStarter: function (app, done) {
      var U = window.AnoriaUI, box = Kit.el('div', { class: 'stack', style: { padding: '20px' } }, [Kit.el('h1', { text: 'Choose your Guide' })]);
      U.DECKS.forEach(function (n) { box.appendChild(Kit.el('button', { type: 'button', class: 'btn btn-soft btn-block', text: U.TX.GUIDES[U.C.ARCH[n].guide].n + ': ' + n, onclick: function () { U.Coll.chooseStarter(n); openAll(done); } })); });
      app.innerHTML = ''; app.appendChild(box);
    },
    open: openAll,
    earned: function (list, done) { openAll(done); }
  };
})();
