# Go Fish's themed decks: how the pictures are made

Tim (2026-11-15): "in go fish, create 10 different decks with their own special art in refined cartoon (not AI's first
pass) look for things like: Space, Cats, Dogs, Zoo Animals, Food, Flowers, Sports, Jobs, US States, Countries".

- The decks themselves (names, the 13 subjects of each, how each is said, colors) are `games/gofish/decks.js`.
- The pictures are `games/gofish/decks/<deck>/<key>.webp` (360 px, the card faces) and `<key>-t.webp` (120 px: books,
  the back's emblem, moments, history). They are not precached; the page fetches a deck's 26 pictures when a game with
  it starts.
- `briefs.js` here has the house style (`STYLE`, `TAIL`, `PEOPLE`, `PLACE`) and every subject's brief. The style was
  chosen by testing four style blocks on the same subjects from different decks (a tiger, a calico, a rocket, a taco,
  a firefighter, a corgi) and keeping the one that read as designed rather than generated: few big deliberate shapes,
  thin outlines in a darker shade of the color beside them (never black), flat matte color with one shadow and one
  highlight shape, a fine grain.

## Making a picture
1. `node scripts/gofish-decks/briefs.js <deck,...> [key,...] > jobs.json` writes the prompts (style, palette, brief, tail).
2. `python3 scripts/gofish-decks/gen.py jobs.json <folder>` asks the picture tool (model "gpt-image-2", 1024 x 1024,
   `Authorization: Bearer dummy`: a proxy adds the key; never ask for or print one) at most 3 at a time, waits and
   retries on a 429, and writes `<deck>-<key>.png`. Work in a folder outside the repo.
3. Look at every picture at full size. Reject a wrong count (legs, fingers, petals, wheels, minarets, a pagoda's
   roofs, the fins of a rocket), any letters or writing, anatomy faults, a wrong fact, a subject cut off by the edge,
   and anything that looks off-style next to the rest of its deck. Say what was wrong in the brief and make it again;
   the corrected brief stays in `briefs.js`.
4. Put the chosen pictures in a folder as `<key>.png` for each deck and run
   `DECKS_JS=games/gofish/decks.js python3 scripts/gofish-decks/pack.py <deck> <folder> games/gofish/decks/<deck>
   scripts/gofish-decks/outlines.json` (Python with Pillow and NumPy). It cuts the subject from its plain background
   (a flood fill from the edges, stopped by the drawing's own outlines), scales every subject to fill the frame the
   same way, lays it on the deck's panel colors with a soft shadow and, for US States and Countries, on the place's
   real outline.
5. The outlines are real map data, never drawn by the picture tool: `outlines.json` is made by `outlines.js` from the US
   Census states (us-atlas) and Natural Earth countries (world-atlas), each place projected on its own (a transverse
   Mercator centered on it) so its shape is true. Run it with those packages installed in a scratch folder
   (`npm i us-atlas@3 world-atlas@2 topojson-client@3 d3-geo@3`) and `NODE_PATH` pointing there.
6. Make a contact sheet of the deck and look at it whole for sameness and for anything that stands out from the set.

A new deck is one entry in `DECKS` (decks.js), its briefs here, its pictures, and a check with `scripts/gofish-sim.js`
(every subject must have its words).
