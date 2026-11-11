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
  table to line up names and hands, a caps label over a value).
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
- **Nothing cut off.** No clipped or "…" text, numbers or graphics anywhere, at any screen size or orientation:
  wrap, shorten smartly ("Kathleen M." → "Kathleen"), or ease the size down instead. Ellipsis is a last resort only
  for user-typed text that can be any length. Check by measuring (scrollWidth > clientWidth on clipped elements,
  anything past the screen edge) at phone upright/sideways and iPad sizes, not just by eye.
- **Screenshots are taken at Tim's devices**, upright and sideways: iPhone 17 Pro (402 x 874 CSS px, scale 3) and iPad
  mini 5th generation (768 x 1024 CSS px, scale 2). Design is judged at those. Measuring for cut-off things still
  covers smaller phones too (320 wide).
- **Game play areas must feel like a real game, not an app.** Use table
  materials from `kit.css` (`.wood`, `.felt-in`, `.paper`, `.ink`,
  `.display`), real-looking pieces (`Kit.die`, `Kit.card`), and motion. Chrome
  (bar, menus, setup) stays clean and minimal. Yahtzee is the reference.
- Every game checks its rules against the official/standard rules, and has a
  plain-language "How to play" via `Kit.init({rules})`.
- Fun moments: `Kit.win` (confetti), `Kit.callout`, `Kit.sfx`, `Kit.haptic`.
- **New games: the bar is very high.** Tim expects high-end design polish, effects, sound and
  interactivity in every new game: real materials and pieces, motion on every action, sounds and haptics,
  big moments for big plays. Screenshot every phase and critique it before calling it done.
- **Subtle per-game identity:** layout and controls stay standard; each game
  gets its own table "box" via `THEMES` in `kit.js` (felt colour, card backs,
  wood). Keep it understated: colour and material, never mascots or emoji.
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
- Player setup goes through `Kit.setup` (name picker, regulars, robot names for
  computer players). Every game passes `undo` to `Kit.init` when moves can be
  taken back. The game menu always has Frequent players.
- **Same setup, same results card, every game.** Ways to play are declared with `Kit.modes([...])` (`solo`,
  `cpu`, `local`, `online`; a game keeps its own mode ids with `kind`), but **no mode cards are shown** for these:
  the setup shows who's playing on a card (the people who played last; seat 1 starts as the signed-in player), and a
  tap opens the **players sheet** (`Kit.playersSheet`): the seats as tokens up top with one chosen, and under them what
  can sit there, the Computer switch with its skill and everyone you play with as chips (a tap seats them and moves
  to the next open seat; at a full table it adds a seat). A game never draws its own seat list; one that shows something per seat reads
  `setup.seats()` (Axis & Allies' countries). Who's playing is shown as a **Players card** above the game's options
  (`.k-who`: the people already chosen as chips, robots with their skill, and a tap opens the players sheet). On the
  home screen's game sheet the sheet draws that card itself (`.gs-who` in index.html; the framed setup says who is
  seated with `kitSheet: 'who'` and draws none). A game's extras (Lorcana's online games) go under the options. One seat is Just me, robots in
  every other seat is vs Computer, people (and robots where the game mixes them, `cpu: 'mix'`) is Pass & play, and
  `onStart` still gets the matching mode id. Play online is a smaller button beside the start button (`Kit.setup`
  does all this itself; a game's own extra way to play, like Bingo's Call only, uses `alt`). Only games with
  their own kinds of play (Trivia's Buzz in, Sandlot's Derby) still show cards. Pass & play hands the device over
  with `Kit.handoff` between people only. The start button
  stays in view (the kit's `.k-startdock`; insert game extras before the dock, not before `.k-start`).
  **Sides** (Tim, 2026-11-11): the Players card and the players sheet say who is with whom the way people do:
  partners joined by "&" and the sides by "vs" ("Tim & Jamie vs Pete & Pam"; two seats are "Tim vs Huey"). A
  partnership game gives `players.teams` ([[seats], [seats]], or a function of the count and options when partners
  are a choice: Dominoes, Marbles); `players.vs: false` for two who play together. `Kit.whoChips` draws them, on
  the home sheet too. **Play online** is on every game whose tables are TurnNet's (not only ones that list online
  among their ways to play) and takes what is chosen: a **review** first (`goOnline` in kit.js: who will be at the
  table, the rules as set, choices that only matter online), then Open the table opens it at once
  (`TurnNet.host`) or Find a table goes to the lobby. **A friend's open table** in a game is the first row of that
  game's sheet on the home screen ("Join Pete's table", from `friendTables`), and the separate Play online rows
  from games.js hide once the setup offers it. **A setup that would not fit the screen folds its options** into
  one-line rows (`fitFold`), as the home sheet shows them, so nothing scrolls where that can be helped.
  Results cards use `Kit.win`'s slots (`again`, `look`, `extra`, `setup`, `scores`, `stats`, close) rather
  than hand-rolled buttons, so every game offers the same things in the same order. Reference:
  `games/othello.html`.

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
- Real-time games (arcade, consoles) use `online.js` (WebRTC); consoles add lockstep in `games/console-net.js`.
- **Notifications** (the bell on home, the profile menu and every game's menu, `Kit.inbox`): news that came in on this
  device, newest first (`gn_inbox_dev`). Anything new worth looking back at (a turn, a link answer, a request) goes in
  with `FGHSync.inboxAdd({id, k, ...})` and gets a line in `inboxLine` in kit.js.

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

## Lorcana card updates

- Every deploy (and the weekly `lorcana-check.yml` Action, Mondays) saves Lorcast's full card list to
  Firebase Storage `lorcana/data/cards.json` (public): `https://firebasestorage.googleapis.com/v0/b/familygames-da3e5.firebasestorage.app/o/lorcana%2Fdata%2Fcards.json?alt=media`.
- The weekly Action runs `scripts/check-lorcana-abilities.js`, which runs every card through the game's own rules
  code (the `// ==RULES==` … `// ==/ABIL==` part of `games/lorcana-play.html`; keep those markers) and keeps one
  GitHub issue (label `lorcana-check`) listing cards the game can't run on its own yet.
- "Wire up the Lorcana cards in the weekly check issue": read that issue or the saved card list, extend the
  parser/engine, check new screens and animations with Tim before building them, then preview as usual.

## Anoria (the card game)

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
  laurel read `WIN` in guide.js. A round limit of 14 that only a stand-off reaches, clashes roll two ordinary dice (`dice: 'high'`), one of each
  person on your side at a time (`unique`), the second copy returns for 1 less (`ret`), and Threads (`threads`): any card can name what
  it grew from in cards.js (`from`: a Figure, a Relic or `'@place'`; a Figure's own Legacy is `insp`), with a true
  sentence for each link in `text.js` (`LINKS`). The robots are `PROF.novice` (Easy), `normal` and `hard`.
- **The collection** is `games/anoria/coll.js` (`AnoriaColl`): the one place its rules live (starter deck by Guide,
  welcome packs, what a pack can hold, what a game earns, decks you build, finished Threads), saved in `anoria_coll`
  and `anoria_decks`, which follow the account. `scripts/anoria/pacing.js` plays those same rules and checks them: a
  change to the economy is made there and re-run. Earned packs hold 3 cards (Tim's choice, 2026-11-10): the 66-card
  set took about 18 days of daily play at 3 games a day (it was about a month at 2 cards). With the second printing
  the set is 91 cards and takes about a month again at 3 cards a pack; `pacing.txt` has what 4 and 5 would do.
- **A deck is 40 cards** (`DECK` in coll.js; 30 until 2026-11-11): each ready deck is 20 different cards, two of each.
  The five each one gained are `GROWN` in cards.js (the second printing: 25 Figures, all with skills the engine already
  had). A collection from before (`v` 1) is given the five new cards of its starter deck and of any other ready deck it
  owned all of, so nothing it could play is lost; a 30-card deck someone built is kept as it is and reads as 10 short
  until it is filled (Finish the deck for me does that). Counts on screen come from `DECK` and the card list. Its screens are
  `library.js`, `packs.js` and `decks.js`, each in the shared frame `AnoriaUI.screen()`.
- **No fictional, mythological or legendary characters in the new printing for now** (Tim, 2026-11-11). Sinbad the
  Sailor and Gilgamesh were in the second printing for a day and were taken out. Zhang Qian, the Han envoy whose
  journeys opened the routes later named the Silk Road, took Sinbad's place in Pathfinders, and Sargon of Akkad took
  Gilgamesh's, with the same numbers and the same named Thread, The Clay Tablets (`MOVED` in cards.js carries a saved
  Sinbad or Gilgamesh over to them). A new card is a real, well-attested person. (The decision was about the 25 new
  cards. The legends among the first 66, Scheherazade, Anansi, Atalanta, Daedalus, Odysseus and Beowulf, are as they
  were, captioned as legend.)
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
  i like best"). Players read only "Legacy Line": the foot of a card ("Legacy Line from Archimedes"), the plate when
  one is made, the named lines of the collection ("The Road to Zama", in `THREADS`), the rules and lessons. A Figure
  with `insp` is still a "Legacy" Figure with "Legacy of Homer." in its text. In code the old names stay (`from`,
  `insp`, `threads`). **A Legacy Line is drawn, not described** ("explain through design not words"): under a card
  being read (`notesFor` in ui.js: what the card grew from, a gold line to the card, and on the line what that is
  worth as the game's own Spark, Might and Renown marks, then one line saying when and the true sentence); and over
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
- **A card's Legacy Line is printed on it**, in finer print under the pronunciation ("Legacy Line from Archimedes",
  "Legacy Line from the Library of Alexandria": `theName` gives a name as it reads mid-sentence). A Figure's own Legacy stays in
  its rules text ("Legacy of Homer.").
- **Drawing faults to look for in every new picture** (all found by Tim): a wrong count (Anansi has exactly eight legs: the
  picture tool can't be trusted to count, so draw several, count each at full size, and pose the thing so every one
  shows), a hand or head out of scale, something held
  that can't be read, a weapon gripped wrongly, broken objects nobody asked for, two statues of a pair facing
  different ways, a web or building that couldn't stand, and two people of one region with the same face and kit
  (give each their own age, build, dress and scene; Sun Tzu is a Bronze Age scholar in robes, not an armoured general).
- **No rows of copies** (Tim, 2026-11-11: the people following Gandhi "look too uniform and procedurally generated"). A
  crowd, column or line of near-identical people behind the subject is a fault, however far away. Draw a few particular
  people instead, each with their own age, build, dress and pose (five marchers and three villagers, four Spartans
  getting ready, three soldiers in the mist), and leave the rest out. A brief says so in words ("only three", "each
  different", "no rows or columns of repeated figures"). A formation that is itself the history (Scipio's lanes at
  Zama, Shaka's horns, the Phalanx) may stay, small and far off.
- **A full card has a plate in each top corner** (the cost at the left, the kind at the right), so a brief asks for the
  head right of centre, about a fifth of the way down, with plain sky or background in both top corners. People and
  animals in one picture are in true proportion (a rider on a small Mongolian horse is still much smaller than the horse).
- **Card text reads like normal English** (Tim, 2026-11-10): whole sentences with a subject ("She has +2 Might while
  she is outnumbered here", not "+2 Might while outnumbered here"), and a fact's two sentences follow one from the
  other. Skill words stay as bold lead-ins ("Swift.", "Guard: enemies here must clash with him first."): `boldKeys`
  and the reader's glossary key off that form.
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
- **Play mats** (Tim, 2026-11-11: "adapt the same player mat mechanic from lorcana such that they but up against each
  other under the cards played at the crossroads and each player gets their own stylized game mat"). Each player's side
  of the map (their Gate, their Outpost, their half of the Crossroads) lies on a mat of their own: two `.an-pm` in
  `.an-mats`, which takes the map's place in the table under it. The mats meet edge to edge in a seam under the
  Crossroads, two bound and stitched edges side by side, and the other player's mat is turned to face them. A player's
  mat is their Guide's, unless they chose another in **Play mats** in the game's menu (`matPicker` in ui.js, in the
  shared frame `AnoriaUI.screen()`); the choice is `anoria_mat`, and the second person's choice in pass and play stays
  with that game (`G.players[1].mat`). Lessons play on their two Guides' mats.
  The pictures are `games/anoria/ui/mats/<guide>.webp` (1344 x 576, made like the card pictures): printed cloth in the
  cards' inked style, true to the Guide's own world, dark and close in tone, with no people, no faces and no lettering.
  The Place tiles cover the middle third, so what is worth seeing sits left and right of it. **A mat for a new Guide is
  one line in `MATS` (ui.js) and its picture**; until a Guide has one, that Guide plays on the chart of Anoria in their
  faction's colour. The mats are built once and stay with their players (`paintMats`): no step of the game redraws
  them, and in pass and play they change places with the board at the hand-over. A new mat is checked on the table
  under pieces of both players' colours, at every size, before it goes in.
- **Buttons**: every `.btn` on Anoria's page takes one skin from the end of `ui.css` (the main action a brushed brass
  plate with an engraved rule, the rest dark enamel with a gilt edge, words in the book face with plain digits). A
  screen doesn't restyle its own buttons' colour or face; size and layout only.
- **How to play** is `games/anoria/guide.js` + `guide.css` (`AnoriaGuide`), opened by the bar's ? and the menu (`Kit.init`'s
  `guide` option; the rules on one page are still `Kit.rules()`). The quick start (shown once, the first time Anoria
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
  remembers is never quite gone: it lives on in Anoria, the country of memory, where every age stands at once (memory
  keeps no calendar) among the wonders, where the world's memory is strongest. A great sphere turns at its heart (the
  one on every card back); each full turn ends an age, and the world can't carry all it knew into the next. So the
  greats lead companies to keep their people from being forgotten, each player one of them with a Guide. The world
  remembers whoever stands at its wonders, and that is Renown: the first company to 25 is the one the next age
  remembers. A company comes into Anoria through its Gate, held open by three Seals; hold the other company's Gate
  when a round ends and one breaks, and a company with none left is shut out and forgotten. `story()` in guide.js
  tells it in full-screen scenes made from the game's own pictures (`SCENES`, sized by `fitScene`), at the start of
  the quick start and as chapter 1. A lesson can put any scene behind its captions with `L.scene(name)` (the Your
  Guide chapter shows all five Guides with their powers: one Guide per deck, the others join at 3, 8, 15 and 25 wins
  against the computer, and each is a new way to play). The rules page opens with the same story. Anything new that
  explains the game starts from the goal and why, then the how, and new cards, powers and screens keep to this story
  (memory, being remembered, the sphere, Gates and Seals).
- **Adding a card to the set**: an entry in cards.js (existing keywords and `arr` effects need no engine work), one in
  text.js (`cap`, `ll` as [lon, lat], `tx`, `fact`, `art` brief; `SAY`/`FY` if needed), its picture through
  `scripts/anoria/pack-art.sh`, then `node scripts/anoria/run.js cards 6000` (its win rate beside cards of its cost)
  and `pacing.js`. Counts everywhere come from the card list. Blackbeard (2026-11-11) is the first card outside the
  five ready decks: he is found only in packs.
- A rule or number change is tested first: `scripts/anoria/variant.js` (the ready decks under a change), `skill.js`
  (the robots), `dice.js`, `copies.js`; see `scripts/anoria/README.md`.

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
