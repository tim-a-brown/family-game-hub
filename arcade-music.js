// Arcade background music: a tiny chiptune sequencer that plays original loops through
// a game's own AudioContext.
//
//   var M = ArcadeMusic.create({
//     key:  'breakout_music',            // localStorage on/off switch (unset: follows gn_music, default on)
//     song: ArcadeMusic.songs.breakout,
//     ctx:  function () { return ac(); }, // the game's AudioContext, or null when sound is off
//     out:  function () { return master; },
//     tempo: function () { return 1; }   // optional: speed multiplier (1 = song tempo)
//   });
//   M.tick();     // call every frame while the game is actively being played
//   M.stop(hard); // call when play stops (pause, game over, menu); a no-op when already quiet
//   M.menuItem    // { icon, label, onClick } for Kit.init({ menu })
//   M.setSong(s)  // switch to another song (e.g. per level). Starts it from the top; while playing, the
//                 // old song fades out over ~0.4s and the new one fades in. A no-op when s is already playing.
//   M.song()      // the current song object
//   M.restart()   // start the current song from the top
//
// Notes are scheduled a fraction of a second ahead, so music stops as soon as tick() does.
(function () {
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Songs: one step per eighth note. Lead and bass are MIDI notes (0 = rest); lead and bass
  // loop on their own lengths. Drums: k kick, s snare, h hat, x kick + hat, '.' nothing.
  var songs = {
    // Driving E minor arpeggios, then a tune over the same chords (Em C G D)
    breakout: {
      eighth: 0.19, leadVol: 0.04, leadLp: 2600, bassVol: 0.11, drumVol: 1,
      lead: [64, 67, 71, 67, 76, 71, 67, 71,  64, 67, 72, 67, 76, 72, 67, 72,  67, 71, 74, 71, 79, 74, 71, 74,  66, 69, 74, 69, 78, 74, 69, 66,
             76, 0, 76, 74, 76, 0, 79, 0,  76, 0, 74, 72, 71, 0, 67, 0,  74, 0, 74, 72, 74, 0, 79, 0,  78, 0, 76, 74, 78, 0, 81, 0],
      bass: [40, 52, 40, 52, 40, 52, 40, 52,  36, 48, 36, 48, 36, 48, 36, 48,  43, 55, 43, 55, 43, 55, 43, 55,  38, 50, 38, 50, 38, 50, 38, 50],
      drums: 'khshkksh'
    },
    // Bouncy C major (C Am F G), light and sunny
    flappy: {
      eighth: 0.2, leadWave: 'triangle', leadVol: 0.09, bassVol: 0.09, drumVol: 0.7,
      lead: [72, 0, 76, 0, 79, 76, 72, 0,  72, 0, 76, 0, 81, 79, 76, 0,  77, 0, 76, 74, 72, 0, 69, 0,  71, 0, 74, 0, 79, 0, 0, 0,
             84, 0, 79, 0, 76, 0, 79, 81,  84, 0, 81, 0, 76, 0, 72, 74,  77, 76, 74, 72, 77, 0, 81, 0,  79, 0, 77, 0, 74, 0, 71, 0],
      bass: [48, 0, 55, 0, 48, 0, 55, 0,  45, 0, 52, 0, 45, 0, 52, 0,  41, 0, 48, 0, 41, 0, 48, 0,  43, 0, 50, 0, 43, 0, 50, 0],
      drums: 'k.h.s.h.'
    },
    // Quirky shuffle (G E7 Am D7) for the cube pyramid
    qbert: {
      eighth: 0.17, swing: 0.3, leadVol: 0.045, leadLp: 3000, bassVol: 0.1, drumVol: 0.9,
      lead: [67, 71, 74, 0, 79, 0, 78, 79,  80, 0, 76, 0, 74, 0, 71, 0,  72, 76, 81, 0, 79, 0, 76, 0,  78, 0, 74, 0, 72, 0, 69, 0,
             79, 0, 79, 81, 83, 0, 79, 0,  80, 0, 80, 81, 83, 0, 80, 0,  81, 0, 79, 76, 72, 0, 76, 0,  74, 0, 78, 0, 81, 0, 0, 0],
      bass: [43, 0, 50, 0, 43, 0, 50, 0,  40, 0, 47, 0, 40, 0, 47, 0,  45, 0, 52, 0, 45, 0, 52, 0,  38, 0, 45, 0, 38, 0, 45, 0],
      drums: 'khshkhsh'
    },
    // Cool, sparse D minor synth (Dm Bb C Am)
    pong: {
      eighth: 0.23, leadVol: 0.04, leadLp: 1700, echo: 0.35, bassWave: 'square', bassLp: 500, bassVol: 0.08, drumVol: 0.7,
      lead: [74, 0, 0, 77, 0, 0, 81, 0,  0, 0, 77, 0, 74, 0, 70, 0,  72, 0, 0, 76, 0, 0, 79, 0,  0, 0, 76, 0, 72, 0, 69, 0,
             81, 0, 0, 79, 77, 0, 74, 0,  77, 0, 0, 74, 70, 0, 74, 0,  76, 0, 0, 79, 84, 0, 79, 0,  76, 0, 0, 72, 69, 0, 0, 0],
      bass: [38, 38, 50, 38, 38, 38, 50, 38,  34, 34, 46, 34, 34, 34, 46, 34,  36, 36, 48, 36, 36, 36, 48, 36,  33, 33, 45, 33, 33, 33, 45, 33],
      drums: 'k.h.s.h.'
    },
    // Upbeat, hoppy G major for Crossy Road (G Em C D), bright square lead over a bouncing bass
    crossy: {
      eighth: 0.16, leadVol: 0.04, leadLp: 3200, bassVol: 0.1, drumVol: 0.85,
      lead: [67, 0, 71, 74, 79, 0, 74, 71,  76, 0, 74, 71, 67, 0, 71, 0,  72, 0, 76, 79, 84, 0, 79, 76,  74, 0, 78, 81, 78, 0, 74, 0,
             79, 79, 0, 81, 83, 0, 81, 79,  76, 0, 79, 0, 83, 81, 79, 76,  72, 76, 79, 0, 81, 0, 79, 76,  74, 0, 72, 0, 71, 0, 69, 0],
      bass: [43, 0, 50, 0, 43, 43, 50, 0,  40, 0, 47, 0, 40, 40, 47, 0,  36, 0, 43, 0, 36, 36, 43, 0,  38, 0, 45, 0, 38, 38, 45, 0],
      drums: 'khshkhsh'
    },
  };

  // Peggle: one gentle loop per level, in the order of the game's LEVELS (songs.peggle is level 1).
  songs.peggleLevels = [
    // 1 First Light (dawn): G major (G D Em C), slow sunrise arpeggios, glassy triangle, no drums
    {
      eighth: 0.26, leadWave: 'triangle', leadVol: 0.085, leadLen: 1.5, echo: 0.25, bassWave: 'sine', bassVol: 0.12, bassLen: 3.6, drumVol: 0,
      lead: [67, 0, 71, 0, 74, 0, 79, 0,  78, 0, 74, 0, 69, 0, 74, 76,  79, 0, 76, 0, 71, 0, 76, 0,  76, 74, 72, 0, 67, 0, 0, 0,
             79, 0, 0, 81, 83, 0, 79, 0,  81, 0, 78, 0, 74, 0, 76, 78,  79, 0, 0, 76, 74, 0, 71, 0,  72, 0, 76, 0, 74, 0, 0, 0],
      bass: [43, 0, 0, 0, 50, 0, 0, 0,  38, 0, 0, 0, 45, 0, 0, 0,  40, 0, 0, 0, 47, 0, 0, 0,  36, 0, 0, 0, 43, 0, 0, 0],
      drums: ''
    },
    // 2 Rainbow Arches (sunset sea): Eb major (Eb Cm Ab Bb), lilting swing, soft sine lead, lapping drums
    {
      eighth: 0.24, swing: 0.33, leadWave: 'sine', leadVol: 0.085, leadLen: 1.3, echo: 0.35, bassVol: 0.1, bassLen: 1.6, drumVol: 0.35,
      lead: [70, 0, 75, 0, 79, 0, 77, 75,  72, 0, 0, 75, 79, 0, 0, 0,  72, 0, 77, 0, 80, 0, 79, 77,  79, 0, 0, 0, 77, 0, 0, 0,
             82, 0, 79, 0, 75, 0, 79, 82,  84, 0, 0, 82, 79, 0, 75, 0,  80, 0, 79, 0, 77, 0, 72, 0,  74, 0, 77, 0, 70, 0, 0, 0],
      bass: [39, 0, 46, 0, 51, 0, 46, 0,  36, 0, 43, 0, 48, 0, 43, 0,  44, 0, 51, 0, 48, 0, 51, 0,  34, 0, 41, 0, 46, 0, 41, 0],
      drums: 'k..h..h.'
    },
    // 3 Spiral (starry night): A minor music-box lullaby (Am F C G Am F Dm E), spiralling arpeggios, no drums
    {
      eighth: 0.3, leadWave: 'triangle', leadVol: 0.1, leadLen: 0.9, echo: 0.4, bassWave: 'sine', bassVol: 0.12, bassLen: 3.6, drumVol: 0,
      lead: [76, 0, 72, 0, 69, 0, 72, 76,  77, 0, 72, 0, 69, 0, 65, 0,  72, 0, 76, 0, 79, 0, 76, 72,  74, 0, 71, 0, 67, 0, 0, 0,
             81, 0, 79, 76, 72, 0, 76, 0,  77, 0, 76, 72, 69, 0, 72, 0,  74, 0, 77, 0, 81, 0, 77, 74,  71, 0, 68, 0, 64, 0, 0, 0],
      bass: [45, 0, 0, 0, 52, 0, 0, 0,  41, 0, 0, 0, 48, 0, 0, 0,  36, 0, 0, 0, 43, 0, 0, 0,  43, 0, 0, 0, 50, 0, 0, 0,
             45, 0, 0, 0, 52, 0, 0, 0,  41, 0, 0, 0, 48, 0, 0, 0,  38, 0, 0, 0, 45, 0, 0, 0,  40, 0, 0, 0, 47, 0, 0, 0],
      drums: ''
    },
    // 4 Bubbles (aurora): E major pentatonic (E C#m A B), bouncy staccato sine bubbles, light kit
    {
      eighth: 0.2, leadWave: 'sine', leadVol: 0.11, leadLen: 0.55, echo: 0.3, bassVol: 0.13, bassLen: 0.8, drumVol: 0.4,
      lead: [76, 80, 83, 0, 88, 0, 83, 0,  85, 0, 80, 0, 76, 0, 73, 0,  73, 76, 81, 0, 85, 0, 81, 0,  83, 0, 78, 0, 75, 0, 71, 0,
             80, 0, 80, 83, 88, 0, 0, 0,  85, 0, 83, 80, 76, 0, 80, 0,  81, 0, 80, 0, 78, 0, 76, 0,  78, 0, 75, 0, 78, 0, 0, 0],
      bass: [40, 0, 47, 0, 52, 0, 47, 0,  37, 0, 44, 0, 49, 0, 44, 0,  33, 0, 40, 0, 45, 0, 40, 0,  35, 0, 42, 0, 47, 0, 42, 0],
      drums: 'k.h.k.hh'
    },
    // 5 Hourglass (dunes): D minor (Dm C Bb A), lazy camel-walk swing, mellow filtered square
    {
      eighth: 0.21, swing: 0.28, leadVol: 0.06, leadLp: 1800, bassVol: 0.14, drumVol: 0.45,
      lead: [74, 0, 77, 76, 74, 0, 69, 0,  72, 0, 76, 74, 72, 0, 67, 0,  70, 0, 74, 72, 70, 0, 74, 77,  76, 0, 73, 0, 69, 0, 0, 0,
             81, 0, 0, 77, 79, 81, 77, 74,  79, 0, 0, 76, 79, 0, 76, 72,  77, 0, 74, 0, 70, 0, 74, 77,  76, 0, 73, 0, 76, 0, 0, 0],
      bass: [38, 0, 45, 0, 50, 0, 45, 0,  36, 0, 43, 0, 48, 0, 43, 0,  34, 0, 41, 0, 46, 0, 41, 0,  33, 0, 40, 0, 45, 0, 40, 0],
      drums: 'k..hs..h'
    },
    // 6 Diamonds (forest): C major waltz in 3/4 (6 steps a bar), oom-pah-pah bass, 16 bars
    {
      eighth: 0.21, leadWave: 'triangle', leadVol: 0.1, leadLen: 1.1, echo: 0.2, bassVol: 0.13, drumVol: 0.35,
      lead: [72, 0, 76, 0, 79, 0,  81, 0, 0, 79, 76, 0,  77, 0, 81, 0, 84, 0,  83, 0, 0, 0, 79, 0,
             76, 0, 79, 0, 84, 0,  84, 0, 83, 81, 76, 0,  77, 0, 81, 0, 79, 77,  74, 0, 0, 0, 71, 0,
             72, 0, 77, 0, 81, 0,  79, 0, 0, 77, 74, 0,  76, 0, 79, 0, 83, 0,  81, 0, 0, 79, 76, 0,
             77, 0, 74, 0, 77, 81,  79, 0, 74, 0, 71, 74,  72, 0, 0, 0, 0, 0,  0, 0, 67, 0, 71, 0],
      bass: [36, 0, 43, 0, 48, 0,  33, 0, 40, 0, 45, 0,  41, 0, 48, 0, 53, 0,  43, 0, 50, 0, 55, 0,
             36, 0, 43, 0, 48, 0,  33, 0, 40, 0, 45, 0,  38, 0, 45, 0, 50, 0,  43, 0, 50, 0, 55, 0,
             41, 0, 48, 0, 53, 0,  43, 0, 50, 0, 55, 0,  40, 0, 47, 0, 52, 0,  33, 0, 40, 0, 45, 0,
             38, 0, 45, 0, 50, 0,  43, 0, 50, 0, 55, 0,  36, 0, 43, 0, 48, 0,  36, 0, 43, 0, 48, 0],
      drums: 'k.h.h.'
    },
    // 7 Twin Peaks (mountains): Bb major (Bb F Eb Bb Gm Eb F Bb), yodelling octave leaps, gentle march
    {
      eighth: 0.23, leadVol: 0.07, leadLp: 2000, leadLen: 0.8, echo: 0.25, bassVol: 0.14, drumVol: 0.4,
      lead: [70, 0, 82, 0, 77, 0, 74, 0,  72, 0, 84, 0, 81, 0, 77, 0,  79, 0, 82, 0, 79, 0, 75, 0,  77, 0, 74, 0, 70, 0, 0, 0,
             79, 0, 79, 82, 86, 0, 82, 0,  84, 0, 82, 79, 75, 0, 79, 0,  77, 0, 81, 0, 84, 0, 81, 77,  82, 0, 0, 0, 70, 0, 0, 0],
      bass: [34, 0, 41, 0, 34, 0, 41, 0,  41, 0, 48, 0, 41, 0, 48, 0,  39, 0, 46, 0, 39, 0, 46, 0,  34, 0, 41, 0, 34, 0, 41, 0,
             43, 0, 50, 0, 43, 0, 50, 0,  39, 0, 46, 0, 39, 0, 46, 0,  41, 0, 48, 0, 41, 0, 48, 0,  34, 0, 41, 0, 34, 0, 41, 0],
      drums: 'k.h.s.h.'
    },
    // 8 The Wheel (deep sea): B Dorian (Bm E Bm E D A E E), slow floating sine with long echoes, soft pulse
    {
      eighth: 0.29, leadWave: 'sine', leadVol: 0.08, leadLen: 1.8, echo: 0.4, bassWave: 'sine', bassVol: 0.11, bassLen: 3.8, drumVol: 0.35,
      lead: [78, 0, 0, 0, 74, 0, 71, 0,  73, 0, 76, 0, 80, 0, 0, 0,  78, 0, 0, 81, 78, 0, 74, 0,  76, 0, 80, 0, 76, 0, 0, 0,
             74, 0, 78, 0, 81, 0, 86, 0,  85, 0, 0, 81, 76, 0, 0, 0,  80, 0, 81, 0, 83, 0, 80, 0,  76, 0, 0, 0, 73, 0, 0, 0],
      bass: [35, 0, 0, 0, 42, 0, 0, 0,  40, 0, 0, 0, 47, 0, 0, 0,  35, 0, 0, 0, 42, 0, 0, 0,  40, 0, 0, 0, 47, 0, 0, 0,
             38, 0, 0, 0, 45, 0, 0, 0,  33, 0, 0, 0, 40, 0, 0, 0,  40, 0, 0, 0, 47, 0, 0, 0,  40, 0, 0, 0, 47, 0, 0, 0],
      drums: 'k...h...'
    },
    // 9 Sliders (canyon): A Mixolydian (A G D A A G D E), quick galloping western, bright filtered square
    {
      eighth: 0.17, leadVol: 0.07, leadLp: 2400, leadLen: 0.75, bassVol: 0.14, bassLen: 0.7, drumVol: 0.5,
      lead: [76, 0, 76, 78, 81, 0, 76, 0,  79, 0, 74, 0, 71, 0, 74, 0,  78, 0, 74, 0, 69, 0, 74, 78,  76, 0, 73, 0, 69, 0, 0, 0,
             81, 0, 81, 83, 85, 0, 81, 0,  83, 0, 79, 0, 74, 0, 79, 83,  81, 0, 78, 0, 74, 0, 78, 81,  80, 0, 76, 0, 71, 0, 0, 0],
      bass: [45, 0, 45, 52, 45, 0, 45, 52,  43, 0, 43, 50, 43, 0, 43, 50,  38, 0, 38, 45, 38, 0, 38, 45,  45, 0, 45, 52, 45, 0, 45, 52,
             45, 0, 45, 52, 45, 0, 45, 52,  43, 0, 43, 50, 43, 0, 43, 50,  38, 0, 38, 45, 38, 0, 38, 45,  40, 0, 40, 47, 40, 0, 40, 47],
      drums: 'k.hhs.hh'
    },
    // 10 Orbits (nebula): Ab Lydian (Ab Bb Cm Bb Ab Bb Eb Eb), circling arpeggios, soft filtered saw, no drums
    {
      eighth: 0.25, leadWave: 'sawtooth', leadVol: 0.085, leadLp: 1600, leadLen: 1.4, echo: 0.35, bassWave: 'sine', bassVol: 0.11, bassLen: 3.6, drumVol: 0,
      lead: [72, 0, 75, 0, 79, 0, 75, 0,  74, 0, 77, 0, 82, 0, 77, 0,  75, 0, 79, 0, 84, 0, 79, 0,  82, 0, 0, 77, 74, 0, 70, 0,
             84, 0, 0, 0, 80, 0, 79, 75,  77, 0, 0, 0, 74, 0, 77, 82,  79, 0, 0, 82, 79, 0, 75, 0,  70, 0, 74, 0, 75, 0, 0, 0],
      bass: [44, 0, 0, 0, 51, 0, 0, 0,  46, 0, 0, 0, 53, 0, 0, 0,  36, 0, 0, 0, 43, 0, 0, 0,  46, 0, 0, 0, 53, 0, 0, 0,
             44, 0, 0, 0, 51, 0, 0, 0,  46, 0, 0, 0, 53, 0, 0, 0,  39, 0, 0, 0, 46, 0, 0, 0,  39, 0, 0, 0, 46, 0, 0, 0],
      drums: ''
    },
    // 11 Pendulum (temple at sunset): G Dorian (Gm C Gm C Eb F D D), swinging tick-tock bass, triangle lead
    {
      eighth: 0.22, swing: 0.2, leadWave: 'triangle', leadVol: 0.1, leadLen: 1, echo: 0.25, bassVol: 0.13, bassLen: 0.8, drumVol: 0.45,
      lead: [79, 0, 74, 0, 70, 0, 74, 0,  76, 0, 72, 0, 67, 0, 72, 0,  79, 0, 82, 0, 81, 79, 74, 0,  76, 0, 79, 0, 72, 0, 0, 0,
             75, 0, 79, 0, 82, 0, 79, 75,  77, 0, 81, 0, 84, 0, 81, 77,  78, 0, 81, 0, 86, 0, 81, 78,  81, 0, 78, 0, 74, 0, 0, 0],
      bass: [43, 0, 55, 0, 43, 0, 55, 0,  36, 0, 48, 0, 36, 0, 48, 0,  43, 0, 55, 0, 43, 0, 55, 0,  36, 0, 48, 0, 36, 0, 48, 0,
             39, 0, 51, 0, 39, 0, 51, 0,  41, 0, 53, 0, 41, 0, 53, 0,  38, 0, 50, 0, 38, 0, 50, 0,  38, 0, 50, 0, 38, 0, 50, 0],
      drums: 'k.h.h.h.'
    },
    // 12 Galaxy: Db major (Db Bbm Gb Ab Db Fm Gb Ab), broad sweeping tune, half-time drums
    {
      eighth: 0.24, leadVol: 0.05, leadLp: 1800, leadLen: 1.5, echo: 0.35, bassVol: 0.13, drumVol: 0.4,
      lead: [77, 0, 0, 0, 80, 0, 85, 0,  82, 0, 0, 80, 77, 0, 73, 0,  78, 0, 0, 0, 82, 0, 85, 0,  84, 0, 0, 82, 80, 0, 0, 0,
             85, 0, 84, 82, 80, 0, 77, 0,  80, 0, 0, 77, 72, 0, 77, 80,  82, 0, 0, 78, 73, 0, 78, 82,  80, 0, 0, 0, 75, 0, 72, 0],
      bass: [37, 0, 44, 0, 37, 0, 44, 0,  34, 0, 41, 0, 34, 0, 41, 0,  42, 0, 49, 0, 42, 0, 49, 0,  44, 0, 51, 0, 44, 0, 51, 0,
             37, 0, 44, 0, 37, 0, 44, 0,  41, 0, 48, 0, 41, 0, 48, 0,  42, 0, 49, 0, 42, 0, 49, 0,  44, 0, 51, 0, 44, 0, 51, 0],
      drums: 'k...s..h'
    },
    // 13 Clockwork: F major (F C Dm Bb F C Bb C), brisk ticking staccato arpeggios, tick-tock kit
    {
      eighth: 0.18, leadVol: 0.07, leadLp: 2600, leadLen: 0.65, echo: 0.2, bassVol: 0.15, bassLen: 0.8, drumVol: 0.45,
      lead: [77, 72, 69, 72, 77, 0, 81, 0,  79, 76, 72, 76, 79, 0, 84, 0,  81, 77, 74, 77, 81, 0, 77, 0,  82, 0, 77, 0, 74, 0, 77, 0,
             81, 0, 0, 79, 77, 0, 72, 0,  76, 0, 79, 0, 84, 0, 79, 76,  74, 0, 77, 0, 82, 0, 81, 79,  79, 0, 76, 0, 72, 0, 0, 0],
      bass: [41, 0, 53, 0, 48, 0, 53, 0,  36, 0, 48, 0, 43, 0, 48, 0,  38, 0, 50, 0, 45, 0, 50, 0,  34, 0, 46, 0, 41, 0, 46, 0,
             41, 0, 53, 0, 48, 0, 53, 0,  36, 0, 48, 0, 43, 0, 48, 0,  34, 0, 46, 0, 41, 0, 46, 0,  36, 0, 48, 0, 43, 0, 48, 0],
      drums: 'khh.shh.'
    }
  ];
  songs.peggle = songs.peggleLevels[0];

  // A game's own switch wins; a game you haven't set follows the Game defaults switch (gn_music, default on)
  function musicOn(key) { try { var v = localStorage.getItem(key); return v == null ? localStorage.getItem('gn_music') !== '0' : v !== '0'; } catch (e) { return true; } }

  function create(o) {
    var S = o.song, st = { on: false, step: 0, next: 0, bus: null, ac: null, nb: null };
    function noiseBuf(a) {
      if (!st.nb) { st.nb = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); var d = st.nb.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      return st.nb;
    }
    function note(a, type, f, t, dur, vol, lp) {
      var n = a.createOscillator(), g = a.createGain(), out = n;
      n.type = type; n.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (lp) { var fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; n.connect(fl); out = fl; }
      out.connect(g); g.connect(st.bus); n.start(t); n.stop(t + dur + 0.03);
    }
    function drum(a, ch, t) {
      var v = S.drumVol == null ? 1 : S.drumVol; if (!v) return;
      if (ch === 'k' || ch === 'x') {
        var k = a.createOscillator(), kg = a.createGain();
        k.frequency.setValueAtTime(140, t); k.frequency.exponentialRampToValueAtTime(42, t + 0.1);
        kg.gain.setValueAtTime(0.28 * v, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        k.connect(kg); kg.connect(st.bus); k.start(t); k.stop(t + 0.16);
      }
      if (ch === 'h' || ch === 'x' || ch === 's') {
        var s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), sn = ch === 's';
        s.buffer = noiseBuf(a); fl.type = sn ? 'bandpass' : 'highpass'; fl.frequency.value = sn ? 1800 : 7000;
        var vol = (sn ? 0.13 : 0.045) * v, d = sn ? 0.12 : 0.035;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        s.connect(fl); fl.connect(g); g.connect(st.bus); s.start(t, Math.random() * 0.3); s.stop(t + d + 0.02);
      }
    }
    function stop(hard) {
      if (!st.on) return; st.on = false; st.next = 0;
      if (!st.ac || !st.bus) return;
      var now = st.ac.currentTime, g = st.bus.gain;
      try { g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.exponentialRampToValueAtTime(0.0001, now + (hard ? 0.05 : 0.35)); } catch (e) {}
    }
    function tick() {
      var a = musicOn(o.key) ? o.ctx() : null;
      if (!a) { stop(true); return; }
      if (a.state !== 'running') return;
      var out = o.out(); if (!out) return;
      if (st.ac !== a || !st.bus) { st.ac = a; st.bus = a.createGain(); st.bus.connect(out); }
      var now = a.currentTime;
      if (!st.on) { st.on = true; st.bus.gain.cancelScheduledValues(now); st.bus.gain.setValueAtTime(0.0001, now); st.bus.gain.exponentialRampToValueAtTime(1, now + 0.3); }
      if (st.next < now) st.next = now + 0.05;
      var e = S.eighth / Math.max(0.5, Math.min(2, o.tempo ? o.tempo() : 1)), guard = 0;
      while (st.next < now + 0.18 && guard++ < 8) {
        var i = st.step, t = st.next + (S.swing && i % 2 ? e * S.swing : 0);
        var ld = S.lead[i % S.lead.length], bs = S.bass[i % S.bass.length], dr = S.drums ? S.drums.charAt(i % S.drums.length) : '.';
        if (ld) {
          note(a, S.leadWave || 'square', mtof(ld), t, e * (S.leadLen || 0.85), S.leadVol, S.leadLp);
          if (S.echo) note(a, S.leadWave || 'square', mtof(ld + 12), t + e * 1.5, e * 0.8, S.leadVol * S.echo, S.leadLp);
        }
        if (bs) note(a, S.bassWave || 'triangle', mtof(bs), t, e * (S.bassLen || 0.9), S.bassVol, S.bassLp);
        if (dr !== '.') drum(a, dr, t);
        st.step++; st.next += e;
      }
    }
    function setSong(song) {
      if (!song || song === S) return;
      S = song; st.step = 0; st.next = 0;
      if (!st.on || !st.ac || !st.bus) return;
      // Playing: fade the old song out on its own bus; the next tick() fades the new one in on a fresh bus
      var old = st.bus, now = st.ac.currentTime;
      try { old.gain.cancelScheduledValues(now); old.gain.setValueAtTime(Math.max(0.0001, old.gain.value), now); old.gain.exponentialRampToValueAtTime(0.0001, now + 0.4); } catch (e) {}
      setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 1000);
      st.bus = null; st.on = false;
    }
    return {
      tick: tick, stop: stop, setSong: setSong,
      song: function () { return S; },
      on: function () { return musicOn(o.key); },
      restart: function () { st.step = 0; },
      menuItem: {
        icon: 'sound', label: 'Music on / off',
        onClick: function () {
          var on = !musicOn(o.key);
          try { localStorage.setItem(o.key, on ? '1' : '0'); } catch (e) {}
          if (!on) stop(true);
          if (window.Kit && Kit.toast) Kit.toast(on ? 'Music on' : 'Music off');
        }
      }
    };
  }

  window.ArcadeMusic = { create: create, songs: songs };
})();
