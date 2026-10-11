// ═══════════════════════════════════════════════════════════════════════════
// Press Your Luck: drawings. All SVG drawn here: the Whammy (a grinning red imp
// in a yellow mask and cape, $ on his chest), the prize pictures
// and the Whammy scenes that play on the centre screen.
//   PYLArt.head()                    the Whammy's head (for Whammy squares)
//   PYLArt.prize(key)                a prize picture (viewBox 0 0 64 40)
//   PYLArt.PRIZES                    {r1:[...], r2:[...]} name / value / art
//   PYLArt.scene(variant, bankText)  a Whammy scene (viewBox 0 -46 240 216; the stamp sits above the action)
//   PYLArt.SCENES                    variant names
// ═══════════════════════════════════════════════════════════════════════════
var PYLArt = (function () {
  'use strict';
  var INK = '#1b1240', OL = '#140a0c', RED = '#e3262c', RED2 = '#b8141c', RED3 = '#ff5a52', YEL = '#ffe23a', YEL2 = '#e0b400';

  // ── The Whammy ─────────────────────────────────────────────────────────────
  // A grinning red imp: spiky red hair, a yellow mask, a sly wink now and then, a red bulb nose and a huge
  // square-toothed grin. Head drawn around (0,0), roughly x −46…46, y −44…30. o.soot: blackened face
  function head(o) {
    o = o || {};
    var s = '', K = ' stroke="' + OL + '" stroke-width="2.6" stroke-linejoin="round"';
    // little pointed yellow ears behind the mask
    s += '<path d="M-27-14 L-38-26 L-33-8z M27-14 L38-26 L33-8z" fill="' + YEL + '"' + K + '/>';
    // spiky red hair
    s += '<path d="M-24-18 L-32-30 L-20-28 L-22-42 L-10-31 L-6-46 L1-32 L9-45 L11-30 L22-40 L20-26 L32-29 L25-16z" fill="' + RED + '"' + K + '/>';
    // the head: wide at the grin
    s += '<path d="M0-30 C18-30 27-20 28-8 C30 4 34 12 30 20 C24 30 10 32 0 32 C-10 32-24 30-30 20 C-34 12-30 4-28-8 C-27-20-18-30 0-30z" fill="' + RED + '"' + K + '/>';
    s += '<path d="M-18-24 C-10-28 0-29 8-27" fill="none" stroke="' + RED3 + '" stroke-width="3" stroke-linecap="round" opacity=".7"/>';
    // the yellow mask across the eyes
    s += '<path d="M-29-15 C-20-21-8-20 0-17 C8-20 20-21 29-15 C30-9 26-1 18-2 C10-3 6-8 0-7 C-6-8-10-3-18-2 C-26-1-30-9-29-15z" fill="' + YEL + '"' + K + '/>';
    if (o.soot) s += '<path d="M-28 4 C-26-16-10-24 2-22 C18-20 28-8 27 8 C16 2 4 10-6 4 C-14 0-20 8-28 4z" fill="#2b2b33" opacity=".85"/>';
    // eyes: both open; now and then he winks (the page animates g-reye / g-wink; each head at its own moment)
    var wd = 'style="animation-delay:-' + (Math.random() * 7).toFixed(2) + 's"';
    s += '<g class="g-eyes"><ellipse cx="-12" cy="-11" rx="6.5" ry="7" fill="#fff" stroke="' + OL + '" stroke-width="2"/>' +
      '<circle class="g-pup" cx="-11" cy="-10" r="2.8" fill="' + OL + '"/>' +
      '<g class="g-reye" ' + wd + '><ellipse cx="12" cy="-11" rx="6.5" ry="7" fill="#fff" stroke="' + OL + '" stroke-width="2"/><circle class="g-pup" cx="13" cy="-10" r="2.8" fill="' + OL + '"/></g>' +
      '<path class="g-wink" opacity="0" ' + wd + ' d="M6-11 C9-14 15-14 18-10 M6-11 L3-13 M6-11 L3-9" fill="none" stroke="' + OL + '" stroke-width="2.4" stroke-linecap="round"/></g>';
    // the grin: wide, white, square teeth
    s += '<path d="M-29-1 C-24 26 24 26 29-1 C16 5-16 5-29-1z" fill="#fff"' + K + '/>';
    // the gaps between the teeth stop at the lips
    s += '<path d="M-23.9 9.6 C-12 13 12 13 23.9 9.6" fill="none" stroke="' + OL + '" stroke-width="1.7"/>';
    s += '<path d="M-19 3.4 L-18.6 13.6 M-9.5 4.6 L-9.4 17.8 M0 4.9 L0 19 M9.5 4.6 L9.4 17.8 M19 3.4 L18.6 13.6" stroke="' + OL + '" stroke-width="1.7" stroke-linecap="butt"/>';
    // the bulb nose
    s += '<circle cx="0" cy="-3" r="5.8" fill="' + RED + '" stroke="' + OL + '" stroke-width="2.2"/><circle cx="-1.8" cy="-4.8" r="1.6" fill="#fff" opacity=".55"/>';
    return s;
  }
  // Whole Whammy, feet at y≈0, head at y≈-92; centred on x=0. Arms are groups so scenes can swing them.
  // o.prop: html for something held in the right hand (drawn in the arm group, hand at (30,-46))
  function body(o) {
    o = o || {};
    var s = '', K = ' stroke="' + OL + '" stroke-width="2.4" stroke-linejoin="round"';
    function limb(d) { return '<path d="' + d + '" fill="none" stroke="' + OL + '" stroke-width="8" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + RED + '" stroke-width="4.6" stroke-linecap="round"/>'; }
    // the yellow cape, flaring out behind
    s += '<path d="M-22-60 C-36-48-42-26-40-10 C-31-14-23-12-16-8 L16-8 C23-12 31-14 40-10 C42-26 36-48 22-60z" fill="' + YEL + '"' + K + '/>';
    s += '<path d="M-28-40 C-32-30-34-20-34-12 M28-40 C32-30 34-20 34-12" fill="none" stroke="' + YEL2 + '" stroke-width="1.8" opacity=".8"/>';
    // legs, one crossed over the other, and pointed red shoes
    s += limb('M-6-16 C-6-10 4-7 6 0') + limb('M6-16 C8-10-2-6-6-1');
    s += '<path d="M2 0 C6-3 14-3 19 1 C14 2 8 3 2 3z M-2-1 C-7-4-15-4-20 0 C-15 1-8 2-2 2z" fill="' + RED + '"' + K + '/>';
    // left arm (behind the body), hand on the hip or waving
    s += '<g class="g-arml">' + limb('M-22-48 C-31-46-32-36-25-30') + '<path d="M-25-30 l-4 3 M-25-30 l1 4" stroke="' + OL + '" stroke-width="2" stroke-linecap="round"/></g>';
    // a lean bean of a body with the yellow $ patch
    s += '<path d="M-24-61 C-26-46-23-26-15-16 C-8-12 8-12 15-16 C23-26 26-46 24-61z" fill="' + RED + '" stroke="' + OL + '" stroke-width="2.6"/>';
    // right arm (in front), holds the prop; pointed fingers
    s += '<g class="g-armr">' + limb('M22-50 C27-51 29-49 31-46') + (o.prop || '') +
      '<path d="M29-48 L37-50 M30-45 L37-43 M30-46 L38-46" stroke="' + OL + '" stroke-width="4.2" stroke-linecap="round"/><path d="M29-48 L37-50 M30-45 L37-43 M30-46 L38-46" stroke="' + RED + '" stroke-width="2" stroke-linecap="round"/></g>';
    // the head goes straight into the body: no chin line across the chest (the patch moves with the head)
    s += '<g class="g-head" transform="translate(0 -80) scale(1 .9)">' + head(o) +
      '<path d="M-22.6 20.5 L22.6 20.5 C23.6 28 24.4 34 24.6 40 L-24.6 40 C-24.4 34-23.6 28-22.6 20.5z" fill="' + RED + '"/></g>';
    // the big yellow chest patch right under the grin, with a chunky white double-barred $
    s += '<path d="M-19-58.5 C-8-56.5 8-56.5 19-58.5 C18.5-46 17-34 14-27 C12-24 9-23 0-23 C-9-23-12-24-14-27 C-17-34-18.5-46-19-58.5z" fill="' + YEL + '" stroke="' + OL + '" stroke-width="2.2" stroke-linejoin="round"/>';
    var dl = 'M-2.2-55 L-2.2-26.5 M3.2-55 L3.2-26.5', ds = 'M9.5-48.5 C7-53-1-54.5-5.5-52 C-11-49-9.5-43-2-41.2 C6-39.5 10-36 7.5-31 C5-26.5-4-26.5-9.5-31';
    s += '<path d="' + dl + '" stroke="' + OL + '" stroke-width="5.6" stroke-linecap="round"/><path d="' + ds + '" fill="none" stroke="' + OL + '" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<path d="' + dl + '" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="' + ds + '" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<circle cx="-5.2" cy="-47" r="1.3" fill="' + OL + '"/>';
    return s;
  }
  function headSVG(cls) {
    return '<svg class="' + (cls || 'g-sq') + '" viewBox="-50 -48 100 80" aria-hidden="true">' + head() + '</svg>';
  }

  // ── Prize pictures (viewBox 0 0 64 40) ────────────────────────────────────
  var K = ' stroke="' + INK + '" stroke-width="1.3" stroke-linejoin="round"';
  var ART = {
    car: '<path d="M4 29 C4 23 8 21 14 20 L22 13 C24 11 27 10 31 10 L42 10 C46 10 48 12 51 15 L55 20 C59 21 61 23 61 27 L61 29z" fill="#ff3b55"' + K + '/><path d="M24 14.5 C25.5 13 27 12.5 30 12.5 L35 12.5 L35 19 L19 19z M37.5 12.5 L42 12.5 C45 12.5 46.5 14 48.5 16.5 L50.5 19 L37.5 19z" fill="#9fe2ff"' + K + '/><path d="M6 24 L59 24" stroke="#fff" stroke-width="1.6" opacity=".6"/><circle cx="17" cy="29" r="5.5" fill="#2a2440"' + K + '/><circle cx="48" cy="29" r="5.5" fill="#2a2440"' + K + '/><circle cx="17" cy="29" r="2.2" fill="#d6dbe6"/><circle cx="48" cy="29" r="2.2" fill="#d6dbe6"/><path d="M57 22 L61 22" stroke="#ffe066" stroke-width="2.2" stroke-linecap="round"/>',
    boat: '<path d="M2 32 C10 29 14 35 22 32 C30 29 34 35 42 32 C50 29 54 35 62 32 L62 40 L2 40z" fill="#2d7dff"/><path d="M6 25 L56 25 C55 30 51 33 46 33 L14 33 C10 33 7 30 6 25z" fill="#ffffff"' + K + '/><path d="M8.5 29 L53 29" stroke="#ff3b55" stroke-width="2.4"/><path d="M20 25 L26 17 L42 17 L46 25z" fill="#9fe2ff"' + K + '/><path d="M32 17 L32 25" stroke="' + INK + '" stroke-width="1.2"/><path d="M44 17 L50 12" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>',
    trip: '<rect x="0" y="0" width="64" height="40" rx="3" fill="#ffb347"/><circle cx="46" cy="14" r="8" fill="#fff07a"/><path d="M0 30 C12 27 22 33 34 30 C46 27 54 32 64 29 L64 40 L0 40z" fill="#22b5c9"/><path d="M8 36 C16 31 30 31 40 36z" fill="#ffe0a0"' + K + '/><path d="M22 34 C22 26 21 20 19 14" fill="none" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round"/><path d="M19 14 C14 10 8 11 6 14 C11 12 15 13 19 14 C16 8 11 6 7 7 C12 8 16 11 19 14 C21 8 26 6 31 8 C26 9 22 11 19 14 C24 11 30 12 32 16 C27 14 23 14 19 14z" fill="#2fb84f"' + K + '/><path d="M44 5 L52 7 L48 8 L54 10 L47 9.5 L45 12 L44.5 9 L40 8z" fill="#ffffff"' + K + '/>',
    ski: '<rect x="0" y="0" width="64" height="40" rx="3" fill="#7cc8ff"/><path d="M0 36 L16 12 L26 24 L38 6 L64 36z" fill="#5a6fb0"' + K + '/><path d="M12 18 L16 12 L20 17 L17 16 L15 19z M33 13 L38 6 L43 13 L40 12 L38 15 L36 12z" fill="#fff"/><path d="M0 40 L0 33 C14 30 28 35 40 32 C50 30 58 31 64 33 L64 40z" fill="#fff"' + K + '/><path d="M50 30 L54 22 L58 30z M51 26 L54 19 L57 26z" fill="#1f7a4a"' + K + '/><path d="M14 38 L30 30 M18 38 L34 30" stroke="#ff3b55" stroke-width="1.8" stroke-linecap="round"/>',
    tv: '<rect x="6" y="5" width="52" height="30" rx="3" fill="#a0612f"' + K + '/><rect x="10" y="8.5" width="34" height="23" rx="4" fill="#20183f"' + K + '/><path d="M13 11 L41 11 L41 29 L13 29z" fill="#20183f"/><g><rect x="13" y="11" width="4" height="13" fill="#fff"/><rect x="17" y="11" width="4" height="13" fill="#ffe066"/><rect x="21" y="11" width="4" height="13" fill="#4fe3e3"/><rect x="25" y="11" width="4" height="13" fill="#4fdd6a"/><rect x="29" y="11" width="4" height="13" fill="#e04fe0"/><rect x="33" y="11" width="4" height="13" fill="#ff3b55"/><rect x="37" y="11" width="4" height="13" fill="#2d6bff"/><rect x="13" y="24" width="28" height="5" fill="#2a2440"/></g><circle cx="51" cy="13" r="2.6" fill="#ffd23d"' + K + '/><circle cx="51" cy="20" r="2.6" fill="#ffd23d"' + K + '/><path d="M47 25 L55 25 M47 28 L55 28" stroke="' + INK + '" stroke-width="1.2"/><path d="M12 35 L10 39 M52 35 L54 39" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>',
    jukebox: '<path d="M18 38 L18 14 C18 5 25 1 32 1 C39 1 46 5 46 14 L46 38z" fill="#c2552a"' + K + '/><path d="M21 22 L21 15 C21 8 26 4 32 4 C38 4 43 8 43 15 L43 22z" fill="#ff5c9a"' + K + '/><path d="M24 22 L24 16 C24 11 27.5 7 32 7 C36.5 7 40 11 40 16 L40 22z" fill="#ffe066"/><path d="M27 22 L27 17 C27 13.5 29 10.5 32 10.5 C35 10.5 37 13.5 37 17 L37 22z" fill="#4fe3e3"/><rect x="22" y="23" width="20" height="7" rx="1" fill="#fff2c4"' + K + '/><path d="M25 25 L39 25 M25 27.5 L39 27.5" stroke="#c2552a" stroke-width=".8"/><rect x="22" y="31.5" width="20" height="5" rx="1" fill="#3a2a6a"/><circle cx="27" cy="34" r="1" fill="#ffe066"/><circle cx="32" cy="34" r="1" fill="#ffe066"/><circle cx="37" cy="34" r="1" fill="#ffe066"/>',
    piano: '<path d="M6 20 C6 12 12 8 20 9 L40 11 C50 12 58 14 58 20 L58 24 L6 24z" fill="#1f1a2e"' + K + '/><path d="M8 18 L48 3 L50 6 L16 19z" fill="#2c2540"' + K + '/><rect x="6" y="24" width="52" height="6" fill="#2c2540"' + K + '/><path d="M8 24 L56 24 L56 27.5 L8 27.5z" fill="#fff"/><path d="M11 24 v2.2 M14 24 v2.2 M20 24 v2.2 M23 24 v2.2 M26 24 v2.2 M32 24 v2.2 M35 24 v2.2 M41 24 v2.2 M44 24 v2.2 M47 24 v2.2 M53 24 v2.2" stroke="' + INK + '" stroke-width="1.4"/><path d="M10 30 L10 38 M54 30 L54 38 M40 30 L40 37" stroke="#1f1a2e" stroke-width="2.6" stroke-linecap="round"/><path d="M22 20 L44 20" stroke="#ffd23d" stroke-width="1" opacity=".7"/>',
    ring: '<ellipse cx="32" cy="27" rx="15" ry="10" fill="none" stroke="#ffc933" stroke-width="5"/><ellipse cx="32" cy="27" rx="15" ry="10" fill="none" stroke="#a37a0a" stroke-width="1" opacity=".6"/><path d="M24 12 L28 7 L36 7 L40 12 L32 21z" fill="#bff3ff"' + K + '/><path d="M24 12 L40 12 M28 7 L30 12 L32 21 L34 12 L36 7" fill="none" stroke="' + INK + '" stroke-width=".9"/><path d="M48 6 L49.4 9.6 L53 11 L49.4 12.4 L48 16 L46.6 12.4 L43 11 L46.6 9.6z M14 8 L15 10 L17 11 L15 12 L14 14 L13 12 L11 11 L13 10z" fill="#fff"/>',
    moto: '<circle cx="14" cy="28" r="8" fill="none" stroke="#2a2440" stroke-width="4"/><circle cx="50" cy="28" r="8" fill="none" stroke="#2a2440" stroke-width="4"/><circle cx="14" cy="28" r="2" fill="#d6dbe6"/><circle cx="50" cy="28" r="2" fill="#d6dbe6"/><path d="M14 28 L24 18 L40 18 L50 28" fill="none" stroke="#8a90a0" stroke-width="2.6"/><path d="M22 18 C24 12 30 11 36 13 L40 18z" fill="#2d6bff"' + K + '/><path d="M26 22 L38 22 L36 28 L28 28z" fill="#8a90a0"' + K + '/><path d="M38 14 L44 10 L48 11" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/><path d="M16 18 L24 16" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><circle cx="46" cy="14" r="1.8" fill="#ffe066"/>',
    hottub: '<path d="M8 22 L56 22 L53 37 L11 37z" fill="#b5703a"' + K + '/><path d="M11 26 L53 26 M10 30 L54 30 M9.5 34 L54.5 34" stroke="#7d4a20" stroke-width="1"/><ellipse cx="32" cy="22" rx="24" ry="4" fill="#4fe3e3"' + K + '/><circle cx="22" cy="20" r="2" fill="#fff"/><circle cx="34" cy="19" r="2.6" fill="#fff"/><circle cx="44" cy="20.5" r="1.6" fill="#fff"/><path d="M20 15 C18 11 22 9 20 5 M32 14 C30 10 34 8 32 3 M44 15 C42 11 46 9 44 5" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>',
    arcade: '<path d="M20 38 L20 8 L24 2 L42 2 L46 8 L46 38z" fill="#5b2bd6"' + K + '/><rect x="23" y="3.5" width="20" height="4" rx="1" fill="#ffe066"/><rect x="23" y="10" width="20" height="13" rx="1.5" fill="#101830"' + K + '/><circle cx="29" cy="16" r="2.4" fill="#ffe066"/><path d="M29 16 L32 14.3 L32 17.7z" fill="#101830"/><circle cx="36" cy="14" r=".9" fill="#fff"/><circle cx="39" cy="14" r=".9" fill="#fff"/><path d="M20 26 L46 26 L46 30 L20 30z" fill="#ff5c9a"' + K + '/><path d="M27 26 L27 23" stroke="' + INK + '" stroke-width="1.6"/><circle cx="27" cy="22.6" r="1.6" fill="#ff3b55"/><circle cx="36" cy="28" r="1.3" fill="#ffe066"/><circle cx="40" cy="28" r="1.3" fill="#4fe3e3"/><rect x="29" y="32" width="8" height="3" rx="1" fill="#2a1460"/>',
    bikes: '<g fill="none" stroke-width="2.2"><circle cx="11" cy="29" r="7" stroke="#2a2440"/><circle cx="29" cy="29" r="7" stroke="#2a2440"/><path d="M11 29 L17 19 L26 19 L29 29 M17 19 L20 29 L26 19 M15 16 L19 16 M26 19 L27 15 L30 15" stroke="#ff3b55"/><circle cx="36" cy="29" r="7" stroke="#2a2440"/><circle cx="54" cy="29" r="7" stroke="#2a2440"/><path d="M36 29 L42 19 L51 19 L54 29 M42 19 L45 29 L51 19 M40 16 L44 16 M51 19 L52 15 L55 15" stroke="#2d9cff"/></g>',
    camper: '<rect x="4" y="9" width="44" height="22" rx="4" fill="#fff6e2"' + K + '/><path d="M48 15 L55 15 C58 15 60 19 60 23 L60 31 L48 31z" fill="#fff6e2"' + K + '/><path d="M50 17 L55 17 C56.5 17 58 19 58 22 L50 22z" fill="#9fe2ff"' + K + '/><path d="M4 22 L60 22" stroke="#ff8a3d" stroke-width="3"/><path d="M4 26 L60 26" stroke="#b5703a" stroke-width="2"/><rect x="9" y="12" width="9" height="6" rx="1" fill="#9fe2ff"' + K + '/><rect x="22" y="12" width="9" height="6" rx="1" fill="#9fe2ff"' + K + '/><rect x="36" y="12" width="7" height="15" rx="1" fill="#e9dcc0"' + K + '/><circle cx="16" cy="32" r="4.6" fill="#2a2440"' + K + '/><circle cx="51" cy="32" r="4.6" fill="#2a2440"' + K + '/><circle cx="16" cy="32" r="1.6" fill="#d6dbe6"/><circle cx="51" cy="32" r="1.6" fill="#d6dbe6"/>',
    stereo: '<path d="M22 12 C22 6 26 4 32 4 C38 4 42 6 42 12" fill="none" stroke="#8a90a0" stroke-width="2.4"/><rect x="6" y="11" width="52" height="25" rx="4" fill="#c9ced8"' + K + '/><circle cx="17" cy="25" r="7.5" fill="#2a2440"' + K + '/><circle cx="47" cy="25" r="7.5" fill="#2a2440"' + K + '/><circle cx="17" cy="25" r="3" fill="#8a90a0"/><circle cx="47" cy="25" r="3" fill="#8a90a0"/><rect x="26" y="19" width="12" height="8" rx="1" fill="#20183f"' + K + '/><circle cx="29.5" cy="23" r="1.8" fill="none" stroke="#ffe066" stroke-width="1"/><circle cx="34.5" cy="23" r="1.8" fill="none" stroke="#ffe066" stroke-width="1"/><rect x="26" y="14" width="12" height="3" rx="1" fill="#ff5c9a"/><path d="M27 31 h2 M31 31 h2 M35 31 h2" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>',
    clock: '<path d="M24 38 L24 12 C24 6 27 3 32 3 C37 3 40 6 40 12 L40 38z" fill="#8a4b22"' + K + '/><circle cx="32" cy="12" r="6" fill="#fff6e2"' + K + '/><path d="M32 12 L32 8.5 M32 12 L34.5 13.5" stroke="' + INK + '" stroke-width="1.2" stroke-linecap="round"/><rect x="27" y="20" width="10" height="14" rx="1.5" fill="#3a1e0c"' + K + '/><path d="M32 20 L32 29" stroke="#ffc933" stroke-width="1.2"/><circle cx="32" cy="30" r="2.6" fill="#ffc933"/><path d="M22 38 L42 38" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>',
    grill: '<path d="M14 18 C14 30 50 30 50 18z" fill="#2a2440"' + K + '/><path d="M12 18 L52 18" stroke="#8a90a0" stroke-width="2.4" stroke-linecap="round"/><path d="M18 18 C22 10 42 10 46 18" fill="#2a2440"' + K + ' opacity=".9" transform="translate(0 -4) rotate(-12 32 14)"/><path d="M24 26 L18 38 M40 26 L46 38 M32 28 L32 38" stroke="#8a90a0" stroke-width="2" stroke-linecap="round"/><path d="M24 15 C23 12 26 11 25 8 M32 15 C31 12 34 11 33 7 M40 15 C39 12 42 11 41 8" fill="none" stroke="#ff8a3d" stroke-width="1.6" stroke-linecap="round"/>'
  };
  function prize(k) {
    return '<svg class="pz-art" viewBox="0 0 64 40" aria-hidden="true">' + (ART[k] || ART.tv) + '</svg>';
  }
  // Prizes by round: [art key, name, value]
  var PRIZES = {
    r1: [['stereo', 'Stereo boombox', 1150], ['jukebox', 'Jukebox', 2400], ['tv', 'Big-screen TV', 2850], ['arcade', 'Arcade machine', 2100],
      ['bikes', 'His and hers bikes', 1280], ['grill', 'Patio grill set', 1050], ['clock', 'Grandfather clock', 2600], ['trip', 'Trip to Mexico', 2950]],
    r2: [['car', 'Sports car', 9450], ['boat', 'Speedboat', 7800], ['trip', 'Trip to Hawaii', 5200], ['ski', 'Ski trip to Aspen', 4300],
      ['piano', 'Baby grand piano', 6750], ['ring', 'Diamond ring', 4950], ['moto', 'Motorcycle', 3850], ['hottub', 'Hot tub', 3400], ['camper', 'Camper', 8600]]
  };

  // ── Whammy scenes (viewBox 0 -46 240 216) ──────────────────────────────────
  // Each scene is a little cartoon about 2.8 s long; CSS keyframes (in the page) drive the classes.
  function bankText(t, cls) {
    return '<text class="' + (cls || 'w-bank') + '" x="120" y="96" text-anchor="middle" font-family="Jersey 10, monospace" font-size="54" fill="#ffd23d" stroke="#7a4a00" stroke-width="1.2">' + t + '</text>';
  }
  function bill(x, y, r, cls, d) {
    // --tx/--ty: how far to fly to reach the vacuum nozzle (at 132,122 once he has rolled in)
    return '<g class="' + cls + '" style="--d:' + d + 's;--tx:' + (132 - x) + 'px;--ty:' + (122 - y) + 'px"><g transform="translate(' + x + ' ' + y + ') rotate(' + r + ')"><rect x="-13" y="-7" width="26" height="14" rx="2" fill="#7fd36b" stroke="#2c6a1f" stroke-width="1.4"/><circle cx="0" cy="0" r="4.2" fill="#c7f0b0" stroke="#2c6a1f" stroke-width="1"/><text x="0" y="2.6" text-anchor="middle" font-size="7" font-family="Bungee, sans-serif" fill="#2c6a1f">$</text></g></g>';
  }
  function moneyBag(x, y, cls) {
    return '<g class="' + (cls || '') + '"><g transform="translate(' + x + ' ' + y + ')"><path d="M-8-30 L8-30 L4-22 C20-16 24 2 18 10 C12 16-12 16-18 10 C-24 2-20-16-4-22z" fill="#d9b26a" stroke="#6a4a14" stroke-width="2" stroke-linejoin="round"/><path d="M-9-22 L9-22" stroke="#6a4a14" stroke-width="3" stroke-linecap="round"/><text x="0" y="6" text-anchor="middle" font-family="Bungee, sans-serif" font-size="17" fill="#6a4a14">$</text></g></g>';
  }
  function puff(x, y, r, cls, d) {
    return '<g class="' + cls + '" style="--d:' + d + 's"><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#f4f0ff"/><circle cx="' + (x - r * .8) + '" cy="' + (y + r * .3) + '" r="' + r * .7 + '" fill="#e6e0ff"/><circle cx="' + (x + r * .8) + '" cy="' + (y + r * .25) + '" r="' + r * .75 + '" fill="#ece6ff"/></g>';
  }
  var SCENES = ['eraser', 'bomb', 'vacuum', 'hat', 'mallet'];
  function scene(v, bank) {
    var s = '<svg class="wscene w-' + v + '" viewBox="0 -46 240 216" aria-hidden="true">';
    s += '<rect class="w-flash" x="-200" y="-200" width="640" height="600" fill="#ff2b4a"/>';
    if (v === 'eraser') {
      s += bankText(bank, 'w-bank w-erase');
      s += '<g class="w-crumbs"><rect x="150" y="104" width="5" height="3" fill="#ff9ec0"/><rect x="120" y="108" width="4" height="3" fill="#ff9ec0"/><rect x="90" y="104" width="5" height="3" fill="#ff9ec0"/><rect x="70" y="110" width="4" height="3" fill="#ff9ec0"/></g>';
      var eraser = '<g transform="translate(31 -46) rotate(-20)"><rect x="-6" y="-34" width="22" height="36" rx="4" fill="#ff9ec0" stroke="#8a2050" stroke-width="2"/><rect x="-6" y="-34" width="22" height="12" rx="3" fill="#4a7dff" stroke="#1f3a8a" stroke-width="2"/></g>';
      s += '<g class="w-guy"><g transform="translate(0 150)">' + body({ prop: eraser }) + '</g></g>';
    } else if (v === 'bomb') {
      s += bankText(bank, 'w-bank w-gone');
      s += '<g class="w-bomb"><g transform="translate(150 118)"><circle r="22" fill="#2a2440" stroke="#0e0a1e" stroke-width="2"/><circle cx="-8" cy="-8" r="6" fill="#fff" opacity=".25"/><rect x="-6" y="-29" width="12" height="9" rx="2" fill="#5a5470"/><path d="M0-29 C2-38 10-40 14-36" fill="none" stroke="#c9a26a" stroke-width="2.4"/><g class="w-spark"><path d="M14-36 l3-7 l1 6 l6-2 l-5 4 l5 4 l-6-1 l-1 6 l-2-6 l-6 1 l5-4z" fill="#ffd23d"/></g></g></g>';
      s += '<circle class="w-boom" cx="150" cy="112" r="70" fill="#fff6c8"/>';
      s += puff(150, 112, 18, 'w-smoke', 0) + puff(120, 100, 12, 'w-smoke', .1) + puff(178, 98, 13, 'w-smoke', .2);
      s += '<g class="w-guy"><g transform="translate(64 156) scale(.95)">' + body({}) + '</g></g>';
      s += '<g class="w-soot"><g transform="translate(64 156) scale(.95)">' + body({ soot: true }) + '</g></g>';
    } else if (v === 'vacuum') {
      for (var i = 0; i < 7; i++) s += bill(160 + (i % 3) * 26, 60 + Math.floor(i / 3) * 26 + (i % 2) * 6, (i * 37) % 60 - 30, 'w-bill', (0.7 + i * 0.13).toFixed(2));
      var hose = '<g><path d="M31-46 C40-46 52-40 62-36" fill="none" stroke="#5a5470" stroke-width="6" stroke-linecap="round"/><path d="M60-42 L74-30 L68-26 L56-36z" fill="#8a90a0" stroke="#2a2440" stroke-width="2"/></g>';
      s += '<g class="w-guy"><g transform="translate(-60 156)"><rect x="-58" y="-34" width="40" height="30" rx="10" fill="#ff3d6e" stroke="#7a0f2c" stroke-width="2"/><circle cx="-50" cy="-3" r="6" fill="#2a2440"/><circle cx="-26" cy="-3" r="6" fill="#2a2440"/><path d="M-18-24 C-6-26 4-40 14-46" fill="none" stroke="#5a5470" stroke-width="5"/>' + body({ prop: hose }) + '</g></g>';
    } else if (v === 'hat') {
      s += bankText(bank, 'w-bank w-fade');
      s += moneyBag(80, 132, 'w-bag');
      s += puff(80, 116, 26, 'w-poof', 0);
      var wand = '<g class="w-wand"><path d="M31-46 L6-66" stroke="#1f1a2e" stroke-width="4" stroke-linecap="round"/><path d="M8-64 L4-68" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g>';
      s += '<g class="w-guy"><g transform="translate(170 156)">' + body({ prop: wand }) + '<g transform="translate(0 -116)"><rect x="-17" y="-26" width="34" height="26" rx="3" fill="#1f1a2e" stroke="#0e0a1e" stroke-width="1.6"/><rect x="-17" y="-9" width="34" height="5" fill="#ff3d6e"/><ellipse cx="0" cy="0" rx="26" ry="5" fill="#1f1a2e"/></g></g></g>';
      s += '<g class="w-stars"><path d="M60 80 l3 7 7 3-7 3-3 7-3-7-7-3 7-3z M104 96 l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M70 136 l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd23d"/></g>';
    } else {   // mallet
      s += '<g class="w-pig"><g transform="translate(150 128)"><ellipse rx="34" ry="24" fill="#ff9ec0" stroke="#8a2050" stroke-width="2.2"/><ellipse cx="30" cy="-2" rx="8" ry="9" fill="#ff7aa8" stroke="#8a2050" stroke-width="2"/><circle cx="28" cy="-4" r="1.6" fill="#8a2050"/><circle cx="33" cy="-4" r="1.6" fill="#8a2050"/><circle cx="16" cy="-10" r="2.2" fill="#2a2440"/><path d="M8-22 L14-32 L18-20z" fill="#ff7aa8" stroke="#8a2050" stroke-width="2"/><rect x="-10" y="-25" width="14" height="3" rx="1.5" fill="#8a2050"/><path d="M-20 20 v8 M18 20 v8" stroke="#8a2050" stroke-width="5" stroke-linecap="round"/></g></g>';
      var coins = '';
      [[-40, -50], [-14, -64], [16, -60], [40, -44], [-30, -30], [30, -24]].forEach(function (c, i) {
        coins += '<g class="w-coin" style="--x:' + c[0] + 'px;--y:' + c[1] + 'px;--d:' + (i * .03).toFixed(2) + 's"><circle cx="150" cy="122" r="7" fill="#ffd23d" stroke="#a37a0a" stroke-width="1.6"/><text x="150" y="125.5" text-anchor="middle" font-size="9" font-family="Bungee, sans-serif" fill="#a37a0a">$</text></g>';
      });
      s += coins;
      s += '<g class="w-shards"><path d="M130 120 l-10 6 6 8z M164 112 l12 -2 -4 10z M150 140 l6 12 -10 -2z" fill="#ff9ec0" stroke="#8a2050" stroke-width="1.4"/></g>';
      var mallet = '<g class="w-mallet"><path d="M31-46 L31-96" stroke="#a0612f" stroke-width="5" stroke-linecap="round"/><rect x="12" y="-118" width="38" height="24" rx="5" fill="#c98a4b" stroke="#6a3a12" stroke-width="2.2"/><path d="M20-118 v24 M42-118 v24" stroke="#6a3a12" stroke-width="1.6"/></g>';
      s += '<g class="w-guy"><g transform="translate(76 156)">' + body({ prop: mallet }) + '</g></g>';
    }
    s += '<g class="w-stamp"><g transform="translate(120 -18) rotate(-6)"><rect x="-86" y="-22" width="172" height="44" rx="8" fill="#ff2b4a" stroke="#fff" stroke-width="3"/><text x="0" y="12" text-anchor="middle" font-family="Bungee, sans-serif" font-size="30" fill="#fff">WHAMMY!</text></g></g>';
    return s + '</svg>';
  }
  // Fourth Whammy: he waves goodbye under an OUT stamp
  function outScene(name) {
    return '<svg class="wscene w-out" viewBox="0 -46 240 216" aria-hidden="true"><rect class="w-flash" x="-200" y="-200" width="640" height="600" fill="#ff2b4a"/>' +
      '<g class="w-guy"><g transform="translate(120 160) scale(.95)">' + body({}) + '</g></g>' +
      '<g class="w-stamp"><g transform="translate(120 -18) rotate(-6)"><rect x="-100" y="-24" width="200" height="48" rx="8" fill="#1f1a2e" stroke="#ff2b4a" stroke-width="4"/><text x="0" y="12" text-anchor="middle" font-family="Bungee, sans-serif" font-size="26" fill="#ff2b4a">4 WHAMMIES</text></g></g></svg>';
  }
  return { head: head, headSVG: headSVG, body: body, prize: prize, PRIZES: PRIZES, ART: ART, scene: scene, outScene: outScene, SCENES: SCENES };
})();
