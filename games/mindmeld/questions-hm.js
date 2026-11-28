// Hive Mind's own question cards (Calliope Games; used with permission: CLAUDE.md, Hive Mind). The page plays these
// first and then the house questions in games/mindmeld-data.js. None are typed in yet: they can be copied from the
// cards in the box. Each card is written the same way as the house questions:
//   {q: what it asks, n: how many answers to write (1 to 4), a: [[answer, weight, ...other ways to say it]]}
// The weight is roughly how often people give that answer (the computer players draw from it), and the other ways to
// say an answer help the game stack matching answers on its own. A card with no answers yet ({q, n, a: []}) still
// plays; the computer players then write nothing for it, and only people's answers count.
window.HIVEMIND_PROMPTS = [
];
