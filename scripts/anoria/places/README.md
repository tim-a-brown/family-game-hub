# Domains as each player's own stack: a rules prototype

A rules test with numbers, not a build. Nothing under `games/` is changed. Everything here is a fork.

**The words.** The card that lies at a Gate, an Outpost or the Crossroads is a **Domain**. A Domain has one **kind**
(a Commerce, Industry, Thought, Land, Culture, Law or Routes Domain) and one **home** region. Gate, Outpost and
Crossroads are the three **positions**. The folder and the code keep their first names (`places`, `PLACES`, `pw` for a
rule, `d` for a kind), the way the game's code still says `threads` for Legacy Lines.

- `RULES.md`: the tabletop rules sheet, with what a real table has to track and the pieces in the box.
- `results.txt`: the tables from the test games, with what each one says.
- `domains.json`: the draft list of 75 Domains (the 12 Places the game has, and 63 new), fifteen for each ready deck,
  each with its kind, its rule, its home, where it is on the map and one true sentence. The seven kinds and the
  eighteen rules are at the top.
- `domain-cards.json`: the thirteen draft cards that act on Domains: what each says, what it should cost, the history
  behind it and whether it is worth having.
- `cards-places.js`: the card pool for the test games: the game's own cards (read from `games/anoria/cards.js`), the
  draft cards (`NEW`, `MOVE`) and the Domains from `domains.json`.
- `engine-places.js`: a copy of `games/anoria/engine.js` with the new rules behind switches. With no stacks handed to
  `play()` it plays exactly as the game's engine does (checked: the same winner, rounds and Renown, game for game).
- `refork/`: the six edits that turn the game's engine into `engine-places.js`. When the game's engine changes:
  `cp games/anoria/engine.js scripts/anoria/places/engine-places.js`, then run each `refork/*.py` on it in order.
  An edit that no longer finds its place stops with the text it was looking for.
- `run-places.js`: the experiments. `homes.js`: the ready stacks by home and by kind beside their decks' Figures.

## Running it

    node scripts/anoria/places/run-places.js <experiment> [games per pairing] ['<json of switches>']

Each cell is the five ready decks against each other in both seats: 20 pairings times the number you give (100 gives
2,000 games a cell). `cards` takes a number of games instead. The experiments are listed at the top of the file:
`base`, `setup`, `edge`, `stack`, `built`, `moves`, `powers`, `domin`, `cards`, `use`, and `tune` for one-off
comparisons. On this machine a game takes about 45 ms.

## The switches (cfg)

- `stacks: 1`, with the two stacks as the last argument of `play()`: each player brings a stack of Domains.
- `setup`: `'top2'` (the top card is your Gate, the next your Outpost, and first dibs turns one more), `'pick3'` (draw
  three, lay two, offer the third for the Crossroads), `'free'` (choose from the whole stack).
- `comp`: what the player without first dibs gets: `'first'` or `'second'` turn, `'card'`, `'spark'`.
- `edge`: what the player whose Domain lies at the Crossroads gets: `'ties'` (wins ties there while they have a Figure
  there), `'ties0'` (even with nobody there), `'might'` (+1 Might for their Figures there), `'power'` (its rule works
  only for them), `'powerAll'` (every Domain's rule works only for its owner).
- `cheap1: 1`: a Commerce Domain makes the first Figure a player lays there each turn cheaper, not every one.
- `peaceSym: 1`: at a Law Domain nobody can start a clash (as recommended, only the player who holds it can).
- `gatepay: 1`: Commerce Domains pay at a Gate too. `tame: 1`: a rule that pays whoever holds the Domain pays only a
  player with a Figure there. `fortN`: the Might a Land Domain gives defenders.
- Tried and left out, kept for the record: `dom` (holding Domains of several kinds: `'three'`, `'pair'`, `'all'`),
  `sealRule` and `sealPeace` (the Law rule that kept a Seal from breaking), `vdie` (Congress of Vienna by a die).
- `candTo: 'bottom'`: the Domain offered for the Crossroads and not used goes under the stack, not to the discard pile.

## What the robots know

A robot counts Might, Renown and Seals as before, and now also what a Domain's rule is worth to whoever holds it
(`pval`). When it weighs a card that turns up a Domain it can't see (Earthquake, The Cape Route, Constantine, Pachacuti)
it shuffles the stacks in its head a few times and takes the average, so it never peeks at the top card. At set-up it
chooses its Gate, Outpost and offer by how many of its Figures are at home there and by a table of what each rule is
worth at each position (`PV`).
