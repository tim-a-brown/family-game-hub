// ═══════════════════════════════════════════════════════════════════════════
// Monopoly music: quiet ragtime piano under the game, cycling through six Scott Joplin rags.
//
//   var music = MonoMusic.create({
//     key: 'monopoly_music',               // localStorage on/off switch (unset: follows gn_music, default on)
//     active: function () { return ... }   // true while a game is being played (not setup, not game over)
//   });
//   music.menuItem   // { icon, label, sub, toggle, onClick } for Kit.init({ menu }): a Music switch
//   music.debug()    // what the player is doing (for tests)
//   MonoMusic.render(i, sampleRate)   // a whole tune as an AudioBuffer (Promise), for listening tests
//
// Plays only while active() is true, the site's Sound switch (gn_sound) is on, this game's Music switch is on
// and the page has had a tap or key press. It fades out at game over or when switched off, and pauses with the
// page when the app is hidden (the AudioContext is suspended, so it carries on from the same note).
//
// How it sounds: a small upright with a few detuned strings and a bright hammer (a "tack piano"), straight
// sixteenths, low-passed and with a little room, mixed well under the game's sound effects. Each tune plays
// its intro (if any) and the first two strains as Joplin wrote them: Intro A A B B A. Between tunes there is a
// short rest; the next one is picked at random, never the one that just played.
//
// How it plays: the music is rendered ahead in eight-bar pieces with an OfflineAudioContext (off the main
// thread) and each piece is queued on the live context about ten seconds early. A busy main thread can't make
// it stutter, and the live context only ever runs a buffer player or two.
//
// The notes come from the Mutopia Project's public-domain editions of the original sheet music (Joplin's
// rags are themselves in the public domain): every note of both hands, bar for bar.
// Data format, one tune: seq lists the bars in playing order as indexes into bars (repeated strains are
// stored once). A bar is "right hand<space>left hand"; each note is three characters from ALPHA:
// onset within the 2/4 bar in 1/24 beats (0–47), length in 1/8 beats, MIDI note number − 21.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  var TUNES = [
    { name: "The Entertainer", year: 1902, bpm: 80, form: "Intro A A B B A",
      seq: [0,1,2,3,4,5,6,7,8,9,10,11,4,5,6,12,13,14,15,16,4,5,6,7,8,9,10,11,4,5,6,12,13,14,15,17,18,19,20,21,22,23,24,25,18,19,20,26,27,28,29,30,18,19,20,21,22,23,24,25,18,19,20,26,27,28,31,32,4,5,6,7,8,9,10,11,4,5,6,12,13,14,15,33],
      bars: [
        '02r02f62t62h<2p<2dB4mB4aN2oN2cT4kT4_ ',
        '02f62h<2dB4aN2cT4_ 02Y62[<2WB4TN2VT4R',
        '02Y62[<2W 02M62O<2KB4TB4HN2VN2JT2TT2HZ2SZ2G',
        'H4kH4fH4cH4_T2YZ2Z 04R04FH4FH4:T4VT4R',
        '02[64dB2[H4dT2[Z<d 04K<4W<4R<4OH4RH4FT4WT4UT4R',
        'N2pN2hN2dT2rT2iT2fZ2sZ2jZ2g 04P04D<4W<4TH4OH4CT4WT4R',
        '02t02k02h62p62h62d<2r<2i<2fB4tB4kB4hN2oN2fN2cT4rT4iT4f 04F<4W<4R<4OH4FT4VT4RT4P',
        '0<p0<h0<dT2YZ2Z 04K<4W<4R<4OH4WH4RH4OT4VT4R',
        '02[64dB2[H4dT2[Z>d 04K<4W<4R<4OH4RH4FT4WT4UT4R',
        'T2mT2dT2aZ2kZ2dZ2_ 04P04D<4W<4TH4OH4CT4NT4B',
        '02j02d02^62m62a<2p<2dB4tB4hN2rN2fT2pT2dZ2mZ2a 04M04A<4W<4T<4Q<4MH4MT4WT4TT4Q',
        '0<r0<i0<fT2YZ2Z 04V04R<4R<4FH4TH4HT4VT4J',
        '0<p0<h0<dT2pT2dZ2rZ2f 04K<4W<4R<4OH4[H4WH4R',
        '02t02h62p62d<2r<2fB4tB4hN2pN2dT2rT2fZ2pZ2d 04W04K<4[<4W<4RH4UH4IT4[T4WT4R',
        '02t02h62p62d<2r<2fB4tB4hN2pN2dT2rT2fZ2pZ2d 04T04H<4]<4W<4TH4SH4GT4]T4WT4S',
        '02t02k02h62p62h62d<2r<2i<2fB4tB4kB4hN2oN2fN2cT4rT4iT4f 04R04F<4[<4W<4RH4FT4VT4R',
        '0<p0<h0<dT2YZ2Z 04W04R04K<4R<4FH4TH4HT4VT4J',
        '0:p0:h0:dN2hN2dN2[T2iT2fT2]Z2jZ2gZ2^ 04W04R04K<4R<4FH4KH4?',
        '04k04h04_<2m<2h<2aB4kB4hB4_N2hN2dN2[T2iT2fT2]Z2jZ2gZ2^ 04K04?<4[<4W<4RH4FT4[T4WT4R',
        '04k04h04_<2m<2h<2aB4kB4hB4_N2hT2dZ2_ 04K<4[<4W<4RH4FT4[T4WT4R',
        '02a62c<2dB2fH2hN2fT2dZ2f 04D<4]<4W<4TH4PT4]T4WT4S',
        '02_62h<2iB2kH2mN2kT2hZ2i 04O<4[<4W<4RH4FT4[T4WT4R',
        '04k04h04_<2m<2h<2aB4kB4hB4_N2hN2dN2[T2iT2fT2]Z2jZ2gZ2^ 04K<4[<4W<4RH4FT4[T4WT4R',
        '04k04h04_<2m<2h<2aB4kB4hB4_N2kT2mZ2n 04K<4[<4W<4RH4OT4N',
        '02o02k02f64o64k64fB4oB4jB4dN2mT2jT2dZ2f 04M<4Y<4V<4RH4MT4YT4WT4T',
        '0:k0:cN2hN2dN2[T2iT2fT2]Z2jZ2gZ2^ 04Y04V04R<4P<4DH4OH4CT4MT4A',
        '0:dN2_T2^Z2_ 04O<4[<4W<4RH4KT4[T4WT4U',
        '04d<2aB4dN2aT2dZ2a 04]04W04T04P<4]<4W<4T<4PH4ZH4WH4TH4QT4ZT4WT4TT4Q',
        '02_62d<2hB4kN2hT2dZ2_ 04[04W04R<4[<4W<4RH4[H4WH4RT4[T4WT4R',
        '04a04^<4d<4^H2hH2]N4fN4]Z<dZ<[ 04W04M<4T<4MH4VH4RT4VT4R',
        'N2tN2pN2hT2uT2rT2iZ2vZ2sZ2j 04W04K<4R<4FH4OH4CT4MT4A',
        '04a04^<4d<4^H2hH2]N4fN4]Z>dZ>[ 04W04M<4T<4MH4VH4RT4VT4R',
        'T2YZ2Z 04W04K<4R<4FH4KH4?',
        '08p08h08dH4pH4hH4d 04W04R04K<4R<4FH4KH4?'
      ] },
    { name: "Maple Leaf Rag", year: 1899, bpm: 88, form: "A A B B A",
      seq: [0,1,0,2,3,3,4,5,6,7,8,9,10,11,12,13,0,1,0,2,3,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,17,21,15,16,22,23,24,25,26,27,15,16,17,18,19,20,17,21,15,16,22,23,24,25,28,0,1,0,2,3,3,4,5,6,7,8,9,10,11,12,13],
      bars: [
        'B2`H2gH2ZN2`T2dZ4gZ4Z 04N04B<4S<4GH4WH4SH4NT4WT4ST4N',
        '62_<2g<2ZB2_H2bN:gN:Z 04T04H<4U<4IH4XH4RH4NT4XT4RT4N',
        '62_<2g<2ZB2_H2bN6gN6Z 04T04H<4U<4IH4XH4RH4NT4XT4RT4N',
        '62g62ZB2`H2cN2hN2[Z2gZ2Z 04N04B<8O<8CT4NT4B',
        ' <4;B2GH2JN2ST4GZ2S',
        'B2`H2cN2lZ2l 02V62`<4ST4`',
        '02o62x<4x<4lH4xH4lT4xT4l <4c<4`<4]<4YH4cH4`H4]H4YT4cT4`T4]T4Y',
        '02x02l64x64lB2sH2uN2pT2sZ4uZ4l 04c04`04]04Y<4d<4`<4ZH4dH4`H4ZT4dT4`T4Z',
        '64l64hB2nH2oH2hN2lT2nZ4pZ4g 04d04`04Z<4c<4`<4[H4cH4`H4[T4dT4`T4Z',
        '62l<2p<2gB2lH4nH4gT4lT4g 04d04`04Z<4d<4`<4ZH4eH4_H4ZT4dT4`',
        '66l66`H4lH4`T4lT4` <4V<4S<4P<4MH4VH4SH4PH4MT4VT4ST4PT4M',
        '02l02`64l64`B2gH2iH2`N2dT2gZ4iZ4` 04V04S04P04M<4W<4S<4NH4WH4SH4NT4WT4ST4N',
        '64`64[B2bH2cH2[N2`T2bZ4dZ4Z 04W04S04N<4V<4S<4OH4VH4SH4OT4WT4ST4N',
        '62`<2d<2ZB2`H4bH4ZT4`T4Z 04W04S04N<4W<4S<4NH4XH4RH4NT4WT4S',
        'B2kH2sH2gN2kT2nZ4rZ4f 04T04H<4U<4IH4XH4RH4NT4NT4B',
        '62k<2q<2eB2kH2nN4pN4dZ2g 04X04R04N<4U<4IH4XH4RH4NT4NT4B',
        '02n02b62gB2dH2lH2`N2dT2gZ4iZ4] 04R04F<4S<4GH4WH4SH4NT4NT4B',
        '62d<2l<2`B2dH2gN4iN4]Z2d 04W04S04N<4S<4GH4WH4SH4NT4ST4G',
        '04i04]B2gH2kH2_N2bT2eZ4iZ4] 04T04H<4U<4IH4XH4RH4NT4NT4B',
        '62g<2k<2_B2bH2eN4iN4]Z2e 04X04R04N<4U<4IH4XH4RH4NT4UT4I',
        '04i04]B2dH2lH2`N2dT2gZ4iZ4] 04V04J<4W<4KH4WH4SH4NT4NT4B',
        '04i04]B2kH2sH2gN2kT2nZ4rZ4f 04T04H<4U<4IH4XH4RH4NT4NT4B',
        '62d<4l<4`H4lH4`T4kT4_ 04W04S04N<4S<4GH4SH4GT4RT4F',
        '04j04^B2]H2aN2dT2iZ2d 04Q04E<4P<4DH4PH4DT4TT4H',
        '02a62]B2]H2bN2eT4iT4] 04T04H<4U<4IH4XH4UH4PT4XT4UT4P',
        '04e04b04]<4d<4`<4]<4YN2dN2`N2]N2YZ4bZ4X 04X04U04P<4U<4P<4IH4UH4PH4IT4NT4B',
        '62Z<4`<4WH4gH4ZT4gT4Z 04R04F<4S<4GH4WH4SH4NT4WT4ST4N',
        '04g04ZB2kH2sH2gN2kT2nZ4rZ4f 04T04H<4U<4IH4XH4RH4NT4NT4B',
        '62ZB2`H2dN2gT4lT4` 04R04F<4S<4GH4ZH4WH4ST4ZT4WT4S'
      ] },
    { name: "The Easy Winners", year: 1901, bpm: 84, form: "Intro A A B B A",
      seq: [0,1,2,3,4,5,6,7,4,8,9,10,11,5,12,13,14,15,16,17,4,5,6,7,4,8,9,10,11,5,12,13,14,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,4,5,6,7,4,8,9,10,11,5,12,13,14,15,16,36],
      bars: [
        '04Z<6dN2bT2`Z2_ 04N<6WN2UT2SZ2R',
        '02]64ZB2XH4WT2UZ2S 02P64NB2LH4KT2IZ2G',
        '02R62S<2UB2WH2XN2ZT2]Z2_ 08BH2NN2LT2KZ2I',
        '04` 04G<4W<4S<4NH4BT4WT4ST4N',
        '04d04`<8d<8`T4gT4d 04G<4W<4S<4NH4BT4WT4ST4N',
        '02i02c64g64dB2iB2cH2gH2dN2iN2cT4gT4d 04G<4W<4S<4NH4BT4WT4ST4N',
        '02n02h64l64iB2nB2hH2lH2iN2nN2hT2lT2iZBgZBd 04@<4X<4S<4PH4@T4XT4ST4P',
        '<2ZB2]H2_N2`T2bZ2c 04G<4W<4S<4NH4BT4WT4ST4N',
        '02i02c64g64dB2iB2cH2gH2dN2gN2dT4gT4d 04G<4W<4S<4NH4HT4ZT4TT4Q',
        '02g64b66_B2gH2fH4`N2gT4iT4` 04I<4Z<4U<4RH4IT4YT4U',
        '0:g0:_N2ZT2_Z2e 04Z04N<4X<4LH4WH4KT4UT4I',
        '04d04`<8d<8`T4gT4d 04S04G<4W<4S<4NH4BT4WT4ST4N',
        '02n02h64l64iB2nB2hH2lH2iN2lN2iT2nT2kT2iZ:pZ8kZ6h 04@<4X<4S<4PH4XH4LT4XT4L',
        '62d<4hB2kH4pT2kZ2l 04W04K<4R<4FH4KH4?',
        '02n02h64l64iB2nB2hH2lH2iN2nN2hT2lT2iZ4gZ4d 04L04@<4X<4S<4PH4LH4@T4XT4ST4P',
        '62i62e<2g<2dB2eB2bH2dH2`N4gN4dZ2gZ2d 04S04G<4W<4S<4NH4SH4GT4WT4ST4N',
        '02g02a64e64bB2gB2aH2eH2bN2dN2_N2XT4bT4_T4X 04N04B<4X<4R<4NH4NH4BT4NT4B',
        '0<`0<W 0<N04G<4BH4DT4F',
        '08`08WH4lH4gH4dH4`T2ZZ2[ 04S04G<4N<4BH4GH4;',
        '02]62^<2_B4bB4_N2gT2eZ2b 04N04B<4X<4U<4NH4RH4FT4XT4RT4N',
        '02]62^<2_B4dB4_N2bT2]Z2_ 04U04I<4X<4U<4R<4NH4UH4IT4VT4J',
        '02`62Z<2]B2_H2`N2aT2bZ2c 04W04K<4W<4S<4NH4NH4BT4WT4ST4N',
        '02d62c<2dB4iB4dN2gT2bZ2d 04S04G<4W<4S<4NH4NH4BT4WT4ST4N',
        '02e64nB2dH2eN4nZ2d 04U04I<4X<4R<4NH4NH4BT4XT4RT4N',
        '02e64nB2lH2kN2iT2gZ2e 04U04I<4X<4R<4NH4NH4BT4RT4F',
        '02d64lB2cH2dN4lZ2c 04S04G<4W<4S<4NH4NH4BT4WT4ST4N',
        '02d64lB2iH2gN2dT2bZ2` 04S04G<4W<4S<4NH4NH4BT4WT4ST4N',
        '02_62`<2aB4iB4aN2gT2dZ2a 04P04D<4Z<4T<4PH4TH4HT4ZT4TT4P',
        '02_62`<2aB4iB4aN2gN2dT2iT2aZ2gZ2d 04W04K<4Z<4T<4PH4PH4DT4ZT4TT4P',
        '02e02b62d62a<2e<2bB4]N2aT2bZ2e 04I<4X<4U<4PH4LT4XT4UT4P',
        '02i62d<2eB4bN2]T2XZ2U 04I<4U<4PH8UH8PH8L',
        '02V62Y<2]B2`H2cN4cZ4c 02M62P<2SB2VH2YN4YZ4Y',
        '62f62]<2i<2`B2lB2cH4oH4f ',
        '02p04g04`62l<2gB2dH2dN2`T2WZ2Z ',
        '02b02_02Z02X64b64_64Z64XB6`B6ZB6WT2ZZ2[ 04N04B<4N<4BH4SH4G',
        '02b02_02Z02X64b64_64Z64XB6`B6ZB6WT4Z 04N04B<4N<4BH4SH4G',
        '08`08WH4lH4gH4dH4` 04S04G<4N<4BH4GH4;'
      ] },
    { name: "Elite Syncopations", year: 1902, bpm: 84, form: "Intro A A B B A",
      seq: [0,1,2,3,4,5,6,7,8,9,10,11,4,5,6,7,8,12,13,14,4,5,6,7,8,9,10,11,4,5,6,7,8,12,13,15,16,17,18,19,20,21,22,23,16,17,18,24,25,26,27,28,16,17,18,19,20,21,22,23,16,17,18,24,25,26,27,29,4,5,6,7,8,9,10,11,4,5,6,7,8,12,13,30],
      bars: [
        '02p02d62m62a<2k<2_B4iB4]N2mN2aT2kT2_Z2iZ2] ',
        '02k02_62i62]<2f<2YB4dB4WN2]T2_Z2a N2PT2RZ2T',
        '02W64_B2]H4[T4_ 02K64RB2PH4OT4R',
        '04d04_04[B2WN2YZ2[ 04W<4K<4?H4MH4AT4OT4C',
        '62]<2fB4dB4aB4]N2fT4dT4aT4Z 0<P0<DT4QT4E',
        '62[<2fB4dB4bB4[N2fT4dT4bT4[ 0<R0<FT4ST4G',
        '62d62a62]B2dB2aN2cN2`Z2bZ2_ 04T04H<4Z<4NH4YH4MT4XT4L',
        '02a04]62d<2f<4`B2iH4hH4dH4_T4kT4hT4b 04W04K<4V<4JH4UH4IT4KT4?',
        '02m02i02a62l<2mB4pN2mT2kZ2i 04D<4]<4W<4TH4HT4]T4WT4T',
        '02k62i<2fB4iN2fT2dZ2a 04I<4]<4Y<4UH4HT4]T4WT4T',
        '02_62k<2iB2hH2fN4aZ2c 04J<4]<4V<4RH4FT4]T4VT4R',
        '04dH4pH4hH4d 04[04WH4WH4KT4KT4?',
        '02k62i<2fB4dN2fT2aZ2_ 04I<4]<4Y<4UH4HT4]T4WT4T',
        '02]02V62_<4a<4]<4VH2_H2[H2UN4_N4[N4UZ2WZ2U 04M04A<4M<4AH4KH4?T4OT4C',
        '04]04TB2WN2YZ2[ 04P04D<4K<4?H4MH4AT4OT4C',
        '04]04T<2dB2dH4dT4d 04P04D',
        '02h62f<2dB2bH2aN4bZ2_ 04R<4[<4W<4UH4KT4[T4WT4U',
        '02]62_<2aB4WN2aT2_Z2] 04P<4W<4TH4KT4WT4T',
        '02[62]<2_B4WN2bT2aZ2_ 04R<4W<4UH4KT4WT4U',
        '02]62a<2fB6dT4d 04P<4W<4TH4TT4]T4W',
        '02h62f<2dB2bH2aN4bZ2[ 04R<4[<4W<4UH4OT4XT4UT4R',
        '02]62[<2]B4aN2aT2_Z2] 04M<4Y<4T<4PH4MT4YT4TT4P',
        '02[62d<2cB2aH2`N4cZ2[ 04O<4W<4TH4OT4YT4S',
        '04aH8dH8bH8[ 04W04TH8WH8K',
        '02]62a<2fB6dT4d 04P<4W<4TH4KT4WT4T',
        '02f02b64kB4fB4bN2kT4fT4b 04I<4Y<4U<4RH4IT4YT4UT4R',
        '02d02a64iB4dB4aN2iT4dT4a 04K<4W<4TH4KT4WT4T',
        '02b62_<2fB4dN2bT4[ 04K<4[<4W<4UH4KT4WT4UT4R',
        '04]<2dB2dH4dT4d 04W04T04P',
        '04]B2WN2YZ2[ 04W04T04P<4K<4?H4MH4AT4OT4C',
        '04]04T 04P04D'
      ] },
    { name: "Peacherine Rag", year: 1901, bpm: 88, form: "Intro A A B B A",
      seq: [0,1,2,3,4,5,6,7,8,9,10,11,4,5,12,13,14,15,16,17,4,5,6,7,8,9,10,11,4,5,12,13,14,15,16,18,19,20,21,22,23,24,25,26,19,20,21,27,28,29,30,31,19,20,21,22,23,24,25,26,19,20,21,27,28,29,30,32,4,5,6,7,8,9,10,11,4,5,12,13,14,15,16,33],
      bars: [
        '02g62i<2kB6iT4b 02N62P<2RB6PT4I',
        '02i62k<2lB6kT4b 02P62R<2SB6RT4I',
        '02d64dB2cH2dN2fT4g 02K64KB2JH2KN2MT4N',
        '04b<6bN2_T2`Z2a 04I<8I',
        '04b<4g<4_H4fH4_T4dT4_ 04N<4Z<4U<4RH4IT4ZT4UT4R',
        '02b02_64g64_B4fB4_N2dT2bZ2_ 04N<4Z<4U<4RH4IT4ZT4UT4R',
        '04b04_<4g<4_H4fH4_T4dT4_ 04N<4Z<4U<4RH4IT4ZT4UT4R',
        '02b02`64f64`B4dB4`N2bT2]Z2_ 04P<4Y<4U<4SH4IT4YT4UT4S',
        '04`<4f<4`H4dH4`T4bT4` 04P<4Y<4U<4SH4IT4YT4UT4S',
        '02`64f64`B4dB4`N2bT2fZ2i 04P<4Y<4U<4SH4IT4YT4UT4S',
        '04l04f04`<8l<8f<8`T4mT4gT4a 04P<4Y<4UH4QT4ZT4WT4Q',
        '0:n04g0:b<6gB2iH2kN2_T2`Z2a 08R<4Z<4UH4ZH4U',
        '04k04_<8k<8c<8_T4iT4cT4_ 04J<4]<4Y<4RH4FT4]T4YT4R',
        '0<g0<d0<_<2pB2rH2sT4d 04K<4Z<4W<4RH4ZH4WH4R',
        '04i04g04d<4i<4g<4dH4jH4gH4dT4jT4gT4d 08S08GH8TH8H',
        '02k02g02b64k64g64bB2nB2bH4lH4hH4dH4bT4kT4hT4dT4b 04U04I<4Z<4U<4RH4KT4[T4WT4UT4R',
        '02k02a64k64aB2gB2aH2iH4`N2gT4iT4` 04Z04W04P<4Z<4W<4PH4YH4UT4YT4U',
        '0:g0:_N2_T2`Z2a 04Z04N<4Z<4U<4RH4ZH4UH4R',
        '0<g0<_ 04Z04N<4U<4IH4NH4BT4D',
        '<4i<4g<4aH4kH4gH4aT4iT4gT4a 04K<4Z<4W<4PH4DT4ZT4WT4P',
        '<4p<4m<4gH4rH4mH4gT4pT4mT4g 04K<4Z<4T<4PH4DT4ZT4TT4P',
        '<4n<4fH4mH4fT4kT4f 04I<4Y<4U<4PH4DT4YT4UT4P',
        '02k02f62i<2hB4iN2kT4i 04I<4Y<4U<4PH4DT4YT4UT4P',
        '<4s<4m<4gH4sH4mH4gT4rT4mT4g 04K<4Z<4W<4PH4DT4ZT4TT4P',
        '02r0<m0<g62p<2oB4pN2uT4i 04K<4Z<4T<4PH4DT4ZT4TT4P',
        '<4r<4n<4fH4rH4iH4fT4pT4iT4f 04I<4Y<4U<4PH4DT4YT4UT4P',
        '02p0<i0<f62n<2mB4nN2uT4i 04I<4Y<4U<4PH4DT4YT4UT4P',
        '02k02f62i<2hB4iN2fT2gZ2i 04I<4Y<4U<4PH4MT4YT4UT4P',
        '02k02_62g62b<2k<2_B4mB4aN4kN4_Z2gZ2b 04N04B<4N<4BH4PH4DT4PT4D',
        '02i02]62f62b<2i<2]B4kB4_N4iN4]Z2b 04M04A<4M<4AH4NH4BT4MT4A',
        '02f02b02[64f64b64[B2fB2bB2[H2dH4aH4ZN2bT4dT4aT4Z 04K04?<4K<4?H4PH4DT4PT4D',
        '0<b0<Y 04U04I<4U<4PH4UH4PT4D',
        '08b08YH8bH8`H8Y 04U04I<4P<4DH8IH8=',
        '08g08_ 04Z04N<4U<4I'
      ] },
    { name: "Solace", year: 1909, bpm: 72, form: "Intro A A B B A",
      seq: [0,1,2,3,4,5,6,7,8,9,10,11,4,5,6,12,13,14,15,16,4,5,6,7,8,9,10,11,4,5,6,12,13,14,15,17,18,19,20,21,18,22,23,24,25,26,25,27,28,29,30,31,18,19,20,21,18,22,23,24,25,26,25,27,28,29,30,32,4,5,6,7,8,9,10,11,4,5,6,12,13,14,15,33],
      bars: [
        '06dB2fH2hN2gT4h 06WB2YH2[N2ZT4[',
        '06k06_B2mB2aH4kH4_T2mT2aZ2oZ2c ',
        '06p06dB2gB2ZH2hH2[N2`T4a N2ST4T',
        '04a<8_T4d 04P<8OT2OZ2N',
        '02c62b<2aB4_N2`T2aZ2b 0<MB2RH4]H4VT4M',
        '02c62i62f<2k<2eB4iB4fN2kN2eT2iT2fZ2c 0<FB2RH4]H4VT4N',
        '02d62c<2aB4_N2`T2aZ2c 0<OB2RH4[H4WT4R',
        '02d62k62h<2m<2gB4kB4hN2mN2gT2kT2hZ2e 0<KB2RH4[H4WT4O',
        '02f62i<2mB4rB4iN2iT2hZ4f 0<MB2PH4]H4YT4T',
        '64`64Y64WB6_B6YB6VT4f 04P<4PH2MN2OT4P',
        '02d62h<2kB4pB4hN2hT2fZ4d 0<OB2RH4[H4WT4R',
        '64^64WB6_B6[B6WT4d 04N<4OH2KN2MT2OZ2N',
        '02d62k62h<2m<2gB4kB4hN2mN2gT2kT2hZ2b 0<KB2RH4[H4WT4K',
        '02a64m64iB4pB4mB4iB4dN2oN2cT2pT2dZ2rZ2f 0<PB2TH4]H4WT4T',
        '08s0<p0<m08gH4rH4fT4lT4iT4dT4` 08^H8]',
        '0:k0:h0:d0:_N4rN4iN4fZ2tZ2kZ2h 62O<2PB2QH4RN6VT4F',
        '08p08h08dH2hN2fT4d 02W02K62O<2PB2QH2RN2PT2OZ2N',
        '04p04h04d<2hB2iH4kH4hT4lT4h 04W04KT4UT4K]1?^1A`1C',
        '04m04i<1d?1fB1hE1iH2kH6aN4iZ1iZ2`]1k_1i 0<DB2TH4]H4WT4D]1F^1H`1J',
        '02i02`62h62_<2h<2_B6gB6dB6^T4fT4cT4] 0<KB2TH4ZH4WT4S]1O^1P`1Q',
        '08e08b08[H4fH4cH4]T4hT4cT4[ 06RB2RH4FT4G',
        '04h04d04a04[<2hB2iH4kH4hT4lT4h 0<HB2TH4[H4WT4UT3K]1?^1A`1C',
        '02i02`62h62_<2h<2_B6hB6dB6_T4hT4bT4_ 0<KB2TH4[H4WT4L',
        '02h06c06_62f<2hB4cB6_N2fT4aT4^T4W 0<MB2RH4YH4VT4M',
        '04a08]08V<8_T4kT4fT4c 0<FB2RH4]H4VT4F',
        '02k08f08a64iB2hH2iH2fH2]N2kN2hN2_T2mT2iT2aZ2nZ2iZ2b 0<MB2PH4YH4TT4M',
        '0<o0<i0<f0<cT4kT4fT4c 0<GB2SH4]H4YH4VT4RT4F',
        '0<o0<i0<f0<cT4oT4iT4fT4c 0<GB2SH4]H4YH4VT4G',
        '0:p0:h0:dN2pN2dT2rT2fZ2tZ2h 0<HB2TH4[H4WT4H',
        '04t04m04h<8r<8m<8fT4iT4fT4dT4] 0<DB2TH4]H4YT4ST4G',
        '04i04f04c04]<6k<6f<6c<6_N2_T4hT4cT4] 06R0<FB6RH4]H4VT4RT4F',
        '04d04[<2hB2iH4kH4hT4lT4h 04R04KT4UT4K]1?^1A`1C',
        '08d08[H2hN2fT4d 02R02K62O<2PB2QH2RN2PT2OZ2N',
        '0<p0<h0<d 04W04K<2RB6K'
      ] }
  ];

  var ALPHA = (function () { var s = ''; for (var c = 48; c < 127; c++) if (c !== 92) s += String.fromCharCode(c); return s; })();
  var VAL = {}; for (var a = 0; a < ALPHA.length; a++) VAL[ALPHA.charAt(a)] = a;

  var BARS_PER_PIECE = 8;   // render size
  var AHEAD = 10;           // seconds of music queued ahead of the play head
  var GAP = 3.2;            // rest between tunes, seconds
  var VOL = 0.5;            // live output level: well under Kit.sfx (see the levels note at the bottom)
  var FADE_IN = 2.2, FADE_OUT = 0.9;

  // ── Notes ──────────────────────────────────────────────────────────────────
  // The notes of seq positions [from, to) of tune T, in seconds from the start of bar `from`:
  // [{t, d, m, v}]. v: the top note of a right-hand chord sings (the tune), the rest of the chord is softer;
  // in the left hand the bass note leads and the after-beat chord is lighter (stride).
  function notes(T, from, to) {
    var spb = 60 / T.bpm, out = [], last = T.seq.length - 1;
    for (var k = from; k < to && k <= last; k++) {
      var hands = T.bars[T.seq[k]].split(' '), b0 = (k - from) * 2;
      for (var h = 0; h < 2; h++) {
        var s = hands[h] || '', grp = [];
        for (var i = 0; i + 2 < s.length; i += 3) {
          var p = VAL[s.charAt(i)], d = VAL[s.charAt(i + 1)], m = VAL[s.charAt(i + 2)] + 21;
          var n = { t: (b0 + p / 24) * spb, d: d / 8 * spb, m: m, p: p, h: h };
          out.push(n);
          if (k === last) grp.push(n);
        }
        // the final chord rings
        var lastP = -1; grp.forEach(function (n) { lastP = Math.max(lastP, n.p); });
        grp.forEach(function (n) { if (n.p === lastP) n.d = Math.max(n.d, 1.6 * spb); });
      }
    }
    // voicing: notes are stored highest first at each onset, per hand
    var at = {};
    out.forEach(function (n) { var key = n.h + ':' + n.t.toFixed(4); (at[key] = at[key] || []).push(n); });
    Object.keys(at).forEach(function (key) {
      var g = at[key];
      g.forEach(function (n, i) {
        if (n.h === 0) n.v = i === 0 ? 1 : 0.46;
        else n.v = i === g.length - 1 ? (g.length === 1 && n.p % 12 ? 0.6 : 0.72) : 0.38;
      });
    });
    return out;
  }

  // ── The piano ──────────────────────────────────────────────────────────────
  // Two strings a few cents apart per note (the honky-tonk shimmer), a harmonic-rich wave that fades fast
  // after the hammer hits, and a short metallic tick for the tack. Low notes ring longer than high ones.
  var HARM = [0, 1, 0.52, 0.3, 0.2, 0.12, 0.08, 0.05, 0.03, 0.02];
  function rng(seed) { var x = seed >>> 0 || 1; return function () { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function roomIR(c, sr, len) {
    var n = Math.floor(sr * len), b = c.createBuffer(1, n, sr), d = b.getChannelData(0), r = rng(7);
    for (var i = 0; i < n; i++) { var e = Math.pow(1 - i / n, 3.2); d[i] = (r() * 2 - 1) * e * (i < sr * 0.012 ? i / (sr * 0.012) : 1); }
    return b;
  }
  // Renders notes (from notes()) into a mono AudioBuffer at sample rate sr. Promise.
  function renderNotes(list, sr, seed) {
    var end = 0.5;
    list.forEach(function (n) { end = Math.max(end, n.t + n.d + 0.35); });
    var len = Math.ceil((end + 1.3) * sr), c;
    try { c = new OAC(1, len, sr); } catch (e) { sr = 44100; len = Math.ceil((end + 1.3) * sr); c = new OAC(1, len, sr); }
    var real = new Float32Array(HARM.length), imag = new Float32Array(HARM);
    var wave = c.createPeriodicWave(real, imag);
    var sum = c.createGain(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), dry = c.createGain(), wet = c.createGain(), rv = c.createConvolver();
    hp.type = 'highpass'; hp.frequency.value = 75; hp.Q.value = 0.5;
    lp.type = 'lowpass'; lp.frequency.value = 2900; lp.Q.value = 0.4;
    rv.normalize = true; rv.buffer = roomIR(c, sr, 1.1);
    dry.gain.value = 0.85; wet.gain.value = 0.2;
    sum.connect(hp); hp.connect(lp); lp.connect(dry); lp.connect(rv); rv.connect(wet); dry.connect(c.destination); wet.connect(c.destination);
    var r = rng(seed || 1);
    list.forEach(function (n) {
      var f = 440 * Math.pow(2, (n.m - 69) / 12);
      var t = n.t + (r() - 0.5) * 0.008 + (n.h ? 0.004 : 0);
      if (t < 0) t = 0;
      var te = t + Math.max(0.06, n.d * 0.92);
      var lvl = Math.max(0.55, Math.min(1.2, 1.15 - (n.m - 60) * 0.012));
      var v = 0.16 * n.v * lvl * (0.92 + r() * 0.16);
      var tau = Math.max(0.28, Math.min(1.1, 1.1 - (n.m - 40) * 0.018));
      var g = c.createGain(), gg = g.gain;
      gg.setValueAtTime(0, t);
      gg.linearRampToValueAtTime(v, t + 0.004);
      gg.setTargetAtTime(v * 0.4, t + 0.004, 0.07);
      if (te > t + 0.16) gg.setTargetAtTime(0, t + 0.16, tau);
      gg.setTargetAtTime(0, te, 0.045);
      g.connect(sum);
      var spread = 3 + r() * 3;
      for (var s = -1; s <= 1; s += 2) {
        var o = c.createOscillator();
        o.setPeriodicWave(wave); o.frequency.value = f; o.detune.value = s * spread;
        o.connect(g); o.start(t); o.stop(te + 0.3);
      }
      // the tack: a quick bright tick above the note
      var k = c.createOscillator(), kg = c.createGain();
      k.type = 'square'; k.frequency.value = Math.min(f * 4.01, 5200);
      kg.gain.setValueAtTime(0, t); kg.gain.linearRampToValueAtTime(v * 0.1, t + 0.002); kg.gain.setTargetAtTime(0, t + 0.002, 0.009);
      k.connect(kg); kg.connect(sum); k.start(t); k.stop(t + 0.08);
    });
    return new Promise(function (res, rej) {
      c.oncomplete = function (e) { res(e.renderedBuffer); };
      var p; try { p = c.startRendering(); } catch (e) { rej(e); return; }
      if (p && p.then) p.then(res, rej);
    });
  }
  // a piece of tune i: bars [from, from + BARS_PER_PIECE) of its seq
  function renderPiece(i, from, sr) {
    var T = TUNES[i];
    return renderNotes(notes(T, from, from + BARS_PER_PIECE), sr, i * 1000 + from + 1);
  }
  function pieceLen(i) { return BARS_PER_PIECE * 2 * 60 / TUNES[i].bpm; }
  function tuneLen(i) { return TUNES[i].seq.length * 2 * 60 / TUNES[i].bpm; }

  // ── Switches ───────────────────────────────────────────────────────────────
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function soundOn() { return ls('gn_sound') !== '0'; }
  // a game's own switch wins; unset, it follows the Game defaults music switch (gn_music, default on)
  function musicOn(key) { var v = ls(key); return v == null ? ls('gn_music') !== '0' : v !== '0'; }

  // ── The player ─────────────────────────────────────────────────────────────
  function create(o) {
    var st = {
      ac: null, bus: null, on: false, sess: 0, tune: -1, cur: -1, last: -1, bag: [], piece: 0, at: 0, busy: false,
      srcs: [], gest: false, played: 0, pieces: 0, why: ''
    };
    var SR = 22050;
    function hasGesture() { return st.gest || !!(navigator.userActivation && navigator.userActivation.hasBeenActive); }
    function want() { return !!(AC && OAC && musicOn(o.key) && soundOn() && o.active()); }
    function ctx() {
      if (!st.ac) { try { st.ac = new AC(); } catch (e) { st.ac = null; return null; } }
      return st.ac;
    }
    function nextTune() {
      if (!st.bag.length) {
        var all = TUNES.map(function (_, i) { return i; });
        for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = all[i]; all[i] = all[j]; all[j] = x; }
        if (all[0] === st.last && all.length > 1) { all.push(all.shift()); }
        st.bag = all;
      }
      st.last = st.bag.shift();
      return st.last;
    }
    function start() {
      var a = ctx(); if (!a) return;
      if (a.state === 'suspended' && !document.hidden) { try { a.resume().catch(function () {}); } catch (e) {} }
      st.on = true; st.sess++;
      st.bus = a.createGain(); st.bus.gain.value = 0; st.bus.connect(a.destination);
      st.bus.gain.setTargetAtTime(VOL, a.currentTime + 0.05, FADE_IN / 4);
      st.tune = nextTune(); st.cur = -1; st.piece = 0; st.at = 0; st.played++;
      pump();
    }
    function stop(why) {
      if (!st.on) return;
      st.on = false; st.sess++; st.why = why || '';
      var a = st.ac, bus = st.bus, srcs = st.srcs;
      st.bus = null; st.srcs = []; st.busy = false;
      if (!a || !bus) return;
      var now = a.currentTime;
      try { bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now); bus.gain.setTargetAtTime(0, now, FADE_OUT / 4); } catch (e) {}
      setTimeout(function () {
        srcs.forEach(function (s) { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} });
        try { bus.disconnect(); } catch (e) {}
      }, FADE_OUT * 1000 + 400);
    }
    // keep about AHEAD seconds queued: render the next piece and line it up after the last
    function pump() {
      if (!st.on || st.busy || !st.ac) return;
      var a = st.ac, now = a.currentTime;
      if (st.at && st.at > now + AHEAD) return;
      var sess = st.sess, i = st.tune, from = st.piece * BARS_PER_PIECE;
      st.busy = true;
      renderPiece(i, from, SR).then(function (buf) {
        if (sess !== st.sess || !st.on) return;
        st.busy = false;
        var now = a.currentTime, when = st.at && st.at > now + 0.05 ? st.at : now + 0.12;
        var s = a.createBufferSource();
        s.buffer = buf; s.connect(st.bus); s.start(when);
        st.srcs.push(s); st.pieces++;
        s.onended = function () { var k = st.srcs.indexOf(s); if (k >= 0) st.srcs.splice(k, 1); try { s.disconnect(); } catch (e) {} };
        st.cur = i;
        var n = TUNES[i].seq.length;
        if (from + BARS_PER_PIECE >= n) {
          // tune over: a short rest, then another tune
          st.at = when + (n - from) * 2 * 60 / TUNES[i].bpm + GAP;
          st.tune = nextTune(); st.piece = 0; st.played++;
        } else {
          st.at = when + pieceLen(i); st.piece++;
        }
        pump();
      }).catch(function (e) { st.busy = false; if (window.console) console.warn('music', e); });
    }
    function tick() {
      if (document.hidden) return;              // hidden: the context is suspended, so the music just waits
      var w = want();
      if (w && !st.on && hasGesture()) start();
      else if (!w && st.on) stop(!soundOn() ? 'sound' : !musicOn(o.key) ? 'off' : 'inactive');
      if (st.on) {
        if (st.ac && st.ac.state === 'suspended') { try { st.ac.resume().catch(function () {}); } catch (e) {} }
        pump();
      }
    }
    function gesture() {
      st.gest = true;
      // Safari only lets audio start inside a tap
      if (want()) { var a = ctx(); if (a && a.state !== 'running') { try { a.resume().catch(function () {}); } catch (e) {} } }
      setTimeout(tick, 0);
    }
    ['pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, gesture, true); });
    document.addEventListener('visibilitychange', function () {
      var a = st.ac; if (!a) return;
      if (document.hidden) { if (a.state === 'running') { try { a.suspend().catch(function () {}); } catch (e) {} } }
      else if (st.on) { try { a.resume().catch(function () {}); } catch (e) {} tick(); }
    });
    setInterval(tick, 400);

    var api = {
      tick: tick,
      on: function () { return musicOn(o.key); },
      menuItem: {
        icon: 'music', label: 'Music', sub: 'Ragtime piano',
        toggle: function () { return musicOn(o.key); },
        onClick: function () {
          var on = !musicOn(o.key);
          try { localStorage.setItem(o.key, on ? '1' : '0'); } catch (e) {}
          if (window.FGHSync && FGHSync.noteWrite) { try { FGHSync.noteWrite(o.key); } catch (e) {} }
          if (on && !soundOn() && window.Kit && Kit.toast) Kit.toast('Sound is off');
          tick();
        }
      },
      debug: function () {
        return { playing: st.on, tune: st.cur >= 0 ? TUNES[st.cur].name : null, next: st.tune >= 0 ? TUNES[st.tune].name : null,
          ctx: st.ac ? st.ac.state : 'none', time: st.ac ? st.ac.currentTime : 0, queued: st.srcs.length, pieces: st.pieces, tunesStarted: st.played,
          gain: st.bus ? st.bus.gain.value : 0, why: st.why, want: want(), gesture: hasGesture() };
      }
    };
    MonoMusic._last = api;
    return api;
  }

  function render(i, sr) {
    var T = TUNES[i];
    return renderNotes(notes(T, 0, T.seq.length), sr || 22050, i * 1000 + 1);
  }

  window.MonoMusic = { create: create, render: render, VOL: VOL, tunes: TUNES.map(function (t) { return { name: t.name, year: t.year, bpm: t.bpm, form: t.form, seconds: Math.round(tuneLen(TUNES.indexOf(t))) }; }) };
})();
