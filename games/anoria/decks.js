// Anoria: the deck builder. STAND-IN until the real screen is built: AnoriaDecks.open(id, done) builds one for you.
(function () {
  'use strict';
  window.AnoriaDecks = {
    open: function (id, done) {
      var U = window.AnoriaUI, Coll = U.Coll;
      Kit.sheet({ title: 'Build a deck', html: '<p>The deck builder is on its way. For now this makes a deck from the cards you own.</p>', actions: [{ label: 'Make one', primary: true, onClick: function () { Coll.saveDeck({ n: 'My deck', guide: Coll.load().guides[0], cards: Coll.finish({ cards: [] }) }); } }, { label: 'Cancel', cls: 'btn-ghost' }], onClose: function () { setTimeout(function () { if (done) done(); }, 0); } });
    }
  };
})();
