// Anoria: the Library. STAND-IN until the real screen is built: AnoriaLibrary.open(done) shows what you own.
(function () {
  'use strict';
  window.AnoriaLibrary = {
    open: function (done) { var U = window.AnoriaUI, c = U.Coll.counts(); Kit.sheet({ title: 'Library', html: '<p>You own ' + c.own + ' of ' + c.cards + ' cards.</p>', actions: [{ label: 'Done', primary: true }], onClose: function () { if (done) done(); } }); }
  };
})();
