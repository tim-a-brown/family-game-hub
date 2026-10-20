// ═══════════════════════════════════════════════════════════════════════════
// Game Night catalog: the single list of every game, used by the home screen
// (tiles, search, filters) and by kit.js (game bar title and colour).
//
// Fields
//   id      stable key (matches games/<file>.html unless `file` is given)
//   name    display name          color  the game's accent colour
//   cat     category id (see GAME_CATS)
//   base    icon background style when it differs from the category's (optional)
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
  { id: 'puzzle', name: 'Puzzles & Words', hue: 205, sat: 78 },
  { id: 'party',  name: 'Party',       hue: 322, sat: 68 },
  { id: 'casino', name: 'Casino',      hue: 142, sat: 62 },
  { id: 'arcade', name: 'Arcade',      hue: 252, sat: 72 },
  { id: 'console', name: 'Consoles',   hue: 176, sat: 58 },
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
  { id: 'jokerrun',    name: 'Balatro',      color: '#e11d48', cat: 'specialty', min: 1, max: 1, tag: 'Poker hands, wild jokers, beat the blinds', play: 'jokerrun' },
  { id: 'pokersquares',name: 'Poker Squares', color: '#ef4444', cat: 'cards', min: 1, max: 1, tag: 'Build ten poker hands on a 5×5 grid', play: 'pokersquares' },
  { id: 'sandlot',     name: 'Sandlot',      color: '#000', cat: 'specialty', min: 1, max: 4, tag: 'Baseball card battles with your old cards', play: 'sandlot' },
  { id: 'lorcana',     name: 'Lorcana',      color: '#a855f7', cat: 'specialty', min: 1, max: 4, tag: 'Real cards and art, vs the computer or pass & play', play: 'lorcana-play', score: 'lorcana',
    launch: [
      { icon: 'phone', title: 'Play on this device', desc: 'Against the computer or pass and play, with the real cards', file: 'lorcana-play.html' },
      { icon: 'users', title: 'Play online', desc: 'Two devices, two PINs, each with your own deck', file: 'lorcana-play.html?online=1' },
      { icon: 'pencil', title: 'Keep score', desc: 'Playing with real cards? Track the lore here', file: 'lorcana' },
      { icon: 'book', title: 'Cards and decks', desc: 'Browse every card and build your decks. Leaves any game as it is', file: 'lorcana-play.html?library=1', tool: true }
    ] },

  // ── Board ────────────────────────────────────────────────────────────────
  { id: 'chess',       name: 'Chess',        color: '#64748b', cat: 'board', min: 1, max: 2, tag: 'The classic, vs computer, a friend, or online', play: 'chess',
    launch: [
      { icon: 'phone', title: 'Play on this device', desc: 'Against the computer or pass and play', file: 'chess.html' },
      { icon: 'users', title: 'Play online', desc: 'Two devices, each signed in with its own PIN', file: 'chess.html?online=1' }
    ] },
  { id: 'checkers',    name: 'Checkers',     color: '#dc2626', cat: 'board', min: 1, max: 2, tag: 'Jump, king, and clear the board', play: 'checkers' },
  { id: 'connectfour', name: 'Connect Four', color: '#2563eb', cat: 'board', min: 1, max: 2, tag: 'Four in a row wins', play: 'connectfour' },
  { id: 'tictactoe',   name: 'Tic-Tac-Toe',  color: '#06b6d4', cat: 'board', min: 1, max: 3, tag: 'Classic, Ultimate, and 3-player', play: 'tictactoe' },
  { id: 'chinesecheckers', name: 'Chinese Checkers', color: '#b91c1c', cat: 'board', min: 1, max: 6, tag: 'Hop your marbles across the star', play: 'chinesecheckers' },
  { id: 'codebreaker', name: 'Mastermind', color: '#000', cat: 'board', min: 1, max: 2, tag: 'Crack the secret color code', play: 'codebreaker' },
  { id: 'dominoes',    name: 'Dominoes',     color: '#000', cat: 'board', min: 1, max: 4, tag: 'Match the ends, block your rivals', play: 'dominoes' },
  { id: 'marbles',     name: 'Marbles',      color: '#7c3aed', cat: 'board', min: 2, max: 6, tag: 'Race home with cards or dice, bump rivals', play: 'marbles' },
  { id: 'axisallies',  name: 'Axis & Allies', color: '#000', cat: 'board', min: 1, max: 5, tag: 'Command the armies of 1942 and win the war', play: 'axisallies', score: 'axisallies-score' },
  { id: 'go',          name: 'Go',           color: '#000', cat: 'board', min: 1, max: 2, tag: 'Surround territory, capture stones', play: 'go' },
  { id: 'othello',     name: 'Othello',      color: '#15803d', cat: 'board', min: 1, max: 2, tag: 'Flip discs, own the board', play: 'othello' },
  { id: 'backgammon',  name: 'Backgammon',   color: '#b45309', cat: 'board', min: 1, max: 2, tag: 'Race your checkers home', play: 'backgammon' },
  { id: 'battleship',  name: 'Battleship',   color: '#0369a1', cat: 'board', min: 1, max: 2, tag: 'Hunt down the hidden fleet', play: 'battleship' },
  { id: 'dotsboxes',   name: 'Dots & Boxes', color: '#ec4899', cat: 'board', min: 1, max: 3, tag: 'Close the most boxes', play: 'dotsboxes' },
  { id: 'mancala',     name: 'Mancala',      color: '#a16207', cat: 'board', min: 1, max: 2, tag: 'Sow stones, fill your store', play: 'mancala' },
  { id: 'mahjong4',    name: 'Mahjong',      color: '#b91c1c', cat: 'board', min: 1, max: 1, tag: 'Four-player Mahjong vs the computer', play: 'mahjong4' },
  { id: 'monopoly',    name: 'Monopoly',     color: '#c8102e', cat: 'board', min: 1, max: 8, tag: 'Buy, build and bankrupt, vs computer, pass and play, or online', play: 'monopoly',
    launch: [
      { icon: 'phone', title: 'Play on this device', desc: 'Against the computer or pass and play', file: 'monopoly.html' },
      { icon: 'users', title: 'Play online', desc: '2 to 8 players, each on their own device', file: 'monopoly.html?online=1' }
    ] },
  { id: 'scrabble',    name: 'Scrabble',     color: '#c0392b', cat: 'board', min: 1, max: 4, tag: 'Build words, hit the bonus squares, vs robots, a friend, or online', play: 'scrabble',
    launch: [
      { icon: 'phone', title: 'Play on this device', desc: 'Against the computer or pass and play', file: 'scrabble.html' },
      { icon: 'users', title: 'Play online', desc: '2 to 4 players, each on their own device', file: 'scrabble.html?online=1' }
    ] },

  // ── Dice & luck ──────────────────────────────────────────────────────────
  { id: 'yahtzee',     name: 'Yahtzee',      color: '#ef4444', cat: 'dice', min: 1, max: 8, tag: 'Roll for the best combos', play: 'yahtzee' },
  { id: 'plinko',      name: 'Plinko',       color: '#eab308', cat: 'dice', min: 1, max: 4, tag: 'Drop the chip, hope for the big slot', play: 'plinko' },
  { id: 'wheeloffortune', name: 'Wheel of Fortune', color: '#7c3aed', cat: 'dice', min: 1, max: 3, tag: 'Spin, guess, solve the puzzle', play: 'wheeloffortune' },
  { id: 'dealornodeal',name: 'Deal or No Deal', color: '#ca8a04', cat: 'dice', min: 1, max: 4, tag: 'Take the offer or risk it all', play: 'dealornodeal' },
  { id: 'pressyourluck', name: 'Press Your Luck', color: '#000', cat: 'dice', min: 1, max: 3, tag: 'Big bucks, no Whammies! Stop the board', play: 'pressyourluck' },
  { id: 'shellgame',   name: 'Shell Game',   color: '#0d9488', cat: 'dice', min: 1, max: 4, tag: 'Keep your eye on the ball', play: 'shellgame' },
  { id: 'farkle',      name: 'Farkle',       color: '#000', cat: 'dice', min: 1, max: 6, tag: 'Push your luck to 10,000', play: 'farkle' },
  { id: 'lrc',         name: 'Left Right Center', color: '#000', cat: 'dice', min: 2, max: 10, tag: 'Roll and pass the chips', play: 'lrc' },
  { id: 'fortune',     name: 'Fortune Teller', color: '#000', cat: 'dice', min: 1, max: 0, tag: 'Cookies, an oracle dial, a carnival swami and the 8 ball', play: 'fortune' },

  // ── Puzzles ──────────────────────────────────────────────────────────────
  { id: '2048',        name: '2048',         color: '#f97316', cat: 'puzzle', min: 1, max: 1, tag: 'Slide and merge to 2048', play: '2048' },
  { id: 'marblesolitaire', name: 'Marble Solitaire', color: '#000', cat: 'puzzle', min: 1, max: 1, tag: 'Jump marbles until only one is left', play: 'marblesolitaire' },
  { id: 'slidepuzzle', name: 'Slide Puzzle', color: '#000', cat: 'puzzle', min: 1, max: 1, tag: 'Slide the tiles back in order', play: 'slidepuzzle' },
  { id: 'sudoku',      name: 'Sudoku',       color: '#3b82f6', cat: 'puzzle', min: 1, max: 1, tag: 'Fill the grid, 1 to 9', play: 'sudoku' },
  { id: 'memorymatch', name: 'Memory Match', color: '#d946ef', cat: 'puzzle', min: 1, max: 4, tag: 'Flip two, find the pairs', play: 'memorymatch' },
  { id: 'mahjong',     name: 'Mahjong Tiles', color: '#059669', cat: 'puzzle', min: 1, max: 1, tag: 'Match free tiles, clear the stack', play: 'mahjong' },
  { id: 'mathpuzzles', name: 'Math Puzzles', color: '#0891b2', cat: 'puzzle', min: 1, max: 1, tag: 'Patterns, sequences and brain teasers', play: 'mathpuzzles' },
  { id: 'mazes',       name: 'Mazes',        color: '#000', cat: 'puzzle', min: 1, max: 1, tag: 'Draw your way out, or tilt a steel ball', play: 'mazes' },

  // ── Logic and riddles (in Puzzles & Words) ──────────────────────────────
  { id: 'mysteries',   name: 'Picture Mysteries', color: '#b45309', cat: 'puzzle', min: 1, max: 1, tag: 'Study the scene, crack the case', play: 'mysteries' },
  { id: 'logicgrid',   name: 'Logic Grids',  color: '#0f766e', cat: 'puzzle', min: 1, max: 1, tag: 'Read the clues, fill the grid', play: 'logicgrid' },
  { id: 'truthlies',   name: 'Truth or Lies', color: '#7c3aed', cat: 'puzzle', min: 1, max: 1, tag: 'Someone is lying. Who?', play: 'truthlies' },
  { id: 'ciphers',     name: 'Cipher Cases', color: '#1e3a8a', cat: 'puzzle', min: 1, max: 1, tag: 'Crack the code, open the lock', play: 'ciphers' },
  { id: 'riddles',     name: 'Riddles',      color: '#a16207', cat: 'puzzle', min: 1, max: 1, tag: 'Classic riddles and new ones', play: 'riddles' },

  // ── Words (in Puzzles & Words) ──────────────────────────────────────────
  { id: 'wordle',      name: 'Wordle',       color: '#22c55e', cat: 'puzzle', min: 1, max: 1, tag: 'Guess the word in six tries', play: 'wordle' },
  { id: 'spellingbee', name: 'Spelling Bee', color: '#facc15', cat: 'puzzle', min: 1, max: 1, tag: 'Make words from seven letters', play: 'spellingbee' },
  { id: 'crossword',   name: 'Crossword', color: '#2563eb', cat: 'puzzle', min: 1, max: 1, tag: 'Mini and big crosswords', play: 'crossword' },
  { id: 'boggle',      name: 'Boggle',       color: '#f97316', cat: 'puzzle', min: 1, max: 4, tag: 'Find words in the letter grid', play: 'boggle' },
  { id: 'hangman',     name: 'Hangman',      color: '#8b5cf6', cat: 'puzzle', min: 1, max: 2, tag: 'Guess the word, letter by letter', play: 'hangman' },
  { id: 'wordscramble',name: 'Word Scramble', color: '#14b8a6', cat: 'puzzle', min: 1, max: 4, tag: 'Unscramble against the clock', play: 'wordscramble' },
  { id: 'wordsearch',  name: 'Word Search',  color: '#e11d48', cat: 'puzzle', min: 1, max: 1, tag: 'Find every hidden word', play: 'wordsearch' },

  // ── Party ────────────────────────────────────────────────────────────────
  { id: 'trivia',      name: 'Trivia',       color: '#f59e0b', cat: 'party', min: 1, max: 24, tag: 'Who knows the most?', play: 'trivia' },
  { id: 'wouldyourather', name: 'Would You Rather', color: '#ec4899', cat: 'party', min: 2, max: 0, tag: 'Tough choices, big debates', play: 'wouldyourather' },
  { id: 'applestoapples', name: 'Apples to Apples', color: '#e0303f', cat: 'party', min: 1, max: 24, tag: 'Match a red card to the green card', play: 'applestoapples' },
  { id: 'madlibs',     name: 'Mad Libs',     color: '#f43f5e', cat: 'party', min: 1, max: 0, tag: 'Fill the blanks, read it aloud', play: 'madlibs' },
  { id: 'riddlestories', name: 'Riddle Stories', color: '#6366f1', cat: 'party', min: 2, max: 0, tag: 'Solve the mystery with yes/no questions', play: 'riddlestories' },
  { id: 'conversation',name: 'Conversation Starters',   color: '#10b981', cat: 'party', min: 2, max: 0, tag: 'Questions that get everyone talking', play: 'conversation' },
  { id: 'minigolf',    name: 'Mini Golf',    color: '#16a34a', cat: 'party', min: 1, max: 6, tag: 'Scorecard for a real round', play: 'minigolf' },

  // ── Casino ───────────────────────────────────────────────────────────────
  { id: 'blackjack',   name: 'Blackjack',    color: '#059669', cat: 'casino', min: 1, max: 4, tag: 'Get closer to 21 than the dealer', play: 'blackjack' },
  { id: 'poker',       name: 'Poker',        color: '#dc2626', cat: 'casino', min: 1, max: 10, tag: "Hold'em, Omaha, Stud, Draw, home games and video poker, solo, on the circuit or online", play: 'poker' },
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
  { id: 'donkeykong',  name: 'Donkey Kong',  color: '#000', cat: 'arcade', min: 1, max: 1, tag: 'Climb the girders, jump the barrels, rescue Pauline', play: 'donkeykong' },
  { id: 'breakout',    name: 'Breakout',     color: '#f43f5e', cat: 'arcade', min: 1, max: 1, tag: 'Smash every brick', play: 'breakout' },
  { id: 'flappybird',  name: 'Flappy Bird',       color: '#38bdf8', cat: 'arcade', min: 1, max: 1, tag: 'Tap to fly through the pipes', play: 'flappybird' },
  { id: 'crossyroad',  name: 'Crossy Road',  color: '#84cc16', cat: 'arcade', min: 1, max: 1, tag: 'Hop across roads and rivers', play: 'crossyroad' },
  { id: 'willycrash',  name: 'Willy Crash',  color: '#ff6a3d', cat: 'arcade', min: 1, max: 1, tag: 'Blast the daredevil onto the rooftop', play: 'willycrash' },
  { id: 'crazytower',  name: 'Crazy Tower',  color: '#000', cat: 'arcade', min: 1, max: 4, tag: 'Drop the blocks, stack to the jackpot', play: 'crazytower' },
  { id: 'centipede',   name: 'Centipede', color: '#000', cat: 'arcade', min: 1, max: 3, tag: 'Blast the centipedes, beat the bosses, solo or online', play: 'centipede',
    launch: [
      { icon: 'gamepad', title: 'Play solo', desc: 'Ten waves and four bosses', file: 'centipede.html' },
      { icon: 'users', title: 'Play online', desc: '2 or 3 players, each on their own device', file: 'centipede.html?online=1' }
    ] },
  { id: 'invaders',    name: 'Space Invaders', color: '#2fd35a', cat: 'arcade', min: 1, max: 2, tag: 'Stop the invaders before they land', play: 'invaders' },
  { id: 'asteroids',   name: 'Asteroids',   color: '#6366f1', cat: 'arcade', min: 1, max: 1, tag: 'Blast rocks, stay alive', play: 'asteroids' },
  { id: 'peggle',      name: 'Peggle',       color: '#fb923c', cat: 'arcade', min: 1, max: 1, tag: 'Aim, bounce, clear the orange pegs', play: 'peggle' },
  { id: 'cubehopper',  name: 'Q*bert',       color: '#000', cat: 'arcade', min: 1, max: 1, tag: 'Hop the pyramid, change every cube', play: 'cubehopper' },
  { id: 'paddleball',  name: 'Pong',         color: '#000', cat: 'arcade', min: 1, max: 2, tag: 'Classic two-paddle table tennis', play: 'paddleball' },
  { id: 'pinball',     name: 'Pinball',      color: '#000', cat: 'arcade', min: 1, max: 1, tag: 'Six 3D tables: flip, ramp, lock, multiball', play: 'pinball' },
  { id: 'minesweeper', name: 'Minesweeper',  color: '#64748b', cat: 'arcade', min: 1, max: 1, tag: 'Clear the field without a boom', play: 'minesweeper' },
  { id: 'candymatch',  name: 'Candy Match',  color: '#ff4f9a', cat: 'arcade', min: 1, max: 1, tag: 'Swap candies, match three, beat the level', play: 'candymatch' },

  // ── Consoles: your own cartridges. The consoles' shelves have no tiles (Edit on the home screen opens them);
  // each game gets its own tile (addConsoleGames below) ──
  { id: 'nes',         name: 'NES',            color: '#000', cat: 'console', min: 1, max: 2, tag: 'Your own NES games on a shelf of cartridges', play: 'nes', shelf: true, hidden: true },
  { id: 'snes',        name: 'Super Nintendo', color: '#000', cat: 'console', min: 1, max: 4, tag: 'Your own Super Nintendo games', play: 'snes', shelf: true, hidden: true },
  { id: 'genesis',     name: 'Sega Genesis',   color: '#000', cat: 'console', min: 1, max: 4, tag: 'Your own Genesis games', play: 'genesis', shelf: true, hidden: true },
  { id: 'atari2600',   name: 'Atari 2600',     color: '#000', cat: 'console', min: 1, max: 2, tag: 'Your own Atari 2600 games', play: 'atari2600', shelf: true, hidden: true },

  // ── Tools ────────────────────────────────────────────────────────────────
  { id: 'scorecard',   name: 'Scorecard',    color: '#0ea5e9', cat: 'tools', min: 1, max: 8, tag: 'Keep score for any game', play: 'scorecard' },
  { id: 'dice-roller', name: 'Dice Roller',  color: '#f97316', cat: 'tools', min: 1, max: 0, tag: 'Any dice, any number', play: 'dice-roller' },
  { id: 'randomtools', name: 'Random Tools',      color: '#14b8a6', cat: 'tools', min: 1, max: 0, tag: 'Random numbers, coin flips, teams', play: 'randomtools' },
  { id: 'bingo',       name: 'Bingo Caller', color: '#e11d48', cat: 'tools', min: 1, max: 0, tag: 'Draw balls and call BINGO', play: 'bingo' },
  { id: 'ranker',      name: 'Ranker',       color: '#eab308', cat: 'tools', min: 1, max: 0, tag: 'Rank anything, settle debates', play: 'ranker' },
  { id: 'players',     name: 'Frequent Players',      color: '#6366f1', cat: 'tools', min: 1, max: 0, tag: 'The names you play with most', play: 'players' },
  { id: 'history',     name: 'Game History',          color: '#0ea5a4', cat: 'tools', min: 1, max: 0, tag: 'Every game you’ve finished', play: 'history' },
  { id: 'hiscores',    name: 'High Scores',           color: '#f5c842', cat: 'tools', min: 1, max: 0, tag: 'Top 50 for every arcade and puzzle game', play: 'hiscores' }
];

// Console games: the house games and each game file you've added (console-lib.js keeps the list in gn_console_idx)
// get their own cartridge tile,
// opening straight into its console. gn_console_vis {id: 0} hides a game from the home screen.
function addConsoleGames() {
  for (var i = GAMES.length - 1; i >= 0; i--) if (GAMES[i].cart) GAMES.splice(i, 1);
  var idx = [], vis = {}, SYS = { nes: 'NES', snes: 'Super Nintendo', genesis: 'Sega Genesis', atari2600: 'Atari 2600' };
  try { idx = JSON.parse(localStorage.getItem('gn_console_idx') || '[]') || []; vis = JSON.parse(localStorage.getItem('gn_console_vis') || '{}') || {}; } catch (e) {}
  var pin = !!(window.FGHSync && FGHSync.isPin && FGHSync.isPin());
  idx.forEach(function (c) {
    if (!c || !SYS[c.sys] || !/^[0-9a-f]+$/.test(c.id) || (c.h && !pin)) return;   // (the house games: signed in only)
    GAMES.push({ id: 'cart-' + c.id.slice(0, 16), name: c.name, color: '#000', cat: 'console', min: 1, max: 1, tag: SYS[c.sys] + ' game', play: c.sys + '.html?play=' + c.id,
      mark: c.sys, cart: c.id, sys: c.sys, art: c.art || null, hidden: vis[c.id] === 0 });
  });
}
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
      add('mathpuzzles', 'mathpuzzles_' + l[0] + '_' + s, { label: (l[0] === 'seq' ? '' : 'Grades ') + l[1] + ' · ' + (s / 60) + ' min', tab: l[1] + ' · ' + (s / 60) + 'm', unit: 'points' });
    });
  });
  add('candymatch', 'candymatch', { label: '', unit: 'score' });
  // Trivia Countdown (solo): one board per level and game length
  [['easy', 'Elementary'], ['medium', 'General'], ['hard', 'Genius']].forEach(function (l) {
    [10, 15, 20].forEach(function (n) { add('trivia', 'trivia_cd_' + l[0] + '_' + n, { label: l[1] + ' · ' + n + ' questions', tab: l[1] + ' ' + n, unit: 'points' }); });
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
