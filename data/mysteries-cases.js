'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// Picture Mysteries: the case bank. Each case is drawn by data/mysteries-scene.js.
//
// { id, level: 'easy'|'medium'|'hard', no, type, title, setup, q,
//   choices: [{id, label}], answer, tap: true when the choices are things in the picture you can tap,
//   size: [w, h] (default 400 × 300), scene: {bg, items},
//   hints: [{text, at?}]           two hints; the second can point at a spot (a ref, see box() in the kit)
//   solution: {steps: [{text, marks: [ref + {t}]}], verdict} }
// Keep ids stable: progress and history are stored by id. Add new cases at the end of a level.
// To review: node scripts/mysteries-render.js <outDir>
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  var C = [];
  function add(c) { C.push(c); }

  // ───────────────────────────── EASY ─────────────────────────────

  add({
    id: 'cookie-jar', level: 'easy', no: 1, type: 'Who did it', title: 'The Cookie Jar Caper',
    setup: 'Grandma baked a batch of chocolate-chip cookies and left them in the jar to cool. Ten minutes later the lid was off and the jar was nearly empty. The four grandkids in the kitchen all say: "Not me!"',
    q: 'Who took the cookies?',
    choices: [{ id: 'mia', label: 'Mia' }, { id: 'leo', label: 'Leo' }, { id: 'zoe', label: 'Zoe' }, { id: 'max', label: 'Max' }], answer: 'max', tap: true,
    scene: {
      bg: ['room', { wall: '#f1e4c6', paper: 'tiles', floorY: 196, floor: '#d9c9a8', floorKind: 'tile' }],
      items: [
        ['window', { x: 214, y: 38, w: 86, h: 62, curtains: '#d9534f', sill: 1 }],
        ['clock', { x: 352, y: 58, r: 17, h: 3, m: 50 }],
        ['counter', { x: 8, y: 238, w: 168, h: 92, color: '#8fb3c4' }],
        ['jar', { x: 118, y: 139, lidOff: 1, cookies: 1, label: 'COOKIES' }],
        ['svg', { x: 150, y: 139, svg: '<path d="M-12 0Q0 -9 12 0Z" fill="#c0643a" stroke="#2b2433" stroke-width="1.2"/><circle cx="0" cy="-8" r="2.6" fill="#c0643a" stroke="#2b2433" stroke-width="1.2"/>' }],
        ['plant', { x: 30, y: 139, s: 0.7, pot: '#e0b351' }],
        ['crumbs', { id: 'crumbs', pts: [[132, 141], [158, 142]], gap: 6 }],
        ['crumbs', { pts: [[150, 246], [196, 262], [252, 272], [305, 280], [336, 282]], gap: 8, seed: 4 }],
        ['dog', { x: 64, y: 286, color: '#e3c27a', sleep: 1, collar: '#3a6ea5', s: 0.9 }],
        ['person', { id: 'mia', kid: 1, x: 200, y: 236, s: 1.05, hair: 'pigtails', hc: '#6a3a1e', top: '#f29bb8', pat: 'dots', pc: '#fff', legs: 'skirt', lc: '#7a4a8a', shoes: '#e04a6a', armR: 'hold', holdR: 'book', name: 'Mia' }],
        ['person', { id: 'leo', kid: 1, x: 252, y: 236, s: 1.05, skin: 3, hair: 'short', hc: '#1f1a1a', top: '#4f9a5b', pat: 'stripes', pc: '#e9f3e0', legs: 'shorts', lc: '#3b4a6b', shoes: '#2f4a6a', armL: 'hold', holdL: 'carrot', name: 'Leo' }],
        ['person', { id: 'zoe', kid: 1, x: 300, y: 272, s: 1.12, skin: 2, hair: 'curly', hc: '#2b1d14', top: '#f2c230', legs: 'pants', lc: '#4a78c2', shoes: '#fff', armR: 'hold', holdR: 'milk', mouth: 'smile', name: 'Zoe' }],
        ['person', { id: 'max', kid: 1, x: 360, y: 272, s: 1.12, hair: 'spiky', hc: '#e0b551', top: '#d9534f', sl: 'short', legs: 'shorts', lc: '#5a6b3a', shoes: '#3a3a46', armL: 'back', armR: 'back', mouth: 'smirk', eyes: 'side', marks: ['choc', 'crumbs'], name: 'Max' }]
      ]
    },
    hints: [
      { text: 'Crumbs don’t walk by themselves. Follow them across the floor.' },
      { text: 'The crumbs end by Zoe and Max. Zoom in on their faces and shirts.', at: { box: [270, 150, 125, 130] } }
    ],
    solution: {
      steps: [
        { text: 'A trail of cookie crumbs runs from the jar, across the floor, right to Zoe and Max.', marks: [{ t: 'path', pts: [[150, 248], [196, 263], [252, 273], [305, 281], [336, 283]] }] },
        { text: 'Zoe is only holding a glass of milk. Her face and shirt are clean.', marks: [{ p: 'zoe.holdR' }] },
        { text: 'Max has chocolate on the corner of his mouth and crumbs down his shirt, and he’s hiding his hands.', marks: [{ p: 'max.mouth', pad: 2 }, { p: 'max.crumbs' }] }
      ],
      verdict: 'Max took the cookies.'
    }
  });

  add({
    id: 'muddy-boots', level: 'easy', no: 2, type: 'Footprints', title: 'Boots by the Door',
    setup: 'After the rain, someone tracked mud all the way down the clean hallway without wiping their feet. Everyone has already pulled off their boots and tipped them over on the bench by the door, soles out, to dry.',
    q: 'Whose boots made the muddy prints?',
    choices: [{ id: 'dad', label: 'Dad' }, { id: 'mum', label: 'Mum' }, { id: 'mia', label: 'Mia' }, { id: 'leo', label: 'Leo' }], answer: 'leo', tap: true,
    scene: {
      bg: ['room', { wall: '#dbe6e4', paper: 'stripes', floorY: 150, floor: '#c79a62' }],
      items: [
        ['door', { x: 22, y: 150, w: 60, h: 120, color: '#5a7a9a', window: 1, mat: '#8a6a4a' }],
        ['frame', { x: 132, y: 40, w: 56, h: 42, art: 'boat', bg: '#d8eef8' }],
        ['frame', { x: 214, y: 50, w: 40, h: 30, art: 'mountain' }],
        ['coatrack', { x: 300, y: 150, hang: [{ kind: 'coat', color: '#c0392b' }, { kind: 'coat', color: '#3a6ea5' }] }],
        ['umbrellas', { x: 356, y: 150, umbrellas: [{ color: '#e0b351', wet: 1 }, { color: '#4f8a5b' }] }],
        ['trail', { id: 'prints', pts: [[46, 166], [140, 178], [250, 184], [400, 172]], kind: 'shoe', size: 22, tread: 'zigzag', col: '#5e3f22', gap: 30, side: 7 }],
        ['svg', { svg: '<rect x="0" y="246" width="400" height="12" fill="#8a5a34" stroke="#2b2433" stroke-width="1.2"/><rect x="0" y="258" width="400" height="42" fill="#6e4528"/><rect x="14" y="258" width="6" height="42" fill="#5a3a22"/><rect x="380" y="258" width="6" height="42" fill="#5a3a22"/>' }],
        ['soles', { id: 'dad', x: 62, y: 226, size: 34, color: '#2f3a2f', tread: 'zigzag', mud: 1, name: 'Dad' }],
        ['soles', { id: 'mum', x: 156, y: 228, size: 30, color: '#7a3b4a', tread: 'waves', name: 'Mum' }],
        ['soles', { id: 'mia', x: 248, y: 232, size: 22, color: '#d9534f', tread: 'dots', name: 'Mia' }],
        ['soles', { id: 'leo', x: 336, y: 232, size: 22, color: '#2f5a8a', tread: 'zigzag', mud: 1, name: 'Leo' }]
      ]
    },
    hints: [
      { text: 'Compare the muddy prints with the bottoms of the boots on the bench. Start with the pattern.' },
      { text: 'Two pairs have the same zigzag pattern as the prints. Which of them is the right size?' }
    ],
    solution: {
      steps: [
        { text: 'The muddy prints have a zigzag pattern, and they are small.', marks: [{ x: 128, y: 170, r: 15 }] },
        { text: 'Dad’s boots have zigzags too, and mud, but they are much too big.', marks: [{ id: 'dad' }] },
        { text: 'Leo’s boots are small, have the same zigzag, and are still muddy.', marks: [{ id: 'leo' }] }
      ],
      verdict: 'Leo made the muddy prints.'
    }
  });

  (function () {
    function shelfRoom(after) {
      var dust = '#d9d3c7';
      return [
        ['frame', { x: 290, y: 18, w: 46, h: 30, art: 'mountain' }],
        ['shelf', { x: 20, y: 74, w: 336, color: '#9a6438', items: after ? [
          ['globe', { id: 'globe2', x: 40, y: 0 }],
          ['svg', { x: 40, y: -36, svg: '<path d="M-7 3L0 -14L7 3Z" fill="#9b59b6" stroke="#2b2433" stroke-width="1.1"/><circle cx="0" cy="-15" r="2.2" fill="#ffd23f" stroke="#2b2433" stroke-width="0.8"/>' }],
          ['clock', { x: 100, y: -16, r: 13, h: 7, m: 10, color: '#7a4a2a' }],
          ['trophy', { id: 'trophy2', x: 156, y: 0 }],
          ['svg', { svg: '<rect x="196" y="-3" width="64" height="3" fill="' + dust + '"/><rect x="200" y="-3" width="54" height="3" fill="#8a5a2e"/>' }],
          ['svg', { svg: '<rect x="0" y="-3" width="196" height="3" fill="' + dust + '"/><rect x="260" y="-3" width="76" height="3" fill="' + dust + '"/>' }],
          ['svg', { id: 'clean', x: 227, y: -1, svg: '<rect x="-27" y="-1" width="54" height="2" fill="none"/>' }],
          ['bear', { id: 'bear2', x: 296, y: 0, color: '#b07a4a', bow: '#3a6ea5' }]
        ] : [
          ['globe', { id: 'globe1', x: 40, y: 0 }],
          ['clock', { x: 100, y: -16, r: 13, h: 9, m: 0, color: '#7a4a2a' }],
          ['trophy', { id: 'trophy1', x: 156, y: 0 }],
          ['svg', { svg: '<rect x="0" y="-3" width="336" height="3" fill="' + dust + '"/>' }],
          ['ship', { id: 'ship1', x: 227, y: 0 }],
          ['camera', { id: 'camera1', x: 300, y: 0 }]
        ] }],
        ['shelf', { x: 20, y: 150, w: 336, color: '#9a6438', items: after ? [
          ['camera', { id: 'camera2', x: 40, y: 0 }],
          ['toycar', { x: 104, y: 0, color: '#3a7ab8' }],
          ['books', { x: 170, y: 0, colors: ['#b0413e', '#3a6ea5', '#e0b351'] }],
          ['plant', { x: 236, y: 0, s: 0.62, pot: '#3a8a7a' }],
          ['vase', { x: 300, y: 0, color: '#d98a3a', s: 0.9 }],
          ['svg', { x: 268, y: -30, svg: '<path d="M0 0q-2 10 2 16" stroke="#777" stroke-width=".7" fill="none"/><ellipse cx="0" cy="-8" rx="7" ry="9" fill="#2fb5a5" stroke="#2b2433" stroke-width="1.1"/>' }]
        ] : [
          ['bear', { id: 'bear1', x: 40, y: 0, color: '#b07a4a', bow: '#3a6ea5' }],
          ['toycar', { x: 104, y: 0, color: '#3a7ab8', s: 1 }],
          ['books', { x: 170, y: 0, colors: ['#b0413e', '#3a6ea5', '#e0b351'] }],
          ['plant', { x: 236, y: 0, s: 0.62, pot: '#3a8a7a' }],
          ['vase', { x: 300, y: 0, color: '#d98a3a', s: 0.9 }]
        ] }]
      ];
    }
    add({
      id: 'missing-treasure', level: 'easy', no: 3, type: 'What’s missing', title: 'The Missing Treasure',
      setup: 'Mr. Patel took a photo of his treasure shelves in the morning. After his big party he took another one, and something was gone! A few things were moved around during the party, too.',
      q: 'What was taken from the shelves?',
      choices: [{ id: 'globe', label: 'The globe' }, { id: 'camera', label: 'The camera' }, { id: 'ship', label: 'The ship in a bottle' }, { id: 'bear', label: 'The teddy bear' }, { id: 'trophy', label: 'The trophy' }], answer: 'ship',
      size: [400, 420],
      scene: {
        bg: ['desk', { color: '#6e4a2e' }],
        items: [
          ['photo', { x: 12, y: 10, w: 376, h: 176, caption: 'Morning', bg: ['room', { wall: '#eadcc0', paper: 'dots', floorY: 400 }], items: shelfRoom(false), r: -0.6 }],
          ['photo', { x: 12, y: 222, w: 376, h: 176, caption: 'After the party', bg: ['room', { wall: '#eadcc0', paper: 'dots', floorY: 400 }], items: shelfRoom(true), r: 0.5 }]
        ]
      },
      hints: [
        { text: 'Go along the top shelf in both photos, one thing at a time.' },
        { text: 'Moved things are still somewhere in the second photo. Look for a clean spot in the dust.', at: { id: 'clean', pad: 10 } }
      ],
      solution: {
        steps: [
          { text: 'Some things only moved: the teddy bear went up to the top shelf, the camera went down, and the globe got a party hat.', marks: [{ id: 'bear2' }, { id: 'camera2' }, { id: 'globe2' }] },
          { text: 'The ship in a bottle is gone. A clean patch in the dust shows exactly where it stood.', marks: [{ id: 'ship1' }, { id: 'clean', pad: 6 }] }
        ],
        verdict: 'The ship in a bottle was taken.'
      }
    });
  })();

  add({
    id: 'gnome-swap', level: 'easy', no: 4, type: 'Odd one out', title: 'The Gnome Swap',
    setup: 'Mrs. Holloway’s five garden gnomes all came out of the same mould, so they are exactly alike. Last night a prankster swapped one of them for a look-alike from the garden shop.',
    q: 'Which gnome is the fake?',
    choices: [{ id: 'g1', label: 'Gnome 1' }, { id: 'g2', label: 'Gnome 2' }, { id: 'g3', label: 'Gnome 3' }, { id: 'g4', label: 'Gnome 4' }, { id: 'g5', label: 'Gnome 5' }], answer: 'g4', tap: true,
    scene: {
      bg: ['outside', { groundY: 168, ground: '#79b85a', hills: '#9fcf7a' }],
      items: [
        ['sun', { x: 352, y: 40, r: 14 }],
        ['cloud', { x: 90, y: 42, s: 1.1 }], ['cloud', { x: 230, y: 30, s: 0.8 }],
        ['fence', { x: 0, y: 176, w: 400, h: 50, color: '#f4efe4' }],
        ['flowerbed', { x: 0, y: 182, w: 400, colors: ['#e04a6a', '#ffd23f', '#9b59b6', '#ff8a3d'], seed: 5 }],
        ['tree', { x: 380, y: 176, size: 0.9 }],
        ['gnome', { id: 'g1', x: 48, y: 252, moss: 1 }],
        ['gnome', { id: 'g2', x: 124, y: 252, snail: 1 }],
        ['gnome', { id: 'g3', x: 200, y: 252 }],
        ['gnome', { id: 'g4', x: 276, y: 252, buttons: 2 }],
        ['gnome', { id: 'g5', x: 352, y: 252, leaf: 1 }],
        ['stake', { x: 48, y: 292, text: '1' }], ['stake', { x: 124, y: 292, text: '2' }], ['stake', { x: 200, y: 292, text: '3' }], ['stake', { x: 276, y: 292, text: '4' }], ['stake', { x: 352, y: 292, text: '5' }]
      ]
    },
    hints: [
      { text: 'Moss, snails and leaves aren’t part of the mould. Compare the gnomes themselves.' },
      { text: 'Look closely at each gnome’s coat, from collar to belt.' }
    ],
    solution: {
      steps: [
        { text: 'Gnomes 1, 2, 3 and 5 each have three gold buttons on their coats. The moss, the snail and the leaf are just garden visitors.', marks: [{ p: 'g1.buttons', pad: 2 }, { p: 'g3.buttons', pad: 2 }] },
        { text: 'Gnome 4 has only two buttons. A real one from the mould would have three.', marks: [{ p: 'g4.buttons', pad: 2 }] }
      ],
      verdict: 'Gnome 4 is the fake.'
    }
  });

  add({
    id: 'rain-arrival', level: 'easy', no: 5, type: 'Who did it', title: 'Caught in the Rain',
    setup: 'The Lims’ party started at four, before the storm. It’s pouring outside now, and Mr. Lim says one guest arrived just a minute ago, late as usual.',
    q: 'Who just came in from the rain?',
    choices: [{ id: 'rose', label: 'Aunt Rose' }, { id: 'odu', label: 'Mr. Odu' }, { id: 'priya', label: 'Priya' }, { id: 'sam', label: 'Sam' }], answer: 'priya', tap: true,
    scene: {
      bg: ['room', { wall: '#f0dfe0', paper: 'diamonds', floorY: 182, floor: '#a8784a' }],
      items: [
        ['door', { x: 14, y: 182, w: 58, h: 124, color: '#7a4a2a', mat: '#5a6b3a' }],
        ['window', { x: 110, y: 34, w: 96, h: 74, rain: 1, sky: '#8a9bb0', curtains: '#6a8ac2', sill: 1 }],
        ['svg', { svg: '<path d="M228 20 Q260 36 292 20 Q324 36 356 20" fill="none" stroke="#e0b351" stroke-width="2"/>' + ['#e0384a', '#3a8ad8', '#3aa65a', '#9b59b6'].map(function (c, i) { return '<path d="M' + (236 + i * 36) + ' 26l7 12h-14z" fill="' + c + '" stroke="#2b2433" stroke-width="1"/>'; }).join('') }],
        ['held', { kind: 'balloon', x: 380, y: 160, balc: '#3a8ad8' }],
        ['held', { kind: 'balloon', x: 392, y: 168, balc: '#e0b351' }],
        ['trail', { pts: [[46, 194], [70, 222], [96, 250], [112, 266]], kind: 'shoe', size: 14, col: '#5a96c2', gap: 16, side: 5, fade: 0.4 }],
        ['person', { id: 'priya', x: 122, y: 276, s: 1, skin: 2, hair: 'long', hc: '#1f1a1a', top: '#3aa69a', legs: 'pants', lc: '#2f3a5a', shoes: '#c0392b', marks: ['wet', 'puddle'], mouth: 'o', name: 'Priya' }],
        ['person', { id: 'rose', x: 206, y: 274, s: 1, hair: 'bun', hc: '#8a8a8a', top: '#f2c230', coat: '#f2c230', legs: 'skirt', lc: '#5a6b8a', shoe: 'boot', shoes: '#f2c230', armR: 'hold', holdR: 'cup', glasses: 'round', name: 'Aunt Rose' }],
        ['person', { id: 'odu', x: 288, y: 270, s: 1.04, skin: 4, hair: 'bald', hc: '#1f1a1a', top: '#f4f0e6', coat: '#3a4a6a', acc: ['bowtie:#c0392b'], legs: 'pants', lc: '#3a4a6a', shoe: 'sneaker', shoes: '#2b2b33', holdR: 'umbrellaDown', umbc: '#3aa65a', name: 'Mr. Odu' }],
        ['person', { id: 'sam', kid: 1, x: 360, y: 272, s: 1.1, hair: 'side', hc: '#c98a3a', top: '#e8662a', pat: 'stripes', pc: '#ffd2a8', legs: 'shorts', lc: '#3b4a6b', armR: 'hold', holdR: 'milk', hat: 'party', hatc: '#3a8ad8', name: 'Sam' }]
      ]
    },
    hints: [
      { text: 'Someone who walked in through the rain a minute ago would still be dripping.' },
      { text: 'Check hair, shoulders, and the floor around everyone’s feet. Start at the front door.', at: { box: [30, 186, 100, 80] } }
    ],
    solution: {
      steps: [
        { text: 'Wet footprints lead from the front door across the floor.', marks: [{ t: 'path', pts: [[46, 196], [70, 224], [96, 252], [108, 264]] }] },
        { text: 'Priya’s hair is dripping, her shoulders are soaked, and she is standing in a puddle.', marks: [{ p: 'priya.drips' }, { p: 'priya.shoes' }] },
        { text: 'Aunt Rose’s raincoat and Mr. Odu’s umbrella are bone dry. They came before the storm.', marks: [{ p: 'rose.body' }, { p: 'odu.holdR' }] }
      ],
      verdict: 'Priya just came in from the rain.'
    }
  });

  (function () {
    // Maple Park: gates A (west), B (north), C (east), D (south)
    var A = [0, 168], J1 = [118, 168], J2 = [252, 156], C_ = [400, 150], B = [214, 0], J3 = [214, 82], W1 = [92, 92], D = [108, 300];
    function off(pts, dx, dy) { return pts.map(function (q) { return [q[0] + dx, q[1] + dy]; }); }
    var biscuit = [[296, 152], [252, 156], [222, 112], [214, 82], [150, 86], [92, 92], [100, 130], [118, 168], [112, 230], [108, 300]];
    add({
      id: 'lost-puppy', level: 'easy', no: 6, type: 'Which way', title: 'Where Did Biscuit Go?',
      setup: 'Biscuit the puppy slipped out of her collar in Maple Park and ran off. The muddy paths are covered in tracks from walkers, bikes and other dogs, but Biscuit is tiny, so her paw prints are the smallest of all.',
      q: 'Which gate did Biscuit leave by?',
      choices: [{ id: 'A', label: 'Gate A' }, { id: 'B', label: 'Gate B' }, { id: 'C', label: 'Gate C' }, { id: 'D', label: 'Gate D' }], answer: 'D', tap: true,
      scene: {
        bg: ['top', { color: '#86c66a' }],
        items: [
          ['tpaths', { paths: [{ pts: [A, J1, J2, C_], w: 26 }, { pts: [B, J3, J2], w: 26 }, { pts: [J3, W1, J1], w: 22 }, { pts: [J1, D], w: 24 }] }],
          ['tpond', { x: 310, y: 236, rx: 52, ry: 30 }],
          ['ttree', { x: 40, y: 50, r: 22 }], ['ttree', { x: 78, y: 30, r: 16, color: '#3f8a3a' }], ['ttree', { x: 330, y: 50, r: 24 }], ['ttree', { x: 372, y: 80, r: 16, color: '#3f8a3a' }],
          ['ttree', { x: 30, y: 250, r: 20 }], ['ttree', { x: 200, y: 250, r: 18, color: '#3f8a3a' }], ['ttree', { x: 160, y: 130, r: 14 }],
          ['tbench', { x: 296, y: 128 }], ['tbench', { x: 150, y: 196, r: 90 }],
          ['trail', { pts: off([A, J1, J2, C_], 0, -7), kind: 'bigpaw', size: 17, col: '#6b4a2a', gap: 16, side: 4 }],
          ['trail', { pts: off([B, J3, J2, C_], 6, 6), kind: 'shoe', size: 13, tread: 'lines', col: '#6b4a2a', gap: 15, side: 4 }],
          ['trail', { pts: [[0, 172], [118, 175], [114, 230], [112, 300]], kind: 'bike', col: '#4a3018', w: 2.8, tread: 'zigzag' }],
          ['trail', { pts: off([B, J3, W1], -6, 0), kind: 'bigpaw', size: 17, col: '#6b4a2a', gap: 16, side: 4 }],
          ['trail', { id: 'biscuit', pts: biscuit, kind: 'paw', size: 13, col: '#4a3018', gap: 9.5, side: 2.4 }],
          ['svg', { id: 'collar', x: 300, y: 152, svg: '<path d="M-7 -3 a7 4 0 1 0 14 0 a7 4 0 1 0 -14 0" fill="none" stroke="#e0384a" stroke-width="2.6"/><circle cx="0" cy="2" r="2" fill="#e8c34a" stroke="#2b2433" stroke-width=".6"/>' }],
          ['tgate', { id: 'A', x: 6, y: 168, r: 90, text: 'A', lx: 2, ly: -30 }],
          ['tgate', { id: 'B', x: 214, y: 6, text: 'B', lx: 32, ly: 2 }],
          ['tgate', { id: 'C', x: 394, y: 150, r: 90, text: 'C', lx: -4, ly: -30 }],
          ['tgate', { id: 'D', x: 108, y: 294, text: 'D', lx: 32, ly: -4 }]
        ]
      },
      hints: [
        { text: 'Start at Biscuit’s red collar. Her prints are the tiniest paw prints.' },
        { text: 'Where paths cross, check which way the tiny prints go.', at: { x: 214, y: 82, r: 22 } }
      ],
      solution: {
        steps: [
          { text: 'From her collar, Biscuit’s tiny prints run west, then north to the crossing.', marks: [{ t: 'path', pts: biscuit.slice(0, 4) }] },
          { text: 'There she turned onto the little loop path, past the trees, and back down to the next crossing.', marks: [{ t: 'path', pts: biscuit.slice(3, 8) }] },
          { text: 'Then she followed the bike tracks south, out through Gate D.', marks: [{ t: 'path', pts: biscuit.slice(7) }, { id: 'D' }] }
        ],
        verdict: 'Biscuit left by Gate D.'
      }
    });
  })();

  add({
    id: 'candles', level: 'easy', no: 7, type: 'Timeline', title: 'Home Before Dark',
    setup: 'At the lake cabin, each cousin lit a brand-new candle on the mantel the moment they got home. All the candles came from the same box and burn at the same speed. None has been blown out yet.',
    q: 'Who got home first?',
    choices: [{ id: 'ana', label: 'Ana' }, { id: 'ben', label: 'Ben' }, { id: 'cal', label: 'Cal' }, { id: 'dot', label: 'Dot' }], answer: 'ben', tap: true,
    scene: {
      bg: ['room', { wall: '#2f3a52', paper: 'stripes', floorY: 236, floor: '#7a5233' }],
      items: [
        ['window', { x: 16, y: 40, w: 66, h: 78, night: 1, frame: '#c9b48a', curtains: '#7a2e3a' }],
        ['frame', { x: 168, y: 18, w: 70, h: 44, art: 'mountain', bg: '#2a3a5a' }],
        ['fireplace', { x: 116, y: 236, w: 176, h: 96, logs: 1, fire: 1, color: '#9a6a4a' }],
        ['svg', { svg: '<rect x="102" y="128" width="204" height="12" rx="2" fill="#6a4126" stroke="#2b2433" stroke-width="1.2"/>' }],
        ['candle', { id: 'ana', x: 130, y: 128, len: 36, holder: 8, drips: 1, seed: 3 }],
        ['candle', { id: 'ben', x: 178, y: 128, len: 18, holder: 42, drips: 4, seed: 6, holderc: '#b8862a' }],
        ['candle', { id: 'cal', x: 230, y: 128, len: 50, holder: 6, drips: 0 }],
        ['candle', { id: 'dot', x: 280, y: 128, len: 28, holder: 12, drips: 2, seed: 8 }],
        ['label', { x: 130, y: 150, text: 'Ana', s: 0.85 }], ['label', { x: 178, y: 150, text: 'Ben', s: 0.85 }], ['label', { x: 230, y: 150, text: 'Cal', s: 0.85 }], ['label', { x: 280, y: 150, text: 'Dot', s: 0.85 }],
        ['table', { x: 316, y: 270, w: 72, h: 44, color: '#8a5a34' }],
        ['svg', { id: 'box', x: 318, y: 226, svg: '<rect x="0" y="-12" width="36" height="12" fill="#e9d8b0" stroke="#2b2433" stroke-width="1.1"/><text x="18" y="-3.6" font-family="Lilita One,sans-serif" font-size="5.6" text-anchor="middle" fill="#7a4a2a">CANDLES</text>' }],
        ['candle', { id: 'newc', x: 368, y: 226, len: 56, holder: 6, lit: false, holderc: '#9aa3ad' }],
        ['label', { x: 368, y: 238, text: 'New', s: 0.75 }],
        ['rug', { x: 200, y: 268, w: 190, color: '#7a2e3a' }],
        ['cat', { x: 64, y: 262, color: '#3a3a46', whiteChest: 1, dir: 'R' }]
      ]
    },
    hints: [
      { text: 'A candle gets shorter the longer it burns. Look at the wax, not the holders.' },
      { text: 'Compare each candle with the new one on the side table.', at: { id: 'newc', pad: 4 } }
    ],
    solution: {
      steps: [
        { text: 'A new candle from the box is this long. Every candle on the mantel started out the same.', marks: [{ id: 'newc', pad: 2 }] },
        { text: 'Ben’s flame is one of the highest, but only because his holder is tall. His candle is the shortest of all, so it has burned the longest.', marks: [{ id: 'ben', pad: -2 }] }
      ],
      verdict: 'Ben got home first.'
    }
  });

  add({
    id: 'wet-paint', level: 'easy', no: 8, type: 'Who did it', title: 'Wet Paint',
    setup: 'Mr. Ruiz painted his fence green this morning and put up a sign. Now there’s a messy smudge in the middle of it, where someone leaned on the wet boards.',
    q: 'Who leaned on the fence?',
    choices: [{ id: 'ava', label: 'Ava' }, { id: 'ben', label: 'Ben' }, { id: 'cam', label: 'Cam' }, { id: 'dee', label: 'Dee' }], answer: 'cam', tap: true,
    scene: {
      bg: ['outside', { groundY: 196, ground: '#79b85a', walk: [214, 86], walkColor: '#d6cfc0' }],
      items: [
        ['house', { x: 250, y: 150, w: 130, h: 92, color: '#f0d9b5', roof: '#6a4a8a' }],
        ['tree', { x: 40, y: 150, size: 0.9 }],
        ['cloud', { x: 150, y: 36 }],
        ['fence', { id: 'fence', x: 0, y: 214, w: 400, h: 58, color: '#4fb05a', gap: 13, smudge: [186, -30] }],
        ['sign', { x: 300, y: 150, w: 70, h: 24, text: 'WET PAINT', size: 11, post: 48 }],
        ['held', { kind: 'brush', x: 380, y: 216, brushc: '#4fb05a' }],
        ['svg', { svg: '<rect x="352" y="204" width="20" height="14" rx="2" fill="#9aa3ad" stroke="#2b2433" stroke-width="1.1"/><rect x="352" y="204" width="20" height="5" fill="#4fb05a" stroke="#2b2433" stroke-width="1"/>' }],
        ['person', { id: 'ava', kid: 1, x: 62, y: 272, s: 1.1, skin: 1, hair: 'pony', hc: '#c98a3a', top: '#4fb05a', legs: 'skirt', lc: '#3a4a6a', shoes: '#fff', armL: 'wave', name: 'Ava' }],
        ['person', { id: 'ben', kid: 1, x: 150, y: 276, s: 1.1, skin: 3, hair: 'short', hc: '#1f1a1a', top: '#f2c230', legs: 'shorts', lc: '#3a6ea5', shoes: '#c0392b', armR: 'hold', holdR: 'icepop', popc: '#4fc25a', name: 'Ben' }],
        ['person', { id: 'cam', kid: 1, x: 240, y: 274, s: 1.1, hair: 'curly', hc: '#7a3a1a', top: '#f4f0e6', legs: 'pants', lc: '#5a6b8a', shoes: '#3a3a46', mouth: 'flat', eyes: 'sideL', marks: ['paint:#3fa64a:elbowR:vstripes'], name: 'Cam' }],
        ['person', { id: 'dee', kid: 1, x: 334, y: 276, s: 1.1, skin: 4, hair: 'braids', hc: '#1f1a1a', top: '#e0607a', legs: 'dress', shoes: '#f2c230', armL: 'low', holdL: 'balloon', balc: '#4fb05a', name: 'Dee' }]
      ]
    },
    hints: [
      { text: 'Wet paint rubs off on whatever touches it. Look for paint, not just for green things.' },
      { text: 'The smudge is at elbow height. Check everyone’s arms and hands.', at: { p: 'fence.smudge', pad: 6 } }
    ],
    solution: {
      steps: [
        { text: 'The smudge is about as high as a kid’s elbow.', marks: [{ p: 'fence.smudge', pad: 2 }] },
        { text: 'Cam has green stripes of paint on his elbow, spaced just like the fence boards.', marks: [{ p: 'cam.paint', pad: 2 }] },
        { text: 'Ava’s shirt, Ben’s ice pop and Dee’s balloon are green, but none of them has any paint on.', marks: [] }
      ],
      verdict: 'Cam leaned on the wet fence.'
    }
  });

  // ───────────────────────────── MEDIUM ─────────────────────────────

  add({
    id: 'snowy-cars', level: 'medium', no: 1, type: 'Timeline', title: 'The Snowy Morning',
    setup: 'It snowed all night and stopped at dawn. At 7:30 someone drove to the bakery and bought the very last cinnamon buns. All four neighbours on Birch Lane say their cars haven’t moved since yesterday.',
    q: 'Whose car was driven this morning?',
    choices: [{ id: 'ahmed', label: 'The Ahmeds' }, { id: 'bell', label: 'The Bells' }, { id: 'costa', label: 'The Costas' }, { id: 'dunn', label: 'The Dunns' }], answer: 'bell', tap: true,
    scene: {
      bg: ['outside', { groundY: 170, sky: '#b9c8d8', sky2: '#eef3f7', snow: true }],
      items: [
        ['house', { x: 8, y: 170, w: 86, h: 66, color: '#e8d7b5', roof: '#7a3a2a', snowRoof: 1, door: '#3a6ea5' }],
        ['house', { x: 108, y: 170, w: 86, h: 70, color: '#c9dbe8', roof: '#4a5a6a', snowRoof: 1, door: '#c0392b' }],
        ['house', { x: 208, y: 170, w: 86, h: 64, color: '#f0d0c0', roof: '#5a3a3a', snowRoof: 1, door: '#3a8a5a' }],
        ['house', { x: 308, y: 170, w: 86, h: 68, color: '#e6e0b8', roof: '#3a4a3a', snowRoof: 1, door: '#7a4a8a' }],
        ['tree', { x: 100, y: 176, size: 0.55, kind: 'pine', color: '#3f7a4a', snow: 1 }],
        ['svg', { id: 'tracks', svg: '<path d="M58 300 Q92 262 118 242M84 300 Q114 266 144 244" fill="none" stroke="#9aa7b8" stroke-width="5" stroke-linecap="round"/><path d="M58 300 Q92 262 118 242M84 300 Q114 266 144 244" fill="none" stroke="#c9d3de" stroke-width="2.2" stroke-dasharray="2 3"/>' }],
        ['trail', { pts: [[172, 236], [166, 214], [158, 190], [152, 176]], kind: 'shoe', size: 9, col: '#9aa7b8', gap: 9, side: 3 }],
        ['car', { id: 'ahmed', x: 50, y: 236, s: 0.8, color: '#c0392b', snowRoof: 1, snowHood: 1, snowGlass: 1 }],
        ['car', { id: 'bell', x: 150, y: 236, s: 0.8, color: '#3a6ea5', snowRoof: 1, wetHood: 1 }],
        ['car', { id: 'costa', x: 250, y: 236, s: 0.8, color: '#e0b351', snowHood: 1 }],
        ['car', { id: 'dunn', x: 350, y: 236, s: 0.8, color: '#4f8a5b', snowRoof: 1, snowHood: 1, snowGlass: 1 }],
        ['snowman', { x: 18, y: 210, s: 0.42, hat: 'beanie', hatc: '#c0392b', scarf: '#3a6ea5' }],
        ['person', { id: 'mrcosta', x: 296, y: 238, s: 0.42, hair: 'short', hc: '#3a2a1a', top: '#7a3b4a', coat: '#7a3b4a', lc: '#2f3a5a', shoe: 'boot', shoes: '#2b2b33', hat: 'beanie', hatc: '#f2c230', armL: 'up', holdL: 'brushbroom', acc: ['scarf:#3a6ea5'] }],
        ['label', { x: 50, y: 270, text: 'Ahmed' }], ['label', { x: 150, y: 270, text: 'Bell' }], ['label', { x: 250, y: 270, text: 'Costa' }], ['label', { x: 350, y: 270, text: 'Dunn' }]
      ]
    },
    hints: [
      { text: 'Fresh snow covers everything that hasn’t moved. Look for places where it has been disturbed.' },
      { text: 'A car’s engine is warm after a drive. Check the front of each car, and the snow in front of it.' }
    ],
    solution: {
      steps: [
        { text: 'Tyre tracks cut through the fresh snow, right up to the Bells’ car, and footprints lead to their door.', marks: [{ id: 'tracks', pad: 2 }] },
        { text: 'The Bells’ bonnet has no snow, just drips: the warm engine melted it.', marks: [{ p: 'bell.hood', pad: 3 }] },
        { text: 'Mr. Costa is only brushing snow off his roof. His bonnet is still covered and there are no tracks.', marks: [{ p: 'costa.hood', pad: 3 }] }
      ],
      verdict: 'The Bells’ car was driven this morning.'
    }
  });

  (function () {
    function snap(name, long, prop) {
      var len = long ? 56 : 5, items = [];
      if (prop === 'tree') items.push(['castShadow', { x: 60, y: 98, w: 6, len: long ? 28 : 4, th: 14, back: 0, head: false, op: 0.32 }], ['tree', { x: 60, y: 98, size: 0.3 }]);
      if (prop === 'pond') items.push(['svg', { svg: '<ellipse cx="66" cy="104" rx="26" ry="6" fill="#7cc0e8" stroke="#4a8ac2" stroke-width="1"/>' }]);
      if (prop === 'hay') items.push(['castShadow', { x: 66, y: 98, w: 22, len: long ? 26 : 3, head: false, op: 0.32 }], ['svg', { svg: '<rect x="54" y="84" width="24" height="14" rx="3" fill="#e3c27a" stroke="#2b2433" stroke-width="1"/><path d="M56 89h20M56 93h20" stroke="#c9a24a" stroke-width="1"/>' }]);
      if (prop === 'sign') items.push(['castShadow', { x: 70, y: 98, w: 4, len: long ? 14 : 4, th: 5, back: 0, head: false, op: 0.32 }], ['sign', { x: 58, y: 78, w: 24, h: 12, text: 'EGGS', size: 6, post: 20, ink: '#7a4a2a' }]);
      if (!long) items.push(['sun', { x: 52, y: 14, r: 6 }]);
      items.push(['castShadow', { id: 'sh-' + name, x: 22, y: 98, w: 12, len: len, th: 12, back: 0.02, op: 0.48 }]);
      items.push(['person', { id: name, x: 22, y: 98, s: 0.42, hair: { Gus: 'short', Hana: 'pony', Ivo: 'spiky', Jen: 'bob' }[name], hc: { Gus: '#5a3820', Hana: '#1f1a1a', Ivo: '#b5491f', Jen: '#e0b551' }[name], top: { Gus: '#3a6ea5', Hana: '#e0607a', Ivo: '#4f8a5b', Jen: '#9b59b6' }[name], lc: '#3b4a6b', skin: { Gus: 0, Hana: 2, Ivo: 1, Jen: 0 }[name], hat: name === 'Gus' ? 'cowboy' : null, hatc: '#a0703f', glasses: name === 'Jen' ? 'sun' : null, armR: 'wave' }]);
      return items;
    }
    add({
      id: 'shadow-alibi', level: 'medium', no: 2, type: 'Timeline', title: 'Shadows at Clover Farm',
      setup: 'Someone opened the goat pen at Clover Farm at 4 o’clock this afternoon. Four helpers each showed Farmer Jo a photo of themselves, taken at 4 o’clock somewhere else on the farm. Jo took her own photo of the barn at exactly 4 o’clock. One alibi photo is a fake.',
      q: 'Whose photo was NOT taken at 4 o’clock?',
      choices: [{ id: 'Gus', label: 'Gus' }, { id: 'Hana', label: 'Hana' }, { id: 'Ivo', label: 'Ivo' }, { id: 'Jen', label: 'Jen' }], answer: 'Ivo', tap: true,
      size: [400, 340],
      scene: {
        bg: ['desk', { color: '#7a5233' }],
        items: [
          ['photo', { x: 12, y: 10, w: 376, h: 150, caption: 'Jo’s photo of the barn', r: -0.5, bg: ['outside', { groundY: 112, ground: '#86c66a', sky: '#f4c98a', sky2: '#fde9c8' }], items: [
            ['sun', { x: 24, y: 30, r: 12 }],
            ['barn', { x: 60, y: 116, w: 120, h: 72 }],
            ['clock', { id: 'barnclock', x: 120, y: 32, r: 11, h: 4, m: 0, nums: 1 }],
            ['castShadow', { id: 'postshadow', x: 214, y: 124, w: 6, len: 46, th: 9, back: 0.04, head: false, op: 0.48 }], ['post', { x: 214, y: 124, h: 34 }],
            ['castShadow', { x: 254, y: 124, w: 6, len: 46, th: 9, back: 0.04, head: false, op: 0.48 }], ['post', { x: 254, y: 124, h: 34 }],
            ['castShadow', { x: 294, y: 124, w: 6, len: 46, th: 9, back: 0.04, head: false, op: 0.48 }], ['post', { x: 294, y: 124, h: 34 }],
            ['svg', { svg: '<path d="M208 104h96M208 114h96" stroke="#8a5a34" stroke-width="2.4"/>' }],
            ['svg', { x: 330, y: 132, svg: '<ellipse cx="0" cy="0" rx="12" ry="7" fill="#f4f0e6" stroke="#2b2433" stroke-width="1"/><circle cx="10" cy="-5" r="4.6" fill="#f4f0e6" stroke="#2b2433" stroke-width="1"/><path d="M-6 6v6M6 6v6" stroke="#2b2433" stroke-width="1.6"/><circle cx="11.5" cy="-6" r=".8" fill="#2b2433"/>' }]
          ] }],
          ['photo', { x: 14, y: 196, w: 84, h: 112, caption: 'Gus', r: -3, bg: ['outside', { groundY: 72, ground: '#86c66a', sky: '#f4c98a', sky2: '#fde9c8' }], items: snap('Gus', true, 'tree') }],
          ['photo', { x: 112, y: 196, w: 84, h: 112, caption: 'Hana', r: 2, bg: ['outside', { groundY: 72, ground: '#86c66a', sky: '#f4c98a', sky2: '#fde9c8' }], items: snap('Hana', true, 'pond') }],
          ['photo', { x: 208, y: 196, w: 84, h: 112, caption: 'Ivo', r: -1.5, bg: ['outside', { groundY: 72, ground: '#86c66a', sky: '#9fd3f2', sky2: '#dff1fb' }], items: snap('Ivo', false, 'hay') }],
          ['photo', { x: 304, y: 196, w: 84, h: 112, caption: 'Jen', r: 3, bg: ['outside', { groundY: 72, ground: '#86c66a', sky: '#f4c98a', sky2: '#fde9c8' }], items: snap('Jen', true, 'sign') }]
        ]
      },
      hints: [
        { text: 'Jo’s photo shows how long the shadows were at 4 o’clock.' },
        { text: 'Compare each helper’s shadow with how tall they are. Do the same for the posts in Jo’s photo.' }
      ],
      solution: {
        steps: [
          { text: 'The barn clock says 4 o’clock, and the fence posts cast long shadows, longer than the posts are tall.', marks: [{ id: 'barnclock' }, { id: 'postshadow', pad: 2 }] },
          { text: 'Gus, Hana and Jen all have long shadows too, so their photos fit.', marks: [{ id: 'sh-Gus' }, { id: 'sh-Hana' }, { id: 'sh-Jen' }] },
          { text: 'Ivo’s shadow is just a little spot under his feet, and so is the hay bale’s. The sun was high in the sky: that photo was taken around midday.', marks: [{ id: 'sh-Ivo', pad: 4 }] }
        ],
        verdict: 'Ivo’s photo is a fake. Ivo opened the goat pen.'
      }
    });
  })();

  add({
    id: 'reunion-seat', level: 'medium', no: 3, type: 'Seating', title: 'Uncle Ray’s Seat',
    setup: 'At the family reunion dinner, a gust of wind blew every place card off the table. Uncle Ray left his wallet behind, and Aunt Jen wants to know where he sat. Ray is left-handed, so he always swaps his knife and fork. He drinks his coffee black, and he hangs his hat on his chair.',
    q: 'Which seat was Uncle Ray’s?',
    choices: [{ id: 's1', label: 'Seat 1' }, { id: 's2', label: 'Seat 2' }, { id: 's3', label: 'Seat 3' }, { id: 's4', label: 'Seat 4' }, { id: 's5', label: 'Seat 5' }, { id: 's6', label: 'Seat 6' }], answer: 's5',
    scene: {
      bg: ['top', { color: '#b88a5e', texture: false }],
      items: [
        ['svg', { svg: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) { return '<path d="M0 ' + (i * 32 + 14) + 'H400" stroke="#9a6e46" stroke-width="1.2"/>'; }).join('') }],
        ['svg', { svg: '<rect x="20" y="16" width="360" height="268" rx="16" fill="#7a2e3a" opacity=".55"/>' }],
        ['troundtable', { x: 200, y: 150, r: 86, ss: 1.35, cs: 1.2, tagR: 34, tagDx: 34, cloth: '#f7f2e6', chair: '#8a5a34', seats: [
          { food: '#d98a3a', fork: 'L', cup: '#c8a27a', hat: '#3a4a6a' },
          { food: '#d98a3a', fork: 'R', cup: '#c8a27a' },
          { food: '#d98a3a', fork: 'R', cup: '#3a2414', scarf: '#c0392b' },
          { food: '#d98a3a', fork: 'L', cup: '#3a2414', hat: '#7a3b2a' },
          { food: '#d98a3a', fork: 'R', cup: '#3a2414', hat: '#2f3a2f' },
          { food: '#d98a3a', fork: 'L', cup: '#c8a27a', bag: '#9b59b6' }
        ] }],
        ['svg', { svg: '<circle cx="200" cy="150" r="15" fill="#fff" stroke="#2b2433" stroke-width="1"/>' + [0, 1, 2, 3, 4].map(function (i) { var a = i * 1.256; return '<circle cx="' + (200 + Math.cos(a) * 6).toFixed(1) + '" cy="' + (150 + Math.sin(a) * 6).toFixed(1) + '" r="3" fill="#e04a6a" stroke="#2b2433" stroke-width=".6"/>'; }).join('') }],
        ['svg', { svg: [[44, 48, 20], [356, 258, -30], [70, 262, 64], [348, 40, -12]].map(function (c) { return '<g transform="translate(' + c[0] + ' ' + c[1] + ') rotate(' + c[2] + ')"><rect x="-11" y="-7" width="22" height="14" rx="1" fill="#fbf6e6" stroke="#2b2433" stroke-width=".9"/><path d="M-6 0h12" stroke="#b9ad92" stroke-width="1.4"/></g>'; }).join('') }],
        ['svg', { x: 336, y: 152, svg: '<rect x="-12" y="-8" width="24" height="16" rx="3" fill="#5a3a22" stroke="#2b2433" stroke-width="1"/><path d="M-12 -2h24" stroke="#7a5234" stroke-width="1"/>' }]
      ]
    },
    hints: [
      { text: 'Check every place for the three things Ray always does.' },
      { text: 'Start with the forks. Most people keep the fork on their left. Which places are swapped?' }
    ],
    solution: {
      steps: [
        { text: 'Seats 2, 3 and 5 have the knife and fork swapped, so a left-hander could have sat there.', marks: [{ p: 'seat2.fork' }, { p: 'seat3.fork' }, { p: 'seat5.fork' }] },
        { text: 'Of those three, only seats 3 and 5 have black coffee. Seat 2’s coffee has milk.', marks: [{ p: 'seat3.cup' }, { p: 'seat5.cup' }] },
        { text: 'Only seat 5 also has a hat hanging on the chair. Seat 3 has a scarf.', marks: [{ p: 'seat5.hat' }] }
      ],
      verdict: 'Uncle Ray sat in seat 5.'
    }
  });

  add({
    id: 'real-plumber', level: 'medium', no: 4, type: 'Impostor', title: 'Three Plumbers',
    setup: 'The Hendersons called Drip-Fix Plumbing about a leaky sink, and the company’s van just parked outside. Then three people in work clothes knocked at the door, all saying they were from Drip-Fix! Two of them are tricksters after a free lunch.',
    q: 'Who really works for Drip-Fix?',
    choices: [{ id: 'pat', label: 'Pat' }, { id: 'quinn', label: 'Quinn' }, { id: 'rae', label: 'Rae' }], answer: 'quinn', tap: true,
    scene: {
      bg: ['outside', { groundY: 186, ground: '#79b85a', walk: [196, 104], walkColor: '#d6cfc0' }],
      items: [
        ['cloud', { x: 60, y: 34 }],
        ['house', { x: 212, y: 196, w: 180, h: 150, color: '#e9d7b9', roof: '#4a5a6a', door: '#2f6a5a' }],
        ['bush', { x: 384, y: 200, w: 34, flowers: '#e04a6a' }],
        ['van', { id: 'van', x: 98, y: 212, s: 1.2, color: '#f4f4f4', stripe: '#1a9a9a', logo: 'drop', name: 'DRIP-FIX', sub: 'Plumbing · 555-0142', ink: '#16707a' }],
        ['person', { id: 'pat', x: 222, y: 272, s: 0.95, skin: 1, hair: 'short', hc: '#5a3820', top: '#1a9a9a', lc: '#1a9a9a', belt: '#2b2b33', hat: 'cap', hatc: '#1a9a9a', capLogo: 'drop2', acc: ['badge:#fff:drop2:1.8'], armR: 'hold', holdR: 'toolbox', tbc: '#c0392b', tbLogo: 'drop2', name: 'Pat' }],
        ['person', { id: 'quinn', x: 290, y: 276, s: 0.95, skin: 3, hair: 'pony', hc: '#1f1a1a', top: '#1a9a9a', lc: '#1a9a9a', belt: '#2b2b33', hat: 'cap', hatc: '#1a9a9a', capLogo: 'drop', acc: ['badge:#fff:drop:1.8'], armL: 'hold', holdL: 'toolbox', tbc: '#c0392b', tbLogo: 'drop', name: 'Quinn' }],
        ['person', { id: 'rae', x: 358, y: 272, s: 0.95, skin: 0, hair: 'bob', hc: '#b5491f', top: '#1a9a9a', lc: '#1a9a9a', belt: '#2b2b33', acc: ['badge:#fff:flame:1.8'], armR: 'hold', holdR: 'toolbox', tbc: '#3a6ea5', tbLogo: 'flame', glasses: 'square', name: 'Rae' }]
      ]
    },
    hints: [
      { text: 'Anyone can buy a work outfit. Compare everyone’s badge with the logo on the van.' },
      { text: 'Look closely at which way the wrench points inside the water drop.', at: { p: 'van.logo', pad: 2 } }
    ],
    solution: {
      steps: [
        { text: 'The Drip-Fix logo is a blue drop with a white wrench leaning up to the right.', marks: [{ p: 'van.logo' }] },
        { text: 'Rae’s badge has a flame on it. That’s a different company.', marks: [{ p: 'rae.badge', pad: 2 }] },
        { text: 'Pat’s drop has the wrench leaning the wrong way. It’s a copy.', marks: [{ p: 'pat.badge', pad: 2 }] },
        { text: 'Quinn’s badge, cap and toolbox all match the van exactly.', marks: [{ p: 'quinn.badge', pad: 2 }] }
      ],
      verdict: 'Quinn is the real plumber.'
    }
  });

  (function () {
    var nora1 = [[136, 296], [196, 222], [272, 170]], nora2 = [[290, 178], [300, 236], [306, 296]];
    var omar1 = [[50, 296], [62, 180], [70, 66]], omar2 = [[86, 66], [92, 180], [98, 296]];
    var pia1 = [[228, 296], [204, 180], [192, 66]], pia2 = [[206, 66], [246, 104], [280, 140]], pia3 = [[314, 158], [358, 212], [380, 296]];
    var T = function (pts, tread, id) { return ['trail', { id: id, pts: pts, kind: 'shoe', size: 13, tread: tread, col: '#8a9ab0', gap: 14, side: 4.5 }]; };
    add({
      id: 'snowman-hat', level: 'medium', no: 5, type: 'Footprints', title: 'The Snowman’s Top Hat',
      setup: 'Last night somebody built a snowman in the Parkers’ front yard and stuck Mr. Parker’s best top hat on its head. He had left the hat on the porch. Three kids walked through the yard this morning, and their boot prints are the only tracks in the snow.',
      q: 'Who took the hat from the porch?',
      choices: [{ id: 'nora', label: 'Nora' }, { id: 'omar', label: 'Omar' }, { id: 'pia', label: 'Pia' }], answer: 'pia', tap: true,
      scene: {
        bg: ['top', { color: '#f3f6fa', snow: true }],
        items: [
          ['trect', { x: 0, y: 0, w: 250, h: 28, color: '#8a3a2a' }],
          ['svg', { svg: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { return '<path d="M' + (i * 22) + ' 0v28" stroke="#6e2a1e" stroke-width="1"/>'; }).join('') }],
          ['tporch', { x: 22, y: 28, w: 200, h: 34 }],
          ['svg', { id: 'paper', x: 78, y: 46, svg: '<rect x="-9" y="-3.5" width="18" height="7" rx="3" fill="#e9e3d2" stroke="#2b2433" stroke-width="1"/><path d="M-4 -3.5v7M3 -3.5v7" stroke="#c0392b" stroke-width="1"/>' }],
          ['ttree', { x: 380, y: 130, r: 16, color: '#3f7a4a' }], ['ttree', { x: 26, y: 160, r: 18, color: '#3f7a4a' }],
          T(nora1, 'zigzag', 'tr-nora'), T(nora2, 'zigzag'),
          T(omar1, 'dots', 'tr-omar'), T(omar2, 'dots'),
          T(pia1, 'lines', 'tr-pia'), T(pia2, 'lines', 'tr-pia2'), T(pia3, 'lines'),
          ['tsnowman', { id: 'snowman', x: 292, y: 156, hat: '#1d1d26' }],
          ['trect', { x: 0, y: 270, w: 400, h: 30, color: '#b9bec8', st: 0 }],
          ['svg', { svg: '<path d="M0 270H400" stroke="#8a909c" stroke-width="1.4"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<path d="M' + (i * 56 + 20) + ' 270v30" stroke="#a0a6b0" stroke-width="1"/>'; }).join('') }],
          ['note', { x: 268, y: 6, w: 126, h: 92, color: '#fbf6e6' }],
          ['caption', { x: 331, y: 18, text: 'BOOT SOLES', size: 8, font: 'sans', weight: 800, fill: '#7a6a52' }],
          ['print', { id: 'nora', x: 292, y: 50, kind: 'shoe', size: 30, tread: 'zigzag', col: '#4a5568' }],
          ['print', { id: 'omar', x: 331, y: 50, kind: 'shoe', size: 30, tread: 'dots', col: '#4a5568' }],
          ['print', { id: 'pia', x: 370, y: 50, kind: 'shoe', size: 30, tread: 'lines', col: '#4a5568' }],
          ['label', { x: 292, y: 84, text: 'Nora', s: 0.8 }], ['label', { x: 331, y: 84, text: 'Omar', s: 0.8 }], ['label', { x: 370, y: 84, text: 'Pia', s: 0.8 }]
        ]
      },
      hints: [
        { text: 'Use the boot soles in the corner to work out whose trail is whose.' },
        { text: 'Find the one trail that goes from the porch straight to the snowman.', at: { box: [196, 66, 90, 84] } }
      ],
      solution: {
        steps: [
          { text: 'Nora’s zigzag prints go to the snowman and back to the street, but never near the porch.', marks: [{ t: 'path', pts: nora1 }] },
          { text: 'Omar’s dotted prints go up to the porch and back. He was dropping off the newspaper.', marks: [{ t: 'path', pts: omar1 }, { id: 'paper' }] },
          { text: 'Pia’s striped prints go up to the porch, and from there straight to the snowman.', marks: [{ t: 'path', pts: pia1 }, { t: 'path', pts: pia2 }] }
        ],
        verdict: 'Pia took the hat.'
      }
    });
  })();

  add({
    id: 'hide-seek', level: 'medium', no: 6, type: 'Where is it', title: 'Hide and Seek',
    setup: 'Five kids are playing hide-and-seek in the living room. Before the game started, Mila kicked off her shoes by the front door. Everyone else kept their shoes on.',
    q: 'Where is Mila hiding?',
    choices: [{ id: 'curtain', label: 'Behind the curtain' }, { id: 'table', label: 'Under the table' }, { id: 'sofa', label: 'Behind the sofa' }, { id: 'toybox', label: 'In the toy box' }], answer: 'sofa', tap: true,
    scene: {
      bg: ['room', { wall: '#e6def0', paper: 'dots', floorY: 202, floor: '#b88a5a' }],
      items: [
        ['door', { x: 10, y: 202, w: 54, h: 126, color: '#a0703f', mat: '#4f7a5a' }],
        ['svg', { id: 'shoes', x: 37, y: 208, svg: '<path d="M-14 2Q-14 -4 -8 -4Q-1 -4 -1 2Z" fill="#f29bb8" stroke="#2b2433" stroke-width="1.1"/><path d="M1 3Q1 -3 7 -3Q14 -3 14 3Z" fill="#f29bb8" stroke="#2b2433" stroke-width="1.1"/><path d="M-13 1.4h11M2 2.4h11" stroke="#fff" stroke-width="1.3"/>' }],
        ['label', { x: 37, y: 222, text: 'Mila', s: 0.75 }],
        ['window', { x: 86, y: 44, w: 52, h: 84, sky: '#bfe0f2' }],
        ['svg', { id: 'curtainfeet', svg: '<path d="M98 199Q98 194 103 194Q109 194 110 199Z" fill="#d33a3a" stroke="#2b2433" stroke-width="1.1"/><path d="M114 199Q114 194 119 194Q125 194 126 199Z" fill="#d33a3a" stroke="#2b2433" stroke-width="1.1"/><path d="M99 198h10M115 198h10" stroke="#fff" stroke-width="1.1"/>' }],
        ['curtain', { id: 'curtain', x: 80, y: 202, w: 64, h: 176, color: '#4f7aa8', gap: 9, bulge: 1 }],
        ['frame', { x: 286, y: 40, w: 64, h: 44, art: 'boat', bg: '#d8eef8' }],
        ['lamp', { x: 170, y: 202, color: '#f2c230' }],
        ['svg', { id: 'sock', svg: '<path d="M366 232Q366 225 374 225Q386 226 388 230Q388 236 377 236Q366 236 366 232Z" fill="#f29bb8" stroke="#2b2433" stroke-width="1.1"/><circle cx="372" cy="230" r="1.3" fill="#fff"/><circle cx="379" cy="232.5" r="1.3" fill="#fff"/><circle cx="383" cy="228.5" r="1.1" fill="#fff"/>' }],
        ['sofa', { id: 'sofa', x: 228, y: 252, w: 126, color: '#8a6ab0', cushion: '#f2c230' }],
        ['cat', { x: 270, y: 218, color: '#e3a35a', stripes: '#b8742a' }],
        ['table', { id: 'table', x: 152, y: 284, w: 96, h: 50, cloth: '#f4efe4', long: 1, clothPat: 'check', clothPc: '#d9534f' }],
        ['svg', { id: 'tablepeek', svg: '<path d="M212 288Q212 281 219 281Q228 281 229 288Z" fill="#3aa65a" stroke="#2b2433" stroke-width="1.1"/><path d="M232 288Q232 282 238 282Q246 282 247 288Z" fill="#3aa65a" stroke="#2b2433" stroke-width="1.1"/><path d="M213 287h15M233 287h13" stroke="#fff" stroke-width="1.2"/>' }],
        ['toybox', { id: 'toybox', x: 40, y: 292, w: 70, color: '#e0b351', open: 1, peek: '<path d="M44 -36Q46 -42 52 -42Q60 -41 60 -36Z" fill="#f2c230" stroke="#2b2433" stroke-width="1.1"/><path d="M45 -37h14" stroke="#fff" stroke-width="1.2"/>' }],
        ['held', { kind: 'ball', x: 290, y: 292, s: 1.4 }]
      ]
    },
    hints: [
      { text: 'Mila’s shoes are by the door. What would her feet look like?' },
      { text: 'Every hiding place gives something away. Look at the edges of each one.' }
    ],
    solution: {
      steps: [
        { text: 'Mila’s pink shoes are by the door, so she’s hiding in her socks.', marks: [{ id: 'shoes', pad: 2 }] },
        { text: 'Red sneakers stick out under the curtain, green sneakers peek out from under the tablecloth, and a yellow one pokes out of the toy box.', marks: [{ id: 'curtainfeet' }, { id: 'tablepeek' }, { box: [82, 248, 22, 12] }] },
        { text: 'Only behind the sofa is there a foot in just a sock, a pink spotty one.', marks: [{ id: 'sock', pad: 2 }] }
      ],
      verdict: 'Mila is hiding behind the sofa.'
    }
  });

  (function () {
    var keys = [
      { id: 'A', head: 'square', teeth: [3, 1, 2, 4] },
      { id: 'B', head: 'round', teeth: [3, 1, 4, 2] },
      { id: 'C', head: 'square', teeth: [3, 1, 4, 2] },
      { id: 'D', head: 'clover', teeth: [1, 3, 1, 3] },
      { id: 'E', head: 'square', teeth: [2, 4, 1, 3] }
    ];
    var items = [
      ['svg', { svg: '<rect x="8" y="12" width="182" height="276" rx="4" fill="#e9dcc0" opacity=".3"/>' }],
      ['note', { x: 24, y: 24, w: 128, h: 58, color: '#fff3a6', text: ['Grandpa’s shed key.', 'I pressed it in the', 'soap. Don’t lose it!'], size: 10.5, lh: 14, align: 'left', ink: '#1f2a6b', r: -3 }],
      ['soap', { id: 'soap', x: 96, y: 168, s: 2.014, r: -3, key: { head: 'square', teeth: [3, 1, 4, 2] } }],
      ['svg', { svg: '<path d="M30 250L120 236" stroke="#2b2433" stroke-width="7" stroke-linecap="round"/><path d="M30 250L120 236" stroke="#f2c230" stroke-width="5" stroke-linecap="round"/><path d="M120 236l10 -1.6-9 4z" fill="#e9c89a" stroke="#2b2433" stroke-width="1"/>' }]
    ];
    keys.forEach(function (k, i) {
      var y = 32 + i * 58;
      items.push(['key', { id: k.id, x: 218, y: y, s: 1.45, head: k.head, teeth: k.teeth, col: ['#d8b64a', '#c9a227', '#d8b64a', '#bfa04a', '#cfae4a'][i] }]);
      items.push(['tag', { x: 360, y: y + 4, text: k.id }]);
    });
    add({
      id: 'soap-key', level: 'medium', no: 7, type: 'Which key', title: 'The Key in the Soap',
      setup: 'Grandpa lost the only key to his old shed. Luckily, he once pressed it into a bar of soap so a locksmith could copy it. The locksmith brought five keys that look almost the same. Only one is an exact match.',
      q: 'Which key will open Grandpa’s shed?',
      choices: keys.map(function (k) { return { id: k.id, label: 'Key ' + k.id }; }), answer: 'C', tap: true,
      scene: { bg: ['desk', { color: '#8a5a34' }], items: items },
      hints: [
        { text: 'Check the shape of the key’s head in the soap first.' },
        { text: 'Then compare the teeth one by one, from the head to the tip.', at: { p: 'soap.print', pad: 2 } }
      ],
      solution: {
        steps: [
          { text: 'The print in the soap has a square head, and teeth that go: tall, short, tallest, medium.', marks: [{ p: 'soap.print', pad: 2 }] },
          { text: 'Key B has a round head and key D has a clover head.', marks: [{ id: 'B' }, { id: 'D' }] },
          { text: 'Keys A and E have square heads, but their teeth are in a different order.', marks: [{ id: 'A' }, { id: 'E' }] },
          { text: 'Key C matches the soap exactly.', marks: [{ id: 'C' }] }
        ],
        verdict: 'Key C opens the shed.'
      }
    });
  })();

  add({
    id: 'broken-vase', level: 'medium', no: 8, type: 'What happened', title: 'Crash!',
    setup: 'Crash! Mum’s favourite vase lies in pieces in a puddle on the floor. It stood on the high shelf. Rex the dog is sitting right next to the mess, looking guilty, but is he really to blame?',
    q: 'What knocked the vase off the shelf?',
    choices: [{ id: 'dog', label: 'Rex the dog' }, { id: 'cat', label: 'Tiger the cat' }, { id: 'window', label: 'Wind from the window' }, { id: 'ball', label: 'The football' }], answer: 'cat', tap: true,
    scene: {
      bg: ['room', { wall: '#f1e6cf', paper: 'stripes', floorY: 206, floor: '#c48a52' }],
      items: [
        ['shelf', { x: 28, y: 74, w: 112, color: '#9a6438', items: [['plant', { x: 22, y: 0, s: 0.5, pot: '#3a8a7a' }], ['books', { x: 88, y: 0, s: 0.8, colors: ['#3a6ea5', '#e0b351'] }], ['svg', { svg: '<ellipse cx="56" cy="-1" rx="8" ry="2" fill="#9fd2f0" stroke="#5a96c2" stroke-width=".6" opacity=".8"/>' }]] }],
        ['bookcase', { x: 146, y: 206, w: 92, h: 138, rows: 3, seed: 12 }],
        ['cat', { id: 'cat', x: 194, y: 66, color: '#e3a35a', stripes: '#b8742a', wetPaws: 1 }],
        ['svg', { svg: '<g fill="#7fb8e0" opacity=".85">' + [[150, 120, 30], [156, 112, 20], [204, 162, -10], [210, 156, 0]].map(function (q) { return '<g transform="translate(' + q[0] + ' ' + q[1] + ') rotate(' + q[2] + ')"><ellipse cx="0" cy="1.6" rx="1.8" ry="1.4"/><circle cx="-1.8" cy="-1" r=".7"/><circle cx="-.6" cy="-2" r=".7"/><circle cx=".6" cy="-2" r=".7"/><circle cx="1.8" cy="-1" r=".7"/></g>'; }).join('') + '</g>' }],
        ['window', { id: 'window', x: 280, y: 42, w: 84, h: 72, latch: 'closed', curtains: '#d9534f', sill: 1 }],
        ['plant', { x: 296, y: 122, s: 0.45, pot: '#e0b351' }],
        ['vase', { id: 'vase', x: 84, y: 236, color: '#3a7ab8', broken: 1, water: 36, flowers: '#e04a6a' }],
        ['trail', { id: 'wetpaws', pts: [[122, 238], [146, 226], [166, 214]], kind: 'paw', size: 11, col: '#5a96c2', gap: 7, side: 2 }],
        ['dog', { id: 'dog', x: 40, y: 272, color: '#d9b77a', collar: '#c0392b', s: 0.95 }],
        ['toybox', { x: 284, y: 290, w: 78, color: '#3aa65a', open: 1 }],
        ['svg', { id: 'ball', x: 322, y: 254, svg: '<circle r="9" fill="#fff" stroke="#2b2433" stroke-width="1.2"/><path d="M0 -3.4l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" fill="#2b2433"/><path d="M0 -3.4V-9M3.2 -1.1l5.4 -1.8M2 2.7l3.4 4.6M-2 2.7l-3.4 4.6M-3.2 -1.1l-5.4 -1.8" stroke="#2b2433" stroke-width=".9"/>' }],
        ['svg', { svg: '<rect x="280" y="254" width="86" height="8" rx="2" fill="#3aa65a" opacity="0"/>' }]
      ]
    },
    hints: [
      { text: 'Water gets on anything that walks through it. Look at the floor around the puddle.' },
      { text: 'Follow the little wet prints. Where do they lead?', at: { id: 'wetpaws', pad: 4 } }
    ],
    solution: {
      steps: [
        { text: 'Small wet paw prints lead from the puddle to the bookcase, and up its shelves.', marks: [{ id: 'wetpaws', pad: 3 }] },
        { text: 'Tiger is on top of the bookcase, right next to the high shelf, and her paws are still wet.', marks: [{ id: 'cat' }] },
        { text: 'Rex is far too short to reach the shelf and his paws are dry. The window is shut tight, and the football is in the toy box.', marks: [{ p: 'window.latch', pad: 2 }, { id: 'ball' }] }
      ],
      verdict: 'Tiger the cat knocked the vase off the shelf.'
    }
  });

  window.MYSTERY_CASES = C;
})();
