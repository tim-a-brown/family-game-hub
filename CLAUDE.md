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
  laurel read `WIN` in guide.js. A round limit of 14 that only a stand-off reaches, clashes roll two ordinary dice (`dice: 'high'`), both copies
  of a person can stand on your side at once (`unique: 0`, Tim, 2026-11-12; it was one of each), a Legacy Figure has +1 Might for each
  person it names who is in play on its side (`inspEach`; two copies of one person count once), the second copy returns for 1 less (`ret`), and Threads (`threads`): any card can name what
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
- **No fictional, mythological or legendary characters for now** (Tim, 2026-11-11: first the new printing, then "pull
  the six legend cards from the first printing too", then "pull the trojan horse too"). Nine cards left the set and a
  real, well-attested person (for the Deed, a real event) has each one's slot, with the same faction, cost, Might and
  skills, in the same ready decks: Scheherazade to Harun al-Rashid, Anansi to Yaa Asantewaa, Atalanta to Artemisia of
  Caria, Daedalus to Bessie Coleman (first to Amelia Earhart, until the hundred-year rule below), Odysseus to Ferdinand Magellan, Beowulf to Alfred the Great, the Trojan Horse to
  Night Crossing (Washington on the Delaware), Sinbad to Zhang Qian and Gilgamesh to Sargon of Akkad. A new card is
  a real person with a record to point to, and its power is true to that person.
- **A card that leaves the set goes into `RETIRED`** (cards.js, with `to`: the card that has its slot; its words go
  into `RETIRED` in text.js and its link sentences into `OLD_LINKS`; its picture stays in art/). Then nobody loses
  anything and nothing shows blank: a collection and the decks someone built hold the new card instead, as many
  copies (`retire()` in coll.js, which goes by the keys it finds, so a device that hasn't updated can't undo it); no
  pack, ready deck or Library holds a retired card, because they all read the set (`C.CARDS`); a game saved with a
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
  pack has an edition; a foil is always one you have not found for that card, it is the card's for good on every
  copy, and one of a card you already have two of is an extra card in its pack, so the set takes as long as it did.
  Once the set is complete the packs go on turning up foils until none are left. Found editions and the one each card
  is shown in are `ed` and `look` in `anoria_coll` (v 4; an older collection has every card Matte, and `retire()` hands a retired
  card's editions to the card that has its slot). The looks are
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
  card as a small mark at the foot of its ribbon, in the edition's finish: a dot, a diamond, a four-point star, a
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
  with `insp` is still a "Legacy" Figure with "Legacy of Homer." in its text. In code the old names stay (`from`,
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
  words stops short of the lines. A Figure's own Legacy stays in its rules text as well ("Legacy of Homer.").
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
- **Card text reads like normal English** (Tim, 2026-11-10): whole sentences with a subject ("She has +2 Might while
  she is outnumbered here", not "+2 Might while outnumbered here"), and a fact's two sentences follow one from the
  other. Skill words stay as bold lead-ins ("Swift.", "Guard: enemies here must clash with him first."): `boldKeys`
  and the reader's glossary key off that form.
- **"When you play him", not "when he arrives"** (Tim, 2026-11-11: "i keep seeing 'when he arrives' -- does that mean the
  same as 'when this card is played'?"). It does: the power works when the Figure comes onto the map from a hand, by
  its own cost or by a Deed like Night Crossing, and never when it walks. So a card says "When you play her, you gain
  1 Spark", "Scholar: you draw a card when you play him", "Swift: he can walk on the turn you play him", and the
  rules and lessons say "you play a Figure at your Gate". check-set.js holds a card with an `arr` effect to "When you
  play him" or "her". In code the event is still `arrive`.
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
- **Play mats** (Tim, 2026-11-11: "adapt the same player mat mechanic from lorcana such that they but up against each
  other under the cards played at the crossroads and each player gets their own stylized game mat"). Each player's side
  of the map (their Gate, their Outpost, their half of the Crossroads) lies on a mat of their own: two `.an-pm` in
  `.an-mats`, which takes the map's place in the table under it. The mats meet edge to edge in a seam under the
  Crossroads, two bound and stitched edges side by side. In pass and play the other player's mat is turned to face
  them; against the computer it stays upright. A player's mat is their Guide's, unless they chose another in **Play
  mats** in the game's menu (`matPicker` in ui.js, in the shared frame `AnoriaUI.screen()`): another Guide's, the
  chart, or one made from a card's picture and placed by hand (see "Play mats made from a picture"). The choice is
  `anoria_mat`, and the second person's choice in pass and play stays with that game (`G.players[1].mat`). The
  computer's mat is always its Guide's. Lessons play on their two Guides' mats.
  The pictures are `games/anoria/ui/mats/<guide>.webp` (1344 x 576, made like the card pictures): printed cloth in the
  cards' inked style, true to the Guide's own world, dark and close in tone, with no people, no faces and no lettering.
  The Place tiles cover the middle third, so what is worth seeing sits left and right of it. **A mat for a new Guide is
  one line in `MATS` (ui.js) and its picture**; until a Guide has one, that Guide plays on the chart of Anoria in their
  faction's colour. All twelve Guides have one (the roster of twelve's seven, 2026-11-12, with their sources in the comment over `MATS`; resting on memory there: the knot garden's acorn border, how Saladin's carved panel and the Citadel's tower looked, the phoenix as Empress Wu's emblem, Timbuktu's toron beams). The mats of Guides who left stay in `MATS` for saved games, and the picker offers only today's Guides' mats and the chart. **What a mat draws is checked against a text that can be read** (archive.org
  full texts are reachable; most museum sites are not): the comment over `MATS` names the source for each. Still resting
  on memory, to be checked when a source can be read: the colours and figures of Thembu beadwork and the aloes
  (Mandela), the shape of the Vijapur spinning wheel (Gandhi), the look of the Curies' instruments, the zigzag fence
  and the bunting (Lincoln), how the nine-tailed standard was made (Genghis Khan), the sage and fern leaves, the press
  and the Leyden jar (Franklin), the marsh and pines (Tubman), the wing, water and plant studies and the red-prepared
  paper (Leonardo), the wave scroll (Cleopatra), and the number of cords on a bamboo book (Sun Tzu). The picture tool
  cannot count: Genghis Khan's standard came out with eight tails every time, and the ninth was put in by hand. The mats are built once and stay with their players (`paintMats`): no step of the game redraws
  them, and in pass and play they change places with the board at the hand-over. A new mat is checked on the table
  under pieces of both players' colours, at every size, before it goes in.
- **Looking through the table's cards** (Tim, 2026-11-11: "the eye icon to view cards is not a great mechanism for
  seeing the cards closer. tap and hold is one. carousel on each domain with a swipe up and down to my cards at each
  domain down to my hand (with a side map to represent which group/level of cards im scanning through might help.)
  and need to include ways to act on cards as I scan through them in the carousel"). `scan({u} | {p} | {h})` in ui.js:
  a hold on any card on the table (`holdToScan`; a right click with a mouse), or a tap wherever a tap used to open one
  card, opens the table's cards in levels, top to bottom as the table lies: the other player's Guide and Relics, the five
  Places, your Guide and Relics, and your hand last. Sideways is the strip (`makeFlow`, a fresh one for each level);
  up and down is a swipe, the wheel, the arrow keys or a tap on the map at the left. **What the other player has is
  in view at every level** (Tim, the next day: "it's also good to know what opponents have at each level too"): a
  Place's level opens on the Place's own card with the other player's Figures to its left and yours to its right, as
  they lie on the table; each thumbnail is ringed in its player's colour, and the line under the Place's name says
  whose card is in front, in that colour. The map is the table made small: on each Place a dot for each Figure and
  the Might they have there, the other player's at the top left and yours at the bottom right; each Guide in a ring
  of its player's colour with brass diamonds for Relics, and the other player's hand as a card's back with the count.
  A tap on a Guide or a Relic on a player's strip opens that level. **The caption has no eye button** (Tim: "remove
  the eye icon if its function is covered elsewhere"): a hold on the card does that. Under the card in front are
  buttons for what can be done with it now (`scanActs`: Play, Play at, Move to, Jump to, Clash with, Discard, each
  with its Spark cost where it has one); a card that needs more than one thing chosen has Choose on the table, which
  selects it there; a card in your hand that can't be played says why. A button's move is checked against the legal
  moves again when it is tapped. The computer does not move while cards are being read. Lessons keep the plain
  single-card reader (`openView`). A new kind of move gets its button in `scanActs`.
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
  the game's menu (`anoria_step` '0'); then the computer plays through and the fast-forward button is there as before.
  Lessons and the test hook's `turbo` never wait. A new kind of move gets its sentence in `moveSaid`.
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
- **Domains** (Tim, 2026-11-11, decided on the Places prototype in `scripts/anoria/places/`; being built). The card
  that lies at a Gate, an Outpost or the Crossroads is a **Domain**: one word, not Place, wonder or location (the
  game's words still say Place until the build's sweep). A Domain has one **kind**, said as part of its name (a
  Commerce, Industry, Thought, Land, Culture, Law or Routes Domain: holding the markets, workshops, schools,
  strongholds, stages, courts and roads of an age is how people held the age, and a kind's rule pays what holding
  that kind of place gave them) and one **home region**, the Figures' own regions; kind and home must both be plain
  from the card's border and plates. Each player brings a **stack of 15 Domains**, no two the same, chosen from a
  collection that can hold more. Set-up: draw four (`suDraw`; three until Tim's choice on 2026-11-12), one to your Gate, one to your Outpost, one under your
  stack, and one offered for
  the Crossroads; each player rolls a die, the higher roll's offer is the Crossroads and the other player takes the
  first turn. The Crossroads' owner wins ties there while they have a Figure there, and nothing more. Domination (a
  win by holding every kind) is left out as too complicated. **The game must translate to a real table**: whose
  Domain each one is (a banner in the player's colour that travels with the card, since cards may swap, reverse or
  shuffle Domains), a marker for a rule that is silenced or changed, and a track for rounds and turns are all drawn
  on the device as the pieces a person would use.
- **Twelve Guides** (the roster of twelve, Tim, 2026-11-12). The first five each bring a ready deck: Cleopatra (Court),
  Leonardo (Explorers), Tubman (Pathfinders), Sun Tzu (Legion) and Shakespeare (Legacy, which was Franklin's). Marie
  Curie, Joan of Arc, Saladin, Empress Wu, Akbar, Mansa Musa and Sor Juana join as wins against the computer add up
  (`GUIDE_AT` in coll.js: eleven steps, the last at 48 wins) and guide a deck the player builds. Their powers, as a
  player reads them, are in `GUIDES` in text.js; Sor Juana's is "Your Scholar Figures cost 1 less" (Tim's choice: her
  first draft was Franklin's cheaper Deed). **A Guide is never also a card**, so the seven left the set as cards
  (`RETIRED`, with `to`) and five people took their slots in the ready decks with the same faction, cost, Might and
  skills (Tim's choice): Joan's slot is Genghis Khan's, Saladin's Baibars', Shakespeare's Molière's, Mansa Musa's Askia
  the Great's and Sor Juana's Christine de Pizan's; Benjamin Franklin and Abraham Lincoln became cards of the third
  printing in Wu Zetian's and Akbar's slots. **Legacy Lines moved to the new cards where the history allows** (Tim's
  choice): Timbuktu and the Trade Caravan to Askia, Encore and Goethe's Legacy to Molière, Sappho to Christine; The
  Stage, The Bard, The Lionheart and The Tenth Muse could not move and were removed. **A Guide who leaves the roster**
  goes into `OLD_GUIDES` (cards.js, with `to`; their words in text.js): whoever had Franklin, Genghis Khan, Lincoln,
  Mandela or Gandhi has Shakespeare, Joan, Saladin, Empress Wu or Akbar instead (`retire()` and `myDecks()` in coll.js),
  a game saved with one plays on with that Guide's power (engine.js keeps every power by key), and the table and the
  history show them through `TXG` (ui.js) and `card()` (hist/anoria.js). A Guide's power is measured with
  `node scripts/anoria/guides.js` (every ready deck under that Guide against the others under their own); the record
  of every draft and its figure is `scripts/anoria/guides.txt`. A new Guide needs a picture, a text entry, a mat
  (`MATS` in ui.js; without one the chart is used) and that measure.
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
  `pr: 4`, found only in packs, from the whole set like every card; Pachacuti is the thirteenth; Congress of Vienna is the one with dice, whose roll is the `congress` event). The collection (coll.js v 5) holds
  Domains (`doms`), a stack for every deck (`stackFor`, `saveStack`, `autoStack`: 15, no two the same, any kinds and
  homes) and Domains in packs (`DOMAINS_IN_PACKS`, `WELCOME_DOMAINS`, `DOMAIN_SLOT`). Every script in scripts/anoria
  plays with Domains (`dm` in `STD`; `'{"dm":0}'` is the old map); `scripts/anoria/domains.js` asks the Domain
  questions and `domains.txt` has the answers. A Domain's picture brief is `art` in text.js with how sure it is (`bs`);
  Every Domain and Domain card has its pictures (2026-11-12, the batch's notes in the session scratchpad's `domains-art/`). ui.js has only what keeps today's table
  working, with each seam for the screens marked `SEAM`.
  **Domains are off on the page until their screens are built** (`DM_LIVE` in cards.js): the page's new games are on
  the old fixed map, the Domain cards are not in its set, packs hold no Domains and cards read their old-map words
  (`k0`, `tx0`). The scripts always have everything; a page opened with `?domains=1`, or with `anoria_dm` '1' on the
  device, plays with Domains. Turning Domains on for everyone is `DM_LIVE` returning true.
- **Ten Guides** (2026-11-11). The first five each bring a ready deck; Genghis Khan, Marie Curie, Abraham Lincoln,
  Nelson Mandela and Gandhi join as wins against the computer add up (`GUIDE_AT` in coll.js: nine steps, the last at
  about the time the card set completes) and guide a deck the player builds. A Guide's power lives in engine.js by the
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
  was dropped and why, and five cards that still need engine work (`needsEngine`: Damascus Steel, Abacus, The Peace of
  Westphalia, The Lisbon Earthquake, The Edict of Milan). `node scripts/anoria/check-set.js` checks the whole printing
  (words against skills, every Legacy Line, the briefs, the game's files against the JSON). A Guide is never also a card.
- **A Relic's or a Deed's effect belongs to its data** (`fx`, read with `E.fxOf`; a card without one has the effect of
  its own key). The engine has three Relic powers (the Compass's, the Printing Press's, the Antikythera Mechanism's)
  and eleven Deed effects, and nothing in engine.js or ui.js asks a card for its name: the Astrolabe is a Compass in
  effect, Testudo a Phalanx, Mailed to Freedom runs what Night Crossing runs. A new Relic or Deed with an effect the
  engine has is data only; its rules text is the text of the card its `fx` names (check-set.js holds it to that).
  **Two Relics**: "You can have 2 Relics in play at a time, and they have to be Relics with different powers"
  (`hasFx` in engine.js; RULES and the Relics lesson say it). So nothing stacks, and a Legacy Line between two Relics
  with one power could never be made (check-set.js refuses it: the Sextant jumps so that its line from the Astrolabe
  works). Letting a power count twice was tried (`scripts/anoria/relics2.js`, `set-150-balance.txt`): it made no
  difference the robots could measure, so the rule is the one that is a single sentence and has nothing to add up,
  and it is what the game already did with a second copy of one Relic. A Relic in your hand that can't be played
  says why under the card when you read it (`notesFor`).
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
- **Packs draw from the whole set, 5 cards each** (Tim, 2026-11-12: "all series should be available in packs, no
  requirement to have both of every card first, until we have special sets in the future - do 5 cards. keep allowing a
  player to collect cards until they've covered all the different styles too. the player can only put two in a deck
  though"). `PACK_ORDER` is `'mixed'` and `DAILY`/`FEAT` are 5 in coll.js; the series code stays for special sets
  later. Every card is collected to two copies, and the packs go on turning up finishes (editions) until every card
  has all five. A deck holds no more than two of a card. At 3 games a day the whole set takes about 71 days.
  Domains (when they go in) come in half of the earned packs (`DOMAIN_SLOT` 0.5, Tim's choice the same day).
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
  real-life translation"). The card at each of the map's five positions is going to be called a Domain (the game's
  words still say Place until the rules work lands; the prototype is `scripts/anoria/places/`). The look is
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
  - **Banners, markers, counters** are built and shown on the art proof, and are not on the live table until a rule
    uses them: a player's banner (a pennant on a brass pin in their colour, the second player's swallow-tailed, on
    their own side of the tile), a veil of ash over a silenced rule (the rule struck out, still readable), a pen-nib
    token and a dotted line for a rule changed for a while, bone counters 1 to 5.
  - **The round track** is on the live table: an enamel rule with the rounds engraved along it, a slide at this
    round in the colour of whoever's turn it is (brass during the count), a gem at a round where something is due
    (Lincoln's Seal at round 5). It lies along the edge of the map that faces the caption (under the map upright,
    down its right side sideways), in the gap and over the mats' bound edge, so the map and the hand keep their
    size: a change to the table's layout is checked against the map's and hand's boxes and `--fw`, `--mw`, `--hw`.
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
