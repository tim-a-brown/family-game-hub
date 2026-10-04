// ═══════════════════════════════════════════════════════════════════════════
// Game Night catalog: the single list of every game, used by the home screen
// (tiles, search, filters) and by kit.js (game bar title and colour).
//
// Fields
//   id      stable key (matches games/<file>.html unless `file` is given)
//   name    display name          color  the game's accent colour
//   cat     category id (see GAME_CATS)
//   min/max player counts (max 0 = any group)
//   tag     one-line pitch shown in search results and the mode sheet
//   play    file for "play on the phone" (vs computer / solo)
//   score   file for "keep score for a real-life game" (optional)
// A game with both `play` and `score` asks which one when launched.
// ═══════════════════════════════════════════════════════════════════════════
var GAME_CATS = [
  // hue: each section has its own colour family; every game icon in the
  // section gets a shade of it (see the colour pass below GAMES).
  { id: 'cards',  name: 'Classic Cards',   hue: 352, sat: 72 },
  { id: 'specialty', name: 'Specialty Cards', hue: 292, sat: 58 },
  { id: 'board',  name: 'Board',       hue: 24,  sat: 78 },
  { id: 'dice',   name: 'Dice & Luck', hue: 44,  sat: 88 },
  { id: 'puzzle', name: 'Puzzles',     hue: 205, sat: 78 },
  { id: 'words',  name: 'Words',       hue: 172, sat: 70 },
  { id: 'party',  name: 'Party',       hue: 322, sat: 68 },
  { id: 'casino', name: 'Casino',      hue: 142, sat: 62 },
  { id: 'arcade', name: 'Arcade',      hue: 252, sat: 72 },
  { id: 'tools',  name: 'Tools',       hue: 228, sat: 32 }
];

var GAMES = [
  // ── Cards ────────────────────────────────────────────────────────────────
  { id: 'hearts',      name: 'Hearts',       color: '#ff4d6d', cat: 'cards', min: 3, max: 6, tag: 'Dodge hearts and the Queen of Spades', play: 'hearts-ai', score: 'hearts' },
  { id: 'spades',      name: 'Spades',       color: '#5b6cff', cat: 'cards', min: 4, max: 4, tag: 'Bid your tricks with a partner', play: 'spades-ai', score: 'spades' },
  { id: 'euchre',      name: 'Euchre',       color: '#22b07d', cat: 'cards', min: 4, max: 4, tag: 'Call trump and take three tricks', play: 'euchre-ai', score: 'euchre' },
  { id: 'cribbage',    name: 'Cribbage',     color: '#c9853d', cat: 'cards', min: 2, max: 2, tag: 'Peg your way to 121', play: 'cribbage' },
  { id: 'gin-rummy',   name: 'Gin Rummy',    color: '#2bb3a3', cat: 'cards', min: 2, max: 2, tag: 'Meld sets and runs, then knock', play: 'gin-rummy-ai', score: 'gin-rummy' },
  { id: 'wizard',      name: 'Wizard',       color: '#8b5cf6', cat: 'specialty', min: 3, max: 6, tag: 'Bid exactly how many tricks you take', play: 'wizard-ai', score: 'wizard' },
  { id: 'flip7',       name: 'Flip 7',       color: '#ff8a00', cat: 'specialty', min: 2, max: 8, tag: 'Push your luck to 200', play: 'flip7-ai', score: 'flip7' },
  { id: 'five-crowns', name: 'Five Crowns',  color: '#e2a400', cat: 'specialty', min: 2, max: 7, tag: 'Eleven rounds, the wilds keep moving', play: 'fivecrownss-ai', score: 'five-crowns' },
  { id: 'rook',        name: 'Rook',         color: '#3a86ff', cat: 'specialty', min: 4, max: 4, tag: 'Bid, name trump, capture the Rook', play: 'rook-ai', score: 'rook' },
  { id: 'phase10',     name: 'Phase 10',     color: '#f72585', cat: 'specialty', min: 2, max: 6, tag: 'Race through ten phases', play: 'phase10-ai', score: 'phase10' },
  { id: 'solitaire',   name: 'Solitaire',    color: '#16a34a', cat: 'cards', min: 1, max: 1, tag: 'Classic Klondike', play: 'solitaire' },
  { id: 'freecell',    name: 'FreeCell',     color: '#0ea5e9', cat: 'cards', min: 1, max: 1, tag: 'Every deal is winnable', play: 'freecell' },
  { id: 'pyramid',     name: 'Pyramid',      color: '#f59e0b', cat: 'cards', min: 1, max: 1, tag: 'Pair cards that add to 13', play: 'pyramid' },
  { id: 'jokerrun',    name: 'Joker Run',    color: '#e11d48', cat: 'cards', min: 1, max: 1, tag: 'Poker hands, wild jokers, beat the blinds', play: 'jokerrun' },
  { id: 'pokersquares',name: 'Poker Squares', color: '#ef4444', cat: 'cards', min: 1, max: 1, tag: 'Build ten poker hands on a 5×5 grid', play: 'pokersquares' },
  { id: 'lorcana',     name: 'Lorcana',      color: '#a855f7', cat: 'specialty', min: 2, max: 4, tag: 'Lore counter: first to 20 wins', play: 'lorcana' },

  // ── Board ────────────────────────────────────────────────────────────────
  { id: 'chess',       name: 'Chess',        color: '#64748b', cat: 'board', min: 1, max: 2, tag: 'The classic, vs computer or a friend', play: 'chess' },
  { id: 'checkers',    name: 'Checkers',     color: '#dc2626', cat: 'board', min: 1, max: 2, tag: 'Jump, king, and clear the board', play: 'checkers' },
  { id: 'connectfour', name: 'Connect Four', color: '#2563eb', cat: 'board', min: 1, max: 2, tag: 'Four in a row wins', play: 'connectfour' },
  { id: 'tictactoe',   name: 'Tic-Tac-Toe',  color: '#06b6d4', cat: 'board', min: 1, max: 3, tag: 'Classic, Ultimate, and 3-player', play: 'tictactoe' },
  { id: 'chinesecheckers', name: 'Chinese Checkers', color: '#b91c1c', cat: 'board', min: 1, max: 6, tag: 'Hop your marbles across the star', play: 'chinesecheckers' },
  { id: 'codebreaker', name: 'Code Breaker', color: '#000', cat: 'board', min: 1, max: 2, tag: 'Crack the secret color code', play: 'codebreaker' },
  { id: 'marbles',     name: 'Marbles',      color: '#7c3aed', cat: 'board', min: 2, max: 6, tag: 'Aggravation and Wahoo: race home, bump rivals', play: 'marbles' },
  { id: 'othello',     name: 'Othello',      color: '#15803d', cat: 'board', min: 1, max: 2, tag: 'Flip discs, own the board', play: 'othello' },
  { id: 'backgammon',  name: 'Backgammon',   color: '#b45309', cat: 'board', min: 1, max: 2, tag: 'Race your checkers home', play: 'backgammon' },
  { id: 'battleship',  name: 'Battleship',   color: '#0369a1', cat: 'board', min: 1, max: 2, tag: 'Hunt down the hidden fleet', play: 'battleship' },
  { id: 'dotsboxes',   name: 'Dots & Boxes', color: '#ec4899', cat: 'board', min: 1, max: 3, tag: 'Close the most boxes', play: 'dotsboxes' },
  { id: 'mancala',     name: 'Mancala',      color: '#a16207', cat: 'board', min: 1, max: 2, tag: 'Sow stones, fill your store', play: 'mancala' },
  { id: 'mahjong4',    name: 'Mahjong',      color: '#b91c1c', cat: 'board', min: 1, max: 1, tag: 'Four-player Mahjong vs the computer', play: 'mahjong4' },

  // ── Dice & luck ──────────────────────────────────────────────────────────
  { id: 'yahtzee',     name: 'Yahtzee',      color: '#ef4444', cat: 'dice', min: 1, max: 8, tag: 'Roll for the best combos', play: 'yahtzee' },
  { id: 'plinko',      name: 'Plinko',       color: '#eab308', cat: 'dice', min: 1, max: 4, tag: 'Drop the chip, hope for the big slot', play: 'plinko' },
  { id: 'wheeloffortune', name: 'Wheel of Fortune', color: '#7c3aed', cat: 'dice', min: 1, max: 3, tag: 'Spin, guess, solve the puzzle', play: 'wheeloffortune' },
  { id: 'dealornodeal',name: 'Deal or No Deal', color: '#ca8a04', cat: 'dice', min: 1, max: 4, tag: 'Take the offer or risk it all', play: 'dealornodeal' },
  { id: 'shellgame',   name: 'Shell Game',   color: '#0d9488', cat: 'dice', min: 1, max: 4, tag: 'Keep your eye on the ball', play: 'shellgame' },

  // ── Puzzles ──────────────────────────────────────────────────────────────
  { id: '2048',        name: '2048',         color: '#f97316', cat: 'puzzle', min: 1, max: 1, tag: 'Slide and merge to 2048', play: '2048' },
  { id: 'slidepuzzle', name: 'Slide Puzzle', color: '#000', cat: 'puzzle', min: 1, max: 1, tag: 'Slide the tiles back in order', play: 'slidepuzzle' },
  { id: 'sudoku',      name: 'Sudoku',       color: '#3b82f6', cat: 'puzzle', min: 1, max: 1, tag: 'Fill the grid, 1 to 9', play: 'sudoku' },
  { id: 'minesweeper', name: 'Minesweeper',  color: '#64748b', cat: 'puzzle', min: 1, max: 1, tag: 'Clear the field without a boom', play: 'minesweeper' },
  { id: 'memorymatch', name: 'Memory Match', color: '#d946ef', cat: 'puzzle', min: 1, max: 4, tag: 'Flip two, find the pairs', play: 'memorymatch' },
  { id: 'mahjong',     name: 'Mahjong Tiles', color: '#059669', cat: 'puzzle', min: 1, max: 1, tag: 'Match free tiles, clear the stack', play: 'mahjong' },
  { id: 'mathpuzzles', name: 'Math Puzzles', color: '#0891b2', cat: 'puzzle', min: 1, max: 1, tag: 'Patterns, sequences and brain teasers', play: 'mathpuzzles' },

  // ── Words ────────────────────────────────────────────────────────────────
  { id: 'wordle',      name: 'Wordle',       color: '#22c55e', cat: 'words', min: 1, max: 1, tag: 'Guess the word in six tries', play: 'wordle' },
  { id: 'spellingbee', name: 'Spelling Bee', color: '#facc15', cat: 'words', min: 1, max: 1, tag: 'Make words from seven letters', play: 'spellingbee' },
  { id: 'crossword',   name: 'Crossword', color: '#2563eb', cat: 'words', min: 1, max: 1, tag: 'Mini and big crosswords', play: 'crossword' },
  { id: 'boggle',      name: 'Boggle',       color: '#f97316', cat: 'words', min: 1, max: 4, tag: 'Find words in the letter grid', play: 'boggle' },
  { id: 'hangman',     name: 'Hangman',      color: '#8b5cf6', cat: 'words', min: 1, max: 2, tag: 'Guess the word, letter by letter', play: 'hangman' },
  { id: 'wordscramble',name: 'Word Scramble', color: '#14b8a6', cat: 'words', min: 1, max: 4, tag: 'Unscramble against the clock', play: 'wordscramble' },
  { id: 'wordsearch',  name: 'Word Search',  color: '#e11d48', cat: 'words', min: 1, max: 1, tag: 'Find every hidden word', play: 'wordsearch' },

  // ── Party ────────────────────────────────────────────────────────────────
  { id: 'trivia',      name: 'Trivia',       color: '#f59e0b', cat: 'party', min: 1, max: 6, tag: 'Who knows the most?', play: 'trivia' },
  { id: 'wouldyourather', name: 'Would You Rather', color: '#ec4899', cat: 'party', min: 2, max: 0, tag: 'Tough choices, big debates', play: 'wouldyourather' },
  { id: 'madlibs',     name: 'Mad Libs',     color: '#f43f5e', cat: 'party', min: 1, max: 0, tag: 'Fill the blanks, read it aloud', play: 'madlibs' },
  { id: 'riddlestories', name: 'Riddle Stories', color: '#6366f1', cat: 'party', min: 2, max: 0, tag: 'Solve the mystery with yes/no questions', play: 'riddlestories' },
  { id: 'conversation',name: 'Conversation Starters',   color: '#10b981', cat: 'party', min: 2, max: 0, tag: 'Questions that get everyone talking', play: 'conversation' },
  { id: 'minigolf',    name: 'Mini Golf',    color: '#16a34a', cat: 'party', min: 1, max: 6, tag: 'Scorecard for a real round', play: 'minigolf' },

  // ── Casino ───────────────────────────────────────────────────────────────
  { id: 'blackjack',   name: 'Blackjack',    color: '#059669', cat: 'casino', min: 1, max: 4, tag: 'Get closer to 21 than the dealer', play: 'blackjack' },
  { id: 'poker',       name: 'Poker',        color: '#dc2626', cat: 'casino', min: 1, max: 1, tag: "Video poker, Hold'em and Omaha", play: 'poker' },
  { id: 'roulette',    name: 'Roulette',     color: '#b91c1c', cat: 'casino', min: 1, max: 1, tag: 'Place your bets, spin the wheel', play: 'roulette' },
  { id: 'slots',       name: 'Slots',        color: '#d97706', cat: 'casino', min: 1, max: 1, tag: 'Pull the lever, chase the jackpot', play: 'slots' },
  { id: 'craps',       name: 'Craps',        color: '#047857', cat: 'casino', min: 1, max: 1, tag: 'Roll the bones, ride the point', play: 'craps' },
  { id: 'baccarat',    name: 'Baccarat',     color: '#7c3aed', cat: 'casino', min: 1, max: 1, tag: 'Player, Banker or Tie', play: 'baccarat' },
  { id: 'horserace',   name: 'Horse Race',   color: '#000', cat: 'casino', min: 1, max: 6, tag: 'Pick your horse, place your bets', play: 'horserace' },
  { id: 'threecardpoker', name: 'Three Card Poker', color: '#0f766e', cat: 'casino', min: 1, max: 1, tag: 'Ante up and beat the dealer', play: 'threecardpoker' },
  { id: 'paigow',      name: 'Pai Gow',      color: '#9f1239', cat: 'casino', min: 1, max: 1, tag: 'Set a high hand and a low hand', play: 'paigow' },

  // ── Arcade ───────────────────────────────────────────────────────────────
  { id: 'tetris',      name: 'Tetris',       color: '#8b5cf6', cat: 'arcade', min: 1, max: 1, tag: 'Stack and clear lines', play: 'tetris' },
  { id: 'snake',       name: 'Snake',        color: '#22c55e', cat: 'arcade', min: 1, max: 1, tag: "Eat, grow, don't crash", play: 'snake' },
  { id: 'pacman',      name: 'Pac-Man',      color: '#facc15', cat: 'arcade', min: 1, max: 1, tag: 'Eat the dots, dodge the ghosts', play: 'pacman' },
  { id: 'breakout',    name: 'Breakout',     color: '#f43f5e', cat: 'arcade', min: 1, max: 1, tag: 'Smash every brick', play: 'breakout' },
  { id: 'flappybird',  name: 'Flappy Bird',       color: '#38bdf8', cat: 'arcade', min: 1, max: 1, tag: 'Tap to fly through the pipes', play: 'flappybird' },
  { id: 'asteroids',   name: 'Asteroids',    color: '#6366f1', cat: 'arcade', min: 1, max: 1, tag: 'Blast rocks, stay alive', play: 'asteroids' },
  { id: 'peggle',      name: 'Peggle',       color: '#fb923c', cat: 'arcade', min: 1, max: 1, tag: 'Aim, bounce, clear the orange pegs', play: 'peggle' },

  // ── Tools ────────────────────────────────────────────────────────────────
  { id: 'scorecard',   name: 'Scorecard',    color: '#0ea5e9', cat: 'tools', min: 1, max: 8, tag: 'Keep score for any game', play: 'scorecard' },
  { id: 'dice-roller', name: 'Dice Roller',  color: '#f97316', cat: 'tools', min: 1, max: 0, tag: 'Any dice, any number', play: 'dice-roller' },
  { id: 'randomtools', name: 'Random Tools',      color: '#14b8a6', cat: 'tools', min: 1, max: 0, tag: 'Random numbers, coin flips, teams', play: 'randomtools' },
  { id: 'bingo',       name: 'Bingo Caller', color: '#e11d48', cat: 'tools', min: 1, max: 0, tag: 'Draw balls and call BINGO', play: 'bingo' },
  { id: 'ranker',      name: 'Ranker',       color: '#eab308', cat: 'tools', min: 1, max: 0, tag: 'Rank anything, settle debates', play: 'ranker' },
  { id: 'players',     name: 'Frequent Players',      color: '#6366f1', cat: 'tools', min: 1, max: 0, tag: 'The names you play with most', play: 'players' }
];

// Section colour families: shade each game's colour from its section's hue,
// stepping hue and lightness so neighbours stay distinguishable.
(function () {
  function hsl(h, sat, l) {
    sat /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = sat * Math.min(l, 1 - l);
    var f = function (n) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))); };
    return '#' + ((1 << 24) + (f(0) << 16) + (f(8) << 8) + f(4)).toString(16).slice(1);
  }
  var L = [46, 38, 54, 42, 50, 35, 58], H = [0, 8, -6, 12, -10, 4, -3];
  GAME_CATS.forEach(function (c) {
    var i = 0;
    GAMES.forEach(function (g) {
      if (g.cat !== c.id) return;
      g.color = hsl((c.hue + H[i % H.length] + 360) % 360, c.sat, L[i % L.length]); i++;
    });
    c.color = hsl(c.hue, c.sat, 50);
  });
})();

// Lookup by game id or by any of its files (hearts-ai → hearts).
function findGame(key) {
  key = String(key || '').replace(/^.*\//, '').replace(/\.html.*$/, '');
  for (var i = 0; i < GAMES.length; i++) {
    var g = GAMES[i];
    if (g.id === key || g.play === key || g.score === key) return g;
  }
  return null;
}
