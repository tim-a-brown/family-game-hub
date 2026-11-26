// ═══════════════════════════════════════════════════════════════════════════
// Game Night catalog: the single list of every game, used by the home screen
// (tiles, search, filters) and by kit.js (game bar title and colour).
//
// Fields
//   id      stable key (matches games/<file>.html unless `file` is given)
//   name    display name          color  the game's accent colour
//   tile    (optional) a shorter name for a tile in tile view, where the full name would need two lines
//   cat     category id (see GAME_CATS)
//   base    icon background style when it differs from the category's (optional)
//   min/max player counts (max 0 = any group)
//   tag     one-line pitch shown in search results and the mode sheet
//   play    file for "play on the phone" (vs computer / solo)
//   score   file for "keep score for a real-life game" (optional)
// A game with both `play` and `score` asks which one when launched.
//   demo    (optional) the game has a demo: true plays games/demos/<play>.js on <play>.html?demo=1, a string is a page of
//           its own (Arvela's quick start); the home sheet's round button and the game menu's Watch a demo open it
// ═══════════════════════════════════════════════════════════════════════════
var GAME_CATS = [
  // hue: each section has its own colour family; every game icon in the
  // section gets a shade of it (see the colour pass below GAMES).
  { id: 'cards',  name: 'Classic Cards',   hue: 352, sat: 72 },
  { id: 'specialty', name: 'Specialty Cards', hue: 292, sat: 58 },
  { id: 'board',  name: 'Board',       hue: 24,  sat: 78 },
  { id: 'dice',   name: 'Dice & Luck', hue: 44,  sat: 88 },
  { id: 'puzzle', name: 'Puzzles & Words', hue: 205, sat: 78 },
  { id: 'party',  name: 'Party',       hue: 322, sat: 68 },
  { id: 'casino', name: 'Casino',      hue: 142, sat: 62 },
  { id: 'arcade', name: 'Arcade',      hue: 252, sat: 72 },
  { id: 'console', name: 'Consoles',   hue: 176, sat: 58 },
  { id: 'tools',  name: 'Tools',       hue: 228, sat: 32 }
];

var GAMES = [
  // ── Cards ────────────────────────────────────────────────────────────────
  { id: 'hearts',      name: 'Hearts',       color: '#ff4d6d', cat: 'cards', min: 3, max: 6, tag: 'Dodge hearts and the Queen of Spades', play: 'hearts-ai', demo: 1, score: 'hearts' },
  { id: 'spades',      name: 'Spades',       color: '#5b6cff', cat: 'cards', min: 4, max: 4, tag: 'Bid your tricks with a partner', play: 'spades-ai', demo: 1, score: 'spades' },
  { id: 'pinochle',    name: 'Pinochle',     color: '#c0662e', cat: 'cards', min: 2, max: 4, tag: 'Bid, meld and take the counters', play: 'pinochle', demo: 1 },
  { id: 'euchre',      name: 'Euchre',       color: '#22b07d', cat: 'cards', min: 4, max: 4, tag: 'Call trump and take three tricks', play: 'euchre-ai', demo: 1, score: 'euchre' },
  { id: 'bridge',      name: 'Bridge',       color: '#2f6fb3', cat: 'cards', min: 4, max: 4, tag: 'Bid a contract with your partner, then make it', play: 'bridge', demo: 1 },
  { id: 'cribbage',    name: 'Cribbage',     color: '#c9853d', cat: 'cards', min: 2, max: 4, tag: 'Peg your way to 121', play: 'cribbage', demo: 1 },
  { id: 'gofish',      name: 'Go Fish',      color: '#1f9bd6', cat: 'cards', min: 2, max: 6, tag: 'Ask for cards and collect books of four', play: 'gofish', demo: 1 },
  { id: 'war',         name: 'War',          color: '#d64045', cat: 'cards', min: 2, max: 4, tag: 'Flip, and the high card takes them all', play: 'war', demo: 1 },
  { id: 'canasta',     name: 'Canasta',      color: '#d0453a', cat: 'cards', min: 2, max: 4, tag: 'Meld with your partner and square up canastas', play: 'canasta', demo: 1 },
  { id: 'gin-rummy',   name: 'Gin Rummy',    color: '#2bb3a3', cat: 'cards', min: 2, max: 2, tag: 'Meld sets and runs, then knock', play: 'gin-rummy-ai', demo: 1, score: 'gin-rummy' },
  { id: 'crazy8s',     name: 'Crazy Eights', color: '#e0457b', cat: 'cards', min: 2, max: 7, tag: 'Match the suit or rank, and 8s are wild', play: 'crazy8s', demo: 1 },
  { id: 'wizard',      name: 'Wizard',       color: '#8b5cf6', cat: 'specialty', min: 3, max: 6, tag: 'Bid exactly how many tricks you take', play: 'wizard-ai', demo: 1, score: 'wizard' },
  { id: 'flip7',       name: 'Flip 7',       color: '#ff8a00', cat: 'specialty', min: 2, max: 8, tag: 'Push your luck to 200', play: 'flip7-ai', demo: 1, score: 'flip7' },
  { id: 'five-crowns', name: 'Five Crowns',  color: '#e2a400', cat: 'specialty', min: 2, max: 7, tag: 'Eleven rounds, the wilds keep moving', play: 'fivecrownss-ai', demo: 1, score: 'five-crowns' },
  { id: 'rook',        name: 'Rook',         color: '#3a86ff', cat: 'specialty', min: 4, max: 4, tag: 'Bid, name trump, capture the Rook', play: 'rook-ai', demo: 1, score: 'rook' },
  { id: 'spanishone',  name: 'Spanish One',  color: '#7b3fc4', cat: 'specialty', min: 2, max: 10, tag: 'Match the color or the number, and call One Card!', play: 'spanishone', demo: 1 },
  { id: 'phase10',     name: 'Phase 10',     color: '#f72585', cat: 'specialty', min: 2, max: 6, tag: 'Race through ten phases', play: 'phase10-ai', demo: 1, score: 'phase10' },
  { id: 'solitaire',   name: 'Solitaire',    color: '#16a34a', cat: 'cards', min: 1, max: 1, tag: 'Classic Klondike', play: 'solitaire', demo: 1 },
  { id: 'freecell',    name: 'FreeCell',     color: '#0ea5e9', cat: 'cards', min: 1, max: 1, tag: 'Every deal is winnable', play: 'freecell', demo: 1 },
  { id: 'pyramid',     name: 'Pyramid',      color: '#f59e0b', cat: 'cards', min: 1, max: 1, tag: 'Pair cards that add to 13', play: 'pyramid', demo: 1 },
  { id: 'jokerrun',    name: 'Balatro',      color: '#e11d48', cat: 'specialty', min: 1, max: 1, tag: 'Poker hands, wild jokers, beat the blinds', play: 'jokerrun', demo: 1 },
  { id: 'pokersquares',name: 'Poker Squares', color: '#ef4444', cat: 'cards', min: 1, max: 1, tag: 'Build ten poker hands on a 5×5 grid', play: 'pokersquares', demo: 1 },
  { id: 'sandlot',     name: 'Wax Pack',     color: '#000', cat: 'specialty', min: 2, max: 2, tag: 'Baseball with the old cards in your shoebox', play: 'waxpack', demo: 1 },
  { id: 'lorcana',     name: 'Lorcana',      color: '#a855f7', cat: 'specialty', min: 1, max: 4, tag: 'Real cards and art, vs the computer or pass & play', play: 'lorcana-play', demo: 1, score: 'lorcana',
    launch: [
      { icon: 'phone', title: 'Play on this device', desc: 'Against the computer or pass and play, with the real cards', file: 'lorcana-play.html' },
      { icon: 'users', title: 'Play online', desc: 'Two devices, two PINs, each with your own deck', file: 'lorcana-play.html?online=1' },
      { icon: 'pencil', title: 'Keep score', desc: 'Playing with real cards? Track the lore here', file: 'lorcana' },
      { icon: 'book', title: 'Cards and decks', desc: 'Browse every card and build your decks. Leaves any game as it is', file: 'lorcana-play.html?library=1', tool: true }
    ] },
  { id: 'anoria',      name: 'Arvela',       color: '#c9a24a', cat: 'specialty', min: 1, max: 6, tag: 'The great figures of every age hold the wonders of the world', play: 'anoria', demo: 'anoria.html?quick=1',
    launch: [
      { icon: 'book', title: 'Library', desc: 'Every card in the set, and the ones you have', file: 'anoria.html?library=1', tool: true },
      { icon: 'sparkle', title: 'Packs', desc: 'Open your packs, and see the sphere and the callings', file: 'anoria.html?packs=1', tool: true },
      { icon: 'cards', title: 'Decks', desc: 'Build a deck of your own from your cards', file: 'anoria.html?decks=1', tool: true },
      { icon: 'users', title: 'Play online', desc: '2 to 6 players, each on their own device with their own deck', file: 'anoria.html?online=1' },
      { icon: 'help', title: 'How to play', desc: 'The story of Arvela, then every rule shown on the table', file: 'anoria.html?guide=1', tool: true }
    ] },

  // ── Board ────────────────────────────────────────────────────────────────
  { id: 'chess',       name: 'Chess',        color: '#64748b', cat: 'board', min: 1, max: 2, tag: 'The classic, vs computer, a friend, or online', play: 'chess', demo: 1,
    launch: [
      { icon: 'phone', title: 'Play on this device', desc: 'Against the computer or pass and play', file: 'chess.html' },
      { icon: 'users', title: 'Play online', desc: 'Two devices, each signed in with its own PIN', file: 'chess.html?online=1' }
    ] },
  { id: 'xiangqi',     name: 'Xiangqi',      color: '#b4232a', cat: 'board', min: 1, max: 2, tag: 'Chinese chess: cannons, horses and the river', play: 'xiangqi', demo: 1 },
  { id: 'checkers',    name: 'Checkers',     color: '#dc2626', cat: 'board', min: 1, max: 2, tag: 'Jump, king, and clear the board', play: 'checkers', demo: 1 },
  { id: 'connectfour', name: 'Connect Four', color: '#2563eb', cat: 'board', min: 1, max: 2, tag: 'Four in a row wins', play: 'connectfour', demo: 1 },
  { id: 'tictactoe',   name: 'Tic-Tac-Toe',  color: '#06b6d4', cat: 'board', min: 1, max: 3, tag: 'Classic, Ultimate, and 3-player', play: 'tictactoe', demo: 1 },
  { id: 'chinesecheckers', name: 'Chinese Checkers', color: '#b91c1c', cat: 'board', min: 1, max: 6, tag: 'Hop your marbles across the star', play: 'chinesecheckers', demo: 1 },
  { id: 'codebreaker', name: 'Mastermind', color: '#000', cat: 'board', min: 1, max: 2, tag: 'Crack the secret color code', play: 'codebreaker', demo: 1 },
  { id: 'dominoes',    name: 'Dominoes',     color: '#000', cat: 'board', min: 1, max: 8, tag: 'Match the ends, block your rivals', play: 'dominoes', demo: 1 },
  { id: 'marbles',     name: 'Marbles',      color: '#7c3aed', cat: 'board', min: 2, max: 6, tag: 'Race home with cards or dice, bump rivals', play: 'marbles', demo: 1 },
  { id: 'axisallies',  name: 'Axis & Allies', color: '#000', cat: 'board', min: 1, max: 5, tag: 'Command the armies of 1942 and win the war', play: 'axisallies', demo: 1, score: 'axisallies-score' },
  { id: 'go',          name: 'Go',           color: '#000', cat: 'board', min: 1, max: 2, tag: 'Surround territory, capture stones', play: 'go', demo: 1 },
  { id: 'linesofaction', name: 'Lines of Action', color: '#9a5b2e', cat: 'board', min: 1, max: 2, tag: 'Join all your pieces into one group', play: 'lines-of-action', demo: 1 },
  { id: 'shogi',       name: 'Shogi',        color: '#9a3412', cat: 'board', min: 1, max: 2, tag: 'Japanese chess: capture pieces and drop them back in as your own', play: 'shogi', demo: 1 },
  { id: 'abalone',     name: 'Abalone',      color: '#0e7490', cat: 'board', min: 1, max: 2, tag: 'Push six marbles off the board', play: 'abalone', demo: 1 },
  { id: 'twixt',       name: 'Twixt',        color: '#b4322a', cat: 'board', min: 1, max: 2, tag: 'Peg a chain from border to border', play: 'twixt', demo: 1 },
  { id: 'blokus',      name: 'Blokus',       color: '#2f74e0', cat: 'board', min: 1, max: 4, tag: 'Fit your pieces in corner to corner', play: 'blokus', demo: 1 },
  { id: 'boku',        name: 'Boku',         color: '#c8862f', cat: 'board', min: 1, max: 2, tag: 'Five marbles in a row, and take in pairs', play: 'boku', demo: 1 },
  { id: 'pacru',       name: 'Pacru',        color: '#d23a2f', cat: 'board', min: 1, max: 4, tag: 'Spread your markers, pincer their chevrons', play: 'pacru', demo: 1 },
  { id: 'continuo',    name: 'Continuo',     color: '#2f62c8', cat: 'board', min: 1, max: 5, tag: 'Match the colors and grow the chains', play: 'continuo', demo: 1 },
  { id: 'kamisado',    name: 'Kamisado',     color: '#b52d2b', cat: 'board', min: 1, max: 2, tag: 'Your move picks the tower they must move', play: 'kamisado', demo: 1 },
  { id: 'entropy',     name: 'Entropy',      color: '#6a3fb0', cat: 'board', min: 1, max: 2, tag: 'Order makes patterns, Chaos spoils them', play: 'entropy', demo: 1 },
  { id: 'othello',     name: 'Othello',      color: '#15803d', cat: 'board', min: 1, max: 2, tag: 'Flip discs, own the board', play: 'othello', demo: 1 },
  { id: 'backgammon',  name: 'Backgammon',   color: '#b45309', cat: 'board', min: 1, max: 2, tag: 'Race your checkers home', play: 'backgammon', demo: 1 },
  { id: 'battleship',  name: 'Battleship',   color: '#0369a1', cat: 'board', min: 1, max: 2, tag: 'Hunt down the hidden fleet', play: 'battleship', demo: 1 },
  { id: 'dotsboxes',   name: 'Dots & Boxes', color: '#ec4899', cat: 'board', min: 1, max: 4, tag: 'Close the most boxes', play: 'dotsboxes', demo: 1 },
  { id: 'mancala',     name: 'Mancala',      color: '#a16207', cat: 'board', min: 1, max: 2, tag: 'Sow stones, fill your store', play: 'mancala', demo: 1 },
  { id: 'mahjong4',    name: 'Mahjong',      color: '#b91c1c', cat: 'board', min: 1, max: 4, tag: 'Four-player Mahjong with the computer or friends', play: 'mahjong4', demo: 1 },
  { id: 'monopoly',    name: 'Monopoly',     color: '#c8102e', cat: 'board', min: 1, max: 8, tag: 'Buy, build and bankrupt, vs computer, pass and play, or online', play: 'monopoly', demo: 1,
    launch: [
      { icon: 'phone', title: 'Play on this device', desc: 'Against the computer or pass and play', file: 'monopoly.html' },
      { icon: 'users', title: 'Play online', desc: '2 to 8 players, each on their own device', file: 'monopoly.html?online=1' }
    ] },
  { id: 'scrabble',    name: 'Scrabble',     color: '#c0392b', cat: 'board', min: 1, max: 4, tag: 'Build words, hit the bonus squares, vs robots, a friend, or online', play: 'scrabble', demo: 1,
    launch: [
      { icon: 'phone', title: 'Play on this device', desc: 'Against the computer or pass and play', file: 'scrabble.html' },
      { icon: 'users', title: 'Play online', desc: '2 to 4 players, each on their own device', file: 'scrabble.html?online=1' }
    ] },

  // ── Dice & luck ──────────────────────────────────────────────────────────
  { id: 'yahtzee',     name: 'Yahtzee',      color: '#ef4444', cat: 'dice', min: 1, max: 8, tag: 'Roll for the best combos', play: 'yahtzee', demo: 1 },
  { id: 'plinko',      name: 'Plinko',       color: '#eab308', cat: 'dice', min: 1, max: 4, tag: 'Drop the chip, hope for the big slot', play: 'plinko', demo: 1 },
  { id: 'wheeloffortune', name: 'Wheel of Fortune', color: '#7c3aed', cat: 'dice', min: 1, max: 3, tag: 'Spin, guess, solve the puzzle', play: 'wheeloffortune', demo: 1 },
  { id: 'dealornodeal',name: 'Deal or No Deal', color: '#ca8a04', cat: 'dice', min: 1, max: 4, tag: 'Take the offer or risk it all', play: 'dealornodeal', demo: 1 },
  { id: 'pressyourluck', name: 'Press Your Luck', color: '#000', cat: 'dice', min: 1, max: 3, tag: 'Big bucks, no Whammies! Stop the board', play: 'pressyourluck', demo: 1 },
  { id: 'shellgame',   name: 'Shell Game',   color: '#0d9488', cat: 'dice', min: 1, max: 4, tag: 'Keep your eye on the ball', play: 'shellgame', demo: 1 },
  { id: 'farkle',      name: 'Farkle',       color: '#000', cat: 'dice', min: 1, max: 6, tag: 'Push your luck to 10,000', play: 'farkle', demo: 1 },
  { id: 'lrc',         name: 'Left Right Center', color: '#000', cat: 'dice', min: 2, max: 10, tag: 'Roll and pass the chips', play: 'lrc', demo: 1 },
  { id: 'fortune',     name: 'Fortune Teller', color: '#000', cat: 'dice', min: 1, max: 0, tag: 'Cookies, an oracle dial, a carnival swami and the 8 ball', play: 'fortune', demo: 1 },

  // ── Puzzles ──────────────────────────────────────────────────────────────
  { id: '2048',        name: '2048',         color: '#f97316', cat: 'puzzle', min: 1, max: 1, tag: 'Slide and merge to 2048', play: '2048', demo: 1 },
  { id: 'marblesolitaire', name: 'Marble Solitaire', color: '#000', cat: 'puzzle', min: 1, max: 1, tag: 'Jump marbles until only one is left', play: 'marblesolitaire', demo: 1 },
  { id: 'slidepuzzle', name: 'Slide Puzzle', color: '#000', cat: 'puzzle', min: 1, max: 1, tag: 'Slide the tiles back in order', play: 'slidepuzzle', demo: 1 },
  { id: 'sudoku',      name: 'Sudoku',       color: '#3b82f6', cat: 'puzzle', min: 1, max: 1, tag: 'Fill the grid, 1 to 9', play: 'sudoku', demo: 1 },
  { id: 'memorymatch', name: 'Memory Match', color: '#d946ef', cat: 'puzzle', min: 1, max: 4, tag: 'Flip two, find the pairs', play: 'memorymatch', demo: 1 },
  { id: 'mahjong',     name: 'Mahjong Tiles', color: '#059669', cat: 'puzzle', min: 1, max: 1, tag: 'Match free tiles, clear the stack', play: 'mahjong', demo: 1 },
  { id: 'mathpuzzles', name: 'Math Puzzles', color: '#0891b2', cat: 'puzzle', min: 1, max: 1, tag: 'Patterns, sequences and brain teasers', play: 'mathpuzzles', demo: 1 },
  { id: 'mazes',       name: 'Mazes',        color: '#000', cat: 'puzzle', min: 1, max: 1, tag: 'Draw your way out, tilt a steel ball, or clear an arrow jam', play: 'mazes', demo: 1 },

  // ── Logic and riddles (in Puzzles & Words) ──────────────────────────────
  { id: 'mysteries',   name: 'Picture Mysteries', color: '#b45309', cat: 'puzzle', min: 1, max: 1, tag: 'Study the scene, crack the case', play: 'mysteries', demo: 1 },
  { id: 'logicgrid',   name: 'Logic Grids',  color: '#0f766e', cat: 'puzzle', min: 1, max: 1, tag: 'Read the clues, fill the grid', play: 'logicgrid', demo: 1 },
  { id: 'truthlies',   name: 'Truth or Lies', color: '#7c3aed', cat: 'puzzle', min: 1, max: 1, tag: 'Someone is lying. Who?', play: 'truthlies', demo: 1 },
  { id: 'ciphers',     name: 'Cipher Cases', color: '#1e3a8a', cat: 'puzzle', min: 1, max: 1, tag: 'Crack the code, open the lock', play: 'ciphers', demo: 1 },
  { id: 'riddles',     name: 'Riddles',      color: '#a16207', cat: 'puzzle', min: 1, max: 1, tag: 'Classic riddles and new ones', play: 'riddles', demo: 1 },

  // ── Words (in Puzzles & Words) ──────────────────────────────────────────
  { id: 'wordle',      name: 'Wordle',       color: '#22c55e', cat: 'puzzle', min: 1, max: 1, tag: 'Guess the word in six tries', play: 'wordle', demo: 1 },
  { id: 'spellingbee', name: 'Spelling Bee', color: '#facc15', cat: 'puzzle', min: 1, max: 1, tag: 'Make words from seven letters', play: 'spellingbee', demo: 1 },
  { id: 'crossword',   name: 'Crossword', color: '#2563eb', cat: 'puzzle', min: 1, max: 1, tag: 'Mini and big crosswords', play: 'crossword', demo: 1 },
  { id: 'boggle',      name: 'Boggle',       color: '#f97316', cat: 'puzzle', min: 1, max: 4, tag: 'Find words in the letter grid', play: 'boggle', demo: 1 },
  { id: 'hangman',     name: 'Hangman',      color: '#8b5cf6', cat: 'puzzle', min: 1, max: 2, tag: 'Guess the word, letter by letter', play: 'hangman', demo: 1 },
  { id: 'wordscramble',name: 'Word Scramble', color: '#14b8a6', cat: 'puzzle', min: 1, max: 4, tag: 'Unscramble against the clock', play: 'wordscramble', demo: 1 },
  { id: 'wordsearch',  name: 'Word Search',  color: '#e11d48', cat: 'puzzle', min: 1, max: 1, tag: 'Find every hidden word', play: 'wordsearch', demo: 1 },
  { id: 'arrowjam',    name: 'Arrow Jam',    color: '#1e88e5', cat: 'puzzle', min: 1, max: 1, tag: 'Slide every arrow off the board without a bump', play: 'arrowjam', hidden: true },   // (played from Mazes, beside the Labyrinth)

  // ── Party ────────────────────────────────────────────────────────────────
  { id: 'trivia',      name: 'Trivia',       color: '#f59e0b', cat: 'party', min: 1, max: 24, tag: 'Who knows the most?', play: 'trivia', demo: 1 },
  { id: 'wouldyourather', name: 'Would You Rather', color: '#ec4899', cat: 'party', min: 2, max: 0, tag: 'Tough choices, big debates', play: 'wouldyourather', demo: 1 },
  { id: 'applestoapples', name: 'Apples to Apples', color: '#e0303f', cat: 'party', min: 1, max: 24, tag: 'Match a red card to the green card', play: 'applestoapples', demo: 1 },
  { id: 'mindmeld',  name: 'Mind Meld',  color: '#0ea5b7', cat: 'party', min: 1, max: 24, tag: 'Write what everyone else will write', play: 'mindmeld', demo: 1 },
  { id: 'madlibs',     name: 'Mad Libs',     color: '#f43f5e', cat: 'party', min: 1, max: 0, tag: 'Fill the blanks, read it aloud', play: 'madlibs', demo: 1 },
  { id: 'bingo',       name: 'Bingo',        color: '#e11d48', cat: 'party', min: 1, max: 0, tag: 'Call the balls, or play Bingo and Keno cards against the computer', play: 'bingo', demo: 1 },
  { id: 'riddlestories', name: 'Riddle Stories', color: '#6366f1', cat: 'party', min: 2, max: 0, tag: 'Solve the mystery with yes/no questions', play: 'riddlestories', demo: 1 },
  { id: 'conversation',name: 'Conversation Starters', tile: 'Conversations',   color: '#10b981', cat: 'party', min: 2, max: 0, tag: 'Questions that get everyone talking', play: 'conversation', demo: 1 },
  { id: 'minigolf',    name: 'Mini Golf',    color: '#16a34a', cat: 'party', min: 1, max: 6, tag: 'Scorecard for a real round', play: 'minigolf', demo: 1 },

  // ── Casino ───────────────────────────────────────────────────────────────
  { id: 'blackjack',   name: 'Blackjack',    color: '#059669', cat: 'casino', min: 1, max: 4, tag: 'Get closer to 21 than the dealer', play: 'blackjack', demo: 1 },
  { id: 'poker',       name: 'Poker',        color: '#dc2626', cat: 'casino', min: 1, max: 10, tag: "Hold'em, Omaha, Stud, Draw, home games and video poker, solo, on the circuit or online", play: 'poker', demo: 1 },
  { id: 'roulette',    name: 'Roulette',     color: '#b91c1c', cat: 'casino', min: 1, max: 6, tag: 'Place your bets, spin the wheel', play: 'roulette', demo: 1 },
  { id: 'slots',       name: 'Slots',        color: '#d97706', cat: 'casino', min: 1, max: 1, tag: 'Pull the lever, chase the jackpot', play: 'slots', demo: 1 },
  { id: 'craps',       name: 'Craps',        color: '#047857', cat: 'casino', min: 1, max: 6, tag: 'Roll the bones, ride the point', play: 'craps', demo: 1 },
  { id: 'baccarat',    name: 'Baccarat',     color: '#7c3aed', cat: 'casino', min: 1, max: 6, tag: 'Player, Banker or Tie', play: 'baccarat', demo: 1 },
  { id: 'horserace',   name: 'Horse Race',   color: '#000', cat: 'casino', min: 1, max: 6, tag: 'Pick your horse, place your bets', play: 'horserace', demo: 1 },
  { id: 'stocks',      name: 'Stock Market', color: '#0f5f9e', cat: 'casino', min: 1, max: 1, tag: 'Invest real stocks, index funds, bonds and options, and learn how', play: 'stocks', demo: 1 },
  { id: 'sportsbook',  name: 'Sportsbook',   color: '#16703e', cat: 'casino', min: 1, max: 1, tag: 'Bet real games: moneylines, spreads, totals and parlays', play: 'sportsbook', demo: 1 },
  { id: 'threecardpoker', name: 'Three Card Poker', color: '#0f766e', cat: 'casino', min: 1, max: 6, tag: 'Ante up and beat the dealer', play: 'threecardpoker', demo: 1 },
  { id: 'paigow',      name: 'Pai Gow',      color: '#9f1239', cat: 'casino', min: 1, max: 6, tag: 'Set a high hand and a low hand', play: 'paigow', demo: 1 },

  // ── Arcade ───────────────────────────────────────────────────────────────
  { id: 'tetris',      name: 'Tetris',       color: '#8b5cf6', cat: 'arcade', min: 1, max: 6, tag: 'Stack and clear lines, solo or TetriNET with up to 6', play: 'tetris', demo: 1,
    launch: [
      { icon: 'gamepad', title: 'Play Tetris', desc: 'Just you: clear lines and climb the levels', file: 'tetris.html' },
      { icon: 'users', title: 'TetriNET', desc: 'Up to 6 fields at once with specials to fire: against the computer or online', file: 'tetrinet.html' }
    ] },
  // TetriNET lives under Tetris (its launch options), so it has no tile of its own
  { id: 'tetrinet',    name: 'TetriNET',     color: '#8b5cf6', cat: 'arcade', min: 1, max: 6, tag: 'Multiplayer Tetris with specials, online or vs computer', play: 'tetrinet', hidden: true },
  { id: 'snake',       name: 'Snake',        color: '#22c55e', cat: 'arcade', min: 1, max: 1, tag: "Eat, grow, don't crash", play: 'snake', demo: 1 },
  { id: 'pacman',      name: 'Pac-Man',      color: '#facc15', cat: 'arcade', min: 1, max: 1, tag: 'Eat the dots, dodge the ghosts', play: 'pacman', demo: 1 },
  { id: 'donkeykong',  name: 'Donkey Kong',  color: '#000', cat: 'arcade', min: 1, max: 1, tag: 'Climb the girders, jump the barrels, rescue Pauline', play: 'donkeykong', demo: 1 },
  { id: 'breakout',    name: 'Breakout',     color: '#f43f5e', cat: 'arcade', min: 1, max: 1, tag: 'Smash every brick', play: 'breakout', demo: 1 },
  { id: 'flappybird',  name: 'Flappy Bird',       color: '#38bdf8', cat: 'arcade', min: 1, max: 1, tag: 'Tap to fly through the pipes', play: 'flappybird', demo: 1 },
  { id: 'crossyroad',  name: 'Crossy Road',  color: '#84cc16', cat: 'arcade', min: 1, max: 1, tag: 'Hop across roads and rivers', play: 'crossyroad', demo: 1 },
  { id: 'willycrash',  name: 'Willy Crash',  color: '#ff6a3d', cat: 'arcade', min: 1, max: 1, tag: 'Blast the daredevil onto the rooftop', play: 'willycrash', demo: 1 },
  { id: 'crazytower',  name: 'Crazy Tower',  color: '#000', cat: 'arcade', min: 1, max: 4, tag: 'Drop the blocks, stack to the jackpot', play: 'crazytower', demo: 1 },
  { id: 'centipede',   name: 'Centipede', color: '#000', cat: 'arcade', min: 1, max: 3, tag: 'Blast the centipedes, beat the bosses, solo or online', play: 'centipede', demo: 1,
    launch: [
      { icon: 'gamepad', title: 'Play solo', desc: 'Ten waves and four bosses', file: 'centipede.html' },
      { icon: 'users', title: 'Play online', desc: '2 or 3 players, each on their own device', file: 'centipede.html?online=1' }
    ] },
  { id: 'junglehunt',  name: 'Jungle Hunt',  color: '#2f8a3a', cat: 'console', min: 1, max: 1, tag: 'Swing, swim and leap to rescue Lady Penelope', play: 'junglehunt', hidden: true },   // (played from its Atari 2600 cartridge: see CONSOLE_NATIVE)
  { id: 'goblindefenders', name: 'Goblin Defenders', color: '#4f9a2c', cat: 'arcade', min: 1, max: 1, tag: 'Build towers of steel and wood, stop the march on the village', play: 'goblindefenders', demo: 1 },
  { id: 'galaga',      name: 'Galaga',       color: '#2a5cff', cat: 'arcade', min: 1, max: 1, tag: 'Blast the swarm, dodge the tractor beam', play: 'galaga', demo: 1 },
  { id: 'invaders',    name: 'Space Invaders', color: '#2fd35a', cat: 'arcade', min: 1, max: 2, tag: 'Stop the invaders before they land', play: 'invaders', demo: 1 },
  { id: 'asteroids',   name: 'Asteroids',   color: '#6366f1', cat: 'arcade', min: 1, max: 1, tag: 'Blast rocks, stay alive', play: 'asteroids', demo: 1 },
  { id: 'peggle',      name: 'Peggle',       color: '#fb923c', cat: 'arcade', min: 1, max: 1, tag: 'Aim, bounce, clear the orange pegs', play: 'peggle', demo: 1 },
  { id: 'cubehopper',  name: 'Q*bert',       color: '#000', cat: 'arcade', min: 1, max: 1, tag: 'Hop the pyramid, change every cube', play: 'cubehopper', demo: 1 },
  { id: 'paddleball',  name: 'Pong',         color: '#000', cat: 'arcade', min: 1, max: 2, tag: 'Classic two-paddle table tennis', play: 'paddleball', demo: 1 },
  { id: 'pinball',     name: 'Pinball',      color: '#000', cat: 'arcade', min: 1, max: 1, tag: 'Six 3D tables: flip, ramp, lock, multiball', play: 'pinball', demo: 1 },
  { id: 'minesweeper', name: 'Minesweeper',  color: '#64748b', cat: 'arcade', min: 1, max: 1, tag: 'Clear the field without a boom', play: 'minesweeper', demo: 1 },
  { id: 'carmen',      name: 'Carmen Sandiego', color: '#c81e24', cat: 'arcade', min: 1, max: 1, tag: 'Track V.I.L.E. thieves around the world and through time', play: 'carmen', demo: 1 },
  { id: 'hotdogstand', name: 'Hot Dog Stand', color: '#d6402f', cat: 'arcade', min: 1, max: 1, tag: 'Run the stadium stand for a season', play: 'hotdogstand', demo: 1 },
  { id: 'oregon',      name: 'The Oregon Trail', color: '#000', cat: 'arcade', min: 1, max: 1, tag: 'Lead your wagon party 2,000 miles west in 1848', play: 'oregon', demo: 1 },
  { id: 'candymatch',  name: 'Candy Match',  color: '#ff4f9a', cat: 'arcade', min: 1, max: 1, tag: 'Swap candies, match three, beat the level', play: 'candymatch', demo: 1 },

  // ── Consoles: your own cartridges. The consoles' shelves have no tiles (Edit on the home screen opens them);
  // each game gets its own tile (addConsoleGames below) ──
  { id: 'nes',         name: 'NES',            color: '#000', cat: 'console', min: 1, max: 2, tag: 'Your own NES games on a shelf of cartridges', play: 'nes', shelf: true, hidden: true },
  { id: 'snes',        name: 'Super Nintendo', color: '#000', cat: 'console', min: 1, max: 4, tag: 'Your own Super Nintendo games', play: 'snes', shelf: true, hidden: true },
  { id: 'genesis',     name: 'Sega Genesis',   color: '#000', cat: 'console', min: 1, max: 4, tag: 'Your own Genesis games', play: 'genesis', shelf: true, hidden: true },
  { id: 'atari2600',   name: 'Atari 2600',     color: '#000', cat: 'console', min: 1, max: 2, tag: 'Your own Atari 2600 games', play: 'atari2600', shelf: true, hidden: true },

  // ── Tools ────────────────────────────────────────────────────────────────
  { id: 'scorecard',   name: 'Scorecard',    color: '#0ea5e9', cat: 'tools', min: 1, max: 8, tag: 'Keep score for any game', play: 'scorecard' },
  { id: 'dice-roller', name: 'Dice Roller',  color: '#f97316', cat: 'tools', min: 1, max: 0, tag: 'Any dice, any number', play: 'dice-roller' },
  { id: 'randomtools', name: 'Randomizer',        color: '#14b8a6', cat: 'tools', min: 1, max: 0, tag: 'Random numbers, coin flips, teams', play: 'randomtools' },
    { id: 'ranker',      name: 'Ranker',       color: '#eab308', cat: 'tools', min: 1, max: 0, tag: 'Rank anything, settle debates', play: 'ranker' },
  { id: 'players',     name: 'Frequent Players',      color: '#6366f1', cat: 'tools', min: 1, max: 0, tag: 'The names you play with most', play: 'players' },
  { id: 'history',     name: 'Game History',          color: '#0ea5a4', cat: 'tools', min: 1, max: 0, tag: 'Every game you’ve finished', play: 'history' },
  { id: 'hiscores',    name: 'High Scores',           color: '#f5c842', cat: 'tools', min: 1, max: 0, tag: 'Top 50 for every arcade and puzzle game', play: 'hiscores' }
];

// Console games: the house games and each game file you've added (console-lib.js keeps the list in gn_console_idx)
// get their own cartridge tile,
// opening straight into its console. gn_console_vis {id: 0} hides a game from the home screen.
// Cartridges with a native version on this site (the game's own program translated, games/junglehunt.html): their
// home tile and their cartridge on the console's shelf open that page instead of the emulator. Needing no game file,
// they're on everyone's console shelf on the home screen (with their own label art), signed in or not
var CONSOLE_NATIVE = [
  { sys: 'atari2600', page: 'junglehunt', title: 'Jungle Hunt', art: '/img/consoles/art/junglehunt.jpg', sha1: ['83a32a2d686355438c915540cfe0bb13b76c1113'], name: /^jungle hunt\b/i }
];
function consoleNative(c) {
  for (var i = 0; i < CONSOLE_NATIVE.length; i++) {
    var n = CONSOLE_NATIVE[i];
    if (c && c.sys === n.sys && (n.sha1.indexOf(c.id) >= 0 || n.name.test(String(c.name || '')))) return n.page;
  }
  return null;
}
function addConsoleGames() {
  for (var i = GAMES.length - 1; i >= 0; i--) if (GAMES[i].cart) GAMES.splice(i, 1);
  var idx = [], vis = {}, SYS = { nes: 'NES', snes: 'Super Nintendo', genesis: 'Sega Genesis', atari2600: 'Atari 2600' };
  try { idx = JSON.parse(localStorage.getItem('gn_console_idx') || '[]') || []; vis = JSON.parse(localStorage.getItem('gn_console_vis') || '{}') || {}; } catch (e) {}
  var pin = !!(window.FGHSync && FGHSync.isPin && FGHSync.isPin());
  idx.forEach(function (c) {
    if (!c || !SYS[c.sys] || !/^[0-9a-f]+$/.test(c.id) || (c.h && !pin)) return;   // (the house games: signed in only)
    GAMES.push({ id: 'cart-' + c.id.slice(0, 16), name: c.name, color: '#000', cat: 'console', min: 1, max: 1, tag: SYS[c.sys] + ' game', play: consoleNative(c) ? consoleNative(c) + '.html?from=' + c.sys : c.sys + '.html?play=' + c.id,
      mark: c.sys, cart: c.id, sys: c.sys, art: c.art || (consoleNative(c) && nativeOf(c).art) || null, hidden: vis[c.id] === 0 });
  });
  CONSOLE_NATIVE.forEach(function (n) {
    if (GAMES.some(function (g) { return g.cart && consoleNative({ sys: g.sys, id: g.cart, name: g.name }) === n.page; })) return;   // (already there from the shelf)
    var id = n.sha1[0];
    GAMES.push({ id: 'cart-' + id.slice(0, 16), name: n.title, color: '#000', cat: 'console', min: 1, max: 1, tag: SYS[n.sys] + ' game', play: n.page + '.html?from=' + n.sys,
      mark: n.sys, cart: id, sys: n.sys, art: n.art, hidden: vis[id] === 0 });
  });
}
function nativeOf(c) { var p = consoleNative(c); for (var i = 0; i < CONSOLE_NATIVE.length; i++) if (CONSOLE_NATIVE[i].page === p) return CONSOLE_NATIVE[i]; return null; }
addConsoleGames();

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

// High-score boards (localStorage hi_<key>) that are not plain "highest score
// first". arcade-hi.js reads this for the order, the value format and the tabs
// on a board; sync.js reads it to publish your best end of each board to the
// people who link you. Every page loads games.js, so the direction is known
// everywhere. A board not listed here is a highest-first score.
//   game   catalog id            label  shown after the game name ('Expert')
//   tab    short name for the board's tab            low  1 = lower is better
//   unit   'time' (seconds, m:ss) | 'moves' | 'marbles' (see ArcadeHi.marbles)
//          | 'points' | 'score'                      dec  decimals on times
// Peggle's level names, in the order of LEVELS in games/peggle.html
var PEGGLE_LEVELS = ['First Light', 'Rainbow Arches', 'Spiral', 'Bubbles', 'Hourglass', 'Diamonds', 'Twin Peaks', 'The Wheel', 'Sliders', 'Orbits', 'Pendulum', 'Galaxy', 'Clockwork',
  'Bumper Garden', 'Iron Works', 'Portals', 'Conveyor', 'Ghost Lights', 'Racetrack', 'Gravity Well', 'Windy Ridge', 'The Vault',
  'Splitter', 'Runaway Bucket', 'Gear Train', 'Wormholes', 'Storm Front', 'Fortress', 'Event Horizon', 'Grand Finale'];
var HI_BOARDS = (function () {
  var b = {};
  function add(game, key, o) { o.game = game; b[key] = o; }
  add('2048', '2048', { label: '', unit: 'score' });
  [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['expert', 'Expert']].forEach(function (d) {
    add('sudoku', 'sudoku_' + d[0], { label: d[1], tab: d[1], low: 1, unit: 'time' });
  });
  [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['expert', 'Expert']].forEach(function (d) {
    add('minesweeper', 'minesweeper_' + d[0], { label: d[1], tab: d[1], low: 1, unit: 'time', dec: 1 });
  });
  [3, 4, 5, 6].forEach(function (n) {
    add('slidepuzzle', 'slidepuzzle_' + n, { label: n + '×' + n, tab: n + '×' + n, low: 1, unit: 'moves' });
  });
  [['english', 'English'], ['european', 'European'], ['triangle', 'Triangle'], ['cross', 'Cross', 1],
   ['plus', 'Plus', 1], ['pyramid', 'Pyramid', 1], ['arrow', 'Arrow', 1]].forEach(function (d) {
    add('marblesolitaire', 'marblesolitaire_' + d[0], { label: d[1] + (d[2] ? ' warm-up' : ''), tab: d[1], low: 1, unit: 'marbles' });
  });
  [['4x3', 12], ['4x4', 16], ['5x4', 20], ['6x4', 24], ['6x5', 30], ['6x6', 36]].forEach(function (d) {
    add('memorymatch', 'memorymatch_' + d[0], { label: d[1] + ' cards', tab: String(d[1]), low: 1, unit: 'moves' });
  });
  [['turtle', 'Turtle'], ['pyramid', 'Pyramid'], ['castle', 'Castle'], ['mini', 'Mini']].forEach(function (d) {
    add('mahjong', 'mahjong_' + d[0], { label: d[1], tab: d[1], low: 1, unit: 'time' });
  });
  // Math Puzzles: Beat the clock, one board per level and clock length
  [['k2', 'K–2'], ['g34', '3–4'], ['g56', '5–6'], ['g78', '7–8'], ['g912', '9–12'], ['seq', 'Sequences']].forEach(function (l) {
    [60, 120, 180].forEach(function (s) {
      add('mathpuzzles', 'mathpuzzles_' + l[0] + '_' + s, { label: (l[0] === 'seq' ? '' : 'Grades ') + l[1] + ' in ' + (s / 60) + (s === 60 ? ' minute' : ' minutes'), tab: l[1] + ' in ' + (s / 60) + 'm', unit: 'points' });
    });
  });
  add('candymatch', 'candymatch', { label: '', unit: 'score' });
  // The Oregon Trail: points for reaching Oregon (the Oregon Top Ten)
  add('oregon', 'oregon', { label: '', unit: 'points' });
  // Hot Dog Stand: final cash for the season, one board per season level
  [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star']].forEach(function (d) {
    add('hotdogstand', 'hotdogstand_' + d[0], { label: d[1] + ' season', tab: d[1], unit: 'cash', pin: 1 });
  });
  // Drug Wars (hidden in Hot Dog Stand): net worth at the end of the 30 days. Not in the catalog, so it names itself
  add('drugwars', 'drugwars', { label: '', title: 'Drug Wars', unit: 'cash', secret: 'hotdogstand_dw' });
  // Trivia Countdown (solo): one board per level and game length
  [['easy', 'Elementary'], ['medium', 'General'], ['hard', 'Genius']].forEach(function (l) {
    [10, 15, 20].forEach(function (n) { add('trivia', 'trivia_cd_' + l[0] + '_' + n, { label: n + ' ' + l[1] + ' questions', tab: n + ' ' + l[1], unit: 'points' }); });
  });
  // Mazes: best times per size, drawn (Pencil) and rolled (Labyrinth)
  [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['expert', 'Expert']].forEach(function (d) {
    add('mazes', 'mazes_' + d[0], { label: d[1], tab: d[1], low: 1, unit: 'time', dec: 1 });
  });
  [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['expert', 'Expert']].forEach(function (d) {
    add('mazes', 'mazes_tilt_' + d[0], { label: 'Labyrinth ' + d[1], tab: 'Tilt ' + d[1], low: 1, unit: 'time', dec: 1 });
  });
  // Peggle: the full game (levels 1 to 13 in order, one total) and a board per level. hi_peggle is the old
  // board with every level mixed: it shows as Older only while it holds scores not filed on a level (see peggleOld).
  //   pin: always a tab, even empty      tabIf: shown as a tab only while this says so
  add('peggle', 'peggle_run', { label: 'Full game', tab: 'Full game', pin: 1 });
  PEGGLE_LEVELS.forEach(function (nm, i) { add('peggle', 'peggle_l' + (i + 1), { label: 'Level ' + (i + 1) + ': ' + nm, tab: 'L' + (i + 1) }); });
  add('peggle', 'peggle', { label: 'Older scores', tab: 'Older', tabIf: function () { return peggleOld() > 0; } });
  // Centipede: scores from the Centipede Chaos game go on their own board (hi_centipede_chaos). The earlier game's
  // board (hi_centipede) is retired: no longer shown anywhere, its stored data left as it was.
  add('centipede', 'centipede_chaos', { label: '', tab: 'Chaos', pin: 1 });
  // Pong: the longest rallies against the computer on the classic table, and the Tunnel's scores
  add('paddleball', 'paddleball', { label: 'Longest rallies', tab: 'Rallies', pin: 1 });
  add('paddleball', 'paddleball_tunnel', { label: 'Tunnel', tab: 'Tunnel', unit: 'points', pin: 1 });
  // Carmen Sandiego: best case score per version (rank, hours to spare, Carmen herself)
  [['world', 'World'], ['usa', 'USA'], ['time', 'Time'], ['europe', 'Europe'], ['asia', 'Asia'], ['africa', 'Africa'], ['americas', 'Americas']].forEach(function (v) {
    add('carmen', 'carmen_' + v[0], { label: v[1], tab: v[1], unit: 'points' });
  });
  return b;
})();
function hiBoard(key) { return HI_BOARDS.hasOwnProperty(String(key)) ? HI_BOARDS[String(key)] : null; }
function hiLow(key) { var c = hiBoard(key); return !!(c && c.low); }

// Peggle's old one-for-all board (hi_peggle): how many of its scores are not on a level board yet.
// peggleOld(true) files what it can first: a score goes on the level whose history record (gh_peggle) has the
// same score and was saved just before it (the initials come up right after the level ends). The copy keeps its
// initials and date, so it's skipped if it's already there, and sync's merge sees one score, not two.
// It runs again only when the old board or the history has changed (peggle_hi_mig); hi_peggle is never changed.
function peggleOld(fix) {
  var LS; try { LS = window.localStorage; } catch (e) { return 0; }
  function rd(k) { try { var v = JSON.parse(LS.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function sig(e) { return String(e.name).trim().toUpperCase() + '|' + Number(e.score) + '|' + (e.date || ''); }
  var old = rd('hi_peggle').filter(function (e) { return e && e.score !== null && e.score !== '' && isFinite(Number(e.score)) && Number(e.score) > 0; });
  if (!old.length) return 0;
  var NL = PEGGLE_LEVELS.length, boards = {}, have = {}, n;
  for (n = 1; n <= NL; n++) { boards[n] = rd('hi_peggle_l' + n); boards[n].forEach(function (e) { if (e) have[sig(e)] = 1; }); }
  var left = old.filter(function (e) { return !have[sig(e)]; });
  if (!fix || !left.length) return left.length;
  var hist = rd('gh_peggle');
  function mark(nLeft) { return old.length + '|' + nLeft + '|' + hist.length + '|' + (hist[0] && hist[0]._date || 0); }
  try { if (LS.getItem('peggle_hi_mig') === mark(left.length)) return left.length; } catch (e) {}
  var lvh = hist.filter(function (h) { return h && h.level >= 1 && h.level <= NL && h._date; });
  var MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  // 'Oct 9, 2026 3:45 PM' (older scores: no year) -> [start, end] of that minute, or of the day without a time
  function when(d) {
    var m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?(?:\s+(\d{4}))?(?:\s+(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm])?/.exec(String(d || '').trim());
    if (!m || MON.indexOf(m[1].toLowerCase()) < 0) return null;
    var mo = MON.indexOf(m[1].toLowerCase()), now = new Date(), y = m[3] ? +m[3] : now.getFullYear();
    if (!m[3] && new Date(y, mo, +m[2]) > now) y--;
    if (!m[4]) { var a = new Date(y, mo, +m[2]).getTime(); return [a, a + 864e5]; }
    var h = (+m[4]) % 12 + (/p/i.test(m[6]) ? 12 : 0), t = new Date(y, mo, +m[2], h, +m[5]).getTime();
    return [t, t + 6e4];
  }
  var changed = {};
  left = left.filter(function (e) {
    var w = when(e.date), sc = Number(e.score); if (!w) return true;
    var timed = w[1] - w[0] < 864e5, best = null, bestGap = Infinity, tie = false;
    lvh.forEach(function (h) {
      var hs = Number(h.levelScore != null ? h.levelScore : h.score);
      if (hs !== sc) return;
      // timed: the score was entered within 12 hours after the level's record; untimed: the same day
      var gap = timed ? w[0] - h._date : 0;
      if (timed ? (gap < -12e4 || gap > 432e5) : (h._date < w[0] || h._date >= w[1])) return;
      gap = Math.abs(gap);
      if (gap < bestGap) { best = h; bestGap = gap; tie = false; }
      else if (gap === bestGap && best && best.level !== h.level) tie = true;
    });
    if (!best || tie) return true;
    boards[best.level].push({ name: e.name, score: sc, date: e.date });
    changed[best.level] = 1;
    return false;
  });
  Object.keys(changed).forEach(function (k) {
    var list = boards[k].sort(function (a, b) { return Number(b.score) - Number(a.score); }).slice(0, 50);
    try { LS.setItem('hi_peggle_l' + k, JSON.stringify(list)); if (typeof FGHSync !== 'undefined' && FGHSync.noteWrite) FGHSync.noteWrite('hi_peggle_l' + k); } catch (e) {}
  });
  try { LS.setItem('peggle_hi_mig', mark(left.length)); } catch (e) {}
  return left.length;
}

// Lookup by game id or by any of its files (hearts-ai → hearts).
function findGame(key) {
  key = String(key || '').replace(/^.*\//, '').replace(/\.html.*$/, '');
  for (var i = 0; i < GAMES.length; i++) {
    var g = GAMES[i];
    if (g.id === key || g.play === key || g.score === key) return g;
  }
  return null;
}
