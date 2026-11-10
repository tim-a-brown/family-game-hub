// Anoria: the test card pool for the rules simulator (sim.js). Numbers here are what the balance runs tune.
// Figure: f faction (D Discovery, S Statecraft, V Valor, A Arts, W Wonder), c Spark cost, m Might, reg home region,
// era 1..6, y year (for the fun log), k keywords, arr arrive effect, insp who inspired them (Legacy)
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.AnoriaCards = factory(); })(this, function () {
'use strict';
const F = (n, f, c, m, reg, era, y, k, x) => Object.assign({ n, t: 'fig', f, c, m, reg, era, y, k: k || {} }, x || {});
const CARDS = {
  // Discovery
  archimedes: F('Archimedes', 'D', 3, 3, 'MED', 2, -250, { eureka: 1 }),
  hypatia: F('Hypatia', 'D', 2, 2, 'AFR', 2, 400, { scholar: 1 }),
  copernicus: F('Copernicus', 'D', 3, 4, 'EUR', 4, 1530),
  galileo: F('Galileo', 'D', 4, 4, 'MED', 4, 1610, { scholar: 1 }, { insp: ['archimedes', 'copernicus'] }),
  newton: F('Isaac Newton', 'D', 5, 4, 'EUR', 5, 1687, { shoulders: 1 }, { insp: ['galileo', 'copernicus'] }),
  zhenghe: F('Zheng He', 'D', 4, 5, 'ASIA', 3, 1410, { voyager: 1 }, { arr: ['spark', 1] }),
  marcopolo: F('Marco Polo', 'D', 3, 3, 'MED', 3, 1280, { voyager: 1, scholar: 1 }),
  haytham: F('Ibn al-Haytham', 'D', 3, 4, 'MIDEAST', 3, 1020, {}, { arr: ['stun', 1] }),
  ada: F('Ada Lovelace', 'D', 2, 2, 'EUR', 6, 1843, { deedsLess: 1 }),
  plato: F('Plato', 'D', 3, 3, 'MED', 2, -380, { scholar: 1 }, { insp: ['socrates'] }),
  aristotle: F('Aristotle', 'D', 4, 4, 'MED', 2, -340, { inspiring: 1 }, { insp: ['plato'] }),
  // Statecraft
  socrates: F('Socrates', 'S', 2, 2, 'MED', 2, -420, {}, { arr: ['stun', 1] }),
  hammurabi: F('Hammurabi', 'S', 3, 3, 'MIDEAST', 1, -1760, { law: 1 }),
  hatshepsut: F('Hatshepsut', 'S', 2, 3, 'AFR', 1, -1470, { steadfast: 1 }),
  pericles: F('Pericles', 'S', 3, 3, 'MED', 2, -450, { orator: 1 }),
  ashoka: F('Ashoka', 'S', 4, 5, 'ASIA', 2, -260, {}, { arr: ['stun', 9] }),
  confucius: F('Confucius', 'S', 3, 3, 'ASIA', 2, -500, { inspiring: 1 }),
  mansamusa: F('Mansa Musa', 'S', 4, 3, 'AFR', 3, 1324, {}, { arr: ['spark', 2] }),
  charlemagne: F('Charlemagne', 'S', 5, 6, 'EUR', 3, 800, { guard: 1 }),
  elizabeth: F('Elizabeth I', 'S', 5, 5, 'EUR', 4, 1588, { inspiring: 1 }),
  alexander: F('Alexander the Great', 'S', 5, 6, 'MED', 2, -330, { swift: 1 }, { insp: ['aristotle'] }),
  // Valor
  spartacus: F('Spartacus', 'V', 2, 2, 'MED', 2, -72, { uprising: 1 }),
  leonidas: F('Leonidas', 'V', 3, 3, 'MED', 2, -480, { guard: 1, steadfast: 1 }),
  boudica: F('Boudica', 'V', 3, 3, 'EUR', 2, 60, { raider: 1 }),
  tomoe: F('Tomoe Gozen', 'V', 3, 4, 'ASIA', 3, 1184, { swift: 1 }),
  joan: F('Joan of Arc', 'V', 4, 4, 'EUR', 3, 1429, { underdog: 1 }),
  saladin: F('Saladin', 'V', 4, 4, 'MIDEAST', 3, 1187, { steadfast: 1 }),
  yisunsin: F('Yi Sun-sin', 'V', 4, 5, 'ASIA', 4, 1592, { guard: 1 }),
  hannibal: F('Hannibal', 'V', 5, 4, 'AFR', 2, -218, { voyager: 1, raider: 1 }),
  sittingbull: F('Sitting Bull', 'V', 4, 4, 'AMER', 6, 1876, { homeDouble: 1 }),
  // Arts
  homer: F('Homer', 'A', 2, 2, 'MED', 1, -750, { inspiring: 1 }),
  sappho: F('Sappho', 'A', 2, 3, 'MED', 1, -600, { scholar: 1 }),
  virgil: F('Virgil', 'A', 3, 4, 'MED', 2, -20, {}, { insp: ['homer'] }),
  dante: F('Dante', 'A', 4, 4, 'MED', 3, 1310, { scholar: 1 }, { insp: ['virgil'] }),
  murasaki: F('Murasaki Shikibu', 'A', 3, 4, 'ASIA', 3, 1010, { tale: 1 }),
  shakespeare: F('Shakespeare', 'A', 4, 4, 'EUR', 4, 1600, { stage: 1 }),
  michelangelo: F('Michelangelo', 'A', 4, 5, 'MED', 4, 1510, { masterpiece: 1 }),
  mozart: F('Mozart', 'A', 3, 3, 'EUR', 5, 1785, { swift: 1, inspiring: 1 }),
  beethoven: F('Beethoven', 'A', 4, 4, 'EUR', 6, 1810, { inspiring: 1 }, { insp: ['mozart'] }),
  hokusai: F('Hokusai', 'A', 3, 4, 'ASIA', 6, 1830, {}, { arr: ['push', 1] }),
  // Wonder
  scheherazade: F('Scheherazade', 'W', 2, 2, 'MIDEAST', 3, 800, { untouchable: 1 }),
  nostradamus: F('Nostradamus', 'W', 2, 2, 'EUR', 4, 1555, { scholar: 1 }),
  imhotep: F('Imhotep', 'W', 3, 3, 'AFR', 1, -2650, { monument: 1 }),
  anansi: F('Anansi', 'W', 3, 3, 'AFR', 3, 1200, {}, { arr: ['wits', 1] }),
  atalanta: F('Atalanta', 'W', 3, 3, 'MED', 1, -1300, { swift: 1, slayer: 1 }),
  daedalus: F('Daedalus', 'W', 2, 3, 'MED', 1, -1400, { voyager: 1 }),
  odysseus: F('Odysseus', 'W', 4, 4, 'MED', 1, -1200, { voyager: 1, steadfast: 1 }),
  chingshih: F('Ching Shih', 'W', 4, 4, 'ASIA', 6, 1810, { voyager: 1, raider: 1 }),
  beowulf: F('Beowulf', 'W', 5, 5, 'EUR', 3, 520, { guard: 1, inspiring: 1 }),
  // Timeline test: the same rules from Assyria to the 1800s (nobody who died after 1900: no rights questions)
  ashurbanipal: F('Ashurbanipal', 'S', 3, 3, 'MIDEAST', 1, -650, { scholar: 1 }),
  faraday: F('Michael Faraday', 'D', 4, 4, 'EUR', 6, 1831, { eureka: 1 }),
  douglass: F('Frederick Douglass', 'S', 4, 4, 'AMER', 6, 1852, {}, { arr: ['stun', 9] }),
  // Relics (any deck)
  press: { n: 'Printing Press', t: 'relic', f: 'N', c: 2 },
  antikythera: { n: 'Antikythera Mechanism', t: 'relic', f: 'N', c: 3 },
  compass: { n: 'Compass', t: 'relic', f: 'N', c: 1 },
  // Deeds
  phalanx: { n: 'Phalanx', t: 'deed', f: 'V', c: 2, quick: 1 },
  ambush: { n: 'Ambush', t: 'deed', f: 'V', c: 3 },
  trojan: { n: 'Trojan Horse', t: 'deed', f: 'W', c: 2 },
  fairwinds: { n: 'Fair Winds', t: 'deed', f: 'W', c: 0 },
  rift: { n: 'Rift', t: 'deed', f: 'W', c: 2 },
  eclipse: { n: 'Eclipse', t: 'deed', f: 'W', c: 1 },
  eureka: { n: 'Eureka', t: 'deed', f: 'D', c: 1 },
  caravan: { n: 'Trade Caravan', t: 'deed', f: 'S', c: 1 },
  decree: { n: 'Royal Decree', t: 'deed', f: 'S', c: 1 },
  encore: { n: 'Encore', t: 'deed', f: 'A', c: 1 },
};
// Threads: what a card grew from, beyond a Figure's own Legacy line (insp). A Figure standing on your side, a Relic you
// have in play, or a Place ('@id'). The engine reads c.from (see threadSrc); the Library draws these on its timeline.
const FROM = {'hypatia': ['@library'], 'archimedes': ['@library'], 'mansamusa': ['@timbuktu'], 'pericles': ['@acropolis'], 'shakespeare': ['@globe', 'press'], 'ashurbanipal': ['@nineveh'], 'douglass': ['@seneca'], 'marcopolo': ['@silk'], 'zhenghe': ['compass'], 'nostradamus': ['press'], 'odysseus': ['homer'], 'antikythera': ['archimedes'], 'eureka': ['archimedes'], 'trojan': ['odysseus'], 'phalanx': ['leonidas', 'alexander'], 'ambush': ['hannibal'], 'decree': ['hammurabi', 'ashoka'], 'caravan': ['mansamusa', 'marcopolo', '@silk'], 'encore': ['shakespeare', 'mozart', '@globe'], 'fairwinds': ['zhenghe', 'odysseus'], 'eclipse': ['antikythera']};
Object.keys(FROM).forEach(k => { CARDS[k].from = FROM[k]; });
// (Odysseus grew from Homer the way a Legacy Figure grows from a teacher: a line, with its +1 Might)
CARDS.odysseus.insp = ['homer']; delete CARDS.odysseus.from;
// A year for every card and Place that has one (the Library's timeline). Rift has none.
const WHEN = { press: 1450, antikythera: -100, compass: 1100, phalanx: -650, ambush: -217, trojan: -1200, fairwinds: 1405, eclipse: -585, eureka: -250, caravan: 1324, decree: -1754, encore: 1600 };
Object.keys(WHEN).forEach(k => { CARDS[k].y = WHEN[k]; });
const ERAS = [null, { n: 'The First Cities', to: -550 }, { n: 'The Classical World', to: 450 }, { n: 'The Middle Ages', to: 1453 }, { n: 'The Renaissance', to: 1650 }, { n: 'The Enlightenment', to: 1800 }, { n: 'The Age of Steam', to: 1900 }];
// Named Threads: chains to collect. Owning every card of one completes it (Places are part of the story, not owned).
const THREADS = [
  { id: 'academy', n: 'The Academy', cards: ['socrates', 'plato', 'aristotle', 'alexander'] },
  { id: 'heavens', n: 'The Heavens', cards: ['copernicus', 'galileo', 'newton'] },
  { id: 'epic', n: 'The Epic', cards: ['homer', 'virgil', 'dante'] },
  { id: 'horse', n: 'The Wooden Horse', cards: ['homer', 'odysseus', 'trojan', 'fairwinds'] },
  { id: 'vienna', n: 'Vienna', cards: ['mozart', 'beethoven', 'encore'] },
  { id: 'eureka', n: 'Eureka!', cards: ['archimedes', 'eureka', 'antikythera', 'eclipse'], places: ['library'] },
  { id: 'searoads', n: 'The Sea Roads', cards: ['compass', 'zhenghe', 'marcopolo', 'caravan'], places: ['silk'] },
  { id: 'law', n: 'The Law', cards: ['hammurabi', 'ashoka', 'decree'] },
  { id: 'stage', n: 'The Stage', cards: ['press', 'shakespeare', 'nostradamus'], places: ['globe'] },
  { id: 'learning', n: 'Houses of Learning', cards: ['hypatia', 'mansamusa', 'ashurbanipal', 'pericles'], places: ['library', 'timbuktu', 'nineveh', 'acropolis'] },
  { id: 'shields', n: 'The Shield Wall', cards: ['leonidas', 'alexander', 'phalanx'] },
  { id: 'trap', n: 'The Trap', cards: ['hannibal', 'ambush'] },
];
const GUIDES = { cleopatra: 'Cleopatra', leonardo: 'Leonardo da Vinci', tubman: 'Harriet Tubman', franklin: 'Benjamin Franklin', suntzu: 'Sun Tzu' };
const PLACES = {
  library: { n: 'Library of Alexandria', reg: 'AFR', era: 2, y: -285 }, silk: { n: 'Silk Road', reg: 'ASIA', era: 3, y: -130 },
  colosseum: { n: 'Colosseum', reg: 'MED', era: 2, y: 80 }, acropolis: { n: 'Acropolis', reg: 'MED', era: 2, y: -447 },
  wall: { n: 'Great Wall', reg: 'ASIA', era: 2, y: -214 }, stonehenge: { n: 'Stonehenge', reg: 'EUR', era: 1, y: -2500 },
  globe: { n: 'Globe Theatre', reg: 'EUR', era: 4, y: 1599 }, machu: { n: 'Machu Picchu', reg: 'AMER', era: 4, y: 1450 },
  timbuktu: { n: 'Timbuktu', reg: 'AFR', era: 3, y: 1327 }, petra: { n: 'Petra', reg: 'MIDEAST', era: 2, y: -300 },
  nineveh: { n: 'Nineveh', reg: 'MIDEAST', era: 1, y: -700 }, seneca: { n: 'Seneca Falls', reg: 'AMER', era: 6, y: 1848 },
};
const CENTER = ['library', 'silk', 'colosseum', 'acropolis'], EDGE = ['wall', 'stonehenge', 'globe', 'machu', 'timbuktu', 'petra', 'nineveh', 'seneca'];
// Five built decks, each around one way to win (15 cards, two of each)
const ARCH = {
  Explorers: { guide: 'leonardo', cards: ['zhenghe', 'marcopolo', 'daedalus', 'odysseus', 'chingshih', 'hypatia', 'archimedes', 'copernicus', 'galileo', 'nostradamus', 'antikythera', 'compass', 'press', 'fairwinds', 'eureka'] },
  Legion: { guide: 'suntzu', cards: ['spartacus', 'leonidas', 'boudica', 'tomoe', 'joan', 'saladin', 'yisunsin', 'hannibal', 'charlemagne', 'hatshepsut', 'pericles', 'elizabeth', 'phalanx', 'ambush', 'decree'] },
  Legacy: { guide: 'franklin', cards: ['socrates', 'plato', 'aristotle', 'alexander', 'archimedes', 'copernicus', 'galileo', 'newton', 'homer', 'virgil', 'dante', 'mozart', 'beethoven', 'michelangelo', 'eureka'] },
  Court: { guide: 'cleopatra', cards: ['hammurabi', 'hatshepsut', 'pericles', 'ashoka', 'confucius', 'mansamusa', 'elizabeth', 'charlemagne', 'homer', 'sappho', 'murasaki', 'shakespeare', 'hokusai', 'decree', 'caravan'] },
  Pathfinders: { guide: 'tubman', cards: ['scheherazade', 'anansi', 'atalanta', 'daedalus', 'chingshih', 'imhotep', 'beowulf', 'tomoe', 'boudica', 'hannibal', 'trojan', 'rift', 'eclipse', 'ambush', 'phalanx'] },
};
return { CARDS, GUIDES, PLACES, CENTER, EDGE, ARCH, THREADS, ERAS };
});
