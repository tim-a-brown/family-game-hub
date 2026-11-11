# Places as each player's own stack: a rules prototype

A rules test with numbers, not a build. Nothing under `games/` is changed. Everything here is a fork.

- `RULES.md`: the tabletop rules sheet for Places as recommended.
- `results.txt`: the tables from the test games, with what each one says.
- `place-cards.json`: the ten draft cards that act on Places: what each says, what it should cost, and the history
  behind it.
- `places.json`: the draft list of 60 Places (the 12 the game has, and 48 new), each with its domain, its rule, its
  region, where it is on the map and one true sentence. The seven domains and the eighteen rules are at the top.
- `cards-places.js`: the card pool for the test games: the game's own cards (read from `games/anoria/cards.js`), the ten
  draft cards that act on Places (`NEW`), and the Places from `places.json`.
- `engine-places.js`: a copy of `games/anoria/engine.js` with the new rules behind switches. With no stacks handed to
  `play()` it plays exactly as the game's engine does (checked: the same winner, rounds and Renown, game for game).
- `run-places.js`: the experiments.

## Running it

    node scripts/anoria/places/run-places.js <experiment> [games per pairing]

Each cell is the five ready decks against each other in both seats: 20 pairings times the number you give (100 gives
2,000 games a cell). `cards` takes a number of games instead. The experiments are listed at the top of the file:
`base`, `setup`, `edge`, `stack`, `domin`, `powers`, `cards`, `use`, and `tune` for one-off comparisons. A fourth
argument is a json of switches added to every cell, for example `'{"dom":"all","domMin":4}'`. On this machine a game takes about 45 ms.

## The switches (cfg)

- `stacks: 1`, with the two stacks as the last argument of `play()`: each player brings a stack of Places.
- `setup`: `'top2'` (the top card is your Gate, the next your Outpost, and first dibs turns one more), `'pick3'` (draw
  three, lay two, offer the third for the Crossroads), `'free'` (choose from the whole stack).
- `comp`: what the player without first dibs gets: `'first'` or `'second'` turn, `'card'`, `'spark'`.
- `edge`: what the player whose Place lies at the Crossroads gets: `'ties'` (wins ties there while they have a Figure
  there), `'ties0'` (even with nobody there), `'might'` (+1 Might for their Figures there), `'power'` (its rule works
  only for them), `'powerAll'` (every Place's rule works only for its owner).
- `dom`: holding several domains: `'three'` (Places of `domN` different domains score 1 more Renown), `'pair'` (two
  Places of one domain pay double), `'all'` (a Place of every domain on the table wins; `domMin` domains needed).
- `sealRule: 'last'`: a Law Place keeps only your last Seal from being broken (without it, every Seal).
- `gatepay: 1`: Commerce Places pay at a Gate too (they don't, in the recommended rules). `tame: 1`: a rule that pays
  whoever holds the Place pays only a player with a Figure there. Both were tried and are in `results.txt`.
- `candTo: 'bottom'`: the Place offered for the Crossroads and not used goes under the stack, not to the discard pile.

## What the robots know

A robot counts Might, Renown and Seals as before, and now also what a Place's rule is worth to whoever holds it
(`pval`). When it weighs a card that turns up a Place it can't see (Earthquake, The Cape Route, Constantine, Pachacuti)
it shuffles the stacks in its head a few times and takes the average, so it never peeks at the top card. At set-up it
chooses its Gate, Outpost and offer by how many of its Figures are at home there and by a table of what each rule is
worth at each spot (`PV`).
