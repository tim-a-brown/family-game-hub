# Family Game Hub

Static site (plain HTML/CSS/JS, no build step) served at **games.timbrown.xyz**
from Firebase Hosting, project `familygames-da3e5`. Games live in `games/*.html`.

Shared code:
- `kit.css` / `kit.js`: design system and game shell (game bar, rules sheet,
  setup screen, win screen, sounds, haptics, icons, cards, dice). New and
  rebuilt games use these. API is documented at the top of `kit.js`.
- `tour.js`: "First time here?" overview (sign-in page; opens once on a new device) and How Game Night works, the
  in-app guide (profile menu, every game's menu via `Kit.tour(topic)`), both built from the same animated scenes. A new
  account feature worth explaining gets a topic there.
- `games.js`: the game catalog (names, colours, categories, player counts,
  which file is "play" vs "keep score"). Home screen and kit both read it.
- `sync.js` (Firestore sync, PIN sign-in), `hist.js` (game history),
  `players.js` (frequent players), `casino.js` (bankroll), `arcade-hi.js`.
- `matkit.js` (MatKit): a play mat made from a picture, for any game that has play mats (Anoria and Lorcana use it).
  See "Play mats made from a picture" below.
- `sounds/`: recorded game sounds (Kenney CC0 packs) used by `Kit.sfx`, built by
  `scripts/build-sounds.py`; synthesized fallbacks live in `kit.js`.
- Legacy: `shared.css` + `app.js` are still used by games not yet rebuilt.

Synced storage keys must never change: `hi_*`, `gh_*`, `casino_bank`,
`rklists`, `fav_games`, `lorcana_decks_v1`, `lorcana_decks_del`,
`lorcana_marks_v1`, `lorcana_marks_del`.

**Everything a game stores follows the PIN** (sync.js "Everything else follows the PIN"): saved games, puzzles in
progress, levels, stats and seen-lists sync key by key to `pins/{pin}/st/{key}`, newest change wins, and a game page
reloads when its own keys arrive newer from another device. A new game needs nothing extra. Keys that must stay on
one device (online seats/table codes, device ids, caches, emulator settings) go in `ST_DEVICE` in sync.js. Renaming
any game's storage key loses that saved data on every device.

## How Tim works with Claude

Tim plans and requests changes in chat, proofs them on a preview URL, then says
"ship it". Keep explanations short and plain.

**American English** (Tim, 2026-11-12): everything Claude writes to Tim in chat, and every word a player reads in
the games, uses American spelling: "centered", "color", "recognize", "gray", not "centred", "colour",
"recognise", "grey".

1. **Build** on the session's working branch.
2. **Preview**: commit, push the branch, then run `scripts/preview.sh` and give Tim
   the preview URL it prints. Tell him to test in **guest mode**, because preview
   uses the same Firestore data as the live site.
3. **Ship** only when Tim says so: fast-forward `main` to the branch and push
   (`git push origin HEAD:main`). Never push to `main` without his OK.
   Pushing `main` triggers two GitHub Actions:
   - `deploy.yml` publishes to games.timbrown.xyz
   - `dropbox-sync.yml` mirrors the repo into Tim's Dropbox
     (`Apps/Webapp - Family Game Hub`)
4. Confirm both Actions succeeded, then tell Tim it's live.

## Design rules (Tim's feedback)

Underlying principles for everything:
- **Explain by design, not words.** Clear UX: the screen should show what to do and what just happened
  (highlights, motion, placement, state you can see) instead of instructions and labels.
- **Make gameplay fun, engaging and interesting.**


- **No emoji in the UI.** Use `Kit.icon(name)` line icons. Emoji look cheap.
- **Text first for finding things.** Game names must be readable at a glance.
- **No dots (·) stringing text together.** Don't join facts with " · " (or brackets) on one line. Design it: put each
  thing in its own place (a name and its amount at either end of a row, the detail on a line of its own, a small
  table to line up names and hands, a caps label over a value). A setup choice with a second part ("10" and
  "Standard") has it on a second line in its button: the label is `'10\nStandard'`, and a folded row, the online
  review and the Game defaults line say the first line alone (`chText` in kit.js).
  A list of facts may be passed as text joined by " · " (toasts, confirm bodies, `Kit.win`'s sub line, history
  summaries): `Kit.facts` draws one fact a line and `HistView` splits a dotted line in a history view, so the dot itself
  is never shown. `Kit.resume` labels and Poker's hand rows keep it as a stored format, split for display. Printed
  artwork (Lorcana's type line, pinball prints, Poker venue logos) keeps its own.
- **Write the way a person talks** (Tim, 2026-11-11). Every sentence a player reads should be one a person would say
  out loud to someone across the table: a whole sentence, in ordinary word order, that says what it is about. Not a
  stub put together from a name and a verb ("Leonardo da Vinci guides it": say "Leonardo da Vinci is this deck's
  Guide"), not rule-book shorthand ("A tie: nobody", "Level: you take turns going first": say "If the Might is tied,
  nobody holds the Place"), and not a sentence with its subject or verb left out ("Your Figures ready", "This is round
  3, so 4"). A rule is not given as a command joined to its result ("Win the roll by 3 or more and it adds 2": say
  "A roll that wins by 3 or more adds 2 Might instead of 1", or "If you hold their Gate, one of their Seals breaks"). A button, label or caption **names the thing** instead of leaning on "it" or "its" for something
  the words don't say (Tim: "See its 30 cards" is "See the deck's 30 cards"; "Watch it again" is "Watch this lesson
  again"; "It arrives at your Gate" is "Hatshepsut arrives at your Gate"). Inside one sentence, "it" for a thing
  that sentence has just named is ordinary English ("Tap a Place to read it"). Never trade a natural sentence for a
  clumsier one to avoid a word. The same goes for what Claude writes to Tim in chat.
- **Say who does what, from where the reader stands** (Tim, 2026-11-11, a second sentence shape to keep out of
  everything Claude writes for him, on screen and in chat). Not an article, a noun, a vague verb and a pronoun ("A gold
  line joins them"): the pronoun doesn't say who, and the verb doesn't say what happens. Name the cards and say the
  effect, with what the player will see attached to it: "Virgil costs 1 less, and he has +1 Might for as long as Homer
  is in play, connected by a gold Legacy Line on the board." Put the condition first, the way the player meets it:
  "With Archimedes in play on your side, Eureka! scores 1 Renown" (not "Archimedes stands on your side, so playing
  Eureka! scores…"). State a rule as its limit, not as a consequence to work out: "A deck is 40 cards and can hold no
  more than two of a card"; what a player can do at a given moment is said at that moment, exactly: "You can add one
  more of this card to your deck." Plain subject, verb, object with real names is fine ("Tim plays cards", "Cam
  eliminates Tim"). In chat, describe things as Tim sees or does them, not as Claude observes them: "You can see it in
  your screenshot" (not "Your screenshot shows it"); "The instructions explain that players you seat in game setup
  don't carry into the online table, where others will join from their own devices."
- **No stray lines across buttons, ever** (Tim, 2026-11-16: black hairlines through Arvela's Deal the cards, "a pretty
  common issue ... make sure we never see it ever, ever, ever again"). Every `.btn` is a layer of its own in Safari
  (`will-change` in kit.css, so a label that changes isn't left with a row of its old words), and Safari repaints a
  layer that sits on a fraction of a pixel in strips whose seams can stay unpainted, the dark page showing through. The
  kit repaints a button whole whenever it changes size or its words change (the block "No stray lines across buttons
  in Safari" in kit.js: a ResizeObserver and a MutationObserver nudge its color one step for two frames; Safari only,
  `window.__kRpLog` lists each repaint for a test). A new kind of button needs nothing; something that is not a `.btn`
  but has its own layer (`will-change`, a transform) and changes its words or size gets the class `btn` or the same
  treatment.
- **The page behind a sheet never moves** (Tim, 2026-11-17: "background wasn't fully locked while the dialog is up"). While
  a `.k-scrim` is up the page is locked (`html:has(body > .k-scrim)` in kit.css: overflow hidden, so iOS can't hand a drag
  that reached the end of the sheet on to the page), and `trapScroll` in kit.js stops a drag that would carry on past an
  end from its very first pixels, since iOS decides on the first move whether a drag scrolls. A drag in the home screen's framed setup is heard only by the frame's page, so `trapScroll` runs there too with the
  sheet round the frame as its outer scroller (`trapScroll(root, true)` under `IN_SHEET` in kit.js), and `.k-sheet` is
  `overscroll-behavior:none`, so a drag past the sheet's top or foot never springs the sheet (Tim, 2026-11-19).
- **Large windows (a computer): designed for the room, never scaled up** (Tim, 2026-11-17, of his MacBook at 3024 by 1964
  with the window dragged to any shape: "gameplay needs to take up as much screen as the device will give it, but also
  adapt to every possible resizing option in there", and of a first try that laid a game out at a tablet's size and scaled
  the page to the window: "simply scaling things up is not thoughtful design"; Axis & Allies, whose map takes the room at
  any size, is his example of doing it right). Measured first: 80 of 114 games covered under a fifth of a 2100 by 1860
  window. The principles (the brief is the scratchpad's `fill/BRIEF.md`): the play surface is sized from the window with no
  cap left over from the tablet, and what is printed on the table grows with it to a comfortable largest size; the bar,
  menus, sheets and buttons stay their size; room the surface can't use holds real information from the game's own state
  that is otherwise a tap away or not shown (a score sheet, a racing form, a high-score board), information at the left
  and actions at the right; every window from 320 by 568 to 3024 by 1964 works at any shape with no scroll, band or cut;
  a resize mid-game keeps the state; and **the phone and the tablet do not change by a pixel** (proved with before and
  after screenshots at 402x874, 874x402, 768x1024, 1024x768 and 320x568). **The pilot, four games for Tim to judge before
  the rest**: Hearts (`Cards.desk(stage)` in cards.js, opt-in for any card table built on `.ctable`: four compositions by
  window shape, `Cards.pad` the ruled score sheet at the left, `Cards.lastTrick` and the hand in play at the right, the
  largest card 210px; at a desk a scored hand goes onto the sheet, not a sheet over the table); Pac-Man (`html.pm-big`,
  `bigPlan`/`bigFit` in pacman.html: the maze at the window's height or width, drawn at its own pixels, and cabinet panels
  sized by `--u` from the tile: scores, fruit and dots, the ghosts as they are now with the 200 to 1,600 ladder and blue
  time, the high-score board with this game's row climbing, past games, drawn key caps); Horse Race (`html.hr-big`,
  `bigPlan`/`layoutBig` in horserace.html: the track as the hero, the program as a racing form, a tote board of $2
  payouts, races so far, the session, and the rail stood up at the right as the betting station; `deviceShape` keeps a
  window shaped like a phone or tablet on the device layout); at a desk the turf is painted once per size and laid down each frame (`drawSurf`), and the course
  oval draws only its runners over a cached track (`ovalStatic`); Arvela (`deskPlan` in ui.js, two players: Figures and the
  hand sized together, the bars stood on end as pillars with the Guide, its power and the Relics by name, cards from 150px
  wide saying their power, the last events beside the hand, the face-off's `.big` with whole cards from 330px).
  **Spades** (on `Cards.desk`; `paintDesk`, `paintSheet`, `handRows`, `paintSide` in spades-ai.html): the partnership
  sheet `.sp-pad` hand by hand (each side's bid, tricks, bags, score and total, a Nil marked beside the bid, the bags
  toward 10 under the totals), and at the right whether spades are broken, the last trick (`S.lt`), every player's bid
  against the tricks taken, who took each trick (`S.tl`), and while bidding what each has bid and taken so far; a
  scored hand goes onto the sheet with its sentences at the right (`handNotes`), online too (`netWait`).
  **Euchre** (the same functions in euchre-ai.html): the sheet `.eu-pad` (who made trump, the suit, Alone, each side's
  tricks and points, Euchred marked, a pip a point to the target), and at the right the trump and what happened to the
  turned-up card (`trumpSay`), each player's call, each side's tricks, who took each, the seven trumps highest first
  with the played ones faded (`trumpStrip`; Tim, 2026-11-18: "keep the faded trumps in euchre", the one memory aid a
  desk has that a real table doesn't), the last trick; a scored hand is told at the right (`handSay`). The
  scratchpad's `fill/audit.js <shapes> <games> --shots [--root=<worktree>] [--out=<folder>]` opens a game's table through
  its demo at eight desktop windows (A 2100x1860, B 3024x1964, C 1512x982, D 1600x560, E 720x1700, F 1000x1000, G 1280x720,
  H 560x620) and measures the share of the window it covers; each pilot's own proof scripts are in `big/<game>/`.
  **Wizard at a desk** (`Cards.desk` with its own panels, `paintSheet`/`paintSide`/`drawRace` in wizard-ai.html): the
  game's pad at the left, a row a round with each bid in a ring, the tricks taken and the score, the rounds to come ruled
  and empty, the race under it where there is room; at the right the trump turned up, every bid against the tricks taken
  as pips, the bids against the tricks there are as one bar, the last trick and who took each trick; a scored round goes
  onto the pad. **Rook at a desk** (the same functions in rook-ai.html): the partnership sheet hand by hand (who won the
  bid, for how much, the trump color, a bid that went set struck out), the race to the target; at the right the hand's
  180 points as one bar with the bid marked, the counters each side has captured as small cards, the nest, the last trick.
  Both fit the right panel by measuring it (`f1` to `f7`: the least needed part goes first), and keep `html.cdesk` on only
  while a desk layout shows, since Cards.desk's in-between layouts assume Hearts' stage.
  **Five Crowns and Phase 10 at a desk** (rummy tables, so not Hearts' panels; `build`, `placeSeats`/`paintFeltDesk`,
  `fitLaid`, `paintSheet`, `paintSide` in fivecrownss-ai.html and phase10-ai.html; their rules hang off `html.rdesk`): the
  felt is laid as a table is, the first player on your left beside the piles, the rest across the top, the last on your
  right (`RING`; `RING_N` for a narrow felt), and what is public at a real table lies in front of its player at one card
  size for every seat, the largest that fits (`--lcw`). Five Crowns: a player who goes out, and everyone else after their
  one last turn, has their books and runs face up with the cards left over (`laidOf`; a felt too small keeps the cards left
  over, then only what they come to: `lo1`, `lo2`); the sheet is a row a round under the round's wild card with the race
  under it (0 at the top, the fewest points win), and at the right what is wild, who is doing what round the table, a crown
  for each round a player went out first, and what a card left in the hand costs. Phase 10: each player's laid-down phase
  with what has been hit onto it, your own along the foot where the builder stands, the cards a player was caught with
  face up when the hand is counted; the sheet is a row a hand (the phase each player was on, filled when they made it,
  and their points) with the climb through the phases under it, and at the right the ladder of the phases in words with
  every player's token on their rung (a green check: laid down this hand; a red mark: loses a turn). A counted round or
  hand goes onto the sheet and the bar deals the next (online keeps its sheet). **Smaller windows no phone or tablet has**
  (`LITE_P`, `LITE_L` in both pages: 480 or more wide and 560 to 760 tall and upright or nearly square; wider than tall,
  over 520 tall, under 1200 wide but not 1000 to 1040) get the same table without the panels, fitted to the window so
  nothing scrolls; a Phase 10 felt with no room for every phase scrolls inside itself (`pd-over`). With five or six players in a wide window under 860 tall your hand stands in the column at the right under the buttons, as in a strip, so the felt has the window's whole height (`rd-many`, set in `build`). The scripts are the
  scratchpad's `big/fivecrowns/` (`lib.js` positions for both games, `snap.js` the device proof, `shots.js` the scan of
  every phase at any size, `resize.js`, `online.js`, `demo.js`).
  **Gin Rummy at a desk** (on `Cards.desk`; `paintDesk`, `paintSheet`, `paintSide`, `paintLaid` in gin-rummy-ai.html): the
  sheet `.gn-pad` hand by hand (each player's deadwood with Knock, Gin or Undercut beside it, the winner's points, the
  running totals, the hands won, and the 25s and the 100 once the game is over); at the right how the hand you can see
  counts (its loose cards with what each costs, its melds, the 10 a knock needs), each player's last turn (`S.lt`), the
  stock, the game so far, the parts kept by priority as the panel gets shorter. Nothing a real table hides is shown: no
  more of the discard pile than its top two cards. When a hand ends, both hands are laid down on the felt itself
  (`laid`, `.gd-lay`) and the bar has the button for the next hand; online keeps its sheet. **Cribbage at a desk** (its
  own layouts, since its stage has the board: `DK` in cribbage.html sets `html.cbd` with `cbd-wide`, `cbd-strip`,
  `cbd-square` or `cbd-tall` from `Cards.DESK`): the board across the window with each side's score and what it still
  needs for 121 at its ends (in a column over the table in the other shapes), the sheet `.cr-pad` at the left (what each
  side pegged, counted in hand and in the crib, the total; the skunk line on the meters), and at the right the play
  card by card with the count each made and what it pegged (`playLog`), in the show each hand and the crib as they are
  counted with what made the points (`showKinds`), and the game so far. Both pages also close the windows between the
  devices and a desk, which used to scroll (Gin Rummy through Cards.desk's in-between layouts, Cribbage with its own
  queries); their proof scripts are in `big/ginrummy/`.
  **Dominoes at a desk** (its own, not Cards.desk: `deskPlan`, `deskChoose`, `deskApply`, `paintSheet`, `paintSide` in
  dominoes.html; `.dk` and `.dk-wide`, `.dk-col`, `.dk-strip`, `.dk-tall` or `.dk-square` on `.dw` only while a desk
  layout shows). The line of play wants width, so in a wide window (1200 or more across, 640 or more tall) the table
  lies across the whole window, as the Landscape rule says, and a strip under it holds the score sheet and the hand in
  play at the left, your tiles, then whose turn it is and the buttons at the right; where that strip would cost the
  tiles their size (1512 by 982 in All Fives, 1280 by 720 in every game) the table keeps the window's whole height and
  one column at the right holds the sheet, the hand in play, your tiles and the buttons (`col`); a short strip of a
  window (under 640 tall) gives the table its whole height with the panels in columns beside it; a tall window has the
  two panels side by side over the table; a nearly square one has them one over the other at the left. **The panels
  give way, not the tiles** (the play surface is the point of a large window): a desk layout is used only while its tiles are
  at least as large as the tablet's layout would make them in the same window. Once a hand and a window size
  `deskChoose` measures the felt of the tablet's layout and of each composition the window could have, works out the
  tile each gives (`tileFor`) for lines a hand of this game makes (`refLines`) and for the line on the table, and takes
  the one that keeps the largest tiles; `deskGive` gives way again mid-hand when the line outgrows the choice, to the
  next composition or to the tablet's layout (`DK` null), until the next hand. The tiles go to 104px across (135 while the line is short), your
  tiles the same size, and the plaques on the felt step up with them (`--k`). The sheet is a row a hand with the race to
  the target; the hand in play is how many tiles each player holds and what each drew or passed, the open ends (in All
  Fives the count of the ends piece by piece), and the hand play by play from `S.pl` (in a column of its own from 2400
  across), each part given up whole as its panel gets shorter. A counted hand is written there with what everyone was
  left holding, and its button stands where the turn's buttons are (`deskHand`; `deskSync` moves the count between the
  sheet and the panel when the window changes size). Mexican Train at a desk is in its own section. The scratchpad's
  `big/dominoes/` has the scripts: `gen.js` (fixed positions as saved states), `snap.js` with `cmp.sh` (the device proof,
  `proof.txt`), `scan.js` (anything cut, small, half a row or overlapping, every phase at every window), `resize.js`,
  `online.js`, `demo.js`, `misc.js`, `audit2.js`, `tile.js` (the largest tile and any covered tile at each window, before
  and after: `mkbase.js` builds the starting commit's game from links and four files), and `all3.sh`, which runs them all.
  **Flip 7 at a desk** (`deskFit`, `paintSheet`, `paintSide` in flip7-ai.html; `.f7.dk` is on the stage only while one of
  Cards.DESK's windows shows): every player's row is a cell of the felt, laid out for the felt there is (the others in 1
  to 4 columns, the deck in a row or in a column of its own at the right, your row larger or one of the grid, the name
  over the cards or at their left), each row with seven places for its seven different numbers, the cards to 210px; the
  score sheet at the left (`Cards.pad`: a row a round, a bust, a Flip 7 and a freeze marked, the round in play lit, a
  meter to the target), and at the right the race to the target with this round's points on each line (solid once they
  are safe, hatched while a bust would lose them; while the panel has the room, as early in a game when little has happened, the race stands up as columns rising toward the target, one a player with the name under it, `.f7race.col`, `--rh`, only where each column is 4em wide or more; with too many players for columns the lines stand further apart in larger type, `--rg`) and what has happened, round by round from `S.ev`, over Flip and Stay.
  A wide window whose table would have under half its width stands both panels at the left. A scored round goes onto the
  sheet and the bar deals the next one, online too. A computer's window smaller than those (a mouse, `FINE`), in which
  the game's own layout would scroll, gets the same felt fitted to the window with no panels (`dk-small`, remembered by
  window and player count in `SMALL`); a touch screen never does. **Go Fish at a desk** (`paintDesk`, `paintTally`, `paintLog` and the
  `DKS` parts of `fit` in gofish.html; `.gf.dk`): the seats, the pond and your hand step up with the felt. Every
  player's books or pairs, yours along the foot too, are one size, the largest at which every seat's fit in even rows
  (`--obw`, `--mbw`, `fitMineDesk`; with a themed deck's full pictures). Your hand lies in a tray of the table's own wood
  and felt (`.gftray`, `paintHead`): at its head your name with how many cards you hold and the turn's prompt on a glass
  plate lit gold while the move is yours, under them your cards as large as the tray allows, to 210px, a few standing
  down a tall tray and many in rows that fill it (`handRows` with `tray`). Two panels: the books by player with the cards
  each holds and the deck's 13 books by who made them, the grid as large as the room left allows (`sizeGrid`); and the
  last ask alone (Tim, 2026-11-18: "only the last ask in go fish in the panel nothing beyond"; `paintLog`): the rank as a
  card or the deck's picture, lit gold when cards came over and dim at Go fish, who asked whom, and what happened (a
  fished card named only when it was the rank asked for, as it is shown then). In a column the last ask stands at the top, only as tall as it needs, its card over its words where the column has room (`--gkf` on `.gfp-g`, from the column's width), and the books take the rest, the grid of the deck's books in as few as three across as large as the room left allows (`sizeGrid`, to 7em a book); with no ask yet the books have the whole column. They stand at the left with the tray
  at the right (side by side in a strip wide enough for it), at the left with the tray below in a nearly square window,
  along the bottom of a tall one, the last ask's card over its words there. The
  scripts are the scratchpad's `big/flip7/` and `big/gofish/`.
  **The setup and the results card at a desk, for every game** (kit.js "The desk" and the last section of kit.css; every
  rule hangs off `.k-dk`, which kit.js sets only in a window wider than 1024 or more than 768 the shorter way, taller
  than 520 and 480 wide at least: `deskShape`, `winShape`, `Kit.desk()`. The devices are drawn by the rules they always
  were). `Kit.setup` is composed for the window, its parts still direct children of `.setup`, so whatever a game adds
  to its setup keeps working: the **band** (1100 or more wide, 900 or more tall: the game's name at the left, the
  options and the cards for the kinds of play in columns in the middle with anything the game adds, the Players card
  over the start buttons at the right; under the band, across the window, the room), the **rail** (900 or more wide,
  under 900 tall: the room at the left under the name, the setup as a column at the right with the start buttons at
  its foot; a setup too long for the rail takes the band), the **col** (480 to 1099 wide, 900 or more tall: the setup
  as a column, the room under it). **The room** (`deskAside`) holds what this game has for someone about to play, on
  glass panels sized by `--dk` (1 to 1.75, from the window): Last game, the newest record as its history view draws it
  (`historyDetail`); Past games, a row each, a click showing that game in the first panel; Wins, who has won how
  often; High scores, where the game has a board (`deskBoards` finds a game's boards by their keys); How to play, the
  game's own `rules`, with Watch a demo. A game never played shows How to play alone. `A.lay` shares the columns out
  the way that fills the room best; a list gives up its last rows and a record its last parts whole, never cut through.
  The options stand open with what the chosen one means under each (`k-dk-help`), close to the ? next and fold to rows
  last (`deskPlan`, `deskTier`); a setup no composition holds goes back to the tablet's (`noDesk`). **The plan only
  ever goes on to a closer way** (`deskStates`, `deskRe`): a part of the game's own that comes back and grows a moment
  after the options are drawn again (Marble Solitaire's board, Arrow Jam's levels) sent a plan that started over round
  for ever, so only a press, a key or a new window size starts it from the most open way again. The setup's own
  controls step up gently in the largest windows (`--dkc`, 1 to 1.35, still 1 at 1512 by 982: a button stays a
  button), and a game's own parts of its setup can size by `--dkc` too. `Kit.setup`'s `desk: false`, or
  `<html class="k-own-desk">` (Arvela, which lays out its own setup at a desk), keeps the kit out. A page with a layout
  of its own for the setup on an iPad held sideways (Canasta, Go Fish, Pinochle, Spanish One) lets go of it at a desk:
  the rules for `.setup.k-dk.k-dk` are written to outweigh it. **`Kit.win` at a desk** (`deskWin`): the card a size up
  and, beside the standings (under them in a tall narrow window), This game: the record `Kit.record` has just made,
  drawn by its history view, so a finished game's score sheet, board or hands are on the card. In a short wide window
  (1160 or more wide, under 600 tall), and wherever the standings with the buttons under them are too tall for the
  window, the buttons stand in a column of their own at the right of the record (`k-dk-strip`); standings too long for that stand beside the buttons without the record (`k-dk-two`), in two columns (`k-dk-rk2`), with the trophy and title a size smaller in a low window (`k-dk-low`), and a record whose table would run past its pane's side is left out (`sideCut`); only a card none of these holds is the plain card, which scrolls. A record with nothing to
  draw leaves the card alone, and so does a card with a class of its own (Arvela's `.aw` plaque). **A resize** from
  large to small takes every class, style and panel away again and keeps what was chosen (`deskOff`). **The demo** in a
  large window sets its captions, curtain, end card and finger a size up (`--kdu`, 1 to 1.6, `deskSize` in demo.js); the
  strip keeps the game bar's size. The scratchpad's `big/kit/` has the scripts: `proof.js` with `cmp2.js` (the setup and
  the results card of eleven pages at Tim's devices, before and after), `sheet.js` (the home screen's game sheet),
  `scan.js` (every page in `SETUP_PAGES` at six large windows: errors, sideways scroll, anything cut off, off the window
  or over another part, the start button in view), `start.js` (a game started from the desk), `resize.js`,
  `demolook.js`. **Arvela's own setup and plaque at a desk are done** (the Arvela section, "Arvela's setup and plaque
  at a desk"). **Not done yet**: the tables of every game outside the pilot; a game's own parts of its setup (Trivia's
  categories, Mazes' daily maze, Axis & Allies' countries) do not
  step up with the kit's controls yet; a history view is drawn at its own size inside the larger panels; the setup has
  no card for a game in progress.
  **Craps at a desk** (`html.cr-big`, `bigPlan`/`bigLay`/`bigOff`, `bigModel`/`bigPaint` in craps.html; `deviceShape`
  keeps a window shaped like a phone or a tablet on the device layout, and a window under 481 wide or 560 tall is
  never a desk): the page is fixed to the window and `bigPlan` gives the table, the room and the station a box each,
  in one of four compositions: `U` the table across the whole window with the room and the station under it (a window
  nearly square), `T` the table at the top left with the room under it and the station the window's height at the
  right, `R` a short wide strip (the room, the table, the station side by side), `K` a narrow or tall window (the
  table, in one column of bets `a1` when it is tall enough, then the room, then the station as a dock). The felt is a
  grid whose rows share the table's height (`.felt-in.a2`/`.a1`), and its lettering, the puck, the chips (`TU()`) and
  the dice (`DS()`, 44 to 92px, thrown and landing by their own size in `tumble`) take their size from the table's
  unit `--u` (0.7 to 2.35). The room (`.rm`, glass panels `.pn`): the rolls of the session as dice (`rollsPanel`: the
  puck and the point, whose dice they are online, each roll's two dice with its total, what it did and what it won or
  lost, this shooter's bright and earlier hands dimmed, as many as fit whole); the session (`sessPanel`: rolls, points
  made, seven-outs, naturals, the longest hand, the biggest win, how often each total came up, the money roll by
  roll); online, At the table (`tablePanel`: every player's money, result and bets, the shooter marked, two to a row
  before the list scrolls). The station is the wooden rail stood up (`.rail`): the money, what happened, Your bets
  with what each pays and would win in the table's own numbers (`payOf`: PLACE, TAKE, LAY, HARD, PROPS and the Field's
  12 from the setup; `.myb`, or a panel of the room where the station is short), the chips, the buttons. While the
  dice are in the air the room keeps the picture from before the throw (`R.model`), since the roll is settled first. A
  change of the head script's shape class lays the desk out inside that transition (`shapePending`, the `shape`
  event), any other change of composition glides (`Kit.glide`). **Roulette at a desk** (`html.rl-big`, the same
  functions in roulette.html, and `layout()` builds the betting layout at the plan's row height): the wheel is large
  and the ball runs on it where it stands (`animateSpin`'s `here`; a click on the wheel skips; under 200px the old
  curtain is kept), with the last number on a marker at its corner (`paintWres`). Compositions: `P` the wheel over the
  room at the left, the layout upright beside it, the station at the right (with room beside the wheel too, the board
  stands there as a tower, `r2`); `Q` the same with a dock; `W` a short wide strip (the wheel, the layout on its side
  with the room under it, the station); `K` a narrow tall window (the wheel with the board beside it, the layout
  upright, a dock); `S` a small window (the layout on its side across it, a small wheel beside the board). Rows are 17
  to 124px, the chips half a row (`G.cs`), the lines between numbers wider targets for a mouse (`hit`'s bands), a
  mouse over the layout shows the bet a click would make and what it pays (`onLayHover`), and a chip on a dozen, an
  even chance or a column never lies on the box's lettering, upright or on its side: each outside box keeps its
  lettering to one side and the chip's place to the other (`.cell.fx.ev`, `.cell.fx.col` and `spot`), and a large
  layout's column boxes are deeper for it (`geom`'s `big`: 1.45 rows, a device's 1.1; the scratchpad's
  `big/craps/chips.js` measures every outside box). The room: the board of last numbers (`boardPanel`: a tower with
  reds at the left and blacks at the right in a tall box, a run of markers in a low one), the session (`sessPanel`:
  spins, the biggest win, the money bet, the best run, red against black, odd against even, low against high, the
  numbers that came up most, the money spin by spin), online At the table, and Your bets where the station is short.
  Online every player's chips lie on the one layout as small discs in their seat's color with their initial
  (`paintOthers`). In both games an online table's strip of players stands at the head of the station, or in a row of
  its own across a dock (`netH`). The scratchpad's `big/craps/` has the scripts for both: `lib.js` (the scenes),
  `mkstate.js` (saved games made by the starting version), `shots.js` with `scan.js` (any scene at any window: page
  scroll, anything off the window, cut or under 9px, boxes over one another), `flow.js` (a round's phases),
  `resize.js`, `online.js` (up to six people, a laptop host and a phone guest), `demo.js`, `snap.js` with `cmp.sh`
  (the device proof). **Not done**: Craps draws the other players' bets as a list, not as chips on the felt; a window
  under 481 wide that is not a phone's keeps the phone layout, which scrolls in Craps as it does on a phone.
  **Three Card Poker at a desk** (its own layouts, a felt with a betting station; the head script's `desk(w, h)`,
  Horse Race's test, gives every window that is not a phone's or a tablet's shape `sh-desk`, and `deskSync`,
  `deskPlan`, `deskApply`, `deskFit` and `deskPaint` in threecardpoker.html set `html.tcd` only while the table shows
  there; `deskOff` puts the bankroll, the table and the controls back as a device has them): your three cards are the
  hero, to 210px wide, and the felt's circles, chips, name plates and printing are sized from the card (`--dc`,
  `--dp`, a step up to 1.3 once the card is at its largest). `deskPlan` works out the largest card each composition
  allows from what each way of laying the felt needs across and down (`need`), and `deskFit` measures the felt and
  eases the card down until every piece is inside it. Compositions: `tcd-3` (the sheet at the left, the felt, the
  session and this hand over the station at the right), `tcd-r` (the felt and one column), `tcd-t` (the felt over the
  station, the panels in a row under it; `tcd-two` the station laid two-up, `tcd-nol` no room for panels), `tcd-cmp`
  under 760 tall. On the felt: `fa-t` stacked as a tablet has it, `fa-w` the cards at the left with the pay tables,
  the rule and the circles at the right (short wide windows), `fa-g` the pay tables either side of the dealer (the
  widest). The pay tables are the felt's own numbers: `litRows` rings the row of the hand you hold while its bet is
  still to be decided and lights it gold once it has paid. The station (`DK.stn`, `.dk-stn`) is the game's own
  bankroll bar and controls at the right. The room: `paintLog`, Hands this session, a ruled sheet with a row a hand
  (your cards over the dealer's as small cards, what each hand was, what the hand came to and why: Won, Lost, Tied,
  Folded, Didn’t qualify), the hand in play lit with the dealer face down and the rows to come ruled and empty;
  `paintSes`, This session (the net, your money hand by hand as a line, Won, Lost and Tied, the biggest win, the
  folds, what Pair Plus and the Ante bonus have paid, how often the dealer didn’t qualify); `paintHand`, This hand
  (what is on each circle and what the Play bet will cost, then what each circle paid); `paintHl`, Highlights
  (`S.ev`); online `paintSeats`, At the table (each other player's money and bet, cards face down while they decide,
  and the hand they played once the dealer has turned over on this device, a folded hand kept face down; two seats a
  line, `c2`, in a low row). `fitInfo` gives up whole parts by `data-drop`, never a cut one. Online the table's seat
  plates flow across the station (`.dk-stn.net`) and the plan uses the station's measured height (`DK.stx`). The iPads' band
  (620 to 840 the short way, 900 to 1200 the long way) is a desk only with a mouse (`pointer: fine` in the head
  script's `desk`; Pai Gow's too) and never at the iPad mini's own shape (to 790 by 1060), so 1100 by 640, K, L and N
  in a computer's window are desks, and a touch iPad keeps the tablet's layout. Test hook `__tcp.desk()`; the scripts are the
  scratchpad's `big/threecardpoker/` (`lib.js`, `gen.js` the saved games, `shots.js` the scan and the pixel proof with
  `cmp.js`, `resize.js`, `online.js` three people, `online6.js` six people in six window shapes, `demo.js`).
  **Pai Gow at a desk** (the same functions in paigow.html, `html.pgd`): setting seven cards is the hero, a card to
  210px wide, with your high hand and your low hand as two places sized from the card (`--dc`, `--dp`, `--hin` the
  width of the high hand's place: seven cards while you set, five after). Compositions: `pgd-3` (the sheet, the felt,
  the session and this hand over the station), `pgd-s` (the felt across the window, the panels and the station in a
  strip under it, `--sh`), `pgd-r` (the felt and one column), `pgd-t` (the felt over the station, the panels under it;
  `pgd-two`, `pgd-nol`), `pgd-cmp` under 760 tall; `deskPlan` weighs them by the card each allows (the strip a little
  ahead, the stack a little behind). On the felt: `fa-s` stacked (`ov` where your seven cards overlap in a narrow
  window), `fa-m` the dealer beside the bet and your low hand over your high hand (short windows), `fa-l` one line
  (very wide, low windows): at the showdown the dealer's high hand stands over yours and the dealer's low hand over
  yours, each marked Win, Lose or a copy. The card is one size through a hand (`DK.fit`, keyed by window and phase,
  the least of them). The felt prints the game's own rule (the dealer wins copies, wins pay a 5% commission); no
  house-way table is shown beyond the game's own House way button and its Strategy help. The room: `paintLog`, Hands
  this session (your two hands over the dealer's two as small cards, a gold line under each hand that won, the loser
  dimmed, what the hand came to); `paintSes`, This session (the net, the line, Won, Pushed and Lost, the biggest win,
  the commission paid, how often you set the house way, the longest winning streak); `paintHand`, This hand (after the
  showdown one sentence a hand saying which beat which or that a copy went to the dealer; the bet, what both hands
  winning pays, the 5% commission, a push, the dealer winning both, the row that happened lit); `paintHl`, Highlights;
  online `paintSeats`, At the table (each other player's bet, seven cards face down while they set, their two hands
  once the dealer has turned over on this device, the winner of each marked; two seats a line, `c2`, in the strip). At
  a desk a dealer's hand named with a hyphen (King-Queen) is one piece (`hyFix`, `.hy`; a device keeps the label as
  plain text), so under small cards its label never breaks at the hyphen. With nothing bet yet, This hand says what a
  bet would come to in words (Even money, Push, Bet lost). Online the seat plates flow across the station and the plan
  uses its measured height (`DK.stx`), as in Three Card Poker. `games/demos/paigow.js` points its dealer captions at
  the dealer's two hands in the one-line felt, where the dealer's zone has no box. Test hook `__pg.desk()`; the
  scripts are the scratchpad's `big/paigow/` (`gen.js` the saved games; the rest are Three Card Poker's, which take
  the game's name).
  **Arvela's table at a desk with three to six players, and teams** (Tim, 2026-11-18: "Don't just stop with Arvela two player, but also include multiplayer games too". The
  code is the block "The desk with three to six players, and teams" in `games/anoria/ui.js`, before "Picking things
  up", and the last block of `games/anoria/ui.css`.) Before, a table of more players in a large window was the iPad's
  battle line on empty stone: your cards 124 px wide whatever the window, everyone else's Figures as stacks (18% to
  40% of a 2100 by 1860 or 3024 by 1964 window covered). Now `layModeN` takes `deskPlanN` wherever the two-player desk
  starts (`deskWin`), and `drawN` hands over to `drawD`. Nothing is scaled: the table is composed for the window and
  its cards sized from the room. A phone and a tablet never get here. **A cell for every Domain** (`dnCell`, `cellD`,
  `.pl.dn-c`): the Domain across the middle, the other sides' Figures in a band above it and your side's (yours and
  your team's) in a band below, as real cards wherever a cell holds cards 58 px wide or more. One player's cards at a
  Domain are a party (`.pl-side.dn-p`, laid out by `dnBand`: one row down to three quarters of the size, then rows)
  under a tag with that player's name and color (`.dn-tag`; not on your own cards, nor on a player's at their own
  Domain, which the mat says). A cell with height to spare draws a lone card or a pile of two up to 1.3 times larger
  (`cx`), so a card from 150 px says its power (`fitMid`). The other players' Gate and Outpost are one-band cells
  (`.dn-1`): the Domain at the head, everyone's cards there under it, the owner's first and yours at the right. Stacks
  (`.dn-band.S`) only where a cell cannot hold cards, and the place a card would land among them is a stack's size
  with 8 px figures. Each side's Might is a shield on the Domain's edge in that side's color, the holder's lit: the
  other sides' along the top in seat order, yours at the foot. **Each player's cells lie on that player's mat**
  (`matN`), in seat order from your left (`seatsFrom`), with that player's bar on it (`.an-strip.dn-bar`, sized by its
  own `--bs`): yours at the foot of your mat over your hand, the others' at the head of theirs. `dnBar` chooses the
  form by the mat's width: `rich` (760 px: the Guide's portrait, name and power in words, the Renown along its track,
  Seals, hand, Spark, each Relic by name), `rich2` (540), `rich3` (240: the same on short lines in a narrow mat), then
  `one`, `two`, `three` lines of marks. `dnAfter` eases a bar down until everything on it fits, the Guide's power
  going first. In a team game the sides' bar lies at the head of your mat, no wider than the mat (`bigSides`, then
  `fitSides` folds the names to diamonds). **Compositions** (`dnTable`, the best of them chosen by `dnBest`): `row`,
  your mat at the left with your Gate, your Outpost and the Crossroads side by side and the other players' mats in a
  row at its right, each with its Gate over its Outpost (cells `v`) or the two side by side so the whole table is one
  line (cells `h`, low wide windows); `stack`, the other players' mats across the top and yours the window's width
  under them (tall windows). What a composition is worth: the size of its cards, a card past 150 px counting for less;
  your three Domains weighing as much as four fifths of all the others' (`wm`); a Domain under 150 px wide counting
  against it; a table whose other players' cards are under three fifths of yours counting against it. Of two as good,
  the one that fills the room. **The dock** is the two-player desk's, by the same code (`layoutHandPlay`, `capRecent`,
  `fitRecent`): `b`, the hand along the bottom with the last things that happened, the caption and the turn's button
  at its right (any window wider than tall, and a squarer one large enough for a hand of 150 px cards beside them);
  `s`, the caption's row over a hand the window's width (tall and square windows; no last events there); `r`, all of
  them in a column at the right of a low wide window. The round track lies between the table and the dock. **Where the
  desk has no better table than the tablet's** (`deskPlanN` gives null: 1280 by 720 with six or with teams, 1000 by 1000
  and 820 by 1180 with five or six, 1180 by 820 and 1080 by 810 with six, 1600 by 560 with five or six, 560 by 620; where the desk has no table with cards for the
  others, one with stacks is taken last, `low`, when your cards are 72 px or more, the stacks 40 px and the others'
  Domains 150 px wide: 1280 by 720 with four or five players and 1366 by 768 with five)
  the tablet's table is drawn, and the felt says `big` (`bsu` while the Domains are laid) so that the teams' bar has a
  place over your mat, your bar keeps off the others' rows at the set-up, and a card's name is 8 px. The set-up is the
  same cells with the set-up's own slots (`suCellD`); the dice, the scan, the face-off, the playback (`figN` finds a
  Figure's card in its party or its stack) and the plaque are the game's own. Roads are `roadsD`. A resize lays the
  table out again from the state (the plan is remembered by window, players and teams: `ui.dnC`). Test hook:
  `__anoria.dn` (`best`, `table`, `plan`). **Checking**: the scratchpad's `big/arvela-n/`: `h.js <tag> <sizes>
  <states> [--n=4] [--teams[=3]] [--pnp] [--base]` (screenshots and an audit: anything off the window, cut, under 8 px
  or over another part, the smallest name and card), `sweep.sh`, `audit.js` (the table before and after), `plans.js`
  (the plan at every window for every count), `pure.js W H N` (the compositions for a room, without a browser),
  `play.js` (a whole game, `--pnp` with real hand-overs, `--resize`), `rs.js` (a table dragged through 21 window
  sizes), `rs2.js` (the computers' turns), `clash.js`, `online.js` (a table of three on two devices), `proof.js` (the
  devices and the two-player desk, before and after, pixel by pixel; `--noise` is the starting files against
  themselves). **Known, in the starting files too**: on the iPad's battle line (1024 by 768) a team game is drawn in a
  third of the screen, because the teams' bar (`.wn-sides`) asks for a grid area the battle line has not (one rule
  fixes it: `.an .an-felt.many.bl > .wn-sides{grid-area:map;align-self:start;justify-self:start;margin:2px 0 0
  2px;z-index:5;}`), and while the Domains are laid with three or more players your bar lies over the last player's
  plate there. Neither was changed, since the tablet's pixels were not to change.
  **Poker at a desk** (`games/poker.html` only; `winShape` gives `desk` to any window that is not a phone's or a
  tablet's, and a short window under 1100 wide and 620 tall keeps the phone's sideways layout; `deskPlan`,
  `deskSeats`, `deskOn`, `deskOff` set `.stage.pdesk` and `html.pk-big` only while the table shows there). The oval is
  sized from the window and everything on the felt from the board's card (`--bcw`, to 210px, and `--u`, that card over
  90px): the seats, their names, stacks, bets, chips, the button and blinds, your cards (`--hcw`), the seats' backs
  (`--scw`) and cards shown face up (`--fcw`, never under 42px, so their corners read at 9px). `deskSeats` spaces the
  seats round the rail from yours at the bottom, each seat's chips straight in front of it; the board and pot sit
  between the top seats and your cards, and where a seat at the side would lie under the board (three or four players
  at a tall or square table) the board moves up or down to the nearest place clear of every seat, its chips and the
  button, or its cards get smaller until one is (`out.obs`, `clear`); every seat, its chips and the button are placed from the seat's size as drawn (`deskPodMem`, `deskPods`: the largest seen at that table, measured with what spills from it, the table laid out again before it is painted when a seat grew), and where no place is clear the board takes the one clear of every seat that lies least on the chips (`out.hard`), never over your own cards. The dealer button takes the nearest clear spot round it (`placeBtn`), and a bet never lies on the board, the pot or the game's name (`placeBets`). Compositions: `T` the table at the top left with
  a band of the room under it and your station the window's height at the right; `K` the table the window's width with
  the room and the station as a dock under it (or a column at the right under a lower table, `col`), `slim` under 760
  wide (the station's card over the betting controls, the full width); `R` a short wide strip (the hand so far at the
  left, the table, the station at the right). The station (`.prail.dks`) is the game's own rail stood up: the game,
  blinds and hand, your money, the coach's odds when it is on, the betting controls at its foot; with height to spare
  the hand so far sits between them (`has.slog`); a card short of room gives up the chip counts whole, then the line
  under the street-by-street odds (`fitRoom`). The room (`roomList`, `roomFill`, `roomBuild`, glass panels `.pn`, in
  order of want): This table, the hand so far street by street as the game's own receipt (`fullLog`); At the table
  (`tablePanel`: every player's chips as a bar, up or down in a cash game or big blinds in a tournament, hands won;
  its rows take the panel's height); in a tournament the level and blinds, the next level and when, players left, your
  place counted by the chips each started the hand with (as the station's tile counts it), the average stack, the
  rebuy window, and the levels to come; on the circuit the field, the places paid with the min cash and where you
  stand (`tournPanel`, `payList`); Your session (`sessPanel`: the net or your chips, hands won, the biggest pot, the
  best hand seen, your stack hand by hand as a line, your hands newest first with your cards, the board, what you made
  and what it won or lost); the room's own picture on the circuit (`picPanel`, at its own size or smaller, never
  stretched); the hand rankings with their cards (`rankPanel`, in two columns in a low band; a name wraps rather than
  lie under its cards). A panel gives up its list's last rows, then its least parts, then whole facts (`fitRoom`).
  **Video poker** (`vpDesk`, `vpOn`, `vpRoom`; `.stage.pvd`): the machine sized from the window by its card (`--vc`,
  to 210px), lying wide with the pay table beside the screen or upright with it over the screen (`.vup`), its own
  buttons under it; the room holds This session, Hands so far (dealt with the held cards raised, after the draw, what
  paid) and What has paid; early in a session, when the room under the machine holds little, it is only as tall and as
  wide as what it holds and the machine and the room stand together in the middle of the window. **The circuit's
  lobby** (`lobbyDesk`, `.czapp.czd`): the head, the road's choice and your totals over the room's picture and the
  stop's facts at the left, the stops in two columns at the right (a list that scrolls within itself, ending under its last whole stop). A resize lays
  the table out again from the state; online tables (TurnNet) use the same desk. The scratchpad's `big/poker/` has the
  scripts: `lib.js` (scenes through `window.__pk`), `mkstate.js` (saved games made by the starting version),
  `shots.js` (any scene at any window: scroll, off the window, clipped, under 9px, overflowing panels, rank names
  under their cards; `--png --dev` with `cmp.sh` is the device proof), `tbl.js` (fresh tables of 2 to 6 at any window
  with an overlap check of the pieces on the felt), `rz.js` (one hand through 19 window sizes, the state kept),
  `act.js` (a step then a picture: the lobby), `demo.js` (the demo to its end), `online.js` (a laptop host, a phone
  guest and a 2100x1860 guest at one TurnNet table).
  **Stock Market at a desk** (`html.mk-desk`, the block "The desk" in stocks.html: `deskPlan`, `deskBuild`,
  `deskPaint`, `deskFit`, `fitTiles`, `deskOff`; styles after the comment "THE DESK"): a trading desk, what a phone
  shows a tab or a sheet at a time standing open together. Three compositions by the window's shape (`deskPlan`, null
  at every device size and in a window like a tablet held upright): **stacked** (1000 wide or more, 1000 of height
  under the tickers): the chosen stock large over the board; **side** (as wide, lower): the board as a column beside
  the chosen stock; **tall** (700 to 999 wide): value and cash as two tiles, the chosen stock beside its ticket, the
  board across the window. From 1280 wide (1340 beside the board) an account that has been used has a column of its
  own at the left (`P.L`): its value through time with prices and dates along the chart's edges, what it is in, taxes,
  Since your last visit and what you own, giving up taxes, then what it is in, then the chart's height, then the
  chart, whole, as the column gets shorter. The chosen stock (the pane, standing open in `.dk-focus`, no sheet) has
  its chart at its own pixels with its facts beside it or under it (`foldFocus`). The board is the group's names as
  tiles (`fitTiles`): as many across as makes each largest, a chart under the name when there is height (`tl`), beside
  it in a row (`rw`), under it in a narrow one (`r2`), and in a board so short that fewer than four would show, plain
  rows without charts (`rs`); a long group scrolls inside itself by whole tiles, which stretch a little to end at the
  board's foot. At the right, where you act: the ticket (`.dk-tkt`, buy and sell without a sheet; two columns in a
  short wide strip, `t2`; without its small print when tight), your cash with Add money and Cash out, and waiting
  orders and the trades behind you (`dom.acts`), whole rows. In a short window value and cash are two slim tiles over
  the chosen stock (`acctTop`), so the board keeps the column's height; a board under 320 wide puts its search on its
  own line (`slim`). An account not used yet has the lessons still to read under the ticket (`paintLrn`, `.dk-lrn`,
  whole lessons). Content type steps with `--dkf` (1 at 1512 by 982 to 1.6 at 3024 by 1964), the controls with the
  gentler `--dkc` (to 1.3). A resize glides (`Kit.glide`, view-transition names on each panel) and keeps the stock,
  the tab and what is typed. The demo (games/demos/stocks.js) skips the phone's Buy and back buttons at a desk, where
  the ticket stands open, and waits for Apple by `__mk.sym()`. Scripts: the scratchpad's `big/stocks/` (`shots.js`
  scenes port, mkt, learn, sym, ticket, sell, chain, lesson, new, cash, basic with `--scan`; `prove.sh` the device
  proof; `resize.js`; `demo.js`; `lib.js` the saved market and accounts).
  **Sportsbook at a desk** (`html.sb-desk`, the block "The desk" in sportsbook.html: `sdPlan`, `sdBuild`, `sdBook`,
  `sdGrid`, `sdFit`, `sdWhole`, `sdElsewhere`, `sdOff`; styles after the comment "THE DESK", the desk's own box is
  `.sbd`): a sportsbook's wall. Three compositions (`sdPlan`, null at every device size and in a window like a tablet
  held upright): **three** (1180 wide or more, once there is a ticket): your book at the left (`sdBook`: the open
  tickets, nearest game first, then the settled ones newest first under Won, Lost and Net), the board in the middle,
  and at the right your bankroll, what is in play and what there is to collect over the printed slip; from 900 of
  height the settled tickets stand under the slip instead (`split`), so both kinds are in view; **two** (narrower, or
  no tickets yet): the board with Board and My bets over it, as on a tablet, and the money and slip at the right;
  **tall** (700 to 999 wide): the money across the top, the board, and your book beside the slip under it (`rowH`).
  The board's games are cards in as many columns as the room holds (`sdGrid`, `--gc`, a card at least 400 wide at
  `--sdf`), the leagues and My teams over them (one scrolling row when the board is narrow or the window short, `cx`);
  every column that scrolls rests on a whole card or ticket (`sdWhole`, never so high it leaves half a column empty).
  A league with no games (out of season, between games) keeps its note, and a league whose few games fill under three
  fifths of the board keeps them, and under either the games under way and coming up today and tomorrow in the other
  leagues (`sdElsewhere`, from the boards the tickers load), each a tap from the slip. The board's cards, the tickets
  and the slip grow with `--sdf` (1 at 1512 by 982, 1.3 at 3024 by 1964); in a slip taller than its column the stake, its chips, the totals and Place bet stay at its foot while the picks scroll under them (`.sd-foot`, `sdStuck`). A new ticket prints and flies into the open tickets' heading (`SD.betsHead`); the first
  ticket gives your book its column. A resize glides (`Kit.glide`) and keeps the slip, the league and the view. The
  demo (games/demos/sportsbook.js) points at Open bets at a desk. Scripts: the scratchpad's `big/sportsbook/`
  (`shots.js` scenes board, nba, my, team, bets, settled, new, off, down, slip with `--scan`; `espn.js` the stand-in
  feed) with `big/stocks/lib.js`, `prove.sh`, `resize.js`, `demo.js`.
  **Blackjack at a desk** (`html.bj-dk`, `bj-cp` in a window under 600 tall; `deskPlan`, `deskSet`, `deskFelt`,
  `deskSeats`, `deskZone`, `deskPrint`, `deskSide`, `infoPanel`, `infoFit` in blackjack.html; `deviceShape` keeps a
  window shaped like a phone or a tablet on the device layout, and `render()` lays the table out again from the state,
  so a window dragged to any shape mid-hand keeps the hand). The table is a half-moon as wide as its room, to 2.1
  times its height (`feltFit`), with the seats along its curved edge facing the dealer, each as low as the curve under
  its outer corner allows (`deskSeats`); a card is 58 of the felt's units `--u`, 210px at the most, and what is read
  on the felt (totals, results, name plates, bets) goes by `--t`. In a low felt (a strip) each betting circle lies
  beside its cards (`.bjfelt.low`). The felt's three printed lines (BLACKJACK PAYS 3 TO 2, the dealer's rule from the
  setup, INSURANCE PAYS 2 TO 1) are set on arcs between the dealer's cards and the hands, fitted against every seat
  under them so the print never lies under a card (`deskZone` takes the largest print that clears each seat's hands;
  the cards come down a step at a time until one does). Compositions: `duo` the table at the left with the session
  over the station at the right; `trio` a short wide window (the session, the table, the station side by side);
  `stack` the table across the top, the session and the station under it; `tall` the table, the station, the session.
  The station (`.ctrl`) is the game's own chips and buttons on a glass panel; the hand's two next buttons stay on one
  line (`.acts.nx`). The room (`.bjinfo`): This session (one player: won, lost, pushed, net, best hand, blackjacks and
  the bank; several: a row a player with won, lost, pushed, net and money, yours or the one acting lit), the winnings
  hand by hand as a line a seat, Hands so far (newest first: the dealer's cards and total, each hand's cards, total,
  Doubled, Split or Insured, and what it paid), and This table, the placard's rules as set; before a hand is played
  the session and the placard stand side by side (`.row.two`). While a hand is in play the room counts only the hands
  before it. `infoFit` drops the placard, then the chart, and keeps only whole hands. No strategy chart, count or hint
  beyond the game's own hint button. Where a seat plays from your own bankroll and not online, the room
  also holds Your bankroll (`bankPanel`: its line over past casino sessions and those sessions newest first, from the
  casino's ledger), which gives way as soon as the hands so far need the room; a station beside the table with less to
  hold than its place stands at the column's foot at its own height.
  **Baccarat at a desk** (`html.bc-dk`; `deskPlan`, `feltFit`/`feltGeo`, `deskLay`, `printWide`, `boardFit`,
  `boardBuild`, `paintRoadsDesk`, `sessView` in baccarat.html; `deskLay` lays the same nodes out for the window
  without rebuilding them, so a window dragged mid-squeeze keeps the hand). The felt is a wide half-moon between 520
  and 900 units across: the Player and Banker hands side by side under the dealer's tray, each with room for two cards
  and a third dealt sideways, a card up to 80 units and 210px; the three bets as real bands between the two pair
  circles (TIE PAYS 8 TO 1, BANKER PAYS 0.95 TO 1, PLAYER PAYS 1 TO 1), a click on a band placing the chip; the game's
  name, PUNTO BANCO, the limits and the shoe printed at its foot. Compositions: `duo` (the felt at the left, the
  scoreboard under it where the felt leaves the height; the session over the station at the right), `trio` (a short
  wide window: the scoreboard and the session, the felt, the station), `stack` (the felt across the top, the
  scoreboard and the session under it, the station at the right), `tall`. The scoreboard draws both roads together as
  a casino board does, the bead plate (a bead a hand, six to a column) beside the big road (red and blue rings, a
  tie's slash, a pair's dot), with the counts of Banker, Player and Tie wins and the shoe; cells 17 to 46px from the
  room (`boardFit`), and where only one fits the phone's Big Road and Bead Plate switch. The room also holds This
  session (net, bet in all, biggest win, naturals, longest run) and Hands so far (each hand's cards with the third
  dealt sideways, who won by what, and what each bet paid). The station is the bankroll, the session and Cash out over
  the game's chips and buttons.
  **Slots at a desk** (`html.sl-dk`, `sl-cp` under 600 tall; `deskPlan`, `deskApply`, `deskOff`, `paintInfo`,
  `infoModel`, `spinRow`, `chartEl`, `infoFit` in slots.html; `fitCab` hands `cab.resize` the plan's frame, `fitGlide`
  glides the station and the room when the composition changes). The cabinet is the same three.js machine; the plan
  only says where it stands and how near the camera is: whole where that leaves it 640px a meter or more, from its
  deck up where it doesn't, and from its deck to the top of its reels in a short strip, never nearer than 1,150px a
  meter (a symbol about 190px). Compositions: `wide` (the room at the left, the machine in the middle, the station at
  the right), `duo` (the machine, with the room over the station at the right), `tall` (the machine across the top,
  the room and the station under it). The station is the game's own controls stood up as a panel at the right with the
  player, the session and Cash out at its head (the bank row moved into it), the steppers, Spin and Max bet, as a
  machine's deck has them. The room (`.slinfo`): the machine's own pay table at the bet now (`paysHtml`; a three-reel
  machine prints its pay table on its top box, so the room has it only when the top box is out of the picture), This
  session (net, bet in all, spins that won, biggest win, longest dry spell, free games, Hold & Spin, jackpots), the
  credit spin by spin, and Last spins, each as the grid the reels stopped on with what it made and paid. While the
  reels turn or a feature plays the room keeps the session as it stood before (`IM`). `infoFit` drops the chart, the
  spins, then the session, keeps only whole spins, and hides the room where nothing fits. After the camera is placed,
  `deskDeck` measures the deck and its buttons as they land on the screen (the deck stands out toward the camera, so it
  lands lower than the plan's heights say) and moves the machine up, then smaller, until the whole deck is in view.
  **The home screen at a desk** (`html.hdk`, the blocks marked `==DESK==` in index.html: `deskHome`, `deskLay`,
  `deskKp`, and the styles at the end of the page's stylesheet). `deskHome` is the kit's test for a desk (480 wide
  and over 520 tall at least, and over 1024 the long way or over 768 the short way), so a phone and a tablet never
  get the class and their pages are unchanged; it is set before anything is drawn and again on every resize. The
  page takes the window's width (the 1240px column is gone, the sides padded by `--dk-pad`, 24 to 64px). A tile is
  sized from the window, about a twelfth of its width or a ninth of its height, 124 to 216px, and the columns are
  widened a hair so they end exactly at the page's edge (`--dk-tw`, `--dk-cols`, `--dk-g`); the tile's name, its
  player count, its star and its corners step up with it (`--dk-f`, `--dk-r`), and its art, stamp and baked glow are
  already in the tile's own units, so `build-tile-glow.js` needs no new run. The sections lie in one grid of those
  columns (`deskLay`, `--sp` on each section): each takes as many columns as its games need, at least what its
  heading needs (measured all at once), and stands beside the one before when it fits in the rest of the row; a
  longer one wraps into the rest of a row when that is at least half its width, so Favorites' four tiles and Classic
  Cards share a row instead of leaving one of air; the Consoles always take the whole width. Keep playing lays every
  game in progress out at once, wrapping instead of sliding (no arrow): cards a step larger than a tile while they
  fit in a row, then down toward a tile's size so they share whole rows evenly (`deskKp`, `--dk-kc`, `--dk-kw`,
  `--dk-kf`); the online games fill the row's width in columns of 380px or more. From 1800 wide the search, Players
  and the kinds of games, Daily puzzles, the open tables' banner and Surprise stand in one bar. List view keeps its
  sections one under another, its rows in columns from 256px times `--dk-f`. A resize lays it all out again in a
  frame and keeps the section you were looking at where it was on the screen. The game sheet stays the kit's 560px
  sheet (chrome keeps its size); its framed setup is the tablet's. The scratchpad's `big/home/` has the scripts:
  `lib.js` (the page seeded: games in progress, favorites, online games and friends' tables through `__homeSeed`, a
  fixed clock), `look.js` (any window, tile or list view, with or without Keep playing, the sheet open: a picture
  and a scan), `proof.js` (the devices against ad89101, pixel by pixel; `BB=1` is base against base), `resize.js`
  (sixteen windows on one page, the sheet open through three), `perf.js` (layers, scroll frames at 4x, a sync
  redraw), `n320.js`.
  **Lorcana at a desk** (`deskPlan`, `deskSet`, `deskRoom`, `deskFitRoom` in lorcana-play.html, before `layoutVars`,
  which asks for the plan on every render; styles in the last block of the page's main stylesheet, every rule under
  `html.lc-dk`, set only while the table shows in a window that is not a phone's or a tablet's shape (`deskDevice`,
  Horse Race's test), at least 560 tall and 1000 wide or 1100 tall). Nothing is scaled: the table keeps its felt,
  mats and strips, and the board's cards (`fitBoards`' `maxCu` from `DK.bmax`) and your hand (`--hh` from the plan)
  grow to 210px wide (`--cu` 293). The strips' plates (avatar, name, lore ring, inkwell, deck and discard piles, the
  other hand) and the phase ribbon step up with `--dkf` (1 at 1512 by 982, 1.5 at most). Compositions: `lc-dk-w`
  (wider than tall): the room at the left (`--rw`), the table, your hand along the foot with End turn standing at
  its right at a button's height (`--sw`); under 820 tall (`lc-dk-p`) each player's strip stands on end beside their
  side of the table (`--pw`, the felt's grid in two columns, the inkwell's hexes folded to one), so the cards keep
  the height; `lc-dk-t` (taller than wide): the table, the hand and the bar as on a tablet, and from 1100 tall the
  room under them (`--ph`) in two columns. **The room** (`deskRoom`, glass panels `.dk-pn`, drawn in `renderBar`
  instead of the plain log): Lore, the race turn by turn from the lore ledger (`S.ll`, the same running totals
  `record` keeps as `lr`) with the goal ruled across, each player's lore of what they need and where it came from
  (quests, abilities, locations), a tap opening the ledger (`data-tap="lore"`); This game, what each player has done
  from `S.st` (cards played and inked, quests, challenges, characters banished and lost; left out until something
  has happened); Discard piles, both, newest first as small cards (public at a real table), a tap reading the card
  in its pile (`dk-disc` → `discZoom`), the heading opening the pile; Game log, newest first, whole lines only, its
  heading opening the full log. `deskFitRoom` gives up This game, then the discard piles, then the race whole when
  the room is too short for the log to keep 110px. The opening hand spreads across the felt in one row of cards to
  210px (`renderMull`'s width and cap read `DK`). A window dragged from one composition to another lays the table
  out again from the state inside `Kit.glide` (`onResize`, `deskKey`; the table, hand, bar and room carry view-
  transition names only at a desk). The setup and the results card are the kit's desk. The scripts are the
  scratchpad's `big/lorcana/` (`lib.js` routes Lorcast's card list from `demo/lorcast` and fetches card art once
  from the Storage backup; `gen.js` saved games made by the starting page; `shots.js` the scan and the device proof
  with `--base --png --dev`; `flow.js end|resize|mull`; `demo.js`; `measure.js` audit.js's measure with the cards
  routed in; `probe.js`; `padbase/` the starting page padded to the new one's size, which shows the two device
  differences below are the page's own animation timing).
  **Spanish One at a desk** (`.so.dk` with `dk-wide`, `dk-strip`, `dk-square` or `dk-tall` from `Cards.DESK`, set by
  `applyDesk` only while such a window shows; `deskShape`, `deskCol`, `fitDesk`, `deskCardCap`, `paintDkL`,
  `paintDkR` in spanishone.html; the styles after the comment "At a desk"). The felt is a column of its own, sized
  from the window: the other players' plates across its head in one row or two (`--opw`, `--fz`, to 250px), the draw
  pile and the pile played on inside the direction ring, and your hand along its foot, the cards to 210px
  (`deskCardCap`: a quarter of the height, a hand of up to 12 in one or two rows). In a short wide strip, and in a
  wide window under 1000 tall with seven or more players, the other players stand in a column at the felt's left as
  on a phone held sideways (`dk-col`, the `.so.dk-col` selectors added to the sideways plate rules), with your hand
  under the piles and that column. At the left the score sheet (`.so-dk.l`): a row a hand (who went out, the card
  they went out with, what they scored, the hand in play lit), the oldest hands given up first, and under it the
  race to the target, a line a player in their color, yours named in gold; a one-hand game has no left panel (`dk-
  one`). At the right this hand (`.so-dk.r`): every player in the order play goes with the cards they hold, One Card
  when called, their last turn (`LT`, kept by the page from the playback's events, not saved: "Played the Red Skip"
  with the card, "Drew a card", "Took 4 cards and lost the turn"), which way play goes and a Draw card waiting, then
  This table, the house rules as set; a panel too short gives up the rules, then the sentence under its head, then
  goes two to a row without the last turns (`.pt.two`), never a cut row. The caption and its buttons stand under it,
  beside your hand. A nearly square window has the sheet over this hand at the right; a tall one has both side by
  side under the table. A counted hand is written in the right panel (`showTally`'s `place`, `TALLY`) with its Deal
  hand button where the turn's buttons are, and moves between the panel and the sheet over the table when the window
  changes size. A resize glides (`relayout`, `Kit.glide`). Test hooks `__so.desk`, `__so.lt`. The scratchpad's
  `big/spanishone/`: `lib.js` (positions made by the core's robots), `shots.js` (any scene at any window with the
  scan), `flow.js` (a whole game on the page, `--resize` through 14 windows mid-hand and with the count up),
  `proof.js` (the devices before and after, pixel by pixel; `NOISE=1` is the starting files against themselves),
  `online.js` (a laptop host and a phone guest), `demo.js`, `oldsave.js`.
  **Balatro at a desk** (its files say jokerrun; `html.jr-dk` with `jdk-c`, `jdk-s` or `jdk-b` on `.jr`, set by
  `deskLay` from `layout()` in jokerrun/ui.js only while one of the card tables' desk windows shows, `DESKQ`, the
  same queries as `Cards.DESK`; `handsList`, `deckGrid`, `paintDk`, `litHand`; the styles after the comment "At a
  desk" in jokerrun.html). The table loses its 1,500px cap, the hand's cards go to 210px and the Jokers to 170
  (`layout`'s caps), and the score panel steps up with the table by `zoom` on `.side` alone (`--sbz`, 1 to 1.45, its
  column `--sb` widened to match; the bar, menus and sheets keep their size). A panel of the game's own slate
  (`.jdk.pn`) holds what is otherwise behind Run Info and the deck: Poker hands (each hand's level, its Chips and
  Mult, how often it was played this run; the hand you have picked lit as you pick it), this ante's three blinds
  with their targets, rewards and the boss's rule (the one being played or next lit, the ones behind you dimmed),
  and while a blind is played the cards left, a row a suit and a column a rank with the cards still to draw lit and
  the ones drawn or used this round dimmed, as the deck's own view shows them. Where it stands: a column between the
  score panel and the table (`jdk-c`) while that costs the hand none of its size; otherwise under the score panel,
  in the room the score panel leaves (`jdk-s`, Tim's 1512 by 982); along the foot of a tall or nearly square window
  (`jdk-b`, the hands in as many columns of 290px or more as fit). A panel too short gives up whole rows: this ante
  first, then hands never played and never leveled from the rarest, then the cards left, then the rest from the
  foot, never the lit one. A resize keeps the run and the cards picked. The scratchpad's `big/jokerrun/`: `shots.js`
  (scenes blind, play, sel, shop at any window with the scan), `resize.js` (17 windows mid-blind), and
  `big/spanishone/proof.js` with `GAME=jokerrun` (the devices before and after).
  **Yahtzee at a desk** (`html.yz-dk`; `deskPlan`, `deskPaint`, `deskSync`, `racePanel`, `turnsPanel`, `bestPanel`,
  `trimList` in yahtzee.html; `deviceShape` keeps a window shaped like a phone or a tablet on the device layout, and
  a window under 480 wide or 540 tall is never a desk). The score pad is the hero and every player's column is on
  it: its rows (`--rh`, 23 to 84px), its type (`--ys`, 0.8 to 1.9) and its label column (`--lw`) are sized from the
  window's height, the type stepping down before the card would be too wide (`card(h, split, maxW)`), and a player's
  name in its head never breaks inside a word (the head's type steps down, `--thf`). In a low window the pad's two
  sections stand side by side as two tables (`DK.split`, `.sc2`), as on a real pad folded open. The dice tray takes
  the room beside the card with dice to 190px (`--dds`), five in a row or three over two where that makes them
  larger (`tray`, `.k3`), the felt's height from the dice (`--fh`). `deskPlan` weighs two compositions by the row
  height and the dice they allow: `col` (the card at the left, the tray at the right of it, the room under the tray,
  or beside it in a low window, and under the card) and `stack` (the tray across the top, the card under it, the
  room under the card: tall windows). Real dice (`mode: 'card'`) is the card alone with whose card is being filled
  at the top of the room. The room, in glass panels placed in the boxes the plan leaves (`slots`): The race (every
  player's running total round by round with the upper bonus where it was earned and extra Yahtzees, the round now
  in gold; alone, your total against your best earlier game's, dashed, from the history: `runTotals`, `bestPace`);
  Turns so far (each scored box with the five dice it was scored with, newest first: alone in up to three columns,
  several players under a heading a round, and in a wide panel as a sheet with a row a round and a column a player,
  `ytab`); Best scores (people's best totals on this device from `GameHistory`, with the date). A list gives up
  whole rows from its foot (`trimList`). Every box is fixed-positioned from the plan, so the page never scrolls; a
  new window size lays the table out again from the state, gliding when the composition changes (`Kit.glide`). Test
  hook `__yahtzee.desk()`. The scratchpad's `big/dice/` has the scripts: `h.js` (scenes, screenshots and an audit),
  `ys.js` (Yahtzee's scenes: solo, two, four, eight, real dice, a finished game), `proof.js` with `cmp.sh` (the
  device proof), `rz.js` (resize), `demo.js`.
  **Farkle at a desk** (`html.fk-dk`; `deskPlan`, `deskPaint`, `deskSync`, `sheetPanel`, `chartPanel` in
  farkle.html, and `chartHtml`, the scoring chart's table, shared with the menu's sheet; `deviceShape` keeps phones
  and tablets on their layouts). The felt is sized from the window and the dice from the felt (`--fds`, 56 to
  130px), the cup with them (`zoom: --cz` on the cup alone), the ledge's set-aside dice and their points, the stamp
  and the felt's message too; the felt's height is the table's less the ledge (`DK.zh`, set on `.zone`).
  Compositions: `wide` (the scores at the left, the table, the turn at the right) and `tall` (the table across the
  top, the scores at the left and the turn at the right under it). At the left: the players' scores as the game's
  own cards (two to a row with four or more players where the column is wide enough), the final-round note, and The
  score sheet, a row a round with what each player banked (a penalty in red) and the totals under them, the oldest
  rounds giving way first; with five or six players a column's head is the player's color, as on the score cards
  over it. At the right: who is rolling and why, This turn, Roll and Bank stacked, the rule line, and What scores,
  the game's own scoring chart (the chart moves under the sheet where the right column is short, and gives up its
  last rows, then itself). The page never scrolls; a new window size draws the table again from the state, mid-roll
  too, and glides when the composition changes. Test hooks `__farkle.desk()`, `__farkle.render()`; scenes in the
  scratchpad's `big/dice/fs.js`.
  **Left Right Center at a desk** (`html.lr-dk`; `deskPlan`, `deskBoxes`, `deskPaint`, `deskSync`, `rollsPanel`,
  `racePanel`, `winsPanel` in lrc.html; `deviceShape` keeps phones and tablets on their layouts). The oval is sized
  from the window and everything on it grows with the table's unit `--lu` (1 to 2.3, from the oval's size): the
  seats, their stacks and chips (the stack's spacing and the chip's place through `LU()` in `fillStack` and
  `topChipRect`, the seats' inset round the rail in `calc(50% - 46px * var(--lu,1))`, identical on a device), the
  name plates (whole names, never cut), the dice (to 110px) and the pot. Compositions: `wide` (the room at the left
  when it has a column of 320 or more, the oval, the station at the right: the turn, Roll, Auto-roll and the pace,
  the round and chips; with no column for the room it lies under the station) and `tall` (the oval across the top,
  the station at the right under it, the room at its left). The room: Chips round by round (every player's chips
  from `S.rounds` as a line a player, the name and count at its end); Rolls so far (every roll newest first from
  `S.rl`: the dice as the game's own L, R, C and dot faces, who rolled, and where the chips went in a sentence:
  "Passed one to Jamie and one to the pot."); Pots won before (who has won how often on this device, from the
  history). A list gives up whole rows. Mid-roll a resize moves the oval and seats without redrawing (`deskSync`
  with `busy`), so the flying chips land where they should. A window that cannot hold the oval over a station (560
  by 620) keeps the phone's layout, which scrolls as it did. The scratchpad's `big/dice/ls.js` has the scenes (three
  and ten players playing fast, a fixed mid-game for the device proof).
  **Shell Game at a desk** (`html.sg-dk`; `deskPlan`, `deskPaint`, `deskRoom`, `deskSync`, `runsPanel`, `missPanel`,
  `bestPanel` in shellgame.html; `layout()` sizes the cups from the plan's felt, to 400px wide; `deviceShape` keeps
  phones and tablets on their layouts). Compositions: `wide` (a column at the left with the show's marquee
  scoreboard, what just happened and the room; the table at the right with Shuffle under it at the right, where you
  act) and `tall` (the table across the top, the button under it at the right, the column at its left). The room:
  This run, or The runs with two to four players (every pick in order as a numbered square, green found and red
  missed, the level being played ringed in gold, and the levels cleared: every player's run in view, as the rule
  about boards nobody hides asks); Where the ball was (each miss as a row of small cups, the one picked ringed red
  and the ball under the one that had it, with the sentence: "You picked the left cup. The ball was under the right
  cup."); the best runs at this table for the chances being played, from the history. Panels give up whole rows,
  then whole panels from the foot. Leaving a desk puts the scoreboard, the table, the status and the button back in
  their device order. Test hook `__shell.desk()`; scenes in the scratchpad's `big/dice/ss.js`.
  **Plinko at a desk** (`html.pk-dk` with `pk-w` or `pk-t`; `pkDesk`, `deskClass`, `paintRoom` in plinko.html;
  `deviceShape` keeps phones and tablets on their layouts). The board, and the Big Wheel before it, lose the
  tablet's caps (760 and 620 wide): in a wide window (`pk-w`) the board stands at the right as tall as the window,
  the wheel between the column and its buttons (`layout`, `wheelLayout`), and the show's plate, the players' strip,
  the hint and the room stand in a column at the left (at most 680 wide, against the board); in a tall window
  (`pk-t`) the board or wheel is as wide as the window under the plate and the strip, with the room under it. The
  room: Every chip so far (a row a player with their total and each chip's slot value as a plate, the $10,000 in
  gold, $0 in red, the chips still to drop as empty plates; refreshed with the strip) and Best totals (the best
  games on this device from the history). Whole rows only: the best totals give up their last rows, then the panel.
  Test hooks `__plinko.paint()`, `__plinko.desk()`; scenes in the scratchpad's `big/dice/ps.js`. Not checked: the
  Big Wheel's own picture at a desk (its three.js canvas does not screenshot in the headless browser here).
  **Wheel of Fortune at a desk** (`html.wf-big`, the block "The desk" in wheeloffortune.html: `deviceShape`,
  `deskWanted`, `deskPlan`, `deskLayout`, `deskOff`, `paintDesk`, `playRows`, `fitDesk`; styles after the comment
  "The desk"; `.show.big` with `bT`, `bR`, `bQ`, `bS` or `bK`, only while a desk layout shows, and never at a
  phone's or a tablet's shape, where the page's own `desk` and `short` layouts are as they were). The puzzle board
  and the wheel are the show's set, sized from the window: the board's tiles to 100px (its letters are 80% of a tile
  through `cqw`, so they grow with it), the wheel to 1,250px; the podiums, the host's line, the buttons and the keys
  stay their size at the right, a step up in the largest windows (`--ks`, 1 to 1.4). `deskPlan` measures the right-
  hand parts as drawn and weighs five compositions by the tile and the wheel each gives (the board counts a little
  more, to a 66px tile, the wheel to 780px, the room a little): `T` the board across the top with the room, the
  wheel and the podiums, host line and keys under it (near-square and large windows; with no column for the room it
  lies under the keys, `infoB`); `R` the room, the wheel the window's height, and a column with the board over the
  podiums and keys; `Q` a wide strip (the room, the wheel, the board at its own height, the podiums and keys); `S` a
  short strip (the board over the podiums beside the keys, `--dw`); `K` a tall narrow window (board, wheel, podiums,
  keys, the room under them). The room (`.wfi`, glass panels `.pn`): Scores, the rows of `S.rows` round by round
  with the round in play lit (`S.row` and each bank, at risk until the puzzle is solved) and the totals; This
  puzzle, play by play newest first from the puzzle's own event list in `S.log.pz` (each spin's value and the letter
  called with what it found, a vowel bought, Free Play, Bankrupt with what it took, Lose a Turn, a wrong solve), the
  count of a letter read from the board as it shows (`found`, so a letter still turning over is not counted early);
  a contestant online, whose state has no log (it holds the puzzle's answer), sees the letters called in order with
  what each found (`S.used`); Puzzles so far, newest first (`S.log.pz` entries with `m`: kind, category, answer, who
  solved it and for how much). A low window wider than tall that no device has and no composition fits (900 by 600)
  gets the phone's sideways layout (`DK.low`). `fitDesk` gives up whole rows, the oldest first, then the notes, then
  whole panels, so nothing is cut. A change of composition glides (`Kit.glide`, view-transition names `wf-board`,
  `wf-wheel`, `wf-pods`, `wf-deck`, `wf-info`); a resize mid-spin keeps the spin. Scripts: the scratchpad's
  `big/showgames/` (`lib.js`, `wof.js <sizes> --phase=mid|r2|bonus|over|demo|setup`, `dbg.js`, `proof.js` with
  `cmp.sh` the device proof).
  **Deal or No Deal at a desk** (`html.dn-big`, the block "The desk" in dealornodeal.html: `deviceShape`,
  `deskKind`, `deskPlan`, `deskResize`, `deskOff`, `roomEl`, `roundsHTML`, `caseChip`, `fitRoom`; styles after the
  comment "The desk"; `#app` is a grid of the stage, the desk and the room only while `DK.on`, and never at a
  phone's or a tablet's shape or in a window under 760 tall and less than 1.6 times as wide as tall, where the cases
  are larger in the page's own layout). The stage, the money board and the 26 cases, is the hero and takes the room
  the window gives: `arrangeCases` lifts its caps at a desk (`DKC`: a case to 196px, the money board's bars to 72px
  tall and 260px wide, their amounts to 30px). The desk (your podium, the prompt, the Banker's offer with Deal and
  No deal, the offers so far) keeps its parts and steps up with `--du` (1 to 1.5) in the largest windows.
  Compositions (`deskKind`): `w` a window 1.6 times as wide as tall or more (the room, the stage, the desk side by
  side; the room only from 1240 wide and 700 tall), `t` a tall or nearly square one (the stage across the top, the
  room and the desk side by side under it), `s` a tall narrow one (the stage, the desk, the room). The room (`.dnr`,
  glass panels): the contestant's game round by round, newest first (`roundsHTML`: each case opened in that round as
  a chip with its number and the amount it held, blue or gold as on the board, then the Banker's offer that ended
  the round and No deal, Deal at, or, after a deal, what the Banker would have offered; the round in play says how
  many cases are still to open), and with 2 to 4 contestants a row each (`.ct`: who is playing now and in what
  round, who is up next, and each finished contestant's result with how it ended). `fitRoom` hides the oldest rounds
  whole, then the contestants. A change of composition rebuilds the screen inside `Kit.glide` (view-transition names
  `dn-studio`, `dn-desk`, `dn-room`); the state is the game's own. Scripts: the scratchpad's `big/showgames/`
  (`dond.js <sizes> --phase=mid|pick|offer|pass4|done|demo|setup`, `proof.js` with `cmp.sh`).
  **Press Your Luck at a desk** (`html.pyl-big`, the block "The desk" in pressyourluck.html: `deviceShape`,
  `deskWanted`, `deskFit`, `deskOff`, `paintRoom`; `fit()` hands over to `deskFit` and keeps the old body as `fit0`
  for the devices; styles after the comment "The desk"; never at a phone's or a tablet's shape). The Big Board is
  the hero, sized from the window as it always was but with the room taken off first: wider than tall, the room at
  the left (`--rw`, 300 to 500), the board in the middle (its squares 0.7 to 1.15 as tall as wide), the podiums and
  SPIN at the right (`--sw`, 320 to 480), centered in their column; a nearly square window, where the board would be
  held back by the room's width, gives the board that width too and stands the room under SPIN at the right
  (`rside`); upright or nearly square, the board across the top, the podiums and SPIN under it and the room under
  them where 200px or more is left. The podiums, the button, Pass and the buzzers step up with `--pu` (1 to 1.45).
  The room (`.pyr`, glass panels on the show's purple): Scores (each round from `S.rows`, the round in play lit gold
  from each bank less `rStart`, the totals with the leader in gold, and each contestant's Whammies out of four, Out
  once a fourth one lands), and Stops this round, newest first, from `S.log.st` (who, what the light stopped on:
  cash with one more spin, a prize by name and worth, matched in order with `S.log.prizes`, a Whammy that took the
  bank, Double your money, and the bank after; in the bonus round, the bonus stops); during the questions it says
  that right answers earn the spins. The log is in what every podium's device receives (`pub`), so a contestant
  online sees the same room, painted from `renderPods`. Whole rows go first, the oldest, then the panel
  (`paintRoom0`). Scripts: the scratchpad's `big/showgames/` (`pyl.js <sizes> --phase=board|quiz|demo|setup`,
  `proof.js` with `cmp.sh`).
  **Fortune Teller at a desk** (`html.ft-big` on the picker only, `pickDesk` in fortune.html; `deskWin` in
  games/fortune/eightball.js, oracle.js and swami.js, the same test in eightball/ball3d.js; never at a phone's or a
  tablet's shape). Fortune Teller keeps no record of past fortunes, so a desk has no room to fill with the game's
  own information and gets none: the tellers themselves grow. The picker's four booths are sized from the window, in
  a row or two by two, whichever makes them larger, to 560px (`--ftw`, `--ftc`, the title and words by `--ftu`, 1 to
  1.5), with a hover lift. The Fortune Cookie table already filled the window. The Mystic 8 Ball's ball grows to a
  360px radius and its close-up to 470 (200 and 260 on the devices); the Oracle Dial's machine to 1.4 of its drawn
  size (`kd`, with its ticket, slot and coin); the Great Zandor's booth to 1,900px wide (`layout` in
  swami/cabinet.js, a cap no device reaches) and the card read up close to 640. Scripts: the scratchpad's
  `big/showgames/` (`ft.js <sizes> picker,cookie,eightball, oracle,swami`, `proof.js` with `cmp.sh`).
  **Bingo at a desk** (the block "The desk" in bingo.html: `dkWin`, `deskLay`, `dkFit`, `dkBest`, `dkRatio`,
  `deskSeq`, `dkOff`; styles after the comment "The desk", every rule under `html.bg-dk`, set only while a desk
  layout shows; `dkWin` says no at the phones, at the iPad mini either way up and at the other iPads by touch).
  Cards and Keno: every player's card is the hero, all at once (Show every board), sized from the room they really
  have: `dkRatio` measures a card's height for its width once a kind of card, `dkBest` tries every number of columns
  and takes the one that gives the largest card (to 680px wide for Bingo, 600 to 680 for Keno), and `dkFit` sets
  `--dc` and `--dw` from the box the cards really have (a ResizeObserver on `.k-main` lays them out again whenever
  that box changes). The caller's station (`.kn-side`: the cage or the deck with the ball or card just drawn, the
  buttons, the board of what has been called) stands at the right (`bg-side`), or across the top of a tall window
  with the board at the left and the buttons at the right (`bg-stack`, `bg-nar` under 900 wide); a short window lays
  the station in two columns where the cards keep nearly their size (`bg-two`), or leaves its board out (`bg-nod`).
  The room under the station holds every call so far, newest first (`.k-seq`, `deskSeq`: balls as large as the room
  lets every call show, 40 to 64px, or the playing cards drawn; whole rows only). A card's name and its count of
  what it still needs step up with the card inside a container query (`@container (min-width:261px)`), so a small
  card keeps the short name. Call only (paper cards): the flashboard is the hero, its 75 squares as large as the
  window allows (`--dfh`, `--dff`), either across the top with the calls so far, the cage and the buttons in a strip
  under it (`bg-top`; the cage grows with the strip, `--dcw2`; under 900 wide the strip stands as a column, `bg-
  nar`) or at the left with the cage, the buttons and the calls in a column at the right (`bg-side`), whichever
  gives the larger squares. A resize lays it out again from the state (`Kit.glide` when the composition changes).
  The scratchpad's `big/p4/` has the scripts: `bingo-states.js` (fixed saves), `scenes-bingo.js`, `snap.js` with
  `cmp.sh` (the device proof and the desk shots, `SCAN=1` for the scan), `resize.js`, `demo.js`, `online-bingo.js`
  (a laptop host and a phone guest at one TurnNet table).
  **Apples to Apples at a desk** (the block "The desk" in applestoapples.html: `dkWin`, `deskLay`, `dkFit`,
  `dkRoom`, `dkOff`; styles after the comment "The desk", every rule under `html.aa-dk`, set only while a desk
  layout shows and the table is in play; the game's end and the setup leave it). The table is sized from the window:
  `dkFit` shares the column's height between the table's cards and your hand (about three to two), then measures the
  felt and gives the pile and the card turned over (`--dmc`, to 250px) and the played cards (`--dpc`, to 230px, the
  rows that make them largest, a seat's name tag counted) their sizes; a felt taller than it is wide lays the pile
  over the played cards (`aa-stk`); cards drawn small leave out their small print as the phone's small cards do
  (`aa-sm`, `aa-smm`). Compositions: `aa-wide` (the room at the left, the scores, the table and your hand on its
  rail at the right), `aa-strip` (a short wide window: your hand stood up in a column at the right as on a phone on
  its side, the room at the left from 1500 wide), `aa-tall` (the scores, the table, the hand, and the room's two
  panels side by side under them). The panels give way, not the cards: where the played cards would be under 100px
  the room goes (`aa-noroom`). The room (`.aa-room`) holds what lies face up on a real table: the cards each player
  has won by name with how many of the target (`V.wonC`), and the rounds so far newest first, each round's green
  card and winning red card with who won it and who judged (`V.log`; the grown-up deck's rounds as the filled
  sentence); whole rows only. Both lists come from `viewFor`, so a guest gets them from the host; a table hosted by
  an older copy sends neither and the room leaves them out. The table is measured again on the frame after it is
  laid out (`DK.raf`). Scripts: the scratchpad's `big/p4/scenes-applestoapples.js` (3, 4 and 10 players in every
  phase) with `snap.js`, `cmp.sh`, `resize.js`, `demo.js`.
  **Mini Golf at a desk** (`dkShape`, `dkSet`, `dkFill` in minigolf.html; styles after the comment "The desk", every
  rule under `html.mg-dk` with the stage's `mg-dkp`, set by `render()` only while a desk layout shows; a phone, the
  iPad mini, the other iPads by touch and a wide window under 1000 across keep their own layouts). The paper
  scorecard is the hero: `dkFill` gives its rows the height the window allows (`--dh`, 36 to 130px, no taller than
  half again a hole's width), the strokes and totals sized to both (`--dfv`, `--dft`) and the names' column from the
  card's width (`--dnw`); an 18-hole card where it makes every box larger stands as the front nine over the back
  nine (`render`'s block choice at a desk). `mg-wide`: the card and the room under it at the left, the green with
  its steppers the window's height at the right where the taps go (`--dgw`, 440 to 600px); `mg-tall`: the card, the
  room, then the green with its rows sized to what is left (`--dph`). The room (`.mg-room`) holds the standings,
  fewest strokes first, each with where it stands against par, holes in one and how far behind the leader, and this
  course's best rounds over the same number of holes from past rounds (`GameHistory`); a room under 170px tall is
  left out, and its lists give up whole rows. A resize draws the page again (the game's own resize handler).
  Scripts: the scratchpad's `big/p4/scenes-minigolf.js` with `snap.js`, `cmp.sh`, `resize.js`, `demo.js`.
  **Trivia at a desk** (the block "The desk" in trivia.html, before "The end": `dkWin`, `deskLay`, `dkRoom`,
  `dkRows`, `dkStand`, `dkOff`; styles at the end of the page's style, every rule under `html.tr-dk`, set only while
  a question is in play, in Countdown, Pass and play or Buzz in; the final screens and the setup leave it). The
  studio stage takes the window (the stage's own layouts inside it: the question and its clock at the left, the
  answers at the right in a wide stage), its question and its answers in larger type from the stage's size (`--dqf`,
  `--dtf`: 1 to 1.7 times the tablet's); a mouse over an answer lights it. `tr-wide` (1100 wide and at least nearly
  square): the room at the left (`--drw`), the score strip or the HUD over the stage at the right; `tr-tall`: the
  room's panels side by side under the stage. The room (`.tr-room`) holds the questions so far, newest first, each
  with its category, the question, the right answer, how it went (you got it, you picked another answer, who got it
  in a group game, nobody got it) and the points it scored (Countdown from `VW.log`, the other ways from `S.log`),
  and with more than one player the standings (online Countdown from `VW.ro` and `VW.sc`); whole rows only. Scripts:
  the scratchpad's `big/p4/scenes-trivia.js` (saved Pass and play and Buzz in games, 1 to 6 players) with `snap.js`,
  `cmp.sh`, `resize.js`, `demo.js`.
  **Would You Rather at a desk** (`deskWin`, `deskPlan`, `deskApply`, `roomEl`, `qRow`, `fitRoom`, `deskOff` in
  wouldyourather.html; `html.wy-dk` and the plan's class on `.wy` only while a desk layout shows; styles after the
  comment "The desk"). The two cards are the hero: `deskApply` moves what `render` drew into `.dk-main` (a size
  container), and the cards stand side by side (`c-row`, a main column wider than tall) or one over the other
  (`c-col`), their words sized by the column's container units to 5.25rem at most, the A and B, the OR, the name
  chips, the percentages and the bars a step up with them; a short window puts the pass-and-play cover's spot beside
  its words (`short`). Compositions: `wide` (the room at the left, the cards at the right where the taps go, the
  buttons under them at the right), `stack` (a squarer or taller window: the cards over the room), `solo` (the cards
  alone, before a question is answered in a game without points, and in any window under 900 wide and 1100 tall,
  where the cards keep their own height and the column scrolls only if eight names need it, `small`). The room: the
  points (`.dk-st`, a row a player, the leader's number gold, the one passing the phone ringed in their color; the
  strip over the table goes while the room shows it) and the questions so far newest first (`qRow`: the question's
  number, both choices each with a bar in its card's color and the people who chose it, the side more people chose
  in white), giving up its oldest questions whole and saying how many (`fitRoom`). The results under Kit.win's card
  (`renderOver`) are every question as the room draws it, in columns, with the buttons in a column at the right. The
  swipe hint is left off at a desk. A resize lays the page out again from the state (`render`), gliding when the
  composition changes. The scripts are the scratchpad's `big/party/` (`wy.js` scenes and scan, `proof.sh` the device
  proof, `rz.js` with `prep-wy.js`, `demo.js`, `lib.js`).
  **Mind Meld at a desk** (`deskWin`, `deskPlan`, `deskLay`, `logPanel`, `fitLog`, `deskFin`, `deskOff` in
  mindmeld.html; `html.mm-dk` and `.dk`, `.dk-wide`, `.dk-stack` or `.dk-small` with `t-row` or `t-col` on `#app`
  only while a desk layout shows; styles after `@media (max-width:370px)`). The table takes the window, and the
  card, the sand timer, the bowl, the clipboard's ruled lines and the slips are sized by `--u` (1 to 1.7, from the
  window): the card's question to 4.25rem, a slip 184px wide times `--u`. A table wider than tall (`t-row`) keeps
  the sideways grid, what you look at at the left and your paper or the stacks at the right, the card in the middle
  of its column once the slips are turned over; a taller one (`t-col`) is one column with the stacks taking the
  height between the card and the buttons. Compositions: `wide` (1100 wide and wider than tall: the room at the
  left), `stack` (the table over the cards so far), `small` (under 900 by 1100: the table alone, its column
  scrolling inside the felt if twelve names and a paper need it). The room: Points so far (the scoreboard `.sb`
  itself, moved out of the felt, a row a player, two columns from six players in a window under 1300 tall), and the
  cards so far newest first (each card's question and the answers that matched with how many wrote each, or "Nobody
  matched on this card."), giving up its oldest cards whole (`fitLog`, run again after every `update`). The view
  carries the log (`viewFor`'s `log`), so a guest's desk has it too; an older host's view without it shows the
  scores alone. The end (`renderOver`) is the final scores and the buttons in one column and every card in columns
  beside them (`deskFin`). A resize builds the table again from the last view (`render`), gliding when the
  composition changes; what is written on the paper stays (`draft`). The demo's second answer goes in through the
  box on a computer's own keyboard (it waited for screen keys that a mouse window has none of). Scripts: the
  scratchpad's `big/party/` (`mm-shots.js`, `prep-mm.js`, `proof.sh`, `rz.js`, `demo.js`).
  **Mad Libs at a desk** (`deskWin`, `deskPlan`, `deskLay`, `lastStory`, `wordsPanel`, `fitWords`, `fitStory`,
  `deskOff` in madlibs.html; `html.ml-dk` and `.dk` with `solo`, `r-wide` or `r-stack` on `.ml` only while a desk
  layout shows; styles at the end of the page's style). The legal pad takes the window, its words sized by `--u` (1
  to 1.6) and its ruled lines with them (`--lh`); the pad scrolls inside itself, never the page. Filling in and the
  pass cover are `solo`: the pad as a card in the middle of the window with the word type to 5.3rem, the idea chips
  and the line you write on a size up. The shelf of stories is as many columns as the pad holds. A finished story is
  fitted to the pad (`fitStory`): one column on a pad up to 46 of its letters' heights wide, two on a wider one, at
  the largest step that fits (to 40px, never under 0.8 of its size), measured again once the handwriting face has
  loaded; while it is still being typed out it is one column at its own size. Compositions: `wide` (1000 wide and
  wider than tall: the room at the left), `stack` (the room under the pad), `solo` (no room, or a window under 900
  by 1100). The room: at the shelf, the last story you made from the history (`lastStory`: its title, when and by
  whom, the story with its words marked, scrolling inside its panel); once a story is read, every blank in it
  (`wordsPanel`: the kind of word it asked for with the story's own hint, and the word written there in its writer's
  color), giving up its last words whole and saying how many (`fitWords`). The buttons under a read story stand at
  the right. A resize only lays the page out again (`deskLay`), so a story being typed out carries on. The demo's
  body noise goes in through the box on a computer's own keyboard. Scripts: the scratchpad's `big/party/` (`ml-
  shots.js`, `prep-ml.js`, `proof.sh`, `rz.js`, `demo.js`).
  **Riddle Stories at a desk** (`deskWin`, `deskPlan`, `deskLay`, `deskOff` in riddlestories.html; `html.rs-dk` and
  `.dk` with `r-wide`, `r-solo` or `r-tall` on the stage only while a desk layout shows; styles after `.cb-list
  .ico`). The case file is read at a size from the window (`--u`, 1 to 1.9; an upright window 1 to 1.5 from its
  width): the folder, its title and story, the clue cards (side by side where there is room), the sealed envelope
  and the solution letter, ruled to their own lines, to 900px times `--u` wide and centered on the blotter, which
  takes the window's height and scrolls inside itself if two clues and a short window need it. The controls stand in
  a column at the right (`--dw`, 300 to 400), centered on the table, as on an iPad on its side. Compositions: `wide`
  (1300 wide or more, a group game or a solo game with a case closed: the room at the left), `solo` (narrower, or
  nothing to show yet: the scores stay over the case line), `tall` (under 1000 wide or upright, 700 wide or 1100
  tall at least: the tablet's column and its dock along the foot, the case file a size up). The room: Points so far
  (the strip of scores stood up, the reader ringed in their color) and the cases so far newest first (each case's
  title and what happened: "Pete solved it with one clue for 2 points.", "Nobody solved it."), giving up its oldest
  cases whole. A window under 700 wide and 1100 tall (560 by 620) keeps the tablet's layout, which scrolls there as
  it did. A resize lays the page out again (`deskLay`, the strip going back to the page first), gliding when the
  composition changes. Scripts: the scratchpad's `big/party/` (`rs-shots.js`, `prep-rs.js`, `proof.sh`, `rz.js`,
  `demo.js`).
  **Conversation Starters at a desk** (`deskWin`, `deskPlan`, `deskLay`, `deskOff` in conversation.html; `html.cv-
  dk` and `.dk` with `r-wide`, `r-solo` or `r-tall` (and `short` under 760 tall) on the stage only while a desk
  layout shows; styles at the end of the page's style). The card takes the table's whole height with no cap left
  over from the tablet (`--dh`), and its question grows with it to 3.6rem (from the card's height and width,
  `--cw`); its band, foot and depth dots step up with `--u`. The piles stand in the column at the right over the
  draw and finish buttons, as on an iPad on its side (`--side`, 260 to 380, set on the page and the stage alike),
  whatever the window's orientation. Compositions: `wide` (1300 wide or more once a card has been talked about: the
  room fixed at the left), `solo` (narrower, or before the first card), `tall` (an upright window 700 wide or more:
  the tablet's column with the piles wrapped over the table and the card a size up, the room under the table between
  it and the buttons where it has 150px or more). The room: the cards talked about so far, newest first (each with
  its pile's name and color, a gold star if it is starred, the card on the table lit in its pile's color), giving up
  its oldest cards whole and saying how many. A resize lays the page out again (`deskLay`), gliding when the
  composition changes. Windows under 900 wide that are not upright, and 560 by 620, keep the tablet's layout.
  Scripts: the scratchpad's `big/party/` (`cv-shots.js`, `prep-cv.js`, `proof.sh`, `rz.js`, `demo.js`).
- **What a frame costs to draw in a large window** (Tim, 2026-11-19: "horse race got crazy jittery", then "any other games
  gonna suffer from large scale animations like horse race did?"). Safari draws a 2D canvas on the CPU, so a frame's cost
  grows with the window's pixels: anything that doesn't change from frame to frame is painted once for each size and
  copied in, opaque where it can be, and only the part that changed is laid down. Horse Race: at a desk the sky's and
  the infield's gradients (`backdrop`, `bkCopy`), the surface (opaque) and the oval's runners only (`R.ovLast`); the
  horses as pictures were measured and stay paths (laid down scaled, pictures cost two to three times the paths, and
  about 670 MB at 3024 by 1964). Pac-Man: the maze floor is part of the opaque walls picture (`buildWalls`). Flappy
  Bird: each scenery strip keeps to its own rows (`band`). Asteroids: the starfield is opaque, and in a window larger
  than any phone or tablet (`bigWin`) each rock has its own glow, not one blur over the field. Goblin Defenders: the
  wooden frame is copied as its four bands (`drawFrame`), and in a large window (`bigWin`) the map goes down at its own
  pixels. Wheel of Fortune: at a desk the wheel's shadow, ring and gloss are painted once a size (`statics`). Slots: the
  light layer keeps to about 4 million pixels (`ls` in `build`; every device keeps 1.5). The scratchpad's `big/paint/`
  has the sweep (`sweep.js`, `runall.sh`, `sweep1.txt`), the timings (`pcmp.sh`, `perf1.txt`, `perf2.txt`) and the
  canvas-by-canvas device proof (`cvshot.js`, `cvcmp.sh`). Left for later: a pixel budget for the WebGL games (the Slots
  machine, Plinko's Big Wheel, the 8 ball, Willy Crash) like Pinball's `budget`, and Centipede's 2D canvas, which reaches
  6012 by 3546 at 3024 by 1964.
- **Nothing cut off.** No clipped or "…" text, numbers or graphics anywhere, at any screen size or orientation:
  wrap, shorten smartly ("Kathleen M." → "Kathleen"), or ease the size down instead. Ellipsis is a last resort only
  for user-typed text that can be any length. Check by measuring (scrollWidth > clientWidth on clipped elements,
  anything past the screen edge) at phone upright/sideways and iPad sizes, not just by eye.
- **Nothing you tap sits in a rounded screen corner** (Tim, 2026-11-12: the deck builder's Saved button ran into his iPhone's
  corner). A bottom dock pads at least 18px from the bottom and 17px from each side even when the browser reports no safe
  area (`max(calc(var(--safe-b) + 10px), 18px)`), since Safari with its bar tucked away reports none. The scratchpad's
  `cs/corner.js` checks every Anoria screen against a 62 pt corner (iPhone 17 Pro) and 19 pt (iPad mini).
- **Screenshots are taken at Tim's devices**, upright and sideways: iPhone 17 Pro (402 x 874 CSS px, scale 3) and iPad
  mini 5th generation (768 x 1024 CSS px, scale 2). Design is judged at those. Measuring for cut-off things still
  covers smaller phones too (320 wide).
- **Game play areas must feel like a real game, not an app.** Use table
  materials from `kit.css` (`.wood`, `.felt-in`, `.paper`, `.ink`,
  `.display`), real-looking pieces (`Kit.die`, `Kit.card`), and motion. Chrome
  (bar, menus, setup) stays clean and minimal. Yahtzee is the reference.
- Every game checks its rules against the official/standard rules, and has a
  plain-language "How to play" via `Kit.init({rules})`.
- **Suits at a glance** (Tim, 2026-11-15: clubs and spades were hard to tell apart): the suit under the rank in every
  standard card's corner is as large as the corner allows, and Settings has Four-color suits (`gn_4color`, off by
  default; clubs green and diamonds blue through `:root.k-4c` in kit.css), shown in the menu of card and casino games.
- Fun moments: `Kit.win` (confetti), `Kit.callout`, `Kit.sfx`, `Kit.haptic`.
- **What computer players say in character** (a judge's reason, a contestant's bubble) lives in `games/talk/<game>.js`
  (`window.TALK_<GAME>`), read through `Talk.line(key, pool, slots)` in `games/talk/talk.js`, which doesn't repeat a
  line until most of its pool has been said. Tim, 2026-11-15: each pool holds 20 times the lines it first had, so a new
  pool starts big too. Calls like "Pass", "Bid 3" or "Go fish!" are game state, not talk.
- **The look is Night glass in color** (Tim, 2026-11-14, chosen from eight directions drawn on 37 screens; "fun but
  still elegant, colorful but not cartoony, info-dense but designed for touchscreens and spacious"). The last section of
  kit.css builds it (its rules are scoped `:root:not(.ng-x)`, a no-op that keeps their weight); every theme is Night
  glass on its own sky (Tim, the same day: "bring the themes into night glass but night glass is default"): each theme
  sets the glass tokens (`--gl`, `--gl-3`, `--gl-line`, `--sheet-bg`, `--sheet-solid`, `--toast-bg`, `--well`,
  `--lit-ink`, `--page-bg`) at the end of that section, the two light themes with frosted white glass and a deeper gold.
  Night glass is the default, and every device's theme went back to it once (`fgh_theme_ng`, which syncs, so a theme
  chosen since stays chosen). Frosted glass panels (`--gl`, `--gl-2`, `--gl-line`) on a night sky; **each category has its
  own color** (`--h`, set before first paint by `catHue` in kit.js from GAME_CATS), and that color tints the page's sky,
  the game's home row, its setup's Players card, its results card, and its table: a game's felt is its own shade of the
  category color (`applyTheme`; THEMES' felts are for the other themes). **Gold is the one light** for what is yours or
  happening now: the main button (`--gold-hi`/`--gold-lo`), a chosen option, your turn, your score (`--lit`,
  `--lit-ink`). Type is Schibsted Grotesk; titles are its static 800 cut (`--display`, "GN Display", so a title set at
  any weight comes out the same); no Lilita, Bungee or tracked capitals on chrome (labels are sentence case). Corners
  are rounded (13 to 28px), buttons have no lip and press with a small sink. The home screen is one row per game
  (icon, name, players, a live line at the right, gold when it is something for you to do), sections marked by a bar
  in the category's color. The tile view is the art up close (Tim, 2026-11-15, chosen from six looks: "use the art up close, but i want
  the art even bigger"): each game a tile of its own color with its art drawn large and tilted, running off the top right
  corner, the name and player count at the lower left on the color, a console game's cartridge the same way, and the Keep
  playing cards to match (`html.look`, the `==LOOKS==` block in index.html). The game's own art is stamped faintly into each tile's empty color, large and turned the other way at the lower left (Tim, 2026-11-16, chosen from three textures: "definitely do art stamped in but more subtle"; `.emb`, `embEl` in index.html, opacity .05, "fainter still"), on the Keep playing cards too; a console game keeps its plain color. A Keep playing card's glass foot holds the game's
  name alone, always two lines tall, and where you are ("Round 9 of 13", "182 pts") stands at the lower left of the card's
  color over a soft dark gradient at the color's foot, so it reads over the art (Tim, 2026-11-16: "fit game names up to two lines long. move
  the details into the bottom left of the colorful top part", then "make the top part shorter again": the color keeps its
  1 : .66 shape; then "remove the pillboxes and add a subtle dark gradient"; `shelfBox`, the block after `.sbox.old .art` in index.html). Quick notes (`Kit.toast`) are lifted glass with a hairline lit along the top. **Hiding games and sections** (Tim, 2026-11-16: "add a discreet edit option to each
  section to allow hiding games within the section or the section altogether"): a quiet pencil at the end of each
  section's heading (`.sec-ed`) opens the whole Home screen sheet with that section open, brought up into view and its
  row lit gold a moment (`Kit.homeSheet(catId)`, `openId` in `defaultsSheet`; Tim, 2026-11-17: "switch all section edits
  to the same global homepage edits with the associated section pre-opened"; the one-section sheet, `focus`, is no
  longer opened), and a pencil in the top bar (`#hedit`) opens every section, the same
  sheet as Home screen in the profile menu (`gn_cat_off`, `gn_games_off`, `gn_cat_order`). Keep playing's Edit is the same pencil (`#cont-edit`), the gold Done while its cards are being edited. **Arranging and starring
  games in that sheet** (Tim, 2026-11-17: "allow favoriting and rearranging games per section (including favorites) or
  resetting each section back to alpha order ... design well without using words to explain things"): every game row has
  a grip at its left and a star before its switch (gold and filled for a favorite, popping as it lights); a section's
  games drag into an order of their own (`gn_game_order` {section: [ids]}, follows the PIN; the home screen reads it
  through `Kit.sortCat`), Favorites opens the same way to drag its games or take one out (its row folds away), and its
  heading on the home screen has the pencil too (`Kit.homeSheet('fav')`, the sheet with Favorites open). While a section, or Favorites, is open, an A to Z mark
  stands in its heading, faint while its games are already A to Z and lit once they are in an order of their own (Tim,
  2026-11-17: "each icon section should still maintain its own A-Z button"; `.k-ord-az`, `.done`; in a sheet for one section or Favorites it
  stands in the sheet's top right corner across from the title, `.k-ord-azslot`, so a long list never pushes it out of
  view) and puts it back. Every redraw glides (`paintOrd` keys each row `s:`/`g:`/`f:` and slides it from where it was), so a game
  just starred flies from its section into Favorites. **Arranging on the home screen itself** (Tim, 2026-11-20: "make
  each section ... work like favorites does, in that tapping and holding sets the section to wiggle and rearrange with a
  drag of the icon, but also add the option to hide a game from an icon on its tile while it's wiggling"): a hold on any
  tile in Favorites or a category (not Consoles, whose cartridges keep their own Edit and stay out of `gn_game_order`)
  sets that section wiggling, one section at a time, with Done in its heading where the pencil was; the tile lifts under
  the finger and a drag saves the section's order exactly as the sheet does (`saveCatOrder`: every game in the section
  in `gn_game_order`, games a filter leaves out keeping their spots; Favorites keeps `saveFavOrder` and `fav_games`).
  While it wiggles each tile keeps its star at the top left and has a round mark at its top right (`.wig-x`, a painted dark glass disc; Tim, 2026-11-20: "keep the favorite icon in the top left but move the hide icon to the top right"; a list row, whose star stands at its right, has the mark at its top left):
  in a category it hides the game (`gn_games_off`, as the sheet's switch), and the section's hidden games stand in
  their places, dimmed under a veil with their marks lit gold, so a tap brings one back and they can be dragged like any
  other; in Favorites it takes the game out of Favorites, the tile shrinking away, with Undo on a glass pill at the foot
  (`favUndo`). Done, a tap outside, Escape or eight idle seconds end it: the hidden games fold away and the rest glide
  into place (`stopWiggle`, `glideRender`, which keeps the section in view). List view's rows work the same way. Hidden
  games are drawn at rest too, as `.g.hid` with `display: none`, so nothing is rebuilt under the finger when the wiggle
  starts; anything that counts or measures a section's tiles leaves `.hid` out (`deskLay`, `markWraps`). A redraw that
  arrives while a section wiggles waits until arranging ends (`render`'s `force`, `pendRender`; only the wiggle's own
  `glideRender` draws meanwhile): on Tim's iPhone the sync echoing a hide rebuilt the tiles under a held finger, and no
  tile would lift again. The pencil took the list and
  tiles button's place (Tim, 2026-11-17: "relegate the list view option to the app menu and put the added pencil in its
  place. Period. Tile view is default for everyone"): Show games as a list is in the profile menu under Home screen
  (`toggleView`, `gn_home_view`), and every device went to tiles once (`gn_tiles_once`, which syncs, so a list chosen
  since stays chosen). The top bar holds three buttons: the pencil, the bell and you. **The greeting stays on one line**
  (Tim, the same day: "what happens for long user names?"; it wrapped to four lines and pushed the screen down):
  `fitHi` in index.html tries the whole name, the first name, "Hi" for the time of day, a household's name without
  "The" and "Family", then a step smaller, and only then cuts the name short with an ellipsis (user-typed text).
- **Keep playing shows each game's table as you left it** (Tim, 2026-11-21, from a mockup he approved; then "let's get
  creative with the hard cases - i don't want logo cards", and of the foot "should always be one line for the game name,
  one line for the 'where you are'"). A Keep playing card in the tile look (`shelfBox`, `.sbox.snap`) has a picture of the
  game's play area in place of its art, the game's icon small at the top left in a thin white ring (`.kbadge`; a
  cartridge for a console game), how long ago at the top right over a soft shade; a picture over a week old is grayed
  (`.old .shot`). Every card's glass foot is two lines, the name and where you are: `placeOf` takes the one fact of the
  label that says where you are (a round, a hand, a level, a guess), `fitFoot` eases each line down (the name to 80%,
  where you are to 84%), then says where you are shorter (`placeCuts`: "Round 12/13", then "Round 12", never "…"), and a
  name still too long takes two lines with every card in that row a line taller (`.shelf.n3`), so the feet stay one
  height. List view keeps its rows without pictures. **The picture** is `gn_snap_<resume id>` (anything but letters and
  digits as _): `{v: 1, ts, d: a data: URL, WebP (JPEG where the browser can't make WebP) of 450 by 297, cx, cy}`, about
  5 to 17 KB, cropped to the card's shape round the play surface. It follows the PIN as a saved game does and never
  reloads a page (`gn_snap_` in `ST_NORELOAD`). kit.js makes it ("Keep playing's picture of the table"): a few seconds
  after `Kit.resume.set` (at most once every 15 s), as the page is put away, and on opening a game that has none
  (`snapFirst`); never in the setup, in a demo, or once the game is over. **A cover over the table is left out of the picture** (Tim, 2026-11-22:
  Lorcana's card reader was in a picture, then "fix the issues first"): a kit sheet or menu (`.k-scrim`), a card
  reader, a battle dialog, the computer's move being shown (`aria-modal`, `dialog[open]`, or what the game names with
  `snapCover`: Arvela's side panel) is drawn as an empty box of its own size, so the table shows as it stands under it
  (`SNAP_COVER`, `snapCoverEls`; one that comes up while the page is copied is left out too). **The hand-over cover, the
  lock screen and a results card still mean no picture** (`SNAP_BUSY`, with `data-snap-busy` and Kit.init's
  `snapBusy`): behind a hand-over lies the next person's hand or a secret a game may not mark, so the picture waits and
  is tried again every 3 s. **Held the wrong way** (the turn-your-device cover, `SNAP_TURN`: Goblin Defenders and
  Centipede upright) the game's largest canvas is the picture while it still holds the table (`snapTurnCanvas`: lit and
  not one flat color); both games clear or resize theirs, so they keep the picture they had. **Nothing moving or
  loading** (Euchre's cards caught mid-deal came out blank): a finite animation that moves, turns, grows or fades anything
  that meets the crop (a card flying into the hand, a plaque coming up; not a color stepping, a countdown's digits), an
  `<img>` there not loaded, or a card face's picture from its style
  (`[data-c]`, loaded and decoded once, `snapBgWait`) keeps the picture waiting, every second at first and then every
  3 s, as long as it takes (`snapMoving`); a kind of motion still there every time, five tries or more, is the table's own
  life and no longer waited for (`snapS.amb`: Press Your Luck's board, the computers playing on); something that starts moving while the page is being copied (`snapWatch`,
  checked between slices) has it made again. A game's own pause card (the cover round a Resume, Continue or Keep playing button: an arcade game pauses itself as the page is put away) is
  left out so the table shows (`snapCovers`); one painted on the canvas is drawn away by `snapClean` (Goblin
  Defenders). **What the drawing can't show as the screen does** is drawn flat in the picture alone: Kit.init's
  `snapFlat` gives `[{el, css}]` and each element's copy takes that style (Cipher Cases' number and letter wheels, a 3D
  drum that came out on the wrong digits: the face in the window alone, flat). A face turned away from you (`backface-visibility: hidden` under a 3D turn: Conversation Starters' card showed its mirrored back over the question) is left out of the picture by itself (`snapAway`). Masks keep their `mask-composite` (an
  Arvela card's frame line had become a tan wash over the hand). **A person's hand never shows in pass and play** (Tim, the same day): `snapHide` gives a game's hand while
  more than one person plays (`.chand`, `.hand`, `.so-hand`, a Scrabble rack, Battleship's own ships, Lorcana's and
  Arvela's hands; each page's `Kit.init`), left as an empty box in the picture; the secret in other pass-and-play games too: Dominoes' and Mexican Train's
  tiles, Apples to Apples' hand, Mind Meld's paper, Marbles' cards, Wax Pack's pitches, a Cipher code behind its shield
  (Codebreaker) and Hangman's word being written. The renderer is
  vendor/modern-screenshot (MIT, loaded only then), run in slices of 6 ms in idle time (`snapYield`), on only what meets
  the crop (`snapKeep`: the rest stays as empty boxes of its own size), with about 120 style properties
  (`SNAP_PROPS`), the styles a child would inherit anyway and starting values trimmed (`snapTrim`), the page's pictures
  made small (`snapImg`, `snapShrink`), the fonts read once (`snapS.fontCss`) and the encoding in a worker
  (`snapWorker`). A canvas is copied in a frame callback right after the game's own (`snapCanvases`, which wraps
  `requestAnimationFrame` for a few frames for a WebGL canvas that comes out empty). Per game, `Kit.init` takes `snap`
  (the play surface: a selector, element or function; the default is the largest table-like element, a felt, board,
  wood frame or canvas, a seventh of the screen or more, `snapTarget`; Wordle's guesses, Sudoku's grid, Scrabble's board),
  `snapY` (where a band across a tall surface sits, 0 the top to 1 the foot, or a function; 0.08, and 0.5 for a
  `.ctable` or a board about as tall as wide), `snapW` and `snapAt` (the widest the crop may be and where its middle is,
  so a large table is seen close up: a `.ctable` is framed round its `.ctrick`, four and a half cards across, seven and
  a half while the trick is empty), `snapFit` (the pieces in play, the crop fitted round them: Dominoes' line), `snapDraw`
  (draw a frame now: Slots' machine and the Mystic 8 Ball, which draw only when something moves) and `snapGrab` (the page's own picture: the
  consoles give the emulator's screen). `Kit.resume.set` keeps `s`, when the game first showed in Keep playing, and a
  picture older than that is never shown (`snapOf`); `Kit.resume.clear`, Keep playing's delete (with Undo) and a game
  ended on another device (`snapTidy`) take the picture away. **A game with no picture** (begun before pictures, or on a
  device without them) gets one from the home screen in its idle time (`snapFill`): its page opens in a frame nobody
  sees with `?ksnap=<id>`, which sync.js makes a sandbox (it reads the device, keeps nothing it writes but `gn_snap_`,
  makes no sound, never reaches the cloud), Kit takes the picture there (`snapFrame`) and posts back, and a touch or a
  scroll puts the frame away to be tried again later; a console cartridge's picture is made from its saved place's
  screen in IndexedDB, with no emulator. Every save keeps a screen (a save made when the emulator can't give one, the
  page put away, takes the last screen it gave, `lastPic` in console.js), so only a save from before saves had pictures
  shows its cartridge until the game is next opened: starting the emulator in the hidden frame was measured (the
  scratchpad's `emucost.js`, NES, the smallest core, CPU 4x slower: 6 long tasks, the longest 650 to 750 ms, about 3 s of
  the main thread and a 134 MB WebAssembly heap) and would freeze the home screen it shares a thread with. The
  scratchpad's `kpsnap/` has the scripts: `play.js <size> [games]` (real
  games played and their pictures), `home.js <sizes>` (the cards measured: one foot height, nothing cut), `paths.js`
  (sync, delete, Undo, finish, the demo), `fill.js` (the hidden frames), `console.js` (a homebrew NES cartridge),
  `pnp.js <size> <page:n,...>` (a pass-and-play game of people, the page beside its picture: no hand), `audit.js <size> @games.txt` (every catalog game started and its
  picture, with how much of it is one flat color; `asheet.js` the contact sheet), `busy2.js` (a menu, a reader, a scan, a
  dialog: the table without it; the hand-over: none; a game turned upright: the picture it had), `deal.js <size> <pages>`
  (a picture asked for every 250 ms through the deal), `ciph.js` (the wheels), `emucost.js` (an emulator's start), `webgl.js` (the canvas games), `arvela.js` (Arvela mid-turn),
  `prof.js <page> <size> <cpu>` (each step's time and the long tasks), `perf.js <base|wt>` (layers and scrolling at 4x).
- **What keeps the home screen smooth** (Tim, 2026-11-16: "lagginess, scrolling up and down on the iPad mini in
  landscape"; measured with the CPU slowed 4x at 1024x768). Scrolling: **no `backdrop-filter` on anything repeated per
  tile or card**. A tile's glass band and a Keep playing card's name panel are painted glass, with the art clipped at the
  band's top edge (`clip-path` on `.gi`); a live blur on every tile made each one a layer of its own, about 320 layers in
  all against 13 now. The few blurred controls in the header are fine. **The frosting is baked** (Tim, 2026-11-16: "render
  what that glass blur actually looks like so you don't have to calculate on the fly"): under the glass's dark tint lies
  the game's glow, the part of its art under the glass blurred and saturated as the live blur looked on his iPhone, one
  picture for every game (`img/tile-glow.webp`, about 40 KB, and where each glow lies, `tile-glow.js`, both made by
  `scripts/build-tile-glow.js`, which draws them with index.html's own tiles in Playwright). A tile gets `.gl` and its
  `.go` (a card, its `.nm`) gets `data-gl`; one rule a glow, written once at load, places the picture, because a custom
  property set on each tile would be inherited by everything in it and lose the tiles' shared styles. A console game's glow
  is its console's cartridge with a plain label. **After adding a game, changing a game's icon or moving the tiles' art,
  run `node scripts/build-tile-glow.js`**; a game with no glow yet shows a soft light at the band's upper right. A still
  `filter: blur()` on a copy of the art looked the same, but it doubled every icon's SVG (about 0.7 s more for a full
  redraw at 4x) and left 130 blurs to work out as the page is first painted. **A looping animation moves only `transform` and
  `opacity`**: the gold edge of an online game whose turn is yours (`ngTurn`) and the green ring of a friend's live table
  (`livePulse`) animated `box-shadow`, which repainted the page every frame for as long as they showed, scrolling or not
  (the page at rest used 2.3 s of every 3 s of the main thread); now a brighter copy of the edge fades in and out on
  `::after`, and the ring scales and fades on `::before`. Finished animations are let go (the logo's bounce cancels its
  own animations once they end; a `fill` that holds keeps a layer forever). Together these took scrolling from about 35 ms
  a frame (a 95th percentile of 67) to about 18 (33). Loading and redraws: **read everything, then write everything**.
  `markWraps` fits every tile's name at once, a step for all names together (never read, write, read name by name, which
  laid the page out once a name), starts each name's steps from the size its own width says, and remembers each fit by
  text, width and size (`FIT`, only once the font has loaded), so a redraw for a search letter or a favorite measures
  nothing new; `fitNames` reads every Keep playing card before it writes. A redraw nobody asked for (`fghsync:updated`,
  coming back to the page) is `render(true)`: when the tiles would come out the same (compared without the icons'
  gradient numbers) the ones on the screen stay, so a sync costs about 0.1 s instead of about 1 s. A new per-tile effect is
  checked the same way: layer count (`LayerTree`) and scroll frame times at 4x before it goes in.
- **Typing is on the Kit keyboard, never the phone's** (Tim, 2026-11-15: "any opportunity to type is done with a
  thoughtful onscreen keyboard not the device keyboard -- and make sure that doesn't mess up any of the formatting").
  `KitOsk` in kit.js: on a touch screen every text box (`input` text/search/email/tel/number/password/url, `textarea`)
  gets `inputmode="none"` before it takes the focus, and the Kit keyboard (`.k-osk` in kit.css, on `<html>` so the
  page's lift never moves it) rises in the app's glass: letters with shift (double tap for caps lock) and a symbols page,
  a number pad for numbers (a minus with `data-osk="neg"` or a negative `min`, a point with `data-osk="dec"`, inputmode
  decimal or a decimal step; sideways the digits sit in one row), capitals by `autocapitalize`, the action key by
  `enterkeyhint` in the gold (Next moves to the next box), the letter rising over the finger, delete repeating while
  held. Every key reaches the page as a `keydown` first, then the text with an `input` event, so a page written for a
  real keyboard needs nothing new. The page makes room exactly as it does for a phone keyboard (`KitKb`: `html.k-kb`,
  `--kb`, `--vvh`, the `--kblift` page lift), so a sheet rides above it and the box stays in view. A new box needs
  nothing; one that is really a game's own key capture, or a game that draws its own keys (Wordle, Oregon Trail), says
  `data-osk="off"`. A box is described for the keyboard by its own attributes (`type`, `inputmode`, `autocapitalize`,
  `enterkeyhint`, `maxlength`), and by the keys it can take: `data-osk` `letters` (A to Z; `data-osk-space="off"` drops
  space), `name` (letters, ' and -, a capital each word), `word` (the same keys), `code` (digits over capitals), `neg`
  and `dec` (a number pad with a minus or a point), `off`; no value is the full keyboard with symbols and Paste. What a
  player reads while typing is marked `data-osk-view` around the box (it stays in view above the keyboard), and a
  helper beside it that should not put the keyboard away (Mad Libs' ideas, Ranker's note) `data-osk-keep`. Desktops keep their keyboard, and a real key pressed on an iPad's keyboard case puts the
  screen keyboard away for the visit.
- **Every game is in Night glass** (the sweep of 2026-11-14, every game page, its own folder and history view). The line
  between what a game keeps and what follows the look: **anything that would be printed on the physical game keeps its own
  type and look** (a show's logo, words printed on a felt, card faces, dice, a pinball playfield, slot reels, an arcade
  game's in-canvas pixel art and score font, Poker's venue logos, a printed board, a rubber stamp, a receipt, a drawn
  console controller, Oregon Trail's period computer screen); **everything around it is Night glass**: glass plates and
  panels (`--gl`, `--gl-line`, `--plate-bg`, `--plate-line`), gold only for whose turn it is, your score and the chosen
  thing, our fonts in sentence case (no `text-transform: uppercase`, no letter-spacing, no Lilita, Bungee, Fredoka or
  Baloo on labels, buttons, plates or HUD), buttons with no lip. A new game follows the same line. The kit's own fixes from
  the sweep: `.score` plates are glass with the turn lit gold; a disabled main button is plain glass; `.btn-green`,
  `.btn-red`, `.btn-blue` and `.btn-pink` keep their color; the body's transparent default has no weight
  (`:where(...) body`), so a game that paints its own stage on `body` (Pinball, Goblin Defenders, Lorcana) still does;
  the score keepers' shared pad (`.spad` in cards.js) is glass ruled like Yahtzee's; the card tables' seat tags, chips,
  bubbles and sort toggle (cards.js) are smoked glass. **The fonts' tabular figures change only the digits**: the hosted
  Schibsted files had their `tnum` lookup cut to digits (fontTools), so "$1,250" never reads "$1 , 250"; a new build of
  either font needs the same cut. The kit's Players card uses the class names `.k-side`, `.k-tok`, `.k-toks`, `.k-vs`, so
  a game must not use them for its own elements (Bingo did, and its table broke).
- **A moment on the table** (`Kit.moment({title, line, chip | icon, pts, color, tone: 'bad', big, at, ms})`) is a
  strip of rounded navy glass lit along its top edge in gold: the contract or what happened on a rounded tile at the
  left, the sentence in Schibsted Grotesk, the points glowing in Doto's dots at the right (counted up), `at` the table
  element so it lies across the table's lower edge. `big` opens the lit edge into a tall rounded panel with the moment's
  pieces inside (`cards`, `dice`). `Kit.callout(text, color)` is a short one in the middle of the screen (a number
  alone glows). Arvela keeps its own callout (`k-own-callout` on its `<html>`).
- **New games: the bar is very high.** Tim expects high-end design polish, effects, sound and
  interactivity in every new game: real materials and pieces, motion on every action, sounds and haptics,
  big moments for big plays. Screenshot every phase and critique it before calling it done.
- **The baseline for every game** (Tim, 2026-11-14, with Bridge and Pinochle: "make sure both games' layouts are fully
  optimized for phone/ipad in both portrait/landscape too with minimal wasted space and user interactions are
  fun/pleasant with dopamine reward hits and special moments that fit into the gameplay for uncommon events and
  accomplishments", and "record the above instructions as ongoing/baseline instructions for all games added"). Every
  new game, and every game the app sweep touches, meets all three:
  - **A layout for each shape**: iPhone upright and sideways, iPad upright and sideways (402x874, 874x402, 768x1024,
    1024x768), each designed for that shape and using the screen fully: the board, cards and pieces as large as the
    room allows, no dead bands or empty margins, nothing scrolling that could fit. Not one layout stretched; measure the
    empty share of the screen, not just by eye. **Turning the device mid-game moves everything smoothly to the new shape** (Tim, the same
    day: "the layout shapes must transition smoothly if it changes midgame"): at any moment, mid-animation too, the
    pieces glide to their new places with no jump, no flash and no lost state, and the game carries on where it was.
  - **Pleasant, rewarding interaction**: every press answers at once (motion, sound, haptic), every good move gets a
    small reward (a trick swept in, a point counted up, a meter filling), so playing feels good from move to move.
  - **Special moments for uncommon events and accomplishments**, each built into the play where it happens (a slam, a
    double run, a perfect hand, a comeback, a personal best), rarer events bigger, and the game history keeps them as
    highlights.
  **The sweep against this baseline** (2026-11-15) went game by game through every page but Arvela and Lorcana. What it
  left in the kit for every game: **`Kit.glide(fn)`** runs a relayout (the device turned) inside a View Transition, quietly
  dropping one that a second turn cuts short (give the pieces `view-transition-name`; many pages carry their own small
  FLIP or `vtGo` from before it existed). **A setup on a phone held sideways** (landscape, 520 tall or less, 640 wide or
  more) is two columns: the options fill the left, the title, the Players card, anything the game adds (each on its own
  row) and the start button stand at the right; a part the game adds after its options goes under them at the left
  (Trivia's categories). A game's own sideways layout for its table must not apply while the setup shows
  (`.stage:not(:has(> .setup))`). **A score keeper held sideways** from 700 wide has its sheet at the left and its note and
  buttons in a column of their own at the right (cards.js). Sheets' buttons and the Kit keyboard's bottom row stand clear
  of a phone's rounded corners when the browser reports no safe area (18px and 26px). Most games that were locked upright
  on a phone now play sideways (the card tables, the casino tables, Rook, Phase 10, Marbles, the arcade games); Mazes
  plays sideways too (Tim, 2026-11-15: "allow all"; its counters at the left and tools at the right), Pinball stays upright
  on a phone (Tim, the same day: "do pinball vertically only"), and Centipede and Goblin Defenders stay sideways.
- **Subtle per-game identity:** layout and controls stay standard; each game
  gets its own table "box" via `THEMES` in `kit.js` (felt colour, card backs,
  wood). Keep it understated: colour and material, never mascots or emoji.
- **Court cards and jokers are the English pattern** (Tim, 2026-11-15: "update the King Queen Jack and Joker art to
  reflect a graphic design tradition known as the English Pattern (or Anglo-American Pattern) that evolved directly from
  16th-century French woodblock printing"; it replaced the painted set of the same day). The courts of a standard Bicycle
  or Waddingtons deck: flat inks in bold black outlines, stylized faces with almond eyes, robes in rows of pattern. The
  card's own conventions are kept and checked at hand size: the King of Hearts' sword crosses behind his head (the
  suicide king, the one king without a moustache); the King of Diamonds (the axe behind him, facing left), the Jack of
  Hearts (a leaf, facing left) and the Jack of Spades (facing right) are in strict profile with one eye showing, every
  other court shows both eyes; the King of Clubs holds the orb, the King of Spades a sword upright, the queens a flower
  (the Queen of Spades a sceptre too), the Jack of Diamonds a halberd, the Jack of Clubs an arrow. `Kit.card` keeps the
  plain card and its corner index (JOKER set down the corner for a joker) and puts the picture in a thin-lined box: a
  court's figure from the crown to the chest with the same picture turned over below, the suit sign beside the head
  (kit.css, in the corner `pip` names; not under 80px wide); under 40px wide the bold letter stands in. The pictures are
  `cards/<key>.webp` (`cards/s/` for cards under 80px, cropped closer to the head, precached), placed by kit.css from the
  box's `data-c`. A deck's two jokers are one jester in two printings: `Kit.card('JK', s)` / `Kit.joker(s)`, 's' 'b' the
  black ink one, anything else the color one; history codes `JK`/`JKr`/`JKb`. The prompts (the style, each card's brief,
  the inks) are `scripts/cards/prompts.json`; a card is redone with `scripts/cards/gen.py <work folder> KH [tag]` (JKB edits
  JK), looked at full size (the eyes, the hands, the thing held, the card's convention), then
  `scripts/cards/pack.py <work folder> KH` (Pillow, numpy and scipy), which prints it in the six inks (paper, black, the
  card red, golden yellow, deep blue, flesh), cleans the specks and crops it.
- Don't tune difficulty or design around a player's age. Match the real game and Tim's choices.
- **Landscape: where you act on the right, what you look at on the left.** Most players are right-handed, so
  sideways layouts put the side you take action on (buttons, the board or cards you tap to play, a playfield you
  steer) on the right, and what's only for looking at (scores, logs, other players, a board that just shows the
  state, like Monopoly's) on the left. Decide per game by where the taps go: chess's board is the action;
  Monopoly's action panel is. (A console's drawn controller keeps the real controller's layout.)
  A play space that's wider than tall (cribbage's pegboard, a line of dominoes, a backgammon board) instead sits
  up top across the full width, with the actions and information in a strip below it: buttons on the right of
  that strip, information on the left.
- **Show every board that isn't secret.** When each player has their own board, card or sheet that the others
  could see at a real table (Bingo and Keno cards, score sheets), show them all at once on every screen size, never
  behind tabs: shrink them to fit, two to a row on a phone. Only things that are hidden in the real game (a hand of
  cards, a Battleship grid) are shown one player at a time.
- **Every game keeps a good history** (Tim, 2026-11-15: "remember all games need good history recorded too"). A finished
  game is recorded with `Kit.record` and a compact `detail` (hist-view.js's header has the rules: small, no arrays inside
  arrays) that holds what made the game that game (the hands, the scores hand by hand, the board, the order of play), and
  `highlights` for its rare moments as whole sentences (a view that draws its own score race or score sheet keeps the kit from adding a second one: `ownScores` in kit.js reads it, or the view says `data-scores="chart sheet"`); and the game has a view in `hist/` (`HistView.register`, its file
  in hist-view.js's list) that draws it: a scoresheet, the final board or hands, a replay where it fits. A score line
  alone is not a history. `hist/pinochle.js` and `hist/bridge.js` are the reference.
- Player setup goes through `Kit.setup` (name picker, regulars, robot names for
  computer players). Every game passes `undo` to `Kit.init` when moves can be
  taken back. The game menu always has Frequent players.
- **Same setup, same results card, every game.** Ways to play are declared with `Kit.modes([...])` (`solo`,
  `cpu`, `local`, `online`; a game keeps its own mode ids with `kind`), but **no mode cards are shown** for these:
  the setup shows who's playing on a card (the people who played last; seat 1 starts as the signed-in player), and a
  tap opens the **players sheet** (`Kit.playersSheet`): the seats as tokens up top with one chosen, and under them, on
  a glass panel lit along its top in the chosen seat's color with a notch that glides to the chosen token and that seat
  again small at its head (its name and "Seat 2"), what can sit there: a row of the computer players themselves, each
  skill's robot face (`botFace`, in the seat's color) with the game's word for the skill under it, the one seated there
  lit gold, and at the right the dice, New names, which gives every robot at the table a new name (no two alike, none it
  had), each name turning over in turn (Tim, 2026-11-15: "having a toggle here is kind of a weird UI decision ... just
  have easy medium and hard computer players selectable with a randomizer for the names on the right"; a game with no
  skill choice shows one face, Computer; a seat where the game seats no robots has no row); then everyone you play
  with as chips. **The computer's skill is never a row among the game's options** (Tim, 2026-11-17, of Pong's Tunnel: "cpu
  skill should be tied to the player picker not in game options"): the option a game marks `robot: true` is chosen on
  the computer's seat and shown on its tile wherever the computer has a seat, a fixed one too (`lvTiles` in kit.js); a
  one-player game's own Difficulty (Centipede, Mastermind, Hangman) is the game's, and stays an option. A tap on a robot or a chip seats them and moves to the next open seat (at a full table it adds a
  seat); a tap on another face where a robot already sits changes only its skill; a person's chip or Remove seat takes
  a robot away. A game never draws its own seat list; one that shows something per seat reads
  `setup.seats()` (Axis & Allies' countries). Who's playing is shown as a **Players card** above the game's options
  (`.k-who`: its title, "Players", a label a step smaller in a muted ink tinted by the category color so the names under it are the white ones, Tim 2026-11-16; each seat a token in its seat's color with the name under it; there are 24 seat colors (`--p1` to `--p24` in kit.css, `Kit.color(i)`, Tim 2026-11-14: "a set of 24 colors that you assign to either humans or AI", the most players any game seats), the first eight as they always were and every one at least 8 apart from every other in OKLab, and an avatar's letter is white or dark by its color's contrast (`inkFor`); a robot's token is ringed in its seat's color, the color that player has in the game, as a person's token is that color (Tim, 2026-11-14: "it's helpful if the player color matches the ring around the player, whether it's computer or human"), and shows its skill in the robot's face and a glow just inside the ring, past a thin dark gap: Easy smiles with green eyes inside a green glow, under a green antenna tip, Normal looks on with gold eyes inside a gold glow, under a gold tip, Hard glares with red eyes inside a fiery one, under a short flame rising from behind its head (`botFace`), in even columns, partners on one plate and the sides across "vs" (`whoChips`, Tim 2026-11-14: "looks more organized"); a tap opens the players sheet; where the count can change, a dial like a briefcase lock's number wheel sits under the title at the card's left, so the players have the whole right side (`countStepper`, Tim 2026-11-16: "move the player count ... to the left side under the word players", then "a vertical dial that functions like a briefcase lock dial" and "a horizontal version"): numbers on the flat faces of a glass wheel, a groove cut between one face and the next (Tim, the same day: "flatter where the numbers are with grooves between the numbers they click into place"), drawn in 3D once so that turning it moves one transform, behind a window lit in the game's gold; under a finger it holds at each number and then gives to the next (`detent`), a tick and a haptic for each number that passes; a drag or flick turns it, a tap on the number before or after the window turns it one, and the count changes when it comes to rest. Past the first and the last number is a hatched end stop (Tim, the same day: "make it clear when dials can't go any further"): turned or tapped against it, the wheel gives a little and springs back, the stop lights and the phone gives a firm tick. It always stands upright under the title at the card's left, in a column just wider than itself with "Players" centered over it, so it never moves as the count is turned (Tim, the same day: "jumping around like this is no good", then "there should be no orientation where the dial is at the top either ... primarily it should be a vertical oriented dial"; `fitDial`, placed before the first paint). It is 64 by 124 ("a little thicker"), so the card is that tall; a crowd of players beside it takes smaller tokens instead of more rows (`evenToks`: `crowd` past two rows, `crowd2` past three). The count changes as each number reaches the window, not when the wheel comes to rest, and the players bubble in and out (Tim, the same day: "make player icons pop in and out kind of like bubbles ... i'm imagining quick swipes up and down on the dial and want the visuals to keep up"): the card and its dial stay on the page while only the players are swapped (`renderSeats` keeps the `.k-whobox`, the home sheet keeps `whoN`, the dial's `__set`), and `Kit.bubbleSwap` glides each player already seated to their new place, pops a new one up with a little overshoot and shrinks one who leaves, measured from the screen mid-glide too, so quick turns chain. One or two players stand larger to fill it (`few`, Tim, the same day: "make the player or players larger if it's just one or two"; two only where they fit side by side, 200px). It changes the count at once: a seat added is filled as the players sheet fills one, the last seat is the one that leaves; the home sheet's card has the same, sent to the setup in its frame with `kitSheet: 'step'`). On the
  home screen's game sheet the sheet draws that card itself (`.gs-who` in index.html; the framed setup says who is
  seated with `kitSheet: 'who'` and draws none). A game's extras (Lorcana's online games) go under the options. One seat is Just me, robots in
  every other seat is vs Computer, people (and robots where the game mixes them, `cpu: 'mix'`) is Pass & play, and
  `onStart` still gets the matching mode id. Play online is a smaller button beside the start button (`Kit.setup`
  does all this itself; a game's own extra way to play, like Bingo's Call only, uses `alt`). Only games with
  their own kinds of play (Trivia's Buzz in, Sandlot's Derby) still show cards. A game with no pass and play (Just me
  or vs Computer, and online: Centipede, TetriNET) is one table too, its other seats the computer's. The robots keep
  their names from one setup to the next (`bots` in `gn_setup_*`), so the robots named on the home sheet are the ones
  that sit down. Every page that calls `Kit.setup` is in `SETUP_PAGES` (kit.js), or its home sheet has no setup in
  it. **A button a game adds to its own setup that starts play** (Mazes', Mysteries' and Word Search's daily puzzle) says
  `data-sheet-go="<name>"`: on the home screen's sheet the kit catches it and starts the game on its own page as the start
  button does, and there presses it (`el:<name>` in `kit_go`; Tim, 2026-11-16: "The maze game never breaks out of the game
  setup panel"). Without it the game plays inside the sheet's small frame; the scratchpad's `kp/sheetscan.js` lists every
  game's own buttons in its framed setup. Pass & play hands the device over
  with `Kit.handoff` between people only. The start button
  stays in view (the kit's `.k-startdock`; insert game extras before the dock, not before `.k-start`), 18px off the
  bottom and at least 17px in from each side of the screen whatever the page's own padding (`dockInset`).
  **Sides** (Tim, 2026-11-11): the Players card and the players sheet say who is with whom the way people do:
  partners joined by "&" and the sides by "vs" ("Tim & Jamie vs Pete & Pam"; two seats are "Tim vs Huey"). A
  partnership game gives `players.teams` ([[seats], [seats]], or a function of the count and options when partners
  are a choice: Dominoes, Marbles, or of what the setup shows: Axis & Allies' sides follow the countries each seat
  commands, and `setup.redraw()` draws the card again when they change); `players.vs: false` for people who play
  together (Mad Libs, Would You Rather). A partner's "&" stays on the line with that partner. On the Players card partners share a plate with "&" between them, and sides that wrap stack with "vs" on its own line between them; rows of players wrap evenly (six are three and three, five three and two: `evenToks`), and so do the players sheet's seats (Tim, 2026-11-15). `Kit.whoChips` draws them, on
  the home sheet too. **Play online** is on every game whose tables are TurnNet's (not only ones that list online
  among their ways to play) and takes what is chosen: a **review** first (`goOnline` in kit.js: who will be at the
  table, the rules as set, choices that only matter online), (pressed on the home screen's game sheet, the review opens over the game's own page, so Cancel goes back to the home screen with that game's sheet open again, `HOME_BACK` in kit.js and `#sheet=<game>` in index.html; Tim, 2026-11-16: "why'd the menu look different when i cancelled"), then Open the table opens it at once
  (`TurnNet.host`) or Find a table goes to the lobby; a game on `online.js` (Centipede, TetriNET, Mind Meld, Apples
  to Apples) gets the same review, and both buttons open its lobby. **A friend's open table** in a game is the first
  row of that game's sheet on the home screen ("Join Pete's table", from `friendTables` in index.html), and the
  separate Play online rows from games.js hide once the setup offers it. The game's own setup shows it too, as a card
  above the Players card (`friendTables` in kit.js reads the linked people's tables once when the setup opens and
  again when the page comes back into view: TurnNet's, `online.js`'s, Chess's and Lorcana's). **A setup that would not fit the screen folds its options** into
  one-line rows (`fitFold`), as the home sheet shows them, so nothing scrolls where that can be helped. A folded row whose setting is On and Off is a switch on the row, and one with two to four short choices (a score
  target) is a row of buttons on it, with a ? at the end that opens what it means (`inlineKind` in kit.js; Tim, 2026-11-15);
  longer choices keep the row that opens them (it stays open, its choices and their words in view, until its own head is
  tapped again; several can be open at once: Tim, 2026-11-16, "keep the game options visible until the user collapses it
  back manually"; `scOpen`), with the same ? at its end when the setting has words about it, which come up
  only from the ? (Tim, 2026-11-16: "found some rules with explanations but no question mark"; `.k-scrw`). The online
  review's choices that only matter online have a ? beside their name too. A setting where only some choices have
  words keeps its ? whichever is chosen (it then says what the others mean), so give every choice its words.
  `Kit.win`'s rank rows take `me: true`: your row is ringed in your color and shows your own name, never "You".
  An online.js game whose table takes the setup's robots says `players.onlineBots: true`, and its review shows them.
  Results cards use `Kit.win`'s slots (`again`, `look`, `extra`, `setup`, `scores`, `stats`, close) rather
  than hand-rolled buttons, so every game offers the same things in the same order. Reference:
  `games/othello.html`.

## Player counts added 2026-11-14 (Tim: "add missing game modes")

- **Hearts** plays 3 to 6 (`COUNTS` in hearts-ai.html: the cards taken out, the club that leads, the pass cycle; 3 and 5
  pass left, right, no pass; 6 passes across to the seat opposite).
- **Cribbage** plays 2 to 4: three deal one card from the deck to the crib, four are two partnerships across the table
  pegging on one track (`players.teams`); the player on the dealer's left cuts, leads and counts first.
- **Apples to Apples** mixes robots with people (`cpu: 'mix'`), in pass and play and online (the host's device plays them). After any round the game can end there (Tim, 2026-11-16: "an end game option with confirmation after each round"): End game beside Next round asks first, saying who wins with how many cards, and the results card says the game ended after so many rounds (the `end` action; online only the host has it).
- **Space Invaders** stays two players at most (Tim: "online game requires two humans on different devices").

## Bridge (2026-11-14; Tim: "two more classic cards game to add: Bridge and Pinochle")

- `games/bridge.html` with `games/bridge/engine.js` (the rules, scoring, the score pad: `newPad`, `vulOf`, `padDeal`;
  the computer's bidding and play; runs in the page and in Node), `table.js` (the table, setup, moments, online, saved
  games, undo), `bridge.css`, and history `hist/bridge.js`. Contract bridge under ACBL's Laws for rubber bridge:
  **Chicago** (four deals, vulnerability none, dealer's side, dealer's side, both; 300 or 500 for a game, 100 for a part
  score on deal 4) is the default and **Rubber** the other choice (the 700 or 500 rubber bonus); doubled and redoubled
  scoring, the insult bonus, slams and honors in both.
- The computer bids SAYC basics from one table of rules (`rulesFor`): a robot's call and the meaning shown for it come
  from the same rule, so a new convention is one rule with its `say` and `sh` (the hand it shows). Michaels, the
  unusual 2NT (`two` on the bidder's picture) and new minor forcing (`convState`) are in it. Easy, Normal and Hard
  differ in skill, never in cheating; Hard samples hands that fit the auction and solves the last three tricks exactly
  (`HARD_DEALS`, `HARD_MS`, `DD_AT`). Hard bids a slam only after playing the hand out in its head (`slamOdds`: 72
  partner hands that fit the auction, played open-handed): when they average `SLAM6` (10.6) tricks and take twelve at
  least 3 times in 10. On about 17,000 Hard deals that made 73% of the slams bid (62% before); 11.1 makes 78% but fewer
  slams in all, and Hard's own card play is what loses most of the rest.
  On an iPad held sideways the bidding box is the whole box of 35 bids (`fullbox`) and the hand runs the full width.
- The table: a bidding box (levels and strains, Pass, X, XX), the auction slip by seat (a tap says what a call means),
  a duplicate board in the corner whose colors show vulnerability, the contract plaque, the dummy in suit columns,
  played tricks face down in rows by side, the We/They pad. Learning aids that can be turned off: your hand's HCP, bid
  meanings, a hint bulb. Each shape has its own layout, sideways with the information at the left; turning the device
  redoes the layout inside a View Transition.
- Online is TurnNet: each device gets only its own hand and the dummy (`netView`), seats `PS = [0,2,1,3]` so the first
  two people are partners, history once per device (`bridge_netrec`). Pass and play keeps hands face down between deals
  until a person acts (`BLIND`). Test hooks: `window.__bridge` (`setup({decl, slam, cards, stop})`), and
  `localStorage.bridge_fast = '1'` for 6x speed.

## Pinochle (2026-11-14; Tim: "two more classic cards game to add: Bridge and Pinochle")

- `games/pinochle.html`, the rules and the robots in `games/pinochle-core.js` (plain JSON state; the same code runs in
  the page, at the online table and in Node), history `hist/pinochle.js`. The count of players decides the game: 4
  Partnership, 3 Cutthroat (15 each and a 3-card widow), 2 Two-handed (stock and draw, meld after winning a trick).
- The ten-point scale (Pagat, the USPCC's rules): A, 10 and K are 10 each and the last trick 10 (250 a hand); bids from
  250 in tens; game to 1,500 (two-handed 1,000), or a shorter game from the setup. The dealer is stuck at 250, partners
  pass 4 cards each way (option 3), meld counts only with a trick taken, the bidder may throw in after the meld, and the
  bidding side counts out first. Run 150, double run 1,500, aces around 100 (twice 1,000), kings 80, queens 60, jacks 40
  (twice 800, 600, 400), pinochle 40, double pinochle 300, royal marriage 40, marriage 20, dix 10.
- Four layouts (`layoutFor`/`fit`); a turn of the device glides from the last painted frame (`SNAP`, `relayout`), and
  cards in flight carry `.aim` with `_aim()` to re-target. Online through TurnNet (seats `PS` 0,2,1,3 for four); each
  device records once on arrival (`netRecord`, `pinochle_netrec`).

## New card games and Arrow Jam (2026-11-15; Tim: "add war, go fish, crazy 8s and canasta to classic cards and uno to specialty cards")

- Each has its rules in a plain-JSON core that runs in the page, at the TurnNet table and in Node, a robot run under
  `scripts/` that plays thousands of games and checks every move, and a history view in `hist/`.
- **War** `games/war.html`, `war-core.js`, `hist/war.js`, `scripts/war-sim.js`: 2 to 4, Pagat's rules; after a war the won
  cards are gathered the way hands scoop them off a table (Tim, 2026-11-15: each player's cards a clump, the clumps in any
  order, a clump sometimes turned round, a card or two out of place; `gather` in the core, seeded), and a plain battle's
  cards go under in the order laid starting from a different player each round (a fixed order looped forever in about 1
  three-player game in 8). In order and Shuffled are the other choices.
- **Go Fish** `games/gofish.html`, `gofish-core.js`, `hist/gofish.js`, `scripts/gofish-sim.js`: 2 to 6; no undo (an
  answered ask shows another player's cards).
  **Pairs** (Tim, 2026-11-15, his family's way) is the setup's Collect choice beside Books of four, the default, kept as
  `col` in the state for online tables, saves and history: two of a rank go face up at once (the dealt hand's before
  the first ask), the deal and turn rules are the books game's, and the most of the 26 pairs wins (`layPairs`, `st.pc`).
  **Ten themed decks** (Tim, 2026-11-15: Space, Cats, Dogs, Zoo Animals, Food, Flowers, Sports, Jobs, US States,
  Countries; the standard deck stays the default): `games/gofish/decks.js` (13 subjects stand in for the 13 ranks, so the
  core and robots are unchanged; each subject has its name for one, for many and with "a"; the four cards of a subject
  are one picture over a band in its suit's color, with the same picture small in the top left corner ringed in that color), the game's `theme` in its state and on the TurnNet table, the Deck
  choice in the setup. Each deck's names are lettered in a face of its own (Tim, 2026-11-15: "a creative but fitting font": Audiowide,
  Grandstander, Chewy, Lilita One, Lobster, Playfair Display italic, Graduate, Fredoka, Alfa Slab One, DM Serif Display;
  `th-<deck>` in gofish.html, files `fonts/gofish-*.woff2`), each name sized by its longest word measured in that face
  (`nameFitTh`). Pictures `games/gofish/decks/<deck>/<key>.webp` and `-t.webp`; how they are made (the house
  style, every brief, the cut-out and the real map outlines for the two map decks) is `scripts/gofish-decks/README.md`.
- **Canasta** `games/canasta.html`, `canasta-core.js`, `hist/canasta.js`, `scripts/canasta/run.js` (`run.txt`): four in
  partnerships by default, two- and three-handed too; the robots' settings are `LV` in the core; test hooks
  `window.__canasta` and `localStorage.canasta_fast = '1'`.
- **Spanish One** `games/spanishone.html`, `spanishone-core.js`, `hist/spanishone.js`, `scripts/spanishone-sim.js`: Tim's
  name for an original game in the genre of UNO; the call is "One Card!" (Tim, 2026-11-15) (UNO's own name, logo and card look are Mattel's and are not used); 2 to
  10, its own card faces with a shape for each color.
- **Arrow Jam** `games/arrowjam.html`, levels `games/arrowjam/levels.js` from `scripts/arrowjam/gen.js` (checked by
  `check.js`, table in `levels.txt`), `hist/arrowjam.js` (replays a clear): played from Mazes beside the Labyrinth (Tim:
  "incorporate arrow jam into the mazes"), so its catalog entry is `hidden`.

## Mexican Train (2026-11-15; Tim: "add mexican train inside dominoes")

- A Game in Dominoes' setup (`variant: 'mexican'`), not a tile of its own: choosing it changes the seats to 2 to 8
  (`curV`, `range` in dominoes.html) and the options to First turn (one tile, or lay a train on your first turn of each
  round), Doubles (covered first, the standard, or covered later) and Rounds (13, or 7 from the double 12 to the double 6).
- The rules are `games/mexicantrain-core.js` (plain JSON, the page, TurnNet and Node; Pagat and the Puremco/Cardinal
  sheets: double-12 set, the engine taken out before the deal, 15/12/11 tiles for 2-4/5-6/7-8 players, a marker on a
  train after a pass, a double plays again and must be covered first, the double blank counts 50, lowest total wins).
  `scripts/mexicantrain-sim.js` plays thousands of robot games and checks every move, the 91 tiles and the markers.
- The table is `games/mexicantrain.js` + `mexicantrain.css` (`MTUI`; dominoes.html hands over to it in `onStart`, at
  boot and for a TurnNet table whose state says `mt`). Every train is a lane out of the wooden hub: down a tall table,
  across a wide one, both ways out of a hub in the middle with many players. A long train bends back beside itself where
  its lane is wide, and pushes together toward the hub where it isn't (older tiles show the half nearest the hub). Tiles
  are one size across the table (`layoutAll`), and each number's pips have their own color (`PIP`). Saved in
  `dominoes_mt`; its history is in Dominoes' history (`detail.v === 'mexican'`, `mtView` in hist/board.js). Test hooks
  `window.__mt`.
- **A crowded table folds the trains you can't play on** (2026-11-15, the small-screen pass): where an even share would
  leave the tiles small, your own train, the Mexican Train, any train with its marker out and a double owed take the
  room and the others lie in thinner lanes (`laneOpen`, `laneWidths`); a long train bends back (up to four lines) while
  that keeps its tiles larger than pushing together would; a narrow table with many trains keeps the hub's column to the
  hub (`nar`); on a 320-wide phone the four-to-a-row plates drop the avatar for the name.
- **At a desk** (a large window; `mdkPlan`, `mdkSet` in mexicantrain.js, `.mdk` on `.mtw` only while a desk layout
  shows): the hub, the lanes and the tiles are sized from the window (`MT_U`, 88px across at most; `deskCap` keeps a
  tile small enough for a train to run five or six tiles out before it bends), the plaques and the heads step up
  (`--k`). **No tile lies on another at a desk**, as on a real table: the tiles come down from the window's size until
  every train lies whole, straight out or bent back beside itself where its lane is wide enough, as far as `WHOLE_MIN`
  (42px across); only a table that can't hold its trains whole at that size pushes them together (`layoutAll`,
  `ln.tight`). **The panels give way, not the tiles** (`mdkGive`, `mOff`): where the desk's table would push trains
  together that the tablet's layout would lay whole, or its tiles would be smaller with both pushed together, the
  window has the tablet's layout until the next round. **wide**: the players over the rounds at the left, a ladder from the double 12 down with every round's dots,
  the rounds to come ruled and empty, the totals, and the totals round by round drawn under it where there is room
  (`paintLadder`, `drawRace`); at the right, between whose turn it is and your tiles, the round in play (`paintSide`:
  the double that must be covered, every train's length, open end and marker, the round play by play from `S.pl`),
  left out where the column is too short for a row a train. **tall**: the players, the rounds and the round in play
  side by side (seven or eight players: the rounds alone), the table, your tiles. **stack** (nearly square): the
  players in a row and the table the full width, no panels. A counted round is written where your tiles were, its
  button where the turn's buttons are (`paintCount`, `deskRound`; `mdkSync` moves it between the sheet and the panel
  when the window changes size).
- **Easy** (Tim, 2026-11-15: "nudge mexican train easy up slightly"): any tile that fits, but a little more than half
  the time it looks first (its own train when its marker is out, a double it can follow, a heavier tile): `EZ` in the
  core. The sim (mulberry32 now) has Easy winning about 1 match in 5 against Normal head to head, 1 in 15 against Hard.

## Lines of Action (2026-11-23)

- `games/lines-of-action.html` (catalog id `linesofaction`, Board, 2 players), the rules and the robots in
  `games/loa-core.js` (`LOACore`, plain JSON; the page, the computer's Web Worker, the TurnNet table and Node), history
  `hist/loa.js` (the final board, a replay, each side's groups over the game, the moves), demo
  `games/demos/lines-of-action.js`, `scripts/loa-sim.js` (robot games with every move checked against a plain reading of
  the rules and every win against a flood fill of its own). Saved in `loa_state`; online tables record once a device
  (`loa_net_rec`).
- Sackson's rules as the Mind Sports Olympiad plays them: Black on b1-g1 and b8-g8, White on a2-a7 and h2-h7; a piece
  moves exactly as many squares as there are pieces on its whole line, jumps its own pieces, never an enemy's, and
  captures by landing; all of a player's pieces in one 8-connected group wins (one piece counts); a capture that joins
  only the other player's pieces wins for them. The setup's If both connect at once (`tie`): Draw (the default) or
  Mover wins (Sackson's second edition). No move passes; a position seen a third time with the same player to move is a
  draw. Scrambled Eggs is left out: Wikipedia names it without its layout, and its source page could not be read.
- The table: an inlaid maple and walnut board in a walnut frame, polished stones; each side's groups lie on a soft
  shadow joining the pieces that touch (`paintPool`), and each player's bar counts their groups. A tap on your piece
  lights its four lines edge to edge, rings the pieces each line counts, and puts the count on every landing (gold,
  red for a capture), with a dashed line and a mark where an enemy piece blocks (`paintRays`). Moments: groups joined
  (`reward`), a long move, a capture's burst, the winner's pieces lighting out from the last move (`winWave`).
- Layouts (`fit`): upright, the column takes the screen's height and the room the board can't use goes into the gaps
  (`--gp`), each player's plate holding a row of their twelve stones with a dimple for each one captured; sideways the
  players, whose turn and Undo stand at the left and the board at the right; a turn of the device glides (`Kit.glide`).
  Pass and play hands the device over between moves with `Kit.handoff` (a 1-second hold; never against the computer,
  online or in the demo). **At a desk** (`deskWin`, the kit's test, so phones and tablets are unchanged; `la-desk`): the
  board takes the window's height and the left column (300 to 520px) holds the room (`paintRoom`): This game, every
  move newest first with captures in red; Groups, move by move (each side's group count toward the dashed one-group
  line); Past games here (wins by name and the last game); it gives up the chart, then past games, then the oldest
  moves, never a cut row. A desk window held upright keeps the device column without the 760px cap.
- Robots: alpha-beta (`search`) on spread around the center of mass, quads (Euler number), centralization, groups and
  mobility; `LEVELS` Easy depth 1 with noise, Normal 3, Hard 6 within 2.2 s. Test hook `window.__loa`
  (`start`, `set(rows, turn)`, `tap`, `play`).

## Pong's Tunnel (2026-11-15; Tim: "a 1 player 3-D concept for pong with bounces off the ceiling, floor and walls ... get weird and colorful and wacky with the effects")

- A Table in Pong's setup (`table`: Classic or Tunnel), not a tile of its own. Choosing it shows the Tunnel's own setup
  (`showSetup` in paddleball.html: modes `cpu` only, so you against the computer, with its skill); the choice is kept in
  `gn_setup_paddleball` first (`keepOptions`). Online review leaves the Table out (online is always Classic).
- `games/paddleball/tunnel.js` + `tunnel.css` (three.js through the page's importmap, `window.PongTunnel`): a neon box
  tunnel in a synthwave world (striped sun that pulses with the music through an analyser, checkered floor that ripples
  on hits, stars), a chrome ball with a trail, a depth frame riding the walls at the ball's depth, walls that light near
  the ball and ring where it strikes. Bloom, then a pass with chromatic aberration, wobble, glitch and flash (`FX`).
- The ball moves in the tunnel's own measure (u, v from -1 to 1, z depth), so the tunnel takes the screen's shape and a
  turn of the device only stretches it. Moving the paddle as you hit puts curve on the ball (`spinFromPaddle`, stronger
  on a faster ball so a swing bends it as far at every level); the computer (`DIFF`) differs in speed, reaction, first
  guess, settling and how much curve it reads, never in what it can see. Levels: 3 points past the computer clear one
  (pips in the Level plate), the ball speeds up, the computer sharpens, each level has its own colors (`PALS`; from
  level 4 the camera rolls, from 5 the tunnel twists, from 6 the picture wobbles, from 7 the colors cycle). 3 balls,
  an extra one every third level (up to 5). Points count x1, x2, x3 by skill.
- Moments: a curve or big curve shot (words in the air), rally 10/20/30... (disco floor), a point (sun flash and
  fireworks), a miss (the ball smashes the glass: glitch and aberration), a level cleared or perfect (`Kit.moment`,
  then a warp-speed flight out of the tunnel's far end), a new personal best. Moments from mid-rally wait in `G.queue`.
- Saved in `paddleball_state` as `{v: 2, tunnel: 1}` (classic's are v 1); high scores on the `paddleball_tunnel` board
  (HI_BOARDS, beside `paddleball`'s rallies); history `detail.tn` (`tunnelView` in hist/arcade.js).
- Frame time: `QUAL` 2 (bloom, pixel ratio up to 2), 1 (1.25) and 0 (no bloom), stepped down when frames run long.
- Test hook `window.__tunnel`: `get`, `auto(on, missEvery, curve)`, `sim(seconds, untilPhase)` (full speed, no
  drawing), `hold`, `level`, `pts`, `lives`, `diff`, `tune`, `miss`, `point`, `curve`, `quality(q, lock)`, `perf`.

## Wax Pack (2026-11-19; Tim: the Sandlot redesign, named "wax pack", the pitch duel "sure i'll try it", scanning "to log a player's deck")

- Catalog id stays `sandlot` (favorites and `gh_sandlot` history carry over); the page is `games/waxpack.html` with
  `games/waxpack/{engine,cards,scan,ui}.js` and `waxpack.css`. The old `sandlot.html`, `sandlot-mlb.json` and every
  `sandlot_*` key are untouched; `sandlot_cards` is read once into the new league. Keys: `waxpack_state` (the saved
  game, in `ST_SAVES`), `waxpack_league` (every card logged and its stats in your league, follows the PIN), the
  `waxpack_photos` IndexedDB store (card photos, this device only), `waxpack_fast` (tests).
- Real cards stay on the table; the page is umpire, scoreboard, announcer and record keeper. The flow: the stack (the
  cards on the table, entered by name or photo; odd cards too: Team card, Checklist, League Leaders, Highlight), a
  coin-flip draft (`startDraft`, `cpuPick`: the computer drafts by need), lineups on a drawn diamond (`arrange`,
  `bestFit`, `smartOrder`; a rim green at his own position, amber near it, red out of it), then the game: every at-bat
  is a secret pitch against a guess, revealed together.
- **A box of cards** (Tim, 2026-11-20: "an option for wax pack to randomly generate a lot of baseball cards in case a user
  doesn't have physical baseball cards at the moment"): on the stack, a wax-pack tile beside the empty slot and the
  button under the grid ("No cards at hand? Open a box", or "Fill the stack from a box of cards") deal a box
  (`openBox`, `dealBox`, `boxPlan`, `boxDraw` in ui.js): real players on real card-years from 1950 on (a card shows the
  season before its year, a regular's season of 300 at-bats or 100 innings, or a closer's 15 saves), about 3 in 10 drawn
  from star seasons (`starSeason`) so the milestone powers turn up, an All-Star season sometimes an All-Star card. A box
  holds what two teams need, counted against what the stack already has: 7 pitchers (8 for 15 cards each), two players
  whose main position that season is each of C, SS, 2B, CF, 3B, 1B, LF and RF, 1 to 3 odd cards (a Team card is one of
  the box's players' teams), then hitters to the draft's count plus 4. The draw is seeded from `Math.random`, so a demo
  page deals the same box. The moment (`packShow`): a wax pack shakes, its top tears off, the first five players fan out
  and turn face up (a power lit gold, and named), then the cards drop into the grid one after another (`dealIn`); a tap
  skips it, `waxpack_fast` skips it altogether. **Dealt cards stay out of your league** (`c.dealt`, `S.dealt`): they play
  in this game only, so the league keeps the cards you logged; a dealt card's sheet says so and has "Keep this card in
  your league" (`keepCard`, which marks it `box`). The history's `detail.dealt` counts the dealt cards in the two teams,
  shown in the view as Cards from a box. Test hooks `__wax.box()`, `__wax.boxing()`, `quick({box: 1})` and
  `quick({empty: 1})`.
- **At a desk** (a window larger than a phone's or a tablet's: `deskWin` with Horse Race's `deviceShape`, 540 tall at
  least and 900 wide, or 700 wide and 1100 tall; `html.wp-dk`, and every desk rule in waxpack.css hangs off it, so a
  phone and a tablet are drawn exactly as before). The play screen (`deskPlan`, `deskArrange`, `deskLeave`,
  `deskFit`, `muFit`, `paintRoom`, `fitRoom`): the ballpark sized from the window, the room with what is otherwise a
  tap away, and the station where you act, in one of three compositions chosen by the ballpark's scale: `w` the room
  at the left (300 to 560 wide), the ballpark, the station at the right (360 to 640, and in a short wide window the
  width the ballpark can't use, since its height holds it: 1600 by 560 has matchup cards of 124px where they were 60
  to 75), the announcer standing in the room under the line score; `t` the ballpark over the room with the station the window's height at the right (nearly
  square windows like 2100 by 1860 and 1000 by 1000); `k` a narrow tall window, the ballpark, the station and the room
  one under another. The room: the line score, both lineups with each batter's line today (`todayFull`), the batter
  up lit, each team's three pitchers with their innings, IP, H, R and K, the one on the mound lit, and the
  play-by-play newest first (`g.pbp`, every at-bat, steal and walk on purpose, the last 80; `pbp`); it gives up whole
  plays, then the pitchers' tables, then the fielding team's lineup (after the game, the home team's), and it is filled
  again whenever its box changes size (`V.ro`: a roll growing the station in a narrow window). The station: the matchup's two cards, one over
  the other or side by side, whichever is larger (`--mcw`, to 210px), each with his own label beside it (the
  rows his die is read on, `dk-lab`, put away while the dice roll and where a matchup is too tight, `nolab`, then
  `tight`), the duel with a reserved height so the cards never jump, the hand. The same nodes move between layouts,
  so a resize mid-roll keeps the roll (`deskCheck` from the resize handler, inside `Kit.glide`). The lineup at a desk
  carries every batter's card in the order with his whole name, card and power (`deskLineup`, `--ocw`, one or two
  columns, whichever gives larger cards, to 210px), the diamond's tags a step up; the stack's and the draft's cards go
  to 210px. **The stack at a desk** (`stackMakeup`, `fitMakeup`, `.wp-smk`) holds what the stack has against what two
  teams need, between the head and the buttons: a row each for the pitchers (six), the eight positions by each
  player's main position that season (two each) and the designated hitters, as pips filled for each card with the
  rows still short in amber and "1 short", "Covered" or "2 to spare" (the needs `boxPlan` fills from a box); a
  sentence naming what is short ("The stack is short 1 pitcher and 1 third baseman."), the odd cards, how the draft
  goes, and your league (cards logged, games played, its home run and strikeout leaders). A tall panel sets its words
  larger as far as it holds them (`--f`, to twice the kit's step); a short one gives up the league, the draft's note
  and the odd cards, then lays the needs in two columns, then three without the pips, then leaves the panel out. In a
  window taller than wide the panel stands between the cards and the buttons only where the cards keep their size.
  **The draft at a desk held sideways** gives each team half the column with its picks as cards, sized so a full
  team fits (`fitPiles`, `--pw`, to 150px). The setup and the results card are the kit's desk; in the kit's desk setup
  How to play is one panel 2040 by 1510 at 2100 by 1860 whose four columns run about 85px past its foot, the last
  lines of three columns and the source note cut there (the kit's, shared by every game, not changed here). The
  scratchpad's `big/wax3/` has the scripts (`big/waxdesk/` the first pass's): `h.js` with `sc.js` (scenes setup,
  stack0, stack, box, draft, lineup, play, roll, rollp, mid, over at any window, a picture and a scan that skips what
  lies in a scrolling box; `ROOT=base` serves the starting files from `base/`), `x.js` (fb the file picker and the
  scan, cam the camera with `FAKECAM=<y4m>`, rules, sheet, sheetb, hist, tired, steal, walk, kart), `drf.js` (the
  draft from a full box), `proof.sh` with `cmp.sh` (the device proof, `proof.txt`; `proofn` is base against base),
  `rzp.js <stack|stack0|draft|dbox|lineup|play>` (one page dragged through every window), `rz.js`, `full.js` (a whole
  game by `auto`), `print.js` (Print the table cards as a Letter PDF), `dbg.js`.
- **A small phone** (2026-11-20): a draft whose cards would need scrolling (a full box on a 320 by 568 phone: 28 to 34
  cards) lists them as name tiles instead (`listFit`, `.wp-grid.lst`, `--rh`): the last name over what the card plays
  ("SS Bat +2", "Arm 0", an odd card's play), 11px stepping to 9px for a long name, a pitcher or hitter edged gold and
  an odd card blue. A first tap lifts the tile and shows the card large over the teams with what it is and a Take
  button (`draftPeek`, `.wp-peek`; a tap on the card reads its sheet); a second tap on the tile, or Take, picks it. The
  line score shows as many innings as fit around the one being played (`paintBoard(cols)`: six of nine at 320 wide,
  so Top 1st stays on the screen). A drawn card's small print never goes under 9px (`max(9px, …)` on the team line,
  the script first name and the RC, AS and RB tabs in cardface.css, which only changes cards 130 to about 190px
  wide).
- `engine.js` (`WaxEngine`, pure, runs in Node) reads `games/waxpack/mlb.json` (from `scripts/build-waxpack-mlb.py`,
  Lahman data through 2025). A card plays the season before its year, measured against its own league that year, and
  gives a player a few whole values that print on a sleeve label (`table`, `valuesH`, `valuesP`): a modifier from -2 to
  +2 (the top tenth +2, the bottom tenth -2; batters by on-base plus batting average, pitchers by ERA), a pitcher's 2 to
  4 pitch cards from his strikeouts, and a card of die ranges (slugger, power, speedster, patient, contact; strikeout,
  ground-ball, wild; the plain card for a season under 200 at-bats or 50 innings). **The game plays at a real table
  without the app** (Tim, 2026-11-20: "this game should be able to be played without using the app on my phone"; the
  app works the values out and prints them). The at-bat lives in `atBat` alone: the pitcher lays a pitch card face
  down and the batter names one, both roll a d20 and add their modifiers, the batter wins by beating the pitcher's total
  by `RULE.margin` (7), and the winner reads his own die on his own card (a batter's Guessed right row is a single on a
  narrow win, 1 to 11, then extra-base hits, his Guessed wrong row walks and singles; a pitcher's row ball four, ground
  out, fly out, strikeout: `RANGES`). An out in play goes to a fielder by a d6 (`WHERE6`), and one out of position rolls
  a d20 for an error (`BOOT`: near 1, far 1 to 3). **Base running is one printed rule** (Tim, 2026-11-20: "tighten up
  the base running so runs come out right"): `advance` in engine.js does exactly what the reference page says, a line a
  case, from `runLines()` (made from `RUN`, so the words never drift), and How to play reads the same lines. Chance is a
  d6 only where a line says so (first to third on a single on a 5 or 6, first to home on a double on a 5 or 6, a double
  play on a ground ball with a runner on first and fewer than two outs on 1 to 3, a tag from third on a fly with fewer
  than two outs on 3 to 6), the speedster card is the only speed edge (always first to third and first to home, a
  double play on 1 or 2 only, a tag on 2 to 6), a fly to center moves a runner from second to third, a runner on third
  scores on a ground out only with the bases loaded, and no run scores on the play that makes the third out. The
  advance's `roll` is shown as a d6 beside the winner's card with what it needs, then what it did (`runSay`, `d6El`).
  Every team pitches three pitchers in fixed stints
  (`stints`: 3/3/3, 2/2/1, 1/1/1; the last takes extra innings), its order set on the lineup's mound (`staffOrder`), a
  pitcher 1 lower from his stint's third inning (`tired`, `tiredFor`). `node scripts/waxpack-sim.js [games]` calibrates the margin
  and ranges against real seasons (`TUNE='{...}'`, `RUN`'s faces too, `SHOE=1` the Shoebox rules, `NOPOW=1` no powers;
  with the powers AVG .252, OBP .314, SLG .407, K 21.9%, BB 8.5%, HR 3.0%, 2B 4.7%, 4.58 runs a team per 9 innings,
  0.88 double plays and 0.23 sacrifice flies a team a game; the slugger card's home runs start at 15 so the feared
  slugger's extra ones keep that near 3). **Milestone powers** (Tim, 2026-11-20, so the game plays from a shoebox of
  real cards): each player has one power at most, read off the last season on his card back (`POW`, `powerOf`, the
  stronger kept: slugger, stealer, producer; closer, strikeout artist, 20-game winner, workhorse) and kept in `r.pw`
  by `table`. Feared slugger (30 HR): a winning natural 19 or 20 is a home run on either row (`atBat`'s `slug`), and
  the pitcher may walk him on purpose (`walkOnPurpose`, the computer by `cpuWalk`); Base stealer (30 SB): before a
  pitch, the lead runner on first or second with the next base open steals on a d20 of 7 or more (`stealOption`,
  `steal`, `doSteal`, `cpuSteal`; the rule said 9, which the sim put at 61% safe, so 7 for 70%); Run producer (100
  RBI), Closer (20 SV, the game's last inning or later, ahead by 1 to 3) and 20-game winner (20 W, tied or behind)
  add +1, +2, +1 (`powerMods`, chips on the roll); Strikeout artist (200 SO): once a stint a batter who won rolls his
  d20 again and the new roll stands (`reroll`; a person answers on the roll, `askBox`, `kartChoose`, the at-bat split
  into `reveal` and `resolve`; the computer by `cpuReroll`); Workhorse (230 IP) never tires. A person gets each choice
  in the hand row when it applies (Steal second, Walk him on purpose). With powers the sim has 0.33 stolen bases and
  0.14 caught stealing a team a game (only about 6% of cards are base stealers) and 0.14 walks on purpose. The power's
  name and its line (`powerLabel`) are on the sleeve label, the card's sheet (`valuesEl`), and at the plate.
  **Player values** is a setup option (`S.vals`, saved as v 3; a v 2 save loads as League labels): League labels as
  above, or **Shoebox rules** (`c.vm = 'shoe'`, `SHOE`, `shoeH`, `shoeP`), every value read off the card back with
  one chart: Bat from AVG (.300, .280, .250, .225), Arm from ERA (under 2.50, 3.25, 4.50, 5.50), the batter's card
  the first that fits (30 HR slugger; HR plus 3B 20 or 2B 40 power; 15 SB or 8 3B speedster; at least as many BB as
  SO and 30 BB patient), pitch cards and the pitcher's card from SO and BB against IP (4 strikeouts every 5 innings
  for 4 cards, 1 every 2 for 3; as many as innings for the strikeout card, a walk every 2 innings wild). The cutoffs
  put every season since 1950 with 200 at-bats or 50 innings at 11/22/37/17/13% for Bat and 9/20/44/19/8% for Arm.
  The chart's words are `shoeLines()` and the powers' `powerLines()`, so How to play (`shoeRules`, `powerRules`) and
  the printed page can't drift; with the Shoebox rules the sim has 4.69 runs a team per 9 innings and HR 3.3%. The
  menu's Print the table cards prints the reference page, a page Reading a card back (the Shoebox chart and the
  powers), the pitch cards, each team's pitching card and a sleeve label per league card (`printSheet`). A v1 save
  upgrades on load (`upgrade`). The computer's duel is `cpuPitch`/`cpuLook` among the pitcher's own pitches; special
  cards are `SPECIAL` in `cards.js`. Test hook `__wax.newAB()` starts a fresh at-bat from a state set with `set()`.
- Scanning is `scan.js` (`WaxScan`), Tesseract.js vendored in `games/waxpack/ocr/` and loaded only on the first scan,
  nothing sent anywhere: the photo read upright and turned a quarter each way, names matched fuzzily with nicknames,
  the year from the copyright line or the stat table; the person always picks from the top three or types the name.
  A photo of one card filling the frame reads well; small scans and dark backs don't. The OCR files and `mlb.json`
  are not precached.
- **The drawn cards** (Tim, 2026-11-20: "draw the art of the baseball cards to look like realistic baseball cards from
  the late 80s and early 90s ... and generate images for the players on the cards"): `games/waxpack/cardface.js`
  (`WaxCard.face`, `WaxCard.back`, `artFor`, `styleFor`) and `cardface.css`, loaded after waxpack.css (the game's own
  `.wc` sizes the card through `--w`; `.wc.wxc` in waxpack.css). Six original designs chosen by the card's year
  (vintage before 1980, then corner, stripe, frame, script and gloss, `BY_YEAR`), team colors as plain colors by team
  code (`TEAM`), no maker's layout, logo or wordmark and no league or team logo. Sized in container units of the card;
  under 130px a card keeps its picture, last name and position (RC, AS, RB tabs), under 76px the tabs go; the back
  needs 280px for its stat table. The person's own photo goes into the frame (`photo`). The pictures are
  `games/waxpack/art/<k>.webp` and `-s.webp`: 47 photographs of anonymous ballplayers in plain uniforms, no letters,
  numbers or logos, faces small or shaded (`art/index.js`); `artFor` picks by role and hand, then a cap near the team's
  color, then the player's id, so a player always has the same picture. Briefs `scripts/waxpack-art/briefs.py`, packed
  by `pack.py`; fonts Oswald, Barlow Condensed and Yellowtail (`fonts/waxpack-*`, `fonts/waxpack-LICENSE.txt`).
- **Card photos** (`WaxPhoto` in `games/waxpack/photo.js`, `photo.css`; Tim, 2026-11-20: photos of real cards "authentic
  and clean", never repainted; square-cut and rounded corners told apart; cardboard backs in any ink, red and green
  too; holograms kept). `WaxPhoto.capture` is the camera behind a card-shaped frame (each side lit green as its edge is
  found, the shot taken once the card is still, a glare warning, front then an optional back, the file picker where the
  camera isn't allowed); `WaxPhoto.clean` finds the four edges and straightens the card to 750 by 1050, calls a corner
  `round` only when three agree, balances a front from its own white border, gives a cardboard back no white balance
  (brightness evened, each ink lifted with its hue kept), and leaves hologram cells' pixels as they were; `record`,
  `show` (a rainbow sheen over the hologram that follows the finger or the tilt) and `editHolo`. `captureCard` in ui.js
  stores the cleaned front under its key in `waxpack_photos` and its corners and hologram under `key + ':m'`, and the
  scan reads the straightened front. Weak spots: a dark card edge on a dark table, a gray card's soft shadow on light
  paper, cards still in a toploader. Scripts: the scratchpad's `big/waxphoto/` (`run.js`, `ui.js`, `api.js`).
- The announcer is `games/talk/waxpack.js`, fed from the database's honors. **Honors, All-Star counts and career
  totals stop at the card's season** (`history()` in ui.js and the card back's `bio`, Tim, 2026-11-20: the announcer
  named a 1988 card's Rickey Henderson "the Most Valuable Player in 1990"): no Hall of Fame, award or ring after it.
  History: `Kit.record('sandlot')` with `detail.wp`, drawn by `hist/specialty.js`. Test hooks `window.__wax` (`quick`,
  `auto`, `rig`, `first`, `finishDraft`, `choose`). Scripts: the scratchpad's `big/waxpack/` (`h.js`, `sc.js`, `pp.js`,
  `scanui.js`), `big/waxpack2/`, `big/waxrun/` and
  `waxpack/ocrrun.js`. Not done: online.

## Demos (2026-11-16; Tim: "add demo button and develop interactive animated demos to all games possible to walk first time players through animated versions of the game accessible with a small icon on the game menu")

- **What a player sees**: on the home screen's game sheet, a small round button at the header's top right (`.pk-demo`,
  the `demo` icon, a play mark in a circle, with the word Demo small under it, `.pk-dl`), only for a game with `demo` in games.js; it glows (a ring that grows and fades
  on `::before`) for a game never played (no `gh_<id>` history, nothing to resume) whose demo hasn't been watched
  (`gn_demo_seen`, a list of game ids, follows the PIN). Every such game's menu has Watch a demo under How to play
  (`Kit.demo()`). Both open `games/<play>.html?demo=1` (`&from=home` from the sheet, so the strip's X goes back to that
  sheet through `index.html#sheet=<id>`). A curtain with the game's icon, name and one line covers the table while the
  script sets it, then the demo plays on the game's own table: a glass strip over the game bar (X to leave, the game's
  icon, a dot for each beat filling in gold, Skip), caption plates (Night glass, a gold hairline along the top that fills
  as the time to read it runs out; a tap on the caption moves on), a gold ring on what a caption is about, and a finger
  (a translucent disc) that glides to a piece, presses with a ripple, and sends real pointer and click events so the
  game's own animation, sound and haptic play. On the player's turns (`D.you`) the rest dims, the caption has a gold
  pointing hand, only the ringed thing takes a tap, and a ghost finger shows the way after five seconds. The end is a
  card: the game's icon, "You’re ready to play", the script's line, Play now (the game's page as usual: its setup, or the
  game in progress) and Watch again (the same demo again, dealt the same).
- **Files**: `demo.js` (the player, `KitDemo`, loaded only on a demo page; its CSS is inside it), `games/demos/<page>.js`
  (a game's script, named after its play page: `hearts-ai.js`), the `demo` field in games.js (true, or a page of its own:
  Arvela's is `anoria.html?quick=1`, its quick start, and its menu's Watch a demo runs `AnoriaGuide.quickStart()` through
  `Kit.init`'s `demo` option). kit.js has `Kit.demo`, `Kit.demoScript`, `Kit.hasDemo`, `Kit.demoSeen`, `Kit.demoHref`,
  `Kit.inDemo`, and loads demo.js and the script on a demo page. Add new scripts to `PRECACHE_URLS`.
- **The sandbox** (the top of sync.js, before anything else runs): on a `?demo=1` page under /games/ localStorage is
  wrapped (`Storage.prototype`, so sync.js's own handle too): settings, names, scores and history (`gn_`, `fgh_`, `hi_`,
  `gh_`, `my_name`, `frequent_players`, `casino_bank` and the other KEEP keys) read from the device, a game's own saves
  read as empty, and every write goes into memory for that page only. sync.js never boots, `loadFirebase` refuses,
  `noteWrite` does nothing, the FGHSync calls that reach other people (linkSend, bankRemote, inboxAdd and the rest) are
  no-ops, `fetch` refuses Firestore's REST address and anything sent (not fetched) to another site, `sendBeacon` sends
  nothing, `Kit.record` files nothing, turn banners stay off and Play online says to wait. `window.__KIT_DEMO.writes`
  lists the keys a demo wrote (in memory) and `.blocked` every cloud call it refused. `Math.random` is seeded (mulberry32,
  `&seed=<n>` for another), so a deal or a roll comes out the same each time.
- **A script**: `Kit.demoScript({intro, beats, end, start(D), steps: async D => {...}})`. `start` sets the table through
  the game's test hook (behind the curtain); `beats` is the number of dots (each `D.say` and `D.you` fills one); `end` is
  the closing card's line. In `steps`: `D.say(text, {at, ring, spot, pos, wait, avoid, dot})` (at: an element, selector or
  function, which may give a list; the caption goes above, below or beside it, never over it or over `avoid`; pos 'top' |
  'bottom' | 'center' with nothing to point at; `wait: false` goes on at once and leaves it up), `D.tap(target, {say})`,
  `D.drag(from, to)`, `D.you(target, text, {allow, until, autoTap, avoid})` (allow: what may be tapped, default the target;
  until: done when this is true, default the first tap), `D.wait(ms | fn, maxMs)`, `D.set(fn)`, `D.ring`, `D.clear`.
  `&demoauto=1` lets the demo take the player's turns (tests and recordings). `window.__demo` has `says`, `step`, `done`.
- **Writing one** (Tim's bar for every game applies): 45 to 90 seconds; the game's real table and real moves, never a
  drawing of them; a position set through a hook (`window.__<game>`: start a game with given players, set the hands or
  the board, draw again, carry on; add a small one if the game has none, as Yahtzee's `rig`, Hearts' `set` and Chess's
  `start` were added) and robots that choose the same way every time (Spanish One's `Core.C.rng`); one or two real moves
  by the player with `D.you`, limited to the move the story needs; the game's own rare moments where they fit (Yahtzee's
  Yahtzee, Chess's checkmate). Captions are Tim's: whole sentences a person would say, one idea each, naming the cards and
  pieces, said from where the player stands ("Bender took that trick, with a heart and the Queen of Spades in it. That’s
  14 points against Bender."). Check it with the scratchpad's `demo/tools/run.js <page> <phone|side|ipad|ipadside>
  --shots` (screenshots of every caption, whether a caption is off the screen or over its ring, and the sandbox check:
  localStorage byte for byte before and after, requests to other hosts) and `--video`.
- **The pilot** (for Tim to approve the look before the rest): Hearts (pass three, lead the 2 of Clubs, then the last
  four tricks: hearts broken, the Queen of Spades on Bender, following suit, the hand's scores), Yahtzee (holding the
  sixes, the top section's bonus, a Large Straight, a Yahtzee), Chess (pawn, bishop, knight and queen, then the player
  checkmates with Scholar's mate), Spanish One (a number match, a Draw Two, the player's Wild and color, drawing, One
  Card! and going out), and Arvela (its quick start).
- **Scope for the rest**: 130 catalog entries. No demo for the 6 console entries (emulator games; the cartridges are
  the house library's), the 7 tools (scorecard, dice-roller, randomtools, ranker, players, history, hiscores) and the 2
  hidden entries that play inside another game (arrowjam in Mazes, tetrinet beside Tetris): every one of the other 115
  has one (the rollout of 2026-11-16, in twelve batches by kind; each game's own page has its small `window.__<game>`
  hooks, inert outside a demo). What the rollout added to the player: the Kit keyboard types in a demo (untrusted keys pass
  the key guard) and the demo's strip, ring and captions live on `<html>`, so the keyboard's lift never carries them off;
  `D.drag(from, [to1, to2, ...])` passes through each point without lifting (Boggle); the caption's parts are `kd-ln`,
  `kd-nub`, `kd-hd` and `kd-tx`, so a page's own `.hd` or `.tx` never restyles them (Hot Dog Stand's page is `.hd`);
  `ArcadeHi.check` files nothing and asks for no initials in a demo. **A demo can be paused for reading** (Tim, 2026-11-16): a pause
  button in the strip beside Skip (the space bar too) turns gold with a play mark while paused. demo.js runs the page on
  a clock that can stand still: `Date.now()` and `performance.now()` stop, a timeout or a frame waits with the time it had
  left, intervals skip their ticks, every running animation is held, so the robots, the game's motion and the caption's
  reading time all wait together; a tap on the caption or the player's ringed move plays on. **A step back** (Tim, 2026-11-17: "add a step backwards button to the demos next to the pause"): beside pause, in one
  pill with it, a back mark goes to the caption before this one, or to the start of this one once it has been up for 3
  seconds, as a music player's back button does. It reloads the page with `&at=<beat>` (and `&pz=1` when paused, so it
  lands paused) and plays the demo again behind the curtain on a fast clock (`ffStart`/`ffFrame`/`ffStop` in demo.js):
  time moves a frame at a time, as many frames as fit in each real frame, every timer firing in its turn and every frame
  callback getting its frame, the page's animations sped up to match, sounds and buzzing off, the player's turns taken for
  them, while the strip's dots fill; at that beat's caption the clock is real again and the curtain lifts. The seeded
  dice and the robots make it come out the same (the scratchpad's `demo/back.js <page> <beat> <size> [--pause] [--late]`
  checks the landing and every caption after it). A card game gets back in 1 to 2 seconds; a canvas game takes as long as
  its frames take to draw. **Demos play at 0.7 of the game's own speed** (Tim, 2026-11-17: "make all the demos go at .7x whatever speed they're
  going now"): the demo clock runs at `SPEED` (0.7) and every animation on the page is slowed to match as it starts, so
  the moves, the robots, the animations and each caption's reading time all take 1/0.7 as long (`&speed=<x>` tries
  another). The end card's parts are
  `kd-pn`, `kd-ic`, `kd-acts` (a page's own `.acts` gave Flappy Bird's card narrow buttons). Stock Market and Sportsbook play on fixed sample
  data in a demo (`Kit.inDemo()`), and say so; Lorcana needs the network for its card list. The score keepers (hearts.html,
  spades.html and the rest) are tools of their games and share the game's demo.

## Accounts: PIN or Google

- A PIN account lives at `pins/{pin}`; a Google account (mode `google`, `FGHSync.isGoogle()`) at `users/{uid}`, readable
  only by that sign-in (Firebase Auth, Google provider). Both have the same fields and `st` saved games. `FGHSync.isPin()`
  means "signed in to either"; `FGHSync.acctKey()` is the PIN or `g:<uid>` (device space, online-table tag).
- Profile menu, Move to Google sign-in (`FGHSync.moveToGoogle`): copies everything, retags the account's online tables,
  then the PIN keeps only `{moved: true, to: 'google'}`. Devices still on it are signed out and told to use Google; after
  30 days anyone can take the PIN (a fresh doc with `reborn`; devices from before see a different `fgh_acct_gen` and
  sign out). Child accounts (a parent looks after them) can't move. A parent who moves keeps their old PIN as the code
  for their child's lock screen (`gn_parent_code`).
- Google sign-in uses the page's own address as `authDomain` (Firebase Hosting's `/__/auth/handler`), so every address
  that offers it (games.timbrown.xyz, each preview channel) must be in Firebase Auth's Authorized domains and its
  `/__/auth/handler` URL in the Google Cloud OAuth client's redirect URIs. The home-screen app signs in by redirect
  (`googlePending`/`googleResume`), browsers by pop-up.
- Local testing: Firestore + Auth emulators with `localStorage.fgh_emu = '1'` (and `fgh_emu_google` = a fake Google id
  token JSON for sign-in).

## Online games

- **Turn-based games go online through `turnnet.js`** (TurnNet), never their own system: one Firestore doc per table
  in `turnRooms`, holding the whole game. Every table keeps `seats`, `accts`, `turn` (seat indexes whose move it is)
  and `drive`, so the home screen's Keep playing shows "Your turn" for any game without game-specific code. A new
  turn-based online game needs nothing added on the home screen. (Chess and Lorcana predate it and keep their own.)
- **A casino game's Players card shows what each person sits down with under their name** (`Casino.peek(name)`, read
  without changing anything: yours, a linked player's, a frequent player's on this PIN, or play money; Tim, 2026-11-15),
  labeled bankroll, buy-in or table money as the game says in `players.stake(mode, options)`: null for the whole bankroll
  (the default), `{buyin: n}` (Poker's cash games, $200), `{table: n}` (Blackjack and Horse Race pass and play on table
  money), or false for chips that aren't money (Poker's tournaments).
- **The house casino games** (Roulette, Craps, Baccarat, Three Card Poker, Pai Gow, Horse Race) go online through
  `CasinoNet` at the end of casino.js (Blackjack's pattern). **The host chooses the money** (Tim, 2026-11-14: "host gets
  to pick buy in with bankrolls or play money"; the review's Money, `CasinoNet.moneyOption`, Blackjack's `netmoney`):
  Bankrolls, where each device takes its own seat's result to its own `casino_bank` once (`CasinoNet.settle`, through
  `Casino.applyRemote` with a gid, so the ledger shows it as a session at the host's table) when the table cashes out or
  it leaves, or Table money, where no bankroll changes. **Someone who runs out sits out until they buy back in** (Tim, 2026-11-14: "give
  players an opportunity to reset their bankroll and buy back in if they bust"): an offer comes up once and a Buy back in
  button stays (the strip, Blackjack's controls, Horse Race's pick bar); with Bankrolls, a bankroll that can't cover the
  buy-in can be reset to $1,000 first, and what the table had cost is filed to the bankroll before the reset (`filed` on
  the seat, taken off the final result). The 'rebuy' move is made off-turn through TurnNet's `free(state, seat)`. Either way everyone starts with the same amount, and everyone bets at once (TurnNet's turn holds every seat still to bet), and the last
  bet in settles the round for every seat inside its transaction; each device plays the result out with the game's
  own animation. Each seat keeps the game's own state in the table, and settling runs the game's own code with saves
  and drawing switched off. Craps passes the dice on a seven-out; Horse Race uses its pass-and-play state. People only:
  against the house a computer gambler adds nothing.
- **Wheel of Fortune and Press Your Luck play online as live shows** (Tim, 2026-11-14: "live show") through
  `games/liveshow.js`, a layer on online.js shared by both: the host's device runs the show and copies what it draws and
  plays to the others; each contestant has only their own podium's controls; a shared clock (pings every 1.5 s) lets a
  buzz, a STOP and a solve be judged by when it was pressed on the player's own device, not when it arrived. Guests
  never receive a puzzle's answer. The computer plays any podium nobody takes, and one whose device drops out until it
  joins again.
- Real-time games (arcade, consoles) use `online.js` (WebRTC); consoles add lockstep in `games/console-net.js`.
- **Notifications** (the bell on home, the profile menu and every game's menu, `Kit.inbox`): news that came in on this
  device, newest first (`gn_inbox_dev`). Anything new worth looking back at (a turn, a link answer, a request) goes in
  with `FGHSync.inboxAdd({id, k, ...})` and gets a line in `inboxLine` in kit.js. A turn notification is marked read (`read: 1`,
  `FGHSync.inboxRead`) once that table is no longer waiting on you (Tim, 2026-11-14: "if i've taken my turn, mark this
  notification as read"): `netTurns` does it for every table that isn't your move, and your turn there again brings a new one.

## Poker circuit rooms (pictures)

- Every stop's room is a three.js scene in `games/poker/venue3d.js` (`SCENES`, `PLACES`). The page shows a **finished
  picture** of it from Firebase Storage `venues/<key>-<view>-<stage>.jpg` (view `room` | `seat`, stage `busy` | `thin` |
  `final`), and only renders the scene itself in the browser when the picture isn't there.
- The pictures are path-traced offline (Blender/Cycles) from `VenueScene.build()`'s export, with real people (MakeHuman,
  AGPL data, used only to make pictures) and real materials; the tooling lives in the session scratchpad
  (`bl/render.sh`, `bl/batch.sh`), not the repo. Upload with
  `FIREBASE_SERVICE_ACCOUNT=... node scripts/upload-venue-art.js <folder>`. A changed scene needs its pictures
  re-rendered and re-uploaded, or the page falls back to the plainer in-browser look of the new scene.

## Axis & Allies boards

- Two boards: the 1942 Second Edition (data inside `games/axisallies.html`) and Classic, the 1984 Milton Bradley game,
  in `games/axisallies-classic.js`. Classic is converted from TripleA's World War II Classic map by
  `scripts/build-aa-classic.py <clone of github.com/triplea-maps/world_war_ii_classic>`; the page swaps the board in
  place (`useBoard`) and Classic's rule differences hang off the `CLASSIC` flag.

## Goblin Defenders art (Blender)

- Every sprite (towers at 16 angles, enemies' walk cycles, icons) and every map picture is path-traced offline in
  Blender/Cycles from Python models in `scripts/goblin-blender/` (`lib.py` materials and shapes, `towers.py`,
  `enemies.py`, `icons.py`, `props.py`, `maps.py` map dioramas, `worldmap.py`). Run them with a Python that has bpy
  (`pip install bpy` into a venv): `render.py frames <towers|enemies|hero|icons>` then `render.py pack` writes
  `games/goblin/*.webp` + `sprites.json`; `maps.py [ids]` writes `games/goblin/maps/<id>.jpg`; `worldmap.py` the world.
- A changed map grid in `goblindefenders-data.js` needs its picture re-rendered (the road is painted into it).
- The sound effects and music in `games/goblin/snd/` are the original game's own (Tim's personal app).

## Console game controls

- What each button does in each console game (shown in Controller buttons with the keyboard keys) lives in
  `games/console-actions.js`, by console then game, from the game's original instruction manual (archive.org's
  NESManuals and console manual packs are reachable; StrategyWiki/Wikipedia/GameFAQs are not). Labels are short
  ("Jump", "Swing or pitch"), no brackets, slashes or " · "; buttons the manual gives no job are left out.
- The daily `console-controls.yml` Action runs `scripts/check-console-controls.js` over every game library in Storage
  and keeps one GitHub issue (label `console-controls`) listing shelf games with no controls yet. A scheduled Claude
  task works that issue: adds the games on branch `claude/console-controls`, previews on channel `controls`, and waits
  for Tim's "ship it".

## Console high scores

- `games/console-hi.js` says where each console game keeps its score and its game over. A score is filed only at the
  game's own checked game over (`over(m)`), once per game, with the game paused behind the prompt; a game without a
  checked `over()` gets no high scores at all (never guess from a score that drops or a trip to the title).
- A game's optional `where(m)` names where the player is ("Green Hill 2", "vs Glass Joe", "Floor 1-2") for its Keep playing
  tile, read only while `play(m)` is true; like the score readers, each is checked against the game's own screens.
- Check a game by playing it in the emulator and reading memory against the screen (the scratchpad bench: EmulatorJS
  headless with the house library's file). A fixed reader gets a new `rev` on the game and an entry in `HI_RESET`
  (sync.js), which drops that board's older rows on every device and in the cloud.

## Play mats made from a picture (MatKit)

- Tim, 2026-11-11: "allow for using card art as backdrops and positioning that card art anywhere on the mat, even if it
  creates negative space. If it does create negative space allow for a different pattern or texture to fill that
  negative space and for there to be a smooth transition from the art to that negative space", and then "Carry that
  new mat rule over to Lorcana mats as well. Generally, they should have about the same engine, but the art they draw
  from is specific to their games".
- **One engine, `matkit.js`**, with no game's name in it. It owns the stored value, the painting and the editor; its
  interface is at the top of the file. The value is a small object: `{k: 'art', c: the game's name for the picture, u:
  its address (optional), w, h, cr: the part of the picture shown (optional), r: quarter turns (optional), x, y: the
  middle of the picture as fractions of the mat, s: the picture's height as a fraction of the mat's height (0.6 to 4),
  f: the cloth in the empty part, col: its colour, au: 1 when the colour came from the picture, d: dimming}`. Fractions
  of the mat, so a value holds at every screen shape. `MatKit.read` returns null for anything else, so each game's
  older plain values load through that game's own code.
- **Painting** (`MatKit.paint(node, value, {url, turn, small})`): a `.mk-lay` in the mat with the cloth (`.mk-fill`,
  five patterns drawn as SVG: plain weave, chart lines, quilted diamonds, woven stripes, a field of stars) and the
  picture (`.mk-art`). Every edge of the picture that lies inside the mat fades into the cloth (a feathered mask,
  30% of the picture's shorter side); an edge beyond the mat's edge has nothing to fade, and its feather closes as the
  edge goes out. Sizes are in container units of the mat, so nothing is measured in JavaScript. A second `paint` on
  the same node changes only what changed: the picture is never loaded twice, so nothing blinks.
- **The editor** (`MatKit.edit`): the mat in its real shape; one finger drags the picture, two pinch it, the wheel and
  a size slider do the same for a mouse, the corner handles of the dashed outline resize it, arrow keys move it. The
  middle of the picture stays on the mat and the size stays within limits. A row of cloths, a row of colours: the
  first colour is taken from the picture's edges (`MatKit.tone`, a canvas read once), kept dark enough to play on.
  The game gives it its buttons' classes, its icons, its words and a class for its own look (`.an-mk` in Anoria's
  ui.css, `.lorc-mk` in lorcana-play.html).
- **Anoria**: Play mats has "A card's picture": the card strip (`browse` with `pick`) over the pictures you have found
  (your Guides, your cards, the Places), full-size pictures. Stored in `anoria_mat` as the value's text; the second
  person's in the game's save. **The other player's mat is turned to face them only in pass and play** (`matTurned`):
  against the computer nobody sits across the device, so every mat there is upright.
- **Lorcana**: under Card art, "Picture fills the mat" (as before) or "Picture placed by hand". The pictures are the
  card scans the game already loads: the art window above the name on a standard card, the whole face of an Enchanted
  or Iconic printing, a Location's picture turned upright (`placedPic`). In the game such a mat goes by its value as
  text, like any mat's id, so seats, the saved game and online tables (`host.mat`, `guest.mat`) carry it unchanged;
  `lorc_mat` and `lorc_mat2` store the object (`matLoad`/`matSave`). A copy of the game from before this meets such an
  id online, does not know it and shows its plain default mat. Lorcana's own "Flip opponents' cards" setting still
  decides which way the other mat faces.
- A new cloth is one entry in `FILLS` and `PAT` in matkit.js; a new game needs `MatKit.paint` where it draws a mat and
  `MatKit.edit` in its picker.

## Lorcana card updates

- **Who a character can challenge, and what would happen** (Tim, 2026-11-23: "build both"). In the card reader, a ready character that can challenge has a row per target over Quest and Challenge (`chalList`, sentences from `chalSay` on `chalOutcome`): the target's picture, lying sideways when exerted, what the challenge does to each side with Willpower pips, your card banished in red and theirs in green; a tap on a row challenges, and with one target the button names it. On the table, dragging a challenger over a glowing target draws a dashed line to it with a glass tag saying the outcome in one sentence, the dragged card half see-through; both go in `cleanDrag`. On a phone the reader's card shrinks (to 214px) rather than scroll when rows are listed.

- Every deploy (and the weekly `lorcana-check.yml` Action, Mondays) saves Lorcast's full card list to
  Firebase Storage `lorcana/data/cards.json` (public): `https://firebasestorage.googleapis.com/v0/b/familygames-da3e5.firebasestorage.app/o/lorcana%2Fdata%2Fcards.json?alt=media`.
- The weekly Action runs `scripts/check-lorcana-abilities.js`, which runs every card through the game's own rules
  code (the `// ==RULES==` … `// ==/ABIL==` part of `games/lorcana-play.html`; keep those markers) and keeps one
  GitHub issue (label `lorcana-check`) listing cards the game can't run on its own yet.
- "Wire up the Lorcana cards in the weekly check issue": read that issue or the saved card list, extend the
  parser/engine, check new screens and animations with Tim before building them, then preview as usual.

## Arvela (the card game; its files, code and storage keys say anoria)

- **The game is called Arvela** (Tim, 2026-11-14: "rename this game 'Arvela'"; it was Anoria). The name comes from Arbela, today's Erbil, one of the oldest cities lived in without a break, said the later Greek way (Tim: "arbela was the main inspiration"); Archimedes' arbelos sounds the same. Every word a player reads says
  Arvela, the country of memory in its story too; the name beside the logo's mark says ARVELA. The files (`games/anoria.html`,
  `games/anoria/`), the catalog id `anoria`, the code's names (`AnoriaUI`, `AnoriaColl` and the rest) and every storage
  key (`anoria_*`) keep the old name, so saved games, collections and links carry on. The notes below still say
  Anoria where they mean the game's code.

- **Arvela online** (games/anoria/net.js; Tim, 2026-11-14: "add online to all the remaining games") is TurnNet: the
  table holds the page's G with S, each person's deck (chosen on their own device after Start; the host's from the
  setup), and a seed every die and shuffle comes from. A move ({k: 'deck' | 'lay' | 'act' | 'disc' | 'end'}) is made in
  the transaction against E.actions on the server's table, by mirrors of ui.js's game loop (actPhase is doAction,
  startPhase beginTurn, endPhase endTurn, rollPhase suRoll), with ui.js's own tally and turn log: **a change to what
  those do to G needs the same change in net.js**. Every device plays a move back with the table's own playback.
  Everyone lays their Domains at once. Two players are people only and leaving gives the other the win; with 3 to 6 the
  computer fills and takes over seats. History and rewards are kept once per device (`anoria_net_rec`), even for a game
  that ended while that device was away, and a Guide who joined has their moment before the results card as at home.
  ui.js's hooks are marked `// NET hook` (`AnoriaUI.net`). The doc carries every hand, as Spades' and Hearts' do; each
  device draws only its own.
- **Every card is part of the prime set until launch** (Tim, 2026-11-13: "right now, we're still on the 1st printing
  beyond starter and guide decks as far as i'm concerned. i'm still testing the game and tweaking rules so anoria is
  still in beta and any cards we add for balance/interest/fun/unexpectedness going forward until we agree we're at
  launch are all part of the initial printing (the prime set)", and "one printing is fine"). Until Tim agrees the game
  is at launch, every card, old or new, is part of the prime set. The `pr` numbers (3, 4, 5) and the names P3, P4, P5,
  PRINT3, RARE3 and the like in code only keep track of when cards were added; no word a player reads says printing or
  series in that sense (an edition is a card's finish, which is a different thing and stays). A set made after launch
  gets a name of its own.
- A tile of its own under Specialty cards (Tim, 2026-11-11; it used to be hidden behind Lorcana's icon). Its sheet on
  the home screen has Play, then Library, Packs, Decks and How to play (`launch` in games.js: `anoria.html?library=1`
  and so on, read at the end of ui.js; each opens over the setup or a game in progress and leaves it as it is). The
  same four are in the game's own menu (`tool()` in ui.js).
- **Game history** is `hist/anoria.js`: the two Guides and how the game ended, the race for Renown with who scored each
  Place every round, the map at the end, the numbers side by side, and the Threads made with their true sentences.
  `record()` in ui.js saves what it draws (`G.tale`, kept by `tally()`); a new kind of thing worth remembering from a
  game is added in both. The view fetches cards.js and text.js for names when it is opened away from Anoria's page.
- `games/anoria/engine.js` is the whole rules engine, for the page and for Node (`scripts/anoria/run.js` plays thousands
  of robot games with it): rules and card numbers change only with the balance runs. `cards.js` has the numbers and the
  five built decks, `text.js` what every card says, `land.js` the coastlines for the map behind a card's text.
- `games/anoria/ui.js` + `ui.css` are the table: the card (`cardEl`, the approved design, sized in em), setup, and the
  playback. Each step is applied in the engine at once and saved, then its event log (`S.ev`) is played back one moment
  at a time: the `EV` handlers move the on-screen snapshot `V` along and `settle()` brings it level with the engine.
  A new kind of engine event needs a handler there.
- Pictures: `games/anoria/art/<key>.webp` full size (reading a card), `art/t/<key>.webp` small (table and hand); Places
  are `place-<key>`. They are not precached; a missing one shows a flat panel in the faction's colour with the name.
- The game's rules are `STD` in engine.js: every Place scores 1 Renown every round, all game, and the first to 25 wins,
  or whoever breaks all 3 of the other player's Seals (Tim, 2026-11-11; it was first to 30 that morning, and before
  that Places scored double from round 4. A game saved under an older rule finishes under it: `G.sc` for the scoring,
  `G.tg` for the Renown that wins). **The Renown that wins is never typed into a sentence**: the table, the rules
  page (`RULES` in ui.js) and the results card read `S.cfg.target`, and the guide's captions and the story's counting
  laurel read `WIN` in guide.js. A round limit of 14 that only a stand-off reaches, clashes roll two ordinary dice (`dice: 'high'`), both copies
  of a person can stand on your side at once (`unique: 0`, Tim, 2026-11-12; it was one of each), a Legacy Figure has +1 Might for each
  person it names who is in play on its side (`inspEach`; two copies of one person count once), every Legacy Line a player makes scores, however many in a round (`lineCap: 0`, Tim, 2026-11-12: "i look at legacy lines as powerups for making historical connections"; it was the first line a round only, and the ready decks measured 4.8 apart without the limit against 4.9 with it), the second copy costs the same as the first (`ret: 0`, Tim, 2026-11-12: "remove that discount rule"; it returned for 1 less), and Threads (`threads`): any card can name what
  it grew from in cards.js (`from`: a Figure, a Relic or `'@place'`; a Figure's own Legacy is `insp`), with a true
  sentence for each link in `text.js` (`LINKS`). The robots are `PROF.novice` (Easy), `normal` and `hard`.
  **Two players can have the same Guide** (Tim, 2026-11-16, of a mirror match): two Cleopatras in a tie on different sides
  cancel out and the tie goes as it would without her; two teammates who both have her are one side, so their team holds it
  (`holderM`, `holderT`; the rules page and her card's notes say so; players-test.js).
- **The Library and the deck builder sort and filter cards the same way** (Tim, 2026-11-12: "keep library and deck
  filters/sorts in sync"). Sorts: Cost, Might, Time, Region, Name and Newest (`SORTS` in library.js and decks.js);
  filters: faction, kind, Spark, Might, era, home region and keyword (`groups()` in library.js, `paintGroups` in
  decks.js). Only what belongs to one screen is its own: the Library's "In your collection", the builder's "In the deck"
  and "Legacy Lines with this deck". A new sort or filter goes into both.
- **The collection** (Tim, 2026-11-13: "the starter pack should have 20 different cards + 8 domains, same with the guide
  packs that each have 8 domains"; extra copies of a card are never awarded: you uncover a card or a finish, never
  multiples) is `games/anoria/coll.js` (`AnoriaColl`), the one place its rules live, saved in `anoria_coll` and
  `anoria_decks`, which follow the account. `scripts/anoria/pacing.js` plays those same rules and checks them: a change
  to the economy is made there and re-run (`pacing.txt` has the numbers).
  - **The sets** are in cards.js (`BASE`, `GSET` by Guide, `DSET` for their Domains, between the `==SETS==` markers):
    the base set, 20 different cards and 8 Domains that every company has, and a set of 20 different cards and 8
    Domains for each of the twelve Guides. A new player chooses one of all twelve Guides and has the base set and that
    Guide's set. No card is in two sets (13 sets of 20 take 260 of the 266 cards); the 75 Domains fill 104 places, so
    some Guides share Domains. **The cards in no set are found only in packs** (`POOL`): a card added to the game later
    joins them by itself. A Guide's Domain you already have gives nothing extra.
  - **A Guide's deck is the base set and that Guide's set, one of each card** (`guideDeck`), with that Guide's own
    stack, the 15 of its 16 Domains that suit it best (`guideStack`; the computer plays these too). Tim's rule for
    choosing the sets: "the base 20 plus each Guide's 20 must make a balanced 40-card deck, true to the Guide's world and
    faction". `node scripts/anoria/sets.js` plays every Guide's deck against every other (`sets.txt`): 4.8 points apart
    with each deck's own robot, against 9.6 for the five ready decks of before. A changed set is measured again
    (`SWAP='a:b'` tries two cards changing places first). Sor Juana's deck won only 42.4% under the plain Normal robot,
    so Dante went to her writers and scholars and Scott Joplin to Shakespeare's composers (2026-11-13): 46.2% and
    48.0% after, the Normal spread 13.8 points down to 9.2. The Relic powers of 2026-11-13 took Sor Juana to 45.0 and Leonardo to 49.2 (Tim: "tweak sor juana and
    leonardo to balance"): Rabindranath Tagore took Christopher Wren's place and the Stick Chart the Inca Rope Bridge's in
    hers, and Captain Cook the Voyaging Canoe's in his (the three that left are found only in packs): 48.3 and 50.4, the
    spread 8.5 points down to 6.5 (relics-2026-11-13b.txt).
  - **The sphere** (`SIGNS` 12): a finished game lights 1 sign, a win 2 and your first win of the day 3 (`LIGHT`),
    however the game is played ("a game earns the same however it's played", Tim). A full turn gives a pack of `PACK`
    (5), and on the turns in `GUIDE_TURNS` you choose which Guide you don't have joins you (Tim, 2026-11-14), and
    they come with their set. Until you choose, the choice waits in `anoria_coll` as `pick` (`Coll.pending()`,
    `Coll.join(g)`): the setup asks once a visit, the sphere's screen and the results card offer it, and a calling
    still brings its own Guide. pacing.js chooses at random (the same pace: all twelve on day 29).
  - **A new Guide's moment** (Tim, 2026-11-14: "new guide moment? yes definitely"): a Guide who joins in a finished
    game arrives before the results card (`AnoriaPacks.arrive`, `arrival()` in packs.js): their card rises in the
    light, then the name, the power and, for a calling, the calling under its label; their set is dealt from the card
    onto their own play mat, the 20 cards fanned and the Domains under them, counted as they land, with the mat's name.
    A tap finishes the dealing. The sphere's choice (`chooser()`, shared with the first choice of a Guide) comes first.
    Two Guides come one after the other, a lesson never has one, and the results card keeps the Guide's row while its
    button leaves out Guides already met.
  - **Callings** (`CALLS`): each Guide has one, something done in games that brings that Guide sooner ("Win 20 games in
    which you were behind when a round ended"). The table counts what a game did with `track()` (ui.js `callTrack`,
    from the engine's events, for the first player, whoever holds the device) and `gameOver` adds it up. How often each
    happens is `scripts/anoria/calls.js` (`calls.txt`); each need is set for about 30 games of its
    measure (Tim, 2026-11-16: "the arvela thresholds for guides seem lofty", then "about 30 games"; they had been about
    80 games each, the sphere's own pace, so a calling hardly brought a Guide sooner). A move taken back is taken out of the count too (the undo snapshot keeps `G.cl` as `cl0`),
    so playing a card and taking it back again and again does not meet a calling.
  - **Packs**: every slot is a card you don't have or a finish you don't have, the finish rolled first (`ED_ODDS`), the
    card weighted by its tier (`TIER_W`); packs draw the cards of Guides who haven't joined you too, and never hold a
    Domain. Two welcome packs come with the first Guide (`WELCOME`), and four firsts give a pack each (`FIRSTS`: your
    first win, against Normal, against Hard, with a deck you built).
  - Pace at 3 games a day (pacing.txt; Tim: "same pace is fine"): Guides join on turns 1, 2, 4, 6, 9, 12, 15, 18, 21,
    24 and 27 of the sphere, and with the callings at about 30 games (about 7 of the 11 come that way) all twelve are
    with you in about 12 days (it was 29 with callings at the sphere's pace). Since the 68 cards of 2026-11-13, 74 cards are found only in packs, and every card
    takes about 40 days (middle 39, slowest tenth 43); every finish of every card about 630 days. **Packs stay at 5**
    (Tim, 2026-11-13: "packs of 5 is still fine"; packs of 3 would make every card take about 76 days, against the design's
    68, and pacing.txt keeps that run for comparison).
  - **v 6 is a clean start** (Tim: "you can wipe any existing collections and start over too. i'm the only one that's
    played so far"): an older `anoria_coll` or `anoria_decks` becomes the first run, and a game in progress finishes and
    earns nothing (`G.cv`). Nothing of the old economy is left: no copies, no ready decks to unlock, no wins counted
    for Guides.
  - **The sphere's screen** (`path()` in rewards.js; Tim, 2026-11-16: first "no styling and there's no explanation for
    what we mean by when the sphere comes around", then of a long explanation "too many words ... and also doesn't say
    why they're lit"): no word says the sphere "comes round" or "turns" (Tim, the same day: "instead of ambiguous like 'the sphere comes round', how about just like the sphere up for a pack"): you light the sphere for a pack, here, on the results card, in the rules and the lessons. The screen is the sphere and its count ("0 of 12 lit"), then pictures, not sentences, each under the
    one line it is about (a line on its own above them "didn't seem connected"): "Your games light the signs" over three
    stone tiles for what lights how many signs (A game, A win, First win today), and "Light all twelve for a pack"
    heading a panel of the times ahead as a step each with the pack and, on the last, the
    Guide's flag, and a key under them (5 cards, A new Guide). Then a pack for each first and the callings.
  - The screens: `packs.js` (choosing one of the twelve Guides, the first deck forming, packs where a new finish lands
    on top of the card as you had it, a Guide joining with their set), `library.js`, `decks.js`, and `rewards.js`
    (`AnoriaRewards`: the sphere, its screen with the callings, the collection's rings, and the results card's panel
    in Kit.win's `show` slot), each in the shared frame `AnoriaUI.screen()`. The results card's panel lights this
    game's signs from where the sphere stood, flashes as it comes round and starts the ring again, and has a row for
    everything the game earned: each Guide who joined, each first's pack, and the calling nearest its end. Where the
    next Guide is said in words, every screen uses `sphere().guideSay` (coll.js), never a count of "turns". Sideways,
    the choice of Guide puts the twelve beside the chosen Guide's set and power, and the first deck forming puts the
    two sets at the left and the deck, its Domains and the way on at the right, so nothing needs scrolling to reach
    the start button.
- **A deck is 40 cards and can hold no more than two of a card** (`DECK`, `CAP` in coll.js): any card you have can go in
  a deck twice at once. The five ready decks of before (`ARCH`, `STACKS`, `GROWN` in cards.js) stay only for the balance
  scripts, the lessons and games saved with them; no player plays one.
- **No fictional, mythological or legendary characters for now** (Tim, 2026-11-11: first the new printing, then "pull
  the six legend cards from the first printing too", then "pull the trojan horse too"). Nine cards left the set and a
  real, well-attested person (for the Deed, a real event) has each one's slot, with the same faction, cost, Might and
  skills, in the same ready decks: Scheherazade to Harun al-Rashid, Anansi to Yaa Asantewaa, Atalanta to Artemisia of
  Caria, Daedalus to Bessie Coleman (first to Amelia Earhart, until the hundred-year rule below), Odysseus to Ferdinand Magellan, Beowulf to Alfred the Great, the Trojan Horse to
  Night Crossing (Washington on the Delaware), Sinbad to Zhang Qian and Gilgamesh to Sargon of Akkad. A new card is
  a real person with a record to point to, and its power is true to that person.
- **Legends of Lore** (Tim, 2026-11-13: "are there any fictional characters in the decks at this point? they should be
  held out for a future legends of lore set", then "hold tomoe gozen and hiawatha for the legends of lore set but keep
  sun tzu and homer in"). A person known only from an epic, a saga or oral tradition, with no record from their own
  time, waits for that set: in `RETIRED` with `lore: 1`. Tomoe Gozen (only in The Tale of the Heike) has her slot taken
  by Minamoto no Yoshitsune (Ichi-no-Tani, 1184), and Hiawatha (Haudenosaunee tradition) by Canasatego (the
  Lancaster treaty, 1744); both are painted (2026-11-13; the batch's notes are in the session scratchpad's `lore-art/`). Homer and Sun Tzu stay,
  though scholars debate both. A collection that held a held card holds the card in its slot (`load` and `myDecks` in
  coll.js). The lessons use Arminius where Tomoe Gozen stood. A new card is checked against this too.
- **A card that leaves the set goes into `RETIRED`** (cards.js, with `to`: the card that has its slot; its words go
  into `RETIRED` in text.js and its link sentences into `OLD_LINKS`; its picture stays in art/). Then nobody loses
  anything and nothing shows blank: (since the clean start of v 6 no collection holds a retired card; one retired from
  now on is taken out of the set it is in, with the card that has its slot put in its place) no pack, set or Library
  holds a retired card, because they all read the set (`C.CARDS`); a game saved with a
  retired card plays on with it to the end, because the engine and the table look a key up in the set and then in
  `RETIRED`; an old game's history names it the same way (`card()` in hist/anoria.js); and Play again deals from
  today's set (`C.now`). A named Legacy Line that goes with a card is removed, not reused: a finished one keeps its
  flag in the collection under its old id. A Deed's effect belongs to its data, not its name (`fx`, read with
  `E.fxOf`): Night Crossing runs the Trojan Horse's.
- **Nothing within the past hundred years** (Tim, 2026-11-11: "Martin Luther King and Nelson Mandela are too
  contemporary. Maybe I can get them into a later set, but like we said originally, nothing within the past hundred
  years"). A card's own moment (its year, `y` in cards.js) is 1926 or earlier, and a Guide's too. Twelve cards left
  the set for it: Amelia Earhart (her slot went to Bessie Coleman, who earned her licence in 1921), and from the third
  printing Alan Turing, Jesse Owens, Frida Kahlo, Tenzing Norgay, Martin Luther King, the Discovery of Penicillin, the
  Salt March, the Lincoln Memorial concert, the finding of Lascaux, the Summit of Everest and the Bridge of Spies,
  with the three named Legacy Lines that needed them. Their words, sources and briefs are `heldForLater` in
  set-150.json and their pictures are in `scripts/anoria/held/art/`, for a later set. People whose card is about
  something earlier but who lived on past 1926 (Einstein in 1905, Tesla in 1888, Thorpe in 1912, Amundsen in 1911)
  stay. Mandela and Gandhi leave the Guides and do not become cards. A new card is checked against this first.
- **No one whose name and likeness are aggressively protected** (Tim, the same day: "any figures like Frida Kahlo that
  you think are aggressively protected, you can hold them back as well"). Albert Einstein (licensed and enforced by
  the Hebrew University of Jerusalem) and Jim Thorpe (licensed for his family by an agency) are held with the others.
  Before a modern person goes in, check whether an estate or an agency licenses the name; when in doubt, leave them out.
- **Bessie Coleman is one of the cards after 1900**, so `ERAS` has a seventh era, The Modern World.
- **Editions** (Tim, 2026-11-11: "adapt the card art selection mechanic from lorcana"): every card is printed in five
  finishes that play the same, each rarer than the one before: Matte (the card as it always was), Shiny, Silver foil,
  Gold foil and Rainbow foil (borderless: the picture runs to the edge, the words on a dark panel). The picture is the
  same; an edition is the finish and the frame. The rules are in coll.js (`EDITIONS`, `ED_ODDS`): every card out of a
  pack has an edition; a foil is always one you have not found for that card, and it is the card's for good. Once the
  set is complete the packs go on turning up foils until none are left. Found editions and the one each card is shown
  in are `ed` and `look` in `anoria_coll`. The tilt that lights a foil is asked for on the tap that tears a pack
  (`AnoriaEd.ask`); a yes is remembered, a no is asked again next time, as Lorcana's page does. The looks are
  `games/anoria/editions.css` and the rest `editions.js` (`AnoriaEd`): `cardEl` calls `AnoriaEd.dress`, a card being
  read has the edition button on the picture's lower right, opposite the picture and words button, and its chooser
  shows the five editions of that very card with the ones not found locked. A change shows at once wherever the card
  is drawn (`refresh`: every `.ac[data-card]` and `[data-edk]`). Lessons stay Matte. The light on a foil follows the
  finger, the pointer or the phone's tilt (`--lx`, `--ly`, and `--ls` from `makeFlow` as cards slide by), but only on
  the card in front: **small cards (hand, table, Library) have a still finish, no layers, no filters, nothing moving**,
  so the table doesn't blink. In a pack a card turns over in the edition it was found in, stamped with it; a Gold or
  Rainbow foil stops Turn the rest and has the stage. The art proof (`?art=1`, `&only=key,key`) shows every edition
  at every size. The Library shows each card's editions as a ladder of five under it.
- **Rarity** (the same day: "make more powerful cards more rare to find in packs"): every card has a tier, Common,
  Uncommon, Rare or Legendary, from its power: `node scripts/anoria/rarity.js` plays random decks and ranks the set by
  cost and win rate (less the faction's own), and its lists are pasted into `RARE` in coll.js (`rarity.txt` has the
  table). A pack slot is that much less likely to be a card of a higher tier (`TIER_W`). The tier is printed on a full
  card as a small mark at the foot of its ribbon, in the edition's finish: a dot, a triangle, a four-point star, a
  compass rose. A new set is tiered by running the script again, then `pacing.js`.
- **True to history, no stereotypes** (Tim, 2026-11-10): every power, name, fact and picture is checked against the
  person's or the culture's own record before it goes in. A picture's brief (`art` in text.js) names the period's
  real dress, arms and objects and what to leave out (Cleopatra from her coin portraits, not the film seductress;
  Saladin's straight sword; Anansi as the spider of the Akan stories, a real spider with no face, mask or other
  human feature, his character in his posture and eyes; a Song dynasty water compass). No exoticised
  or comic depictions of a people, no deck or power name that labels one (Harriet Tubman's deck is Pathfinders).
  Legends are captioned as legend. New sets get the same audit before their art is made.
  Art made in the figure's own time and culture is fair inspiration (Hammurabi after his law stele, Ashurbanipal after
  his palace reliefs, a djinn as medieval Arabic and Persian manuscripts drew them, Anansi patterned like Asante
  goldweights), as long as it isn't a caricature. Pictures stay dramatic: accuracy is not a reason to go tame. No two
  cards share a composition (two kings of one region, two commanders on a ship's deck: change the scene).
- **As accurate as the record allows, and still striking, with no two alike** (Tim, 2026-11-11): a picture of a real
  thing follows how it was really built, worn or used, from photographs and a museum or scholarly source where one
  can be read (Nineveh's gate bulls are door jambs: faces out, bodies running back down the passage, about two and
  a half times a man's height). State sizes as a ratio to a person, and choose the viewpoint that makes the true
  arrangement the natural one to draw. Accuracy is never a reason for a dull or repeated composition.
- **One word for a connection: Legacy Line** (Tim, 2026-11-11: of "Thread" and "Legacy line", "legacy line is the one
  i like best"). Players read only "Legacy Line": the line down the side of a card (see below), the plate when
  one is made, the named lines of the collection ("The Road to Zama", in `THREADS`), the rules and lessons. A Figure
  with `insp` is still a "Legacy" Figure, and its card shows that by its Legacy Line alone (no "Legacy of Homer." in
  its text since 2026-11-12). In code the old names stay (`from`,
  `insp`, `threads`). **A Legacy Line is drawn, not described** ("explain through design not words"): on the card
  and under a card being read (below); and over
  a pack's cards (`lineEl` in packs.js: the named line the turned card belongs to, the cards you have found in their
  places and the ones you haven't joined on by a dashed line but hidden). A card that completes a line has its
  moment there and then (`lineMoment`), before the gift at the end of the pack.
- **The sphere is a real object** (Tim, 2026-11-11: "make sure that all rings are realistic and don't follow any impossible
  paths or angles"). The one on the card back (`ui/card-back.webp`) and in the logo is rendered from a three.js model
  built like a real armillary sphere (`scripts/anoria/sphere/`: a meridian on a spindle, a cage of equator, colures,
  ecliptic and tropics riveted where they cross, a sun on the axle), not generated as a picture. Anything new that shows
  the sphere is rendered from that model. **Place cards have their own back**, the same design in oxblood
  (`ui/card-back-place.webp`), so the two kinds of card sort apart on a real table.
- **Pronunciation** (`SAY` in text.js): fine print at the foot of a full card, a plain respelling with the stress in
  capitals, only for names a reader might stumble on. Everyday words and plain English names have none.
- **A card's Legacy Line is printed on it as a line, down the right side of its paper** (Tim, 2026-11-11: the sentence
  at the foot and the words under the card did not say what a line does: "I'd rather it be a graphical representation
  of how this card connects to others, rather than using words", then "maybe legacy line is displayed vertically down
  the right side of the card", "slide the geography dots/maps around underneath to avoid being covered up"). `.ac-ll`
  in `cardEl`: one gold line for each card it grows from, that card's picture at the top and its name down the line;
  lines that are each enough join in a bar; at the foot, what the line gives as the game's marks with the number in
  each (the laurel a line scores; a Legacy Figure's Spark and Might too, on a line of their own when a card has both
  kinds). The paper makes room (`--lc`, `--lg`, `--lh`), the foot is the pronunciation only, and the map behind the
  words stops short of the lines. A Figure's own Legacy is not written in its rules text (Tim, 2026-11-12: "remove
  'Legacy of' text from descriptions (redundant with diagram)"); a card whose only power is its Legacy has no rules
  text, and its paper closes up round the story.
- **Under a card being read, the Legacy Line is one clean scene, and a ? says it in words** (Tim, the same day: the
  first drawing was "jumbled ... make the benefits and connections clear visually without losing information ... maybe
  there's a ? tooltip on items like that which require more explanation"). `lineage()` and `lineScene()` in ui.js: the
  cards it grows from stand IN PLAY on a slab of your side of the board (a Figure as the piece on the map, a Relic in
  its slot, a Place as its tile with one of your pieces at it), the card itself is a card from your hand that comes
  down, and the gold line between them carries the marks. Cards that are each enough stand side by side on one line;
  a second line only where the lines are worth different things (Newton). Then the true sentence, then one row of the
  cards that grow from this card, each a tap away. The round ? opens the rule in whole sentences with this card's own
  names in them (`lineSay`), inside the notes, which scroll so the card stays where it is. At the table, with the
  card in your hand, what is in play on your side now is lit and what is not is a ghost on a dashed slab. The plate
  over a pack's card uses the same scene (`A.lineScene`). A new way to show a line starts from these two.
- **The dot on a card's map is clear of every word** (Tim: "Eratosthenes' dot is under text - careful to be clear of
  all card text"). `dotSpot()` in ui.js lays a copy of the card out off the screen, takes every line of text, the
  shield, the home plate, the ribbon and the Legacy Line as boxes, and stands the dot in the clear place nearest the
  upper right; the map is drawn round that place (`mapSVG(ll, color, at)`), found once for each card and layout.
- **A card's map is drawn far enough back to show a coast you could name** (Tim, 2026-11-14: "coastline doesn't have to
  be more prominent, just zoomed out a bit to make the coast more recognizable"). The map's ink stays as faint as it is
  (Tim, 2026-11-12); only the zoom changed. `mapZoom()` in ui.js: the part of the map the card shows spans 36 degrees
  from side to side (`MAPDEG`; it was about 26), and if the coast in its clear part (outside the words, plates and
  shield, which `dotSpot()` hands it as boxes, `at.tx`) is only a sliver, it tries 30 degrees once (an inland place
  like Mali has its coast clear of the words there) and then draws back a little at a time until it is a shape: 70
  map units of coast, one unbroken stretch 40 long that spreads 30 across (`MAPLEN`, `MAPRUN`, `MAPSPAN`). A speck of
  an island in mid-ocean is drawn at the step that came closest. The map and its dot stay hidden until the faces have
  loaded (`.dotwait`), so a card never shows a map that then moves. The scratchpad's `maps/audit.js` measures every
  card's visible coast (the coast painted in one color, so the words and plates hide it as they do).
  An island's map draws back until a mainland is in view for reference (Tim, the same day, of Tupaia and Kamehameha:
  "islands need to zoom out far enough to see a nearby mainland for reference"): a ring more than `MAPBIG` degrees wide
  or tall counts as a landmass, and `MAPBIGLEN` units of its coast must be in the clear part; a ring is drawn on the
  side of the date line nearer the place (`wrapAt`), so Hawaii's map reaches Asia to its west. Mainland cards meet it
  at once and are unchanged.
- **A number inside a mark is centred by its own ink** (Tim: "the numbers in spark and shield sit too high" on his
  iPhone). Browsers read a font's ascent and descent differently, so a box one line tall puts a digit in a different
  place in each. The rule in ui.css (after `.ac-cost b`) makes the box with a strut as tall as a digit standing on the
  baseline, so it wraps the ink. A new number inside a flame, shield or laurel is added to that rule's list.
- **Drawing faults to look for in every new picture** (all found by Tim): a wrong count (Anansi has exactly eight legs: the
  picture tool can't be trusted to count, so draw several, count each at full size, and pose the thing so every one
  shows), a hand or head out of scale, something held
  that can't be read, a weapon gripped wrongly, broken objects nobody asked for, two statues of a pair facing
  different ways, a web or building that couldn't stand, and two people of one region with the same face and kit
  (give each their own age, build, dress and scene; Sun Tzu is a Bronze Age scholar in robes, not an armoured general).
- **Nothing that could not be built, and everything in true proportion** (Tim, 2026-11-11, of Ibn Khaldun's first
  picture: "an impossible wall with mirrored generated smoke", then "ensure no impossible geometry, like we saw with
  the wall, and be careful with relative sizes of people near each other or interacting with other objects"). Every
  wall, building, ship, bridge, stair, machine and piece of furniture is one solid thing in one perspective that
  could stand; a rope is tied or held at both ends; nothing passes through anything; nothing is mirrored or repeated
  like a stamp (smoke plumes, tents, trees, clouds). People at the same distance are the same size and people farther
  off are smaller; a door, chair, table, tool, weapon, boat, cart or animal is the right size for the person using
  it. Check by measuring head against head, door against person, rider against horse. A brief describes a structure
  as one object seen from one side ("one single flat, sheer wall seen side-on, no second wall, no ledge") and gives
  sizes as ratios. The words are in every prompt's tail and in the checklist: `scripts/anoria/art/README.md`, which
  is the procedure every picture batch follows (with `gen.py`, `art-in.js` and `sync-json.js` beside it).
- **No rows of copies** (Tim, 2026-11-11: the people following Gandhi "look too uniform and procedurally generated"). A
  crowd, column or line of near-identical people behind the subject is a fault, however far away. Draw a few particular
  people instead, each with their own age, build, dress and pose (five marchers and three villagers, four Spartans
  getting ready, three soldiers in the mist), and leave the rest out. A brief says so in words ("only three", "each
  different", "no rows or columns of repeated figures"). A formation that is itself the history (Scipio's lanes at
  Zama, Shaka's horns, the Phalanx) may stay, small and far off.
- **A full card has a plate in each top corner** (the cost at the left, the kind at the right), so a brief asks for the
  head right of centre, about a fifth of the way down, with plain sky or background in both top corners. People and
  animals in one picture are in true proportion (a rider on a small Mongolian horse is still much smaller than the horse).
- **A card's powers are said in plain, short game words, with no he or she** (Tim, 2026-11-12: "i want a plain speech
  pass on all card actions. power descriptions can skip the pronouns "she has +2 might" -> "has +2 [might shield]" and
  be shorter e.g. "he has +2 Might when he defends" -> "+2 [might shield] when defending". remove "Legacy of" text
  from descriptions (redundant with diagram)"; and of Diogenes the same day, "write rules in more gameplay
  plainspeak"). A power says what happens in what a player sees at the table (Spark, Might, Renown, Seals, your Gate,
  a Domain's power, draw, discard, play, walk, clash): "+2 Might while outnumbered here.", "Can't be moved. +1 Might
  for each round this Figure stays, up to +2.", "When you play this Figure, you gain 1 Spark." (This replaces the
  rule of 2026-11-10 that every power was a whole sentence with "she" or "he" as its subject.) "+N Might" in a card's
  words is drawn as the number and the Might shield (`mightMarks` in `boldKeys`, ui.js; text.js keeps the word, so
  every other reader of the data is unaffected). A fact's two sentences still follow one from the other.
  **A skill word is never left bare on a card** (Tim, 2026-11-12: "guard and steadfast (all powers) should be
  explained like swift and raider"): it is a bold lead-in followed by its short explanation, the same on every card:
  "Steadfast: +2 Might when defending.", "Raider: +2 Might when attacking on the other player's side.", "Guard:
  enemies here must clash with this Figure first.", "Swift: can walk on the turn it's played.", "Scholar: draw a card
  when this Figure is played.", "Voyager: can walk to any Place.", "Inspiring: your other Figures here get +1 Might.",
  "Law: enemy Figures here can't clash.", "Ward: ..." (Pope Leo I's, with the full rule under the card in `GLOSS`).
  `boldKeys` and the reader's glossary key off that form, and check-set.js holds the third printing to it (no bare
  skill word, no "Legacy of", no he or she). Every changed text of the pass is in
  `scripts/anoria/plainspeak-2026-11-12.txt`.
- **"When you play this Figure", not "when he arrives"** (Tim, 2026-11-11: "i keep seeing 'when he arrives' -- does that mean the
  same as 'when this card is played'?"). It does: the power works when the Figure comes onto the map from a hand, by
  its own cost or by a Deed like Night Crossing, and never when it walks. So a card says "When you play this Figure, you gain
  1 Spark", "Scholar: draw a card when this Figure is played", "Swift: can walk on the turn it's played" (2026-11-12:
  no he or she, above), and the rules and lessons say "you play a Figure at your Gate". check-set.js holds a card
  with an `arr` effect to "When you play this Figure". In code the event is still `arrive`.
- **A card's story is three or four lines at most** (Tim, 2026-11-12: "This is a history learning game, but it doesn't
  have to tell the whole story on the card. Generally that text shouldn't go beyond 3 to 4 lines", and when the story
  is what pushes the text box past half the card, "tell the story more concisely or omit a few unimportant details").
  A long story is **said more concisely, not cut down** (Tim, the same day, of Richard the Lionheart cut to one
  sentence: "removing crucial details that make his story unique. When you revise stories don't cut that much out,
  just say it more concisely"): every detail that makes the story that person's own stays (Richard turning back a
  day from Jerusalem, Kepler's planets going faster near the Sun, the football in the Christmas Truce), and the
  words around it get shorter. Only a minor aside may go. Nothing unchecked is added. A new card's story is measured on the card (the scratchpad's
  `hist2/factfit.js` counts the lines and how much of the card the paper takes): no more than four lines, and a
  paper of half the card or less unless the card's own rules or its Legacy Line make it taller.
- **Art proof**: `games/anoria.html?art=1` shows every card at every size it is drawn (full, small, smallest hand
  card, the piece on the map). A new or changed picture is checked there, at every size, before it goes in.
- **Small cards keep their numbers off the picture**: the cost, Might and kind icon stand on a spine in the faction's
  colour down the left (`.ac.mini.sp`), and the picture beside it is shown whole. (Stacked on the picture they hid a
  third of the faces.) A card's `FY` focus also goes with its picture wherever else it is cropped (`artImg`).
- **A small card's name is a title plate** (Tim, 2026-11-11: in the plain book face the names "look like placeholder
  text"): the game's small capitals (`--fellsc`), centred on the paper, over a fine rule with a dot in the faction's
  colour (`.ac.mini .ac-name`). The clash shows its two cards large enough to read and says each name once, on the
  card. The full card keeps its large book-face name with its caption and text.
- **A bunch of cards is read as one strip** (Tim, 2026-11-11: "use the lorcana carousel mechanics to scroll through
  bunches of cards"): `AnoriaUI.browse(keys, {at, counts, title, sub})`, or `openView(key, {list})`. The mechanics are
  Lorcana's coverflow (`makeFlow` in lorcana-play.html): a float position, the card there facing you and the others
  fanned away, every card following the finger, a flick carrying on with momentum, thumbnails of the whole bunch,
  and the front card's notes changing when it comes to rest. Used for a deck's cards, your hand in a game, a pack's
  turned cards, the Library and the deck builder's shelf. A grid in a stock sheet is not how cards are shown.
  The strip's mechanics are `AnoriaUI.makeFlow` (ui.js), which `browse` and the packs both use.
  **What keeps it smooth** (Tim, 2026-11-13: "it doesn't feel smooth and responsive to scrub through"; measured with
  the CPU slowed 4x for the iPad mini, the slower device, and 2x for the phone: the scratchpad's `cf/perf.js`): an
  input event only moves `pos`, and the cards are moved once a frame in requestAnimationFrame (writing to the page
  inside a pointermove made the kit's touchmove guard and the foil light work out every style at once, 20 ms a move);
  a frame writes only transform, opacity and z-index, and only when they change; the shade over a card is its own
  layer (`.vf-dim`, opacity set), and no custom property is set on a card's root while it moves (a custom property is
  inherited, so setting one recalculated all 300 elements of every card each frame): a foil's `--ls`, and the light's
  `--lx` and `--ly` from editions.js, go only on the few elements the light falls on (`AnoriaEd.lights`), and a pack's
  `--dim` only on its small leaves (`o.dimVar`); `.vf-c` has `will-change: transform, opacity` but a tumbling pack card
  only `transform` (opacity would flatten it, and its face would never show); only cards on the
  screen are in the page, the ones that leave are kept made, and the neighbors of the card at rest are made ahead
  while nothing moves; `o.rest` (the notes) runs after the frame where the strip stops. A change to the strip keeps
  all of these, and is measured again with that script.
  **Nothing that moves with the strip carries a live filter, and nothing on a card is drawn again while it moves**
  (Tim, 2026-11-16, opening a pack on his iPhone: "it's still not as smooth as I'd expect"; his recording showed the
  screen changing only every 2 to 5 frames while the strip moved, and every frame once it rested; measured with the
  scratchpad's `pk/bench.js`, which opens a pack of five with two foils, tumbles each card in, then swipes and flicks
  over the turned cards, and `pk/layers.js`, which lists every layer and why it is one). A phone works out a filter
  on a layer again on every frame that layer moves. So: the small picture standing in under a full one (`standIn`, a
  canvas with a blur) goes once the full picture is decoded, in the page and drawn (`letGo` in ui.js); it had stayed
  under every full card for good, a blurred layer under each card, and the picture over it a layer too. A pack card's
  landing glow (`.pk-glow`, a blur) is put away once its animation ends (`.gone`), since an animation that holds its
  last frame keeps its layer. The tumbling card's shadow is a picture of the same blur drawn once on a canvas for the
  strip's card size (`shadowPic` in packs.js, `.pk-sh.pic`; it matches the filter within one level of 255). The light
  coming up on a new card (`.lit`) fades in a brighter copy of the pool (`.pk-field::after`) instead of animating
  `filter: brightness` over it. Whatever changes every frame on a card is a layer of its own (`will-change: opacity`
  on the tumble's shade `.pk-dim` and the edition stamp `.pk-ed`), so the card's face under it is not painted again.
  The foil light is set only on what that edition lights (`LIT` in editions.js), and a Rainbow foil's frame is a leaf of
  its own (`.ed-fx.r`) rather than the card's `::after`, so the light moving never recalculates the whole card. Where a
  thumbnail sits is read at the start of the next frame, never after the cards have been moved. Together these took a
  turned pack from 78 layers to 47 (and none with a filter), with the compositor's time per frame about halved; a new
  effect on a pack or a strip is checked with those two scripts before it goes in.
- **A card being read can be turned over to its picture** (Tim, 2026-11-11): the round button on the picture's lower
  left (`tg` in `cardEl`, on by default in `openView`, `browse` and a pack's strip; not in lessons). The picture then
  takes 80% of the card, the same on every card, and a strip at the foot keeps the essentials: name, a Figure's Might
  and what the card does in one line (`briefOf`: its own words if they are short, or just its skill words); cost and
  kind stay at the top. The choice is a class on the page (`an-artview`), remembered in `anoria_artview`.
- **A pack's cards come out on that strip, face down, and each one turns over as it reaches the front** (Tim,
  2026-11-11: "use card carousel for pack openings too with cards flipping as they scroll in first time they're
  revealed"). `torn()` in packs.js: a swipe, a flick, a thumbnail, the arrow keys and Turn the rest (a riffle to the
  last card) all just move the strip, and `front()` turns whatever arrives. New is stamped on the card; upright and
  on an iPad the card is large enough to read, so the plate over it says only a Thread the card has to one of yours.
- **A pack's card tumbles over as it comes to the front** (Tim, 2026-11-11: "the front edge kind of stopping and the
  far edge flipping up and over the top in a 3-D animation"). A face-down card waits one slot short of the front with
  its leading edge on the front slot's edge; as the strip brings it in that edge stays where it is and the rest of the
  card comes up toward you and over it, back until it is edge-on, face after, and lands face up in the slot (`tumble()`
  and `land()` in packs.js, through `makeFlow`'s `pose` option; the card has thickness, an edge and a shadow that
  tightens, and it presses into the table as it lands). The turn follows the strip: under a finger the card comes over
  as far as the finger has gone, and one let go short of half way (where it is edge-on) goes back down unseen. A card
  is counted, stamped and announced when it lands, with the sound and the haptic. A card already turned never tumbles
  again. A calm screen gets a plain cross-fade in place. A foil's moment comes after its landing, not instead of it.
- **Pictures are ready before they are needed** (Tim: "some of the art flashes into place after briefly seeing a
  placeholder"). `AnoriaUI.warm(keys)` fetches and decodes full-size pictures a few at a time: a pack warms all its
  cards the moment it is torn and holds its first card until that picture is ready (2.6 s at most), a strip warms
  the cards either side of the front one, the table warms your hand. The small pictures of the whole set are warmed
  once the page is idle. A full card whose picture is not ready shows the small one, softened (`standIn`), and the
  full one comes up over it (`comeUp`): never a flat panel that a picture pops into, unless there is no picture at all.
  The plate over a pack's cards keeps room for whatever it will say (`reserve()`), so the cards don't move as it
  changes, and the glow as a card lands stays round the card: the wash over the screen is for Gold and Rainbow foils.
- **A Legacy Line over a pack's card is drawn** (Tim: "why does Hammurabi have an extra line at top when none of the
  other cards do?"): under the words Legacy Line, the card the line runs from and the card it runs to as named
  medallions joined by the gold line, with what it is worth on the line as the game's marks, then the true sentence
  (`linkEl` in packs.js, the reader's `.ln` block made small). A card with no line shows nothing there.
- **A card that changes a clash is shown as that card** (Tim, 2026-11-11: "Phalanx +2" as a line of small print):
  Phalanx slides in from the outer edge and tucks under the Figure it helps, its name plate showing with the Might
  it adds, and the shields count it as it lands (`aid()` in `clashShow`: before the dice for the attacker, after
  them for the defender it saves). Anything else that joins a clash later comes in the same way, not as a note.
- **A picture's subject stays in view.** A full card's picture window ends where its paper begins and shows about
  half the picture's height; `FY` in text.js says which part each card keeps (0 the top, 100 the bottom). A new or
  redrawn picture is checked on the card, full size and small, before it goes in: nothing it is about behind the
  text, and no face in the top left corner, where a small card's cost and Might sit. Briefs ask for the subject in
  the upper half, away from that corner. People in one picture share one scale (a king is not drawn as a giant among his
  subjects), and where nobody knows a face, age and build come from the record (Hammurabi old when he gave his laws).
- **Nothing on Anoria's page uses the site's stock pop-up look.** The story of a link is `story()`'s own plate
  (`.an-story`: the two cards joined by a gold thread, top of the screen upright, over the map sideways, never over
  the hand or buttons), and `Kit.toast` is reskinned in ui.css. New messages follow suit.
  A Thread or a Legacy line is announced only by that plate (its kind, the Renown it scored and the true sentence),
  in lessons too; `Kit.callout` (Bounty, a Seal breaking) is reskinned in ui.css in the game's small capitals.
- **Nothing on the table blinks** (Tim, 2026-11-11: "lots of animation flashing throughout gameplay"). The table is
  rebuilt whole on every step, so: `render()` opens a pass in which `artImg` hands back the same `<img>` elements as
  last time (a new one is blank for a frame or more); a card drawn outside a redraw (in flight, in a clash, shown
  large) is painted at once from a loaded picture (`now`); `layout()` sizes the hand before it measures the map
  (the other way round, every card drawn flattened the board for a moment); and a lesson's caption that has to move
  comes up in its new place, it does not slide across the table. Check with the scratchpad's `gd/film.js` (films a
  game) and `gd/blink.js` (lists anything that changes and changes back within a few frames).
- **A chosen card is lit where it lies, never raised** (Tim, 2026-11-16: "highlight but don't raise the card"; raised, a
  hand card covered the caption over the hand): `.hc.sel`, `.fp.sel`, `.fp.card.sel` and `.stk.sel` in ui.css keep their
  place and take a bronze ring and glow.
- **The two-player table is the battle line** (A3, Tim, 2026-11-13: "in the battle line layout, try putting my mat on
  the left side, opponent's on the right and moving the opponent's scorebar to the right corner as well ... i still
  wanted the domains horizontal. switching the mat layout would better denote which gate/outpost belongs to whom",
  then "yes" to build it). On an iPad and any screen wider than tall (`layMode` in ui.js; the felt's class `bl`) the
  five Domains lie in a row across the table: your Gate at the far left, your Outpost, the Crossroads, their Outpost,
  their Gate at the far right (`rowsOrder`). Your mat covers the left half and theirs the right, meeting in a seam down
  the Crossroads, so each Gate and Outpost lies on its owner's cloth. Their Figures stand above the line and yours
  below it, as the cards themselves (`figEl(f, T, true)`: the mini card with its Might as it stands now, an edge in its
  player's colour and a tab on the side facing the line), in piles side by side or overlapping (`piles()`); there are
  no empty slots. The Might totals stand on shields at the middle of each tile's top and bottom edge, theirs above and
  yours below, the one ahead glowing; so the holder's flag hangs at the tile's top right and whose Domain it is (the
  avatar, with the pieces its power uses either side) sits on the bottom edge at the left. Their bar (Guide, Renown,
  Seals, Relics, hand, Spark) rides the top right corner of their mat, yours the bottom left of yours, each one line;
  the bands of cards start below the one and end above the other (`layoutLine`). The dock along the bottom holds the
  round track, your hand in one row of whole cards (kept at the size of eight, so the table never jumps; more overlap
  like a held hand), the caption and the button for the turn (`.an-go`: End turn, Next, Roll the dice, Hand over).
  **A card overlapped by the next one keeps its name where it shows** (the iPad re-audit of 2026-11-14: the next card
  lay over the end of every name, "Archimede", "Lei Erik"): in a pile at a Domain and in a hand of more than eight,
  the card farther right lies over the one at its left, so what shows is its spine with its cost and Might, and
  `coverNames` (ui.js) moves the name to the left of the card for a little overlap, or prints it down the edge of the
  part that shows, as on a book's spine (`.cv-v`), for more; a row reads alike (one spine, all spines). A new place
  where cards overlap side by side goes through it.
  Upright on an iPad (`up`) the cards overlap down the table in cascades, every name showing (each card its own layer:
  the marks of the card underneath never come up through the one over it); sideways on a phone
  (`short`) each side's cards at a Domain are one stack (`stackEl`: its top card, how many, a tap reads them in the
  scan) and the two bars stand on end at the table's two ends, yours at the left; the game bar slims to its buttons
  there (`html.an-low`: the kit keeps iOS's top edge clear, so it folds no further). A phone held upright (`rw`) keeps
  the line on its end, their Gate at the top on their mat and yours at the bottom on yours, their cards to the left of
  each Domain and yours to the right, the two bars as thin strips at the top and above the dock; a Figure there is
  about 50 px wide, so it shows its Might at the top of its spine at a small hand card's size, and not its cost, which
  is paid. Names on the iPad's board cards are 11px or more. **Nothing on the table reads under 8px** (2026-11-14):
  tile names and powers, the round track, small cards' numbers, and the 3 to 6 player plates, stacks and totals have
  floors. A board card's name is 8px or more (a covered card's name moved by `coverNames` too: one that can't fit at
  8px shows its picture and Might, and a hold reads it), and a small card, piece or stack whose picture is still
  loading shows the initial in a ring, not the name. When no size fits every tile's name and rule, the rules
  go (a tap reads them) and the names take the largest size that fits (`fitTiles`). **A 320-wide phone held upright**
  (audit, 2026-11-14): a board card under 40px wide is its picture and its Might on a shield, 9px or more (`.mini` from
  `layoutMap`; its name and cost were 3 to 4px); the tiles are a third of the map wide; the hand is one row of cards the
  size of five across the full width, overlapping like a held hand when more are held, clear of the corners.
  Everything is worked out from the window each time the table is drawn, and a turn of
  the device redraws it. This is how the table meets the Landscape rule: the taps go to the line itself and to the
  hand and button in the dock under it, so the line runs the full width. (The 3 to 6 player table, `drawN`, keeps its
  own layout on phones; on an iPad held sideways it is the battle line too: below.)
- **Play mats** (Tim, 2026-11-11: "adapt the same player mat mechanic from lorcana such that they but up against each
  other under the cards played at the crossroads and each player gets their own stylized game mat"). Each player's side
  of the map (their Gate, their Outpost, their half of the Crossroads) lies on a mat of their own: two `.an-pm` in
  `.an-mats`, which takes the map's place in the table under it. On the battle line yours lies under the left half and
  theirs under the right, meeting in a seam down the Crossroads, two bound and stitched edges side by side; on a phone
  held upright theirs is the top half and yours the bottom. In pass and play the other player's mat is turned to face
  them; against the computer it stays upright. A player's mat is their Guide's, unless they chose another in **Play
  mats** in the game's menu (`matPicker` in ui.js, in the shared frame `AnoriaUI.screen()`): another Guide's, the
  chart, or one made from a card's picture and placed by hand (see "Play mats made from a picture"). The choice is
  `anoria_mat`, and the second person's choice in pass and play stays with that game (`G.players[1].mat`). The
  computer's mat is always its Guide's. Lessons play on their two Guides' mats.
  The pictures are `games/anoria/ui/mats/<guide>.webp` (1344 x 576, made like the card pictures): printed cloth in the
  cards' inked style, true to the Guide's own world, dark and close in tone, with no people, no faces and no lettering.
  The Place tiles cover the middle third, so what is worth seeing sits left and right of it. **A mat for a new Guide is
  one line in `MATS` (ui.js) and its picture**; until a Guide has one, that Guide plays on the chart of Anoria in their
  faction's colour. All twelve Guides have one (the roster of twelve's seven, 2026-11-12, with their sources in the comment over `MATS`; resting on memory there: Wu's flower rosette and Timbuktu's toron beams, which no text that could be read mentions). The mats of Guides who left stay in `MATS` for saved games, and the picker offers only today's Guides' mats and the chart. **What a mat draws is checked against a text that can be read** (archive.org
  full texts are reachable, and archive.org's full-text search finds the passage; most museum sites are not): the
  comment over `MATS` names the source for each. Checked on 2026-11-12, for today's Guides: the marsh and pines
  (Tubman), Leonardo's water and red paper, the wave scroll (Cleopatra), the two cords of a bamboo book (Sun Tzu),
  the Curies' instruments, the acorn border (Shakespeare), Saladin's pulpit, the phoenix as Wu's emblem and the forked
  end of Joan's standard (how it has been drawn since; her own words give no shape). **Two mats were redrawn for it**:
  Curie's, whose radium glowed green (Eve Curie saw "phosphorescent bluish outlines"; green is later radium paint) and
  whose quartz balance had its weighing pan standing on the base, so it could not have worked (the pan now hangs from
  the quartz, beside a Curie electrometer and a two-plate ionization chamber, the set-up her own book names); and
  Leonardo's, whose water was breaking waves with clawed foam crests like a Japanese print (it is now his own kind of
  study, a stream falling into a pool and curling into eddies "like hair", as he wrote). Both were repainted only where
  they were wrong (an image edit with a mask), so the rest of each mat is as it was. Still resting on memory: Leonardo's
  wing and plant studies, and for the Guides who left (not checked: their mats are only for saved games) the colours
  and figures of Thembu beadwork and the aloes (Mandela), the shape of the Vijapur spinning wheel (Gandhi), the zigzag
  fence and the bunting (Lincoln), how the nine-tailed standard was made (Genghis Khan), and the sage and fern leaves,
  the press and the Leyden jar (Franklin). The picture tool
  cannot count: Genghis Khan's standard came out with eight tails every time, and the ninth was put in by hand. The mats are built once and stay with their players (`paintMats`): no step of the game redraws
  them, and in pass and play they change places with the board at the hand-over. A new mat is checked on the table
  under pieces of both players' colours, at every size, before it goes in.
- **Looking through the table's cards** (Tim, 2026-11-11: "the eye icon to view cards is not a great mechanism for
  seeing the cards closer. tap and hold is one. carousel on each domain with a swipe up and down to my cards at each
  domain down to my hand (with a side map to represent which group/level of cards im scanning through might help.)
  and need to include ways to act on cards as I scan through them in the carousel"). `scan({u} | {p} | {h})` in ui.js:
  a hold on any card on the table (`holdToScan`; a right click with a mouse), or a tap wherever a tap used to open one
  card, opens the table's cards in levels, top to bottom as the table lies: the other player's Guide and Relics, the five
  Places, your hand, and your Guide and Relics last (Tim, 2026-11-16: "put guide below hand"). Sideways is the strip (`makeFlow`, a fresh one for each level);
  up and down is a swipe, the wheel, the arrow keys or a tap on the map at the left. **What the other player has is
  in view at every level** (Tim, the next day: "it's also good to know what opponents have at each level too"): a
  Place's level opens on the Place's own card with the other player's Figures to its left and yours to its right, as
  they lie on the table; each thumbnail is ringed in its player's colour, and the line under the Place's name says
  whose card is in front, in that colour. The map is the table made small: on each Place a dot for each Figure and
  the Might they have there, the other player's at the top left and yours at the bottom right; each Guide in a ring
  of its player's colour with brass diamonds for Relics, and the other player's hand as a card's back with the count.
  A tap on a Guide or a Relic on a player's strip opens that level. **The caption has no eye button** (Tim: "remove
  the eye icon if its function is covered elsewhere"): a hold on the card does that. The computer does not move while
  cards are being read. Lessons keep the plain single-card reader (`openView`).
  **The road under the card** (Tim approved the plan on 2026-11-13: "keep going with face off, carousel and the rest";
  it replaced a stack of buttons that pushed the notes off the screen). Under the card in front lie the table's
  Domains as small tiles in the order they lie on the table (`roadOf`, `paintRoad`, `miniTile` in ui.js), always in
  the same place, so the card and its notes never move. The tiles the card can go to are lit, each with both totals
  on Might shields (yours as the move would leave it) and what the move does on a pill under it: Play, Take it, Walk,
  Jump, Step; a tap there makes the move (two kinds of move to one place, a walk and a Jump, ask which in a sheet).
  The Domain a Figure stands on says Here. On the line under the road: a Figure's clashes as chips with the two
  Mights ("3 vs 5"), the Qhapaq Ñan's change of places, a Deed's chosen Figure or player (Canossa, Encore, the
  Columbian Exchange with more players), a Domain's own power (Florence's loan, Timbuktu's card, Carthage's hire), a
  Relic's or a target-free Deed's Play, Discard over the hand limit, and Choose on the table for a card that needs two
  things chosen (Breda, Fair Winds, Night Crossing). A card that can't be played dims the road, and a plate on the card
  says why: its cost on a Spark flame against "You have 5 Spark.", or the reason as a sentence (`lockPlate`, the
  reasons from `scanActs`). Every move is checked against the legal moves again when it is tapped (`reAct`,
  `runActs`). A new kind of move gets its place in `roadOf`.
  **The face-off** (the same day; redrawn 2026-11-16 when Tim, upright on his iPhone, found "unpolished fonts,
  misaligned numbers and generally a confusing page to be dropped into"): a Domain's level is not a strip but the two
  sides facing each other across the Domain (`faceOffEl`, `fitFaceOff`), on the two players' mats, which meet in a seam
  under the Domain's middle (`--seam`). Sideways the other player's Figures stand to the left of the Domain and yours
  to the right; upright theirs are above and yours below. The head is the Domain's name in Geist and under it, quiet,
  whose it is with a dot in the owner's color, at the panel's left edge and clear of the close button. **A side with
  nobody there is a slim band** (an empty dashed slot in that player's color and "Jamie has no Figures here."; its
  track is `min-content`), and a side with Figures shares the room left, its cards the largest at which everything
  fits, the same size on both sides. **With nobody there at all the Domain is the hero**: large, its picture taking the
  spare height, with its whole power on its plate (`data-long`, text.js `DRULE`); where the middle is short of room the
  tile shows the power's few words (`DSHORT`) and then gets smaller. Under the tile the two totals hang from the ends
  of a balance, each a Might shield with whose total it is named under it in that player's color: the holder's is lit
  and its end sinks (the beam tips 4 degrees and the shields move with its ends, `--bdy`), the other's is gray, and with
  nobody holding both are alike and level; the digit is centered by its ink (the strut rule after `.ac-cost b`, and
  placed where the card's own Might shield puts it). Then the sentence (`holdSay`, through `DW`) as a wall label, the
  condition first: "With no Figures here, Jamie holds Machu Picchu because it is their own Gate, and scores 1 Renown when
  the round ends.", "With the Might tied at 3, you hold ... because you laid it and have a Figure here, ...", "You hold
  Jamie's Gate, so when the round ends you score 1 Renown and one of Jamie's Seals breaks.", Tordesillas's tie, or
  nobody. Under each of your Figures: Clash ("3 vs 5" with one enemy there; with several, Clash marks each enemy with
  its own chip), a walk chip toward the Domain on either side along the road (brass, with footprints: a move; a card's
  chips stay in its own column, at least wide enough for a Domain's name; `sq`/`sq2` make them smaller where they
  aren't), and More moves for the rest (the strip with the road). A Domain's power is a button under the sentence.
  **The foot is the road, a pager and never a move** (`.fo-road`): the Domains on either side by name with a chevron, in
  dust, and between them a dot for each Domain in road order, this one lit bronze; a tap on a name or a dot goes there,
  as do a swipe sideways and the arrow keys; up and down still changes level. Too many Figures to fit: the side that
  fits keeps its height and the other scrolls. A tap on a card reads that Domain's cards on the strip, with See both
  sides to come back. A tap or hold on a board card, or a stack on a phone held sideways, opens the face-off at its
  Domain with that card raised in front: on a phone this is how the board's small cards are read. The scratchpad's
  `faceoff/fo.js` shoots every state at the five sizes and measures overlaps, clipping and the digits' centers.
  **The scan's head and your Spark** (Tim, 2026-11-16, of the hand level: "some more overly plain fonts", and "a view
  where i should be able to see how much spark i have left"): at every level the head is the same, the name in Geist a
  clear step up in bone and under it, in dust, what it is (with a dot in its player's color), at the left edge of what
  it heads (`--fol`, clear of the map of levels: `folFit`), and beside the close button your Spark on the flame from
  your bar with "Your Spark" under it (`.sc-spark`, `paintSpark`, gray at 0; hidden for a spectator or a hidden hand).
  A card that costs more says so on its plate with the same flame: its cost on the big flame, then "You have [2]
  Spark." The road's pills, the clash and walk chips, the line under the road and the map's counts are Geist with
  weight, not the plain book face.
  **On an iPad held sideways the strip is laid out as on a phone on its side** (`scanWide`, the view's `.sd`): the card
  large at the left, the road and the notes in a column of their own at the right, so the notes have the screen's
  height (under the road they were cut off). Upright on an iPad the notes keep a fifth of the screen.
  **Drag to play** (the same day): a card from your hand dragged onto the board lights the Domains it can go to and
  dims the rest, and the Domain under your finger shows your total there after the move and what it does ("You take
  it", "You keep it", "Jamie keeps it"); letting go plays it, letting go anywhere else sends it back. A Figure is
  dragged the same way to a Domain to walk, or onto an enemy to clash ("3 vs 5"); a Relic or a Deed with nothing to
  choose is played by letting go over the table (`dragDown`, `dragMove`, `dragEnd`). A drag is the same pick as a tap
  (`select`, `pick`), so tap then tap works as before and the lessons, which play the engine's moves, never meet it.
  It starts at 12 px, after the hold that opens the scan has given up (10 px); the card and Figure carry
  `touch-action: none` so no scroll can take the finger.
  **Beside the table** (the same day; the audit's #6: every way of looking closer covered the table): on an iPad held
  sideways (`sideFits`: wider than tall, 960 wide and 600 tall at least) a card read on its own (`openView`) and the
  turn log open in a panel at the right (`sidePanel`, `sideRead`), and the table steps aside into the room left, still
  in play. A card name tapped in the log opens in the same panel with the way back to the log. Turning the iPad upright
  closes it; a phone and an upright iPad keep the sheets. While the panel is open the dock lays out as an upright
  iPad's (the caption and the button over a hand the table's full width), so the hand keeps its names.
- **The set-up's Domains are a strip** (Tim, 2026-11-16: "this is a group of cards i should be able to flip through with
  the carousel and have actions available to select while reviewing ... context-aware"). `suScan` in ui.js: the four
  Domains you drew on the strip (`makeFlow`), opened by a second tap on one in your hand (a first tap still picks it up
  for tap-then-tap on the board, which the lesson uses) or a hold on any of yours, at that card. Under the card lies the
  set-up's road (`suRoad`): your Gate, your Outpost and the Crossroads in the order they lie on the table, then your
  stack, each a small tile with this Domain laid there, its power struck through and its picture grayed where it would
  do nothing (`suIdle`, E.pw's own exceptions; the board's tiles use it too), what lies there now in a medallion, and the
  pill: Lay, Offer, Under, Swap, Replace or Here, with a small star on a good place (the robots' `E.layScore`, never an
  idle place when another lay avoids it). A tap lays it (`suPut`: a swap, or the one there back to the hand, the last one
  laying itself; `put.under` holds a Domain put under the stack early), the Domain flies down into its tile, the strip
  moves on to the next one in your hand and closes onto the table once three are laid; a laid one has Back into your
  hand. The table is drawn once, as the strip closes. A new kind of set-up action is a place in `SU_PL` (with `suOrder`
  and `suOcc`) or a button on the road's line in `suRoad`.
  **The set-up's flicker** (the same day): every change of the window's size redraws the table, and Safari's bar coming
  and going (a tap near the foot of the screen) moves an iPhone's height across 740, where the hand's layout used to
  switch, so the Domains redrew in the other size and back. The hand's layout reads `tallH()` (the tallest the window has
  been at this width), and the set-up's hand keeps its buttons from one redraw to the next (`suBtns`). A new layout
  choice by height reads `tallH()`, not `innerHeight`.
- **Gallery stone is Arvela's look** (Tim, 2026-11-15: "we're locking in gallery stone as THE winning arvela look"; chosen
  from three rounds of looks laid over the game). A contemporary sculpture gallery after hours: honed charcoal stone, flat
  and matte, no veins and no textures; bone-white words (`--g-bone`), labels in dust (`--g-dust`); and bronze, the one
  warm light (`--g-br`, lit `--g-br-hi`, deep `--g-br-lo`), only for what is yours or happening now: the main button,
  your turn, your score, the chosen thing, and the first seat's color (`--pc0`, `PCOL[0]` in ui.js). The tokens are at
  the top of ui.css (`--g-*`); the old names (`--an-gilt`, `--an-parch`, `--an-navy` and the rest) now hold Gallery
  stone's values. The page is always Gallery stone, whatever the app's theme. The table is a honed slab with one joint
  line round it; the players' bars are raised slabs, whose turn it is a 2px line of their color along the foot; the round
  track a hairline rule of figures with the round now on a bronze tab; a card being read has its notes as a wall label.
  A card's face keeps its own print; only its border is dark stone and its frame line plain bronze.
  **Arvela's logo keeps its own gilt** (Tim: "keep the arvela A logo with armillary/gyroscope"): the mark alone, cut from
  its navy square (`ui/logo-mark.webp`, made from `ui/logo.webp`), with the name set beside it or under it as live text
  in the titling capitals, evenly tracked (Tim, the same day: "check the spacing on the 'ARVELA' word mark"; the letters
  baked into the old picture were unevenly spaced). `logo()` in ui.js draws the lockup (`.an-logo`): the sealed pack,
  the Guide chooser's splash, the story's first scene. The setup's head is the same lockup side by side, the name's line box trimmed to its capitals (`text-box: trim-both cap alphabetic`) so the capitals are centered on the mark, not the line with its room for descenders (Tim, 2026-11-16) ("New games use
  the logo at top only — add the text ... next to the logo"), drawn by ui.css over the kit's hero, small enough that the
  setup still fits upright on a phone and on an iPad (`k-snug` makes it smaller still). The results card has the mark
  small on a joint line between its head and the race; the chooser's head, the ghost of an empty pack and the base
  set's ring show the mark alone. The home screen's tile is the specialty base with the mark drawn on it
  (`game-icons.js`: the A, its ring and finials, the sphere where the A's bar would be).
  **Play mats**: the Guide's own mat, the default and always the computer's, lies under the gallery's low light, drawn
  toward gray with a soft vignette (`data-quiet`, `matQuiet` in ui.js); a mat a player chose in Play mats (another
  Guide's, the chart, or a picture mat with its own cloth and color) is shown as they made it, in pass and play too
  (Tim, the same day: "i like having muted mats by default, but allow players' own mat designs and colors to be used").
  **The pack** is a slab of honed charcoal with a lit top edge, a ground lower face that shows its thickness and a soft
  shadow on the floor; across its head a band of polished bronze (`.pk-bronze`, the seal and where it tears), the
  lockup in the middle, and at its foot under one joint line the pack's name and its count in Jost, the pack's own
  printed face (Tim: the pack's words needed "a better sans serif font so it looks less like the default font"). Torn,
  flakes of bronze fly off the band (`GOLD` in packs.js), the mouth stays lit and light stands up out of it; the pack does
  not slide away but glides (smaller where room is short) to where the cards will be, the cards rise out of its mouth one
  behind the other, each half clear of the pack before it swings across to the strip, and the pack sinks away under the
  first card as it turns (`aim()` and `deal()` in packs.js). The cards come up into a pool of light; when a card new to
  you lands the light comes up on it and the room round it falls dark for a moment (`.lit`, set in `land()`); New is a
  small bronze pill. The tally is two figures set large and light, new cards in bronze, new finishes in bone.
  A new screen on Arvela's page uses the tokens, Geist in sentence case, stone panels with one hairline (`--g-line`),
  and bronze only for the one thing that is yours or now. Anything the hub's Night glass draws over the kit's pieces
  (`:root:not(.ng-x)` rules in kit.css) is met with a rule of the same weight in Arvela's stylesheets.
- **The results card is Arvela's own** (the audit of 2026-11-13, #7.3; redrawn 2026-11-14 when Tim called the old one
  "wildly inelegant and thoughtless in design"): `showWin`/`showWinN`, `winLayout`, `racePic`, `packMini` in ui.js, CSS
  under `.k-win .card.aw` in ui.css, laid out from Kit.win's `show` slot so the card shown again after Look at the table
  is the same. A stone plaque: the winner's Guide in a bronze ring beside the title (the winner in the titling capitals,
  the one other place on the page that is not sentence case) with "Leonardo da Vinci was Tim's Guide" under it; Arvela's
  mark small on a joint line; the race for Renown (a line for each player from `G.tale.tot`, the Renown that wins ruled across); how it
  ended as one sentence; the standings as a ledger with Seals (red wax, broken ones gray and split) and Renown columns,
  the winner's row with a bronze rule at its left. Then the field of bronze (Play again), Kit.win's other buttons as one
  panel of rows with an icon and a chevron (Open your pack shows the real small sealed pack), and Back to games. Upright on a phone the
  buttons are a dock that never leaves the card (the compact layout covers upright screens up to 900 tall, so an
  iPhone's 874 needs no scroll, and at Safari's shorter heights the game above the dock scrolls); from 700 wide it is two columns; a
  phone on its side has three. Kit.win's buttons and their order are unchanged; kit.js is unchanged.
- **Arvela's setup and plaque at a desk** (a window larger than a phone's or a tablet's; Tim, 2026-11-17, of large
  windows: "simply scaling things up is not thoughtful design"; the page says `k-own-desk`, so the kit's own desk
  leaves it alone). Before, the setup was a block in the middle of the window, about 4% of 3024 by 1964. Now it is
  composed for the window by `sdLay` in ui.js (the block "The setup at a desk"; styles at the end of ui.css), in three
  parts beside the kit's own controls. Nothing is scaled: every size is worked out from the window, and a phone and a
  tablet never get here (`sdShape` says null at 402x874, 874x402, 768x1024, 1024x768, 320x568 and in the home sheet's
  frame, and nothing is built).
  - **The rail** is the kit's setup itself (who is playing, each deck's choice, the options, Deal the cards and Play
    online), at the right, where the taps go. Its controls take the kit's gentle step (`--sdc`, 1 to 1.35, still 1 at
    1512 by 982). With height to spare the computer's deck is chosen from faces with their names, what the chosen
    option means stands open, and your own decks stand larger (`an-dk-roomy`, `an-dk-roomy2`); a rail too tall for its
    window draws in before anything scrolls (`an-dk-tight`); in a window from 1240 wide whose one column would run
    past the foot (four seats or more in 1280 by 720, six in 1512 by 982, anything in 1600 by 560) it is two columns,
    the decks and options beside who plays (`an-dk-2c`), and the wall keeps 400px or more at the left.
  - **The wall** (`sdCompany`, `sdWallLay`) is what was chosen, laid out to look at: each person's deck as its Guide's
    own card with the deck's cards as real small cards, Figures by cost, then Relics, then Deeds (they were behind the
    Cards button); two of a card is one card marked x2. A tap reads the deck on the strip at that card (`browse`). The
    computer's deck stands there too once a Guide is chosen for it; a surprise has nothing to show, so its one
    sentence stays under the faces in the rail. The plan takes the largest cards the box allows, to 210px: decks side
    by side (never in slabs under 300px wide) or one over another, the Guide as a card at the left (170px wide at
    least) or a medallion over the cards; from 140px a card says what it does (`cardEl`'s `mid`, `fitMid`), from 75px
    it is the small card with its name, under that its picture in its border (`.sd-grid.th`), and under 36px the deck
    is its Guide, what it is made of and its numbers alone, a short slab, and beside the rail the room takes the
    height those slabs leave. A built deck has its Change button at the head of its slab.
  - **The room** (`sdRoomBuild`, `sdRoomLay`) is what was a tap or two away: the sphere with its signs lit, what the
    next pack needs and `sphere().guideSay`, and what lights how many signs; the packs waiting as the real small
    sealed packs, lit bronze because they are waiting for you (or the Guide the sphere brought, still to be chosen);
    the callings nearest their end; the last game from the history (who led each side, the race for Renown through
    `raceSvg`, how it ended, the numbers side by side) and the games before it under how many were won; for someone
    who has not finished a game, the lessons, a row each (`AnoriaGuide.list`). A panel opens the screen it is about.
    The panels that fit stand side by side; a list gives up its last rows and a panel its least parts (`data-give`)
    rather than have anything cut through.
  - **Three compositions** by the window's shape: `band` (1100 wide and 880 tall, or more): the name and the three
    doors over the wall at the left, the rail at the right, the room the whole width under both; `side` (as wide,
    lower, or a rail too tall to leave the band its room): the wall over a low room at the left, the rail the window's
    height at the right; `stack` (narrower): the name, the rail (two columns from 860 wide), the wall, the room, one
    under another. Where no wall would have cards to show (1100 by 600 and 1026 by 770 with any players; six seats in
    1000 by 1000 or 1180 by 820), the setup is the tablet's, the kit's own head back in place of the desk's
    (`an-dk-bare`), and it may scroll as a tablet's does. A resize lays the same parts out again (a capture listener,
    so the kit's own fold never sees a layout made for the window before), and every choice made stays made; when the
    setup leaves the page, what the desk set on `#app` goes with it (`sdGone`). The kit folds a setup's options once
    and they stay folded, so a window dragged down to a phone's size and back up keeps its options as rows.
  - **An iPad held sideways** (1024 by 768, the one device size that changed): two columns by a media query at the end
    of ui.css (900 to 1024 wide, 521 to 768 tall): the decks and the options at the left; the name, who is playing,
    the three doors and the start buttons at the right. It scrolled by 141px with the start buttons over the
    computer's decks; now nothing scrolls.
  - **The plaque** (`awDesk`, called from `winLayout`; `.k-win .card.aw.dk` in ui.css): from 1400 by 800 it is three
    columns: the game at the left with the race for Renown drawn taller (`racePic(96)`, 124 from 1150 tall, 160 from
    1500), the record of this game in the middle as its history view draws it (the map at the end, the numbers side by
    side, the Legacy Lines with their true sentences; two columns of it from about 1900 wide), and what the game
    earned over the buttons at the right, in Kit.win's order. From 1100 tall and narrower the same parts stand one
    under another, the record scrolling between the game and the buttons. In a low wide window (1100 wide or more,
    under 800 tall) the game, what it earned and the buttons stand side by side, each whole, with no record (`dk-low`;
    the card before it had its rewards cut off at 1600 by 560, and at 1280 by 720 when a Guide joined with three
    packs). Any other window keeps the card as it was (1366 by 1024, 1280 by 800, 1000 by 1000). The record is the one
    `record()` has just filed (`awRec`); a lesson has none. The history view's sizes go through two units of its own,
    `--ahu` and `--ahp` (hist/anoria.js `units`: 1rem and 1px unless set), so the plaque sets the record a step up
    with its own words (`--awc`).
  - **Checking**: the scratchpad's `big/arvela-setup/`: `setup.js <tag> <sizes> [--n=4] [--pnp] [--teams] [--rich]
    [--built] [--cpu=curie] [--hist]` (a screenshot and an audit: scroll, the start button in view, anything off the
    window, cut, under 8px or over another part), `resize.js` (one page through 24 window shapes, the choices kept),
    `taps.js` (what each part opens), `game.js` and `win.js` (a real game played to its end by the engine's own
    choices, then the plaque at each window), `proof.js` with `cmp.sh` (the setup, the plaque, the table and the
    history sheet at Tim's devices, before and after, pixel by pixel; the table's Might shields differ by a few pixels
    from one run to the next in the untouched files too, `proof-noise.txt`). Test hook: `__anoria.sd`.
- **The turn log** (Tim, 2026-11-11: "add a turn log with tappable card names like we have in lorcana"). `logEvs` in
  ui.js turns every event the engine reports into a sentence in `G.log` (kept with the saved game, the last 200): who
  played what where, each clash with its Might and who was knocked out, Legacy Lines, Seals, the count Place by
  Place, and how the game ended. `logScreen()` (the round button at the right of the caption, and Turn log in the
  menu) shows the turns newest first in the shared frame, each in its player's colour, with every card's and Place's
  name a button that reads the card. A new kind of engine event gets its sentence in `logEvs`.
- **The computer's moves come one at a time** (Tim, 2026-11-11: "cpu moves in anoria need to be acknowledged by the
  player by default otherwise it moves too quick"). After each move the computer makes has played out, the table stops
  (`ackWait` in `robotTurn`, ui.js): the caption says what it did in a sentence ("Sprocket played Hatshepsut at Seneca
  Falls.", `moveSaid`), a tap on the caption reads the card, and the player's own button, where End turn is, reads
  Next (Enter and the space bar do the same). It is on unless the player turns off "Computer moves one at a time" in
  the game's menu (`anoria_step` '0'; the menu leaves it out of a game of people only); then the computer plays through
  and the fast-forward button is there as before.
  Lessons and the test hook's `turbo` never wait. A new kind of move gets its sentence in `moveSaid`.
- **Buttons**: every `.btn` on Arvela's page takes one skin from the Buttons section of `ui.css`, and they are flat:
  the main action a plain field of bronze with dark words in Geist; the rest raised stone with one hairline, bone words
  and a stone-gray icon; the way out (`.btn-ghost`) words alone, in dust. No gradients, no lips, no engraved rules, no
  textures. Corners 14px. Pressed, a button sinks 1px and darkens; disabled, it fades, and a main button goes to plain
  stone. A screen sets size and layout only.
- **Type** (Gallery stone, 2026-11-15): Geist for every word around the game, labels included, in sentence case
  (`fonts/arvela-geist.woff2`, the variable font held to Latin); Castoro Titling, an inscriptional capital, only for the
  name beside the mark and the winner on the results card (`arvela-titling.woff2`, `--titling`); Jost for what is
  printed on a pack, its name and its count (`arvela-jost.woff2`, `--pack`). anoria.html preloads all three. The kit's
  pieces on this page (setup, sheets, menus, handoff) take Geist through `--font` and `--display`; the game bar keeps
  the hub's faces. **Card faces keep IM Fell and Crimson Pro**, and so do a Domain's tile and its home plate (they are
  printed: `.ac`, `.pl-tile`, `.dm-home` set `--fell` back), and Alfa Slab stays on the Might, Spark and Renown marks.
  New words go through `--fell`, `--fellsc` or `--disp`, which are all Geist around the game. The history view
  (`hist/anoria.js`) is in the same faces and colors.
- **How to play** is `games/anoria/guide.js` + `guide.css` (`AnoriaGuide`), opened by the bar's ? and the menu (`Kit.init`'s
  `guide` option). The rules on one page are `rulesScreen()` in ui.js (audit 6.4, 2026-11-14), in the shared frame
  `AnoriaUI.screen()`, set like the rule book in a game's box: the story and the goal first, then a button for each
  section, then the sections under small-capitals headings; `Kit.rules` on Anoria's page opens it (the guide's "rules
  on one page"), and the words are still `RULES`. The quick start (shown once, the first time Anoria
  is opened: `anoria_guide`) and the chapters after the story are all **lessons**: a made-up position on the real table,
  played by a script through `AnoriaUI.demo` in ui.js (`G.demo`: never saved or recorded, fixed dice; your own game
  waits in its save and comes back). A lesson is `{id, n, table(), run(L)}`: `L.say` (caption, with `at` rings and
  `tag` names), `L.play/walk/clash/relic/deed` (a finger taps, as a player would), `L.them.*`, `L.count`, `L.later`.
  A rule that changes needs its chapter's script and captions changed with it; `Kit.init`'s `RULES` text too.
- **A lesson's caption says what to look at and why** (Tim, 2026-11-11: "unclear instruction" on "Watch the count",
  "It works both ways", "The card also names its home region"). Each caption rings the thing it is about, names the
  numbers on the screen ("He has 6 Might there and their Figure has 2, so right now you hold their Gate"), and never
  talks about something that isn't in view: Reading a card keeps the card open under the caption
  (`openView(key, {lesson: true, room})`) and rings one part at a time. One idea a caption; split a long one.
- **The story comes before the rules** (Tim, 2026-11-11: the guide went straight into play without the goal or the
  story behind it; then, of the first story: "unimaginative and weak": it must say how the greats share one place and
  time, why they want Renown, why they contest the wonders, and what the Seals are for). **The story**: what the world
  remembers is never quite gone: it lives on in Arvela, the country of memory, where every age stands at once (memory
  keeps no calendar) among the wonders, where the world's memory is strongest. A great sphere turns at its heart (the
  one on every card back); each full turn ends an age, and the world can't carry all it knew into the next. So the
  greats lead companies to keep their people from being forgotten, each player one of them with a Guide. The world
  remembers whoever stands at its wonders, and that is Renown: the first company to 25 is the one the next age
  remembers. A company comes into Anoria through its Gate, held open by three Seals; hold the other company's Gate
  when a round ends and one breaks, and a company with none left is shut out and forgotten. `story()` in guide.js
  tells it in full-screen scenes made from the game's own pictures (`SCENES`, sized by `fitScene`), at the start of
  the quick start and as chapter 1. A lesson can put any scene behind its captions with `L.scene(name)` (the Your
  Guide chapter shows the Guides with their powers; the others join as the sphere turns or their callings are met,
  and each is a new way to play). The rules page opens with the same story. Anything new that
  explains the game starts from the goal and why, then the how, and new cards, powers and screens keep to this story
  (memory, being remembered, the sphere, Gates and Seals).
- **Domains** (Tim, 2026-11-11, decided on the Places prototype in `scripts/anoria/places/`; being built). The card
  that lies at a Gate, an Outpost or the Crossroads is a **Domain**: one word, not Place, wonder or location. Every
  word a player reads says Domain (2026-11-12): the data in text.js and the older strings in ui.js and guide.js keep
  "Place", and `DW()` in ui.js (hist/anoria.js and guide.js call it too) turns it into "Domain" wherever it is shown,
  in card text, the rules, the table, the turn log, the lessons and the game history; a new string a player reads
  says Domain, or goes through `DW`. A Domain has one **kind**, said as part of its name (a
  Commerce, Industry, Thought, Land, Culture, Law or Routes Domain: holding the markets, workshops, schools,
  strongholds, stages, courts and roads of an age is how people held the age, and a kind's rule pays what holding
  that kind of place gave them) and one **home region**, the Figures' own regions; kind and home must both be plain
  from the card's border and plates. Each player brings a **stack of 15 Domains**, no two the same, chosen from a
  collection that can hold more. Set-up: draw four (`suDraw`; three until Tim's choice on 2026-11-12), one to your Gate, one to your Outpost, one under your
  stack, and one offered for
  the Crossroads (on the screen each Domain drawn, and each offer, is the tile it will be on the map, its name and rule
  as large as the room allows: `suHand`, `--ofw` from `layoutLine`/`layoutMap`; audit 4.1, 2026-11-14, the offers were
  small cards with 7px rules; with more players everyone else's offers stay small cards in a stack); each player rolls a die, the higher roll's offer is the Crossroads and the other player takes the
  first turn. The Crossroads' owner wins ties there while they have a Figure there, and nothing more. Domination (a
  win by holding every kind) is left out as too complicated. **The game must translate to a real table**: whose
  Domain each one is (a banner in the player's colour that travels with the card, since cards may swap, reverse or
  shuffle Domains), a marker for a rule that is silenced or changed, and a track for rounds and turns are all drawn
  on the device as the pieces a person would use.
- **The table for 3 to 6 players and teams** (Tim, 2026-11-13: layout C, "your spoke large, the others round the
  rim"; the rules are the engine's, read through `cfg`: `outEnds`, `tmight`, `teams`, `target`). A two-player game is
  drawn exactly as before (`rowEl` rows, `stripEl` strips); `many()` (S.N > 2) switches ui.js to `drawN`: your three
  Domains (Crossroads, Outpost, Gate) are the two-player rows (`rowEl(i, T, {many})`) with everyone else's Figures there
  as stacks on the left (`stackEl`, seat order from your left), and each other spoke is a column on its player's mat
  (`matN`, built once and moved) along the top, a row down the left sideways: a plate (`plateEl`, a strip in small, so
  every `.an-strip.pN` selector finds it), the Gate and Outpost (`rimTile`; a name on every tile where it can be 9px or
  more, all at one size, `nameFs`, and only a tile whose name can't fit is its picture alone; a short phone folds to
  tokens) and their stacks (a third or fourth player's at one Domain fans over the first two, so a stack never crosses
  into the next column). The hand is the two-player table's size (Tim: names and numbers that read): two rows of five
  on a phone, one row on an iPad, with room kept so the table doesn't jump (on an iPad a hand of more than eight keeps
  the size of eight and overlaps, the names down the edges, `coverNames`); your spoke's tiles are as wide as the
  two-player rows' where the room allows. The rim starts with the
  player on your left (`seatsFrom`, `nextLive`), so the Congress of Vienna's "on your left" is the column at the left.
  Roads are drawn from where the tiles lie (`roadsN`). A Figure's piece is `figN(u)`: its card in your rows or the
  stack it is in; every EV handler aims there, and a Figure joining or leaving a stack flies as a card (`renderFlip`
  with `only`). A tap on a stack picks the Figure in it that can be reached or moved (a sheet asks which when several
  could), otherwise opens the scan. Seat colors are `--pc0` to `--pc5` (`PCOL`, `TCOL` team families, `setCols`; a
  new piece in a seat's color needs `.oN` rules for 2 to 5 in ui.css's "three to six players" block). Teams: the bar
  where the other player's strip is (`sidesEl`, "Tim & Jamie vs Pete & Pam", narrowing to diamonds when the names
  don't fit), a diamond on each plate, `teamsFor` from the setup's Teams choice. Turns are `G.ord` (E.order) and `G.k`.
  Set-up at more players: `suBoardN`, `suRim`, the dice `suDiceN`. Pass and play hands over to people only; the
  person whose turn it is has their spoke drawn large, and robots' turns leave it with whoever has the device.
  Results `showWinN`, history `recordN` (v 3) and `viewN` in hist/anoria.js. A new piece on the table needs a place in
  both `rowEl` (big rows) and `rimTile`/`stackEl` (the rim), and checking at 3 to 6 players and 320 wide.
- **The battle line with three to six players** (A3four, Tim approved 2026-11-13: "keep going with face off, carousel
  and the rest"). On an iPad held sideways (`nblFits`: 900 wide and 600 tall at least, measured beside the side panel when the
  reader or the log is open, so with it open the table lays out as on an upright iPad) a game of more players is
  drawn the two-player way: the dock along the bottom with the round track, your hand in one row and the button for
  the turn (`ui.lay.nbl`, the felt's `many bl`); your Gate, your Outpost and the Crossroads lie in a row across your mat
  at the left (`mineLine`), each a column as the two-player table's are, everyone else's Figures there above the line
  as stacks (one for each player, in seat order from your left) and yours below it as cards, the totals on shields at
  the tile's top and bottom (the strongest other side's and yours); your bar rides your mat's lower left. Each other
  player is a column on their own mat at the right (`rimCols`, the rim's columns): their plate, their Gate and their
  Outpost, with the stacks under them. Phones and an upright iPad keep layout C above. A new piece on the table needs
  its place in `mineLine`'s columns (`.pl.wn-bl` in ui.css) as well.
- **Twelve Guides** (the roster of twelve, Tim, 2026-11-12): Cleopatra, Leonardo, Tubman, Sun Tzu, Shakespeare, Marie
  Curie, Joan of Arc, Saladin, Empress Wu, Akbar, Mansa Musa and Sor Juana. Since 2026-11-13 a new player chooses any
  of the twelve, and the others join with their sets as the sphere turns or their callings are met (The collection,
  above). Their powers, as a
  player reads them, are in `GUIDES` in text.js; Sor Juana's is "Your Scholar Figures cost 1 less" (Tim's choice: her
  first draft was Franklin's cheaper Deed). **A Guide is never also a card**, so the seven left the set as cards
  (`RETIRED`, with `to`) and five people took their slots in the ready decks with the same faction, cost, Might and
  skills (Tim's choice): Joan's slot is Genghis Khan's, Saladin's Baibars', Shakespeare's Molière's, Mansa Musa's Askia
  the Great's and Sor Juana's Christine de Pizan's; Benjamin Franklin and Abraham Lincoln became cards of the third
  printing in Wu Zetian's and Akbar's slots. **Legacy Lines moved to the new cards where the history allows** (Tim's
  choice): Timbuktu and the Trade Caravan to Askia, Encore and Goethe's Legacy to Molière, Sappho to Christine; The
  Stage, The Bard, The Lionheart and The Tenth Muse could not move and were removed. **A Guide who leaves the roster**
  goes into `OLD_GUIDES` (cards.js, with `to`; their words in text.js): whoever had Franklin, Genghis Khan, Lincoln,
  Mandela or Gandhi had Shakespeare, Joan, Saladin, Empress Wu or Akbar instead (until the clean start of v 6),
  a game saved with one plays on with that Guide's power (engine.js keeps every power by key), and the table and the
  history show them through `TXG` (ui.js) and `card()` (hist/anoria.js). A Guide's power is measured with
  `node scripts/anoria/guides.js` (every ready deck under that Guide against the others under their own); the record
  of every draft and its figure is `scripts/anoria/guides.txt`. A new Guide needs a picture, a text entry, a mat
  (`MATS` in ui.js; without one the chart is used), that measure, a set of 20 cards and 8 Domains (cards.js `GSET`,
  `DSET`, measured with `scripts/anoria/sets.js`) and a calling (coll.js `CALLS`).
- **Domains: the engine and the data** (2026-11-11; the screens come after). A game given Domain stacks is played
  with Domains (`S.dm` in engine.js, whose header lists the state): `S.places[i]` the Domain at each position, `S.ban[i]`
  whose banner is on it, `S.mk[i]` the card lying across its rule (Vesuvius), `P.dst` and `P.dgone` each player's
  Domain stack and Domain discard pile, `S.su` the set-up (drawn, laid, the dice, whose offer is the Crossroads, who
  goes first), `S.pend` a choice of Domain still to make, `E.track(S)` the round track, `E.silenced(S, i)` what lies
  on a rule (Diogenes's marker is wherever he stands). Set-up is three steps the page can drive (`newGame(..., stacks,
  {wait: true})`, `setupOptions`, `setupLay`, `setupRoll`) or the engine decides (`setupAuto`, as the page does for
  now). Events: `domain` (laid, with what it replaced), `domains` (moved), `marker`, `choose`/`chose`, `dunder`,
  `restack`, `sroll`, `setup`. **Every rule is a word in the Domain's data** (`pw` in cards.js `PLACES`, the sentence in
  text.js `DRULE`), never a Domain's name.
  **Every Domain has a power of its own** (Tim, 2026-11-12: "domain powers list is approved"): 75 words, one for each
  Domain and no two alike, each true to what the place was known for. The list of what each does, and the state they
  need (`S.lh` who held each Domain at the last count, `S.gw` Greenwich's last turn, `P.debt` Florence's loan, `P.lau`
  and `P.ks` Laurion and Kumasi once a game, `f.vic` an Olympic victor), is at the top of engine.js; each word's test
  lives where that kind of rule lives (`might`, `walkDests`, `costOf`, `clash`, `ko`, `holderM`, `rv`, `endRound`), and
  the numbers are `DV`. A tile's few words are `DSHORT` in ui.js (22 characters at most). Where a power works is part
  of its sentence: a Commerce Domain and Greenwich do nothing at a Gate, Lisbon works only at the Crossroads, Citadelle
  Laferrière only at an Outpost, Machu Picchu not at the Crossroads; Stonehenge, the Grand Canal, Dunhuang and L'Anse
  aux Meadows work for the player whose banner is on them. Four are a player's choice, each once a turn, as actions:
  `{t: 'loan', p}` (Florence), `{t: 'buy', p}` (Timbuktu), `{t: 'hire', p}` (Carthage), `{t: 'relay', u, v}` (the
  Qhapaq Ñan); their buttons belong in `scanActs`. New events: `toll`, `loan`, `debt`, `buy`, `hire`, `relay` (its
  `move`s carry `relay`), `recall`, `victor`, `dpow` (a Domain drew a card or gave the last turn), `spark` with `w` and
  `p` (Spark for the next turn), `renown` with `why` `punt`, `ballcourt` or `treaty`, `mend` with `why: 'stool'`,
  `fallback` with `why: 'charter'`, `ko` with `top`; each has its sentence in `logEvs`. The robots weigh the powers
  that pay later (`domWorth`), Florence's debt and the Spark to come, and lay by `LAYV`. `node scripts/anoria/
  powers-test.js` checks every power against its sentence; `node scripts/anoria/domains.js each` measures every power
  at every position, and `domains.txt` section 14 has the numbers (every Domain between 47 and 53 overall), the nine
  powers changed from the approved list and why, and the ready stacks' five swaps. A changed power is measured there
  again, and its sentence, label and robots' worth change with it. **A game with no stacks is on the old fixed map** with the rules its twelve
  Places had (`pw0`, `tx0`): a lesson's table (guide.js is unchanged) and a game saved before Domains, which finishes
  as it began. Domination is not in the engine. The thirteen cards that act on Domains are in the set (`P4` in cards.js,
  `pr: 4`, found only in packs, from the whole set like every card; Pachacuti is the thirteenth; Congress of Vienna is the one with dice, whose roll is the `congress` event). The collection holds
  Domains (`doms`), a stack for every deck (`stackFor`, `saveStack`, `autoStack`: 15, no two the same, any kinds and
  homes); since 2026-11-13 Domains come only with the sets (`DSET`), never in packs. Every script in scripts/anoria
  plays with Domains (`dm` in `STD`; `'{"dm":0}'` is the old map); `scripts/anoria/domains.js` asks the Domain
  questions and `domains.txt` has the answers. A Domain's picture brief is `art` in text.js with how sure it is (`bs`);
  Every Domain and Domain card has its pictures (2026-11-12, the batch's notes in the session scratchpad's `domains-art/`). ui.js has only what keeps today's table
  working, with each seam for the screens marked `SEAM`.
  **Domains are on for everyone** (Tim, 2026-11-12; `DM_LIVE` in cards.js): every new game is laid from the players'
  Domain stacks, the Domain cards are in the set and packs hold Domains. A game saved on the old fixed map finishes on
  it, and a page opened with `?domains=0` (or `anoria_dm` '0' on the device) plays the old fixed map. The guide's
  chapter Laying the map (`domains` in guide.js) is the set-up played as a lesson: `AnoriaUI.demo.setup` and
  `suTable` deal real stacks, `L.press` taps as a player would, and the dice are the lesson's (`G.suDice`).
- **Ten Guides** (2026-11-11, before the roster of twelve and the sets). A Guide's power lives in engine.js by the
  Guide's key, and is measured with `node scripts/anoria/guides.js` (every ready deck under that Guide against the
  others under their own; a Guide worth about what the first five are sits within a few points of 0, and "none" reads
  about -1.5). First drafts that measured out of line and were changed: Gandhi's +1 Might everywhere (+9), Lincoln's
  fourth Seal (+5), Curie's cheaper second card (+6.5), Mandela's return to hand (worth nothing: Spark is what is
  scarce, not cards) and his fall back to the Gate from anywhere (+6). A new Guide needs a picture, a text entry, a
  mat (`MATS` in ui.js; without one the chart is used) and that measure.
- **Adding a card to the set**: an entry in cards.js (existing keywords and `arr` effects need no engine work), one in
  text.js (`cap`, `ll` as [lon, lat], `tx`, `fact`, `art` brief; `SAY`/`FY` if needed), its picture through
  `scripts/anoria/pack-art.sh`, then `node scripts/anoria/run.js cards 6000` (its win rate beside cards of its cost)
  and `pacing.js`. Counts everywhere come from the card list. Blackbeard (2026-11-11) is the first card outside the
  five ready decks: he is found only in packs. `scripts/anoria/endings.js` plays the ready decks on any set of games: tune on some sets
  and check on sets nobody has looked at (the first choice made for 25 Renown overshot when it met new games).
  A batch of new cards goes in the way the cards of 2026-11-13 did (below): a block of its own in cards.js and text.js
  with its `pr` number, a JSON of sources beside set-150.json that check-set.js reads (its `GROUPS`), every key in
  `NOPIC` until the art pass (a monogram shows), `node scripts/anoria/rarity.js 6000 <pr>` pasted into coll.js as its own
  RARE list, and `pacing.js`. A card in no set is found only in packs by itself (coll.js `POOL`). **A Figure can cost
  1 Spark** (the seven of 2026-11-13, all 1/1: `scripts/anoria/spark1.js` measures one beside its faction's 2-Spark
  Figures, and whether cheap bodies change games; spark1-2026-11-13.txt). A Figure's home region is any of `REG` in
  ui.js; Oceania (`OCE`) has Figures since 2026-11-13, so the Library and the home key list it.
- A rule or number change is tested first: `scripts/anoria/variant.js` (the ready decks under a change), `skill.js`
  (the robots), `dice.js`, `copies.js`; see `scripts/anoria/README.md`.
- **The third printing** (Tim, 2026-11-11: "increase the number of possible historical cards to collect outside of the
  base packs by 150 ... lean slightly more into more well-known historical figures but i do like learning more history.
  add threads/legacy lines as the real history would necessitate and fits gameplay ... leave off completely fictional
  characters for now", then "shift 25-30 to deeds and relics"): 100 Figures, 20 Relics and 30 Deeds, all real, **found
  only in packs** (in no ready deck). Eleven of them left under the hundred-year rule above, so the third printing is
  137 cards; thirteen more were added the next day (Tim's choice: Thutmose III, Themistocles, Mehmed II, Omar Khayyam,
  Nebuchadnezzar II, Jai Singh II, Afonso I of Kongo, Ernest Shackleton, the Paiza, the Cyrus Cylinder, the Great Exhibition,
  the Declaration of Independence and the Rubáiyát, with a new named line, The Tentmaker), so the third printing is 150
  again (101 Figures, 22 Relics, 27 Deeds) and the set is 241 (Einstein and Jim Thorpe are held too: below). They are `P3` in cards.js (`pr: 3`, listed in `PRINT3`) and
  `P3` in text.js. `scripts/anoria/set-150.json` keeps where each card's facts came from (`src`, `sure`, `check`), what
  was dropped and why, and the five cards that were held for engine work until 2026-11-12 (`needsEngineBuilt`: below).
  `node scripts/anoria/check-set.js` checks the whole printing
  (words against skills, every Legacy Line, the briefs, the game's files against the JSON). A Guide is never also a card.
- **The cards of 2026-11-13** (`pr: 5`, P5 in cards.js and text.js, sources in `scripts/anoria/set-p5.json`; part of the
  prime set like every card, found only in packs): 68 cards, 50 Figures, 6 Relics and 12 Deeds, chosen where the set was
  thinnest (the Middle East, the first Figures from Oceania, the Americas between 1453 and 1650, the 1900s), with ten
  named Legacy Lines of their own (The Endeavour, The West-Eastern Divan, The Bronze Horseman and the rest) and lines
  to five older cards through `FROM_MORE` (Goethe, Catherine, Bach, Kepler, Jai Singh II), so no older card's words,
  cost or Might changed. Seven of them are **the first Figures that cost 1 Spark**, people whose importance wasn't
  force: Hunayn ibn Ishaq, Caroline Herschel, Synesius of Cyrene, Paul Revere, Dominique-Jean Larrey, Ban Zhao and Ibn
  Fadlan (spark1-2026-11-13.txt). Larrey's power is the one new skill, `shelter`: enemies can't clash with him while a
  stronger Figure of his player's stands at his Domain (engine.js `clashable`). Every Relic and Deed borrows an effect
  the engine has (`fx`); the Great Siege of Malta's Quick text names itself where the Defense of Syracuse's names
  Syracuse (check-set.js allows that for a Quick Deed). Every card's facts were checked by a search on 2026-11-13
  (`check` says what each search confirmed and what changed: Fort Saint Elmo fell, so Malta's forts did not all hold;
  Inca Garcilaso's line to Pachacuti no longer rests on his mother's contested descent). Every story fits four lines
  (the scratchpad's `hist2/factfit.js`). Measured with `run.js cards 6000` on two seeds and `newcards.js <file> 5`: -0.3
  and -0.4 points from their factions, none outside them; tiers from `rarity.js 6000 5` (`RARE5`, rarity-p5.txt).
- **Seven cards of 2026-11-12** (`scripts/anoria/deeds-2026-11-12.txt` has the numbers): the Roman Triumph, Medici
  Patronage, the Hanseatic League and the Jubilee of 1300 double Renown at this round's count (one Domain, a kind of
  Domain by `dk`, or all you hold; a Domain is doubled once however many say so: `S.dbl`, and they lie in `S.dip` until
  the count); the Tribune's Veto (Quick) cancels a Deed aimed at your Figures or a doubling; Pope Leo I has **Ward**
  (the other player's Deeds and the Domain powers that hurt don't reach your Figures at his Domain); the Theodosian Walls
  mend or add a Seal, to 4 at most (`P.sm`). Phalanx, Testudo and the Defense of Syracuse are three different Quick
  powers now (Testudo: a Figure losing a clash it started on their side falls back to your Gate; Syracuse: an enemy
  winning a clash it started at your Gate or Outpost is driven back to its own Gate), each for 1 Spark you kept.
  `scripts/anoria/deeds-test.js` holds each to its sentence.
- **The five held cards and the Walk to Canossa** (2026-11-12, Tim: "finish the unfinished stuff", and "a card that
  switches off an enemy Figure's skill, like Guard or Steadfast"; `scripts/anoria/held-2026-11-12.txt` has the numbers).
  Each has an effect of its own (`fx`): **Damascus Steel** (Relic) "Your Figures have +1 Might when attacking"; the
  **Abacus** (Relic) "Your Deeds cost 1 less"; the **Peace of Westphalia** "Choose a Domain. Nobody can start a clash
  there until this round ends"; the **Lisbon Earthquake** "Choose a Domain. Every Figure there, yours and the other
  player's, misses its next turn" (the Veto cancels it where it stops yours); the **Edict of Milan** "Choose a Domain
  where you have a Figure. Until this round ends, the other player can't start a clash with your Figures there"; and
  the **Walk to Canossa** (Henry IV, 1077) "Choose an enemy Figure. Until this round ends, the skills and powers on its
  card don't work". The Peace and the Edict lie on their Domain until the count (`S.dip`, its mark on the tile: sheathed
  swords, a shield), Canossa on its Figure (`f.hush`, a struck skill mark on the piece and the card's powers struck
  through when it is read). **Every test of a skill on the table goes through `kOf(S, f)`** in engine.js, never
  `CARDS[x].k`, so a humbled Figure loses Guard, Steadfast, Law, Ward, Diogenes's Silence and the rest at once; a
  new skill word is read the same way (check-set.js reads skills from `kOf` too). A Ward or the Forbidden City keeps
  the other player's Peace, Earthquake and Canossa off its Figures. Damascus Steel comes into a clash as its card,
  as Phalanx does. The robots weigh them with `HW` (dipWorth, quakeWorth, and Canossa looks one clash ahead).
- **A Relic's or a Deed's effect belongs to its data** (`fx`, read with `E.fxOf`; a card without one has the effect of
  its own key). The engine has 22 Relic powers (below: the Relic powers of 2026-11-13) and eleven Deed effects, and
  nothing in engine.js or ui.js asks a card for its name: the Astrolabe is a Compass in
  effect, Testudo a Phalanx, Mailed to Freedom runs what Night Crossing runs. A new Relic or Deed with an effect the
  engine has is data only; its rules text is the text of the card its `fx` names (check-set.js holds it to that).
  **Two Relics**: "You can have 2 Relics in play at a time, and they have to be Relics with different powers"
  (`hasFx` in engine.js; RULES and the Relics lesson say it). So nothing stacks, and a Legacy Line between two Relics
  with one power could never be made (check-set.js refuses it: the Sextant jumps so that its line from the Astrolabe
  works). Letting a power count twice was tried (`scripts/anoria/relics2.js`, `set-150-balance.txt`): it made no
  difference the robots could measure, so the rule is the one that is a single sentence and has nothing to add up,
  and it is what the game already did with a second copy of one Relic.
  **A Relic can be played over one of your own** (Tim, 2026-11-17: "i should be able to play a relic over an existing
  relic in play for me"): with 2 Relics in play a new Relic goes over either of them for its full cost, and the Relic
  underneath goes to your discard pile; a Relic whose power you have in play can go only over the Relic that has it
  (so there are still never two with one power, and a second copy goes over the first); with a free slot and no such
  Relic it is played as always. The move is `{t: 'relic', h, over: slot}` and its event `{t: 'relic', o, c, over, was}`
  (`actions` and `apply` in engine.js; net.js passes both through as they are). What a power has used is its player's,
  never the Relic's (`P.uA`, `uRw`, `uRk`, `uLc` this turn, `P.uCy` this round, `P.rb` this game), so the Relic that
  left stops at once and a power that works once is not made new by playing its Relic again; the Stirrup's Charge on a
  Figure that walked goes with the Stirrup (`relicLeft`). A Legacy Line is read as the Relic is played, so a Relic that
  grows from the Relic it covers (the Sextant over the Astrolabe) makes its line. The robots cover a Relic only with one
  whose power is worth more to them (`overWorth`, from `RW`). On the screen: a Relic from your hand has your two Relic
  slots as its road (`R.slots`, `slotsRow` in ui.js: Play on a free slot, Replace on a Relic it would cover, each with
  the cost); on the table the Relics it can cover light on your bar and the same row rises over them (`relicChooser`),
  and the Relic can be dragged onto either. The playback lifts the old Relic out of its slot as a card and drops it
  away before the new one lands (`EV.relic`); the turn log and the computer's move name both. A Relic whose power you
  have in play says under the card why it can go only over that Relic (`notesFor`). `cfg.relicOver: 0` plays the rule
  before, for test games; the numbers are `scripts/anoria/relic-over-2026-11-17.txt`.
- **The Relic powers of 2026-11-13** (Tim: "I'd like to see a lot more variation on what relics can do to minimize overlap
  and create new possibilities"; the proposal is `scripts/anoria/relics-proposal.md`, and of it Tim said "far sight seems
  like a lot -- maybe they just reveal the first of the two cards they draw each turn while in play? and stores - maybe
  limit it to being active only while not leading in renown? the other decisions are fine"). 22 powers for 34 Relics,
  no power on more than 4, each read through `hasFx(S, P, power)` where its kind of rule lives; the numbers are in
  `scripts/anoria/relics-2026-11-13b.txt`. The key of a power is the card it is named for (`fx` on the others):
  Compass (Compass, Astrolabe, Birchbark Canoe, Stick Chart; 1 Spark), the jump (`balloon`: Montgolfier Balloon, Wright
  Flyer, Sextant, Harrison's Watch; 3), Printing Press (Press, Paper, Telegraph; 2), Manuscripts (2), Abacus (Abacus,
  Rain Gauge; 2), Damascus Steel (alone, 3 since this day), Boundary Stone (1), and fifteen new ones:
  **Foresight** (`codex`: the Dresden Codex and the Antikythera Mechanism, 2; the top 3 of the draw pile put back in any
  order before the draw: a person on two trays over the table, `askFore`; the robots put the dearest card they can pay
  for on top, `foreOrder`), **Landing** (`longship`: the Viking Longship and the Voyaging Canoe, 2; Figures played at the
  Crossroads), **Convoy** (The Wheel, 1; a second Figure at the same Domain walks with one that walks, `a.w2`),
  **Railway** (Steam Locomotive, 1; once a turn, Gate to any Domain where you have a Figure, `{t: 'rail'}`), **Charge**
  (Stirrup, 1; a Figure that walked can still clash, `f.gar`), **Rebuilding** (Inca Rope Bridge, 2; once a game at the
  count), **Homecoming** (Cyrus Cylinder, 1; once a round, a knocked-out Figure back into the hand; with Rapa Nui as well
  "the Figure's owner chooses", `S.pend` k `home`, and the robots take the hand), **Bastion** (Greek Fire, 2; +1 Might
  defending at your Gate or Outpost), **Volley** (Mysore Rockets, 3 since Tim's choice the same day: 53.1% at 2, 50.1% at 3; once a turn a clash with an enemy at the next Domain
  along the roads, `a.rk`: fought at the target's Domain, by its rules and its home region, and "the attacker cannot be
  knocked out by it ... if the attacker loses, nothing happens to it"; `E.clashM` gives the two Mights the road and a drag
  show), **Decipher** (Rosetta Stone, 2; each Legacy Line scores 1 more), **Far sight** (Telescope, 1; "Each opponent shows
  you the first card they draw each turn": Tim, the same day, "the drawn card is shown briefly, then held normally". The
  card rises from their hand face up for a moment, turns over to its back and goes back; nothing in the state remembers
  it, and the turn log names it; the robots see every hand already, so it does nothing for them),
  **Reading** (Braille, 2; a Scholar draws one more), **Stores** (Clay Tablet, 2; "while you are not ahead in Renown",
  ahead meaning more than every other side, 1 more Spark at the start of a turn; at 3 Spark it measured under a plain
  card), **Library Cave** (Dunhuang Star Chart, 2; once a turn 1 Spark for a card from the discard pile, chosen on the
  strip from the Relic's road, `caveChoose`), **Safe conduct** (Paiza, 1; your Figures never miss a turn).
  Each power has a reader note (`RNOTE` in ui.js), a sentence in `logEvs` and `moveSaid` for its events, a worth for the
  robots (`RW`), and tests in `deeds-test.js`. **A game keeps the Relic powers it began with** (as `G.sc` and `G.tg`):
  `cfg.rfx` is 2 for a game begun under these powers (`STD`; the page keeps it as `G.rfx`, `cfgOf` in ui.js), and a game
  without it reads each Relic's old power from `RFX1` in engine.js by today's keys, so a saved game's Antikythera
  Mechanism still jumps and its Telescope still draws; `info()` shows such a Relic with its old words. Costs are today's.
- **The hand limit is each player's own** (Tim, 2026-11-13: "there are a lot of draw opportunities, but having to keep
  the hand at 8 or less is a consistent constraint"): 8 (`handMax` in `STD`), or 10 with the Timbuktu Manuscripts' power
  ("You can hold 10 cards in your hand"; the Quipu has it too). Every reader of the limit asks `E.handMax(S, o)`, never
  `cfg.handMax`: the end of a turn, the page's discard screen and its caption. `scripts/anoria/relicfx.js` measures
  every Relic power on the same games (`relics-2026-11-13.txt`). The wider spread of Relic powers proposed in
  `scripts/anoria/relics-proposal.md` is built (below).
- **Any number of a player's Figures can stand at a Domain, unless the players choose a limit** (Tim, 2026-11-17: "is
  there a good reason for the three card limit at a domain in arvela?" There wasn't: at most three of one player's
  Figures at a Domain was in the first version's rules, and no balance run had ever tested it. Then, the same day: "give
  game options to cap domains at 4-6 cards apiece"). A new game has no limit (`cap: 0` in `STD`), and the setup's option
  Figures at a Domain (No limit, 4, 5 or 6: `capOf`, `capRule` in ui.js) gives one game a limit, online too (the host's
  choice is the table's `cap` in net.js, and the review shows it with the rules). Thermopylae keeps its own two whatever
  the game's limit (`capAt` in engine.js: the Domain's power). **A game keeps the limit it began with** as `G.cap`, as
  it keeps `G.sc`, `G.tg` and `G.rfx`: a saved game or an online table from before has none, and finishes under the old
  limit of three (`E.OLD_CAP`, `cfgOf`). Lessons play with no limit. **Every sentence that says the rule is made from the
  game's own limit, never typed** (`capRule`, `fullSay`): the rules page, the note under a Domain, the plate on a Figure
  with nowhere to be played, and the road under a card, where a Domain that holds as many of your Figures as it can says
  Full and a tap says why (`R.full` in `roadOf`; the engine is asked where the card could go with the limits lifted,
  `cfg.nolim`). Testudo, the Defense of Syracuse, the Great Siege of Malta and Runnymede no longer say "if that Gate has
  room": only a Gate that is Thermopylae can be full in a game with no limit, the engine still checks it (`room`), and the
  note under Thermopylae at a Gate says a Figure can't be sent back there. In a game where a Gate can be full (a limit
  was chosen, or Thermopylae lies at a Gate: `gateCanFill` in ui.js) the notes under those three Deeds and under
  Runnymede say what a full Gate does ("A full Gate: if your Gate has no room for the Figure, Testudo stays in your hand
  and the Figure is knocked out."). The engraved empty places in your rows with
  more players are drawn only where a Domain has a limit. The numbers are `scripts/anoria/no-cap-2026-11-17.txt`. The
  five ready decks (`variant.js`, 80 games a matchup) are 10.2 points apart under the old limit of 3, 14.1 at 4, 14.4 at
  5, 12.2 at 6 and 11.3 with none, with the rounds (7.6 to 7.7), the knock-outs (8.1 to 8.3) and the games won on Seals
  (32 to 34%) the same throughout. **The twelve Guides' decks, which were tuned under the limit of three, are further
  apart the more Figures a Domain holds when each is played by its own robot** (`sets.js`, the styles in `STY`, 240 games
  a pair): 4.5 points at 3, 5.3 at 4, 9.4 at 5, 8.9 at 6 and 11.7 with none (Sun Tzu 55.1%, Sor Juana 43.4%). With the
  plain Normal robot on every deck they are no further apart (8.6 at 3, 7.3 with none, 120 games a pair), so part of that
  is the styles, which were chosen under the old limit, and not the decks. Neither the styles nor the sets have been
  tuned again: a change to either is measured under no limit from now on (`sets.js` plays `STD`). Tests: deeds-test.js (more than three by
  every way a Figure arrives, limits of 4, 5 and 6, a game that keeps the old limit, whole robot games), powers-test.js
  (Thermopylae), players-test.js (four players, teams).
  **The table shows any number** (`foldPiles`, `pileEls`, `pileBad` in ui.js). A pile shows every card while every card
  can show its Might and its cost, and on the battle line its name (flat or down its edge: `coverNames`, which now keeps
  the name clear of the marks on the spine and counts a stack as the thing lying over a card). Past that, the cards that
  fit stay cards and the rest are **one stack at the pile's top**, the place where a card lies whole (the right end of a
  row; in a cascade the top of the screen), at a card's size, with how many cards it holds and their Might together
  (`.stk.pile`). How many fit is found by measuring the pile as it lies, one card fewer until it is right, and remembered
  for that pile at that window (`ui.folds`), so the next redraw is built folded. A phone held upright keeps three cards
  beside a Domain as it always did, the covered ones showing their Might, and folds from the fourth; a cascade (an iPad
  upright, a tall window) keeps a third of every card; your rows with more players hold three things, fewer on a phone
  on its side (`rowFit`), and on the battle line with more players your columns fold as the two-player ones do. A phone
  on its side was already one stack a side; its stacks now lie under the line's shields, which three fanned cards had
  covered. A tap on a stack picks up the Figure in it that can move, or opens the face-off, where every card is whole and
  a side with too many scrolls (`stackTap`, `fitFaceOff`: unchanged). The scratchpad's `nocap/h.js <tag> <sizes>
  n4,n6,n9,b6 [--n=4]` shoots 4, 6 and 9 of yours and 6 a side at one Domain, `nocap/fo.js` measures the face-off,
  `nocap/play.js` plays a game on the page while the piles grow, and `nocap/lessons.js` plays every lesson to its end.
  **The setup on a phone held upright** fit the screen exactly before the option: with its row, Arvela's own parts draw
  in (`an-tight` in ui.css, set by `tight` in `showSetup` once the kit's fold and `k-snug` are not enough), so it still
  fits. The kit folds the option to a row that opens, not a row of buttons, because "No limit" is 8 letters and
  `inlineKind` takes 7. A chosen option in a row of choices is bronze words on bronze-tinted stone (the kit's `--lit-ink`
  is this page's dark ink and read dark on dark).
- **Pictures of the third printing**: all of them are painted (2026-11-11; each batch's notes, candidates and sources are in
  the session scratchpad's `art3/`, not the repo). `PAINTED` in text.js lists the third-printing cards whose pictures
  are in `art/` and `art/t/`, and a card added later without one is in `NOPIC`: the page never asks the network
  for such a picture (`noPic` in ui.js), and shows the card's initial as a monogram in a ring on its faction's colour
  (`.ac-noart.mono`, `mono()` for medallions, thumbnails and Relic slots), with no button to turn the card over to a
  picture. **The art pass adds a card's key to `PAINTED` as its two pictures go in**, sets `FY` if the default
  hides the subject, and puts the brief as finally used back into `art` in text.js and set-150.json (check-set.js holds
  the two to each other). **Wording that went wrong in briefs** (found by the batches): "a plate sits in each top
  corner" made the picture tool hang dinner plates in the corners (say "the card's own labels cover those two corners;
  nothing round hangs or stands there"); "a fifth of the way down" put heads under the kind plate (say three fifths of
  the way across and a quarter of the way down); and a full card shows only about 11% to 60% of a picture's height, so a
  brief says what must be in the upper half. The briefs (`art`) follow the notes above: both top corners plain, a few particular people, sizes as ratios, what to leave out; people who died within living
  memory are asked for as a respectful, recognisable portrait at a documented moment.
- **Packs draw from the whole set, 5 cards each** (Tim, 2026-11-12: "all series should be available in packs ... do 5
  cards. keep allowing a player to collect cards until they've covered all the different styles too. the player can
  only put two in a deck though"; and 2026-11-13: "Packs also draw locked Guides' cards: yes"). Every slot is a card you
  don't have or a finish you don't have, so the packs go on turning up finishes until every card has all five
  (The collection, above). Domains come only with the sets.
- **A named Legacy Line the game already has is never given more cards**: it would stop being finished for someone who
  had finished it, and one that comes whole in a starter deck would stop being theirs. New cards get lines of their
  own (The Clockwork Heavens beside The Heavens). Links from new cards to older cards are all `from` (`FROM_MORE`), so
  no older card changes its rules text, its cost or its Might.
- **Balance for cards nobody meets in a ready deck**: `run.js cards 6000 [seed]` then `newcards.js` (each new card beside
  what its faction had), and `newdecks.js` (decks built by Finish the deck for me from the third printing, in each
  pair of factions, against the five ready decks). `endings.js` must come out exactly as before: the ready decks hold
  none of these cards.
- **Domains: how they look** (Tim, 2026-11-11: "domains need to be clear in their design/border what type of domain
  they are and geographically what "home" they represent for figures with home powers", and the game must track
  "who played what domain", "markers for nullified/modified effects" and a "turn count tracker", each with "a
  real-life translation"). The card at each of the map's five positions is a Domain (the prototype is
  `scripts/anoria/places/`). The look is
  `games/anoria/domains.js` + `domains.css` (`AnoriaDomains`), and everything in it is drawn as a piece that could
  lie on a real table:
  - **Seven kinds, read from the border alone.** Each kind's frame is its material, and no two share a pattern, so
    they hold apart without colour: Commerce a twisted cord with brass seals, Industry riveted iron, Thought a ruled
    and pricked vellum margin, Land a battlement, Culture a dog-tooth frieze on terracotta, Law a fluted marble
    moulding, Routes a chart's neatline. Each has a mark on a plate of its own shape (coin, anvil on a bolt head,
    open book, tower, lyre on a stele, scales on a shield, compass needle). A frame is one SVG cut in nine for
    `border-image` (`FR`): a new kind is an entry in `KINDS`, `FR` and `MARK`. The twelve Places of today have their
    kinds in `OF`. On a full card the ribbon takes the kind's colour and name and the mark stands where other cards
    have their cost.
  - **Home** is the house mark everywhere: at the foot of a Domain's full card as on a Figure's (house, the region's
    outline drawn from land.js, its name); on a map tile a paper plate cut to the house's shape with the outline in
    it; gold on the piece of a Figure standing at home; and the tile's plate turns the same gold while a Figure that
    is at home there is picked up from the hand or the map (`homeLit` in ui.js; a Voyager lights them all).
  - **A tile has no free room on a phone**, so the mark and the home plate are clasps on its left and right edges,
    half on and half off, at the height between the Might totals and the pieces' own Might badges; tokens hang under
    the mark; a banner stands over its player's corner, above the top edge. Nothing new may lie on a total, the name
    or the rule: check a new piece against a two-line name with a rule under it.
  - **Banners, markers, counters** are built and shown on the art proof: a player's banner (a pennant on a brass pin
    in their colour, the second player's swallow-tailed, on their own side of the tile), a veil of ash over a silenced
    rule (the rule struck out, still readable), a pen-nib token and a dotted line for a rule changed for a while,
    bone counters 1 to 5. **On the live table** (2026-11-12) whose Domain it is shows as the player's avatar on the
    tile's bottom border (Tim's choice over the pennants), and the pieces a rule uses now lie half on that border either
    side of the avatar (`domTokens` in ui.js, `.pl-toks` in domains.css), clear of the totals, the flag and the words (on a phone held upright, where the Domains stack one above another, the
    avatar and its pieces sit inside the tile's foot on the paper instead, so none touches the tile under it: Tim,
    2026-11-16, "the avatar is touching two cards - confusing"):
    at its left, the card that switches the power off (Vesuvius as a small card laid slightly turned; Diogenes's
    Silence marker as his portrait on a square token edged in his player's colour) over the veil of ash, and the
    pen-nib token with the dotted line while a Ward (Pope Leo I) changes what Seneca Falls, Himeji, Nan Madol or
    Nineveh do; at its right, a bone counter in a player's colour for the Spark they owe Florence until their next
    turn. The table reads them from the playback's own moment (`V.mk`, `V.figs`, `V.P[o].debt`), so a piece lands
    with the move that lays it. Counts already on the table (a Figure's Might from Imhotep's rounds, Benin City or
    an Olympic win, a stun, Seals) get no counter. A new piece goes in `domTokens` and is measured at the five sizes
    against a two-line name, the next row's flag and the round track.
  - **The round track** is on the live table: an enamel rule with the rounds engraved along it, a slide at this
    round in the colour of whoever's turn it is (brass during the count), a gem at a round where something is due
    (Lincoln's Seal at round 5). On the battle line it lies across the whole table at the top of the dock, under the
    mats; on a phone held upright it lies along the map's lower edge, in the gap and over the mats' bound edge; with
    more players, down the map's right side sideways. A change to the table's layout is checked against the map's
    and hand's boxes and `--fw`, `--tw`, `--th`, `--hw`.
  - The proof (`?art=1`, or `?art=1&only=domains` for this part alone) shows the seven frames as cards and as tiles
    at a phone's size, the pieces, the track, a map with everything on it over every play mat, and the same sheet
    without colour and as red-green colour blindness sees it.

## Rules for every change

- **Bump `CACHE_VERSION`** in `service-worker.js` on every release. Installed copies
  of the app keep serving cached files until it changes. Format:
  `v<N>-<YYYY-MM-DD>-<short-slug>`.
- **New or renamed game file**: update `PRECACHE_URLS` in `service-worker.js` and
  the catalog in `games.js`.
- **`firestore.rules` changed**: the Action deploys hosting only. Deploy rules
  separately with the service account
  (`npx firebase-tools deploy --only firestore:rules --project familygames-da3e5`)
  and tell Tim.
- **`storage.rules` changed**: deploy with `node scripts/deploy-storage-rules.js` (the CLI's `--only storage`
  is refused for the service account) and tell Tim. Firebase Storage holds the Lorcana card-art backup
  (`lorcana/`, filled by `scripts/mirror-lorcana-art.js` in deploy.yml) and the TURN logins for online games
  (`online/ice.json`, refreshed every six hours by `turn-credentials.yml` from Cloudflare; secrets
  `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN`). It also holds every Sportsbook league's team list (`sportsbook/teams.json`, saved weekly by
  `sports-teams.yml` from ESPN, so My teams works out of season).
- Files that must not be public go in Firebase's `hosting.ignore` (`firebase.json`).
- **Firebase Storage CORS**: the app reads files from Storage with `fetch` (console game lists and game files), which
  needs the bucket's CORS setting from `scripts/storage-cors.json` (applied 2026-10-17). The deploy service account
  has Storage Admin on the bucket, so it can re-apply it: PATCH the bucket's `cors` field through the Cloud Storage
  JSON API. Check: `curl -sI -H "Origin: https://games.timbrown.xyz" "<a Storage file URL>?alt=media"` shows
  `access-control-allow-origin`.
- **Offline** (menu): saves the app plus every other public file (`offline-files.json`, built by
  `scripts/build-offline-list.py`; deploy.yml rebuilds it each release) into the `gn-offline` cache. Run the script
  after adding assets so previews have them too.
- Never print or commit `FIREBASE_SERVICE_ACCOUNT` or any Dropbox secret.
