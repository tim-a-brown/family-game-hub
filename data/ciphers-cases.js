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
      scene: { bg: 'cork', items: [{ t: 'mm', x: 12, y: 6, w: 376 }] },
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
