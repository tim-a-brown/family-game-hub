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
  end from its very first pixels, since iOS decides on the first move whether a drag scrolls.
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
  window shaped like a phone or tablet on the device layout); Arvela (`deskPlan` in ui.js, two players: Figures and the
  hand sized together, the bars stood on end as pillars with the Guide, its power and the Relics by name, cards from 150px
  wide saying their power, the last events beside the hand, the face-off's `.big` with whole cards from 330px). The
  scratchpad's `fill/audit.js <shapes> <games> --shots [--root=<worktree>] [--out=<folder>]` opens a game's table through
  its demo at eight desktop windows (A 2100x1860, B 3024x1964, C 1512x982, D 1600x560, E 720x1700, F 1000x1000, G 1280x720,
  H 560x620) and measures the share of the window it covers; each pilot's own proof scripts are in `big/<game>/`. **Not
  done yet**: `Kit.setup` and `Kit.win` in a large window (a small column and a small card in an empty window, in every
  game), the demo's captions, and every game outside the pilot.
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
  just starred flies from its section into Favorites. The pencil took the list and
  tiles button's place (Tim, 2026-11-17: "relegate the list view option to the app menu and put the added pencil in its
  place. Period. Tile view is default for everyone"): Show games as a list is in the profile menu under Home screen
  (`toggleView`, `gn_home_view`), and every device went to tiles once (`gn_tiles_once`, which syncs, so a list chosen
  since stays chosen). The top bar holds three buttons: the pencil, the bell and you. **The greeting stays on one line**
  (Tim, the same day: "what happens for long user names?"; it wrapped to four lines and pushed the screen down):
  `fitHi` in index.html tries the whole name, the first name, "Hi" for the time of day, a household's name without
  "The" and "Family", then a step smaller, and only then cuts the name short with an ellipsis (user-typed text).
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
- **Easy** (Tim, 2026-11-15: "nudge mexican train easy up slightly"): any tile that fits, but a little more than half
  the time it looks first (its own train when its marker is out, a double it can follow, a heavier tile): `EZ` in the
  core. The sim (mulberry32 now) has Easy winning about 1 match in 5 against Normal head to head, 1 in 15 against Hard.

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
