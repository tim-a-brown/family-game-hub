# Carmen Sandiego clue data format (games/carmen/data-<version>.js (this note lives in scripts/ so it is not published))

One plain JS file per version, no build step, loaded with a <script> tag:

```js
// Where in <Region> Is Carmen Sandiego?: places and clues. Facts checked <date>.
(window.CARMEN_DATA = window.CARMEN_DATA || {}).<version> = [
  {
    id: 'paris',                 // lowercase a-z0-9 only, unique in the file
    name: 'Paris',               // the city/place as shown on screen
    country: 'France',           // country (USA version: the state; Time version: the civilisation/realm, e.g. 'Ancient Egypt')
    year: null,                  // Time version only: a number, negative = BC (e.g. -2560, 1776); everything else: omit or null
    lat: 48.86, lon: 2.35,       // real coordinates, 2 decimals
    blurb: 'Paris, the capital of France, sits on the River Seine. ...',   // 2 short factual sentences shown on arrival
    treasure: ['the tip of the Eiffel Tower', "a page of Victor Hugo's Les Miserables manuscript"],   // 2 whimsical but place-true things a thief could steal
    scene: { k: 'eiffel', sky: 'day', land: 'city', trees: 'leafy' },   // picture recipe, see below
    clues: [                     // 12 clues, at least 8 different tags; each a full sentence about where the suspect is HEADING
      ['money', '{S} changed {P} money into euros.'],
      ['flag',  '{S} asked about a flag with vertical blue, white and red stripes.'],
      ['lang',  '{S} was brushing up on {P} French.'],
      ['sight', '{S} wanted to climb an iron tower built for the 1889 World\'s Fair.'],
      ['geo',   '{S} said {s} was going to a city on the River Seine.'],
      ...
    ]
  },
  ...
];
```

## Clue rules
- Witness voice, past tense, about the suspect's NEXT destination. Use tokens for the suspect: `{S}` He/She at sentence start,
  `{s}` he/she mid-sentence, `{P}` his/her, `{O}` him/her. Every clue must contain at least one token.
- Tags: money, flag, lang, sight, geo, hist, culture (food, sport, music, art, festivals), people (a famous person from there),
  nature (animals, plants). Time version adds era (what was happening that year), invention, and may use hist/people a lot.
  USA version: use `flag` for the state flag, `money` is not used; add `symbol` (state bird/flower/tree/nickname/motto) and `capital`.
- Clues should be gettable with an atlas or encyclopedia, like the originals: mix easy (famous landmark) and harder (currency,
  river, flag details) ones. Never name the destination city or its country/state outright (no "{S} wanted to visit Paris").
  Naming a landmark, river, leader of history, currency or language is fine.
- No clue may fit another place in the same file equally well (e.g. "{S} changed money into euros" alone fits 20 European cities:
  in the Europe file pair currency with something specific, like "{S} changed {P} money into euros and asked where the Atomium is").
- Facts must be correct as of October 2026 (e.g. Croatia uses the euro since 2023, Bulgaria since January 2026; Sierra Leone's
  leone was redenominated; no living politicians or current office-holders). Verify anything you are not sure of.
- Plain text, straight apostrophes escaped as needed, no emoji, no HTML.

## Picture recipe (scene)
k = the landmark drawn as pixel art. Pick the closest one:
eiffel, needle (TV/observation tower: CN Tower, Space Needle), clocktower (Big Ben-like), dome (big domed basilica/capitol with
columns), onion (onion domes), pyramid (Egyptian), steppyramid (Maya/Aztec), pagoda, temple (Greek/Roman colonnade), colosseum,
mosque (dome + minarets), taj (white domed tomb with minarets), skyline (skyscrapers), suspension (suspension bridge),
statue (robed statue, raised torch arm), redeemer (statue arms outstretched on a peak), opera (sail-shaped roofs), castle,
cathedral (gothic twin spires), arch (triumphal arch), gatewayarch (steel parabolic arch), windmill, mountain (snow peak),
volcano, wall (great wall over hills), stupa (golden bell stupa / wat), torii (shrine gate), mesa (desert buttes),
beach (palms and sea), falls (waterfall), savanna (acacias and animals), jungle, glacier, fjord, canal (tall gabled canal houses),
monolith (Uluru-like rock), tablemtn (flat-topped mountain over a city), rockcut (Petra-like carved facade),
mudmosque (Sahel adobe mosque), stonehenge, moai, village (thatched huts), harbor (port with ships), lighthouse,
palace (long palace with gardens), terraces (mountain terraces / Machu Picchu), camp (tents/yurts), longship (Viking ships),
capitol (white domed capitol), cabin (log cabin / frontier town), oasis (palms and dunes), sphinx.
sky: day | dawn | dusk | night | overcast.   land: city | grass | desert | snow | jungle | savanna | sea | rock.
trees: palm | pine | leafy | none.   Optional c: '#rrggbb' main colour of the landmark, c2: accent colour.
Use variety: neighbouring entries should not all be the same k.
