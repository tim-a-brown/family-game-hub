'use strict';
// Cipher Cases: the authored case files and the phrase list for endless codes (games/ciphers.html).
//
// A case:
//   id, lv ('easy'|'medium'|'hard'), title, setup (what's going on), prize (what's inside)
//   dev: the thing you open
//     {t:'lock', n}          combination padlock, n number wheels      ans: digits
//     {t:'brief', n}         briefcase number wheels                  ans: digits
//     {t:'cryptex', n}       letter wheels                            ans: letters
//     {t:'dial', n, max}     safe dial 0..max-1, n numbers to set     ans: 'a-b-c'
//     {t:'keypad', n}        door keypad                              ans: digits
//     {t:'msg'}              a coded message you type out             ans: the plain text
//   cipher (for coded text): {t:'caesar', k} {t:'atbash'} {t:'keyword', kw} {t:'crypto', seed, give:'LETTERS'}
//     {t:'a1z26'} {t:'morse'} {t:'multitap'} {t:'pigpen'} {t:'glyph'} {t:'reverse'} {t:'rail', k} {t:'columns', k}
//   plain: the message before it was coded (msg cases), tool: which decoder the pad shows
//   scene: {bg, items:[{t, x, y, ...}]}, drawn by the game (400 × 240)
//   hints: two, each a step further; explain: shown after the case is closed
// Logic locks are checked by scripts/ciphers-check.js (one answer only, ciphers round-trip).
window.CIPHER_DATA = {
  cases: [
    // ═══ EASY ═══════════════════════════════════════════════════════════════
    {
      id: 'e1', lv: 'easy', title: 'The Garden Shed', prize: "Gran's best trowel",
      setup: "Gran keeps her garden tools locked in the shed. She says the code is hiding in plain sight, and she left a note on the door.",
      dev: { t: 'lock', n: 3 }, ans: '472',
      scene: { bg: 'shed', items: [
        { t: 'window', x: 236, y: 30, w: 120, h: 92, view: 'day', birds: 2 },
        { t: 'shelf', x: 22, y: 96, w: 176 },
        { t: 'jars', x: 30, y: 60, n: 7, gap: 23 },
        { t: 'pot', x: 252, y: 150, flowers: 4 },
        { t: 'note', x: 46, y: 128, w: 128, h: 70, rot: -3, pin: true, hand: ['Flowers,', 'then jars,', 'then birds.'] },
        { t: 'rake', x: 196, y: 70 }
      ] },
      hints: ["Gran's note gives the order of the three numbers. Count each kind of thing.", 'There are 4 flowers in the pot. Now count the jars on the shelf and the birds outside.'],
      explain: 'Count each thing in the order on the note: 4 flowers, 7 jars and 2 birds. The code is 4-7-2.'
    },
    {
      id: 'e2', lv: 'easy', title: "Grandpa's Clocks", prize: "Grandpa's pocket watch",
      setup: "Grandpa's old briefcase has a three-number lock. He tucked a card behind the clock on the mantel.",
      dev: { t: 'brief', n: 3 }, ans: '356',
      scene: { bg: 'room', wall: '#55415f', items: [
        { t: 'shelf', x: 20, y: 150, w: 360 },
        { t: 'clock', x: 196, y: 70, r: 46, h: 5, m: 0, base: 150 },
        { t: 'clock', x: 74, y: 120, r: 22, h: 9, m: 15, base: 150 },
        { t: 'clock', x: 330, y: 122, r: 20, h: 12, m: 30, c: '#2f6a7a', base: 150 },
        { t: 'books', x: 104, y: 100, list: [['#8c2f39', 50], ['#2f5d8c', 46], ['#c19a3d', 52], ['#3f7a4c', 44], ['#6d4c8c', 50], ['#a4552c', 47]] },
        { t: 'card', x: 24, y: 158, w: 200, h: 76, rot: 2, hand: ['1st: how many clocks?', '2nd: the hour on the big one', '3rd: how many books?'] }
      ] },
      hints: ['Count all the clocks first. Some of them are small.', 'There are 3 clocks and the big one shows 5 o\'clock. Now count the books.'],
      explain: '3 clocks on the mantel, the big clock says 5 o\'clock, and there are 6 books. The code is 3-5-6.'
    },
    {
      id: 'e3', lv: 'easy', title: 'Message in a Bottle', prize: 'A pirate coin',
      setup: 'A bottle washed up on the beach. The note inside is in code, and someone scratched a clue on the bottle\'s tag.',
      dev: { t: 'msg' }, cipher: { t: 'caesar', k: 1 }, plain: 'DIG BY THE BIG ROCK', tool: 'wheel',
      scene: { bg: 'beach', items: [
        { t: 'bottle', x: 110, y: 120, tag: '+1' },
        { t: 'rock', x: 268, y: 128 },
        { t: 'shell', x: 70, y: 210 }, { t: 'shell', x: 330, y: 214, c: '#f3c3b8' }
      ] },
      hints: ['The tag says +1: every letter was moved one step along the alphabet. Move each one back a step.', 'E goes back to D, J to I and H to G. The first word is DIG.'],
      explain: 'A Caesar shift of 1: each letter moved one place forward, so A became B and B became C. Moving every letter back one place gives DIG BY THE BIG ROCK.'
    },
    {
      id: 'e4', lv: 'easy', title: 'The Bakery Box', prize: "The baker's secret recipe",
      setup: "The baker's recipe box has a word lock. Stuck to the oven door is a card with four numbers on it.",
      dev: { t: 'cryptex', n: 4 }, ans: 'CAKE', tool: 'a1z26',
      scene: { bg: 'kitchen', items: [
        { t: 'oven', x: 150, y: 96 },
        { t: 'card', x: 156, y: 110, w: 142, h: 48, rot: -4, type: ['3  1  11  5'], big: true },
        { t: 'poster', x: 26, y: 26, w: 104, h: 128, abc: true },
        { t: 'rolling', x: 296, y: 120 }
      ] },
      hints: ['Each number is a letter\'s place in the alphabet: A is 1, B is 2, C is 3.', '3 is C and 1 is A. Now find the 11th and 5th letters.'],
      explain: 'Letters for numbers (A1Z26): 3 = C, 1 = A, 11 = K, 5 = E. The word is CAKE.'
    },
    {
      id: 'e5', lv: 'easy', title: 'The Mirror Diary', prize: 'The lost diary key',
      setup: 'Your sister writes her diary so nobody can read it. Today\'s line looks like nonsense, and her hand mirror is sitting right beside it.',
      dev: { t: 'msg' }, cipher: { t: 'reverse' }, plain: 'THE KEY IS UNDER THE MAT',
      scene: { bg: 'desk', items: [
        { t: 'diary', x: 30, y: 26, w: 230, h: 188, cipher: true },
        { t: 'mirror', x: 300, y: 70 },
        { t: 'pencil', x: 276, y: 196, rot: -18 }
      ] },
      hints: ['Try reading the line from the end to the start.', 'The last word, EHT, read backwards is THE.'],
      explain: 'The whole line was written backwards. Reading from right to left gives THE KEY IS UNDER THE MAT.'
    },
    {
      id: 'e6', lv: 'easy', title: "Rosy's Gate", prize: "Rosy's lost ball",
      setup: 'The back gate has a keypad. Mum says the code is the dog\'s name, typed on the phone keys.',
      dev: { t: 'keypad', n: 4 }, ans: '7679', kind: 'Phone keys',
      scene: { bg: 'garden', items: [
        { t: 'kennel', x: 34, y: 92 },
        { t: 'bowl', x: 168, y: 194, name: 'ROSY' },
        { t: 'phone', x: 270, y: 50 }
      ] },
      hints: ['On a phone keypad each number has letters: 2 has ABC, 3 has DEF, and so on.', 'R is on the 7 key and O is on the 6 key.'],
      explain: 'ROSY on phone keys: R is on 7, O on 6, S on 7 and Y on 9. The code is 7679.'
    },
    {
      id: 'e7', lv: 'easy', title: 'The Lighthouse Chest', prize: "The keeper's brass telescope",
      setup: "The lighthouse keeper's sea chest has a word lock. A paper tape from the signal machine is still on the desk.",
      dev: { t: 'cryptex', n: 4 }, ans: 'SAIL', tool: 'morse',
      scene: { bg: 'night', items: [
        { t: 'porthole', x: 260, y: 22 },
        { t: 'lamp', x: 60, y: 30 },
        { t: 'tape', x: 24, y: 150, w: 352, morse: 'SAIL' },
        { t: 'telegraph', x: 150, y: 74 }
      ] },
      hints: ['It\'s Morse code. Each group of dots and dashes is one letter. The decoder has the chart.', '... is S and .- is A.'],
      explain: 'Morse code: ... is S, .- is A, .. is I and .-.. is L. The word is SAIL.'
    },
    {
      id: 'e8', lv: 'easy', title: 'The Birthday Safe', prize: 'A wrapped birthday present',
      setup: 'Aunt May hid the birthday present in her little safe. She left the table set, with a note by the cake.',
      dev: { t: 'dial', n: 3, max: 40 }, ans: '9-27-14',
      scene: { bg: 'room', wall: '#3d5a6c', items: [
        { t: 'table', x: 10, y: 156, w: 380 },
        { t: 'cake', x: 34, y: 92, candles: 9 },
        { t: 'page', x: 196, y: 112, num: 27 },
        { t: 'postcard', x: 286, y: 108, addr: '14 Elm Road' },
        { t: 'note', x: 206, y: 24, w: 160, h: 62, rot: 3, pin: true, hand: ['Candles, then the page,', 'then the house.'] }
      ] },
      hints: ['Count the candles on the cake. That\'s the first number.', 'There are 9 candles. The page number is on the torn page and the house number is on the postcard.'],
      explain: '9 candles, page 27 and house number 14. Turn the dial to 9, then 27, then 14.'
    },
    {
      id: 'e9', lv: 'easy', title: 'The Locker Lock', prize: 'Your missing trainers',
      setup: 'Someone locked your gym locker. The code is three numbers, and they left you some guesses with notes on how close each one was.',
      dev: { t: 'lock', n: 3 }, ans: '685',
      mm: [{ g: '239', a: 0, b: 0 }, { g: '105', a: 1, b: 0 }, { g: '630', a: 1, b: 0 }, { g: '185', a: 2, b: 0 }],
      scene: { bg: 'cork', items: [{ t: 'mm', x: 30, y: 14, w: 340 }] },
      hints: ['Start with "Nothing is right": 2, 3 and 9 are not in the code at all.', '185 has two numbers in the right places, and 105 has only one. So the 8 is right, in the middle.'],
      explain: '2, 3 and 9 are out. 185 and 105 share the 1 and the 5, so the extra right number in 185 is the 8, in the middle. 105 says nothing else is right, so the 0 is out too. That makes the 6 in 630 the right one, at the front. Then the 1 can\'t be first, so 185\'s other right number is the 5 at the end: 6-8-5.'
    },
    {
      id: 'e10', lv: 'easy', title: 'The Pirate Map', prize: 'A chest of gold coins',
      setup: 'An old map shows where the treasure is buried, but the instructions are written in strange shapes. The mapmaker drew the key in the corner.',
      dev: { t: 'msg' }, cipher: { t: 'pigpen' }, plain: 'DIG AT THE OLD OAK', tool: 'pigpen',
      scene: { bg: 'desk', items: [{ t: 'map', x: 14, y: 12, w: 372, h: 216, key: 'full' }] },
      hints: ['Each shape is the bit of grid around a letter in the key. A shape with a dot comes from a dotted grid.', 'The first word is DIG.'],
      explain: 'Pigpen cipher: every letter is swapped for the lines around its spot in the grids (and a dot for the second grid of each kind). It reads DIG AT THE OLD OAK.'
    },

    // ═══ MEDIUM ═════════════════════════════════════════════════════════════
    {
      id: 'm1', lv: 'medium', title: "Caesar's Birthday", prize: 'A gold laurel brooch',
      setup: 'The museum\'s Roman room has a coded note on the desk. The curator circled a date on the calendar and wrote "the shift".',
      dev: { t: 'msg' }, cipher: { t: 'caesar', k: 13 }, plain: 'THE MAP IS IN THE OLD MILL', tool: 'wheel',
      scene: { bg: 'stone', items: [
        { t: 'bust', x: 34, y: 40 },
        { t: 'calendar', x: 226, y: 22, month: 'MARCH', circle: 13, label: 'the shift' },
        { t: 'column', x: 168, y: 20 }
      ] },
      hints: ['It\'s a Caesar shift. The circled date tells you how far every letter moved.', 'The shift is 13, so A and N swap, B and O swap, and so on. GUR is THE.'],
      explain: 'A Caesar shift of 13 (also called ROT13). With 13, coding and decoding are the same: each letter swaps with the one 13 places away. It reads THE MAP IS IN THE OLD MILL.'
    },
    {
      id: 'm2', lv: 'medium', title: 'The Bike Lock', prize: 'Your bike, back again',
      setup: 'Your cousin "borrowed" your bike and changed the four-number lock. He left these guesses and notes to tease you.',
      dev: { t: 'lock', n: 4 }, ans: '5172',
      mm: [{ g: '5793', a: 1, b: 1 }, { g: '7492', a: 1, b: 1 }, { g: '1346', a: 0, b: 1 }, { g: '8094', a: 0, b: 0 }, { g: '8071', a: 1, b: 1 }],
      scene: { bg: 'cork', items: [{ t: 'mm', x: 12, y: 6, w: 376 }] },
      hints: ['8, 0, 9 and 4 are not in the code. Cross them out in the other guesses.', 'From 7492, with 4 and 9 gone, the 7 and the 2 are both right: one in place, one not.'],
      explain: '8, 0, 9 and 4 are out, so 7492 gives you 7 and 2, and 8071 gives 7 and 1. 1346 has one right number: the 1, so the 3 is out and 5793 must have the 5. The code uses 5, 1, 7 and 2. If the 7 were first, nothing in 5793 could be in place, so the 2 is last (7492). Then 8071 puts the 7 third, 5793 puts the 5 first, and the 1 fills the gap: 5-1-7-2.'
    },
    {
      id: 'm3', lv: 'medium', title: 'Old Phone Texts', prize: 'An invite to tea',
      setup: 'Your great-aunt still uses her old mobile phone. She sent a text, but it came through as the buttons she pressed.',
      dev: { t: 'msg' }, cipher: { t: 'multitap' }, plain: 'TEA AT FOUR', tool: 'phone',
      scene: { bg: 'desk', items: [
        { t: 'mobile', x: 40, y: 18 },
        { t: 'teacup', x: 250, y: 120 },
        { t: 'sticky', x: 236, y: 22, w: 128, h: 82, rot: 4, hand: ['Press once for the', 'first letter, twice', 'for the second...'] }
      ] },
      hints: ['On old phones you pressed a key once for its first letter, twice for its second, three times for its third.', '33 means press 3 twice. 3 has D, E, F, so 33 is E.'],
      explain: 'Multi-tap texting: 8 = T, 33 = E, 2 = A, 333 = F, 666 = O, 88 = U, 777 = R. It reads TEA AT FOUR.'
    },
    {
      id: 'm4', lv: 'medium', title: 'The Two-Rail Fence', prize: 'A lost pony, safe and sound',
      setup: 'The farmer found a note on the fence. The letters look jumbled, but they\'re all there. Look at how the fence is built.',
      dev: { t: 'msg' }, cipher: { t: 'rail', k: 2 }, plain: 'MEET AT THE BARN',
      scene: { bg: 'garden', items: [
        { t: 'fence', x: 0, y: 112, w: 400, rails: 2 },
        { t: 'card', x: 120, y: 30, w: 170, h: 58, rot: -2, pin: true, type: ['MEATEAN', 'ETTHBR'] },
        { t: 'zigzag', x: 112, y: 186, n: 2 }
      ] },
      hints: ['The letters were written in a zigzag on two rails, then the top rail was read out first and the bottom rail after.', 'Take a letter from the top line, then one from the bottom line, and keep swapping: M, E, E, T...'],
      explain: 'A rail fence with 2 rails: the message zigzags between two lines, and each line is read off in turn. Swapping between the lines gives MEET AT THE BARN.'
    },
    {
      id: 'm5', lv: 'medium', title: 'The Lemon Kitchen', prize: "Grandma's lemon cake recipe",
      setup: 'Grandma\'s lemon cake recipe is in code. She says the key word is her secret ingredient, and it\'s up on the shelf.',
      dev: { t: 'msg' }, cipher: { t: 'keyword', kw: 'LEMON' }, plain: 'THE RECIPE IS IN THE TEAPOT', tool: 'keyword',
      scene: { bg: 'kitchen', items: [
        { t: 'shelf', x: 30, y: 96, w: 340 },
        { t: 'jar', x: 48, y: 36, h: 60, label: 'FLOUR', c: '#f2ead8' },
        { t: 'jar', x: 128, y: 30, h: 66, label: 'LEMON', c: '#f6e27a' },
        { t: 'jar', x: 210, y: 40, h: 56, label: 'SUGAR', c: '#f7f4ee' },
        { t: 'teapot', x: 286, y: 44 },
        { t: 'card', x: 104, y: 132, w: 196, h: 92, rot: -2, type: ['RECIPE No. 12', 'TOP SECRET'] }
      ] },
      hints: ['It\'s a keyword cipher. Write the key word, then the rest of the alphabet without those letters. That row lines up under A to Z.', 'The key word is LEMON, so A = L, B = E, C = M, D = O, E = N, F = A...'],
      explain: 'Keyword cipher with LEMON: the code alphabet is LEMONABCDFGHIJKPQRSTUVWXYZ, lined up under ABCDEFGHIJKLMNOPQRSTUVWXYZ. Reading back gives THE RECIPE IS IN THE TEAPOT.'
    },
    {
      id: 'm6', lv: 'medium', title: 'The Chalk Wall', prize: 'The key to the treehouse',
      setup: 'Someone chalked a message on the garden wall in pigpen shapes. Rain has washed most of their key away, but a few letters are left.',
      dev: { t: 'msg' }, cipher: { t: 'pigpen' }, plain: 'LOOK INSIDE THE BIRDHOUSE', tool: 'pigpen-part',
      scene: { bg: 'brick', items: [{ t: 'chalkkey', x: 20, y: 20, show: 'ABJKS' }, { t: 'birdhouse', x: 300, y: 40 }] },
      hints: ['Fill in the rest of the key: the letters go in order, left to right and top to bottom, through each grid.', 'The plain grid holds A to I, the dotted grid J to R, the X holds S to V and the dotted X holds W to Z.'],
      explain: 'Pigpen again, with a key you had to finish: A to I in the plain grid, J to R in the dotted grid, S to V in the X and W to Z in the dotted X. It reads LOOK INSIDE THE BIRDHOUSE.'
    },
    {
      id: 'm7', lv: 'medium', title: 'The Study Safe', prize: 'A box of old letters',
      setup: 'The professor\'s wall safe needs three numbers. Her desk note reads: add the dice, read the minutes, count every pane.',
      dev: { t: 'dial', n: 3, max: 40 }, ans: '11-25-12',
      scene: { bg: 'room', wall: '#4c5a3c', items: [
        { t: 'window', x: 26, y: 26, w: 88, h: 106, view: 'day', panes: [2, 3] },
        { t: 'window', x: 286, y: 26, w: 88, h: 106, view: 'day', panes: [2, 3] },
        { t: 'clock', x: 200, y: 66, r: 38, h: 3, m: 25 },
        { t: 'table', x: 10, y: 170, w: 380 },
        { t: 'dice', x: 140, y: 140, v: [5, 6] },
        { t: 'lampdesk', x: 300, y: 120 }
      ] },
      hints: ['Three numbers: the two dice added together, the minutes on the clock, then all the window panes.', 'The dice show 5 and 6, which make 11. The clock says 3:25.'],
      explain: '5 + 6 on the dice is 11, the clock shows 25 minutes past, and two windows of 6 panes make 12. The combination is 11-25-12.'
    },
    {
      id: 'm8', lv: 'medium', title: 'The Treasure Chest', prize: 'A crown of paper gold',
      setup: 'A carved chest in the attic has a three-number lock. A label tied to the handle says: "Add up my name. A is 1, B is 2."',
      dev: { t: 'lock', n: 3 }, ans: '107', tool: 'a1z26',
      scene: { bg: 'attic', items: [{ t: 'chest', x: 70, y: 96, word: 'TREASURE' }, { t: 'tag', x: 270, y: 120, hand: ['Add up my name.', 'A is 1, B is 2...'] }] },
      hints: ['Turn each letter of TREASURE into its number, then add them all up.', 'T = 20, R = 18, E = 5, A = 1. Keep going with S, U, R, E.'],
      explain: 'T 20 + R 18 + E 5 + A 1 + S 19 + U 21 + R 18 + E 5 = 107.'
    },
    {
      id: 'm9', lv: 'medium', title: 'The Fence Posts', prize: 'The gate key',
      setup: 'The gardener locked the shed with a word lock. He says the word is "in the posts". Some posts are tall and some are short.',
      dev: { t: 'cryptex', n: 4 }, ans: 'GATE', tool: 'morse',
      scene: { bg: 'garden', items: [{ t: 'posts', x: 18, y: 70, word: 'GATE' }, { t: 'shed', x: 290, y: 34 }] },
      hints: ['Tall posts are dashes and short posts are dots. The gaps split the letters. It\'s Morse code.', 'The first group is tall, tall, short: --. which is G.'],
      explain: 'Morse code in fence posts: tall = dash, short = dot. --. is G, .- is A, - is T and . is E. The word is GATE.'
    },
    {
      id: 'm10', lv: 'medium', title: 'The Holiday Lights', prize: 'The hidden presents',
      setup: 'The cupboard under the stairs has a keypad. Dad strung up four rows of lights and said "the lit ones count".',
      dev: { t: 'keypad', n: 4 }, ans: '5397', kind: 'Binary lights',
      scene: { bg: 'room', wall: '#2c3550', items: [{ t: 'bulbs', x: 70, y: 16, rows: ['0101', '0011', '1001', '0111'], labels: [8, 4, 2, 1] }] },
      hints: ['Each row of bulbs is one number. Add up the numbers above the bulbs that are lit.', 'Row one has the 4 and the 1 lit: 4 + 1 = 5.'],
      explain: 'Each row is a binary number: add the place values of the lit bulbs. 4+1 = 5, 2+1 = 3, 8+1 = 9 and 4+2+1 = 7. The code is 5397.'
    },

    // ═══ HARD ═══════════════════════════════════════════════════════════════
    {
      id: 'h1', lv: 'hard', title: 'The Actor\'s Script', prize: 'A signed theatre poster',
      setup: 'A famous line from a play, typed on the stage manager\'s desk in a letter-swap code. Every letter stands for another one.',
      dev: { t: 'msg' }, cipher: { t: 'crypto', seed: 1601 }, plain: 'TO BE OR NOT TO BE THAT IS THE QUESTION', by: 'William Shakespeare, Hamlet', tool: 'crypto',
      scene: { bg: 'stage', items: [{ t: 'crown', x: 60, y: 110 }, { t: 'quill', x: 280, y: 100 }] },
      hints: ['Look at the two-letter words: they repeat. Common ones are TO, BE, OF, IN, IS and IT.', 'The first two words are TO BE.'],
      explain: 'A cryptogram: each letter was swapped for another, the same way every time. Short words and repeats crack it: TO BE OR NOT TO BE, THAT IS THE QUESTION (Hamlet).'
    },
    {
      id: 'h2', lv: 'hard', title: 'The Ship\'s Log', prize: 'The captain\'s compass',
      setup: 'The last page of the captain\'s log is in his private letter-swap code. It\'s a saying he loved.',
      dev: { t: 'msg' }, cipher: { t: 'crypto', seed: 7704 }, plain: 'A JOURNEY OF A THOUSAND MILES BEGINS WITH A SINGLE STEP', by: 'Laozi', tool: 'crypto',
      scene: { bg: 'cabin', items: [{ t: 'wheel', x: 286, y: 40 }, { t: 'compass', x: 60, y: 120 }, { t: 'lantern', x: 160, y: 40 }] },
      hints: ['A one-letter word is almost always A or I.', 'The first word is A, and the last word is STEP.'],
      explain: 'A cryptogram. The one-letter word A appears three times, and with STEP at the end the rest falls into place: A JOURNEY OF A THOUSAND MILES BEGINS WITH A SINGLE STEP (Laozi).'
    },
    {
      id: 'h3', lv: 'hard', title: 'The Vault Padlock', prize: 'The bank\'s golden key',
      setup: 'The old bank vault has a four-number padlock. A safecracker left notes on six tries before giving up.',
      dev: { t: 'lock', n: 4 }, ans: '3916',
      mm: [{ g: '4695', a: 0, b: 2 }, { g: '9468', a: 0, b: 2 }, { g: '1783', a: 0, b: 2 }, { g: '6841', a: 0, b: 2 }, { g: '4096', a: 1, b: 1 }, { g: '7482', a: 0, b: 0 }],
      scene: { bg: 'dungeon', items: [{ t: 'mm', x: 12, y: 6, w: 376 }] },
      hints: ['7, 4, 8 and 2 are not in the code. Cross them out everywhere.', 'With 4 and 8 gone, 9468 says 9 and 6 are in the code, and 6841 says 6 and 1 are. 1783 says 1 and 3 are.'],
      explain: 'Taking out 7, 4, 8 and 2, 9468 says 9 and 6 are in, and 1783 says 1 and 3 are. So the code uses 3, 9, 1 and 6. 4096 needs one in place: the 9 can\'t be third (4695), so the 6 is last. The 9 isn\'t first (9468) or third, so it\'s second. The 1 isn\'t first (1783), so it\'s third, and the 3 goes first: 3-9-1-6.'
    },
    {
      id: 'h4', lv: 'hard', title: 'The Castle Library', prize: 'The lost crown jewels',
      setup: 'The castle librarian left a coded note. "My key word is on the shelf," it says, "read the first letters."',
      dev: { t: 'msg' }, cipher: { t: 'keyword', kw: 'CASTLE' }, plain: 'THE CROWN IS BEHIND THE PORTRAIT', tool: 'keyword',
      scene: { bg: 'library', items: [{ t: 'spines', x: 26, y: 40, titles: ['Clocks', 'Apples', 'Stars', 'Tides', 'Lanterns', 'Eagles'] }, { t: 'portrait', x: 300, y: 36 }] },
      hints: ['Read the first letter of each book title, left to right. That\'s the key word.', 'The key word is CASTLE, so the code alphabet starts C A S T L E B D F G H...'],
      explain: 'The first letters of Clocks, Apples, Stars, Tides, Lanterns and Eagles spell CASTLE. As a keyword cipher, A = C, B = A, C = S and so on. It reads THE CROWN IS BEHIND THE PORTRAIT.'
    },
    {
      id: 'h5', lv: 'hard', title: 'The Three-Rail Fence', prize: 'The wishing well\'s gold',
      setup: 'Another fence note, but this fence has three rails. The letters zigzag down and back up again.',
      dev: { t: 'msg' }, cipher: { t: 'rail', k: 3 }, plain: 'THE GOLD IS IN THE WELL',
      scene: { bg: 'garden', items: [
        { t: 'fence', x: 0, y: 106, w: 400, rails: 3 },
        { t: 'card', x: 92, y: 18, w: 216, h: 74, rot: 2, pin: true, type: ['TOSHL', 'HGLIITEEL', 'EDNW'] },
        { t: 'well', x: 300, y: 150 }
      ] },
      hints: ['The message zigzags across three rails: top, middle, bottom, middle, top... Each rail was read out in turn.', 'Write the top line on the top rail with gaps of three between letters: T _ _ _ O _ _ _ S... Then fill the middle and bottom rails into the gaps.'],
      explain: 'A 3-rail fence: the letters zigzag down and up across three lines, and each line is read out in turn. Rebuilding the zigzag gives THE GOLD IS IN THE WELL.'
    },
    {
      id: 'h6', lv: 'hard', title: 'The Spy\'s Telegram', prize: 'A medal for the codebreaker',
      setup: 'An intercepted telegram. It\'s a Caesar shift, but nobody knows how far. You\'ll have to find the shift yourself.',
      dev: { t: 'msg' }, cipher: { t: 'caesar', k: 7 }, plain: 'WHERE THERE IS A WILL THERE IS A WAY', tool: 'wheel',
      scene: { bg: 'desk', items: [{ t: 'telegram', x: 30, y: 26, w: 340, h: 188 }] },
      hints: ['The one-letter word is probably A. Turn the wheel until that code letter sits over A.', 'The shift is 7: H goes back to A, O goes back to H.'],
      explain: 'A Caesar shift of 7. The lone letter H had to be A, which gives the shift. It reads WHERE THERE IS A WILL THERE IS A WAY.'
    },
    {
      id: 'h7', lv: 'hard', title: 'The Grid Note', prize: 'Tickets to the boat race',
      setup: 'A note slipped into your pocket in four jumbled groups. On the back is a grid with four columns, and the words "rows of four".',
      dev: { t: 'msg' }, cipher: { t: 'columns', k: 4 }, plain: 'MEET AT THE BRIDGE AT TEN',
      scene: { bg: 'desk', items: [{ t: 'card', x: 20, y: 30, w: 190, h: 120, rot: -3, type: ['MAEDT', 'ETBGT', 'ETREE', 'THIAN'] }, { t: 'gridpad', x: 230, y: 24, cols: 4, rows: 5 }] },
      hints: ['The message was written in rows of four letters, then read down each column. Write each group down a column.', 'Put MAEDT down the first column and ETBGT down the second. Now read across the rows.'],
      explain: 'A column transposition: the message was written in rows of 4 and each column was read out. Writing the four groups back as columns and reading across gives MEET AT THE BRIDGE AT TEN.'
    },
    {
      id: 'h8', lv: 'hard', title: 'The Logic Safe', prize: 'The family silver',
      setup: 'The hotel safe needs three numbers. The manager forgot them, but she wrote down three facts about them.',
      dev: { t: 'dial', n: 3, max: 40 }, ans: '8-24-34', kind: 'Logic',
      scene: { bg: 'desk', items: [{ t: 'card', x: 24, y: 22, w: 352, h: 192, rot: -1, hand: ['The second number is three times the first.', 'The third is ten more than the second.', 'All three add up to 66.'], lined: true }] },
      hints: ['Call the first number "one lot". Then the second is three lots and the third is three lots plus 10.', 'That\'s seven lots plus 10 = 66, so seven lots = 56 and one lot is 8.'],
      explain: 'If the first number is x, the second is 3x and the third is 3x + 10. Together 7x + 10 = 66, so x = 8. The numbers are 8, 24 and 34.'
    },
    {
      id: 'h9', lv: 'hard', title: 'The Star Signal', prize: 'A seat on the first flight',
      setup: 'The observatory picked up a signal in strange symbols. A scrap from the last codebreaker matches four of them to letters.',
      dev: { t: 'msg' }, cipher: { t: 'glyph' }, plain: 'WE COME IN PEACE', tool: 'glyph',
      scene: { bg: 'space', items: [{ t: 'dish', x: 250, y: 60 }, { t: 'glyphkey', x: 26, y: 40, show: 'WECO' }] },
      hints: ['Fill in the four symbols from the scrap wherever they appear, then guess the words around them.', 'The second word is COME.'],
      explain: 'A symbol swap with half a key. W, E, C and O from the scrap give W E _ C O _ E _ _ _ _ E _ C E, and the words fall into place: WE COME IN PEACE.'
    },
    {
      id: 'h10', lv: 'hard', title: 'The Radio Room', prize: 'The ship\'s radio log',
      setup: 'The radio room door has a keypad. The last message is still on the tape, and the operator scribbled "last in, first out".',
      dev: { t: 'keypad', n: 4 }, ans: '4237', tool: 'morse',
      scene: { bg: 'night', items: [{ t: 'radio', x: 30, y: 30 }, { t: 'tape', x: 24, y: 168, w: 352, morse: '7324' }, { t: 'sticky', x: 266, y: 30, w: 110, h: 76, rot: 5, hand: ['Last in,', 'first out!'] }] },
      hints: ['Numbers in Morse always have five marks. Count the dots: 1 dot then dashes is 1, 2 dots is 2... and dashes first count up from 6.', 'The tape says 7 3 2 4. "Last in, first out" means read it from the end.'],
      explain: 'Morse numbers: --... = 7, ...-- = 3, ..--- = 2 and ....- = 4. Read last to first, the code is 4237.'
    }
  ],

  // Endless codes: proverbs, public-domain lines and true facts (k: p proverb, q quote, f fact)
  phrases: [
    { t: 'THE EARLY BIRD CATCHES THE WORM', k: 'p' }, { t: 'ACTIONS SPEAK LOUDER THAN WORDS', k: 'p' }, { t: 'BETTER LATE THAN NEVER', k: 'p' },
    { t: 'TWO HEADS ARE BETTER THAN ONE', k: 'p' }, { t: 'PRACTICE MAKES PERFECT', k: 'p' }, { t: 'LOOK BEFORE YOU LEAP', k: 'p' },
    { t: 'SLOW AND STEADY WINS THE RACE', k: 'q', by: 'Aesop' }, { t: "DON'T COUNT YOUR CHICKENS BEFORE THEY HATCH", k: 'p' },
    { t: 'EVERY CLOUD HAS A SILVER LINING', k: 'p' }, { t: 'A PICTURE IS WORTH A THOUSAND WORDS', k: 'p' },
    { t: 'WHEN IN ROME, DO AS THE ROMANS DO', k: 'p' }, { t: "ROME WASN'T BUILT IN A DAY", k: 'p' }, { t: 'MANY HANDS MAKE LIGHT WORK', k: 'p' },
    { t: "WHERE THERE'S A WILL, THERE'S A WAY", k: 'p' }, { t: 'KNOWLEDGE IS POWER', k: 'p' }, { t: 'AN APPLE A DAY KEEPS THE DOCTOR AWAY', k: 'p' },
    { t: 'BIRDS OF A FEATHER FLOCK TOGETHER', k: 'p' }, { t: "DON'T JUDGE A BOOK BY ITS COVER", k: 'p' }, { t: 'FORTUNE FAVORS THE BOLD', k: 'p' },
    { t: 'GREAT MINDS THINK ALIKE', k: 'p' }, { t: 'HONESTY IS THE BEST POLICY', k: 'p' }, { t: "IT'S NEVER TOO LATE TO LEARN", k: 'p' },
    { t: 'LAUGHTER IS THE BEST MEDICINE', k: 'p' }, { t: 'MAKE HAY WHILE THE SUN SHINES', k: 'p' }, { t: 'NO NEWS IS GOOD NEWS', k: 'p' },
    { t: 'PATIENCE IS A VIRTUE', k: 'p' }, { t: 'STILL WATERS RUN DEEP', k: 'p' }, { t: "THERE'S NO PLACE LIKE HOME", k: 'p' },
    { t: 'TOO MANY COOKS SPOIL THE BROTH', k: 'p' }, { t: 'WHAT GOES UP MUST COME DOWN', k: 'p' }, { t: 'A FRIEND IN NEED IS A FRIEND INDEED', k: 'p' },
    { t: 'ALL GOOD THINGS COME TO AN END', k: 'p' }, { t: 'BEAUTY IS IN THE EYE OF THE BEHOLDER', k: 'p' }, { t: 'BETTER SAFE THAN SORRY', k: 'p' },
    { t: "DON'T PUT ALL YOUR EGGS IN ONE BASKET", k: 'p' }, { t: 'EVERY DOG HAS ITS DAY', k: 'p' }, { t: 'HOME IS WHERE THE HEART IS', k: 'p' },
    { t: 'OUT OF SIGHT, OUT OF MIND', k: 'p' }, { t: 'PRACTICE WHAT YOU PREACH', k: 'p' }, { t: 'STRIKE WHILE THE IRON IS HOT', k: 'p' },
    { t: 'THE GRASS IS ALWAYS GREENER ON THE OTHER SIDE', k: 'p' }, { t: "TWO WRONGS DON'T MAKE A RIGHT", k: 'p' }, { t: 'A WATCHED POT NEVER BOILS', k: 'p' },
    { t: 'ALL THAT GLITTERS IS NOT GOLD', k: 'p' }, { t: 'OLD HABITS DIE HARD', k: 'p' }, { t: 'ONE GOOD TURN DESERVES ANOTHER', k: 'p' },
    { t: 'SILENCE IS GOLDEN', k: 'p' }, { t: 'IT TAKES TWO TO TANGO', k: 'p' }, { t: 'NECESSITY IS THE MOTHER OF INVENTION', k: 'p' },
    { t: 'A PENNY SAVED IS A PENNY EARNED', k: 'p' }, { t: 'EASY COME, EASY GO', k: 'p' }, { t: 'TIME AND TIDE WAIT FOR NO ONE', k: 'p' },
    { t: 'THE PEN IS MIGHTIER THAN THE SWORD', k: 'q', by: 'Edward Bulwer-Lytton' }, { t: 'DON\'T CRY OVER SPILT MILK', k: 'p' },
    { t: 'YOU CAN\'T TEACH AN OLD DOG NEW TRICKS', k: 'p' }, { t: 'A ROLLING STONE GATHERS NO MOSS', k: 'p' }, { t: 'HASTE MAKES WASTE', k: 'p' },
    { t: 'IF AT FIRST YOU DON\'T SUCCEED, TRY, TRY AGAIN', k: 'p' }, { t: 'LIGHTNING NEVER STRIKES TWICE', k: 'p' },
    { t: 'THE BEST THINGS IN LIFE ARE FREE', k: 'p' }, { t: 'KEEP YOUR FRIENDS CLOSE', k: 'p' }, { t: 'EVERY ROSE HAS ITS THORN', k: 'p' },

    { t: 'ALL THE WORLD\'S A STAGE', k: 'q', by: 'William Shakespeare, As You Like It' },
    { t: 'BREVITY IS THE SOUL OF WIT', k: 'q', by: 'William Shakespeare, Hamlet' },
    { t: 'THE COURSE OF TRUE LOVE NEVER DID RUN SMOOTH', k: 'q', by: "William Shakespeare, A Midsummer Night's Dream" },
    { t: 'WE KNOW WHAT WE ARE, BUT KNOW NOT WHAT WE MAY BE', k: 'q', by: 'William Shakespeare, Hamlet' },
    { t: 'THERE IS NOTHING EITHER GOOD OR BAD, BUT THINKING MAKES IT SO', k: 'q', by: 'William Shakespeare, Hamlet' },
    { t: 'NOTHING WILL COME OF NOTHING', k: 'q', by: 'William Shakespeare, King Lear' },
    { t: "THE GAME'S AFOOT", k: 'q', by: 'William Shakespeare, Henry V' },
    { t: 'A HORSE, A HORSE, MY KINGDOM FOR A HORSE', k: 'q', by: 'William Shakespeare, Richard III' },
    { t: 'WELL DONE IS BETTER THAN WELL SAID', k: 'q', by: 'Benjamin Franklin' },
    { t: 'LOST TIME IS NEVER FOUND AGAIN', k: 'q', by: 'Benjamin Franklin' },
    { t: 'EARLY TO BED AND EARLY TO RISE MAKES A MAN HEALTHY, WEALTHY AND WISE', k: 'q', by: 'Benjamin Franklin' },
    { t: 'A JOURNEY OF A THOUSAND MILES BEGINS WITH A SINGLE STEP', k: 'q', by: 'Laozi' },
    { t: 'NO ACT OF KINDNESS, NO MATTER HOW SMALL, IS EVER WASTED', k: 'q', by: 'Aesop' },
    { t: 'I THINK, THEREFORE I AM', k: 'q', by: 'René Descartes' },
    { t: 'WELL BEGUN IS HALF DONE', k: 'q', by: 'Aristotle' },
    { t: 'I CAME, I SAW, I CONQUERED', k: 'q', by: 'Julius Caesar' },
    { t: 'THE DIE IS CAST', k: 'q', by: 'Julius Caesar' },
    { t: 'EXPERIENCE IS THE TEACHER OF ALL THINGS', k: 'q', by: 'Julius Caesar' },
    { t: 'GIVE ME A PLACE TO STAND AND I WILL MOVE THE EARTH', k: 'q', by: 'Archimedes' },
    { t: 'IF I HAVE SEEN FURTHER, IT IS BY STANDING ON THE SHOULDERS OF GIANTS', k: 'q', by: 'Isaac Newton' },
    { t: 'THE ONLY WAY TO HAVE A FRIEND IS TO BE ONE', k: 'q', by: 'Ralph Waldo Emerson' },
    { t: 'HOPE IS THE THING WITH FEATHERS', k: 'q', by: 'Emily Dickinson' },
    { t: 'THE WOODS ARE LOVELY, DARK AND DEEP', k: 'q', by: 'Robert Frost' },
    { t: 'TWO ROADS DIVERGED IN A WOOD', k: 'q', by: 'Robert Frost' },
    { t: 'THE BEST WAY OUT IS ALWAYS THROUGH', k: 'q', by: 'Robert Frost' },
    { t: 'IT WAS THE BEST OF TIMES, IT WAS THE WORST OF TIMES', k: 'q', by: 'Charles Dickens, A Tale of Two Cities' },
    { t: 'CALL ME ISHMAEL', k: 'q', by: 'Herman Melville, Moby-Dick' },
    { t: 'CURIOUSER AND CURIOUSER, CRIED ALICE', k: 'q', by: "Lewis Carroll, Alice's Adventures in Wonderland" },
    { t: "WE'RE ALL MAD HERE", k: 'q', by: "Lewis Carroll, Alice's Adventures in Wonderland" },
    { t: 'SOMETIMES I\'VE BELIEVED AS MANY AS SIX IMPOSSIBLE THINGS BEFORE BREAKFAST', k: 'q', by: 'Lewis Carroll, Through the Looking-Glass' },
    { t: 'TRUTH IS STRANGER THAN FICTION', k: 'q', by: 'Mark Twain' },
    { t: 'GENIUS IS ONE PERCENT INSPIRATION AND NINETY NINE PERCENT PERSPIRATION', k: 'q', by: 'Thomas Edison' },
    { t: 'SPEAK SOFTLY AND CARRY A BIG STICK', k: 'q', by: 'Theodore Roosevelt' },
    { t: 'DO WHAT YOU CAN, WITH WHAT YOU HAVE, WHERE YOU ARE', k: 'q', by: 'Theodore Roosevelt' },
    { t: 'THE ONLY THING WE HAVE TO FEAR IS FEAR ITSELF', k: 'q', by: 'Franklin D. Roosevelt' },
    { t: 'FOUR SCORE AND SEVEN YEARS AGO', k: 'q', by: 'Abraham Lincoln' },
    { t: "THAT'S ONE SMALL STEP FOR MAN, ONE GIANT LEAP FOR MANKIND", k: 'q', by: 'Neil Armstrong' },
    { t: 'WHEN YOU HAVE ELIMINATED THE IMPOSSIBLE, WHATEVER REMAINS, HOWEVER IMPROBABLE, MUST BE THE TRUTH', k: 'q', by: 'Arthur Conan Doyle, The Sign of the Four' },
    { t: 'YOU SEE, BUT YOU DO NOT OBSERVE', k: 'q', by: 'Arthur Conan Doyle, A Scandal in Bohemia' },
    { t: 'UNITED WE STAND, DIVIDED WE FALL', k: 'q', by: 'Aesop' },

    { t: 'AN OCTOPUS HAS THREE HEARTS', k: 'f' }, { t: 'A GROUP OF FLAMINGOS IS CALLED A FLAMBOYANCE', k: 'f' },
    { t: 'BANANAS ARE BERRIES, BUT STRAWBERRIES ARE NOT', k: 'f' }, { t: 'SHARKS ARE OLDER THAN TREES', k: 'f' },
    { t: 'A DAY ON VENUS IS LONGER THAN ITS YEAR', k: 'f' }, { t: 'THE EIFFEL TOWER GROWS TALLER IN SUMMER', k: 'f' },
    { t: 'LIGHTNING IS HOTTER THAN THE SURFACE OF THE SUN', k: 'f' }, { t: 'SEA OTTERS HOLD HANDS WHEN THEY SLEEP', k: 'f' },
    { t: 'WOMBATS MAKE CUBE SHAPED POOP', k: 'f' }, { t: "AN OSTRICH'S EYE IS BIGGER THAN ITS BRAIN", k: 'f' },
    { t: 'A SNAIL HAS THOUSANDS OF TINY TEETH', k: 'f' }, { t: 'THE BLUE WHALE IS THE BIGGEST ANIMAL EVER', k: 'f' },
    { t: 'THE MOON HAS MOONQUAKES', k: 'f' }, { t: 'MARS HAS THE TALLEST VOLCANO IN THE SOLAR SYSTEM', k: 'f' },
    { t: 'SATURN IS LESS DENSE THAN WATER', k: 'f' }, { t: 'KOALAS SLEEP UP TO TWENTY HOURS A DAY', k: 'f' },
    { t: 'SEA STARS HAVE NO BRAIN', k: 'f' }, { t: 'BUTTERFLIES TASTE WITH THEIR FEET', k: 'f' },
    { t: 'HUMMINGBIRDS CAN FLY BACKWARDS', k: 'f' }, { t: 'POLAR BEARS HAVE BLACK SKIN', k: 'f' },
    { t: 'SLOTHS CAN HOLD THEIR BREATH FOR FORTY MINUTES', k: 'f' }, { t: 'DOLPHINS SLEEP WITH ONE EYE OPEN', k: 'f' },
    { t: 'SUNLIGHT TAKES ABOUT EIGHT MINUTES TO REACH EARTH', k: 'f' }, { t: 'OWLS CANNOT MOVE THEIR EYES', k: 'f' },
    { t: "A SHRIMP'S HEART IS IN ITS HEAD", k: 'f' }, { t: 'FROGS DRINK WATER THROUGH THEIR SKIN', k: 'f' },
    { t: 'LOBSTERS TASTE WITH THEIR LEGS', k: 'f' }, { t: 'ELEPHANTS CANNOT JUMP', k: 'f' },
    { t: 'PEANUTS ARE NOT REALLY NUTS', k: 'f' }, { t: 'TOMATOES ARE FRUITS', k: 'f' }, { t: 'SPIDERS ARE NOT INSECTS', k: 'f' },
    { t: 'A BABY KANGAROO IS CALLED A JOEY', k: 'f' }, { t: 'A GROUP OF OWLS IS CALLED A PARLIAMENT', k: 'f' },
    { t: 'A GROUP OF CROWS IS CALLED A MURDER', k: 'f' }, { t: 'NO TWO ZEBRAS HAVE THE SAME STRIPES', k: 'f' },
    { t: 'SOME BAMBOO CAN GROW ALMOST A METER IN A DAY', k: 'f' }, { t: 'THE DOT OVER A LOWERCASE I IS CALLED A TITTLE', k: 'f' },
    { t: 'ANTARCTICA HAS NO NATIVE ANTS', k: 'f' }, { t: 'HONEY CAN LAST FOR THOUSANDS OF YEARS', k: 'f' },
    { t: 'VENUS SPINS THE OPPOSITE WAY TO MOST PLANETS', k: 'f' }, { t: 'GIRAFFES HAVE DARK BLUE TONGUES', k: 'f' },
    { t: 'A RAINBOW SEEN FROM A PLANE CAN BE A FULL CIRCLE', k: 'f' }, { t: 'CATS SLEEP FOR ABOUT TWO THIRDS OF THEIR LIVES', k: 'f' },
    { t: 'THE OCEAN COVERS MORE THAN TWO THIRDS OF EARTH', k: 'f' }, { t: 'THE GREAT WALL OF CHINA CANNOT BE SEEN FROM THE MOON', k: 'f' },
    { t: 'A GROUP OF JELLYFISH IS CALLED A SMACK', k: 'f' }, { t: 'APPLES FLOAT BECAUSE THEY ARE ONE QUARTER AIR', k: 'f' },
    { t: 'THE SUN IS A STAR', k: 'f' }, { t: 'JUPITER HAS A STORM BIGGER THAN EARTH', k: 'f' }, { t: 'A COW HAS FOUR STOMACH PARTS', k: 'f' },
    { t: 'AN ADULT HUMAN HAS TWO HUNDRED AND SIX BONES', k: 'f' }, { t: 'BATS ARE THE ONLY MAMMALS THAT CAN TRULY FLY', k: 'f' },
    { t: 'THE HEART OF A HUMMINGBIRD CAN BEAT OVER A THOUSAND TIMES A MINUTE', k: 'f' }
  ]
};

// ═══ More cases: Easy 11-30, Medium 11-30, Hard 11-30 ════════════════════════
window.CIPHER_DATA.cases = window.CIPHER_DATA.cases.concat([
  // ── EASY ──
  {
    id: 'e11', lv: 'easy', title: 'The Fruit Stall', prize: 'A bag of toffee apples',
    setup: 'The market stall\'s cash box has a three-number lock. The owner chalked a reminder on the price board.',
    dev: { t: 'lock', n: 3 }, ans: '538',
    scene: { bg: 'market', items: [
      { t: 'crate', x: 22, y: 150, fruit: 'apple', n: 5 }, { t: 'crate', x: 150, y: 150, fruit: 'pear', n: 3 }, { t: 'crate', x: 278, y: 150, fruit: 'lemon', n: 8 },
      { t: 'board', x: 120, y: 40, w: 160, h: 76, chalk: ['Apples, then', 'pears, then lemons'] }
    ] },
    hints: ['Count the fruit in each crate, in the order on the board.', 'There are 5 apples. Now count the pears and the lemons.'],
    explain: '5 apples, 3 pears and 8 lemons, in the order on the board: 5-3-8.'
  },
  {
    id: 'e12', lv: 'easy', title: 'The Night Train', prize: 'Your lost suitcase',
    setup: 'The luggage room on the train has a keypad. The guard says the code is on your ticket: carriage, then seat, then platform.',
    dev: { t: 'keypad', n: 4 }, ans: '4219',
    scene: { bg: 'train', items: [{ t: 'ticket', x: 110, y: 120, rot: -4, rows: [['FROM', 'Kingsley'], ['TO', 'Marsh End'], ['CARRIAGE', '4'], ['SEAT', '21'], ['PLATFORM', '9']] }] },
    hints: ['Read the ticket. The guard said: carriage, then seat, then platform.', 'Carriage 4, seat 21. What platform?'],
    explain: 'Carriage 4, seat 21, platform 9, typed in that order: 4219.'
  },
  {
    id: 'e13', lv: 'easy', title: 'The Campfire Tin', prize: 'A bag of marshmallows',
    setup: 'Your scout leader locked the snack tin with a word lock. On the tent flap is a tag with four numbers.',
    dev: { t: 'cryptex', n: 4 }, ans: 'FIRE', tool: 'a1z26',
    scene: { bg: 'camp', items: [{ t: 'tent', x: 30, y: 70 }, { t: 'campfire', x: 270, y: 150 }, { t: 'tag', x: 190, y: 120, hand: ['6 - 9 - 18 - 5', ''] }] },
    hints: ['Each number is a letter\'s place in the alphabet: A is 1, B is 2.', '6 is F and 9 is I.'],
    explain: 'Letters for numbers: 6 = F, 9 = I, 18 = R, 5 = E. The word is FIRE.'
  },
  {
    id: 'e14', lv: 'easy', title: 'The Arcade Locker', prize: 'A pocket full of tokens',
    setup: 'The arcade\'s prize locker has a three-number lock. A sticky note on the high score screen says what to do.',
    dev: { t: 'lock', n: 3 }, ans: '863',
    scene: { bg: 'arcade', items: [{ t: 'scoreboard', x: 90, y: 20, rows: [['ACE', '8410'], ['JAX', '6950'], ['MIA', '3120']] }, { t: 'sticky', x: 300, y: 140, w: 96, h: 88, rot: 5, hand: ['First number', 'of each', 'score'] }] },
    hints: ['Look at the high scores. Take the first number of each one.', 'The top score starts with 8.'],
    explain: '8410, 6950 and 3120 start with 8, 6 and 3: the code is 8-6-3.'
  },
  {
    id: 'e15', lv: 'easy', title: 'The Numbered Postcard', prize: 'A day out in the city',
    setup: 'Your pen pal sent a postcard with numbers instead of words. Under the stamp she wrote "A is 1".',
    dev: { t: 'msg' }, cipher: { t: 'a1z26' }, plain: 'MEET AT NOON', tool: 'a1z26',
    scene: { bg: 'desk', items: [{ t: 'postcard', x: 30, y: 30, nums: true, line: '13-5-5-20 / 1-20 / 14-15-15-14' }, { t: 'sticky', x: 262, y: 120, w: 110, h: 58, rot: 4, hand: ['A is 1!'] }, { t: 'pencil', x: 230, y: 200, rot: -10 }] },
    hints: ['Each number is a letter: A is 1, B is 2, all the way to Z is 26.', '13 is M and 5 is E. The first word is MEET.'],
    explain: 'Letters for numbers: 13-5-5-20 is MEET, 1-20 is AT and 14-15-15-14 is NOON.'
  },
  {
    id: 'e16', lv: 'easy', title: 'The Snow Hut', prize: 'A flask of hot chocolate',
    setup: 'The mountain hut keeps its first-aid safe locked. The note by the door says: the temperature, the door number, then count the skis.',
    dev: { t: 'dial', n: 3, max: 40 }, ans: '12-30-6',
    scene: { bg: 'snow', items: [{ t: 'hut', x: 120, y: 40, num: 30 }, { t: 'thermo', x: 40, y: 50, temp: 12 }, { t: 'skis', x: 300, y: 92, n: 3 }] },
    hints: ['Three numbers: the thermometer, the number on the door, then all the skis.', 'It\'s 12 degrees and the door is number 30.'],
    explain: '12 degrees, door number 30, and 3 pairs of skis make 6 skis: 12-30-6.'
  },
  {
    id: 'e17', lv: 'easy', title: 'The Library Note', prize: 'A long-lost library book',
    setup: 'A note was tucked in a library book. The words are in the right order, but each one looks wrong.',
    dev: { t: 'msg' }, cipher: { t: 'wordrev' }, plain: 'THE BOOKS ARE ON THE TOP SHELF',
    scene: { bg: 'library', items: [{ t: 'spines', x: 220, y: 40, titles: ['Atlas', 'Birds', 'Tales'] }, { t: 'card', x: 24, y: 50, w: 190, h: 120, rot: -3, type: ['EHT SKOOB ERA', 'NO EHT POT', 'FLEHS'] }] },
    hints: ['Each word is written backwards, but the words are still in order.', 'EHT is THE, and SKOOB is BOOKS.'],
    explain: 'Every word was flipped round on its own: EHT is THE, SKOOB is BOOKS. It reads THE BOOKS ARE ON THE TOP SHELF.'
  },
  {
    id: 'e18', lv: 'easy', title: 'The Ship\'s Bell', prize: 'A ship in a bottle',
    setup: 'The captain\'s cabin has a keypad. The bosun chalked how many times the bell rang at each watch.',
    dev: { t: 'keypad', n: 4 }, ans: '3142',
    scene: { bg: 'cabin', items: [{ t: 'shipbell', x: 280, y: 30 }, { t: 'board', x: 30, y: 40, w: 220, h: 150, dots: [3, 1, 4, 2], chalk: ['Bells today:'] }] },
    hints: ['Each group of dots is one number: count them.', 'The first group has 3 dots.'],
    explain: 'The groups have 3, 1, 4 and 2 dots: the code is 3142.'
  },
  {
    id: 'e19', lv: 'easy', title: 'The Pet Shop Case', prize: 'A squeaky toy mouse',
    setup: 'The pet shop owner\'s briefcase has a three-number lock. He says it\'s the shop cat\'s name, on phone keys.',
    dev: { t: 'brief', n: 3 }, ans: '236', tool: 'phone',
    scene: { bg: 'room', wall: '#3f6a5a', items: [{ t: 'basket', x: 110, y: 120, name: 'BEN' }, { t: 'phone', x: 276, y: 48 }] },
    hints: ['Find each letter of the cat\'s name on the phone keys.', 'B is on the 2 key.'],
    explain: 'BEN on phone keys: B is on 2, E on 3 and N on 6. The code is 236.'
  },
  {
    id: 'e20', lv: 'easy', title: 'The Classroom Grid', prize: 'The answers to Friday\'s quiz',
    setup: 'Your teacher wrote a message in number pairs. The grid on the board tells you how to read them: row first, then column.',
    dev: { t: 'msg' }, cipher: { t: 'polybius' }, plain: 'LOOK UNDER THE DESK', tool: 'polybius',
    scene: { bg: 'classroom', items: [{ t: 'polygrid', x: 120, y: 18, cell: 30, show: 'full' }, { t: 'text', x: 30, y: 60, s: 'Row,', size: 22, chalk: true }, { t: 'text', x: 30, y: 88, s: 'then', size: 22, chalk: true }, { t: 'text', x: 30, y: 116, s: 'column', size: 22, chalk: true }] },
    hints: ['Each pair of numbers is one letter: the first number is the row, the second is the column.', '31 is row 3, column 1: L.'],
    explain: 'A Polybius square: each letter is its row and column in the grid (I and J share a square). 31 34 34 25 is LOOK. It reads LOOK UNDER THE DESK.'
  },
  {
    id: 'e21', lv: 'easy', title: 'The Clock Tower', prize: 'The bell ringer\'s key',
    setup: 'The tower door has a three-number padlock. Three clocks hang on the tower, and the caretaker says "hours only, left to right".',
    dev: { t: 'lock', n: 3 }, ans: '274',
    scene: { bg: 'stone', items: [{ t: 'clock', x: 80, y: 90, r: 40, h: 2, m: 0 }, { t: 'clock', x: 200, y: 90, r: 40, h: 7, m: 0 }, { t: 'clock', x: 320, y: 90, r: 40, h: 4, m: 0 }, { t: 'sign', x: 120, y: 160, w: 160, h: 40, text: 'Hours only' }] },
    hints: ['Read the hour on each clock, from left to right.', 'The left clock says 2 o\'clock.'],
    explain: 'The clocks show 2, 7 and 4 o\'clock: 2-7-4.'
  },
  {
    id: 'e22', lv: 'easy', title: 'The Poem Box', prize: 'A book of poems',
    setup: 'A word lock on the poet\'s writing box. Her favourite poem is pinned above it, with a note: "read down my left edge".',
    dev: { t: 'cryptex', n: 5 }, ans: 'STORY', kind: 'Hidden word',
    scene: { bg: 'room', wall: '#6a4a5a', items: [{ t: 'card', x: 60, y: 14, w: 280, h: 196, lined: true, rot: -1, pin: true, hand: ['Softly falls the evening rain,', 'Tapping on the window pane,', 'Over hills the lanterns glow,', 'Rivers hum and breezes blow,', 'Yesterday is long ago.'] }] },
    hints: ['Look at the first letter of each line, top to bottom.', 'The first two lines start with S and T.'],
    explain: 'The first letters of the lines (Softly, Tapping, Over, Rivers, Yesterday) spell STORY. A hidden word like this is called an acrostic.'
  },
  {
    id: 'e23', lv: 'easy', title: 'The Party Balloons', prize: 'The birthday cake',
    setup: 'The cake is locked in the party room. The note on the door says: red, blue, green, yellow.',
    dev: { t: 'keypad', n: 4 }, ans: '8156',
    scene: { bg: 'party', items: [{ t: 'balloons', x: 20, y: 20, list: [['#3b7dd8', 1, 0], ['#f2c12e', 6, 1], ['#d83b3b', 8, 2], ['#4caf50', 5, 3], ['#9b59b6', 2, 4]] }, { t: 'note', x: 268, y: 140, w: 120, h: 70, rot: 4, pin: true, hand: ['Red, blue,', 'green, yellow'] }] },
    hints: ['Each balloon has a number. Read them in the colour order on the note.', 'The red balloon says 8.'],
    explain: 'Red 8, blue 1, green 5 and yellow 6: 8156. The purple balloon was a decoy.'
  },
  {
    id: 'e24', lv: 'easy', title: 'The Lake Hut', prize: 'A brand new fishing rod',
    setup: 'The fishing hut is padlocked. Scratched on the door: "fish, boats, ducks".',
    dev: { t: 'lock', n: 3 }, ans: '629',
    scene: { bg: 'lake', items: [{ t: 'boat', x: 60, y: 92 }, { t: 'boat', x: 240, y: 104, c: '#c0392b' }, { t: 'ducks', x: 40, y: 150, n: 9 }, { t: 'fishbasket', x: 300, y: 170, n: 6 }] },
    hints: ['Count the fish in the basket, then the boats, then the ducks.', 'There are 6 fish and 2 boats.'],
    explain: '6 fish, 2 boats and 9 ducks: 6-2-9.'
  },
  {
    id: 'e25', lv: 'easy', title: 'The Harbour Message', prize: 'A ride on the fishing boat',
    setup: 'The harbour master found this coded note on the jetty. Someone wrote on the back: "Caesar used three."',
    dev: { t: 'msg' }, cipher: { t: 'caesar', k: 3 }, plain: 'THE BOAT LEAVES AT DAWN', tool: 'wheel',
    scene: { bg: 'harbour', items: [{ t: 'boat', x: 230, y: 100 }, { t: 'card', x: 30, y: 120, w: 170, h: 74, rot: -3, hand: ['Caesar', 'used three.'] }, { t: 'lighthouse', x: 340, y: 20 }] },
    hints: ['Every letter was moved 3 places on. Move each one back 3: D goes back to A.', 'W goes back to T, K to H and H to E. The first word is THE.'],
    explain: 'A Caesar shift of 3, the one Julius Caesar is said to have used. Moving every letter back 3 gives THE BOAT LEAVES AT DAWN.'
  },
  {
    id: 'e26', lv: 'easy', title: 'The Dice Cups', prize: 'The board game cupboard',
    setup: 'The games cupboard has a little safe. Three cups sit on the table, and the note says: add the dice in each cup.',
    dev: { t: 'dial', n: 3, max: 40 }, ans: '10-5-12',
    scene: { bg: 'room', wall: '#2f4f6f', items: [{ t: 'table', x: 10, y: 170, w: 380 }, { t: 'cup', x: 30, y: 110, c: '#d83b3b', dice: [6, 4] }, { t: 'cup', x: 150, y: 110, c: '#3b7dd8', dice: [3, 2] }, { t: 'cup', x: 270, y: 110, c: '#4caf50', dice: [6, 6] }, { t: 'note', x: 120, y: 18, w: 160, h: 56, rot: -2, pin: true, hand: ['Red, blue, green.', 'Add each pair!'] }] },
    hints: ['Add the two dice in front of each cup.', 'The red cup has 6 and 4: that\'s 10.'],
    explain: 'Red 6 + 4 = 10, blue 3 + 2 = 5, green 6 + 6 = 12: 10-5-12.'
  },
  {
    id: 'e27', lv: 'easy', title: 'The Stepping Stones', prize: 'The key to the cottage',
    setup: 'The cottage door has a keypad. Grandad says: "follow the stepping stones from the gate".',
    dev: { t: 'keypad', n: 4 }, ans: '2947',
    scene: { bg: 'garden', items: [{ t: 'cottage', x: 270, y: 40 }, { t: 'gate', x: 6, y: 150 }, { t: 'stones', path: [[70, 205, 2], [140, 190, 9], [210, 200, 4], [270, 180, 7]], extra: [[150, 150, 1], [330, 224, 3], [196, 236, 5]] }] },
    hints: ['Start at the gate and follow the path of stones to the door.', 'The first stone on the path says 2.'],
    explain: 'Along the path from the gate: 2, 9, 4, 7. The stones off the path don\'t count. The code is 2947.'
  },
  {
    id: 'e28', lv: 'easy', title: 'The Flag Signal', prize: 'The sailing club trophy',
    setup: 'The sailing club locker has a word lock. Out on the jetty, sailors are signalling a word with flags.',
    dev: { t: 'cryptex', n: 4 }, ans: 'WAVE', tool: 'semaphore',
    scene: { bg: 'harbour', items: [{ t: 'semaphore', x: 20, y: 60, word: 'WAVE' }] },
    hints: ['Each sailor\'s two flags make one letter. The decoder shows every flag letter.', 'The first sailor holds one flag up and right, the other straight out right: that\'s W.'],
    explain: 'Flag semaphore: each letter is a pair of arm positions. The sailors signal W, A, V, E.'
  },
  {
    id: 'e29', lv: 'easy', title: 'The Kitchen Timer', prize: 'A plate of warm muffins',
    setup: 'The baking cupboard has a three-number lock. Mum\'s note: "the minutes on the timer, then the eggs".',
    dev: { t: 'lock', n: 3 }, ans: '453',
    scene: { bg: 'kitchen', items: [{ t: 'timer', x: 60, y: 110, min: 45 }, { t: 'eggs', x: 220, y: 158, n: 3 }, { t: 'note', x: 230, y: 30, w: 140, h: 70, rot: 3, pin: true, hand: ['Timer minutes,', 'then the eggs.'] }] },
    hints: ['The timer has two numbers, then count the eggs.', 'The timer says 45 minutes.'],
    explain: '45 minutes on the timer and 3 eggs: 4-5-3.'
  },
  {
    id: 'e30', lv: 'easy', title: 'The Walkie-Talkie', prize: 'A picnic in the den',
    setup: 'Your brother beeped a message over the walkie-talkie in long and short beeps. You wrote it down.',
    dev: { t: 'msg' }, cipher: { t: 'morse' }, plain: 'BRING SNACKS', tool: 'morse',
    scene: { bg: 'garden', items: [{ t: 'treehouse', x: 230, y: 20 }, { t: 'walkie', x: 60, y: 60 }] },
    hints: ['It\'s Morse code: dots are short beeps, dashes are long. The decoder has the chart.', '-... is B and .-. is R.'],
    explain: 'Morse code: -... = B, .-. = R, .. = I, -. = N, --. = G. It reads BRING SNACKS.'
  },

  // ── MEDIUM ──
  {
    id: 'm11', lv: 'medium', title: 'The Observatory', prize: 'A night at the big telescope',
    setup: 'The observatory safe holds the star charts. The astronomer\'s note: "all the stars, then the planets times ten, then the comets".',
    dev: { t: 'dial', n: 3, max: 40 }, ans: '9-30-2',
    scene: { bg: 'observatory', items: [{ t: 'sky', x: 40, y: 20, w: 320, h: 150, stars: 9, planets: 3, comets: 2 }, { t: 'telescope', x: 20, y: 120 }] },
    hints: ['Count the stars (the little points), the planets (round, some with rings) and the comets (with tails).', 'There are 9 stars and 3 planets: 3 × 10 = 30.'],
    explain: '9 stars, 3 planets × 10 = 30, and 2 comets: 9-30-2.'
  },
  {
    id: 'm12', lv: 'medium', title: 'The Station Timetable', prize: 'A first-class ticket',
    setup: 'The stationmaster\'s office has a keypad. The code is the time of the train to Seabrook, but coffee spilled on that line. A note says it leaves 25 minutes after the Oakham train.',
    dev: { t: 'keypad', n: 4 }, ans: '1445',
    scene: { bg: 'train', items: [{ t: 'timetable', x: 40, y: 22, rows: [['13:50', 'Kingsley', '2'], ['14:20', 'Oakham', '4'], ['??:??', 'Seabrook', '1'], ['15:05', 'Marsh End', '3']], stain: 2 }] },
    hints: ['Find the Oakham train and add 25 minutes to its time.', 'Oakham leaves at 14:20.'],
    explain: '14:20 plus 25 minutes is 14:45, typed as 1445.'
  },
  {
    id: 'm13', lv: 'medium', title: 'The Half-Rubbed Board', prize: 'The test papers, safe and sound',
    setup: 'Another number-pair message, but the cleaner rubbed out the grid. Only the numbers along the edges are left.',
    dev: { t: 'msg' }, cipher: { t: 'polybius' }, plain: 'THE TEST IS ON FRIDAY',
    scene: { bg: 'classroom', items: [{ t: 'polygrid', x: 120, y: 18, cell: 30, show: 'AB' }, { t: 'text', x: 24, y: 70, s: 'I and J', size: 20, chalk: true }, { t: 'text', x: 24, y: 96, s: 'share!', size: 20, chalk: true }] },
    hints: ['Fill the grid in alphabet order, left to right, row by row: A B C D E, then F G H I K... (I and J share a square).', '44 is row 4, column 4: T. 23 is H and 15 is E.'],
    explain: 'A Polybius square: the alphabet in a 5 × 5 grid, each letter written as row then column. 44 23 15 is THE. It reads THE TEST IS ON FRIDAY.'
  },
  {
    id: 'm14', lv: 'medium', title: 'The Mirror Alphabet', prize: 'Invitations to the party',
    setup: 'The party invitation is in a mirror alphabet. Someone started the key on the mirror in lipstick.',
    dev: { t: 'msg' }, cipher: { t: 'atbash' }, plain: 'THE PARTY IS AT NOON',
    scene: { bg: 'room', wall: '#7a5a6a', items: [{ t: 'bigmirror', x: 120, y: 14, lines: ['A = Z', 'B = Y', 'C = X', '...'] }] },
    hints: ['A swaps with Z, B with Y, C with X: the alphabet folded in half.', 'G is the 7th letter, so it swaps with the 7th from the end: T. GSV is THE.'],
    explain: 'The Atbash cipher: the alphabet is reversed, so A = Z, B = Y and so on. GSV KZIGB RH ZG MLLM reads THE PARTY IS AT NOON.'
  },
  {
    id: 'm15', lv: 'medium', title: 'The Claw Machine', prize: 'The giant teddy bear',
    setup: 'The claw machine\'s prize door has a four-number lock. The arcade owner left five tries with notes.',
    dev: { t: 'lock', n: 4 }, ans: '2804',
    mm: [{ g: '6905', a: 1, b: 0 }, { g: '9384', a: 1, b: 1 }, { g: '2519', a: 1, b: 0 }, { g: '9537', a: 0, b: 0 }, { g: '5146', a: 0, b: 1 }],
    scene: { bg: 'arcade', items: [{ t: 'mm', x: 12, y: 6, w: 376 }] },
    hints: ['9, 5, 3 and 7 are not in the code, so 9384 gives you 8 and 4.', '5146 has one right number: the 4. So 1 and 6 are out, and 6905 puts the 0 third.'],
    explain: '9, 5, 3 and 7 are out, so 9384 puts 8 and 4 in the code. 5146 has only one right number, the 4, so 1 and 6 are out. Then 6905 means the 0 is third and 2519 means the 2 is first. 9384 has one in place: the 4, last. The 8 takes second: 2-8-0-4.'
  },
  {
    id: 'm16', lv: 'medium', title: 'The Lookout Post', prize: 'The captain\'s spyglass',
    setup: 'From the lookout post a sailor signalled a message with flags. You sketched each signal.',
    dev: { t: 'msg' }, cipher: { t: 'semaphore' }, plain: 'SHIP AHOY', tool: 'semaphore',
    scene: { bg: 'harbour', items: [{ t: 'lighthouse', x: 300, y: 10 }, { t: 'semaphore', x: 30, y: 70, word: 'SHIP' }] },
    hints: ['Each picture is a sailor\'s two flags, one letter each. Match them to the flag chart in the decoder.', 'The first word is SHIP.'],
    explain: 'Flag semaphore: each letter is shown by where the two flags point. It reads SHIP AHOY.'
  },
  {
    id: 'm17', lv: 'medium', title: 'The Book Code', prize: 'A signed first edition',
    setup: 'A spy\'s message is just pairs of numbers. On the desk lies the book they share, open at the right page.',
    dev: { t: 'msg' }, cipher: { t: 'book', page: ['The lake was still and grey that morning.', 'Nobody would meet the boat by the old pier.', 'Me, I waited on the bank with the map.'], picks: [[2, 3], [3, 1], [2, 6], [1, 1], [1, 2]] },
    plain: 'MEET ME BY THE LAKE',
    scene: { bg: 'desk', items: [{ t: 'bookpage', x: 14, y: 14, w: 250, h: 210 }, { t: 'card', x: 276, y: 40, w: 110, h: 120, rot: 4, type: ['line-word', '2-3 3-1', '2-6 1-1', '1-2'] }] },
    hints: ['Each pair is a line number, then a word number on that line.', '2-3 is line 2, word 3: MEET.'],
    explain: 'A book code: each pair points to a word in the shared book, line then word. 2-3 is MEET, 3-1 is ME, 2-6 is BY, 1-1 is THE and 1-2 is LAKE.'
  },
  {
    id: 'm18', lv: 'medium', title: 'The Greenhouse', prize: 'A prize-winning orchid',
    setup: 'The gardener\'s seed safe has three numbers. Her note: "the tallest plant, the one in flower, then add up the other two".',
    dev: { t: 'dial', n: 3, max: 40 }, ans: '17-8-10',
    scene: { bg: 'greenhouse', items: [{ t: 'plants', x: 10, y: 0, list: [[70, 4, 0], [150, 17, 0], [90, 8, 1], [60, 6, 0]] }] },
    hints: ['Each pot has a number on its label. Find the tallest plant and the one with a flower.', 'The tallest is 17 and the flowering one is 8. Add the other two labels.'],
    explain: 'The tallest plant is 17, the one in flower is 8, and the other two are 4 + 6 = 10: 17-8-10.'
  },
  {
    id: 'm19', lv: 'medium', title: 'The Bakery Door', prize: 'A basket of fresh bread',
    setup: 'The bakery\'s back door has a keypad. The baker always uses his own name, typed on phone keys.',
    dev: { t: 'keypad', n: 5 }, ans: '22537', tool: 'phone', kind: 'Phone keys',
    scene: { bg: 'market', items: [{ t: 'sign', x: 90, y: 30, w: 220, h: 56, text: 'BAKER & SONS' }, { t: 'loaves', x: 120, y: 150 }, { t: 'apron', x: 20, y: 90, name: 'BAKER' }] },
    hints: ['The baker\'s name is on the sign and his apron. Find each letter on the phone keys.', 'B and A are both on the 2 key.'],
    explain: 'BAKER on phone keys: B 2, A 2, K 5, E 3, R 7. The code is 22537.'
  },
  {
    id: 'm20', lv: 'medium', title: 'The Hall of Columns', prize: 'The museum\'s lost statue',
    setup: 'A Caesar note left in the museum. The guard heard the thief say "the shift is how many columns hold up this hall".',
    dev: { t: 'msg' }, cipher: { t: 'caesar', k: 5 }, plain: 'THE STATUE HIDES THE KEY', tool: 'wheel',
    scene: { bg: 'stone', items: [{ t: 'column', x: 14, y: 20 }, { t: 'column', x: 92, y: 20 }, { t: 'column', x: 170, y: 20 }, { t: 'column', x: 248, y: 20 }, { t: 'column', x: 326, y: 20 }] },
    hints: ['Count the columns: that\'s how far each letter moved.', 'There are 5 columns. Turn the wheel to 5: code Y is plain T.'],
    explain: '5 columns, so a Caesar shift of 5. YMJ is THE. It reads THE STATUE HIDES THE KEY.'
  },
  {
    id: 'm21', lv: 'medium', title: 'The Ferris Wheel', prize: 'Free rides all summer',
    setup: 'The fairground office has a word lock. The owner painted a letter on every car of the big wheel and said "from the red car, clockwise, every other one".',
    dev: { t: 'cryptex', n: 5 }, ans: 'PRIZE', kind: 'Hidden word',
    scene: { bg: 'fair', items: [{ t: 'ferris', x: 200, y: 112, letters: ['P', 'X', 'R', 'M', 'I', 'Q', 'Z', 'T', 'E', 'A'], red: 0 }] },
    hints: ['Start at the red car. Read it, skip one, read the next, going clockwise.', 'The red car says P, then skip X, then R.'],
    explain: 'From the red car clockwise, every other car: P, R, I, Z, E. The cars in between were decoys.'
  },
  {
    id: 'm22', lv: 'medium', title: 'The Bead Bracelet', prize: 'Your sister\'s secret diary',
    setup: 'Your sister\'s diary has a three-number lock. She wears a bracelet with three rows of light and dark beads, and a tag that says "8 4 2 1".',
    dev: { t: 'lock', n: 3 }, ans: '609', kind: 'Binary',
    scene: { bg: 'desk', items: [{ t: 'beads', x: 40, y: 40, rows: ['0110', '0000', '1001'] }, { t: 'tag', x: 270, y: 150, hand: ['8  4  2  1', 'dark counts'] }] },
    hints: ['Each row is one number. Dark beads count, using 8, 4, 2 and 1 from left to right.', 'The top row has the 4 and the 2 dark: 4 + 2 = 6.'],
    explain: 'Binary beads: row one 4 + 2 = 6, row two has no dark beads = 0, row three 8 + 1 = 9. The code is 609.'
  },
  {
    id: 'm23', lv: 'medium', title: 'The Bakery Receipt', prize: 'The baker\'s cash box',
    setup: 'The baker\'s briefcase opens with the total from yesterday\'s big order. The total on the receipt got smudged.',
    dev: { t: 'brief', n: 3 }, ans: '129', kind: 'Sums',
    scene: { bg: 'desk', items: [{ t: 'receipt', x: 110, y: 6, lines: [['12 buns', '× 4'], ['5 pies', '× 9'], ['3 cakes', '× 12']], total: true }] },
    hints: ['Work out each line: how many, times the price.', '12 × 4 = 48 and 5 × 9 = 45. Then the cakes, then add it all up.'],
    explain: '12 × 4 = 48, 5 × 9 = 45 and 3 × 12 = 36. 48 + 45 + 36 = 129.'
  },
  {
    id: 'm24', lv: 'medium', title: 'The Weather Station', prize: 'The storm records',
    setup: 'The weather station door has a keypad. The scientist left directions instead of numbers: "start on 5, then north, east, south, south".',
    dev: { t: 'keypad', n: 4 }, ans: '2369', kind: 'Directions',
    scene: { bg: 'garden', items: [{ t: 'vane', x: 300, y: 10 }, { t: 'card', x: 30, y: 40, w: 200, h: 130, rot: -2, hand: ['Start on 5.', 'North, east,', 'south, south.', '(North is up!)'] }] },
    hints: ['Think of the keypad as a map, with 1 2 3 along the top. From 5, north is the key above it.', 'North from 5 is 2. East from 2 is 3.'],
    explain: 'On the keypad from 5: north to 2, east to 3, south to 6, south to 9. The code is 2369.'
  },
  {
    id: 'm25', lv: 'medium', title: 'The Stable Note', prize: 'A ride on the fastest horse',
    setup: 'A note pinned in the stables is in three jumbled groups. On the back: "rows of three".',
    dev: { t: 'msg' }, cipher: { t: 'columns', k: 3 }, plain: 'THE HORSE IS IN STALL FOUR',
    scene: { bg: 'barn', items: [{ t: 'card', x: 30, y: 40, w: 220, h: 100, rot: -2, pin: true, type: ['THSSSLO', 'HOEITLU', 'ERINAFR'] }, { t: 'gridpad', x: 276, y: 8, cols: 3, rows: 7, cell: 24, label: 'rows of 3' }] },
    hints: ['The message was written in rows of 3 letters and read down each column. Write each group down a column.', 'Put THSSSLO down the first column, HOEITLU down the second, ERINAFR down the third. Read across.'],
    explain: 'A column jumble: written in rows of three, read out column by column. Writing the groups back as columns and reading across gives THE HORSE IS IN STALL FOUR.'
  },
  {
    id: 'm26', lv: 'medium', title: 'The Anchor\'s Name', prize: 'The ship\'s logbook',
    setup: 'The first mate\'s coded orders. "The key word," he told the crew, "is written on every lifebuoy."',
    dev: { t: 'msg' }, cipher: { t: 'keyword', kw: 'ANCHOR' }, plain: 'SAIL AT FIRST LIGHT', tool: 'keyword',
    scene: { bg: 'deck', items: [{ t: 'lifebuoy', x: 60, y: 40, text: 'ANCHOR' }, { t: 'rope', x: 220, y: 120 }] },
    hints: ['The key word is on the lifebuoy. Write it, then the rest of the alphabet.', 'The code alphabet starts A N C H O R B D E F G...'],
    explain: 'A keyword cipher with ANCHOR: ANCHORBDEFGIJKLMPQSTUVWXYZ under A to Z. It reads SAIL AT FIRST LIGHT.'
  },
  {
    id: 'm27', lv: 'medium', title: 'The Toy Shop Safe', prize: 'The rocking horse',
    setup: 'The toy shop\'s padlock has four numbers. The shopkeeper\'s nephew guessed six times and wrote down how close each was.',
    dev: { t: 'lock', n: 4 }, ans: '6193',
    mm: [{ g: '7521', a: 0, b: 1 }, { g: '3627', a: 0, b: 2 }, { g: '7390', a: 1, b: 1 }, { g: '8403', a: 1, b: 0 }, { g: '3590', a: 1, b: 1 }, { g: '5802', a: 0, b: 0 }],
    scene: { bg: 'party', items: [{ t: 'mm', x: 12, y: 6, w: 376 }] },
    hints: ['5, 8, 0 and 2 are out. That leaves 3 and 9 in 3590.', '7390 has only two right, so the 7 is out. 7521 then gives you the 1.'],
    explain: '5, 8, 0 and 2 are out. 3590 then has 3 and 9, and 7390 has only two right, so the 7 is out. 7521 gives the 1 and 3627 gives the 6. With 6, 1, 9 and 3, the 4 is out and 8403 puts the 3 last. 3590\'s one in place is the 9, third. 3627 says the 6 isn\'t second, so 6-1-9-3.'
  },
  {
    id: 'm28', lv: 'medium', title: 'The Igloo Note', prize: 'A sledge of your own',
    setup: 'A pigpen message was scratched on the igloo wall. The key in the snow has melted, apart from four letters.',
    dev: { t: 'msg' }, cipher: { t: 'pigpen' }, plain: 'MEET BY THE SNOWMAN', tool: 'pigpen-part',
    scene: { bg: 'snowfield', items: [{ t: 'igloo', x: 230, y: 70 }, { t: 'snowman', x: 340, y: 90 }, { t: 'snowkey', x: 18, y: 26, show: 'ADJW' }] },
    hints: ['Finish the key: letters go in order through the plain grid, the dotted grid, the X and the dotted X.', 'A to I fill the plain grid, J to R the dotted grid, S to V the X, W to Z the dotted X.'],
    explain: 'Pigpen with a melted key: once the grids are filled in order, it reads MEET BY THE SNOWMAN.'
  },
  {
    id: 'm29', lv: 'medium', title: 'The Calendar Safe', prize: 'The family photo album',
    setup: 'Mum\'s safe has three numbers, and her note is all about this month\'s calendar: "the first Monday, the last Friday, and the circled Sunday".',
    dev: { t: 'dial', n: 3, max: 40 }, ans: '6-31-19', kind: 'Calendar',
    scene: { bg: 'room', wall: '#4a5a6a', items: [{ t: 'calendar', x: 100, y: 10, month: 'JULY', circle: 19, wk: true, big: true }] },
    hints: ['The letters across the top are the days: S M T W T F S. Find the first date under M.', 'The first Monday is the 6th.'],
    explain: 'The month starts on a Wednesday. The first Monday is the 6th, the last Friday is the 31st, and the circled Sunday is the 19th: 6-31-19.'
  },
  {
    id: 'm30', lv: 'medium', title: 'The Castaway\'s Wall', prize: 'The castaway\'s treasure map',
    setup: 'A shipwreck cabin has a keypad. The castaway scratched tally marks on the wall, and under them: "newest first".',
    dev: { t: 'keypad', n: 4 }, ans: '5381', kind: 'Tally marks',
    scene: { bg: 'cabin', items: [{ t: 'tallies', x: 24, y: 50, groups: [1, 8, 3, 5] }, { t: 'text', x: 200, y: 200, s: 'newest first  >', size: 22, a: 'middle', c: '#f4e8c8' }] },
    hints: ['Count each group of tally marks. A crossed bundle is 5.', 'The groups are 1, 8, 3 and 5 from left to right. The newest is on the right.'],
    explain: 'The tallies are 1, 8, 3 and 5. Newest first means read from the right: 5381.'
  },

  // ── HARD ──
  {
    id: 'h11', lv: 'hard', title: 'The Astronomer\'s Journal', prize: 'The comet\'s photograph',
    setup: 'The astronomer used a key word that changes the shift for every letter. "My key," she wrote, "is read from my telescopes, smallest to largest."',
    dev: { t: 'msg' }, cipher: { t: 'vigenere', kw: 'STAR' }, plain: 'THE COMET RETURNS IN MAY', tool: 'vig',
    scene: { bg: 'observatory', items: [{ t: 'telescopes', x: 20, y: 40, list: [[3, 'A'], [1, 'S'], [4, 'R'], [2, 'T']] }] },
    hints: ['Order the telescopes by size and read their letters: that\'s the key word. Type it into the decoder.', 'The key is STAR. Each letter is shifted back by the key letter above it: S = 18, T = 19, A = 0, R = 17.'],
    explain: 'A Vigenère cipher with the key STAR: the 1st letter is shifted by S, the 2nd by T, the 3rd by A, the 4th by R, then the key repeats. It reads THE COMET RETURNS IN MAY.'
  },
  {
    id: 'h12', lv: 'hard', title: 'The Music Box', prize: 'Grandma\'s music box',
    setup: 'A Vigenère note inside the piano lid. The key word, Grandma said, "is the tune I always play". Four keys are marked in order.',
    dev: { t: 'msg' }, cipher: { t: 'vigenere', kw: 'CAFE' }, plain: 'LOOK UNDER THE LOOSE FLOORBOARD', tool: 'vig',
    scene: { bg: 'room', wall: '#5a3a4a', items: [{ t: 'piano', x: 20, y: 70, press: 'CAFE' }] },
    hints: ['Read the marked piano keys in their numbered order. The notes are the key word.', 'The key is CAFE: shift back by C (2), A (0), F (5), E (4), and repeat.'],
    explain: 'The marked keys play C, A, F, E. Using CAFE as a Vigenère key gives LOOK UNDER THE LOOSE FLOORBOARD.'
  },
  {
    id: 'h13', lv: 'hard', title: 'The Poet\'s Desk', prize: 'An original handwritten poem',
    setup: 'A line of poetry in letter-swap code, found in a poet\'s desk drawer.',
    dev: { t: 'msg' }, cipher: { t: 'crypto', seed: 1914 }, plain: 'THE BEST WAY OUT IS ALWAYS THROUGH', by: 'Robert Frost', tool: 'crypto',
    scene: { bg: 'desk', items: [{ t: 'quill', x: 250, y: 90 }, { t: 'card', x: 30, y: 30, w: 200, h: 150, rot: -3, lined: true, hand: ['Draft No. 9', 'for the coded', 'line, see below'] }] },
    hints: ['THE is the most common three-letter word. Look for a three-letter word that starts the line.', 'The first word is THE and the last word is THROUGH.'],
    explain: 'A cryptogram. THE at the start, then the T and H in THROUGH, crack it open: THE BEST WAY OUT IS ALWAYS THROUGH (Robert Frost).'
  },
  {
    id: 'h14', lv: 'hard', title: 'The Aquarium', prize: 'A behind-the-scenes tour',
    setup: 'The aquarium\'s puzzle sign is a true fact about one of the animals, in letter-swap code.',
    dev: { t: 'msg' }, cipher: { t: 'crypto', seed: 808 }, plain: 'AN OCTOPUS HAS THREE HEARTS AND BLUE BLOOD', fact: true, tool: 'crypto',
    scene: { bg: 'aquarium', items: [{ t: 'octopus', x: 140, y: 60 }, { t: 'fishes', x: 20, y: 40 }] },
    hints: ['A two-letter word that starts a sentence is often AN, AS or AT. Words with double letters (like EE or OO) help too.', 'The first word is AN and the second is OCTOPUS.'],
    explain: 'A cryptogram. AN OCTOPUS gives away lots of letters, and THREE, HEARTS and BLOOD fill the rest. It\'s true: octopuses have three hearts and blue blood.'
  },
  {
    id: 'h15', lv: 'hard', title: 'The Museum Vault', prize: 'The golden mask',
    setup: 'The museum vault padlock has four numbers. A night guard tried six codes and noted how close each came.',
    dev: { t: 'lock', n: 4 }, ans: '7051',
    mm: [{ g: '6013', a: 1, b: 1 }, { g: '6341', a: 1, b: 0 }, { g: '9462', a: 0, b: 0 }, { g: '3264', a: 0, b: 0 }, { g: '5672', a: 0, b: 2 }, { g: '9123', a: 0, b: 1 }],
    scene: { bg: 'stone', items: [{ t: 'mm', x: 12, y: 6, w: 376 }] },
    hints: ['9462 and 3264 knock out five numbers: 9, 4, 6, 2 and 3.', 'Then 6341 has only the 1 right, and in place: the 1 is last.'],
    explain: '9462 and 3264 knock out 9, 4, 6, 2 and 3. 6341 has just the 1, in place: last. 6013 has the 0 and 1 with one in place; the 1 isn\'t third, so the 0 is second. 5672 gives 5 and 7, both out of place, so the 5 isn\'t first: 7-0-5-1.'
  },
  {
    id: 'h16', lv: 'hard', title: 'The Digit Safe', prize: 'The mathematician\'s notebook',
    setup: 'A mathematician\'s safe. She never wrote the numbers down, only three facts about them.',
    dev: { t: 'dial', n: 3, max: 40 }, ans: '19-28-37', kind: 'Logic',
    scene: { bg: 'classroom', items: [{ t: 'board', x: 20, y: 20, w: 360, h: 190, chalk: ['Three two-digit numbers,', 'every one under 40.', 'The digits of each', 'one add up to 10.', 'Smallest first!'] }] },
    hints: ['List the two-digit numbers under 40 whose digits add to 10.', 'They start 19 (1 + 9 = 10).'],
    explain: 'Two-digit numbers under 40 with digits adding to 10 are 19, 28 and 37, and there are exactly three. Smallest first: 19-28-37.'
  },
  {
    id: 'h17', lv: 'hard', title: 'The Steam Train', prize: 'A ride in the driver\'s cab',
    setup: 'A message in number pairs, but this grid starts with a key word, then the rest of the alphabet. The driver said "the key word is on the engine".',
    dev: { t: 'msg' }, cipher: { t: 'polybius', kw: 'STEAM' }, plain: 'THE SPY TAKES THE NIGHT TRAIN', tool: 'polybius',
    scene: { bg: 'station', items: [{ t: 'engine', x: 20, y: 60, name: 'STEAM' }] },
    hints: ['Put the key word in the grid first, then the rest of the alphabet in order (I and J share). Type it into the decoder.', 'The key word is STEAM, so S is 11, T is 12, E is 13, A is 14, M is 15, then B is 21.'],
    explain: 'A keyed Polybius square: STEAM first, then BCDFGHIKLNOPQRUVWXYZ, read as row then column. 12 32 13 is THE. It reads THE SPY TAKES THE NIGHT TRAIN.'
  },
  {
    id: 'h18', lv: 'hard', title: 'The Gardener\'s Book', prize: 'The buried box',
    setup: 'Grandpa\'s word lock. In his gardening book, he wrote numbers in threes on a bookmark.',
    dev: { t: 'cryptex', n: 6 }, ans: 'GARDEN', kind: 'Book code',
    book: { page: ['Grandpa kept his roses by the wall.', 'Every autumn he raked the leaves.', 'Under the apple tree he buried a box.', 'Nobody else knew where it was.'], picks: [[1, 1, 1], [3, 3, 1], [2, 4, 1], [3, 6, 6], [2, 5, 3], [4, 1, 1]] },
    scene: { bg: 'desk', items: [{ t: 'bookpage', x: 14, y: 14, w: 250, h: 210 }, { t: 'card', x: 276, y: 20, w: 112, h: 200, rot: 3, type: ['line', 'word', 'letter', '', '1.1.1', '3.3.1', '2.4.1', '3.6.6', '2.5.3', '4.1.1'] }] },
    hints: ['Each three numbers are line, word, letter. 1.1.1 is line 1, word 1, letter 1.', 'Line 1 word 1 is Grandpa: G. Line 3 word 3 is apple: A.'],
    explain: 'A book code by letters: 1.1.1 G(randpa), 3.3.1 A(pple), 2.4.1 R(aked), 3.6.6 burie(D), 2.5.3 th(E), 4.1.1 N(obody). The word is GARDEN.'
  },
  {
    id: 'h19', lv: 'hard', title: 'The Zoo Keeper\'s Note', prize: 'A day as a zoo keeper',
    setup: 'A jumbled note in five groups. The keeper writes in rows under a key word, and reads the columns in alphabetical order of its letters. Her favourite animal is on the sign.',
    dev: { t: 'msg' }, cipher: { t: 'keycols', kw: 'ZEBRA' }, plain: 'HIDE BEHIND THE GIRAFFE',
    scene: { bg: 'zoo', items: [{ t: 'sign', x: 30, y: 30, w: 160, h: 56, text: 'ZEBRA' }, { t: 'card', x: 40, y: 120, w: 170, h: 90, rot: -3, type: ['BDIE DIEF', 'IHHA ENGF', 'HETR'] }, { t: 'gridpad', x: 236, y: 40, cols: 5, rows: 4, cell: 28, label: 'Z E B R A' }] },
    hints: ['Write ZEBRA across 5 columns. Alphabetical order is A, B, E, R, Z: the first group goes under A, the second under B, and so on, each down its column.', 'Groups are 4 letters each: BDIE under A, DIEF under B, IHHA under E, ENGF under R, HETR under Z. Read across the rows.'],
    explain: 'A keyed column cipher: the message was written in rows under ZEBRA and the columns read in the order A, B, E, R, Z. Rebuilt, it reads HIDE BEHIND THE GIRAFFE.'
  },
  {
    id: 'h20', lv: 'hard', title: 'The Coded High Score', prize: 'The arcade\'s golden token',
    setup: 'The arcade office has a three-number keypad. The owner\'s initials are on the top score, but she shifted them one letter on. Her rule: "my initials, on phone keys".',
    dev: { t: 'keypad', n: 3 }, ans: '367', tool: 'phone', kind: 'Two-step code',
    scene: { bg: 'arcade', items: [{ t: 'scoreboard', x: 90, y: 20, rows: [['FNS', '99990'], ['BOB', '41200'], ['KAY', '30150']] }, { t: 'sticky', x: 290, y: 130, w: 100, h: 72, rot: 5, hand: ['Shifted', 'one on!'] }] },
    hints: ['First shift each letter of FNS back by one.', 'FNS goes back to EMR. Now find E, M and R on the phone keys.'],
    explain: 'FNS shifted back one is EMR. On phone keys E is 3, M is 6 and R is 7: 367.'
  },
  {
    id: 'h21', lv: 'hard', title: 'The Detective\'s Notebook', prize: 'A real magnifying glass',
    setup: 'A famous detective\'s words, in letter-swap code, on the first page of an old notebook.',
    dev: { t: 'msg' }, cipher: { t: 'crypto', seed: 1891 }, plain: 'YOU SEE, BUT YOU DO NOT OBSERVE', by: 'Arthur Conan Doyle, A Scandal in Bohemia', tool: 'crypto',
    scene: { bg: 'desk', items: [{ t: 'magnifier', x: 250, y: 120 }, { t: 'pipe', x: 40, y: 150 }, { t: 'mug', x: 300, y: 30 }] },
    hints: ['A three-letter word appears twice. Short words like YOU, THE and AND are worth a try.', 'The first word is YOU.'],
    explain: 'A cryptogram. YOU appears twice, which unlocks SEE, BUT and DO: YOU SEE, BUT YOU DO NOT OBSERVE (Sherlock Holmes, in A Scandal in Bohemia).'
  },
  {
    id: 'h22', lv: 'hard', title: 'The Four-Digit Riddle', prize: 'The inventor\'s blueprints',
    setup: 'The inventor\'s padlock has four numbers. Her notebook gives four rules.',
    dev: { t: 'lock', n: 4 }, ans: '4652', kind: 'Logic',
    scene: { bg: 'desk', items: [{ t: 'card', x: 20, y: 18, w: 360, h: 200, rot: -1, lined: true, hand: ['The first is twice the last.', 'The second is the first plus the last.', 'The third is one less than the second.', 'All four add up to 17.'] }] },
    hints: ['Call the last number x. Then the first is 2x, the second 3x and the third 3x - 1.', 'Together that\'s 9x - 1 = 17, so x = 2.'],
    explain: 'With the last digit x: 2x + 3x + (3x - 1) + x = 17, so 9x = 18 and x = 2. The digits are 4, 6, 5, 2.'
  },
  {
    id: 'h23', lv: 'hard', title: 'The Pirate\'s Last Order', prize: 'The pirate\'s chest',
    setup: 'The pirate captain\'s last order, in a key-word code. "The key," his first mate says, "is the name of the island on the map."',
    dev: { t: 'msg' }, cipher: { t: 'vigenere', kw: 'OWL' }, plain: 'BURY THE CHEST AT LOW TIDE', tool: 'vig',
    scene: { bg: 'desk', items: [{ t: 'map', x: 14, y: 12, w: 372, h: 216, island: 'OWL ISLAND' }] },
    hints: ['The island\'s name is the key word. Each letter is shifted back by the key letter, and the key repeats.', 'The key is OWL: shift back by O (14), W (22), L (11), and repeat.'],
    explain: 'A Vigenère cipher with the key OWL from the map. It reads BURY THE CHEST AT LOW TIDE.'
  },
  {
    id: 'h24', lv: 'hard', title: 'The Tapping Wall', prize: 'Your way out of the castle',
    setup: 'From the next cell comes a tapping: a few knocks, a pause, a few more. You marked each knock on the wall.',
    dev: { t: 'msg' }, cipher: { t: 'polybius', tap: true }, plain: 'THE GUARD SLEEPS AT NINE', tool: 'polybius',
    scene: { bg: 'dungeon', items: [{ t: 'board', x: 70, y: 40, w: 260, h: 120, stone: true, chalk: ['1 to 5 across,', '1 to 5 down.', 'I and J share.'] }] },
    hints: ['Each pair of knock groups is a row and a column in a 5 × 5 alphabet grid (I and J share).', 'Four knocks then four knocks is row 4, column 4: T.'],
    explain: 'The tap code: a Polybius square sent as knocks, row first, then column. It reads THE GUARD SLEEPS AT NINE.'
  },
  {
    id: 'h25', lv: 'hard', title: 'The Clockmaker\'s Safe', prize: 'A gold pocket watch',
    setup: 'The clockmaker\'s safe takes three numbers. His note reads: "the minutes from the left clock to the middle one; the right clock\'s hour times three; then add the first two".',
    dev: { t: 'dial', n: 3, max: 40 }, ans: '25-12-37', kind: 'Clocks',
    scene: { bg: 'room', wall: '#4a3a2a', items: [{ t: 'shelf', x: 20, y: 150, w: 360 }, { t: 'clock', x: 80, y: 100, r: 40, h: 2, m: 5, base: 150 }, { t: 'clock', x: 200, y: 100, r: 40, h: 2, m: 30, base: 150, c: '#2f5a6a' }, { t: 'clock', x: 320, y: 100, r: 40, h: 4, m: 0, base: 150, c: '#6a2f3a' }] },
    hints: ['The left clock says 2:05 and the middle says 2:30. How many minutes between them?', '25 minutes. The right clock\'s hour is 4, times three.'],
    explain: '2:05 to 2:30 is 25 minutes; 4 × 3 = 12; 25 + 12 = 37. The combination is 25-12-37.'
  },
  {
    id: 'h26', lv: 'hard', title: 'The Upside-Down Morse', prize: 'The lighthouse lamp',
    setup: 'The lighthouse keeper sent a warning in Morse, but his note says "my dots are dashes and my dashes are dots".',
    dev: { t: 'msg' }, cipher: { t: 'morse', swap: true }, plain: 'STORM COMING', tool: 'morse',
    scene: { bg: 'night', items: [{ t: 'porthole', x: 260, y: 22 }, { t: 'sticky', x: 40, y: 50, w: 150, h: 90, rot: -4, hand: ['My dots are dashes,', 'my dashes are dots!'] }, { t: 'lighthouse', x: 210, y: 40 }] },
    hints: ['Swap every dot for a dash and every dash for a dot, then read the Morse.', '--- swapped is ..., which is S.'],
    explain: 'Morse with dots and dashes swapped. --- becomes ... (S) and . becomes - (T). It reads STORM COMING.'
  },
  {
    id: 'h27', lv: 'hard', title: 'The Typewriter Slip', prize: 'The lost parcel',
    setup: 'The clerk typed a message with her hands one key too far to the right. Every letter is the key next door.',
    dev: { t: 'msg' }, cipher: { t: 'qwerty' }, plain: 'SEND THE PARCEL BY TRAIN',
    scene: { bg: 'desk', items: [{ t: 'typewriter', x: 70, y: 60 }, { t: 'sticky', x: 290, y: 20, w: 100, h: 70, rot: 5, hand: ['One key', 'to the right!'] }] },
    hints: ['Look at the typewriter keys below the paper: each code letter is the key just right of the real one.', 'D is right of S, and R is right of E. The first word is SEND.'],
    explain: 'A keyboard shift: each letter was typed one key to the right on a QWERTY keyboard (and the end of a row wraps round). DRMF is SEND. It reads SEND THE PARCEL BY TRAIN.'
  },
  {
    id: 'h28', lv: 'hard', title: 'The Three Cousins', prize: 'The cousins\' time capsule',
    setup: 'The time capsule\'s safe opens with the cousins\' ages: Ann, then Tom, then Ben. Their aunt wrote three clues.',
    dev: { t: 'dial', n: 3, max: 40 }, ans: '6-12-15', kind: 'Logic',
    scene: { bg: 'garden', items: [{ t: 'card', x: 30, y: 30, w: 340, h: 150, rot: -1, lined: true, hand: ['Tom is twice as old as Ann.', 'Ben is 3 years older than Tom.', 'Together they are 33.'] }] },
    hints: ['Call Ann\'s age one lot. Tom is two lots, and Ben is two lots plus 3.', 'Five lots plus 3 = 33, so one lot is 6.'],
    explain: 'Ann x, Tom 2x, Ben 2x + 3: 5x + 3 = 33, so x = 6. Ann 6, Tom 12, Ben 15.'
  },
  {
    id: 'h29', lv: 'hard', title: 'The Double Lock', prize: 'The swordsmith\'s best sword',
    setup: 'A password note with two locks on it. Scrawled underneath: "backwards, and four on".',
    dev: { t: 'msg' }, cipher: { t: 'revcaesar', k: 4 }, plain: 'THE PASSWORD IS SWORDFISH', tool: 'wheel',
    scene: { bg: 'stone', items: [{ t: 'swords', x: 260, y: 30 }, { t: 'card', x: 30, y: 60, w: 210, h: 100, rot: -3, hand: ['Backwards,', 'and four on.'] }] },
    hints: ['Two steps: the note was reversed and then shifted 4 letters on. Undo both.', 'Read the code from the end, then move each letter back 4: L goes back to H.'],
    explain: 'The message was written backwards and then shifted 4 places. Reading from the end and shifting back 4 gives THE PASSWORD IS SWORDFISH.'
  },
  {
    id: 'h30', lv: 'hard', title: 'The Roman Tablet', prize: 'A Roman coin',
    setup: 'The museum\'s Roman room has a keypad. Each digit of the code is the answer to one sum on the old stone tablet.',
    dev: { t: 'keypad', n: 4 }, ans: '9361', kind: 'Roman numerals',
    scene: { bg: 'stone', items: [{ t: 'board', x: 70, y: 16, w: 260, h: 200, stone: true, chalk: ['XV − VI', 'XII ÷ IV', 'II × III', 'XX − XIX'] }] },
    hints: ['Turn each Roman numeral into a number: X is 10, V is 5, I is 1. A smaller one before a bigger one is taken away (IV = 4).', 'XV − VI is 15 − 6 = 9.'],
    explain: '15 − 6 = 9, 12 ÷ 4 = 3, 2 × 3 = 6, 20 − 19 = 1. The code is 9361.'
  }
]);
