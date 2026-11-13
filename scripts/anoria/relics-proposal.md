# More Relic powers: a proposal (2026-11-13, not built)

Tim: "honestly, I'd like to see a lot more variation on what relics can do to minimize overlap and create new
possibilities". This is a proposal for him to approve. Nothing in it is in the game except the Timbuktu Manuscripts'
power (hold 10 cards), which he approved and which is built (`relics-2026-11-13.txt`).

## Where things stand

There are **34 Relics** (28 from before the prime set, plus its 6: Greek Fire, Mysore Rockets, Harrison's Watch, the
Stick Chart, the Rain Gauge and the Dresden Codex). Today they share 7 powers:

| Power | Relics |
|---|---|
| Printing Press: draw one more card each turn | 9 |
| Compass: walk two steps | 9 |
| Antikythera Mechanism: jump once a turn | 8 |
| Damascus Steel: +1 Might when attacking | 3 |
| Abacus: Deeds cost 1 less | 2 |
| Timbuktu Manuscripts: hold 10 cards (built today) | 2 |
| Boundary Stone: protects your Gate's and Outpost's Domains | 1 |

## The proposal in one table

22 powers for 34 Relics: the 7 of today, and **15 new ones**. No power is on more than 4 Relics; 15 Relics have a power
of their own. Every sentence is in the game's own words, and nothing in it is hidden on a real table (the one new thing
a table has to show is a hand laid face up, for the Telescope).

| Power | Sentence on the card | Relics | Cost |
|---|---|---|---|
| Compass (kept) | Your Figures can walk two steps. | Compass, Astrolabe, Birchbark Canoe, Stick Chart | 1 |
| Jump (kept, named for the Balloon) | Once a turn, jump one of your Figures to any Domain. It can't act again this turn. | Montgolfier Balloon, Wright Flyer, Sextant, Harrison's Watch | 3 |
| Printing Press (kept) | Draw one more card each turn. | Printing Press, Paper, Telegraph | 2 |
| Manuscripts (built) | You can hold 10 cards in your hand. | Timbuktu Manuscripts, Quipu | 2 |
| Abacus (kept) | Your Deeds cost 1 less. | Abacus, Rain Gauge | 2 |
| Damascus Steel (kept) | Your Figures have +1 Might when attacking. | Damascus Steel | 2 |
| Boundary Stone (kept) | Opponents' cards can't replace or move the Domains at your Gate and your Outpost, or switch off their powers. | Boundary Stone | 1 |
| **Foresight** | At the start of your turn, before you draw, look at the top 3 cards of your draw pile and put them back in any order. | Antikythera Mechanism, Dresden Codex | 2 (Antikythera from 3) |
| **Landing** | You can play your Figures at the Crossroads. | Viking Longship, Voyaging Canoe | 3 (2 proposed) |
| **Convoy** | When one of your Figures walks, one other Figure of yours at the same Domain can walk with it. | The Wheel | 1 |
| **Railway** | Once a turn, one of your Figures at your Gate can walk to any Domain where you have another Figure. | Steam Locomotive | 1 |
| **Charge** | Your Figures can start a clash on a turn they walk. | Stirrup | 1 |
| **Rebuilding** | Once a game, when a round ends, mend one of your broken Seals. | Inca Rope Bridge | 1 |
| **Homecoming** | Once a round, when one of your Figures is knocked out, it goes back into your hand. | Cyrus Cylinder | 1 |
| **Bastion** | Your Figures have +1 Might when defending at your Gate or your Outpost. | Greek Fire | 2 |
| **Volley** | Once a turn, one of your Figures can start a clash with an enemy Figure at the next Domain. | Mysore Rockets | 2 |
| **Decipher** | Each Legacy Line you make scores 1 more Renown. | Rosetta Stone | 2 |
| **Far sight** | Your opponents play with their hands face up. | Telescope | 2 (1 proposed) |
| **Reading** | When you play a Scholar Figure, you draw one more card. | Braille | 2 |
| **Stores** | You gain 1 more Spark at the start of each turn. | Clay Tablet | 2 (3 proposed) |
| **Library Cave** | Once a turn, you can pay 1 Spark to take a card from your discard pile into your hand. | Dunhuang Star Chart | 2 |
| **Safe conduct** | Your Figures never miss a turn. | Paiza | 3 (1 proposed) |

How many Relics each power has: Compass 4, Jump 4, Printing Press 3, Manuscripts 2, Abacus 2, Foresight 2, Landing 2,
and 1 each for Damascus Steel, the Boundary Stone, Convoy, Railway, Charge, Rebuilding, Homecoming, Bastion, Volley,
Decipher, Far sight, Reading, Stores, Library Cave and Safe conduct.

Relics that share a power must share a cost (check-set.js holds the text and cost of a Relic to the card its `fx`
names). That is why Foresight asks for the Antikythera Mechanism at 2. The other cost changes in the last column are
suggestions from the first measure, below, not requirements.

## Every Relic

"Measure" is the first balance pass (below): player A's share of wins with two copies of a Relic with that power in a
deck of random cards, on the same games for every line, against **49.1% with no Relic** (49.0 and 49.2 in the two runs).
± is about 1.1 to 1.3. A power's Relics all measure the same, since the engine sees only the power.

| Relic | Cost | Today | Proposed | Why it is true to the object | Engine work | Measure |
|---|---|---|---|---|---|---|
| Compass | 1 | Compass | Compass (kept) | Chinese sailors steered by it a thousand years ago. | none | 52.1 (+3.0) |
| Astrolabe | 1 | Compass | Compass (kept) | A traveler's instrument: it found the time and the direction of Mecca anywhere. Its Legacy Line to the Sextant still joins two powers. | none | 52.1 (+3.0) |
| Birchbark Canoe | 1 | Compass | Compass (kept) | Light enough to carry between rivers: a long way overland and by water. | none | 52.1 (+3.0) |
| Stick Chart | 1 | Compass | Compass (kept) | Marshallese navigators crossed from island to island by the swells it charts. | none | 52.1 (+3.0) |
| Montgolfier Balloon | 3 | Antikythera | Jump (kept) | The first flight over Paris: up and over everything in between. | the jump's `fx` key becomes `balloon` | 51.9 (+2.8) |
| Wright Flyer | 3 | Antikythera | Jump (kept) | Powered flight. | as above | 51.9 (+2.8) |
| Sextant | 3 | Antikythera | Jump (kept) | It told a ship where it was on open sea, so a navigator could make for a far landfall straight. | as above | 51.9 (+2.8) |
| Harrison's Watch | 3 | Antikythera | Jump (kept) | Longitude at sea: the same as the Sextant, east and west. | as above | 51.9 (+2.8) |
| Printing Press | 2 | Press | Press (kept) | Books made quick and cheap. | none | 50.4 (+1.3) |
| Paper | 2 | Press | Press (kept) | Wherever paper arrived, books became cheaper. | none | 50.4 (+1.3) |
| Telegraph | 2 | Press | Press (kept) | News arriving at once, every day. | none | 50.4 (+1.3) |
| Timbuktu Manuscripts | 2 | Press | Manuscripts (built) | Families kept a city's learning in their own houses for centuries, and carried it off in trunks to save it. | built | 49.8 (+0.7) |
| Quipu | 2 | Press | Manuscripts (built) | Knotted cords held every count of an empire until someone needed to read it. | built | 49.8 (+0.7) |
| Abacus | 2 | Abacus | Abacus (kept) | Cheng Dawei's merchants' arithmetic. | none | 48.9 (-0.2) |
| Rain Gauge | 2 | Abacus | Abacus (kept) | A standard measure in every district, so taxes and relief were worked out, not guessed. | none | 48.9 (-0.2) |
| Damascus Steel | 2 | Damascus Steel | Damascus Steel (kept) | The finest blades of their age. | none | 55.0 (+5.9) |
| Boundary Stone | 1 | Boundary Stone | Boundary Stone (kept) | Curses on anyone who moved the boundary. | none | 48.6 (-0.5) |
| Antikythera Mechanism | 3 | Antikythera | **Foresight**, cost 2 | Its bronze gears worked out eclipses and the four-year cycle of the Games ahead of time. (A jump never had much to do with it.) | a choice at the start of a turn (a screen to put three cards in order; the robots order them by what they can pay for); the jump's key moves to the Balloon | 48.6 at 3 (-0.5), 48.2 at 2 (-0.9) |
| Dresden Codex | 2 | Press | **Foresight** | Its Venus tables warned of eclipses years ahead. | as above | 48.2 (-0.9) |
| Viking Longship | 3 | Antikythera | **Landing** | Light and shallow enough to run onto any beach: the Vikings landed where nobody was waiting. | one condition in where a Figure can be played (`actions`, `deploy`) | 48.7 (-0.4), played in 14% of games |
| Voyaging Canoe | 3 | Antikythera | **Landing** | It carried people, animals and plants to settle a new island. | as above | 48.7 (-0.4) |
| The Wheel | 1 | Compass | **Convoy** | Its first use was the cart: people and loads moving together. | a walk with a second Figure (`a.w2`), and a "with" chip on the road under the card | 50.2 (+1.1) |
| Steam Locomotive | 1 | Compass | **Railway** | A railway runs fast between fixed stations from its terminus; Rocket ran at thirty miles an hour. | a once-a-turn move (`rail`) and its chip | 50.5 (+1.4) |
| Stirrup | 1 | Compass | **Charge** | Braced in stirrups a rider could stay in the saddle and stand up in it to fight: the mounted charge. | the flag Dunhuang already sets (`f.gar`) on every walk | 50.3 (+1.2); once a turn 50.0 |
| Inca Rope Bridge | 1 | Compass | **Rebuilding** | Every June four villages cut the bridge down and weave a new one in three days. | a once-a-game token at the count, as Kumasi's (`stool`); the robots count it as Kumasi | 53.0 (+3.9) |
| Cyrus Cylinder | 1 | Compass | **Homecoming** | It says Cyrus sent the people of many cities back to their homes. | a once-a-round token in `ko()` | 51.4 (+2.3) |
| Greek Fire | 2 | Damascus Steel | **Bastion** | Fired from Constantinople's walls and ships, it broke the sieges of 674 and 717. | one line in `might()` | 50.0 (+0.9) |
| Mysore Rockets | 2 | Damascus Steel | **Volley** | Iron rockets that flew a kilometer or more: a blow from a distance. | clash actions to the next Domain; Guard, Law, the Peace of Westphalia, Nineveh and Onondaga read at the target's Domain; which Domain's power the clash takes (open question 4) | 51.8 (+2.7) |
| Rosetta Stone | 2 | Press | **Decipher** | One decree in three scripts: the connection between them was the key to the other two. | +1 where a Legacy Line scores (`threadPlay`, the line in `arrive`) | 49.2 (+0.1) |
| Telescope | 2 | Press | **Far sight** | Galileo showed the Venetian Senate ships two hours before the eye could see them. | nothing in the rules; the page lays the other hands face up | 49.7 (+0.6): a blank card to the robots |
| Braille | 2 | Press | **Reading** | Six dots under a fingertip opened books to readers who had none. | one line in `arrive()` | 50.8 (+1.7) |
| Clay Tablet | 2 | Press | **Stores** | The oldest writing is a temple's accounts: grain, sheep and beer for the workers. | one line in `startTurn()` | 54.2 (+5.1) |
| Dunhuang Star Chart | 2 | Press | **Library Cave** | It lay sealed in a cave with forty thousand manuscripts until 1907: what was put away came back. | an action like Timbuktu's (`buy`), with a chooser of which card | 49.7 (+0.6) |
| Paiza | 3 | Antikythera | **Safe conduct** | Its bearer had to be given fresh horses at every station and let through without delay. | stuns skip its player's Figures (Eclipse, the Lisbon Earthquake, the 13 Figures that stun) | 48.3 (-0.8), played in 16% |

## The new powers

| Power | Sentence | Relics | Measure | Concerns |
|---|---|---|---|---|
| Foresight | At the start of your turn, before you draw, look at the top 3 cards of your draw pile and put them back in any order. | Antikythera Mechanism, Dresden Codex | 48.2 (-0.9) | The robots can't use it (they order by cost); a person should. Needs a screen. The Antikythera to cost 2. |
| Landing | You can play your Figures at the Crossroads. | Viking Longship, Voyaging Canoe | 48.7 (-0.4) | Weak at 3: the robots seldom pay 3 for it, and made to play it they win no more (49.3). Suggest cost 2. Like L'Anse aux Meadows, for its player only. |
| Convoy | When one of your Figures walks, one other Figure of yours at the same Domain can walk with it. | The Wheel | 50.2 (+1.1) | A Figure played this turn can walk with another: a little like Swift. |
| Railway | Once a turn, one of your Figures at your Gate can walk to any Domain where you have another Figure. | Steam Locomotive | 50.5 (+1.4) | Like the Grand Canal in reverse; no odd stacking. |
| Charge | Your Figures can start a clash on a turn they walk. | Stirrup | 50.3 (+1.2) | Makes Dunhuang's power redundant for its player. "Once a turn" measured the same (50.0), so the plain sentence is enough. |
| Rebuilding | Once a game, when a round ends, mend one of your broken Seals. | Inca Rope Bridge | 53.0 (+3.9) | Strong for 1 Spark; with Kumasi and the Theodosian Walls a player could mend three times. Suggest cost 2. |
| Homecoming | Once a round, when one of your Figures is knocked out, it goes back into your hand. | Cyrus Cylinder | 51.4 (+2.3) | Rapa Nui puts a Figure knocked out there on top of the deck: which wins (open question 5). |
| Bastion | Your Figures have +1 Might when defending at your Gate or your Outpost. | Greek Fire | 50.0 (+0.9) | Adds with the Great Wall, Citadelle Laferrière and Steadfast. |
| Volley | Once a turn, one of your Figures can start a clash with an enemy Figure at the next Domain. | Mysore Rockets | 51.8 (+2.7) | The most new engine and screen work: a clash across two Domains. |
| Decipher | Each Legacy Line you make scores 1 more Renown. | Rosetta Stone | 49.2 (+0.1) | Random decks make 0.5 lines a game; a deck built round its lines gets far more. Adds with Plato's Academy. |
| Far sight | Your opponents play with their hands face up. | Telescope | 49.7 (+0.6) | The robots already see every hand, so this can't be measured; against a person it is information only. Suggest cost 1. |
| Reading | When you play a Scholar Figure, you draw one more card. | Braille | 50.8 (+1.7) | 37 Scholar Figures; goes with Sor Juana. |
| Stores | You gain 1 more Spark at the start of each turn. | Clay Tablet | 54.2 (+5.1) | The strongest new power, and the Clay Tablet is in the base set, so every Guide's deck has it. Suggest cost 3. |
| Library Cave | Once a turn, you can pay 1 Spark to take a card from your discard pile into your hand. | Dunhuang Star Chart | 49.7 (+0.6) | The robots take the dearest card and seldom spend on it; "once a round" measured the same. Like Timbuktu's power, with a choice. |
| Safe conduct | Your Figures never miss a turn. | Paiza | 48.3 (-0.8) | Only works against Eclipse, the Lisbon Earthquake and stunning Figures; worth little at 3. Suggest cost 1. |

## The first balance pass

`scripts/anoria/relicfx.js` (in the repo) plays every power on the same games: both players have a deck of 40 random
cards of two factions with no Relics, and player A's last two cards are changed for two copies of one Relic. Seats swap
every game; robots and Guides are drawn at random. So a line's share over the "no Relic" line is what the power is
worth against two ordinary cards, to the robots.

The new powers ran in a **prototype engine kept in the session's scratchpad** (`rel/mkproto.py` builds it from
engine.js, `rel/protofx.js` runs it), so nothing of it is in the repo. The prototypes follow the sentences above, with
these shortcuts: the Volley's clash takes the attacker's Domain's power; Foresight's robots put the dearest card they
can pay for on top; the Library Cave's robots take the dearest card; the Telescope does nothing (the robots see every
hand already).

1,500 games a line (2,000 for today's powers), seed 61000:

| Line | A wins | Played in |
|---|---|---|
| no Relic | 49.0 / 49.2 | |
| Damascus Steel (today) | 55.0 | 38% |
| Stores (Clay Tablet) | 54.2 | 72% |
| Rebuilding (Inca Rope Bridge) | 53.0 | 77% |
| Compass (today) | 52.1 | 66% |
| Jump, as the Balloon | 51.9 | 48% |
| Volley (Mysore Rockets) | 51.8 | 35% |
| Jump, as the Antikythera (today) | 51.6 | 49% |
| Homecoming (Cyrus Cylinder) | 51.4 | 68% |
| Reading (Braille) | 50.8 | 35% |
| Railway (Steam Locomotive) | 50.5 | 66% |
| Printing Press (today) | 50.4 | 72% |
| Charge (Stirrup) | 50.3 | 66% |
| Convoy (The Wheel) | 50.2 | 66% |
| Bastion (Greek Fire) | 50.0 | 37% |
| Manuscripts (built) | 49.8 | 36% |
| Far sight (Telescope) | 49.7 | 37% |
| Library Cave (Dunhuang Star Chart) | 49.7 | 37% |
| Decipher (Rosetta Stone) | 49.2 | 37% |
| Abacus (today) | 48.9 | 35% |
| Landing (Viking Longship) | 48.7 | 14% |
| Boundary Stone (today) | 48.6 | 67% |
| Foresight at 3 (Antikythera) | 48.6 | 30% |
| Safe conduct (Paiza) | 48.3 | 16% |
| Foresight at 2 (Dresden Codex) | 48.2 | 58% |

With the robots told to value them more (`'{"rw":{...}}'`, 0.5 to 0.6 a round), the weak ones were played about 70% of
the time and did no better: Landing 49.3, Bastion 49.8, Library Cave 48.6, Decipher 48.3, Foresight at 3 46.6, Safe
conduct 46.2. They are weak to the robots, not only unplayed.

**Out of line**: Stores (+5.1) is as strong as Damascus Steel (+5.9, today's strongest power; Mysore Rockets, which has
it today, tops run.js cards at 55.6%). Rebuilding (+3.9) is strong for 1 Spark. Foresight, Safe conduct and
Landing are under the Abacus and the Boundary Stone, today's weakest. Everything else falls between today's powers.

What this pass does not cover, and building would: the Guides' sets (`sets.js`: Leonardo's set alone has six Relics,
four of them changing), the rarity tiers (`rarity.js`, then `pacing.js`), `newcards.js` on a full `run.js cards`, and a
measure of each power with a person's choices where the robots can't make them (Foresight, Far sight, the Library Cave,
which card to discard under the Manuscripts).

## Building it (if approved)

- cards.js: each Relic's `fx` (the card that names the power), the costs Tim agrees; text.js: each card's `tx`;
  set-150.json and set-p5.json: `tx`, `fx` and `fit`.
- engine.js: the 15 powers where each kind of rule lives (`might`, `actions`, `apply`, `startTurn`, `endRound`, `ko`,
  `arrive`, `threadPlay`); the jump renamed from `antikythera` to `balloon` (ui.js reads it in three places); `RW` worth
  for each; the once-a-turn and once-a-round tokens reset with the others.
- ui.js: the road under the card for the new moves (Convoy's "with", Railway, Volley, the Library Cave's chooser),
  Foresight's screen at the start of a turn, the Telescope's face-up hands, `logEvs` and `moveSaid` sentences and `EV`
  moments for each new event (a mended Seal, a Figure going home, a card back from the discard pile, a rocket clash), a
  reader note where a sentence leans on a rule (Charge: "Most Figures can't clash on a turn they walk.").
- deeds-test.js: each power against its sentence, its limits and the cards it meets; check-set.js passing; RULES and
  the Relics lesson (the Compass and the Printing Press keep their powers, so the lesson stays true).
- relicfx.js, sets.js, run.js cards with newcards.js, rarity.js and pacing.js again.

## Open questions for Tim

1. **The Antikythera Mechanism leaves the jump** for Foresight, and goes from 3 Spark to 2 so it can share the power
   with the Dresden Codex. Or it keeps the jump (the card the power has always been named for) and the Codex has
   Foresight alone.
2. **Costs**: Clay Tablet 2 to 3 (Stores is the strongest new power, and the Tablet is in the base set, in every Guide's
   deck); Inca Rope Bridge 1 to 2; Paiza 3 to 1; Viking Longship and Voyaging Canoe 3 to 2; Telescope 2 to 1. Or keep
   every cost and let the measure stand.
3. **Damascus Steel** measures the strongest Relic power today (+5.9 in relicfx.js, and Mysore Rockets, which has it
   today, tops run.js cards at 55.6%).
   With Greek Fire and Mysore Rockets moving off it, it is one card: leave it, or make it cost 3?
4. **Mysore Rockets' clash across two Domains**: whose Domain power applies (the target's seems right: the Colosseum
   scores where the enemy stood), and does the Figure that fires risk being knocked out if it loses (a normal clash,
   as prototyped), or does a lost volley just miss?
5. **The Cyrus Cylinder and Rapa Nui**: a Figure knocked out at Rapa Nui goes on top of its deck; with the Cylinder,
   into the hand instead, or the player chooses?
6. **The Telescope's face-up hands**: against the computer it shows you the robot's hand; online, the other player
   sees your hand for as long as you have it in play. Is information alone worth a card, or should it do more?
7. **Saved games**: a game in progress with one of these Relics in play would change power the moment the update
   loads (the engine reads a Relic's power from its data). That is how the Manuscripts' change works today. Or a game
   keeps the powers it began with (a rule version in the save, as the scoring rules do)?
8. **Fifteen new powers at once**, or in two batches: first the ones that need little screen work (Bastion, Reading,
   Stores, Decipher, Rebuilding, Homecoming, Safe conduct, Landing, Charge), then the ones with new moves or screens
   (Convoy, Railway, Volley, the Library Cave, Foresight, Far sight).
