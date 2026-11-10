# Anoria rules simulator

The whole game as code, so rules and card numbers can be tested by playing thousands of robot games.

- `cards.js`: the test card pool (Figures, Relics, Deeds, Guides, Places) and five built decks.
- `sim.js`: the rules engine for 2 to 6 players, and robot players with five styles of play.
- `run.js` + `exp2.js`: the experiments. `node run.js <name> [games]`:
  `rules`, `tension`, `tension2`, `tension3`, `length` compare core rules; `cards` measures every card, Guide,
  faction pair and combo with random decks; `styles` plays robot styles against each other; `decks` plays the built
  decks against each other (`decks2`: with Legacy lines needing a nearby inspirer); `multi` plays 2, 3, 4 and 6 players.
- `fin-*.txt`: the results the design doc quotes.

The standard rules are `STD` at the top of `exp2.js`.
