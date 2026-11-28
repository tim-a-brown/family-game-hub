// Hive Mind's own question cards (Calliope Games; used with permission: CLAUDE.md, Hive Mind). The page deals these
// first and then the house questions in games/mindmeld-data.js (three to a card, in order). None are typed in yet: they
// can be copied from the cards in the box, one entry a card, its three questions in the order they are printed:
//   {qs: [{q, n, a}, {q, n, a}, {q, n, a}]}
//   q: what it asks; n: how many responses to write (1 to 4); a: [[response, weight, ...other ways to say it]]
// The weight is roughly how often people give that response (the computer players draw from it), and the other ways to
// say it help the game stack matching responses on its own. A question with no responses yet ({q, n, a: []}) still
// plays; the computer players then think along with the people at the table (games/mindmeld-core.js, cpuOwn).
window.HIVEMIND_CARDS = [
];
