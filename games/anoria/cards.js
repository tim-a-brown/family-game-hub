// Anoria: the card pool, for the page and for the rules simulator (scripts/anoria). Numbers here are what the balance runs tune.
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
  blackbeard: F('Blackbeard', 'V', 4, 4, 'AMER', 5, 1718, { raider: 1 }, { arr: ['stun', 1] }),   // (he won by fear: the strongest enemy freezes)
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
  // Wonder. No fictional, mythological or legendary characters for now (Tim, 2026-11-11): the six legends of the first
  // printing (Scheherazade, Anansi, Atalanta, Daedalus, Odysseus, Beowulf) gave their slots to real people, each with
  // the same faction, cost, Might and skills, so the ready decks play as they did. The old cards are in RETIRED below.
  harun: F('Harun al-Rashid', 'W', 2, 2, 'MIDEAST', 3, 786, { untouchable: 1 }),
  nostradamus: F('Nostradamus', 'W', 2, 2, 'EUR', 4, 1555, { scholar: 1 }),
  imhotep: F('Imhotep', 'W', 3, 3, 'AFR', 1, -2650, { monument: 1 }),
  yaa: F('Yaa Asantewaa', 'W', 3, 3, 'AFR', 6, 1900, {}, { arr: ['wits', 1] }),
  artemisia: F('Artemisia of Caria', 'W', 3, 3, 'MED', 2, -480, { swift: 1, slayer: 1 }),
  earhart: F('Amelia Earhart', 'W', 2, 3, 'AMER', 7, 1932, { voyager: 1 }),
  magellan: F('Ferdinand Magellan', 'W', 4, 4, 'EUR', 4, 1520, { voyager: 1, steadfast: 1 }),
  chingshih: F('Ching Shih', 'W', 4, 4, 'ASIA', 6, 1810, { voyager: 1, raider: 1 }),
  alfred: F('Alfred the Great', 'W', 5, 5, 'EUR', 3, 878, { guard: 1, inspiring: 1 }),
  // Timeline test: the same rules from Assyria to the 1800s (and, since Amelia Earhart, into the 1900s)
  ashurbanipal: F('Ashurbanipal', 'S', 3, 3, 'MIDEAST', 1, -650, { scholar: 1 }),
  faraday: F('Michael Faraday', 'D', 4, 4, 'EUR', 6, 1831, { eureka: 1 }),
  douglass: F('Frederick Douglass', 'S', 4, 4, 'AMER', 6, 1852, {}, { arr: ['stun', 9] }),
  // The second printing (2026-11): five more for each ready deck, when a deck grew from 30 cards to 40. All of them
  // use skills the engine already had. Tuned with scripts/anoria (variants.txt, "Decks of 40", "First to 25").
  // (Sinbad the Sailor and Gilgamesh were in it for a day. Zhang Qian and Sargon of Akkad have their slots.)
  // Explorers
  ibnbattuta: F('Ibn Battuta', 'D', 3, 3, 'AFR', 3, 1325, { voyager: 1, swift: 1 }),
  leif: F('Leif Erikson', 'D', 3, 4, 'EUR', 3, 1000, { voyager: 1 }),
  sacagawea: F('Sacagawea', 'D', 2, 2, 'AMER', 6, 1805, { inspiring: 1 }),
  shenkuo: F('Shen Kuo', 'D', 2, 3, 'ASIA', 3, 1088, { eureka: 1 }),
  darwin: F('Charles Darwin', 'D', 4, 4, 'EUR', 6, 1835, { voyager: 1, scholar: 1 }),
  // Legion
  scipio: F('Scipio Africanus', 'V', 4, 5, 'MED', 2, -202, { raider: 1 }),
  toussaint: F('Toussaint Louverture', 'V', 4, 4, 'AMER', 5, 1796, { uprising: 1 }),
  shaka: F('Shaka', 'V', 4, 4, 'AFR', 6, 1818, { orator: 1 }),
  lakshmibai: F('Lakshmibai', 'V', 3, 3, 'ASIA', 6, 1858, { swift: 1, steadfast: 1 }),
  tecumseh: F('Tecumseh', 'V', 3, 3, 'AMER', 6, 1811, { inspiring: 1 }),
  // Legacy
  caesar: F('Julius Caesar', 'S', 5, 6, 'MED', 2, -49, { swift: 1 }, { insp: ['alexander'] }),
  ibnsina: F('Ibn Sina', 'D', 3, 4, 'MIDEAST', 3, 1025, { scholar: 1 }, { insp: ['aristotle'] }),
  chaucer: F('Geoffrey Chaucer', 'A', 3, 4, 'EUR', 3, 1390, { tale: 1 }, { insp: ['virgil', 'dante'] }),
  marcus: F('Marcus Aurelius', 'S', 3, 3, 'MED', 2, 170, { guard: 1, steadfast: 1 }, { insp: ['socrates', 'plato'] }),
  germain: F('Sophie Germain', 'D', 2, 3, 'EUR', 6, 1816, { scholar: 1 }, { insp: ['archimedes', 'newton'] }),
  // Court
  mencius: F('Mencius', 'S', 2, 2, 'ASIA', 2, -320, { scholar: 1 }, { insp: ['confucius'] }),
  nzinga: F('Nzinga', 'S', 4, 4, 'AFR', 4, 1626, { steadfast: 1 }, { arr: ['stun', 1] }),
  hiawatha: F('Hiawatha', 'S', 3, 3, 'AMER', 3, 1450, { law: 1, inspiring: 1 }),
  sorjuana: F('Sor Juana', 'A', 3, 4, 'AMER', 5, 1689, { scholar: 1 }),
  theodora: F('Theodora', 'S', 3, 3, 'MED', 3, 532, { steadfast: 1 }),   // (4 Might until 25 Renown won, which suits Court: variants.txt, "First to 25")
  // Pathfinders
  zhangqian: F('Zhang Qian', 'W', 3, 3, 'ASIA', 2, -138, { voyager: 1 }, { arr: ['spark', 1] }),   // (the Han envoy, in the slot Sinbad the Sailor had. He has 3 Might where Sinbad had 2, which is what Pathfinders wanted once 25 Renown won: variants.txt, "First to 25")
  sargon: F('Sargon of Akkad', 'W', 4, 5, 'MIDEAST', 1, -2334, { guard: 1 }),   // (in the slot Gilgamesh had, with the same numbers)
  sundiata: F('Sundiata Keita', 'V', 3, 2, 'AFR', 3, 1235, { homeDouble: 1 }),
  bolivar: F('Simón Bolívar', 'V', 4, 4, 'AMER', 6, 1819, { swift: 1, raider: 1 }),
  khutulun: F('Khutulun', 'V', 2, 2, 'ASIA', 3, 1280, { slayer: 1 }),
  // Relics (any deck)
  press: { n: 'Printing Press', t: 'relic', f: 'N', c: 2 },
  antikythera: { n: 'Antikythera Mechanism', t: 'relic', f: 'N', c: 3 },
  compass: { n: 'Compass', t: 'relic', f: 'N', c: 1 },
  // Deeds
  phalanx: { n: 'Phalanx', t: 'deed', f: 'V', c: 2, quick: 1 },
  ambush: { n: 'Ambush', t: 'deed', f: 'V', c: 3 },
  crossing: { n: 'Night Crossing', t: 'deed', f: 'W', c: 2, fx: 'trojan' },   // (fx: the effect, when it is not the card's own key. This is the Trojan Horse's: a Figure costing 3 or less arrives from your hand at any Place)
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
const FROM = {'hypatia': ['@library'], 'archimedes': ['@library'], 'mansamusa': ['@timbuktu'], 'pericles': ['@acropolis'], 'shakespeare': ['@globe', 'press'], 'ashurbanipal': ['@nineveh'], 'douglass': ['@seneca'], 'marcopolo': ['@silk'], 'zhenghe': ['compass'], 'nostradamus': ['press'], 'antikythera': ['archimedes'], 'eureka': ['archimedes'], 'phalanx': ['leonidas', 'alexander'], 'ambush': ['hannibal'], 'decree': ['hammurabi', 'ashoka'], 'caravan': ['mansamusa', 'marcopolo', '@silk'], 'encore': ['shakespeare', 'mozart', '@globe'], 'fairwinds': ['zhenghe', 'magellan'], 'eclipse': ['antikythera'],
  'ibnbattuta': ['@timbuktu'], 'shenkuo': ['compass'], 'scipio': ['hannibal'], 'toussaint': ['spartacus'], 'sorjuana': ['sappho'], 'zhangqian': ['@silk'], 'sargon': ['@nineveh', 'ashurbanipal'], 'khutulun': ['marcopolo'], 'harun': ['charlemagne']};
Object.keys(FROM).forEach(k => { CARDS[k].from = FROM[k]; });
// A year for every card and Place that has one (the Library's timeline). Rift has none.
const WHEN = { press: 1450, antikythera: -100, compass: 1100, phalanx: -650, ambush: -217, crossing: 1776, fairwinds: 1405, eclipse: -585, eureka: -250, caravan: 1324, decree: -1754, encore: 1600 };
Object.keys(WHEN).forEach(k => { CARDS[k].y = WHEN[k]; });
const ERAS = [null, { n: 'The First Cities', to: -550 }, { n: 'The Classical World', to: 450 }, { n: 'The Middle Ages', to: 1453 }, { n: 'The Renaissance', to: 1650 }, { n: 'The Enlightenment', to: 1800 }, { n: 'The Age of Steam', to: 1900 }, { n: 'The Modern World', to: 2000 }];
// Named Threads: chains to collect. Owning every card of one completes it (Places are part of the story, not owned).
const THREADS = [
  { id: 'academy', n: 'The Academy', cards: ['socrates', 'plato', 'aristotle', 'alexander'] },
  { id: 'heavens', n: 'The Heavens', cards: ['copernicus', 'galileo', 'newton'] },
  { id: 'epic', n: 'The Epic', cards: ['homer', 'virgil', 'dante'] },
  { id: 'vienna', n: 'Vienna', cards: ['mozart', 'beethoven', 'encore'] },
  { id: 'eureka', n: 'Eureka!', cards: ['archimedes', 'eureka', 'antikythera', 'eclipse'], places: ['library'] },
  { id: 'searoads', n: 'The Sea Roads', cards: ['compass', 'zhenghe', 'marcopolo', 'caravan'], places: ['silk'] },
  { id: 'law', n: 'The Law', cards: ['hammurabi', 'ashoka', 'decree'] },
  { id: 'stage', n: 'The Stage', cards: ['press', 'shakespeare', 'nostradamus'], places: ['globe'] },
  { id: 'learning', n: 'Houses of Learning', cards: ['hypatia', 'mansamusa', 'ashurbanipal', 'pericles'], places: ['library', 'timbuktu', 'nineveh', 'acropolis'] },
  { id: 'shields', n: 'The Shield Wall', cards: ['leonidas', 'alexander', 'phalanx'] },
  { id: 'trap', n: 'The Trap', cards: ['hannibal', 'ambush'] },
  // (the second printing)
  { id: 'conquerors', n: 'The Conquerors', cards: ['alexander', 'caesar'] },
  { id: 'zama', n: 'The Road to Zama', cards: ['hannibal', 'scipio'] },
  { id: 'chains', n: 'Broken Chains', cards: ['spartacus', 'toussaint'] },
  { id: 'tablets', n: 'The Clay Tablets', cards: ['ashurbanipal', 'sargon'], places: ['nineveh'] },
  { id: 'sages', n: 'The Sages', cards: ['confucius', 'mencius'] },
  { id: 'muse', n: 'The Tenth Muse', cards: ['sappho', 'sorjuana'] },
  { id: 'needle', n: 'The Needle', cards: ['compass', 'shenkuo'] },
  { id: 'emperor', n: 'The Philosopher Emperor', cards: ['socrates', 'plato', 'marcus'] },
  { id: 'circles', n: 'Circles in the Sand', cards: ['archimedes', 'germain'] },
  // (in place of The Wooden Horse and The Thousand and One Nights, which went with the legends. A finished line keeps
  // its flag in a collection under its old id, so these have ids of their own.)
  { id: 'pacific', n: 'The Peaceful Sea', cards: ['magellan', 'fairwinds'] },
  { id: 'elephant', n: 'The Caliph\'s Elephant', cards: ['charlemagne', 'harun'] },
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
// Five built decks, each around one way to win (20 cards, two of each). GROWN: the five cards each deck gained when a
// deck went from 30 cards to 40; a collection from before then is given them for every ready deck it could already play
// (coll.js), so nothing a player could play is taken away.
const GROWN = {
  Explorers: ['ibnbattuta', 'leif', 'sacagawea', 'shenkuo', 'darwin'],
  Legion: ['scipio', 'toussaint', 'shaka', 'lakshmibai', 'tecumseh'],
  Legacy: ['caesar', 'ibnsina', 'chaucer', 'marcus', 'germain'],
  Court: ['mencius', 'nzinga', 'hiawatha', 'sorjuana', 'theodora'],
  Pathfinders: ['zhangqian', 'sargon', 'sundiata', 'bolivar', 'khutulun'],
};
// Cards that have left the set (2026-11-11: the legends, and the Trojan Horse with them), each with the card that has
// its slot now (to). Nobody can collect one any more: it is in no pack, no ready deck and no Library. A collection or
// a built deck that held one holds the new card instead (coll.js). The old card itself still works, so a game saved
// with one in it plays on to the end as it was, and an old game's history still knows its name and picture: the
// engine, the table and the history view look a key up here when it is not in CARDS. (Sinbad the Sailor and Gilgamesh
// were only ever in the second printing's first day.)
const RETIRED = {
  scheherazade: F('Scheherazade', 'W', 2, 2, 'MIDEAST', 3, 800, { untouchable: 1 }, { to: 'harun' }),
  anansi: F('Anansi', 'W', 3, 3, 'AFR', 3, 1200, {}, { arr: ['wits', 1], to: 'yaa' }),
  atalanta: F('Atalanta', 'W', 3, 3, 'MED', 1, -1300, { swift: 1, slayer: 1 }, { to: 'artemisia' }),
  daedalus: F('Daedalus', 'W', 2, 3, 'MED', 1, -1400, { voyager: 1 }, { to: 'earhart' }),
  odysseus: F('Odysseus', 'W', 4, 4, 'MED', 1, -1200, { voyager: 1, steadfast: 1 }, { insp: ['homer'], to: 'magellan' }),
  beowulf: F('Beowulf', 'W', 5, 5, 'EUR', 3, 520, { guard: 1, inspiring: 1 }, { to: 'alfred' }),
  trojan: { n: 'Trojan Horse', t: 'deed', f: 'W', c: 2, y: -1200, fx: 'trojan', from: ['odysseus'], to: 'crossing' },
  sinbad: F('Sinbad the Sailor', 'W', 3, 2, 'MIDEAST', 3, 800, { voyager: 1 }, { arr: ['spark', 1], from: ['scheherazade'], to: 'zhangqian' }),
  gilgamesh: F('Gilgamesh', 'W', 4, 5, 'MIDEAST', 1, -2700, { guard: 1 }, { from: ['@nineveh', 'ashurbanipal'], to: 'sargon' }),
};
// a key as it stands today: the card that has a retired card's slot, or the key itself
const now = k => RETIRED[k] ? RETIRED[k].to : k;
const ARCH = {
  Explorers: { guide: 'leonardo', cards: ['zhenghe', 'marcopolo', 'earhart', 'magellan', 'chingshih', 'hypatia', 'archimedes', 'copernicus', 'galileo', 'nostradamus', 'antikythera', 'compass', 'press', 'fairwinds', 'eureka'] },
  Legion: { guide: 'suntzu', cards: ['spartacus', 'leonidas', 'boudica', 'tomoe', 'joan', 'saladin', 'yisunsin', 'hannibal', 'charlemagne', 'hatshepsut', 'pericles', 'elizabeth', 'phalanx', 'ambush', 'decree'] },
  Legacy: { guide: 'franklin', cards: ['socrates', 'plato', 'aristotle', 'alexander', 'archimedes', 'copernicus', 'galileo', 'newton', 'homer', 'virgil', 'dante', 'mozart', 'beethoven', 'michelangelo', 'eureka'] },
  Court: { guide: 'cleopatra', cards: ['hammurabi', 'hatshepsut', 'pericles', 'ashoka', 'confucius', 'mansamusa', 'elizabeth', 'charlemagne', 'homer', 'sappho', 'murasaki', 'shakespeare', 'hokusai', 'decree', 'caravan'] },
  Pathfinders: { guide: 'tubman', cards: ['harun', 'yaa', 'artemisia', 'earhart', 'chingshih', 'imhotep', 'alfred', 'tomoe', 'boudica', 'hannibal', 'crossing', 'rift', 'eclipse', 'ambush', 'phalanx'] },
};
Object.keys(ARCH).forEach(k => { ARCH[k].cards = ARCH[k].cards.concat(GROWN[k]); });
return { CARDS, RETIRED, now, GUIDES, PLACES, CENTER, EDGE, ARCH, GROWN, THREADS, ERAS };
});
