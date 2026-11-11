# Making Anoria's card pictures

(Kept in the repo so it outlives a session: the procedure every picture batch follows, with `gen.py` (makes pictures
from a list of prompts), `art-in.js` (packs a batch's finals into the game, sets `FY`, puts the briefs back) and
`sync-json.js` (keeps set-150.json's briefs the same as text.js). A batch works in a folder of its own outside the repo.)

Everyone making pictures follows this one procedure, so the set looks like one set.

## Where things are
- The house rules for pictures are in /home/user/family-game-hub/CLAUDE.md, section "Anoria (the card game)": read
  "True to history, no stereotypes", "As accurate as the record allows", "Drawing faults to look for in every new
  picture", "No rows of copies", "A full card has a plate in each top corner", "A picture's subject stays in view",
  "Art proof". They are the owner's own corrections; every one was a real fault he caught.
- A picture is made by POSTing to https://api.openai.com/v1/images/generations with model "gpt-image-2", size
  "1024x1536", quality "medium", header `Authorization: Bearer dummy` (a proxy adds the real key: never ask anyone
  for a key, never print one). A working script to copy: this folder's `gen.py` (it reads `redo-jobs.json`: a list of
  `{k, prompt, size}`, writes `<k>.png` beside itself, retries, and prints "ALL DONE"). Run at most 3 requests at a
  time (others are generating too); on an HTTP 429 wait and retry.
- The prompt is the house style, then the palette for the card's faction, then the card's brief, then the tail:
  STYLE = "Graphic novel trading-card art in a screen-printed poster style: flat bold colour shapes, heavy black spot shadows, a limited palette of four or five inks, visible halftone dot texture and slightly offset print registration, rough paper grain, a strong silhouette and an angular, dynamic composition seen from a low angle, stylised expressive faces with real character, not pretty or idealised. No airbrushing, no soft glow, no glossy rendering, no photorealism, no smooth gradients. Full bleed, no text, no letters, no numbers, no border, no frame. Portrait orientation. Subject: "
  PALETTE by faction: D "cobalt blue, orange, black, cream"; S "deep teal, ochre gold, black, cream"; V "crimson, steel grey, black, cream"; A "ochre, terracotta red, black, cream"; W "plum purple, jade green, black, cream"; N (Relics, no faction) "brass gold, sea green, black, cream". Written as "Palette: <inks>. " before the brief.
  TAIL = " Every person in the picture is a particular individual; no rows or crowds of identical or repeated figures anywhere. Correct anatomy: two arms and two hands on each person, five fingers on each hand, heads and hands in natural proportion; each animal has the right number of legs. Everything in the picture could really be built and could stand: each wall, building, ship, machine and piece of furniture is one solid object drawn in one consistent perspective, every rope or chain is tied or held at both ends, and nothing is mirrored or repeated (no matching pairs or rows of smoke plumes, tents, trees or clouds). People, animals and objects are in true proportion to one another: people at the same distance are the same size, people farther away are smaller, and doors, furniture, tools, weapons, vehicles and animals are the right size for the people beside them."
  CORNERS (the end of every brief) = " Keep the top left corner and the top right corner of the picture plain: the card's own labels cover those two corners. Nothing round hangs or stands in those corners: no plates, dishes, bowls or medallions." Never write "a plate sits in each top corner": the tool draws dinner plates there.
  WHERE THE HEAD GOES: "three fifths of the way across the picture and a quarter of the way down". A full card shows only about 11% to 60% of the picture's height, so a brief says what must be in the upper half.
- Earlier work to look at for the standard (do not edit): the pictures in /home/user/family-game-hub/games/anoria/art/
  and this session's earlier folders `../nine/` (nine cards, with a second round that fixed three faults) and
  `../art2/` (24 cards, NOTES.md).

## The procedure for each card
1. Read the brief as written for the card. If the brief itself is at fault by the house rules (a crowd, a head in a
   corner, a size not given as a ratio, a doubtful detail), fix the brief first and keep the corrected text: the
   corrected brief goes back into the game with the picture.
2. Generate two candidates. Look at each at full size yourself. Reject for any of: a wrong count of anything
   countable; a hand, head or animal out of scale (a rider must be much smaller than the horse); a tool or weapon held
   wrongly or facing the wrong way (an axe edge, a bow, a pen); **impossible geometry** (Tim: Ibn Khaldun's "impossible
   wall with mirrored generated smoke"): a wall with two faces or a second wall growing out of it, a building, ship,
   bridge, stair or machine that could not be built or could not stand, two perspectives in one object, a rope or
   chain that is not tied or held at both ends, one thing passing through another, a floor or ground that tilts two
   ways, shadows falling two ways, anything mirrored or repeated like a stamp (matching smoke plumes, tents, trees,
   clouds, windows that do not line up); **wrong relative sizes** (Tim: "be careful with relative sizes of people
   near each other or interacting with other objects"): two people at the same distance with heads of different
   sizes, a person in the background larger than one in front, a child as big as an adult, a hand, tool, weapon,
   book, cup, chair, table, door, boat, cart or animal too big or too small for the person using it, a person too
   big for the doorway, boat or saddle they are in, a building or ship too small for the people beside it. Check
   each by measuring: head heights against each other, a door against the person, a rider against the horse;
   an anachronism the brief ruled out (stirrups before
   their time, a telescope before 1608, a wrong flag); a ship, building or machine that could not work (a ram at the
   stern, a wheel with no axle); rows or crowds of near-identical people; two people with the same face; text or
   letters; a subject's head in the top left or top right corner or cut by the top edge; the thing the card is
   about lying in the lower half only; a composition that repeats another card's. For a real person with a known
   likeness, it must be a respectful, recognisable likeness at the documented moment.
3. If neither passes, say in the prompt exactly what was wrong and what the right thing looks like (name the parts,
   give the ratio, say what must not be there), and generate again. Up to four rounds; after that keep the best,
   and write down plainly what is still wrong with it.
4. Keep the chosen PNG as `final/<key>.png` in your own batch folder, every candidate with its prompt in `out/`, and
   one line per card in `NOTES.md`: tries, what was rejected and why, any reservation, and the corrected brief if
   it changed.
5. Check the chosen picture on the real card before you call it done: copy it into your worktree with
   `bash scripts/anoria/pack-art.sh <your final folder>` (it writes games/anoria/art/<key>.webp and art/t/), open the
   card full size and small (the art proof `games/anoria.html?art=1&only=<key>,<key>` or `AnoriaUI.openView(key)`), and
   make sure the subject is not behind the text or under the corner plates; set the card's `FY` in text.js (0 keeps
   the top of the picture, 100 the bottom) when the default crop cuts the subject.
6. Make a contact sheet of your finals with names (ffmpeg tile is enough) and look at the whole sheet for sameness:
   too many raised arms, the same three-quarter stance, the same sky.

Report the pictures you are NOT happy with first. A picture with a fault the owner would catch is worse than a
missing picture.


## Figure batches

What differs for batches of Figures.

- The cards are in the game now. A card's brief is its `art` in /home/user/family-game-hub/games/anoria/text.js
  (`node -e "const T=require('/home/user/family-game-hub/games/anoria/text.js'); console.log(T.CARDS['<key>'].art)"`),
  its faction is `f` in games/anoria/cards.js (`require('.../cards.js').CARDS[key]`), and its `cap`, `tx` and `fact` in
  text.js say who the person is. scripts/anoria/set-150.json has each card's `check` and `src` notes (what was verified).
- Do NOT edit, commit or push anything in the repo, and do not run pack-art.sh. Your output is `final/<key>.png`,
  `out/`, `NOTES.md` and `briefs.json` (key to the brief as finally used, for every card) in your own batch folder.
- Checking on the real card (step 5): the site is served at http://localhost:8799 (if it does not answer:
  `cd /home/user/family-game-hub && (nohup python3 -m http.server 8799 >/dev/null 2>&1 &)`). With Playwright
  (`require('/opt/node-tools/node_modules/playwright')`, chromium, viewport 402x874, deviceScaleFactor 2; addInitScript
  sets localStorage `fgh_mode`='guest', `gn_tour_seen`='1', `my_name`='Tim', `gn_sound`='0', `anoria_guide`='{"qs":1}'):
  open http://localhost:8799/games/anoria.html; route `**/anoria/art/<key>.webp` and `**/anoria/art/t/<key>.webp` to
  your candidate PNG with `page.route` (`route.fulfill({ path, contentType: 'image/png' })`); the page skips pictures
  for unpainted cards, so first run `await page.evaluate(k => { delete AnoriaText.NOPIC[k]; }, key)`, then
  `await page.evaluate(k => AnoriaUI.openView(k), key)`, wait a second, and screenshot. If the picture does not show
  that way, fall back to routing an existing Figure's picture (`**/anoria/art/archimedes.webp`) to your PNG and opening
  'archimedes'. Look at the screenshot: the person's whole head is in the picture window, clear of the cost plate at
  the top left and the kind plate at the top right; what the card is about is not hidden behind the paper. Try `FY`
  values with `document.querySelector('.view .ac-art img, .view .ac-art canvas').style.objectPosition = '50% <n>%'`
  and write down the one the card needs (the default is the top; most cards need none).
- People. No portrait from life exists for many of these: age, build and dress then come from the record and the
  brief, never a generic handsome face. Where a likeness is known (a coin, a bust, a painting from life, a
  photograph), the face must be recognisably that person at the age of the moment shown. Two people from one region
  or era must not share a face, kit or pose: compare your finals with each other and with the pictures already in
  /home/user/family-game-hub/games/anoria/art/ for the same region. Twentieth-century people (Einstein, Turing, King,
  Thorpe, Owens, Kahlo, Houdini, Tenzing Norgay): a respectful, recognisable period portrait at the documented
  moment, nothing invented or caricatured.
- The owner has rejected, on earlier cards: a head cut off by the top of the card (Shakespeare); a rider drawn
  bigger than his horse (Genghis Khan); an axe held with its edge backwards (Leif Erikson); a column or crowd of
  near-identical people behind the subject (Gandhi, Mansa Musa, Leonidas, Caesar); stirrups before their time; a ship
  with its ram at the stern; a spinning wheel with the wrong kind of rim. He looks closely at tools, weapons,
  instruments, animals and anything countable.
