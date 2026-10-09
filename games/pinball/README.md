# Pinball 3D: table authoring guide

Everything a table builder needs. The engine (`engine.js`), physics (`physics.js`), component library
(`components.js`), graphics helpers (`gfx.js`), audio (`audio.js`) and display (`display.js`) are FIXED shared
code: build your table as `tables/<id>.js` and do not edit the engine unless something is genuinely missing
(then add it generically, document it here, and tell the lead). The reference table is `tables/haunted.js`:
read it top to bottom once before you start.

Files and ids are fixed (high-score keys depend on them): `haunted`, `nebula`, `pirate`, `jungle`, `neon`,
`midway`. The page `games/pinball.html` imports all six; `games/pinball.html` is the live page.

## Quick start

```js
import * as THREE from 'three';                          // only if you build models
import { spline } from '../physics.js';
export default {
  id: 'pirate', name: "Pirate's Cove", short: 'PIRATE', diff: 3, color: '#fbbf24',   // color: card accent
  desc: 'One line for the picker card.', intro: 'DMD text at game start', wizard: 'Name of the wizard mode',
  display: { type: 'dmd', color: '#ff8a1e' },             // or { type: 'lcd', ink, ink2, bg(g,w,h,t,G), font }
  music: { url: '../sounds/pinball/pirate.mp3', samples: 983040, rate: 32000 },
  speech: { pitch: 0.8, rate: 0.95, voice: 'Daniel|Male' },  // speechSynthesis voice hints (regex, first match)
  rulesHtml: '<p>How to play this table (goes in the shared rules sheet).</p>',
  theme: { ... },        // colours and lighting, see Theme
  art: { playfield(P) {...}, backglass(g,w,h) {...}, apron(g,w,h) {...}, sides(g,w,h) {...}, backboard(g,w,h) {...}, sling(g,w,h,side) {...} },
  fit: { top: 120, lookY: 0.47 },   // camera framing (optional)
  anims: { name(g, t, W, H, msg) {...} },   // DMD pixel animations, see Display
  build(T) { ... },      // geometry: components, walls, inserts, models
  rules: { ... }         // the game: events, lamps, modes, bonus
};
```

Test it: `games/pinball/layout.html?t=pirate` shows your physics top-down (walls, sensors, paths, lamps) and
"Sim 300 s" runs the autopilot with a heat map (`&sec=900&skill=0.85`). The page's `window.__pin` hooks drive the
real game headlessly (see Testing).

## Coordinate system and units

* **Millimetres.** `x` across the playfield (0 = left wall face), `y` UP the table (0 = bottom edge under the
  apron), `z` height above the playfield. Table is `W = 520` wide and `L = 1060` long (a real widebody-ish
  playfield; a standard is 20.25" x 42"). Don't change `W`/`L` (the cabinet, camera and shooter helpers assume
  them).
* The ball is 27 mm (`BR = 13.5`). Any gap a ball must pass through needs > 32 mm; anything narrower than ~31 mm
  is a trap. A rollover sensor radius 11; a hole radius 12; a scoop mouth 36+ wide.
* Angles in degrees, measured from +x towards +y (so 90 = up the table, 270 = down towards the player, 0 = right,
  180 = left). A target's `angle` is the direction it FACES (the ball comes from that side).
* The playfield is tilted 6.5 degrees. Rolling gravity down the table is 794 mm/s². A full flipper shot leaves at
  ~2100 mm/s and reaches the top in ~0.7 s. A full plunge is ~3900 mm/s (`T.shooter({min,max})`).
* **Levels**: `main` (z 0), plus any mini-playfields you create at other heights (`T.miniField`). Every component
  takes `lvl: 'id'` to live on that level. Balls change levels through ramps (`exitLvl`), `trapDoor`, `vuk`,
  `subway`, `powerfield`, `ferrisWheel`, or `world.airborne`.

Standard anchors (used by the helpers): flippers at y 165 either side of `cx = 243`; shooter lane x 480..520;
the arch centre (260, 802) radius 258; the apron up to y ~108. Keep the lower third standard unless the table's
character demands otherwise (consistent feel across the six tables).

## The builder `T` (inside `build(T)`)

Basics
* `T.W, T.L, T.world, T.G, T.def, T.theme, T.BR, T.spline, T.arcPts, T.deg`
* `T.shooter({min, max, sepX, laneX, arch:[cx,cy,r], gate})` — shooter lane wall, plunger, the top arch wall and a
  one-way gate at the lane's top. Call it first.
* `T.lower({flipColor, flipRubber, flipLen, slingColor, slingPlastic, slingArt, bxColor, saveColor, extraColor,
  bxY, saveY, extraY, inserts})` — both flippers (`flipL`/`flipR`), slingshots (`slingL`/`slingR`), inlane/outlane
  guides and switches (`inL inR outL outR`), bonus-X inserts `_bx2.._bx5`, `_save` and `_extra` (those three
  lamps are driven by the engine). Returns `{flippers, slings, lanes}`.
* `T.wall(pts, {style, r, h, lvl, one:[nx,ny], id, owner, closed, color, z0, ao})` — polyline wall. `style`:
  `metal` (chrome guide rail, r 1.6), `wood` (painted wooden wall with a chrome cap, r 6), `rubber` (r 3.5),
  `plastic` (translucent), `wire` (two chrome wires), `invisible` (physics only). `one`: one-way, balls pass when
  travelling along `[nx,ny]`. Capsule segments: joints never leave gaps.
* `T.post(x, y, {style:'rubber'|'metal'|'peg'|'star', r, lvl, color, h, draw})`
* `T.rubber([[x,y],...], {th, postR, color, lvl})` — a rubber band stretched round posts (2 or more).
* `T.plastic(poly, {z, color, opacity, art(g, box)})` — decorative printed plastic at height `z` (no physics).
* `T.insert(id, x, y, {shape, w, h, r, rot, color, text, size, ink, label, labelSize, lx, ly, labelRot, round, ring,
  led})` — a lamp insert in the playfield. Shapes: `circle oval rect arrow triangle diamond shield star ring bar`.
  Unlit it is a dark translucent plastic; lit, its colour glows (and blooms). `text` is printed ON the insert
  (stays dark), `label` beside it. Same id twice = same lamp.
* `T.bulb(id, x, y, z, {color, r, k, on})` — a small 3D bulb (GI, toy lights). `k` = emissive strength when lit.
* `T.flasher(id, x, y, {color, r, z0})` — a dome flasher; when its lamp is on it also fires a real point light.
* `T.art(fn(P), 'under'|'over')` — paint on the playfield texture (under or over the inserts). See Painting.
* `T.hole(x, y, r, {lvl, rim})` — a cut-out in the playfield (scoops, VUKs and subways add their own).
* `T.window(poly)` — a see-through window in the main playfield (a basement is seen through it).
* `T.model(fn(RC) -> Object3D | null)` — add 3D geometry (see Models). Runs only when rendering.
* `T.level(id, {z, bounds, noDrain})` — raw level; prefer `T.miniField`.
* `T.ao(shape)` — extra baked contact shadow: `{kind:'dot', x, y, r, a}`, `{kind:'line', pts, w, a}`,
  `{kind:'poly', pts, a}`.

Component constructors are `T.<name>(opts)`; every one returns the component (also available as
`G.comp(id)` / `G.comps[id]`). Give every component you'll refer to an `id`.

## Component library

Each entry: options, the events it emits (`rules.event(G, type, id, ball, data)`), methods, and the test hook
`trigger()` (`__pin.trigger('id')`).

| Component | Options | Events / methods |
|---|---|---|
| `flipper` | `x y side:'L'|'R' len r1 r2 rest up angle stroke key:'L'|'R' lvl color rubber stripe` | dual-coil model; `f` is the physics flipper. `key` is which button drives it (upper/mini flippers share a key). |
| `popBumper` | `x y r kick kickMin color skirt body label capArt(g,w,h) spark lvl` | `pop` {x,y}. The ring plunges, the cap lights (lamp id = component id). |
| `slingshot` | `posts:[top, bottomLaneSide, bottomFlipperSide] kick kickMin side color plastic art lvl` | `sling`. Rubber on all three sides, kicker on the long face. |
| `dropTargetBank` | `x y angle n w gap labels[] color ink art(g,w,h,i) resetDelay lvl` | `drop` {i}, `bank` (all down; auto reset after `resetDelay`, waits for a clear slot). `reset()`, `allDown()`, `hold` (set true to keep them down), `targets[i].up`. |
| `standupTarget` | `x y angle w label color art lvl` | `target`. Wobbles when hit. |
| `rolloverLane` | `x y r color lampDy shape lampR text textSize style:'wire'|'button' insert:false` | `lane`. Makes its own insert (id = component id). Ids `inL inR outL outR` score as in/outlanes. |
| `spinner` | `x y w angle label color art lvl` | `spinStart`, then `spin` per half turn (`rules.spinValue()` points). |
| `scoop` | `x y r eject:{angle,speed} hold maxV hood event spread lvl` | `scoop` (ball held), `scoopEject`. In the event set `comp.holdT` (seconds), `comp.keep(ball)` to keep it, `comp.eject(speed)`, `comp.drop(ball)` (hand it to another component), `comp.receive(ball, hold)`. `maxV` makes it a saucer (only slow balls fall in). |
| `vuk` | `x y r path:[[x,y,z]...] power hold style exitLvl onExit hole:false lvl` | `vuk`, `vukFire`. Fires the ball up the path (a wireform drawn unless `draw:false`). `receive(ball)`. |
| `kickback` | `x y power label color armed keepArmed` | `kickback`. `arm()`, `.armed`. Lamp id = component id. |
| `magnet` | `x y r strength hold active catching manual releaseAngle releaseSpeed event lvl` | `magnet` (grabbed), `magnetRelease`. `on() off() release(vx,vy) fling(angle, speed)`, `.held`. |
| `magnaSave` | `x y r color charges enabled` | `magna`. Player-held (MAGNET button / A key): `G.setMagna(on)`. One charge per use; `charges` resets per ball in your rules. Makes a ring insert. |
| `ringCatch` | magnet opts + `toy(RC, comp) -> Object3D`, `animate(obj, dt, comp)` | `ringCatch`, `ringCatchRelease`. A magnet under a hanging toy. |
| `mistMagnet` | `path:[[x,y]...] speed breakSpeed` | `mistStart mistHit mistFree mistEnd`. `start(ball?)` (no ball = a glowing spectral ball), `stop()`. A ball on the mist is `ball.mist` (not counted as in play). |
| `ramp` | `pts:[[x,y,z]...] style:'plastic'|'wire'|'tube' w color opacity edge wallH exitLvl entryMin minExit exitDamp to:'compId' rails wireMat:'chrome'|'iron'|'brass' supportEvery supports mouthWalls noFail` | `rampEnter`, `ramp` (made), `rampFail` (rolled back out). First points are on the playfield (z 0) at the mouth; the ball flies off the last point towards `exitLvl`, or is handed to `to`. |
| `orbit` | `a:[x1,y1,x2,y2] b:[...] dirA dirB within both` | `orbit` when a ball crosses A then B. |
| `gate` | `line:[x1,y1,x2,y2] dir` | `gate`. One-way wire gate (swings). |
| `diverter` | `x y len open closed isOpen color` | `open() close() isOpen()`. A moving wall (its tip sweeps). |
| `subway` | `x y r to:{x,y,lvl,vx,vy}|{comp} delay style:'teleport' hole:false cut:false event maxV` | `subway`, `subwayOut`. `take(ball, delay)`, `receive(ball)`. |
| `ballLock` | `slots:[[x,y,z]...] hidden exit:{x,y,vx,vy,lvl}` | `lock` {n}, `lockOut`. `lock(ball)`, `release(n)`, `count()`. Locked balls are out of play (`G.lockBall`). |
| `trapDoor` | `x y r to:{lvl,x,y} open autoClose art` | `trapdoor`. `open() close() .isOpen`. |
| `miniField` | `id z box:[x0,y0,x1,y1] poly window floor paint(P, box) light lightK walls:true|[[pts]]|false wallStyle wallColor wallH legs glassArt` | Creates level `id`. z < 0: a basement seen through `window`; z > 0: a raised deck. Balls leaving its bottom call `rules.levelDrain(G, lvlId, ball)` (return true if you handled it, e.g. hand it to a subway). |
| `elevator` | `box heights[] start color art` | `elevator` {stop}. `group(i, [comps])` enables those comps at stop i; `goTo(i)`. |
| `tiltingMiniField` | `lvl box walls max wallColor floor` | flipper buttons tilt the level's gravity sideways. |
| `cannon` | `x y load:[x,y,r] rest min max power barrel autoFire sweep barrelMat` | `cannonLoad cannonFire` {angle}. Flippers aim, launch button fires (`G.fire()`); page shows a FIRE button while `G.cannon` is set. |
| `movingLauncher` | `x0 x1 y power color` | `launcherLoad launcherFire` {pos}. |
| `grabber` | `home:[x,y,z] riseH route:[[x,y,z]...] speed drop:{x,y,lvl,vx,vy}|'keep' onDrop(ball) model(RC,comp) animate(obj,comp,dt) riseSound` | `grab`, `grabDone`. `grab(ball)` (take a held ball, e.g. from a scoop: `scoop.drop(b); hand.grab(b)`). States: idle rise grip carry drop back. |
| `mouthToy` | `x y facing w hold manual model skin` | `mouthHit` (closed), `mouth` (swallowed), `mouthOut`. `open() close() spit(speed)`. Default model: a head with eyes that follow the ball and a jaw. |
| `shakingToy` | `x y r | poly, model(RC,comp)` | `toy`. `shake(k)`. |
| `ferrisWheel` | `x y r speed buckets entry:[x,y] exit:{x,y,z,vx,vy,lvl} plane color` | `wheelIn wheelOut`. |
| `gumballMachine` | `x y exit color` | `gumballIn gumballOut`. `receive(ball)` stores (lock), `dispense()`. |
| `spinningDisc` | `x y r speed grip color art on` | a motor disc: drags balls round. `.on`. |
| `fan` | `x y r dir strength on color` | `start() stop()`: pushes balls along `dir`. |
| `crumblingToy` | `x y w facing hits:[n,n,n] model color` | `toyHit toyStage toyCollapse`. `reset()`. Default: castle with drawbridge, collapses. |
| `popUpTargets` | `targets:[{x,y,angle,w}] color` | `popupHit` {i}. `up(i?) down(i?)`. |
| `powerfield` | `lvlId z box magnets:[[x,y,'L'|'R']] win:{x,y,lvl}|{comp} lose:{x,y,lvl} floor color` | `powerfieldIn powerfield powerfieldLose`. `receive(ball)`. |
| `supercharger` | `pts style magnets:[0.25,..] laps boost exitLvl loopBack color` | `superLap` {lap,speed}, `supercharger`. |
| `hologram` | `x y z size:[w,h] draw(g,w,h,t,holo) path(t)->[x,y,z] hit visible` | `holoHit` (a ball passes through, with `hit` radius). `show() hide()`, `.flare`. |
| `scoreMotor` | — | `score(points)` pays out 10s/100s/1000s one chime at a time (EM style). |
| `plunger` | made by `T.shooter` | `G.plunger`: `load({auto, power})`, `fire(p)`, `holds(ball)`. |

Component sounds are built in (`audio.js` recipes). To add a table-specific sound, `audio().define(name, dur,
S => {...})` in `build` and play with `G.sfx(name)`; see the recipes in `audio.js` for the synth helpers
(`S.osc S.noise S.ring S.bell S.pad S.organ`). Keep hits short, metallic and quiet; avoid pure square/sine
"MIDI" tones for musical stingers (use `bell`/`pad`).

## Paths (ramps, wireforms, tubes)

Give `pts` as control points `[x, y, z]`; they are smoothed with a Catmull-Rom spline. Start ON the playfield at
the mouth (2-3 points at z 0..5 so the entry direction is right), climb, and end where the ball flies off (the
last two points set the exit direction; the ball becomes airborne and lands on `exitLvl`). Rules:
* Weak shots roll back out (`rampFail`). `entryMin` is the entry speed needed (mm/s); `fric` the drag.
* The engine closes the sides of the mouth with invisible walls while the ramp is low (< 30 mm), so nothing can
  pass under a low ramp. Where a ramp is high enough, balls roll under it on the playfield; make sure nothing
  below the raised part is blocked by posts you can't see.
* `style:'plastic'` is a lofted translucent ramp with rolled edges and supports; `'wire'` a habitrail of 4 wires
  with hoops; `'tube'` a clear tube. `supportEvery` (mm) spaces the legs.
* `to: 'compId'` hands the ball to a component with `receive(ball)` (scoop, vuk, ballLock, cannon, gumball...).
* Hidden paths (subways) don't need a ramp: use `subway`.

## Rules (`rules` object; `G` is the game)

Hooks (all optional): `init(G)` (new game; set `G.b = {...}` your state), `ballStart(G)`, `ballEnd(G)`, `serve(G)`
(ball placed in the lane), `launch(G, power)`, `skill(G, type, id)` (during the 7 s after launch: return true =
skill shot, false = missed), `flip(G, side, on)`, `event(G, type, id, ball, data)`, `lamps(G) -> {id: state}`,
`status(G) -> text` (scrolling line on the display), `bonus(G) -> [[label, count, each], ...]`, `update(G, dt)`,
`modeStart(G, name)`, `modeEnd(G, name)`, `multEnd(G)`, `mbEnd(G)`, `levelDrain(G, lvl, ball) -> true|false`,
`drain(G, ball) -> true` (handled, no ball lost), `spinValue(G, id)`, `modes: {name: fn(G)}` (test hooks:
`__pin.mode('name')`).

Lamp states: `0/false` off, `1/true` on, `'blink'` (2.5 Hz), `'fast'` (8 Hz), `'slow'`, `'pulse'`, or 0..1 dim.
Lamps fade like incandescents. The engine drives `_save`, `_extra`, `_bx2..5`.

Scoring and effects on `G`:
`G.add(pts, {x, y, color, min, raw})` (x/y: floating text), `G.cnt(key)` (per-game and per-ball counters:
`G.st`, `G.pb`, `G.pbn(key)`), `G.msg(text, sub, {style:'zoom'|'slide'|'flash'|'creep'|'jackpot', dur, now,
anim})`, `G.big(text, sub, color)`, `G.jackpot(val, label, {color, sound})`, `G.combo(id)`, `G.bxUp()`,
`G.lightExtra()`, `G.collectExtra()`, `G.ballSave(sec)`, `G.multiball(n, {label, color, save, from(i)})`,
`G.lockBall(ball)`, `G.startMode(name, sec, {mult})` / `G.endMode(name)` / `G.modes[name]` (seconds left),
`G.lightsOut(sec|true|false)` (Lights Out: only the balls' soft spotlights and flippers; `G.dark` 0..1),
`G.strike(k)` (lightning), `G.flash(color, a)`, `G.shake(a)`, `G.lightShow('flash'|'sweep'|'chase'|'out', sec)`,
`G.pulse(lampId, sec)`, `G.lamp(id, state)` (override), `G.sfx(name, {x, vol, rate, vary, gap})`,
`G.say(text, {force})` (speech; never overlaps; respects sound + ambience), `G.callout(text, color)`,
`G.haptic(kind)`, `G.later(sec, fn)`, `G.serve(auto)`, `G.liveBalls()`, `G.activeBalls()`, `G.world`,
`G.comp(id)`, `G.T.R` (the render context, null when headless), `G.time`, `G.mb`, `G.mult`, `G.bx`, `G.tilted`.

Default scoring the engine applies before your `event` hook: pop 500, sling 110, target 1000, drop 750, bank
15000, spinner 100/half turn, in/outlane 500/2000, ramp 5000, orbit 3000, scoop 2500. Keep a typical 3-ball
game of a decent player within 2-3x of the other tables (Haunted Manor: ~1.5-5 M). Cap mode stacking.

Every table must have: a skill shot, ball save (default 10 s), a bonus with 3-6 lines, bonus multiplier, extra
ball lit somewhere, at least one multiball with a ball save, combos on big shots, a wizard mode (and a
`G.cnt('wiz')` when it starts), a `status()` line that tells the player what to shoot, speech lines for its
character (quiet, sparse: never more than one per 3-4 s), and a `rulesHtml` that explains all of it plainly.

## Theme

```js
theme: {
  playfield: '#120d1e',        // base colour under your art
  cabinet: '#1a1024', wood: '#3a2416', rails: 'chrome'|'gold'|'black', apron: '#1c1a22',
  rubber: '#141414', postColor: '#2a2236', postRubber: '#151515',
  flipper: '#ece6d6', flipperRubber: '#2d8a5c', flipperStripe: '#1c5c3c', popBody: '#2b2238', slingPlastic: '#20142c',
  gi: ['#ffc98a', ...], giPos: [[x, y, z, k], ...], giLevel: 1,   // general illumination point lights
  env: ['#ffd9a8', '#9fffd0', '#b48cff'],   // three coloured light panels in the reflection environment
  sky: '#9a90d0', keyColor: '#dfe6ff', key: 1.0, ambient: 0.32, exposure: 1.05, bloom: 0.55, bloomThreshold: 1.0,
  spark: '#b8ffd8', room: '#06050a', darkLight: '#fff0d0', lampGain: 3.4, button: '#7fd4a4', knob: '#e8dcc0'
}
```
Keep the key light and exposure near these values (the materials are tuned for them); change colour, not
brightness. `env` and `gi` colours give each table its own light.

## Painting the playfield (`art.playfield(P)`)

`P` is a painter over a 2D canvas in TABLE units (1 unit = 1 mm, y UP). `P.ctx` is the raw context (its transform
is already set: use normal canvas calls with table coordinates; text goes through `P.text` so it isn't upside
down). Helpers: `P.text(str, x, y, {size, color, font, weight, rot, align, glow, glowR, stroke, strokeW, spacing,
maxW})`, `P.arcText`, `P.poly(pts)`, `P.line(pts)`, `P.circle(x, y, r)` (then `.fill()`/`.stroke()` on the
context), `P.glow(x, y, r, color, a)`, `P.lin(...)`, `P.rad(...)` (gradients), `P.image(img, x, y, w, h)`,
`P.rng(seed)`. Fonts available: `Cinzel` (serif display), `Bungee` (arcade), system fonts.

The art is a 2.6 px/mm texture under a clearcoat, lit by the scene: paint real surfaces (worn wood, stone,
water, metal with grain, gradients, shadows, scuffs), never flat fills with outlines. Inserts are drawn by the
engine after `playfield` (and before `T.art(fn, 'over')`). Contact shadows under every wall/post/toy are baked
automatically.

`art.backglass(g, w, h)` (512x512, lit from behind), `art.apron(g, w, h)` (1024x256), `art.sides(g, w, h)`
(1024x128, the inside of the cabinet), `art.backboard(g, w, h)` (1024x300, the wall behind the playfield),
`art.sling(g, w, h, side)` (the printed plastic over each slingshot). These are plain canvases (y down).

## Models (`T.model(fn)`, component `model`/`toy` callbacks)

`fn(RC)` runs with the render context: `RC.root` (the table group: add Object3Ds in table mm), `RC.mats`
(materials library: `chrome() steel() brass() iron() copper() plastic(color, opts) clear(color, opacity, opts)
paint(color, opts) rubber(color) wood(base, key) emissive(color, k) glow(color) ball()`), `RC.batch.add(mat, geo)`
(merged static geometry: use for anything that never moves, it keeps draw calls down), `RC.tex(canvas)` (a
texture that is disposed with the table), `RC.anim.push((dt, t) => {...})` (per-frame animation),
`RC.lights` (`key hemi gi[] flash[] ball[] bolt`), `RC.flashLight(x, y, z, color, k)`, `RC.burst(x, y, z, n, speed,
color)` (sparks), `RC.popText`, `RC.G`, `RC.T`, `RC.theme`, `RC.W`, `RC.L`.

Geometry helpers in `gfx.js`: `wallGeo(pts, th, z0, z1) slabGeo(poly, z0, th, {holes, bevel, uvBox}) cylGeo(x, y, r,
z0, z1) boxGeo(x, y, z, w, d, h, rot) sphereGeo torusGeo latheGeo(x, y, [[r, z]...]) tubeGeo(pts3, r) bandGeo
batShape offsetLine canvas canvasTex woodCanvas noiseCanvas glowCanvas shade rgba`. Toys should be built from
primitives with real materials (PBR: metalness/roughness, clearcoat plastics, translucent domes), cast shadows
(`mesh.castShadow = true`), and have a little motion (`RC.anim`). Look at `haunted.js`: the coffin with a lid that
lifts, the skeletal hand with curling fingers, the chandelier with flickering candles and crystal drops, the
manor facade with lit windows and a stained-glass rose, the portraits whose eyes follow the ball.

**What reads as cheap** (the owner rejects it): flat fills, vector clip-art shapes, emoji, unlit sprites pasted
on, text as decoration everywhere, a toy that is one box. **What reads as real**: bevels and rounded edges,
chrome and brass that reflect the environment, translucent plastics, soft shadows, wear, small lamps with
bloom, things that move.

## Display (DMD / LCD)

`display: {type:'dmd', color}` is the classic orange dot matrix (160x32). `{type:'lcd', ink, ink2, bg(g, W, H, t,
G), font}` is a 192x48 colour display. `G.msg(text, sub, {anim:'name'})` plays `anims.name(g, t, W, H, msg)`
behind the text: draw in white/greys for the DMD (quantised to 4 levels), in colour for the LCD.
`dmdIdle(g, W, H, t, G)` can replace the idle score screen (return true).

## Performance budget

60 fps on a recent iPhone: < 200 draw calls, < 400k triangles, textures under ~40 MB total. Use `RC.batch` for
static geometry; one material per look; `cylGeo` segment counts 10-20; avoid per-frame geometry rebuilding;
canvas textures at most 1024 px for decals. The engine drops bloom, then shadows, then resolution if frames run
long. Check `__pin.get().render` (calls, tris) and `.frame` (ms, slow in headless swiftshader).

## Testing

In the page (`games/pinball.html`), `window.__pin`:
`start(id, balls)`, `ready()`, `get()` (state, balls, stats, frame times, draw calls), `flip(side, on)`,
`launch(p)`, `nudge()`, `speed(k)`, `auto(on, skill)`, `sim(sec, skill)` (headless autopilot inside the live
game), `run(sec)`, `place(x, y, vx, vy, lvl)`, `set(key, v)` (`G.b`), `comp(id)`, `trigger(id, ...)`, `mode(name)`,
`render()`, `headless(id, balls)` (a game with no renderer: `g.sim(600, 0.85)` runs 600 s), `audio()`.

Before you hand a table in:
1. `layout.html?t=<id>` looks right; a 900 s sim at skill 0.85 ends with `stats.stuck == 0`, `esc == 0`, and the
   heat map shows the ball reaching every feature.
2. `headless(id).sim(600)`: games end, every mode starts at least once (use `__pin.mode`/`trigger` for the rare
   ones), scores sane.
3. Screenshots on phone (402x874 @2) and iPad (744x1133 @2), in play, during the wizard mode, during multiball.
   Look at them hard: anything that reads as flat polygons or clip art is not done.
4. No console errors; `__pin.get().render.calls < 200`.
5. `rulesHtml` written; the history view (`hist/arcade.js` PBT/PBF tables) knows your table's name/colour and
   any new counters you want shown.

Checklist of what makes a table feel like a real machine: clear shots that each do something (every lane,
ramp, orbit, scoop and target bank has a purpose and a lit insert that says so), flow (ramps feed flippers),
risk (outlanes, a centre drain you can nudge away from), a toy you want to hit, a mode you want to reach, sound
that follows the ball, and a display that always tells you what to do next.
