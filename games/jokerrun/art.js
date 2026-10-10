// ═══════════════════════════════════════════════════════════════════════════
// Balatro (Joker Run) art: original vector motifs drawn into tiny canvases and
// shown with image-rendering: pixelated, for a crisp pixel-art look.
//   JRArt.ready -> Promise (all art drawn)     JRArt.url(key) -> data URL
//   keys: 'j:<joker>' 'c:<consumable>' 'v:<voucher>' 'p:<pack>' 't:<tag>'
//         'b:<boss>' 'f:<rank><suit>' (face cards) 'back:<deck>'
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var E = window.JRE;
  function heart(x, y, s, cls) { return '<path class="' + cls + '" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 7C-9 0-7-8 0-4C7-8 9 0 0 7z"/>'; }
  var ART = {
    grin: '<path class="k" d="M7 17 13 5l7 8 7-8 6 12z"/><circle class="k" cx="13" cy="5" r="2.2"/><circle class="k" cx="27" cy="5" r="2.2"/><circle class="a" cx="20" cy="26" r="10"/><circle class="d" cx="16.5" cy="23.5" r="1.6"/><circle class="d" cx="23.5" cy="23.5" r="1.6"/><path class="dl" d="M15 28q5 5 10 0"/>',
    rose: '<path class="l" d="M20 22v15M20 31l-6-4M20 34l5-3"/><circle class="k" cx="20" cy="8" r="5"/><circle class="k" cx="26.5" cy="12.5" r="5"/><circle class="k" cx="24" cy="20" r="5"/><circle class="k" cx="16" cy="20" r="5"/><circle class="k" cx="13.5" cy="12.5" r="5"/><circle class="a" cx="20" cy="14.5" r="3.6"/>',
    gem: '<path class="a" d="M8 15l6-8h12l6 8-12 19z"/><path class="k" d="M8 15h24L20 34z"/><path class="dl" d="M14 7l3 8 3-8 3 8 3-8M8 15h24M17 15l3 19 3-19"/>',
    owl: '<path class="k" d="M10 13l2-8 5 4h6l5-4 2 8v11a10 10 0 0 1-20 0z"/><circle class="a" cx="15.5" cy="17" r="4.6"/><circle class="a" cx="24.5" cy="17" r="4.6"/><circle class="d" cx="15.5" cy="17" r="2.1"/><circle class="d" cx="24.5" cy="17" r="2.1"/><path class="a" d="M18.3 22h3.4L20 25.5z"/><path class="l" d="M12 36h16"/>',
    clover: '<circle class="k" cx="20" cy="10" r="5.5"/><circle class="k" cx="20" cy="22" r="5.5"/><circle class="k" cx="14" cy="16" r="5.5"/><circle class="k" cx="26" cy="16" r="5.5"/><circle class="a" cx="20" cy="16" r="2.4"/><path class="l" d="M20 25q1 7 6 11"/>',
    sock: '<path class="a" d="M6 3h9v15l-5 7a3.6 3.6 0 0 1-5.6-4.4L6 18z"/><path class="k" d="M6 3h9v4H6z"/><path class="k" d="M22 10h9v15l-5 7a3.6 3.6 0 0 1-5.6-4.4L22 25z"/><path class="a" d="M22 10h9v4h-9z"/>',
    scoop: '<path class="k" d="M12 21h16l-8 17z"/><path class="dl" d="M15 24l8 7M25 24l-8 7"/><circle class="a" cx="20" cy="8" r="5.2"/><circle class="a" cx="14.5" cy="16" r="5.2"/><circle class="k" cx="25.5" cy="16" r="5.2" style="opacity:.75"/>',
    steps: '<ellipse class="a" cx="13" cy="25" rx="4.6" ry="7.5"/><ellipse class="k" cx="27" cy="15" rx="4.6" ry="7.5"/><circle class="a" cx="10" cy="15" r="1.6"/><circle class="a" cx="13.5" cy="14" r="1.6"/><circle class="a" cx="17" cy="15.5" r="1.6"/><circle class="k" cx="24" cy="5" r="1.6"/><circle class="k" cx="27.5" cy="4" r="1.6"/><circle class="k" cx="31" cy="5.5" r="1.6"/>',
    ladder: '<path class="l" d="M12 3v34M28 3v34"/><path class="kl" d="M12 9h16M12 17h16M12 25h16M12 33h16"/>',
    bucket: '<path class="l" d="M9 14q11-13 22 0"/><path class="a" d="M9 14h22l-3 21H12z"/><path class="k" d="M9 14h22l-.7 5H9.7z"/><path class="k" d="M26 19q3 7 0 10q-3-3 0-10z"/>',
    mitten: '<path class="a" d="M5 33V17a5.5 5.5 0 0 1 11 0v5l2-2.6a2.3 2.3 0 0 1 3.7 2.8L16 30v3z"/><path class="k" d="M5 29h11v5H5z"/><path class="k" d="M20 30V14a5.5 5.5 0 0 1 11 0v5l2-2.6a2.3 2.3 0 0 1 3.7 2.8L31 27v3z" style="opacity:.9"/><path class="a" d="M20 26h11v5H20z"/>',
    stack: '<ellipse class="k" cx="20" cy="32" rx="12" ry="4"/><ellipse class="a" cx="20" cy="27" rx="12" ry="4"/><ellipse class="k" cx="20" cy="22" rx="12" ry="4"/><ellipse class="a" cx="20" cy="17" rx="12" ry="4"/><ellipse class="k" cx="20" cy="12" rx="12" ry="4"/><ellipse class="dl" cx="20" cy="12" rx="6" ry="2"/>',
    bridge: '<path class="l" d="M3 31q17-24 34 0M3 31h34"/><path class="kl" d="M9 23v8M14.5 17.5v13.5M20 16v15M25.5 17.5v13.5M31 23v8"/>',
    wheel: '<path fill="#ff5c7a" d="M20 20V6a14 14 0 0 1 14 14z"/><path fill="#ffcf4a" d="M20 20h14a14 14 0 0 1-14 14z"/><path fill="#5fe08f" d="M20 20v14A14 14 0 0 1 6 20z"/><path fill="#5fb0ff" d="M20 20H6A14 14 0 0 1 20 6z"/><circle class="l" cx="20" cy="20" r="14"/><circle class="a" cx="20" cy="20" r="3"/>',
    wallet: '<circle class="k" cx="15" cy="9" r="5.5"/><rect class="a" x="5" y="13" width="30" height="21" rx="4"/><rect class="k" x="22" y="19" width="13" height="9" rx="3"/><circle class="a" cx="27" cy="23.5" r="1.8"/>',
    fish: '<path class="k" d="M5 20q11-12 23 0q-12 12-23 0z"/><path class="k" d="M27 20l9-7v14z"/><circle class="a" cx="11" cy="18.5" r="2"/><circle class="l" cx="9" cy="7" r="2"/><circle class="l" cx="14" cy="4" r="1.3"/>',
    frame: '<rect class="l" x="6" y="5" width="28" height="30" rx="2"/><rect class="dl" x="10" y="9" width="20" height="22"/><path class="k" d="M12 26l2-11 4.3 5.3L20 13l1.7 7.3L26 15l2 11z"/>',
    ace: '<path class="a" d="M20 4c5 7 13 11 13 18a6 6 0 0 1-11 3l2 9h-8l2-9a6 6 0 0 1-11-3c0-7 8-11 13-18z"/><text class="kt" x="20" y="25" text-anchor="middle">A</text>',
    duck: '<path class="a" d="M6 23q0 11 13 11h7q9 0 9-9q-5 3-10 1q3-3 3-9a7 7 0 0 0-14 0q0 5 3.5 7Q11 24 6 23z"/><path class="k" d="M27 11.5l7 2.5-7 2.5z"/><circle class="d" cx="22.5" cy="13" r="1.5"/><path class="dl" d="M14 27q5 3 10 0"/>',
    boat: '<path class="a" d="M19 3v24H7z"/><path class="k" d="M22 8v19h11z"/><path class="k" d="M4 29h32l-6 7H10z"/><path class="l" d="M2 38q4-2 8 0t8 0t8 0t8 0" style="stroke-width:1.6"/>',
    feather: '<path class="a" d="M31 4Q7 9 9 33q19-5 22-29z"/><path class="dl" d="M8 36L26 9M17 24l-5-1M21 18l-5-1M24 13l-4-1"/>',
    hourglass: '<path class="l" d="M9 4h22M9 36h22"/><path class="a" d="M11 5h18q0 9-9 15q-9-6-9-15zM11 35h18q0-9-9-15q-9 6-9 15z"/><path class="k" d="M14 34h12l-6-7z"/><path class="k" d="M16 9h8l-4 6z"/>',
    pig: '<path class="k" d="M10 14l2-8 6 5zM30 14l-2-8-6 5z"/><circle class="k" cx="20" cy="22" r="12.5"/><ellipse class="a" cx="20" cy="26" rx="5.5" ry="4"/><circle class="d" cx="18" cy="26" r="1.1"/><circle class="d" cx="22" cy="26" r="1.1"/><circle class="d" cx="14.5" cy="19" r="1.5"/><circle class="d" cx="25.5" cy="19" r="1.5"/><rect class="d" x="16" y="11" width="8" height="2.2" rx="1.1"/>',
    coin: '<circle class="k" cx="20" cy="20" r="14"/><circle class="l" cx="20" cy="20" r="10"/><text class="at" x="20" y="24.5" text-anchor="middle">1</text>',
    cookie: '<path class="k" d="M5 25q15-22 30 0q-7 6-15 0q-8 6-15 0z"/><path class="a" d="M12 21l20-10 2 4.5-20 10z"/><path class="dl" d="M17 19l9-4.5"/>',
    worm: '<circle class="k" cx="33" cy="17" r="7" style="opacity:.3"/><path class="kl" style="stroke-width:5" d="M5 30q5-11 10 0t10 0t8-12"/><circle class="a" cx="33" cy="17" r="3"/>',
    bird: '<circle class="k" cx="27" cy="13" r="7.5"/><path class="l" d="M5 26q4-5 8 0q4-5 8 0"/><path class="l" d="M3 35h34"/>',
    rope: '<path class="l" d="M2 27h36"/><circle class="a" cx="20" cy="8" r="3.2"/><path class="l" d="M20 11.5v8.5M20 20l-3.5 6.5M20 20l3.5 6.5M11 15h18"/><circle class="k" cx="10" cy="15" r="2.2"/><circle class="k" cx="30" cy="15" r="2.2"/>',
    well: '<path class="k" d="M7 14l13-9 13 9z"/><path class="l" d="M10 14v8M30 14v8M15 14v4"/><rect class="a" x="7" y="22" width="26" height="13" rx="2"/><path class="dl" d="M7 28h26M15 22v6M25 22v6M20 28v7"/>',
    egg: '<ellipse class="k" cx="20" cy="22" rx="11" ry="14"/><path class="a" d="M13 17q2-7 7-8q-4 4-3.5 9z" style="opacity:.75"/><path class="l" d="M6 37h28" style="stroke-width:2"/>',
    snow: '<circle class="a" cx="17" cy="24" r="12"/><path class="kl" d="M31 4v10M26 9h10M27.5 5.5l7 7M34.5 5.5l-7 7"/><circle class="d" cx="13" cy="21" r="1.6" style="opacity:.25"/><circle class="d" cx="21" cy="28" r="2.2" style="opacity:.2"/>',
    hat: '<rect class="a" x="12" y="5" width="16" height="21" rx="2"/><rect class="k" x="12" y="20" width="16" height="4.5"/><rect class="a" x="4" y="26" width="32" height="4.5" rx="2.2"/><path class="kl" d="M33 6l1.5 3 3 1.5-3 1.5L33 15l-1.5-3-3-1.5 3-1.5z"/>',
    recycle: '<path class="l" d="M9 22a11 11 0 0 1 18-10"/><path class="k" d="M30 7v9h-9z"/><path class="l" d="M31 18a11 11 0 0 1-18 10"/><path class="k" d="M10 33v-9h9z"/>',
    echo: '<circle class="a" cx="9" cy="20" r="4.5"/><path class="l" d="M16 12a11 11 0 0 1 0 16"/><path class="kl" d="M22 7a17 17 0 0 1 0 26"/><path class="l" d="M28 3a23 23 0 0 1 0 34" style="opacity:.55"/>',
    mask: '<path class="a" d="M7 7h26v11a13 13 0 0 1-26 0z"/><path class="d" d="M11 15q3.5-4 7 0q-3.5 2.5-7 0zM22 15q3.5-4 7 0q-3.5 2.5-7 0z"/><path class="dl" d="M13 24q7 6 14 0"/><path class="k" d="M7 7h26v3H7z"/>',
    note: '<path class="l" d="M15 30V9l17-4v20"/><path class="kl" d="M15 14l17-4"/><circle class="a" cx="11.5" cy="30" r="4.5"/><circle class="k" cx="28.5" cy="25" r="4.5"/>',
    shield: '<path class="a" d="M20 3l14 5v10c0 10-6.5 15-14 18C12.5 33 6 28 6 18V8z"/><text class="kt" x="20" y="25" text-anchor="middle" style="font-size:14px">Q</text>',
    clock: '<circle class="a" cx="20" cy="22" r="13.5"/><path class="dl" style="stroke-width:2.6" d="M20 22V12M20 22l6.5 3"/><circle class="k" cx="20" cy="22" r="2.2"/><path class="kl" d="M10 6l-4.5 4.5M30 6l4.5 4.5"/>',
    fin: '<path class="a" d="M8 27C15 22 18 13 15 3C24 8 31 17 34 27z"/><path class="dl" d="M17 9q5 6 7 14" style="opacity:.35"/><path class="kl" d="M2 30q4.5-3 9 0t9 0t9 0t9 0"/><path class="l" d="M2 36q4.5-3 9 0t9 0t9 0t9 0"/>',
    scope: '<path class="a" d="M5 20l22-10 3.2 7.2-22 10z"/><path class="k" d="M27 10l5-2.2 3.2 7.2-5 2.2z"/><path class="l" d="M18 23l-5.5 13M18 23l5.5 13"/><path class="kl" d="M9 4l1 2.4 2.4 1-2.4 1L9 11l-1-2.6L5.6 7.4 8 6.4z"/><circle class="a" cx="17" cy="5" r="1.3"/>',
    cat: '<path class="d" d="M9 37V19L8 5l7.5 7h9L32 5l-1 14v18z"/><path class="k" d="M12.5 20q2.5-2.5 5 0q-2.5 2.5-5 0zM22.5 20q2.5-2.5 5 0q-2.5 2.5-5 0z"/><path class="kl" d="M18.5 26h3" style="stroke-width:1.6"/>',
    wolf: '<circle class="a" cx="27" cy="11" r="8"/><path class="d" d="M5 37l2-15 3-9 4 7h4l4-7 3 9 2 15z"/><path class="k" d="M10.5 24l2.5 1.5M20.5 24L18 25.5" style="stroke:var(--k);stroke-width:2"/>',
    moon: '<circle class="a" cx="20" cy="20" r="14.5"/><circle class="k" cx="15" cy="15" r="3.2" style="opacity:.55"/><circle class="k" cx="25" cy="24" r="4.2" style="opacity:.55"/><circle class="k" cx="14.5" cy="27" r="2.2" style="opacity:.55"/><circle class="k" cx="26" cy="12" r="1.6" style="opacity:.55"/>',
    hearts2: heart(14, 16, 1.25, 'a') + heart(26, 22, 1.25, 'k'),
    bolt: '<path class="k" d="M24 2L8 22h10l-4 16 18-22H21z"/><path class="l" d="M24 2L8 22h10l-4 16 18-22H21z" style="stroke-width:1.4"/>',
    prism: '<path class="l" d="M1 23l13-3"/><path class="a" d="M20 6l13 23H7z"/><path stroke="#ff5c7a" stroke-width="2.4" stroke-linecap="round" d="M27 18l11-6"/><path stroke="#ffcf4a" stroke-width="2.4" stroke-linecap="round" d="M28 20l11-3"/><path stroke="#5fe08f" stroke-width="2.4" stroke-linecap="round" d="M28.5 22.5l10.5 0"/><path stroke="#5fb0ff" stroke-width="2.4" stroke-linecap="round" d="M28 25l10 3.5"/>',
    hand: '<path class="k" d="M13 37V22l-3.8-5.2a2.3 2.3 0 0 1 3.8-2.6l2.5 3.3V7a2.2 2.2 0 0 1 4.4 0v10V5a2.2 2.2 0 0 1 4.4 0v12V7.5a2.2 2.2 0 0 1 4.4 0V18v-6a2.2 2.2 0 0 1 4.4 0v13q0 12-12 12z"/><path class="l" d="M6 7l2 2M5 13h3M8 2l1 3" style="stroke-width:1.8"/>',
    spot: '<path class="a" d="M14 11L37 35H13z" style="opacity:.45"/><path class="k" d="M4 6l9-3.5 4 8.5-9 3.5z"/><ellipse class="a" cx="25" cy="35" rx="12" ry="2.6"/>',
    corner: '<path class="a" d="M8 3h18l7 7v27H8z"/><path class="k" d="M26 3v7h7z"/><path class="dl" style="stroke-dasharray:2.5 2.5" d="M8 26l11 11"/><circle class="kl" cx="15" cy="13" r="2.6"/><circle class="kl" cx="15" cy="21" r="2.6"/><path class="kl" d="M17 14.5l9 6M17 19.5l9-6" style="stroke-width:2"/>',
    rocket: '<path class="a" d="M20 2q9 7 9 21v6H11v-6q0-14 9-21z"/><circle class="k" cx="20" cy="15" r="3.4"/><path class="k" d="M11 21l-6 9h6zM29 21l6 9h-6z"/><path class="k" d="M14.5 30h11l-5.5 9z"/>',
    bouquet: '<path class="l" d="M20 22l-6 13M20 22v14M20 22l6 13"/><path class="k" d="M12 26h16l-5 12h-6z"/><circle class="a" cx="13" cy="12" r="5"/><circle class="k" cx="20" cy="8" r="5" style="opacity:.85"/><circle class="a" cx="27" cy="13" r="5"/><circle class="d" cx="13" cy="12" r="1.6"/><circle class="d" cx="27" cy="13" r="1.6"/>',
    throne: '<path class="k" d="M8 19l2-12 5.5 6L20 4l4.5 9L30 7l2 12z"/><rect class="k" x="8" y="20" width="24" height="4" rx="1"/><rect class="a" x="10" y="26" width="20" height="9" rx="2"/><circle class="a" cx="20" cy="12" r="1.8"/>',
    curtain: '<path class="k" d="M3 3h15q-2 18-11 34H3z"/><path class="k" d="M37 3H22q2 18 11 34h4z"/><path class="a" d="M20 13l2 5h5.4l-4.3 3.3 1.7 5.2L20 23.4l-4.8 3.1 1.7-5.2-4.3-3.3H18z"/><path class="dl" d="M8 6q-1 14-3 26M32 6q1 14 3 26"/>',
    wish: '<path class="k" d="M20 2l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"/><path class="l" d="M10 22v-4h20v4"/><rect class="a" x="7" y="22" width="26" height="14" rx="2"/><path class="dl" d="M7 29h26M14 22v7M26 22v7M20 29v7"/>',
    copy: '<rect class="a" x="5" y="5" width="17" height="23" rx="2.5"/><rect class="k" x="18" y="12" width="17" height="23" rx="2.5"/><path class="dl" d="M9 34h6M12.5 31l3 3-3 3"/><path class="dl" d="M9 11h9M9 15h9" style="opacity:.6"/>',
    scroll: '<path class="a" d="M9 6h20v25a4 4 0 0 1-4 4H11a4 4 0 0 0 4-4V10H9z"/><circle class="a" cx="11" cy="8" r="3"/><path class="dl" d="M18 14h8M18 18h8M18 22h5"/><circle class="k" cx="25" cy="29" r="4.5"/>',
    disco: '<path class="l" d="M20 3v6"/><circle class="a" cx="20" cy="22" r="12.5"/><path class="dl" d="M7.5 22h25M20 9.5v25M10 15h20M10 29h20M14 11q-3.5 11 0 22M26 11q3.5 11 0 22"/><path class="k" d="M34 5l1.2 3 3 1.2-3 1.2L34 13.5l-1.2-3.1-3-1.2 3-1.2z"/><path class="k" d="M6 6l.9 2 2 .9-2 .9L6 12l-.9-2.2-2-.9 2-.9z"/>',
    // charms
    ink: '<path class="k" d="M20 3q13 17 13 23a13 13 0 0 1-26 0q0-6 13-23z"/><path class="a" d="M13 25q0-4 4-9" style="opacity:.5"/>',
    whet: '<rect class="a" x="5" y="18" width="30" height="11" rx="3" transform="rotate(-14 20 23)"/><path class="kl" d="M10 11l5-5M20 8l1-6M27 11l5-4"/>',
    ember: '<path class="k" d="M20 2q11 11 11 22a11 11 0 0 1-22 0q0-7 5-12q0 6 4 8q-3-9 2-18z"/><path class="a" d="M20 21q5 4 5 9a5 5 0 0 1-10 0q0-5 5-9z"/>',
    glass: '<path class="a" d="M10 4h20l-3.5 30h-13z" style="opacity:.7"/><path class="l" d="M10 4h20l-3.5 30h-13z"/><path class="kl" d="M15 9l-1.5 18" style="stroke-width:2"/><path class="l" d="M32 32l4 4M35 28l3 1M28 36l1 3" style="stroke-width:1.8"/>',
    iron: '<path class="a" d="M5 12h26q5 0 5 5v1h-8l-3 8h4v6H11v-6h4l-3-8H5z"/><path class="dl" d="M12 18h11"/>',
    leaf: '<path class="k" d="M7 33Q5 9 33 5q2 26-26 28z"/><path class="dl" d="M8 32Q18 20 28 10M14 25l-2-6M20 19l-1-6M19 25l6 1"/>',
    mirror: '<ellipse class="a" cx="20" cy="17" rx="11" ry="14"/><ellipse class="k" cx="20" cy="17" rx="8" ry="11" style="opacity:.55"/><path class="l" d="M15 11l4-4M15 17l8-8" style="stroke-width:1.8"/><path class="l" d="M20 31v6M15 37h10"/>',
    shred: '<circle class="kl" cx="11" cy="29" r="5"/><circle class="kl" cx="29" cy="29" r="5"/><path class="l" d="M14 25L30 4M26 25L10 4"/>',
    promo: '<path class="k" d="M20 3l13 14h-8v19h-10V17H7z"/><path class="l" d="M12 31l8-6 8 6" style="opacity:.7"/>',
    card: '<rect class="a" x="10" y="5" width="20" height="30" rx="3"/><text class="kt" x="20" y="26" text-anchor="middle" style="font-size:16px">A</text>',
    star: '<path class="k" d="M20 3l4.6 10.4 11.4 1.2-8.5 7.6 2.4 11.2L20 27.6l-9.9 5.8 2.4-11.2L4 14.6l11.4-1.2z"/>'
  };  // more motifs (40×40): a = cream, k = accent, d = dark, l/kl/dl = strokes
  var MORE = {
    books: '<rect class="k" x="7" y="8" width="8" height="26" rx="1"/><rect class="a" x="16" y="5" width="8" height="29" rx="1"/><rect class="k" x="25" y="11" width="8" height="23" rx="1" transform="rotate(8 29 22)"/><path class="dl" d="M9 13h4M18 10h4M18 29h4M9 29h4"/><path class="l" d="M4 35h32"/>',
    nest: '<ellipse class="a" cx="20" cy="18" rx="7" ry="9"/><path class="k" d="M5 22q15 18 30 0z"/><path class="dl" d="M8 25q12 6 24 0M10 29q10 4 20 0"/>',
    popcorn: '<path class="a" d="M10 16h20l-3 21H13z"/><path class="k" d="M13 16h4l-1 21h-3zM23 16h4l-1 21h-3z"/><circle class="a" cx="13" cy="13" r="4.5"/><circle class="a" cx="20" cy="10" r="5"/><circle class="a" cx="27" cy="13" r="4.5"/><circle class="k" cx="18" cy="8" r="1.4" style="opacity:.6"/>',
    cone: '<path class="k" d="M12 19h16L20 38z"/><path class="dl" d="M14 22l9 8M26 22l-9 8"/><circle class="a" cx="20" cy="13" r="8.5"/><circle class="k" cx="17" cy="10" r="1.5" style="opacity:.5"/>',
    fist: '<rect class="k" x="9" y="12" width="22" height="17" rx="5"/><path class="dl" d="M15 12v8M20 12v8M25 12v8"/><path class="a" d="M9 18q-4 1-3 6l3 3z"/><rect class="a" x="13" y="29" width="14" height="8" rx="2"/>',
    melon: '<path class="k" d="M4 16a16 16 0 0 0 32 0z"/><path class="a" d="M7 16a13 13 0 0 0 26 0z"/><path class="d" d="M14 20l1 3M20 21v3M26 20l-1 3M17 26l1 2M23 26l-1 2" style="stroke:#1a1020;stroke-width:2"/>',
    bus: '<rect class="k" x="4" y="10" width="32" height="20" rx="4"/><rect class="a" x="8" y="13" width="7" height="7" rx="1"/><rect class="a" x="17" y="13" width="7" height="7" rx="1"/><rect class="a" x="26" y="13" width="7" height="7" rx="1"/><circle class="d" cx="11" cy="31" r="3.5"/><circle class="d" cx="29" cy="31" r="3.5"/>',
    sprout: '<path class="l" d="M20 37V18"/><path class="k" d="M20 22Q8 22 7 10q12 0 13 12z"/><path class="k" d="M20 18q2-12 14-12q0 12-14 12z"/><path class="a" d="M10 37h20l-2-6H12z"/>',
    card2: '<rect class="a" x="4" y="9" width="32" height="22" rx="3"/><rect class="d" x="4" y="13" width="32" height="5"/><rect class="k" x="8" y="22" width="7" height="5" rx="1"/><path class="dl" d="M19 25h12"/>',
    juggle: '<circle class="k" cx="10" cy="22" r="5"/><circle class="a" cx="20" cy="9" r="5"/><circle class="k" cx="30" cy="22" r="5"/><path class="l" d="M8 33q12 8 24 0" style="stroke-dasharray:2 3"/>',
    nightcap: '<path class="k" d="M6 28q4-22 26-20q-6 6-6 20z"/><circle class="a" cx="32" cy="8" r="4"/><rect class="a" x="4" y="26" width="26" height="6" rx="3"/><path class="kl" d="M10 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" style="stroke-width:1"/>',
    dice: '<rect class="a" x="7" y="7" width="26" height="26" rx="5"/><circle class="d" cx="14" cy="14" r="2.6"/><circle class="d" cx="26" cy="26" r="2.6"/><circle class="k" cx="20" cy="20" r="2.6"/><circle class="d" cx="26" cy="14" r="2.6"/><circle class="d" cx="14" cy="26" r="2.6"/>',
    square: '<rect class="k" x="6" y="6" width="28" height="28" rx="2"/><rect class="a" x="12" y="12" width="16" height="16"/><rect class="k" x="17" y="17" width="6" height="6"/>',
    shoe: '<path class="a" d="M5 30V18q4-6 10-2l6 5q7 3 13 4q2 1 1 5z"/><path class="k" d="M4 30h31v4H4z"/><path class="dl" d="M13 20l3-2M16 23l3-2"/><path class="kl" d="M2 12h8M4 7h6" style="stroke-width:2"/>',
    eightball: '<circle class="d" cx="20" cy="20" r="15" style="fill:#0a0a14"/><circle class="a" cx="20" cy="17" r="7"/><text class="kt" x="20" y="21.5" text-anchor="middle" style="fill:#0a0a14;font-size:11px">8</text><circle class="a" cx="12" cy="11" r="2" style="opacity:.5"/>',
    cup: '<path class="a" d="M7 14h22v8a11 11 0 0 1-22 0z"/><path class="l" d="M29 16q6 0 5 5t-6 4"/><path class="k" d="M5 34h26"/><path class="kl" d="M14 6q2 3 0 5M20 4q2 3 0 6M26 6q2 3 0 5" style="stroke-width:1.8"/>',
    crowd: '<circle class="k" cx="11" cy="15" r="5"/><circle class="a" cx="20" cy="12" r="5.5"/><circle class="k" cx="29" cy="15" r="5"/><path class="k" d="M3 36q2-14 8-14t8 14z"/><path class="a" d="M11 36q2-16 9-16t9 16z"/><path class="k" d="M21 36q2-14 8-14t8 14z"/>',
    ticket: '<path class="k" d="M4 11h32v6a3 3 0 0 0 0 6v6H4v-6a3 3 0 0 0 0-6z"/><path class="dl" d="M27 11v18" style="stroke-dasharray:2 2"/><path class="a" d="M15 13l1.7 3.6 4 .5-2.9 2.7.8 4-3.6-2-3.6 2 .8-4-2.9-2.7 4-.5z"/>',
    scale: '<path class="l" d="M20 6v28M8 34h24M7 12h26"/><path class="k" d="M2 22l5-10 5 10a5 3 0 0 1-10 0zM28 22l5-10 5 10a5 3 0 0 1-10 0z"/><circle class="a" cx="20" cy="6" r="3"/>',
    boot: '<path class="k" d="M10 4h12v20l10 4q4 2 3 8H8z"/><path class="a" d="M8 32h27v4H8z"/><path class="dl" d="M12 9h8M12 14h8M12 19h8"/>',
    mime: '<ellipse class="a" cx="20" cy="21" rx="12" ry="15"/><path class="d" d="M13 15l5 2-5 2zM27 15l-5 2 5 2z" style="fill:#14101e"/><path class="k" d="M15 28q5 3 10 0q-5 4-10 0z"/><path class="dl" d="M15 9l-2-3M25 9l2-3"/>',
    flipbook: '<rect class="a" x="8" y="6" width="22" height="28" rx="2" transform="rotate(-8 19 20)"/><rect class="k" x="10" y="7" width="22" height="28" rx="2" transform="rotate(4 21 21)"/><path class="dl" d="M15 14h12M15 19h12M15 24h8" transform="rotate(4 21 21)"/>',
    copy2: '<rect class="a" x="5" y="5" width="18" height="24" rx="2"/><rect class="k" x="17" y="11" width="18" height="24" rx="2"/><path class="dl" d="M21 17h10M21 22h10M21 27h6"/>',
    crystal: '<circle class="a" cx="20" cy="17" r="12" style="opacity:.85"/><circle class="k" cx="16" cy="13" r="3" style="opacity:.7"/><path class="k" d="M10 29h20l3 7H7z"/><path class="kl" d="M24 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" style="stroke-width:1"/>',
    ruby: '<path class="k" d="M20 35L5 17l5-9h20l5 9z"/><path class="a" d="M10 8l3 9h14l3-9M5 17h30M13 17l7 18 7-18" style="fill:none;stroke:rgba(255,255,255,.7);stroke-width:1.5"/>',
    spear: '<path class="a" d="M20 2l7 14-7 6-7-6z"/><path class="kl" d="M20 22v16" style="stroke-width:3.5"/><path class="k" d="M14 22h12v3H14z"/>',
    pearl: '<path class="k" d="M4 26q16-18 32 0q-16 12-32 0z"/><circle class="a" cx="20" cy="22" r="6"/><circle class="k" cx="18" cy="20" r="1.6" style="opacity:.4"/>',
    topaz: '<path class="k" d="M8 14l9-8 13 4 4 12-9 12-14-2-5-9z"/><path class="a" d="M17 6l-2 11 10 3 5-10M15 17l-7-3M15 17l2 15M25 20l9 2M25 20l0 14" style="fill:none;stroke:rgba(255,255,255,.55);stroke-width:1.4"/>',
    mountain: '<path class="k" d="M2 36L15 10l7 11 5-6 11 21z"/><path class="a" d="M15 10l-4 8 3-1 2 2 2-3zM27 15l-3 4 2-.5 2 1.5 1-2z"/><circle class="a" cx="31" cy="7" r="3.5"/>',
    fang: '<path class="k" d="M4 8q16 10 32 0v6q-16 8-32 0z"/><path class="a" d="M10 13l3 16 4-15zM23 14l4 15 3-16z"/>',
    glove: '<path class="k" d="M10 36V20l-4-6a2.5 2.5 0 0 1 4-3l3 4V5a2.3 2.3 0 0 1 4.6 0v10V3a2.3 2.3 0 0 1 4.6 0v12V5.5a2.3 2.3 0 0 1 4.6 0V16v-7a2.3 2.3 0 0 1 4.6 0v15q0 12-11 12z"/><rect class="a" x="10" y="31" width="20" height="5" rx="1"/>',
    skull: '<path class="a" d="M20 4C11 4 6 10 6 18c0 5 3 8 5 9v6h18v-6c2-1 5-4 5-9 0-8-5-14-14-14z"/><circle class="d" cx="14" cy="18" r="3.6" style="fill:#14101e"/><circle class="d" cx="26" cy="18" r="3.6" style="fill:#14101e"/><path class="d" d="M18 26l2-4 2 4z" style="fill:#14101e"/><path class="dl" d="M16 33v-4M20 33v-4M24 33v-4"/>',
    dish: '<path class="a" d="M6 8a17 17 0 0 0 24 24z"/><path class="l" d="M18 20l10-10"/><circle class="k" cx="29" cy="9" r="3"/><path class="l" d="M15 25l-5 11h14l-4-7"/><path class="kl" d="M31 3q5 2 6 7M34 1q6 3 6 9" style="stroke-width:1.6"/>',
    punch: '<rect class="a" x="7" y="5" width="26" height="30" rx="2"/><circle class="d" cx="14" cy="12" r="2.4" style="fill:#2a2014"/><circle class="d" cx="20" cy="12" r="2.4" style="fill:#2a2014"/><circle class="d" cx="26" cy="12" r="2.4" style="fill:#2a2014"/><circle class="d" cx="14" cy="19" r="2.4" style="fill:#2a2014"/><circle class="d" cx="20" cy="19" r="2.4" style="fill:#2a2014"/><circle class="k" cx="26" cy="19" r="2.4"/><path class="dl" d="M11 28h18"/>',
    bowl: '<path class="a" d="M4 18h32a16 16 0 0 1-32 0z"/><path class="k" d="M7 18q4-4 7 0t7 0t7 0t7 0" style="fill:none;stroke:var(--k);stroke-width:2.5"/><path class="l" d="M24 16L34 2M28 16L38 5"/><path class="k" d="M14 34h12v3H14z"/>',
    horseshoe: '<path class="kl" d="M10 6v14a10 10 0 0 0 20 0V6" style="stroke-width:6"/><path class="dl" d="M10 10h0M10 17h0M30 10h0M30 17h0" style="stroke-width:2.5;stroke:#1a1020"/>',
    dice2: '<rect class="a" x="3" y="12" width="18" height="18" rx="4" transform="rotate(-12 12 21)"/><rect class="k" x="19" y="10" width="18" height="18" rx="4" transform="rotate(10 28 19)"/><circle class="d" cx="12" cy="21" r="2" style="fill:#1a1020"/><circle class="a" cx="24" cy="15" r="1.8"/><circle class="a" cx="31" cy="23" r="1.8"/>',
    eyes: '<ellipse class="a" cx="12" cy="20" rx="9" ry="7"/><ellipse class="a" cx="29" cy="20" rx="9" ry="7"/><circle class="k" cx="12" cy="20" r="4"/><circle class="k" cx="29" cy="20" r="4"/><circle class="d" cx="12" cy="20" r="1.8" style="fill:#0a0a14"/><circle class="d" cx="29" cy="20" r="1.8" style="fill:#0a0a14"/>',
    frame2: '<rect class="k" x="5" y="5" width="30" height="30" rx="2"/><rect class="d" x="10" y="10" width="20" height="20" style="fill:rgba(10,6,20,.75)"/><path class="dl" d="M10 10l20 20M30 10L10 30" style="stroke-dasharray:2 2;stroke:rgba(255,255,255,.3)"/>',
    shell: '<path class="k" d="M20 36C8 36 4 26 4 20 4 10 12 4 20 4c8 0 14 6 14 13 0 6-5 11-11 11-5 0-9-4-9-8 0-4 3-7 7-7 3 0 5 2 5 5"/><path class="kl" d="M20 36h16" style="stroke-width:3"/>',
    sand: '<circle class="k" cx="28" cy="11" r="6"/><path class="a" d="M2 30q10-10 20-2t16-4v14H2z"/><path class="dl" d="M8 33q6-3 12 0"/>',
    trident: '<path class="kl" d="M20 12v26M10 4v8q0 6 10 6t10-6V4" style="stroke-width:3"/><path class="k" d="M20 2l3 6h-6zM10 0l3 5H7zM30 0l3 5h-6z"/>',
    table: '<rect class="k" x="3" y="14" width="34" height="6" rx="1.5"/><path class="kl" d="M7 20v16M33 20v16M12 20l-3 10M28 20l3 10" style="stroke-width:3"/><circle class="a" cx="13" cy="10" r="3.5"/><circle class="a" cx="27" cy="10" r="3.5"/><path class="a" d="M17 12h6v2h-6z"/>',
    dna: '<path class="kl" d="M12 3q16 9 0 17t0 17" style="stroke-width:3"/><path class="l" d="M28 3q-16 9 0 17t0 17" style="stroke-width:3"/><path class="dl" d="M15 7h10M15 16h10M15 24h10M15 33h10" style="stroke:rgba(255,255,255,.5)"/>',
    bindle: '<path class="l" d="M4 36L34 8"/><circle class="k" cx="30" cy="12" r="8"/><path class="a" d="M26 7l3 3M33 9l-2 3M28 16l2-3" style="stroke:var(--k);stroke-width:1.5"/><circle class="a" cx="27" cy="11" r="1.4"/><circle class="a" cx="33" cy="14" r="1.4"/>',
    crown: '<path class="k" d="M4 30L6 10l8 9 6-13 6 13 8-9 2 20z"/><rect class="a" x="4" y="30" width="32" height="5" rx="1"/><circle class="a" cx="20" cy="22" r="2.5"/><circle class="a" cx="11" cy="24" r="1.8"/><circle class="a" cx="29" cy="24" r="1.8"/>',
    hush: '<circle class="a" cx="20" cy="20" r="14"/><path class="k" d="M12 22q8 5 16 0" style="fill:none;stroke:var(--k);stroke-width:3"/><rect class="k" x="18" y="8" width="4" height="18" rx="2"/>',
    twins: '<circle class="a" cx="13" cy="11" r="5.5"/><circle class="k" cx="27" cy="11" r="5.5"/><path class="a" d="M4 37q1-17 9-17t9 17z"/><path class="k" d="M18 37q1-17 9-17t9 17z"/>',
    book: '<path class="a" d="M3 10q8-4 17 1v25q-9-5-17-1z"/><path class="k" d="M37 10q-8-4-17 1v25q9-5 17-1z"/><path class="dl" d="M7 16q5-2 10 1M7 22q5-2 10 1M23 17q5-3 10-1M23 23q5-3 10-1"/>',
    maw: '<path class="k" d="M4 14q16-14 32 0v12q-16 14-32 0z"/><path class="d" d="M8 18q12-6 24 0v4q-12 8-24 0z" style="fill:#1a0610"/><path class="a" d="M10 17l2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-4 2 4 2-4"/>',
    hop: '<ellipse class="a" cx="8" cy="33" rx="5" ry="2.5"/><ellipse class="a" cx="20" cy="33" rx="5" ry="2.5" style="opacity:.4"/><ellipse class="a" cx="32" cy="33" rx="5" ry="2.5"/><path class="kl" d="M8 30q12-30 24 0" style="stroke-dasharray:3 3"/><circle class="k" cx="20" cy="12" r="4"/>',
    masque: '<path class="k" d="M3 16q17-8 34 0q0 10-8 10q-5 0-9-5q-4 5-9 5q-8 0-8-10z"/><path class="d" d="M8 17q4-3 8 0q-4 4-8 0zM24 17q4-3 8 0q-4 4-8 0z" style="fill:#14081e"/><path class="kl" d="M37 16q2-8-4-12" style="stroke-width:2"/>',
    chalk: '<rect class="k" x="3" y="6" width="34" height="24" rx="2"/><rect class="d" x="6" y="9" width="28" height="18" style="fill:#14261c"/><path class="l" d="M10 21l4-6 4 4 5-7 5 9"/><path class="a" d="M10 33h20v3H10z"/>',
    wand: '<path class="l" d="M6 36L26 16" style="stroke-width:3.5"/><path class="k" d="M29 3l2.4 5.6 6 .6-4.5 4 1.3 6-5.2-3.1-5.2 3.1 1.3-6-4.5-4 6-.6z"/><circle class="a" cx="12" cy="12" r="1.6"/><circle class="a" cx="34" cy="28" r="1.4"/>',
    tarot: '<rect class="a" x="9" y="4" width="22" height="32" rx="2"/><rect class="k" x="12" y="7" width="16" height="26" rx="1"/><circle class="a" cx="20" cy="20" r="5"/>'
  };
  for (var mk in MORE) ART[mk] = MORE[mk];

  // ── Pixel suit bitmaps (7×7) ────────────────────────────────────────────
  var SUITPX = {
    h: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...', '.......'],
    d: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
    s: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '...X...', '..XXX..'],
    c: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..']
  };
  var SUITCOL = { h: '#e8384f', d: '#f0802a', s: '#2a2a4a', c: '#2a5a8a' };
  function suitRects(s, x0, y0, px, col) {
    var o = '';
    SUITPX[s].forEach(function (row, y) { for (var x = 0; x < 7; x++) if (row[x] === 'X') o += '<rect x="' + (x0 + x * px) + '" y="' + (y0 + y * px) + '" width="' + px + '" height="' + px + '" fill="' + col + '"/>'; });
    return o;
  }
  // A crisp pixel suit as an SVG data URL, for card pips (CSS backgrounds)
  function suitSvg(s, col) { return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7" shape-rendering="crispEdges">' + suitRects(s, 0, 0, 1, col || SUITCOL[s]) + '</svg>'); }

  // ── Rasterise an SVG into a small canvas: crisp pixel art ──────────────
  var cache = {}, jobs = [];
  function style(k) {
    return '<style>svg{--k:' + k + '}.a{fill:#fff6df}.k{fill:' + k + '}.d{fill:rgba(15,6,25,.6)}' +
      '.l{fill:none;stroke:#fff6df;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}' +
      '.kl{fill:none;stroke:' + k + ';stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}' +
      '.dl{fill:none;stroke:rgba(15,6,25,.65);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.kt{fill:' + k + ';font:900 11px sans-serif}.at{fill:#fff6df;font:900 12px sans-serif}</style>';
  }
  function svgDoc(w, h, body, k) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + style(k || '#ffcf4a') + body + '</svg>'; }
  function raster(key, w, h, svg) {
    jobs.push(new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        try {
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var g = cv.getContext('2d'); g.drawImage(img, 0, 0, w, h);
          var d = g.getImageData(0, 0, w, h), p = d.data;
          for (var i = 3; i < p.length; i += 4) p[i] = p[i] > 110 ? 255 : 0;   // hard pixel edges
          g.putImageData(d, 0, 0);
          cache[key] = cv.toDataURL();
        } catch (e) {}
        res();
      };
      img.onerror = function () { res(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }));
  }
  function grad(id, a, b) { return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>'; }
  function motif(name, x, y, s) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + (ART[name] || ART.grin) + '</g>'; }

  // Joker: 40×54 card, art on top, a dark plate at the bottom for the name
  var RFRAME = { 1: '#e9e4f2', 2: '#9ff0c0', 3: '#ff9db0', 4: '#ffe27a' };
  function jokerSvg(k) {
    var d = E.JK[k], a = d.art;
    var body = grad('g', a[1], a[2]) +
      '<rect x=".5" y=".5" width="39" height="53" rx="4" fill="#120a1c"/>' +
      '<rect x="2" y="2" width="36" height="50" rx="3" fill="' + RFRAME[d.r] + '"/>' +
      '<rect x="3.5" y="3.5" width="33" height="47" rx="2" fill="url(#g)"/>' +
      '<path d="M3.5 12l33-8M3.5 24l33-8M3.5 36l33-8" stroke="rgba(255,255,255,.07)" stroke-width="3"/>' +
      motif(a[0], 5, 5, 0.75) +
      '<rect x="5" y="38" width="30" height="11" rx="1.5" fill="rgba(10,4,18,.55)"/>' +
      (d.r === 4 ? '<path d="M20 1.5l2 3h-4z" fill="#ffe27a"/>' : '');
    return svgDoc(40, 54, body, a[3]);
  }
  var ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
  var ENHCOL = { bonus: '#3d8bff', mult: '#ff4d5e', wild: 'url(#rb)', glass: '#bfe8ff', steel: '#9aa6b4', stone: '#7a7068', gold: '#ffc83d', lucky: '#3ddc84' };
  var CMOTIF = { t_repeat: 'echo', t_climb: 'promo', t_shears: 'shred', t_twin: 'copy', t_hoard: 'coin', t_pawn: 'scale', t_astro: 'scope', t_oracle: 'crystal', t_summon: 'grin', t_spin: 'wheel',
    s_pageant: 'masque', s_grave: 'skull', s_conjure: 'wand', s_gwax: 'seal', s_rwax: 'seal', s_bwax: 'seal', s_pwax: 'seal', s_halo: 'disco', s_pact: 'scroll', s_eclipse: 'moon', s_unison: 'copy2',
    s_void: 'hush', s_pyre: 'ember', s_effigy: 'twins', s_curse: 'fang', s_replica: 'copy', s_heart: 'ruby', s_singular: 'star' };
  var SEALCOL = { s_gwax: '#ffc83d', s_rwax: '#e8384f', s_bwax: '#3d8bff', s_pwax: '#a05ae0' };
  var HANDCOL = { high: '#c8c0a8', pair: '#e05a5a', two: '#5ab0e0', three: '#e0a83a', straight: '#a05ae0', flush: '#3ac0a0', full: '#5a8ae0', four: '#e05aa8',
    sflush: '#3a6ae0', five: '#ff8a3d', flushhouse: '#e0e05a', flushfive: '#ff5a8a' };
  function consSvg(k) {
    var d = E.CONS[k], body, accent = '#ffd56a';
    if (d.t === 'planet') {
      var col = HANDCOL[d.hand];
      body = grad('g', '#24306e', '#060a24') + '<rect x=".5" y=".5" width="39" height="53" rx="4" fill="#0a0818"/><rect x="2" y="2" width="36" height="50" rx="3" fill="#9ec5ff"/><rect x="3.5" y="3.5" width="33" height="47" rx="2" fill="url(#g)"/>' +
        '<circle cx="9" cy="9" r="1" fill="#fff"/><circle cx="31" cy="13" r=".9" fill="#fff"/><circle cx="12" cy="40" r=".9" fill="#fff"/><circle cx="30" cy="42" r="1" fill="#fff"/><circle cx="27" cy="7" r=".7" fill="#fff"/>' +
        '<circle cx="20" cy="25" r="10" fill="' + col + '"/><path d="M12 21a10 10 0 0 1 14-5" stroke="rgba(255,255,255,.45)" stroke-width="2.5" fill="none"/><path d="M20 35a10 10 0 0 0 9-6" stroke="rgba(0,0,0,.3)" stroke-width="3" fill="none"/>' +
        (/^(two|full|five|flushhouse|sflush)$/.test(d.hand) ? '<ellipse cx="20" cy="25" rx="16" ry="4" fill="none" stroke="#fff6df" stroke-width="1.6" transform="rotate(-18 20 25)"/>' : '') +
        '<rect x="5" y="40" width="30" height="9" rx="1.5" fill="rgba(5,4,20,.6)"/>';
      return svgDoc(40, 54, body, col);
    }
    if (d.t === 'tarot') {
      var idx = E.CONS && Object.keys(E.CONS).filter(function (x) { return E.CONS[x].t === 'tarot'; }).indexOf(k);
      body = grad('g', '#7a4ab8', '#2a1550') + '<defs><linearGradient id="rb" x1="0" x2="1"><stop offset="0" stop-color="#ff4d5e"/><stop offset=".33" stop-color="#ffc83d"/><stop offset=".66" stop-color="#3ddc84"/><stop offset="1" stop-color="#3d8bff"/></linearGradient></defs>' +
        '<rect x=".5" y=".5" width="39" height="53" rx="4" fill="#120a1c"/><rect x="2" y="2" width="36" height="50" rx="3" fill="#e8c060"/><rect x="3.5" y="3.5" width="33" height="47" rx="2" fill="url(#g)"/>' +
        '<rect x="6" y="6" width="28" height="41" rx="1" fill="none" stroke="rgba(255,230,160,.35)" stroke-width="1"/>';
      if (d.e) body += '<rect x="12" y="11" width="16" height="22" rx="2" fill="#fff6df"/><rect x="14" y="13" width="12" height="18" rx="1" fill="' + ENHCOL[d.e] + '"/>' + (d.e === 'stone' ? '<path d="M16 17h3M21 23h3M17 27h2" stroke="#4a4038" stroke-width="1.5"/>' : '');
      else if (d.suit) body += '<circle cx="20" cy="22" r="11" fill="rgba(255,246,223,.92)"/>' + suitRects(d.suit, 12.5, 14.5, 2.15, SUITCOL[d.suit]);
      else body += motif(CMOTIF[k] || 'star', 7, 8, 0.65);
      body += '<rect x="5" y="40" width="30" height="9" rx="1.5" fill="rgba(20,8,40,.6)"/>';
      return svgDoc(40, 54, body, accent);
    }
    // spectral
    body = grad('g', '#2a8a9a', '#0a2436') + '<rect x=".5" y=".5" width="39" height="53" rx="4" fill="#06141c"/><rect x="2" y="2" width="36" height="50" rx="3" fill="#bff4ff"/><rect x="3.5" y="3.5" width="33" height="47" rx="2" fill="url(#g)"/>' +
      '<path d="M6 46q14-30 28 0" fill="rgba(191,244,255,.12)"/>';
    if (SEALCOL[k]) body += '<circle cx="20" cy="22" r="10" fill="' + SEALCOL[k] + '"/><circle cx="20" cy="22" r="6.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/><path d="M20 17v10M15 22h10" stroke="rgba(0,0,0,.25)" stroke-width="2"/>';
    else body += motif(CMOTIF[k] || 'star', 7, 8, 0.65);
    body += '<rect x="5" y="40" width="30" height="9" rx="1.5" fill="rgba(4,20,30,.6)"/>';
    return svgDoc(40, 54, body, '#dffaff');
  }
  var VMOTIF = { shelf: 'stack', aisle: 'stack', discount: 'ticket', clearance: 'ticket', polish: 'gem', lacquer: 'prism', rrdeal: 'dice', rrbargain: 'dice2', pocket: 'wallet', omen: 'crystal',
    chart: 'scope', planetarium: 'moon', hand1: 'hand', hand2: 'glove', bin1: 'recycle', bin2: 'bucket', arcana1: 'tarot', arcana2: 'tarot', star1: 'star', star2: 'star', jar: 'pig', vault: 'coin',
    slip: 'card2', slot: 'frame2', cards1: 'card', cards2: 'card', rewind: 'hourglass', timeslip: 'clock', swap: 'recycle', bossroll: 'wheel', big1: 'mitten', big2: 'mitten' };
  function voucherSvg(k) {
    var tier2 = !!E.VOUCHERS[k].req;
    var body = grad('g', tier2 ? '#ffb070' : '#ffd890', tier2 ? '#d0602a' : '#e0902a') +
      '<path d="M1 4h38v13a4 4 0 0 0 0 8v25H1V25a4 4 0 0 0 0-8z" fill="#2a1408"/>' +
      '<path d="M3 6h34v12a3 3 0 0 0 0 6v24H3V24a3 3 0 0 0 0-6z" fill="url(#g)"/>' +
      '<rect x="7" y="10" width="26" height="30" rx="2" fill="rgba(60,20,0,.28)"/>' + motif(VMOTIF[k] || 'ticket', 8, 11, 0.6) +
      '<path d="M7 44h26" stroke="rgba(60,20,0,.4)" stroke-width="2" stroke-dasharray="2 2"/>';
    return svgDoc(40, 54, body, tier2 ? '#fff1c8' : '#7a2a0a');
  }
  var PMOTIF = { standard: 'card', arcana: 'tarot', celestial: 'star', buffoon: 'grin', spectral: 'crystal' };
  var PCOL = { standard: ['#5a8ad8', '#1f3a7a'], arcana: ['#9b5ad8', '#3a1a6a'], celestial: ['#3a5ad8', '#0e1a5a'], buffoon: ['#e0404f', '#6a0e1a'], spectral: ['#2fb8b0', '#0a3a4a'] };
  function packSvg(kind, size) {
    var c = PCOL[kind], top = '', bot = '';
    for (var x = 2; x < 38; x += 4) { top += 'l2 -3l2 3'; bot += 'l-2 3l-2 -3'; }
    var body = grad('g', c[0], c[1]) +
      '<path d="M2 7' + top + 'V48' + bot + 'z" fill="#0a0612"/>' +
      '<rect x="3" y="7" width="34" height="40" fill="url(#g)"/>' +
      '<rect x="3" y="7" width="34" height="5" fill="rgba(255,255,255,.18)"/><rect x="3" y="42" width="34" height="5" fill="rgba(0,0,0,.2)"/>' +
      '<path d="M8 12v30" stroke="rgba(255,255,255,.18)" stroke-width="3"/>' + motif(PMOTIF[kind], 8, 13, 0.6) +
      (size === 'mega' ? '<rect x="6" y="38" width="28" height="3" fill="#ffd56a"/>' : size === 'jumbo' ? '<rect x="6" y="38" width="28" height="3" fill="#c8d0e0"/>' : '');
    return svgDoc(40, 54, body, '#fff6df');
  }
  function tagSvg(k) {
    var T = E.TAGS[k];
    var body = '<path d="M2 2h14l6 10-6 10H2z" fill="#140a1e"/><path d="M3.5 3.5h11.8l5 8.5-5 8.5H3.5z" fill="' + T.col + '"/><circle cx="15" cy="12" r="1.8" fill="#140a1e"/>' +
      '<text x="8.5" y="15.5" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="9" fill="#140a1e">' + T.n.charAt(0) + '</text>';
    return svgDoc(24, 24, body, T.col);
  }
  function bossSvg(k) {
    var B = E.BOSSES[k], sym = '';
    if (B.suit) sym = suitRects(B.suit, 9.5, 9.5, 1.6, '#fff6df');
    else sym = '<text x="16" y="20.5" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="12" fill="#fff6df">' + B.n.replace(/^The /, '').charAt(0) + '</text>';
    var body = '<circle cx="16" cy="16" r="15" fill="#140a1e"/><circle cx="16" cy="16" r="13.5" fill="' + B.col + '"/>' +
      '<circle cx="16" cy="16" r="11" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="3 2.5"/><path d="M7 10a11 11 0 0 1 12-5" stroke="rgba(255,255,255,.4)" stroke-width="2" fill="none"/>' + sym;
    return svgDoc(32, 32, body, B.col);
  }
  function chipSvg(col, letter) {
    var body = '<circle cx="16" cy="16" r="15" fill="#140a1e"/><circle cx="16" cy="16" r="13.5" fill="' + col + '"/>' +
      '<circle cx="16" cy="16" r="11" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-dasharray="3 2.5"/><path d="M7 10a11 11 0 0 1 12-5" stroke="rgba(255,255,255,.45)" stroke-width="2" fill="none"/>' +
      '<text x="16" y="20.5" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="12" fill="#fff6df">' + letter + '</text>';
    return svgDoc(32, 32, body, col);
  }
  // Face cards: a little pixel portrait (22×26) in the suit's colour
  function faceSvg(r, s) {
    var col = SUITCOL[s], hat;
    if (r === 'K') hat = '<path d="M5 9V3l3 3 3-4 3 4 3-3v6z" fill="#ffc83d"/>';
    else if (r === 'Q') hat = '<path d="M6 9l1-4 4 2 4-2 1 4z" fill="#ffc83d"/><circle cx="11" cy="4" r="1.5" fill="' + col + '"/>';
    else hat = '<path d="M5 9q1-6 6-6t6 6z" fill="' + col + '"/><path d="M16 5l4-2-1 4z" fill="#ffc83d"/>';
    var body = '<rect x="0" y="0" width="22" height="26" fill="none"/>' + '<path d="M2 26q0-9 9-10q9 1 9 10z" fill="' + col + '"/><path d="M7 17l4 5 4-5" fill="#ffc83d"/>' +
      '<rect x="6" y="8" width="10" height="9" rx="2" fill="#f6dcc0"/><rect x="8" y="11" width="2" height="2" fill="#1a1020"/><rect x="12" y="11" width="2" height="2" fill="#1a1020"/>' +
      '<rect x="9" y="15" width="4" height="1" fill="#b04050"/>' + (r === 'K' ? '<path d="M6 15h10v3q-5 3-10 0z" fill="#8a6a4a"/>' : '') + hat;
    return svgDoc(22, 26, body, col);
  }

  function queueAll() {
    Object.keys(E.JK).forEach(function (k) { raster('j:' + k, 40, 54, jokerSvg(k)); });
    Object.keys(E.CONS).forEach(function (k) { raster('c:' + k, 40, 54, consSvg(k)); });
    Object.keys(E.VOUCHERS).forEach(function (k) { raster('v:' + k, 40, 54, voucherSvg(k)); });
    Object.keys(E.PACKS).forEach(function (k) { ['normal', 'jumbo', 'mega'].forEach(function (sz) { raster('p:' + k + ':' + sz, 40, 54, packSvg(k, sz)); }); });
    Object.keys(E.TAGS).forEach(function (k) { raster('t:' + k, 24, 24, tagSvg(k)); });
    Object.keys(E.BOSSES).forEach(function (k) { raster('b:' + k, 32, 32, bossSvg(k)); });
    raster('b:small', 32, 32, chipSvg('#2f6fe0', 'S')); raster('b:big', 32, 32, chipSvg('#e0a400', 'B'));
    ['J', 'Q', 'K'].forEach(function (r) { E.SUITS.forEach(function (s) { raster('f:' + r + s, 22, 26, faceSvg(r, s)); }); });
  }
  queueAll();
  window.JRArt = {
    ready: Promise.all(jobs),
    url: function (k) { return cache[k] || ''; },
    suit: suitSvg, SUITCOL: SUITCOL, ART: ART, HANDCOL: HANDCOL
  };
})();
