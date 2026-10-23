// Goblin Defenders: the numbers. Towers, enemies, the ten maps across five lands, the waves on each, the gem shop.
// Shared by the game page and the balance test (works in a browser or in node).
(function (root) {
  'use strict';

  // ── Towers ───────────────────────────────────────────────────────────────
  // Per level arrays [L1, L2, L3]. range in cells, rate in shots a second, up = cost of the next level.
  // air: can hit flyers. The first five are always there (prices from the original game); the last three are
  // unlocked in the gem shop.
  var TOWERS = {
    crossbow: { name: 'Crossbow', icon: 'arrowhead', cost: 10, up: [15, 30], dmg: [4, 11, 22], rate: [1.4, 1.6, 1.9], range: [2.2, 2.45, 2.75], proj: 'bolt', speed: 13, air: true,
      what: 'Fast bolts at one enemy. Hits flyers.' },
    bomb: { name: 'Bomb Tower', icon: 'bomb', cost: 15, up: [22, 40], dmg: [9, 22, 42], rate: [.6, .65, .72], range: [2.2, 2.4, 2.65], splash: [.85, .95, 1.1], proj: 'bomb', speed: 6, arc: .8,
      what: 'Lobs bombs that blast everyone nearby.' },
    frost: { name: 'Frost Cannon', icon: 'snowflake', cost: 18, up: [25, 45], dmg: [2, 5, 9], rate: [1, 1.1, 1.25], range: [2.1, 2.3, 2.55], slow: [.4, .5, .6], slowT: 2.2, splash: [.55, .65, .75], proj: 'ice', speed: 10, air: true,
      what: 'Ice shards that slow enemies down.' },
    poison: { name: 'Acid Barrel', icon: 'poison', cost: 25, up: [35, 60], dmg: [3, 6, 11], dps: [6, 13, 24], cloudT: 3, rate: [.42, .46, .5], range: [2.3, 2.5, 2.75], splash: [.8, .9, 1.02], proj: 'acid', speed: 6, arc: .7,
      what: 'Splashes acid that eats away at everyone standing in it.' },
    claw: { name: 'Heavy Claw', icon: 'claw', cost: 30, up: [45, 80], dmg: [36, 85, 170], rate: [.34, .37, .41], range: [3.4, 3.8, 4.25], splash: [.35, .4, .45], pierce: true, proj: 'rock', speed: 7.5, arc: .6,
      what: 'Long range boulders that crush armour.' },
    tesla: { name: 'Tesla Coil', icon: 'tesla', cost: 40, up: [55, 95], dmg: [14, 30, 55], rate: [.8, .9, 1.02], range: [2.2, 2.45, 2.7], chain: [3, 4, 6], air: true, zap: true, unlock: 'tesla',
      what: 'Lightning that jumps from enemy to enemy. Hits flyers.' },
    mortar: { name: 'Mortar', icon: 'shell', cost: 45, up: [60, 110], dmg: [30, 70, 140], rate: [.25, .27, .3], range: [4.6, 5.1, 5.6], minRange: 1.4, splash: [1.1, 1.25, 1.42], proj: 'shell', speed: 4.2, arc: 1.6, unlock: 'mortar',
      what: 'Huge range and a huge blast, but it can’t hit enemies right next to it.' },
    dome: { name: 'Spike Dome', icon: 'spikes', cost: 35, up: [50, 90], dmg: [10, 22, 44], rate: [.7, .8, .92], range: [1.3, 1.42, 1.56], ring: true, slow: [.3, .35, .4], slowT: .6, unlock: 'dome',
      what: 'Slams the ground and spikes every enemy around it.' }
  };
  var TOWER_ORDER = ['crossbow', 'bomb', 'frost', 'poison', 'claw', 'tesla', 'mortar', 'dome'];

  // ── Enemies ──────────────────────────────────────────────────────────────
  // hp at wave 1 of the first map (waves and later maps scale it), speed in cells a second, armour comes off every
  // hit (the Heavy Claw ignores it), gold when killed, lives lost on reaching the village.
  var ENEMIES = {
    footman: { name: 'Skeleton', hp: 22, speed: 1.0, gold: 2, lives: 1 },
    skeleton: { name: 'Giant Rat', hp: 15, speed: 1.15, gold: 1, lives: 1 },
    knight: { name: 'Knight', hp: 50, speed: .8, armor: 3, gold: 4, lives: 1 },
    rider: { name: 'Boar Raider', hp: 32, speed: 1.95, gold: 3, lives: 1 },
    spider: { name: 'Spider', hp: 13, speed: 1.8, gold: 1, lives: 1, small: true },
    ogre: { name: 'Ogre', hp: 150, speed: .55, armor: 2, gold: 8, lives: 2, big: true },
    wraith: { name: 'Ghost', hp: 38, speed: 1.1, gold: 4, lives: 1, fly: true },
    shaman: { name: 'Shaman', hp: 55, speed: .8, gold: 5, lives: 1, heal: true },
    gargoyle: { name: 'Gargoyle', hp: 80, speed: .85, armor: 3, gold: 6, lives: 2, fly: true },
    sheep: { name: 'Sheep', hp: 10, speed: .5, gold: 0, lives: 0, sheep: true },
    blackKnight: { name: 'Demon Knight', hp: 1400, speed: .55, armor: 6, gold: 60, lives: 5, boss: true },
    frostTroll: { name: 'Ice Giant', hp: 2300, speed: .5, armor: 4, gold: 80, lives: 6, boss: true, noSlow: true },
    spiderQueen: { name: 'Spider Queen', hp: 2600, speed: .7, armor: 3, gold: 100, lives: 6, boss: true, brood: true },
    ogreWarlord: { name: 'Iron Juggernaut', hp: 4400, speed: .45, armor: 8, gold: 120, lives: 8, boss: true },
    wraithLord: { name: 'Ghost King', hp: 5400, speed: .6, armor: 2, gold: 150, lives: 10, boss: true, fly: true }
  };

  // ── Maps ─────────────────────────────────────────────────────────────────
  // 16 x 9 cells, row 0 at the top (under the HUD). Legend:
  //   .  grass: you can build (and on a maze map, enemies walk it too)
  //   #  road (enemies walk it, no building)
  //   S  an entrance (enemies come in from beyond the edge next to it)
  //   E  the village gate (enemies that reach it cost lives)
  //   v  the village itself       ~  water       o  rocks, trees and other things in the way
  // deco: props painted on the map [sprite, x, y, scale] in cell units (centre of a cell is x + .5).
  // pool: [enemy, first wave fraction]: which enemies can turn up, and from how far into the level.
  var MAPS = [
    { id: 'lilypond', name: 'Lily Pond', land: 'jungle', kind: 'road', waves: 15, gold: 60, hp: 1, seed: 11,
      grid: [
        'oo..............',
        '....##########..',
        '....#........#..',
        '....#..~~~~..#..',
        'S####..~~~~..#..',
        '......########..',
        '......#........v',
        '......########Ev',
        '..............vv'],
      deco: [['bushBig', -.6, -.2, 1], ['bush', 1.3, .3, .9], ['palm', -.4, 7.5, 1], ['bushBig', 2.2, 8.6, 1.1], ['palmLeft', 16.2, 1.5, 1], ['bush', 15.5, 4.2, 1], ['mushroom', 3.2, 6.6, 1], ['lilyPad', 8.1, 3.9, 1], ['lilyPad', 9.6, 4.5, .8], ['lilyPad', 10.4, 3.6, .9], ['rocks', .5, .5, .9]],
      pool: [['footman', 0], ['skeleton', .2], ['knight', .6]] },
    { id: 'vines', name: 'Vine Crossing', land: 'jungle', kind: 'road', waves: 18, gold: 65, hp: 1.12, seed: 23, boss: 'blackKnight',
      grid: [
        '.....S..........',
        '.....#..........',
        '.....#......oo..',
        '.....######.....',
        '..........#.....',
        '..........#.....',
        'S#####....#...vv',
        '...~~#########Ev',
        '...~~.........vv'],
      deco: [['rocks', 12.6, 2.6, 1], ['bushBig', 13.4, 2.2, .8], ['palm', 16.4, 3.2, 1.1], ['bushBig', -.5, 2.5, 1.1], ['bush', 2.5, .3, 1], ['lilyPad', 3.6, 7.5, .9], ['lilyPad', 4.3, 8.2, .8], ['palmLeft', 7.5, -.8, .9], ['mushroom', 8.5, 5.4, 1]],
      pool: [['footman', 0], ['skeleton', 0], ['rider', .25], ['knight', .45], ['shaman', .7]] },
    { id: 'frozengate', name: 'Frozen Gate', land: 'snow', kind: 'road', waves: 20, gold: 70, hp: 1.3, seed: 37,
      grid: [
        '.......S........',
        '.......#........',
        '..######........',
        '..#..........o..',
        '..#....######...',
        '..#....#....#..v',
        '..######....###E',
        '...............v',
        'o...............'],
      deco: [['pineSnow', .4, 8.3, 1.1], ['pineSnow', 13.6, 3.3, 1], ['pineSnowBig', 16.3, 1.5, 1], ['pineSnowBig', -.5, 3, 1], ['iceRock', 4.5, 4.4, 1], ['rocksGrey', 10.2, 2.1, .9], ['pineSnow', 9.6, 6.8, .9]],
      gate: 7, pool: [['footman', 0], ['knight', .1], ['rider', .3], ['wraith', .5]] },
    { id: 'icemaze', name: 'Ice Maze', land: 'snow', kind: 'maze', waves: 22, gold: 90, hp: 1.42, seed: 41, boss: 'frostTroll',
      grid: [
        '................',
        '.....o..........',
        '...........o....',
        '................',
        'S..............E',
        '................',
        '....o...........',
        '..........o.....',
        '................'],
      deco: [['pineSnow', 5.5, 1.4, .9], ['iceRock', 11.5, 2.5, 1], ['pineSnow', 4.5, 6.4, .9], ['iceRock', 10.5, 7.5, 1], ['pineSnowBig', 16.5, 7.5, 1], ['pineSnowBig', -.6, 7.8, 1], ['pineSnow', -.5, 1, 1]],
      village: [15.7, 4.6], pool: [['footman', 0], ['knight', 0], ['rider', .2], ['wraith', .35], ['shaman', .55]] },
    { id: 'oasis', name: 'Oasis', land: 'desert', kind: 'road', waves: 22, gold: 75, hp: 1.6, seed: 53,
      grid: [
        '...~~~..........',
        '...~~~..........',
        'S######.........',
        '......#.......vv',
        '......#..#####Ev',
        '......#..#....vv',
        '......####......',
        '................',
        '................'],
      deco: [['palm', 2.4, 1.6, 1], ['palmLeft', 6.6, .6, .9], ['bushBig', 2.8, 2.2, .7], ['cactus', 12.5, 2.5, 1], ['skulls', 3.5, 6.5, 1], ['cactus', 1.5, 7.5, .9], ['ribs', 11.5, 7.2, 1], ['rocksSand', 8.5, 1.5, 1]],
      pool: [['spider', 0], ['footman', 0], ['rider', .2], ['knight', .35], ['wraith', .55]] },
    { id: 'bonevalley', name: 'Bone Valley', land: 'desert', kind: 'road', waves: 25, gold: 80, hp: 1.8, seed: 67, boss: 'spiderQueen',
      grid: [
        'S###########....',
        '...........#....',
        '...ooo.....#....',
        '...ooo.....#....',
        '...ooo.....####E',
        '...........#...v',
        'S###########....',
        '................',
        '..............o.'],
      deco: [['pyramid', 4.5, 3.9, 1], ['ribs', 8, 2.3, 1.1], ['cactus', 14.5, 8.5, 1], ['skulls', 1.6, 3.5, 1], ['palm', 14.2, 1.4, .9], ['rocksSand', 7.6, 8.1, 1], ['cactus', -.4, 3.5, 1]],
      pool: [['spider', 0], ['knight', 0], ['shaman', .3], ['wraith', .4], ['ogre', .55]] },
    { id: 'riverrun', name: 'River Run', land: 'canyon', kind: 'road', waves: 28, gold: 85, hp: 2.05, seed: 71,
      grid: [
        '..S......~......',
        '..#......~......',
        '..#......~......',
        '..#######=####..',
        '.........~...#..',
        '...######=####..',
        '...#.....~.....v',
        '...######=#####E',
        '.........~.....v'],
      deco: [['rocks', 5.5, 1.2, 1], ['deadTree', 7.5, 6.5, 1], ['rocks', 3.5, 6.6, 1.1], ['deadTree', 14.5, 7.3, 1], ['rocksGrey', 15.6, .6, 1], ['skulls', 6.5, 4.5, .9]],
      river: 9, pool: [['footman', 0], ['knight', 0], ['rider', .1], ['shaman', .25], ['ogre', .35], ['gargoyle', .55], ['wraith', .2]] },
    { id: 'twocaves', name: 'The Two Caves', land: 'canyon', kind: 'maze', waves: 30, gold: 120, hp: 2.3, seed: 83, boss: 'ogreWarlord',
      grid: [
        '...S........S...',
        '................',
        '................',
        '................',
        '.......vv.......',
        '.......vE.......',
        '................',
        '................',
        '................'],
      deco: [['deadTree', 1.2, 4.2, 1], ['rocks', 14.8, 3.8, .9]],
      village: [8, 5.6], pool: [['footman', 0], ['knight', 0], ['skeleton', 0], ['rider', .15], ['shaman', .3], ['ogre', .4], ['gargoyle', .5], ['wraith', .3]] },
    { id: 'ashroad', name: 'Ash Road', land: 'volcano', kind: 'road', waves: 35, gold: 110, hp: 2.35, seed: 97,
      grid: [
        'S#######........',
        '.......#........',
        '.......#...~~...',
        '..######...~~...',
        '..#............v',
        '..#####.....###E',
        '......#.....#..v',
        '......#######...',
        'S######.........'],
      deco: [['volcanoRock', 10.5, 1, 1], ['volcanoRock', 4.5, 6.6, 1], ['deadTree', 13.4, 2.5, 1], ['volcanoRock', 1, 8, .9], ['skulls', 9.5, 5.5, 1]],
      lava: true, pool: [['footman', 0], ['skeleton', 0], ['knight', .08], ['rider', .12], ['ogre', .25], ['shaman', .3], ['wraith', .3], ['gargoyle', .45], ['spider', .5]] },
    { id: 'firemaze', name: 'Dragon’s Doorstep', land: 'volcano', kind: 'maze', waves: 40, gold: 150, hp: 2.55, seed: 101, boss: 'wraithLord',
      grid: [
        '........S.......',
        '................',
        'S...............',
        '................',
        '.......vE.......',
        '.......vv.......',
        '...............S',
        '................',
        '................'],
      deco: [['volcanoRock', 2.5, 7, 1], ['volcanoRock', 13, 1.5, 1]],
      village: [8, 5.1], lava: true, pool: [['footman', 0], ['skeleton', 0], ['knight', .06], ['rider', .1], ['ogre', .2], ['shaman', .2], ['wraith', .2], ['gargoyle', .3], ['spider', .35]] }
  ];
  // Survival: one open field, waves forever, a boss every tenth wave
  var SURVIVAL = { id: 'survival', name: 'Survival', land: 'jungle', kind: 'maze', waves: 0, gold: 110, hp: 1.2, seed: 7, survival: true,
    grid: [
      '................',
      'S...............',
      '................',
      '.........o......',
      '...............E',
      '.....o..........',
      '................',
      'S...............',
      '................'],
    deco: [['bush', 9.5, 3.5, 1], ['rocks', 5.5, 5.6, .9], ['palm', -.5, 4.5, 1]],
    village: [15.7, 4.6], pool: [['footman', 0], ['skeleton', 0], ['rider', .1], ['knight', .15], ['spider', .2], ['wraith', .3], ['shaman', .4], ['ogre', .45], ['gargoyle', .6]] };

  var LANDS = {
    jungle: { name: 'Jungle', cave: 'cave' }, snow: { name: 'Snowfields', cave: 'gate' }, desert: { name: 'Desert', cave: 'caveSand' },
    canyon: { name: 'Canyon', cave: 'cave' }, volcano: { name: 'Volcano', cave: 'caveLava' }
  };

  // ── Waves ────────────────────────────────────────────────────────────────
  // Built the same way every time from the map's seed. A wave is a list of groups {type, n, gap (seconds between),
  // at (seconds after the wave starts)}; hp is that wave's multiplier.
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  var GAP = { footman: .9, skeleton: .55, knight: 1.1, rider: .8, spider: .35, ogre: 2.2, wraith: .9, shaman: 1.6, gargoyle: 1.5 };
  var THREAT = { footman: 1, skeleton: .62, knight: 2.3, rider: 1.5, spider: .55, ogre: 6.5, wraith: 1.8, shaman: 2.4, gargoyle: 3.6 };
  // a later map's toughness eases in over its first dozen waves, so every map opens gently
  function waveHp(map, w) { var N = map.waves || 30, m = 1 + (map.hp - 1) * Math.min(1, .15 + (w - 1) / (N * .45)); return m * (1 + .08 * (w - 1) + .0036 * (w - 1) * (w - 1)); }
  function wave(map, w) {
    var N = map.waves || 0, t = N ? (w - 1) / Math.max(1, N - 1) : Math.min(1, (w - 1) / 30), R = rng(map.seed * 1000 + w * 7919);
    var pool = map.pool.filter(function (p) { return t >= p[1] - 1e-6; }).map(function (p) { return p[0]; });
    var fresh = map.pool.filter(function (p) { return p[1] > 0 && Math.abs(p[1] - t) < .5 / Math.max(N || 30, 1) + .02; }).map(function (p) { return p[0]; });
    var budget = 6 + w * 1.15 + (N ? 0 : w * .2), groups = [], at = 0;
    var ng = w < 3 ? 1 : w < 8 ? 2 : 3;
    for (var g = 0; g < ng; g++) {
      var type = g === 0 && fresh.length ? fresh[0] : pool[Math.floor(R() * pool.length)];
      var share = budget / ng, n = Math.max(1, Math.round(share / THREAT[type]));
      if (type === 'ogre' || type === 'gargoyle') n = Math.min(n, 2 + Math.floor(w / 6));
      groups.push({ type: type, n: n, gap: GAP[type] * (.85 + R() * .3), at: at });
      at += n * GAP[type] * .55 + 1.5;
    }
    var last = N && w === N, every10 = !N && w % 10 === 0;
    if ((last && map.boss) || every10) {
      var boss = map.boss || ['blackKnight', 'frostTroll', 'spiderQueen', 'ogreWarlord', 'wraithLord'][(w / 10 - 1) % 5];
      groups.push({ type: boss, n: 1, gap: 1, at: at + 2, boss: true });
    }
    return { groups: groups, hp: waveHp(map, w), bonus: 4 + Math.round(w * .8) };
  }

  // ── Stars and gems ───────────────────────────────────────────────────────
  var LIVES = 20;
  function stars(lives, max) { var f = lives / (max || LIVES); return lives <= 0 ? 0 : f >= .9 ? 3 : f >= .5 ? 2 : 1; }

  // ── Gem shop: permanent upgrades ─────────────────────────────────────────
  // Each item has ranks; cost[i] is the price of rank i + 1.
  var SHOP = [
    { id: 'tesla', name: 'Tesla Coil', kind: 'unlock', icon: 'tesla', cost: [60], what: 'Unlocks the Tesla Coil: chain lightning that hits flyers.' },
    { id: 'mortar', name: 'Mortar', kind: 'unlock', icon: 'shell', cost: [90], what: 'Unlocks the Mortar: a huge blast from across the map.' },
    { id: 'dome', name: 'Spike Dome', kind: 'unlock', icon: 'spikes', cost: [120], what: 'Unlocks the Spike Dome: slams every enemy around it.' },
    { id: 'm_crossbow', name: 'Crossbow drill', kind: 'tower', tower: 'crossbow', icon: 'arrowhead', cost: [10, 25, 50], what: 'Crossbows hit harder and reach further.' },
    { id: 'm_bomb', name: 'Bigger bombs', kind: 'tower', tower: 'bomb', icon: 'bomb', cost: [10, 25, 50], what: 'Bomb Towers hit harder and reach further.' },
    { id: 'm_frost', name: 'Deep freeze', kind: 'tower', tower: 'frost', icon: 'snowflake', cost: [10, 25, 50], what: 'Frost Cannons slow for longer and reach further.' },
    { id: 'm_poison', name: 'Stronger acid', kind: 'tower', tower: 'poison', icon: 'poison', cost: [15, 30, 60], what: 'Acid burns harder and reaches further.' },
    { id: 'm_claw', name: 'Iron claws', kind: 'tower', tower: 'claw', icon: 'claw', cost: [15, 30, 60], what: 'The Heavy Claw hits harder and reaches further.' },
    { id: 'm_tesla', name: 'Overcharge', kind: 'tower', tower: 'tesla', icon: 'tesla', cost: [20, 40, 70], need: 'tesla', what: 'Tesla Coils hit harder and reach further.' },
    { id: 'm_mortar', name: 'Heavy shells', kind: 'tower', tower: 'mortar', icon: 'shell', cost: [20, 40, 70], need: 'mortar', what: 'Mortars hit harder and reach further.' },
    { id: 'm_dome', name: 'Longer spikes', kind: 'tower', tower: 'dome', icon: 'spikes', cost: [20, 40, 70], need: 'dome', what: 'Spike Domes hit harder and reach further.' },
    { id: 'chest', name: 'War chest', kind: 'gold', icon: 'coin', cost: [15, 30, 45, 60, 80], what: 'Start every map with 10 more gold.' },
    { id: 'walls', name: 'Thick walls', kind: 'lives', icon: 'shield', cost: [20, 40, 60], what: 'The village takes 2 more hits before it falls.' },
    { id: 'rockets', name: 'Goblin rockets', kind: 'hero', icon: 'p_rocket', cost: [20, 40, 70], what: 'The engineer’s rocket strike hits harder and recharges faster.' },
    { id: 'ice', name: 'Ice storm', kind: 'unlock', icon: 'snowflake', cost: [80], what: 'Gives the engineer a second power: freeze every enemy for a moment.' }
  ];
  // what a shop rank does to a tower: +12% damage and +5% range a rank
  function mastery(rank) { return { dmg: 1 + .12 * rank, range: 1 + .05 * rank }; }

  var GD = { TOWERS: TOWERS, TOWER_ORDER: TOWER_ORDER, ENEMIES: ENEMIES, MAPS: MAPS, SURVIVAL: SURVIVAL, LANDS: LANDS, SHOP: SHOP, LIVES: LIVES,
    wave: wave, waveHp: waveHp, stars: stars, mastery: mastery, rng: rng, COLS: 16, ROWS: 9 };
  if (typeof module !== 'undefined' && module.exports) module.exports = GD; else root.GD = GD;
})(this);
