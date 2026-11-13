# Anoria rules simulator

The whole game as code, so rules and card numbers can be tested by playing thousands of robot games.

- `cards.js`: the test card pool (Figures, Relics, Deeds, Guides, Places) and five built decks. `RETIRED`: cards that have left
  the set and the card that has each one's slot; the engine still plays them, for a game saved with one.
- `sim.js`: the rules engine for 2 to 6 players, and robot players with five styles of play.
- `run.js` + `exp2.js`: the experiments. `node run.js <name> [games]`:
  `rules`, `tension`, `tension2`, `tension3`, `length` compare core rules; `cards` measures every card, Guide,
  faction pair and combo with random decks; `styles` plays robot styles against each other; `decks` plays the built
  decks against each other (`decks2`: with Legacy lines needing a nearby inspirer); `multi` plays 2, 3, 4 and 6 players.
- `fin-*.txt`: the results the design doc quotes.

The standard rules are `STD` at the top of `exp2.js`.

## Packs: two packs make a deck

`node scripts/anoria/mash.js [games per matchup]` treats each ready deck's different cards as a pack (15 when this was run,
20 now) and plays every deck you can
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
- `node scripts/anoria/scoring.js "<label>" '<json>' [games] [copies of each card]`: the ready decks under a scoring
  rule, with how long games run, how they end, how often the lead changes hands and how often a deck runs out.
- Scoring is flat since 2026-11-11: every Place scores 1 Renown every round, first to 30, and a deck is 40 cards (`DECK` in
  `games/anoria/coll.js`; each ready deck is 20 different cards, two of each). `variants.txt` ("Decks of 40") has the
  before and after. The old doubling is `{"ramp":[1,1,1,2,2,2]}` for `variant.js` and `scoring.js`.
- `node scripts/anoria/endings.js "<label>" '<json of rule changes>' [games per pair] [first seed]`: the ready decks under
  a rule, on any set of games (the seed), with each deck's share of wins, how long games run, how they end and which decks
  win on Seals, and how often a draw pile runs out and how many of their cards a player draws. `"cards"` in the json
  tries other numbers on a card without touching cards.js; `"log":1` adds the round the piles ran out in. It is what
  the "First to 25" part of `variants.txt` was made with (the target, four Seals, decks of 40 or 50).
- The game's rules (`STD`) now have `dice: 'high'` (two ordinary dice, the higher roll adds 1 Might, 2 when higher by 3
  or more), `unique: 1` (one of each person on your side at a time) and `ret: 1` (a Figure whose other copy is in your
  discard pile costs 1 less). Earlier result files were run before these.

## Robots, Threads and collecting

- `node scripts/anoria/skill.js [games]`: Easy, Normal and Hard against each other (`skill.txt`). Easy stops its turn
  early some of the time (`quit`), which is what makes it easy; noise alone barely did.
- Threads (`cfg.threads`): any card can name what it grew from (`from` in cards.js). `variants.txt` has the test games
  for the three ways of rewarding it.
- `node scripts/anoria/pacing.js [players] [games a day] [win chance] [cards in a daily pack] [cards in a one-time pack] [edition odds] [welcome packs] [pack order] [second-series pack]`: plays the collection's own rules
  (`games/anoria/coll.js`) for someone who plays every day, checks them, and says how long the set takes (`pacing.txt`).
  It also checks that a collection and a built deck from when a deck was 30 cards still work (the five new cards of every
  ready deck that could be played are given; the old deck is kept and reads as 10 short).
  It plays the editions too (every card out of a pack is Matte, Shiny, Silver foil, Gold foil or Rainbow foil): how often
  a pack holds a foil, when the first of each edition is found, and how long the foils go on after the set is complete. A
  sixth argument tries other edition odds ("0.085,0.04,0.018,0.007": Shiny, Silver foil, Gold foil, Rainbow foil).
- `node scripts/anoria/rarity.js [games]`: how rare each card is. More powerful cards are rarer in packs, and this measures
  power: each card's win rate in random decks, less its faction's (in the deck, and when played), together with its cost.
  It ranks the set and cuts it into four tiers (the top 10% Legendary, then 20% Rare, 30% Uncommon, the rest Common) and
  prints the `RARE` lists for `games/anoria/coll.js` (`rarity.txt` has the table). A new set is tiered by running it again
  and pasting the lists; until then a card on none of them goes by its cost. Then run `pacing.js`.

## The third printing (150 cards found only in packs)

- `set-150.json` is where the 150 came from: each card's source page, whether a search or a full text confirmed it
  (`sure`, `check`), why a Relic's or a Deed's history suits its effect (`fit`), what was dropped, the five people held
  aside because they are Guides, and the five cards that still need engine work (`needsEngine`). The cards themselves
  are in `games/anoria/cards.js` (`P3`, `pr: 3`) and `text.js` (`P3`) since 2026-11-11, and those two files are what
  the game reads.
- `node scripts/anoria/check-set.js`: checks the third printing against the engine (skills, arrival effects, the
  effect each Relic and Deed has), its words against its skills, every Legacy Line and its sentence, the picture
  briefs (both top corners, the head a fifth of the way down), and the game's files against `set-150.json`.
- A Relic's or a Deed's effect is data: `fx` names the card whose effect it has (`engine.js` `fxOf`). A player has two
  Relics in play and no two with the same power. `node scripts/anoria/relics2.js [games]` plays that rule against
  letting the power count twice (`set-150-balance.txt`).
- `node scripts/anoria/relicfx.js [games] [seed] ['<json>'] [relic,relic,...]`: every Relic power on the same games (two
  copies in one player's deck of random cards with no other Relics, against a deck with none), so the lines differ only
  by the Relic. It is how the Timbuktu Manuscripts' power (hold 10 cards) was measured (`relics-2026-11-13.txt`), and
  what the proposal for more Relic powers was measured with (`relics-proposal.md`). The fifteen new powers were built on
  2026-11-13 with Tim's decisions, and measured again with it (`relics-2026-11-13b.txt`); `'{"cards":{"tablet":{"c":3}}}'`
  tries a Relic at another cost. `deeds-test.js` holds every Relic power to its card.
- `node scripts/anoria/run.js cards 6000 [seed] > cards.txt`, then `node scripts/anoria/newcards.js cards.txt`: every
  card of the third printing beside the cards its faction had before (in the deck, and when played), and which are
  outside what the faction had. A random deck now holds 0 to 3 Relic cards (`randDeck`).
- `node scripts/anoria/newdecks.js [games] [decks per pair of factions] [seed]`: decks built by the deck builder's
  "Finish the deck for me" from the third printing alone, and from every card, in each pair of factions, against the
  five ready decks. It is the test that no pair of factions with the new cards runs away with it.
- `pacing.js` takes three more arguments: the welcome packs (`12,12,12,12,12`), the pack order (`series` or `mixed`)
  and the size of an earned pack once the first series is complete. `pacing.txt` has the table for 241 cards.
- `set-150-balance.txt`: the results of all of these for the set as it was merged.
- `node scripts/anoria/onecard.js <card> [games] <json of changes>`: one card measured on purpose, two copies in one
  player's deck every game, as it is and under each change (as '[{"m":2}]'). For a card whose "played" number stands
  out in `run.js cards`, where it rests on a few hundred games.
- `node scripts/anoria/rarity.js 6000 3` tiers the third printing among its own cards (`RARE3` in coll.js). The cards
  the game had before keep the tiers they had.

## Domains (each player's own stack of 15)

- The rules are in `games/anoria/engine.js` since 2026-11-11 (a game given stacks has `S.dm`), the 75 Domains and the
  five ready stacks in `cards.js` (`PLACES`, `STACKS`), their words in `text.js`. `places/RULES.md` is the sheet a
  person reads at a table, and `places/` is the prototype it was settled on (its own fork of the engine: history now).
- **Every script here now plays with Domains.** `play()` in engine.js deals each ready deck its ready stack, and any
  other deck fifteen Domains at random, whenever the rules have `dm` (`STD` does). `'{"dm":0}'` as the json of rule
  changes plays the old fixed map of twelve Places: `node scripts/anoria/endings.js "the old map" '{"dm":0}' 100`.
- `node scripts/anoria/domains.js <experiment> [games per pairing] ['<json>'] [seed]`: the Domain questions on the
  real engine: `base` (the old map beside Domains), `decks` (the ready decks with their ready stacks on four sets of
  games), `rules` (every rule at every position, every kind, home and Domain), `law`, `built` (a stack chosen for the
  deck against the ready stacks), `six` (Domain cards in the ready decks), `use` and `cards` (the Domain cards),
  `setup` (how well each robot lays its three Domains), `each` (every Domain's power at every position: the five
  Domains of each game laid by hand from a schedule; `ONLY=a,b` for a few, `'{"dv":{...}}'` for other numbers or
  `'{"dv":{"off":["word"]}}'` to switch a power off as a control). `domains.txt` has the tables and what each one says.
- Every Domain has a power of its own (2026-11-12): `node scripts/anoria/powers-test.js` lays a table by hand for each
  and checks it against its sentence. Run it after any change to a power.
- The seven cards of 2026-11-12 (the Roman Triumph, Medici Patronage, the Hanseatic League, the Jubilee of 1300, the
  Tribune's Veto, Pope Leo I, the Theodosian Walls) and the Quick powers Testudo and the Defence of Syracuse were given
  that day: `node scripts/anoria/deeds-test.js` checks each against its card, limits included (Ward, what the Veto can
  cancel, the 4 Seals). `node scripts/anoria/twocopies.js <card> [games] [seed] ['<json>']` plays each ready deck with
  none, one and two copies of a card, to see whether a second copy adds much. `deeds-2026-11-12.txt` has the numbers.
- `pacing.js` takes three more arguments again: the chance an earned pack holds a Domain, the Domains in a welcome
  pack, and the series the Domain cards are found in. `pacing.txt` has the table.

## Three to six players, and teams (2026-11-13)

- The engine plays 2 to 6 players, everyone for themselves or in teams (`cfg.teams`, teammates on alternating spokes);
  the header of `games/anoria/engine.js` lists what a game of more players adds to the state and the events.
- `node scripts/anoria/players.js <shape> [games] [first seed] ['<json>']`: the five ready decks round the table, each
  with its own robot style, on four threads. Shapes `2` to `6`, `2v2`, `3v3`, `2v2v2`. It says how often each seat
  wins counted from the first player (each team, from the first player's team), each deck's share, how long games run,
  how they end and how many players are put out and when. `"prof":"normal"` plays every seat with one robot;
  `"byN":{"4":{...}}` gives rules to one shape only.
- `node scripts/anoria/players-test.js`: the rules for more players and teams on tables laid by hand (who is put out,
  who wins, turn order, set-up rolls, teams, and the cards whose meaning changes with more players).
- `players-2026-11-13.txt` has the numbers and what they say.
- A two-player game is untouched: `endings.js` gives the same results line for line.

## The first Figures that cost 1 Spark

- `node scripts/anoria/spark1.js one <card> [games] ['<json of changes>'] [extra card]`: one card two copies in a deck in
  every game (as `onecard.js`), with an extra card's two copies too if given (a Legacy Figure with its source).
- `node scripts/anoria/spark1.js games [games] [seed]`: the same random decks with and without the 1-Spark Figures of
  their factions: game length, Renown from Domains held unopposed, the outnumbering cards and Domains, and one deck
  against itself without them. Results in `spark1-2026-11-13.txt`.
