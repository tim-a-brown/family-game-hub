// ═══════════════════════════════════════════════════════════════════════════
// Game icons: flat badges built from two layers.
//   1. A base shape for the game's category (playing card, game board, die,
//      jigsaw piece, letter tile, speech bubble, poker chip, arcade screen,
//      clipboard) drawn in white on a tile of the game's colour.
//   2. A small mark for the game itself, drawn inside the base.
// GameIcon(id) returns an <svg> string. Marks are authored on a 24×24 grid.
// ═══════════════════════════════════════════════════════════════════════════
var GameIcon = (function () {
  var K = '#231a47', W = '#ffffff', R = '#e5263f', Y = '#ffc22e', G = '#22b866', B = '#2f7dff',
      O = '#ff7a29', P = '#8b55ff', S = '#a9a3c2', CREAM = '#fff6e2';
  var uid = 0;

  function txt(t, size, fill, y, x) {
    return '<text x="' + (x || 12) + '" y="' + (y || 12) + '" text-anchor="middle" dominant-baseline="central" ' +
      'font-family="Lilita One, ui-rounded, system-ui, sans-serif" font-size="' + size + '" fill="' + fill + '">' + t + '</text>';
  }
  function circ(x, y, r, f, extra) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + (extra || '') + '/>'; }
  function rect(x, y, w, h, rx, f, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + f + '"' + (extra || '') + '/>'; }
  function path(d, f, extra) { return '<path d="' + d + '" fill="' + (f || 'none') + '"' + (extra || '') + '/>'; }
  function line(d, c, w) { return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }

  var HEART = 'M12 21s-8.5-5.3-8.5-11.2A4.6 4.6 0 0 1 12 7.1a4.6 4.6 0 0 1 8.5 2.7C20.5 15.7 12 21 12 21z';
  var SPADE = 'M12 2.5s-8.2 6.4-8.2 11a4.1 4.1 0 0 0 7.1 2.8c-.2 1.8-.9 3.4-2.3 5.2h6.8c-1.4-1.8-2.1-3.4-2.3-5.2a4.1 4.1 0 0 0 7.1-2.8c0-4.6-8.2-11-8.2-11z';

  // ── Category bases: [svg for the base, transform that places the 24×24 mark]
  var BASE = {
    cards: function () {
      return [rect(16, 8, 21, 30, 3.5, W, ' opacity=".45" transform="rotate(12 26 24)"') +
              rect(11, 8.5, 22, 31, 3.5, W, ' transform="rotate(-7 22 24)"'),
              'rotate(-7 22 24) translate(12.4 14.4) scale(.8)'];
    },
    board: function () {
      return [rect(8, 8, 32, 32, 6, W) + rect(8, 8, 16, 16, 0, K, ' opacity=".05"') + rect(24, 24, 16, 16, 0, K, ' opacity=".05"') +
              rect(8, 8, 32, 32, 6, 'none', ' stroke="' + K + '" stroke-opacity=".12" stroke-width="1.5"'),
              'translate(12 12)'];
    },
    dice: function () {
      return [rect(9, 11, 30, 30, 8, K, ' opacity=".22"') + rect(9, 8.5, 30, 30, 8, W), 'translate(12.5 11.5) scale(.96)'];
    },
    puzzle: function () {
      return [rect(9, 12, 26, 26, 5, W) + circ(22, 12, 4.6, W) + circ(35, 25, 4.6, W), 'translate(11 14) scale(.92)'];
    },
    words: function () {
      return [rect(9, 10, 30, 30, 5, '#e2c995') + rect(9, 8, 30, 29, 5, CREAM), 'translate(12 10.5)'];
    },
    party: function () {
      return [path('M13 8h22a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H22l-7.5 6.5V33H13a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z', W), 'translate(14 10.5) scale(.83)'];
    },
    casino: function (c) {
      var notches = '';
      for (var i = 0; i < 8; i++) notches += rect(22.2, 6.6, 3.6, 5.5, 1, c, ' transform="rotate(' + (i * 45) + ' 24 24)"');
      return [circ(24, 24, 17.5, W) + notches + circ(24, 24, 11, W, ' stroke="' + c + '" stroke-width="1.6" stroke-dasharray="2.5 2.5"'), 'translate(15 15) scale(.75)'];
    },
    arcade: function () {
      return [rect(7, 8, 34, 28, 6, W) + rect(10, 11, 28, 22, 3, K) + rect(19, 36, 10, 4, 1.5, W), 'translate(14 12) scale(.83)'];
    },
    tools: function () {
      return [rect(11, 10, 26, 31, 4, W) + rect(18, 7, 12, 6, 2, K, ' opacity=".55"'), 'translate(13 15.5) scale(.92)'];
    }
  };

  // ── Game marks (24×24). c = the game's colour.
  var MARK = {
    // Cards
    hearts: function () { return path(HEART, R); },
    spades: function () { return path(SPADE, K); },
    euchre: function (c) { return txt('J', 19, c, 11) + path('M12 17.5l2 2.5-2 2.5-2-2.5z', R); },
    cribbage: function (c) {
      var h = ''; for (var i = 0; i < 5; i++) h += circ(5 + i * 3.5, 14, .9, K, ' opacity=".35"');
      return rect(2, 10.5, 20, 7, 3.5, c) + h + rect(7.2, 5, 2.4, 9.5, 1.2, R) + rect(14.2, 6.5, 2.4, 8, 1.2, B);
    },
    'gin-rummy': function (c) { return rect(3, 6, 9, 13, 1.8, c, ' transform="rotate(-14 7 12)"') + rect(8, 5, 9, 13, 1.8, K) + rect(13, 6, 9, 13, 1.8, R, ' transform="rotate(14 17 12)"'); },
    wizard: function () { return path('M12 2 6.5 17h11z', P) + rect(3, 16.5, 18, 3.6, 1.8, P) + path('M12.5 8.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z', Y); },
    flip7: function (c) { return txt('7', 24, c, 12.5); },
    'five-crowns': function () { return path('M3 18 2 7l5.5 4.5L12 4l4.5 7.5L22 7l-1 11z', Y, ' stroke="' + K + '" stroke-width="1.2" stroke-linejoin="round"') + rect(3, 18, 18, 3, 1, Y, ' stroke="' + K + '" stroke-width="1.2"'); },
    rook: function () { return path('M5 15c0-4 3-7.5 7.5-7.5 1.4 0 2.5-1.6 4.2-1.6 1.6 0 2.8 1.3 2.8 2.9l2.5 1-2.6 1C19 15.5 15.5 19 11 19H4l2.5-2.2z', K) + circ(16.8, 8.4, .9, W); },
    phase10: function (c) { return txt('10', 18, c, 12.5); },
    solitaire: function () { return txt('A', 18, K, 9.5) + path('M12 14s-3.6 2.8-3.6 4.8a1.8 1.8 0 0 0 3.1 1.2l-.9 2.3h2.8l-.9-2.3a1.8 1.8 0 0 0 3.1-1.2C15.6 16.8 12 14 12 14z', K); },
    freecell: function (c) { return rect(2, 3, 9, 8, 2, 'none', ' stroke="' + c + '" stroke-width="2"') + rect(13, 3, 9, 8, 2, c) + rect(2, 13, 9, 8, 2, c) + rect(13, 13, 9, 8, 2, 'none', ' stroke="' + c + '" stroke-width="2"'); },
    pyramid: function (c) { return rect(9, 2, 6, 6, 1.2, c) + rect(5.5, 9, 6, 6, 1.2, c) + rect(12.5, 9, 6, 6, 1.2, R) + rect(2, 16, 6, 6, 1.2, R) + rect(9, 16, 6, 6, 1.2, c) + rect(16, 16, 6, 6, 1.2, c); },
    pokersquares: function (c) { var s = ''; for (var i = 0; i < 9; i++) s += rect(2 + (i % 3) * 7, 2 + Math.floor(i / 3) * 7, 6, 6, 1.4, i % 2 ? R : c); return s; },
    lorcana: function () { return path('M12 1.5c.8 5.7 3.8 8.7 9.5 9.5-5.7.8-8.7 3.8-9.5 9.5-.8-5.7-3.8-8.7-9.5-9.5 5.7-.8 8.7-3.8 9.5-9.5z', P) + path('M19.5 15.5c.3 2 1.2 3 3 3.2-1.8.3-2.7 1.2-3 3.2-.3-2-1.2-2.9-3-3.2 1.8-.2 2.7-1.2 3-3.2z', Y); },

    // Board
    chess: function () { return path('M12 2.5a3 3 0 0 0-1.7 5.5C8.6 9 7.8 10.6 7.8 12h8.4c0-1.4-.8-3-2.5-4A3 3 0 0 0 12 2.5zM9.2 13l-1.2 5.5h8l-1.2-5.5zM5.5 19.5h13v2.8h-13z', K); },
    checkers: function () { return '<ellipse cx="12" cy="16" rx="9" ry="4.2" fill="#a51428"/>' + rect(3, 11, 18, 5, 0, '#a51428') + '<ellipse cx="12" cy="11" rx="9" ry="4.2" fill="' + R + '"/>' + '<ellipse cx="12" cy="11" rx="5.5" ry="2.4" fill="none" stroke="#ff8b99" stroke-width="1.3"/>'; },
    connectfour: function () { var s = rect(1, 3, 22, 19, 3, B); var cols = [[0, R, Y], [Y, R, R], [R, Y, Y]]; for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) s += circ(5.5 + c * 6.5, 7.5 + r * 6, 2.4, cols[r][c] || '#173c8a'); return s; },
    tictactoe: function () { return line('M9 3v18M15 3v18M3 9h18M3 15h18', K, 1.6) + line('M3.8 3.8l3.4 3.4M7.2 3.8 3.8 7.2', R, 2.2) + circ(18, 18, 2.4, 'none', ' stroke="' + B + '" stroke-width="2.2"') + line('M10.3 16.3l3.4 3.4M13.7 16.3l-3.4 3.4', R, 2.2); },
    othello: function () { return circ(8, 13, 7, K) + circ(16, 11, 7, W, ' stroke="' + K + '" stroke-width="1.8"'); },
    backgammon: function (c) { var t = ''; for (var i = 0; i < 4; i++) { var x = 1 + i * 5.6; t += path('M' + x + ' 1h5l-2.5 9.5z', i % 2 ? K : c) + path('M' + x + ' 23h5l-2.5-9.5z', i % 2 ? c : K); } return t + circ(9, 12, 2.2, R) + circ(15, 12, 2.2, W, ' stroke="' + K + '" stroke-width="1.2"'); },
    battleship: function () { return path('M2 13h20l-3 6H5z', K) + rect(8, 9, 8, 4, 1, S) + rect(11, 5.5, 2, 4, .6, K) + line('M2 21.5c2 0 2-1.2 4-1.2s2 1.2 4 1.2 2-1.2 4-1.2 2 1.2 4 1.2 2-1.2 4-1.2', B, 1.6); },
    dotsboxes: function (c) { var s = rect(4, 4, 8, 8, 0, c, ' opacity=".55"') + line('M4 4h16M4 4v16M4 12h8M12 4v8', c, 2.2); for (var i = 0; i < 9; i++) s += circ(4 + (i % 3) * 8, 4 + Math.floor(i / 3) * 8, 1.8, K); return s; },
    mancala: function (c) { var s = rect(1, 6, 22, 12, 6, c); for (var i = 0; i < 3; i++) { s += circ(7.5 + i * 4.5, 9.8, 1.7, '#00000040') + circ(7.5 + i * 4.5, 14.2, 1.7, '#00000040'); } return s + '<ellipse cx="3.6" cy="12" rx="1.6" ry="3.6" fill="#00000040"/><ellipse cx="20.4" cy="12" rx="1.6" ry="3.6" fill="#00000040"/>' + circ(7.5, 9.8, .9, Y) + circ(12, 14.2, .9, G) + circ(16.5, 9.8, .9, B); },
    mahjong4: function () { return rect(4, 1.5, 16, 21, 2.5, CREAM, ' stroke="' + K + '" stroke-width="1.4"') + txt('中', 13, R, 12.5); },

    // Dice & luck
    yahtzee: function () { return circ(6, 6, 2.4, K) + circ(18, 6, 2.4, K) + circ(12, 12, 2.4, R) + circ(6, 18, 2.4, K) + circ(18, 18, 2.4, K); },
    plinko: function (c) { var s = ''; [[12, 5], [8, 10], [16, 10], [4, 15], [12, 15], [20, 15]].forEach(function (p) { s += circ(p[0], p[1], 1.5, K); }); return s + circ(14, 7.7, 2.6, c) + rect(2, 19.5, 20, 2.5, 1, c, ' opacity=".5"'); },
    wheeloffortune: function () {
      var cols = [R, Y, B, G, P, O], s = '';
      for (var i = 0; i < 6; i++) {
        var a1 = i * Math.PI / 3, a2 = (i + 1) * Math.PI / 3;
        s += path('M12 12L' + (12 + 10 * Math.cos(a1)).toFixed(2) + ' ' + (12 + 10 * Math.sin(a1)).toFixed(2) + 'A10 10 0 0 1 ' + (12 + 10 * Math.cos(a2)).toFixed(2) + ' ' + (12 + 10 * Math.sin(a2)).toFixed(2) + 'z', cols[i]);
      }
      return s + circ(12, 12, 2.6, W) + path('M12 0l2.4 3.6h-4.8z', K);
    },
    dealornodeal: function (c) { return path('M8.5 7V5.2A1.7 1.7 0 0 1 10.2 3.5h3.6a1.7 1.7 0 0 1 1.7 1.7V7', 'none', ' stroke="' + K + '" stroke-width="2"') + rect(2, 7, 20, 13.5, 2.5, c) + rect(2, 11.5, 20, 2.2, 0, K, ' opacity=".25"') + rect(10.4, 10.5, 3.2, 4.2, .8, Y); },
    shellgame: function (c) { return path('M1.5 16a4.2 4.2 0 0 1 8.4 0z', c) + path('M14.1 16a4.2 4.2 0 0 1 8.4 0z', c) + path('M7.8 12a4.2 4.2 0 0 1 8.4 0z', K) + circ(12, 15.6, 2.2, R) + rect(1, 17.5, 22, 1.6, .8, K, ' opacity=".2"'); },

    // Puzzles
    '2048': function (c) { return rect(1.5, 5, 21, 14, 3, c) + txt('2048', 8.6, W, 12.4); },
    sudoku: function (c) { return rect(2, 2, 20, 20, 2, 'none', ' stroke="' + K + '" stroke-width="1.8"') + line('M8.7 2v20M15.3 2v20M2 8.7h20M2 15.3h20', K, 1) + txt('9', 7.5, c, 5.6, 5.4) + txt('3', 7.5, c, 12, 12) + txt('7', 7.5, R, 18.6, 18.6); },
    minesweeper: function () { return line('M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7', K, 2.2) + circ(12, 12, 6.5, K) + circ(9.8, 9.8, 1.8, W); },
    memorymatch: function (c) { return rect(1.5, 4, 10, 15, 2, c) + rect(12.5, 4, 10, 15, 2, W, ' stroke="' + K + '" stroke-width="1.6"') + txt('?', 11, W, 11.5, 6.5) + path('M17.5 7.5l1.2 2.4 2.6.4-1.9 1.8.4 2.6-2.3-1.2-2.3 1.2.4-2.6-1.9-1.8 2.6-.4z', Y); },
    mahjong: function () { return rect(6, 1.5, 15, 19, 2.5, '#d9cba6') + rect(3, 3.5, 15, 19, 2.5, CREAM, ' stroke="' + K + '" stroke-width="1.3"') + line('M8 8v10M10.5 8v10M13 8v10', G, 1.8) + line('M7 12.5h7.5', G, 1.2); },
    mathpuzzles: function (c) { return line('M6.5 3v7M3 6.5h7', c, 2.4) + line('M15 4l5 5M20 4l-5 5', R, 2.4) + line('M3 17.5h7', K, 2.4) + line('M14 17.5h7', B, 2.4) + circ(17.5, 14.5, 1.2, B) + circ(17.5, 20.5, 1.2, B); },

    // Words (letter tile base)
    wordle: function () { return rect(1, 1, 10, 10, 2, G) + rect(13, 1, 10, 10, 2, Y) + rect(1, 13, 10, 10, 2, S) + rect(13, 13, 10, 10, 2, G) + txt('W', 7.5, W, 6.3, 6) + txt('O', 7.5, '#5a3b00', 6.3, 18) + txt('R', 7.5, W, 18.3, 6) + txt('D', 7.5, W, 18.3, 18); },
    spellingbee: function () { return path('M12 1.5l9 5.2v10.6l-9 5.2-9-5.2V6.7z', Y, ' stroke="#c78c00" stroke-width="1.2"') + txt('B', 12, K, 12.4); },
    crossword: function () { var s = ''; for (var i = 0; i < 9; i++) { var x = 2 + (i % 3) * 6.8, y = 2 + Math.floor(i / 3) * 6.8; s += rect(x, y, 6.8, 6.8, 0, (i === 2 || i === 6) ? K : W, ' stroke="' + K + '" stroke-width="1"'); } return s + txt('C', 5.5, B, 5.6, 5.5) + txt('A', 5.5, B, 12.4, 12.3) + txt('T', 5.5, B, 19.2, 19.1); },
    boggle: function () { var L = ['B', 'O', 'G', 'L'], s = ''; for (var i = 0; i < 4; i++) { var x = 1.5 + (i % 2) * 11, y = 1.5 + Math.floor(i / 2) * 11; s += rect(x, y, 10, 10, 2.4, i === 1 ? O : K) + txt(L[i], 7.5, W, y + 5.2, x + 5); } return s; },
    hangman: function () { return line('M3 22h10M6 22V2.5h9.5v3', K, 2) + circ(15.5, 8.5, 2.6, 'none', ' stroke="' + R + '" stroke-width="1.8"') + line('M15.5 11v5.5M12.5 13.5h6M15.5 16.5l-2.5 3.5M15.5 16.5l2.5 3.5', R, 1.8); },
    wordscramble: function (c) { return txt('A', 9, K, 7, 5) + txt('B', 9, c, 6, 12) + txt('C', 9, K, 7, 19) + path('M4 15.5c2.5 5 13.5 5 16 0', 'none', ' stroke="' + c + '" stroke-width="2" stroke-linecap="round"') + path('M20.5 12.5l.3 4.2-4 .3', 'none', ' stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'); },
    wordsearch: function (c) { var s = '<rect x="0" y="9" width="27" height="6" rx="3" fill="' + c + '" opacity=".45" transform="rotate(-45 12 12)"/>'; var L = 'WQEXRZOTD'; for (var i = 0; i < 9; i++) s += txt(L[i], 6, K, 4 + Math.floor(i / 3) * 8, 4 + (i % 3) * 8); return s; },

    // Party (speech bubble base)
    trivia: function (c) { return txt('?', 24, c, 12.5); },
    wouldyourather: function (c) { return txt('A', 15, c, 12.5, 6) + line('M12 4v16', K, 1.5) + txt('B', 15, P, 12.5, 18); },
    madlibs: function (c) { return line('M3 6h18M3 12h7M3 18h12', K, 2) + line('M12.5 12.5h8', c, 2.6) + path('M16.5 21.5l1-3.4 4.6-4.6a1.5 1.5 0 0 1 2.1 2.1l-4.6 4.6z', O); },
    riddlestories: function (c) { return circ(10, 10, 6.5, 'none', ' stroke="' + K + '" stroke-width="2.4"') + line('M15 15l6.5 6.5', K, 3) + txt('?', 9, c, 10.3, 10); },
    conversation: function (c) { return circ(5, 12, 2.6, c) + circ(12, 12, 2.6, c) + circ(19, 12, 2.6, c); },
    minigolf: function () { return '<ellipse cx="12" cy="20.5" rx="8" ry="2.5" fill="' + K + '" opacity=".25"/>' + line('M10 20V2.5', K, 1.8) + path('M10.8 2.5l9 3.5-9 3.5z', R) + circ(16, 19.5, 1.9, W, ' stroke="' + K + '" stroke-width="1"'); },

    // Casino (chip base)
    blackjack: function (c) { return txt('21', 15, c, 12.5); },
    poker: function () { return path(SPADE, K); },
    roulette: function () { var s = ''; for (var i = 0; i < 10; i++) { var a1 = i * Math.PI / 5, a2 = (i + 1) * Math.PI / 5; s += path('M12 12L' + (12 + 10 * Math.cos(a1)).toFixed(2) + ' ' + (12 + 10 * Math.sin(a1)).toFixed(2) + 'A10 10 0 0 1 ' + (12 + 10 * Math.cos(a2)).toFixed(2) + ' ' + (12 + 10 * Math.sin(a2)).toFixed(2) + 'z', i % 2 ? K : R); } return s + circ(12, 12, 4, '#1d7a4a') + circ(12, 12, 1.5, Y); },
    slots: function () { return txt('7', 22, R, 12.5); },
    craps: function () { return rect(1.5, 6, 11, 11, 2.5, R, ' transform="rotate(-12 7 11.5)"') + circ(4.6, 9.4, 1.1, W) + circ(7, 11.6, 1.1, W) + circ(9.4, 13.8, 1.1, W) + rect(11.5, 7, 11, 11, 2.5, K, ' transform="rotate(10 17 12.5)"') + circ(15, 10.4, 1.1, W) + circ(19.2, 14.6, 1.1, W); },
    baccarat: function (c) { return txt('9', 22, c, 12.5); },
    threecardpoker: function (c) { return rect(2, 5, 9, 14, 1.8, c, ' transform="rotate(-16 6 12)"') + rect(7.5, 4, 9, 14, 1.8, K) + rect(13, 5, 9, 14, 1.8, R, ' transform="rotate(16 17 12)"'); },
    paigow: function (c) { return rect(1.5, 4, 11, 16, 2, W, ' stroke="' + K + '" stroke-width="1.4" transform="rotate(-10 7 12)"') + txt('A', 9, R, 11.5, 6.5) + rect(11.5, 4, 11, 16, 2, W, ' stroke="' + K + '" stroke-width="1.4" transform="rotate(10 17 12)"') + txt('K', 9, K, 12.5, 17.3); },

    // Arcade (screen base; bright marks)
    tetris: function () { var q = function (x, y, c) { return rect(x, y, 4.6, 4.6, 1, c); }; return q(4, 2, P) + q(9, 2, P) + q(14, 2, P) + q(9, 7, P) + q(4, 13, O) + q(4, 18, O) + q(9, 18, O) + q(14, 13, Y) + q(19, 13, Y) + q(14, 18, Y) + q(19, 18, Y); },
    snake: function () { return rect(2, 15, 4, 4, 1, '#3ddc84') + rect(6, 15, 4, 4, 1, '#3ddc84') + rect(10, 15, 4, 4, 1, '#3ddc84') + rect(10, 11, 4, 4, 1, '#3ddc84') + rect(10, 7, 4, 4, 1, '#3ddc84') + rect(14, 7, 4, 4, 1, '#7dffb3') + circ(19.5, 17, 2.4, R); },
    pacman: function () { return path('M12 12 20 7.5A9 9 0 1 0 20 16.5z', Y, ' transform="translate(-4 0)"') + circ(18, 12, 1.4, W) + circ(22.5, 12, 1.4, W); },
    breakout: function () { return rect(1, 2, 7, 3, .8, R) + rect(8.5, 2, 7, 3, .8, O) + rect(16, 2, 7, 3, .8, Y) + rect(1, 6, 7, 3, .8, O) + rect(16, 6, 7, 3, .8, '#3ddc84') + circ(13, 14, 1.8, W) + rect(7, 20, 10, 2.4, 1.2, '#7aa8ff'); },
    flappybird: function () { return rect(17, 0, 5, 7, 1, '#3ddc84') + rect(17, 15, 5, 9, 1, '#3ddc84') + circ(9, 12, 5.5, Y) + circ(11, 10.4, 1.6, W) + circ(11.5, 10.4, .8, K) + path('M13.5 12.5h4l-2 2z', O) + '<ellipse cx="7" cy="13.5" rx="3" ry="1.8" fill="#ffe08a"/>'; },
    asteroids: function () { return path('M7 20 12 4l5 16-5-3.5z', 'none', ' stroke="' + W + '" stroke-width="1.8" stroke-linejoin="round"') + path('M18 2.5l3.5 1.5.5 3.5-3 2-3-1.5-.5-3z', S) + path('M2 9l2.5-.5 1.5 2-1 2.5-2.5-.5z', S); },
    peggle: function () { return circ(5, 15, 2.2, O) + circ(11, 18.5, 2.2, '#7aa8ff') + circ(17, 15, 2.2, O) + circ(20.5, 20, 2.2, O) + circ(3.5, 20.5, 2.2, '#7aa8ff') + line('M12 1.5c0 4 .5 6.5 2.5 9', W, 1.4) + circ(14.8, 11, 1.8, W); },

    // Tools (clipboard base)
    scorecard: function (c) { return line('M3 4h8M3 10h8M3 16h8', K, 1.8) + line('M14 2.5v5M16.5 2.5v5M19 2.5v5M21.5 2.5v5M13 7l9.5-4', c, 1.6) + txt('12', 8, c, 13, 17.5) + txt('7', 8, c, 19, 17.5); },
    'dice-roller': function (c) { return path('M12 1.5 21.5 7v10L12 22.5 2.5 17V7z', c) + path('M12 1.5 21.5 7 12 9.5 2.5 7z', W, ' opacity=".35"') + txt('20', 8, W, 15); },
    randomtools: function (c) { return path('M2 17h2.5c1.6 0 3-.8 4-2.1l5-7c1-1.3 2.4-2.1 4-2.1H21', 'none', ' stroke="' + c + '" stroke-width="2.4" stroke-linecap="round"') + path('M18 3l3 2.8-3 2.8', 'none', ' stroke="' + c + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"') + path('M2 7h2.5c1.6 0 3 .8 4 2.1M21 17h-3.5c-1.6 0-3-.8-4-2.1', 'none', ' stroke="' + K + '" stroke-width="2.4" stroke-linecap="round"') + path('M18 14.2l3 2.8-3 2.8', 'none', ' stroke="' + K + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'); },
    bingo: function (c) { return circ(12, 12, 10, c) + circ(12, 12, 6, W) + txt('B', 9, K, 12.6); },
    ranker: function (c) { return rect(8.5, 6, 7, 16, 1.2, Y) + rect(1.5, 11, 7, 11, 1.2, S) + rect(15.5, 14, 7, 8, 1.2, O) + txt('1', 7, K, 10, 12); },
    players: function (c) { return circ(8, 7.5, 3.6, K) + path('M1.5 21c0-4 2.9-7 6.5-7s6.5 3 6.5 7z', K) + circ(16.5, 9, 3.2, c) + path('M10.5 21.5c.3-3.6 2.8-6 6-6s5.8 2.4 6 6z', c); }
  };

  function lighten(hex, amt) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt)); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  return function (id, opts) {
    opts = opts || {};
    var g = (typeof findGame === 'function' && findGame(id)) || { id: id, cat: 'tools', color: '#8b55ff' };
    var c = g.color, gid = 'gi' + (++uid);
    var base = (BASE[g.cat] || BASE.tools)(c);
    var mark = MARK[g.id] ? MARK[g.id](c) : txt(g.name.charAt(0), 18, c, 12.5);
    return '<svg class="gicon' + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="0 0 48 48" role="img" aria-label="' + g.name + '">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + lighten(c, .18) + '"/><stop offset="1" stop-color="' + lighten(c, -.18) + '"/></linearGradient></defs>' +
      '<rect width="48" height="48" rx="13" fill="url(#' + gid + ')"/>' +
      '<rect x="1" y="1" width="46" height="46" rx="12" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>' +
      base[0] + '<g transform="' + base[1] + '">' + mark + '</g></svg>';
  };
})();
