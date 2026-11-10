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

## Packs: two packs make a deck

`node scripts/anoria/mash.js [games per matchup]` treats each ready deck as a 15-card pack and plays every deck you can
make from two of them (one of each card), plus each pack twice (the tuned decks), all against all. It is the fairness
test for a new pack: add its 15 cards and Guide to `ARCH` and run it. First run (40 games per matchup, 560 per deck):
mixed decks 50.2% on average (43.2 to 57.1), one pack twice 49.7% (44.3 to 52.5). Results in `mash-40.txt`.

## Collecting: copies of a card, and packs

- `node scripts/anoria/copies.js star|cap [games]`: one strong card at 1 to 6 copies, and whole decks built to a cap of
  2, 3, 4 or 6, each with and without `cfg.unique` (one of each person on your side of the table at a time). Results in
  `copies-star.txt`, `copies-cap.txt`; the five ready decks under `cfg.unique` in `unique-rule.txt`.
- `node scripts/anoria/packs.js [trials]`: how fast packs of 12 fill a collection that starts from one ready deck.
  Results in `packs.txt`.

## Dice, and the second copy

- `node scripts/anoria/dice.js [games]`: what the clash roll does under each kind of die (`dice.txt`).
- `node scripts/anoria/variant.js "<label>" '<json>' [games]`: the five ready decks under any rule change (`variants.txt`).
- The game's rules (`STD`) now have `dice: 'high'` (two ordinary dice, the higher roll adds 1 Might, 2 when higher by 3
  or more), `unique: 1` (one of each person on your side at a time) and `ret: 1` (a Figure whose other copy is in your
  discard pile costs 1 less). Earlier result files were run before these.

## Robots, Threads and collecting

- `node scripts/anoria/skill.js [games]`: Easy, Normal and Hard against each other (`skill.txt`). Easy stops its turn
  early some of the time (`quit`), which is what makes it easy; noise alone barely did.
- Threads (`cfg.threads`): any card can name what it grew from (`from` in cards.js). `variants.txt` has the test games
  for the three ways of rewarding it.
- `node scripts/anoria/pacing.js [players] [games a day] [win chance]`: plays the collection's own rules
  (`games/anoria/coll.js`) for someone who plays every day, checks them, and says how long the set takes (`pacing.txt`).
