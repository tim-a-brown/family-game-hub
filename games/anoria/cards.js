// Anoria: the card pool, for the page and for the rules simulator (scripts/anoria). Numbers here are what the balance runs tune.
// Figure: f faction (D Discovery, S Statecraft, V Valor, A Arts, W Wonder), c Spark cost, m Might, reg home region,
// era 1..7, y year (for the fun log), k keywords, arr arrive effect, insp who inspired them (Legacy)
// Relic or Deed: fx the effect it has when that is not its own key, quick (a Quick Deed), pr 3 (the third printing)
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
// ── The third printing (2026-11-11): 150 more cards from real history, 100 Figures, 20 Relics and 30 Deeds, found
// only in packs (like Blackbeard, they are in no ready deck). Tim: "increase the number of possible historical cards to
// collect outside of the base packs by 150 ... lean slightly more into more well-known historical figures but i do
// like learning more history. add threads/legacy lines as the real history would necessitate and fits gameplay ...
// leave off completely fictional characters for now", and later "shift 25-30 to deeds and relics".
// Every Figure uses skills the engine already had. A Relic or a Deed says whose effect it has with `fx` (engine.js
// fxOf): the Astrolabe is a Compass in effect, Mailed to Freedom runs the effect Night Crossing runs. Where each
// card's facts came from, what was dropped and what still needs engine work is in scripts/anoria/set-150.json;
// scripts/anoria/check-set.js checks the set. Numbers tuned with run.js cards and newdecks.js (set-150-balance.txt).
const P3 = {
  // Discovery
  euclid: F('Euclid', 'D', 2, 3, 'AFR', 2, -300, { scholar: 1 }),
  eratosthenes: F('Eratosthenes', 'D', 3, 3, 'AFR', 2, -240, { scholar: 1 }),
  hippocrates: F('Hippocrates', 'D', 3, 3, 'MED', 2, -400, { inspiring: 1 }),
  zhangheng: F('Zhang Heng', 'D', 3, 3, 'ASIA', 2, 132, { eureka: 1 }),
  cailun: F('Cai Lun', 'D', 2, 2, 'ASIA', 2, 105, { scholar: 1 }),
  brahmagupta: F('Brahmagupta', 'D', 2, 2, 'ASIA', 3, 628, { scholar: 1 }),
  alkhwarizmi: F('Al-Khwarizmi', 'D', 2, 2, 'MIDEAST', 3, 825, { deedsLess: 1 }, { insp: ['brahmagupta'] }),
  fibonacci: F('Fibonacci', 'D', 3, 3, 'MED', 3, 1202, {}, { arr: ['spark', 1], insp: ['alkhwarizmi'] }),
  gutenberg: F('Johannes Gutenberg', 'D', 3, 3, 'EUR', 3, 1450, { eureka: 1 }),
  amundsen: F('Roald Amundsen', 'D', 4, 4, 'EUR', 7, 1911, { voyager: 1 }, { arr: ['spark', 1] }),
  kepler: F('Johannes Kepler', 'D', 4, 4, 'EUR', 4, 1609, { scholar: 1 }, { insp: ['copernicus'] }),
  montagu: F('Lady Mary Wortley Montagu', 'D', 2, 3, 'EUR', 5, 1721, { voyager: 1 }),
  duchatelet: F('Émilie du Châtelet', 'D', 3, 4, 'EUR', 5, 1749, { scholar: 1 }, { insp: ['newton'] }),
  jenner: F('Edward Jenner', 'D', 3, 3, 'EUR', 5, 1796, { steadfast: 1 }, { insp: ['montagu'] }),
  humboldt: F('Alexander von Humboldt', 'D', 4, 4, 'EUR', 6, 1802, { voyager: 1, inspiring: 1 }),
  anning: F('Mary Anning', 'D', 2, 3, 'EUR', 6, 1811, { eureka: 1 }),
  champollion: F('Jean-François Champollion', 'D', 2, 2, 'EUR', 6, 1822, { scholar: 1 }),
  nightingale: F('Florence Nightingale', 'D', 3, 3, 'EUR', 6, 1854, { inspiring: 1 }),
  pasteur: F('Louis Pasteur', 'D', 4, 4, 'EUR', 6, 1885, { steadfast: 1 }, { insp: ['jenner'] }),
  bly: F('Nellie Bly', 'D', 3, 3, 'AMER', 6, 1889, { voyager: 1, swift: 1 }),
  tesla: F('Nikola Tesla', 'D', 3, 4, 'AMER', 6, 1888, {}, { arr: ['stun', 1] }),
  einstein: F('Albert Einstein', 'D', 5, 4, 'EUR', 7, 1905, { shoulders: 1 }, { insp: ['newton', 'faraday'] }),
  turing: F('Alan Turing', 'D', 3, 3, 'EUR', 7, 1936, {}, { arr: ['stun', 1], insp: ['ada'] }),
  // Statecraft
  cyrus: F('Cyrus the Great', 'S', 4, 4, 'MIDEAST', 1, -550, { inspiring: 1 }),
  qinshihuang: F('Qin Shi Huang', 'S', 5, 6, 'ASIA', 2, -221, { guard: 1 }),
  augustus: F('Augustus', 'S', 5, 6, 'MED', 2, -27, {}, { arr: ['stun', 9], insp: ['caesar'] }),
  wuzetian: F('Wu Zetian', 'S', 4, 5, 'ASIA', 3, 690, {}, { arr: ['stun', 1] }),
  darius: F('Darius the Great', 'S', 3, 3, 'MIDEAST', 2, -515, {}, { arr: ['spark', 1] }),
  eleanor: F('Eleanor of Aquitaine', 'S', 3, 4, 'EUR', 3, 1152, { voyager: 1 }),
  kublai: F('Kublai Khan', 'S', 4, 5, 'ASIA', 3, 1271, {}, { arr: ['spark', 1] }),
  ibnkhaldun: F('Ibn Khaldun', 'S', 3, 4, 'AFR', 3, 1377, {}, { arr: ['stun', 1] }),
  nezahualcoyotl: F('Nezahualcoyotl', 'S', 3, 4, 'AMER', 3, 1431, { tale: 1 }),
  sejong: F('Sejong the Great', 'S', 4, 4, 'ASIA', 3, 1443, { scholar: 1, inspiring: 1 }),
  // (Pachacuti has the first of the Domain powers since 2026-11-11, in place of "At home he has +3 Might": he looks at his
  // top three Domains and may lay one at his Gate or Outpost. With the home power he read 3.5 points over Statecraft's
  // line once players brought their own Domains; with this one he is on it: scripts/anoria/domains.txt)
  // k0: the skills he had before, which he keeps in a game without Domains (a game saved before them), so that game
  // plays to its end as it began (engine.js might(), text.js tx0).
  pachacuti: F('Pachacuti', 'S', 4, 4, 'AMER', 3, 1450, {}, { arr: ['scout', 3], k0: { homeDouble: 1 } }),
  suleiman: F('Suleiman the Magnificent', 'S', 4, 4, 'MIDEAST', 4, 1530, { law: 1 }),
  akbar: F('Akbar', 'S', 4, 4, 'ASIA', 4, 1582, { orator: 1 }),
  voltaire: F('Voltaire', 'S', 3, 3, 'EUR', 5, 1759, {}, { arr: ['wits', 1] }),
  catherine: F('Catherine the Great', 'S', 4, 5, 'EUR', 5, 1762, {}, { arr: ['push', 1] }),
  wollstonecraft: F('Mary Wollstonecraft', 'S', 2, 2, 'EUR', 5, 1792, {}, { arr: ['stun', 1] }),
  victoria: F('Queen Victoria', 'S', 5, 5, 'EUR', 6, 1837, { monument: 1 }),
  stanton: F('Elizabeth Cady Stanton', 'S', 3, 3, 'AMER', 6, 1848, { inspiring: 1 }),
  thoreau: F('Henry David Thoreau', 'S', 2, 2, 'AMER', 6, 1849, { underdog: 1 }),
  anthony: F('Susan B. Anthony', 'S', 3, 3, 'AMER', 6, 1872, { steadfast: 1 }, { insp: ['stanton'] }),
  king: F('Martin Luther King Jr.', 'S', 4, 4, 'AMER', 7, 1963, {}, { arr: ['stun', 9], insp: ['thoreau'] }),
  // Valor
  fuhao: F('Fu Hao', 'V', 3, 3, 'ASIA', 1, -1200, { orator: 1 }),
  vercingetorix: F('Vercingetorix', 'V', 3, 3, 'EUR', 2, -52, { uprising: 1 }),
  amanirenas: F('Amanirenas', 'V', 3, 3, 'AFR', 2, -24, { raider: 1 }),
  arminius: F('Arminius', 'V', 3, 4, 'EUR', 2, 9, {}, { arr: ['push', 1] }),
  trung: F('The Trưng Sisters', 'V', 3, 3, 'ASIA', 2, 40, { inspiring: 1 }),
  zenobia: F('Zenobia', 'V', 4, 5, 'MIDEAST', 2, 270, { raider: 1 }),
  richard: F('Richard the Lionheart', 'V', 4, 4, 'EUR', 3, 1191, { raider: 1 }, { insp: ['eleanor'] }),
  lapulapu: F('Lapulapu', 'V', 3, 2, 'ASIA', 4, 1521, { homeDouble: 1 }),
  musashi: F('Miyamoto Musashi', 'V', 4, 5, 'ASIA', 4, 1612, { slayer: 1 }),
  zumbi: F('Zumbi', 'V', 4, 5, 'AMER', 5, 1694, { guard: 1 }),
  nanny: F('Nanny of the Maroons', 'V', 3, 3, 'AMER', 5, 1733, { raider: 1 }),
  washington: F('George Washington', 'V', 5, 4, 'AMER', 5, 1776, { inspiring: 1, steadfast: 1 }),   // (5 Might won 58.5% of the games he was played in, 3 points above any Valor card before him: set-150-balance.txt)
  napoleon: F('Napoleon', 'V', 5, 5, 'EUR', 6, 1805, { orator: 1 }, { insp: ['hannibal', 'caesar'] }),
  chiefjoseph: F('Chief Joseph', 'V', 4, 4, 'AMER', 6, 1877, { voyager: 1, steadfast: 1 }),
  menelik: F('Menelik II', 'V', 4, 3, 'AFR', 6, 1896, { homeDouble: 1 }),
  wallace: F('William Wallace', 'V', 3, 3, 'EUR', 3, 1297, { underdog: 1 }),
  thorpe: F('Jim Thorpe', 'V', 3, 4, 'AMER', 7, 1912, { swift: 1 }),
  owens: F('Jesse Owens', 'V', 2, 2, 'AMER', 7, 1936, { swift: 1 }),
  // Arts
  enheduanna: F('Enheduanna', 'A', 2, 2, 'MIDEAST', 1, -2270, { inspiring: 1 }),
  aeschylus: F('Aeschylus', 'A', 3, 3, 'MED', 2, -472, { steadfast: 1 }, { insp: ['homer'] }),
  libai: F('Li Bai', 'A', 2, 3, 'ASIA', 3, 744, { voyager: 1 }),
  seishonagon: F('Sei Shōnagon', 'A', 2, 3, 'ASIA', 3, 1002, { scholar: 1 }),
  ferdowsi: F('Ferdowsi', 'A', 3, 4, 'MIDEAST', 3, 1010, { tale: 1 }),
  rumi: F('Rumi', 'A', 3, 3, 'MIDEAST', 3, 1250, { inspiring: 1 }),
  cervantes: F('Miguel de Cervantes', 'A', 4, 4, 'MED', 4, 1605, { tale: 1 }),
  gentileschi: F('Artemisia Gentileschi', 'A', 3, 3, 'MED', 4, 1612, { slayer: 1 }),
  basho: F('Matsuo Bashō', 'A', 3, 3, 'ASIA', 5, 1689, { voyager: 1 }, { insp: ['libai'] }),
  bach: F('Johann Sebastian Bach', 'A', 4, 4, 'EUR', 5, 1722, { inspiring: 1 }),
  wheatley: F('Phillis Wheatley', 'A', 2, 2, 'AMER', 5, 1773, { scholar: 1 }, { insp: ['homer', 'virgil'] }),
  equiano: F('Olaudah Equiano', 'A', 2, 3, 'AFR', 5, 1789, { voyager: 1 }),
  austen: F('Jane Austen', 'A', 2, 3, 'EUR', 6, 1813, { scholar: 1 }),
  sequoyah: F('Sequoyah', 'A', 2, 2, 'AMER', 6, 1821, { tale: 1 }),
  hiroshige: F('Hiroshige', 'A', 3, 4, 'ASIA', 6, 1833, {}, { insp: ['hokusai'] }),
  goethe: F('Goethe', 'A', 4, 4, 'EUR', 6, 1808, { scholar: 1 }, { insp: ['shakespeare'] }),
  dickinson: F('Emily Dickinson', 'A', 2, 2, 'AMER', 6, 1862, { untouchable: 1 }),
  tolstoy: F('Leo Tolstoy', 'A', 4, 4, 'EUR', 6, 1869, { inspiring: 1 }),
  tchaikovsky: F('Pyotr Tchaikovsky', 'A', 3, 4, 'EUR', 6, 1877, {}, { insp: ['mozart'] }),
  twain: F('Mark Twain', 'A', 3, 3, 'AMER', 6, 1884, {}, { arr: ['wits', 1] }),
  vangogh: F('Vincent van Gogh', 'A', 3, 3, 'EUR', 6, 1888, { swift: 1 }, { insp: ['hiroshige'] }),
  joplin: F('Scott Joplin', 'A', 2, 2, 'AMER', 6, 1899, { swift: 1 }),
  kahlo: F('Frida Kahlo', 'A', 3, 4, 'AMER', 7, 1939, { steadfast: 1 }),
  // Wonder
  tutankhamun: F('Tutankhamun', 'W', 2, 2, 'AFR', 1, -1330, { untouchable: 1 }),
  ramesses: F('Ramesses II', 'W', 4, 4, 'AFR', 1, -1264, { monument: 1 }),
  pythagoras: F('Pythagoras', 'W', 3, 3, 'MED', 2, -530, { inspiring: 1 }),
  pakal: F('Pakal the Great', 'W', 3, 3, 'AMER', 3, 650, { monument: 1 }),
  hildegard: F('Hildegard of Bingen', 'W', 3, 4, 'EUR', 3, 1150, { scholar: 1 }),
  lalibela: F('Lalibela', 'W', 3, 3, 'AFR', 3, 1200, { monument: 1 }),
  grace: F('Grace O\'Malley', 'W', 3, 2, 'EUR', 4, 1593, { voyager: 1, raider: 1 }),
  shahjahan: F('Shah Jahan', 'W', 4, 3, 'ASIA', 4, 1632, {}, { arr: ['spark', 2] }),
  shelley: F('Mary Shelley', 'W', 3, 4, 'EUR', 6, 1818, { scholar: 1 }, { insp: ['wollstonecraft'] }),
  andersen: F('Hans Christian Andersen', 'W', 2, 2, 'EUR', 6, 1837, { tale: 1 }),
  poe: F('Edgar Allan Poe', 'W', 2, 2, 'AMER', 6, 1845, {}, { arr: ['stun', 1] }),
  verne: F('Jules Verne', 'W', 3, 4, 'EUR', 6, 1870, { voyager: 1 }, { insp: ['poe'] }),
  oakley: F('Annie Oakley', 'W', 2, 2, 'AMER', 6, 1885, { slayer: 1 }),
  houdini: F('Harry Houdini', 'W', 3, 2, 'AMER', 7, 1912, { swift: 1, untouchable: 1 }),
  tenzing: F('Tenzing Norgay', 'W', 3, 4, 'ASIA', 7, 1953, { voyager: 1 }),
  // Relics (any deck). Three powers: a player has two Relics in play at most, and no two with the same power.
  // (the Compass's power)
  astrolabe: { n: 'Astrolabe', t: 'relic', f: 'N', c: 1, fx: 'compass', y: 400 },
  locomotive: { n: 'Steam Locomotive', t: 'relic', f: 'N', c: 1, fx: 'compass', y: 1829 },
  stirrup: { n: 'Stirrup', t: 'relic', f: 'N', c: 1, fx: 'compass', y: 415 },
  birchbark: { n: 'Birchbark Canoe', t: 'relic', f: 'N', c: 1, fx: 'compass', y: 1600 },
  ropebridge: { n: 'Inca Rope Bridge', t: 'relic', f: 'N', c: 1, fx: 'compass', y: 1450 },
  wheel: { n: 'The Wheel', t: 'relic', f: 'N', c: 1, fx: 'compass', y: -3150 },
  // (the Printing Press's power)
  paper: { n: 'Paper', t: 'relic', f: 'N', c: 2, fx: 'press', y: 105 },
  rosetta: { n: 'Rosetta Stone', t: 'relic', f: 'N', c: 2, fx: 'press', y: -196 },
  quipu: { n: 'Quipu', t: 'relic', f: 'N', c: 2, fx: 'press', y: 1450 },
  starchart: { n: 'Dunhuang Star Chart', t: 'relic', f: 'N', c: 2, fx: 'press', y: 670 },
  telescope: { n: 'Telescope', t: 'relic', f: 'N', c: 2, fx: 'press', y: 1609 },
  manuscripts: { n: 'Timbuktu Manuscripts', t: 'relic', f: 'N', c: 2, fx: 'press', y: 1500 },
  telegraph: { n: 'Telegraph', t: 'relic', f: 'N', c: 2, fx: 'press', y: 1844 },
  braille: { n: 'Braille', t: 'relic', f: 'N', c: 2, fx: 'press', y: 1824 },
  tablet: { n: 'Clay Tablet', t: 'relic', f: 'N', c: 2, fx: 'press', y: -3200 },
  // (the Antikythera Mechanism's power)
  balloon: { n: 'Montgolfier Balloon', t: 'relic', f: 'N', c: 3, fx: 'antikythera', y: 1783 },
  wrightflyer: { n: 'Wright Flyer', t: 'relic', f: 'N', c: 3, fx: 'antikythera', y: 1903 },
  sextant: { n: 'Sextant', t: 'relic', f: 'N', c: 3, fx: 'antikythera', y: 1757 },
  voyagingcanoe: { n: 'Voyaging Canoe', t: 'relic', f: 'N', c: 3, fx: 'antikythera', y: 1000 },
  longship: { n: 'Viking Longship', t: 'relic', f: 'N', c: 3, fx: 'antikythera', y: 890 },
  // Deeds, six in each faction
  beagle: { n: 'Voyage of the Beagle', t: 'deed', f: 'D', c: 1, fx: 'eureka', y: 1831 },
  hieroglyphs: { n: 'The Hieroglyphs Read', t: 'deed', f: 'D', c: 1, fx: 'eureka', y: 1822 },
  halley: { n: 'Halley\'s Comet Returns', t: 'deed', f: 'D', c: 1, fx: 'encore', y: 1758 },
  naovictoria: { n: 'The Victoria Comes Home', t: 'deed', f: 'D', c: 1, fx: 'caravan', y: 1522 },
  syracuse: { n: 'The Defence of Syracuse', t: 'deed', f: 'D', c: 2, fx: 'phalanx', quick: 1, y: -213 },
  penicillin: { n: 'Penicillin', t: 'deed', f: 'D', c: 1, fx: 'eureka', y: 1928 },
  goldrush: { n: 'Gold Rush', t: 'deed', f: 'S', c: 1, fx: 'caravan', y: 1849 },
  truce: { n: 'Christmas Truce', t: 'deed', f: 'S', c: 1, fx: 'eclipse', y: 1914 },
  magnacarta: { n: 'Magna Carta', t: 'deed', f: 'S', c: 1, fx: 'eclipse', y: 1215 },
  saltmarch: { n: 'Salt March', t: 'deed', f: 'S', c: 1, fx: 'decree', y: 1930 },
  emancipation: { n: 'Emancipation Proclamation', t: 'deed', f: 'S', c: 1, fx: 'decree', y: 1863 },
  spies: { n: 'Bridge of Spies', t: 'deed', f: 'S', c: 2, fx: 'rift', y: 1962 },
  teutoburg: { n: 'Teutoburg Forest', t: 'deed', f: 'V', c: 3, fx: 'ambush', y: 9 },
  testudo: { n: 'Testudo', t: 'deed', f: 'V', c: 2, fx: 'phalanx', quick: 1, y: -54 },
  marathonmarch: { n: 'The March from Marathon', t: 'deed', f: 'V', c: 1, fx: 'encore', y: -490 },
  planter: { n: 'Taking the Planter', t: 'deed', f: 'V', c: 0, fx: 'fairwinds', y: 1862 },
  rubicon: { n: 'Crossing the Rubicon', t: 'deed', f: 'V', c: 0, fx: 'fairwinds', y: -49 },
  adwa: { n: 'The Battle of Adwa', t: 'deed', f: 'V', c: 1, fx: 'decree', y: 1896 },
  ninth: { n: 'Ode to Joy', t: 'deed', f: 'A', c: 1, fx: 'encore', y: 1824 },
  folio: { n: 'The First Folio', t: 'deed', f: 'A', c: 1, fx: 'eureka', y: 1623 },
  david: { n: 'David Unveiled', t: 'deed', f: 'A', c: 1, fx: 'decree', y: 1504 },
  rite: { n: 'The Rite of Spring', t: 'deed', f: 'A', c: 1, fx: 'eclipse', y: 1913 },
  lincolnconcert: { n: 'The Lincoln Memorial Concert', t: 'deed', f: 'A', c: 1, fx: 'encore', y: 1939 },
  pictureshow: { n: 'The First Picture Show', t: 'deed', f: 'A', c: 1, fx: 'caravan', y: 1895 },
  brownsbox: { n: 'Mailed to Freedom', t: 'deed', f: 'W', c: 2, fx: 'trojan', y: 1849 },
  everest: { n: 'The Summit of Everest', t: 'deed', f: 'W', c: 0, fx: 'fairwinds', y: 1953 },
  kadesh: { n: 'The Treaty of Kadesh', t: 'deed', f: 'W', c: 1, fx: 'eclipse', y: -1259 },
  typhoon: { n: 'The Typhoon of 1281', t: 'deed', f: 'W', c: 1, fx: 'eclipse', y: 1281 },
  tomb: { n: 'Tutankhamun\'s Tomb Opened', t: 'deed', f: 'W', c: 1, fx: 'caravan', y: 1922 },
  lascaux: { n: 'Lascaux Found', t: 'deed', f: 'W', c: 1, fx: 'eureka', y: 1940 },
};
// their Legacy Lines (what each grew from: a Figure, a Relic or a Place), as FROM above
const FROM3 = {'euclid': ['@library'], 'eratosthenes': ['@library', 'archimedes'], 'gutenberg': ['press', 'paper'], 'champollion': ['rosetta'], 'bly': ['verne'], 'tesla': ['faraday'],
  'qinshihuang': ['@wall'], 'darius': ['cyrus'], 'pachacuti': ['@machu', '@qhapaq'], 'voltaire': ['duchatelet'], 'catherine': ['voltaire'], 'stanton': ['@seneca'], 'vercingetorix': ['caesar'],
  'amanirenas': ['augustus'], 'arminius': ['augustus'], 'richard': ['saladin'], 'lapulapu': ['magellan'], 'enheduanna': ['sargon'], 'seishonagon': ['murasaki'],
  'gentileschi': ['galileo'], 'grace': ['elizabeth'], 'oakley': ['sittingbull'], 'astrolabe': ['hypatia'], 'paper': ['cailun'], 'rosetta': ['napoleon'], 'teutoburg': ['arminius'],
  'testudo': ['caesar'], 'brownsbox': ['douglass'], 'beagle': ['darwin'], 'magnacarta': ['eleanor'], 'marathonmarch': ['aeschylus'], 'ninth': ['beethoven'],
  'saltmarch': ['thoreau'], 'emancipation': ['douglass'], 'sextant': ['astrolabe'], 'ropebridge': ['pachacuti'], 'starchart': ['@silk'], 'telescope': ['galileo'],
  'manuscripts': ['@timbuktu'], 'hieroglyphs': ['champollion', 'rosetta'], 'halley': ['newton'], 'naovictoria': ['magellan'], 'syracuse': ['archimedes'], 'folio': ['shakespeare', 'press'],
  'david': ['michelangelo'], 'rubicon': ['caesar'], 'adwa': ['menelik'], 'everest': ['tenzing'], 'kadesh': ['ramesses'], 'typhoon': ['kublai'], 'tomb': ['tutankhamun']};
const PRINT3 = Object.keys(P3);
PRINT3.forEach(k => { P3[k].pr = 3; if (FROM3[k]) P3[k].from = FROM3[k]; CARDS[k] = P3[k]; });
// ── The Domain cards (2026-11-11, with Domains: engine.js) ───────────────────────────────────────────────────
// Eleven cards that act on the Domains themselves, found only in packs like the third printing, but in the first
// series, so a new player meets them in their first weeks (coll.js DOMAIN_CARD_SERIES). They go in a deck of 40 like
// any card. Pachacuti, who was already in the third printing, has the twelfth such power (above).
//   arr scout n   look at the top n Domains of your stack: you may lay one at your Gate or your Outpost
//   arr survey    look through your whole stack for one, then shuffle        arr rebuild   one from your Domain discard pile
//   arr found     you may lay the top Domain of your stack at the Crossroads
//   arr conquer   at the other player's Gate or Outpost: you may have the Domain there discarded, and they lay their next
//   k cynic       the Domain where this Figure stands has no rule
//   earthquake    a Gate's or an Outpost's Domain is discarded, and that side's player lays their next
//   vesuvius      the card lies on a Domain, which has no rule while it does     caperoute   your next Domain to the Crossroads
//   breda         two Domains change places     columbian   Gate for Gate, Outpost for Outpost
//   kudurru       (a Relic) the other player's cards cannot replace, move or silence the Domains at your Gate and Outpost
// Costs from scripts/anoria/domains.txt (the test games on this engine) and places/results.txt B3.
// Congress of Vienna, the thirteenth card of the prototype, is left out: see domains.txt.
const P4 = {
  idrisi: F('Al-Idrisi', 'D', 2, 3, 'MED', 3, 1154, {}, { arr: ['survey', 1] }),
  diogenes: F('Diogenes', 'D', 2, 3, 'MED', 2, -350, { cynic: 1 }),   // (the prototype had him at 1 Spark and 2 Might: 3.6 points over Discovery's line, and the game has no Figure that costs 1)
  constantine: F('Constantine', 'S', 5, 5, 'MED', 2, 330, {}, { arr: ['found', 1], from: ['@constantinople'] }),
  william: F('William the Conqueror', 'V', 5, 5, 'EUR', 3, 1066, {}, { arr: ['conquer', 1], from: ['@winchester'] }),
  wren: F('Christopher Wren', 'A', 2, 3, 'EUR', 5, 1675, {}, { arr: ['rebuild', 1], from: ['@royalsociety'] }),
  earthquake: { n: 'Earthquake', t: 'deed', f: 'W', c: 2, y: -226 },
  vesuvius: { n: 'Vesuvius', t: 'deed', f: 'W', c: 1, y: 79 },
  caperoute: { n: 'The Cape Route', t: 'deed', f: 'D', c: 2, y: 1498, from: ['@cape', '@lisbon'] },
  breda: { n: 'Treaty of Breda', t: 'deed', f: 'S', c: 2, y: 1667 },
  columbian: { n: 'The Columbian Exchange', t: 'deed', f: 'D', c: 3, y: 1492 },
  kudurru: { n: 'Boundary Stone', t: 'relic', f: 'N', c: 1, y: -1200, from: ['@babylon'] },
};
const PRINT4 = Object.keys(P4);
PRINT4.forEach(k => { P4[k].pr = 4; CARDS[k] = P4[k]; });
// Legacy Lines the new cards give to cards the game already had. All of them are lines (`from`: Renown when the
// card is played with its source on your side), so no older card changes its rules text, its cost or its Might.
const FROM_MORE = { darwin: ['humboldt'], bolivar: ['humboldt'], marcopolo: ['kublai'], newton: ['kepler'], mozart: ['bach'], plato: ['pythagoras'] };
Object.keys(FROM_MORE).forEach(k => { CARDS[k].from = (CARDS[k].from || []).concat(FROM_MORE[k]); });
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
  // (the third printing. The lines above are left as they were: one that grew would stop being finished for
  // someone who had finished it)
  { id: 'civil', n: 'Civil Disobedience', cards: ['thoreau', 'saltmarch', 'king'] },
  { id: 'vaccine', n: 'The Vaccine', cards: ['montagu', 'jenner', 'pasteur'] },
  { id: 'figures', n: 'The Nine Figures', cards: ['brahmagupta', 'alkhwarizmi', 'fibonacci'] },
  { id: 'reason', n: 'The Age of Reason', cards: ['newton', 'duchatelet', 'voltaire', 'catherine'] },
  { id: 'giants', n: 'The Shoulders of Giants', cards: ['newton', 'faraday', 'tesla', 'einstein'] },
  { id: 'caesars', n: 'The Caesars', cards: ['alexander', 'caesar', 'rubicon', 'testudo', 'augustus'] },
  { id: 'eagles', n: 'Against the Eagles', cards: ['vercingetorix', 'arminius', 'teutoburg', 'amanirenas'] },
  { id: 'floating', n: 'The Floating World', cards: ['hokusai', 'hiroshige', 'vangogh'] },
  { id: 'narrowroad', n: 'The Narrow Road', cards: ['libai', 'basho'] },
  { id: 'eightydays', n: 'Eighty Days', cards: ['poe', 'verne', 'bly'] },
  { id: 'khans', n: 'The Great Khan', cards: ['kublai', 'typhoon', 'marcopolo', 'khutulun'] },
  { id: 'lionheart', n: 'The Lionheart', cards: ['eleanor', 'richard', 'saladin', 'magnacarta'] },
  { id: 'jubilee', n: 'Day of Jubilee', cards: ['douglass', 'emancipation', 'brownsbox'] },
  { id: 'votes', n: 'Votes for Women', cards: ['douglass', 'stanton', 'anthony'], places: ['seneca'] },
  { id: 'threescripts', n: 'The Three Scripts', cards: ['napoleon', 'rosetta', 'champollion', 'hieroglyphs'] },
  { id: 'printed', n: 'The Printed Word', cards: ['cailun', 'paper', 'press', 'gutenberg'] },
  { id: 'measure', n: 'The Measure of the World', cards: ['euclid', 'eratosthenes', 'hypatia', 'astrolabe', 'sextant'], places: ['library'] },
  { id: 'spice', n: 'The Spice Islands', cards: ['magellan', 'lapulapu', 'naovictoria'] },
  { id: 'timbuktubooks', n: 'The Books of Timbuktu', cards: ['mansamusa', 'ibnbattuta', 'manuscripts'], places: ['timbuktu'] },
  { id: 'marathon', n: 'The Men of Marathon', cards: ['aeschylus', 'marathonmarch'] },
  { id: 'vindication', n: 'A Vindication', cards: ['wollstonecraft', 'shelley'] },
  { id: 'machine', n: 'The Thinking Machine', cards: ['ada', 'turing'] },
  { id: 'sureshot', n: 'Little Sure Shot', cards: ['sittingbull', 'oakley'] },
  { id: 'shiningcourt', n: 'The Rival Courts', cards: ['murasaki', 'seishonagon'] },
  { id: 'florence', n: 'The Stars and the Brush', cards: ['galileo', 'gentileschi'] },
  { id: 'mozartiana', n: 'Mozartiana', cards: ['mozart', 'tchaikovsky'] },
  { id: 'ode', n: 'The Ninth', cards: ['beethoven', 'ninth'] },
  { id: 'beaglevoyage', n: 'The Beagle', cards: ['darwin', 'beagle'] },
  { id: 'royalroad', n: 'The Royal Road', cards: ['pachacuti', 'ropebridge'], places: ['machu'] },
  { id: 'valley', n: 'The Valley of the Kings', cards: ['tutankhamun', 'tomb'] },
  { id: 'silvertreaty', n: 'The Silver Treaty', cards: ['ramesses', 'kadesh'] },
  { id: 'adwaroad', n: 'The Road to Adwa', cards: ['menelik', 'adwa'] },
  { id: 'giant', n: 'The Giant', cards: ['michelangelo', 'david'] },
  { id: 'kings', n: 'The King of Kings', cards: ['cyrus', 'darius'] },
  { id: 'roof', n: 'The Roof of the World', cards: ['tenzing', 'everest'] },
  { id: 'spheres', n: 'The Clockwork Heavens', cards: ['copernicus', 'kepler', 'newton', 'halley'] },
  { id: 'moons', n: 'The Moons of Jupiter', cards: ['galileo', 'telescope'] },
  { id: 'banquet', n: 'Homer\'s Banquet', cards: ['homer', 'aeschylus', 'wheatley'] },
  { id: 'bard', n: 'The Bard', cards: ['shakespeare', 'folio', 'goethe'] },
  { id: 'walls', n: 'The Walls of Syracuse', cards: ['archimedes', 'syracuse'] },
  { id: 'akkad', n: 'The House of Akkad', cards: ['sargon', 'enheduanna', 'tablet'] },
];
// The first five each bring a ready deck (ARCH). The five after them (2026-11-11) join a player as wins against the
// computer add up, and guide a deck the player builds.
const GUIDES = { cleopatra: 'Cleopatra', leonardo: 'Leonardo da Vinci', tubman: 'Harriet Tubman', franklin: 'Benjamin Franklin', suntzu: 'Sun Tzu',
  genghis: 'Genghis Khan', curie: 'Marie Curie', lincoln: 'Abraham Lincoln', mandela: 'Nelson Mandela', gandhi: 'Gandhi' };
// ── Domains (Tim, 2026-11-11) ───────────────────────────────────────────────────────────────────────────────
// The card that lies at a Gate, an Outpost or the Crossroads is a Domain (in code it is still a "place", as a Legacy
// Line is still a "thread"). Each player brings a stack of 15, no two the same, chosen from all the Domains they own;
// the rules are in engine.js and, as a person reads them at a table, in scripts/anoria/places/RULES.md.
// A Domain: n its name, reg its home region (a Figure from there has +1 Might on it), d its kind, pw its rule as a
// word (DRULES, and engine.js), era and y for the Library. pw0: the rule one of the first twelve had as a Place on
// the old fixed map ('' for none), which a game saved before Domains, and a lesson's table, still play by.
// Seventy-five Domains, fifteen in each ready deck's stack (ARCH[deck].stack). Their words are in text.js (PLACES).
// The kinds: what sort of place it was, and what holding that sort of place gave people.
const DKINDS = {
  Commerce: { what: 'markets, ports and caravan cities', pays: 'Spark' }, Industry: { what: 'workshops, shipyards, mines and kilns', pays: 'made things' },
  Thought: { what: 'libraries, schools and observatories', pays: 'cards' }, Land: { what: 'walls, fortresses and passes', pays: 'safe ground' },
  Culture: { what: 'theatres, temples, monuments and games', pays: 'Renown' }, Law: { what: 'capitals, courts and council fires', pays: 'order' },
  Routes: { what: 'roads, straits and sea lanes', pays: 'movement' },
};
// The eighteen rules, each with its kind (the sentence a player reads is text.js DRULE)
const DRULES = { spark: 'Commerce', cheap: 'Commerce', forge: 'Industry', arms: 'Industry', draw: 'Thought', line: 'Thought', facD: 'Thought', fort: 'Land', closed: 'Land', narrow: 'Land',
  crowd: 'Culture', arena: 'Culture', facA: 'Culture', peace: 'Law', sanctuary: 'Law', facS: 'Law', link: 'Routes', road: 'Routes' };
const PLACES = {
  // Commerce: markets, ports and caravan cities
  malacca: { n: 'Malacca', reg: 'ASIA', era: 3, y: 1400, d: 'Commerce', pw: 'cheap' }, kilwa: { n: 'Kilwa Kisiwani', reg: 'AFR', era: 3, y: 1300, d: 'Commerce', pw: 'spark' },
  venice: { n: 'Venice', reg: 'MED', era: 3, y: 1100, d: 'Commerce', pw: 'spark' }, lisbon: { n: 'Lisbon', reg: 'EUR', era: 4, y: 1500, d: 'Commerce', pw: 'spark' },
  carthage: { n: 'Carthage', reg: 'AFR', era: 1, y: -814, d: 'Commerce', pw: 'spark' }, firenze: { n: 'Florence', reg: 'MED', era: 3, y: 1252, d: 'Commerce', pw: 'spark' },
  timbuktu: { n: 'Timbuktu', reg: 'AFR', era: 3, y: 1327, d: 'Commerce', pw: 'cheap', pw0: 'cheap' },
  tlatelolco: { n: 'Market of Tlatelolco', reg: 'AMER', era: 3, y: 1337, d: 'Commerce', pw: 'spark' },
  petra: { n: 'Petra', reg: 'MIDEAST', era: 2, y: -300, d: 'Commerce', pw: 'spark', pw0: 'sanctuary' }, djenne: { n: 'Djenné', reg: 'AFR', era: 3, y: 800, d: 'Commerce', pw: 'cheap' },
  // Industry: workshops, shipyards, mines and kilns
  longjiang: { n: 'Treasure Shipyard, Nanjing', reg: 'ASIA', era: 3, y: 1405, d: 'Industry', pw: 'forge' },
  laurion: { n: 'Silver Mines of Laurion', reg: 'MED', era: 2, y: -483, d: 'Industry', pw: 'forge' }, damascus: { n: 'Damascus', reg: 'MIDEAST', era: 3, y: 900, d: 'Industry', pw: 'arms' },
  meroe: { n: 'Meroë', reg: 'AFR', era: 2, y: -300, d: 'Industry', pw: 'arms' }, mainz: { n: 'Gutenberg\'s Workshop', reg: 'EUR', era: 3, y: 1450, d: 'Industry', pw: 'forge' },
  ironbridge: { n: 'Ironbridge', reg: 'EUR', era: 5, y: 1709, d: 'Industry', pw: 'forge' }, jingdezhen: { n: 'Jingdezhen', reg: 'ASIA', era: 3, y: 1004, d: 'Industry', pw: 'forge' },
  benin: { n: 'Benin City', reg: 'AFR', era: 3, y: 1300, d: 'Industry', pw: 'forge' },
  // Thought: libraries, schools and observatories
  library: { n: 'Library of Alexandria', reg: 'AFR', era: 2, y: -285, d: 'Thought', pw: 'draw', pw0: 'draw' },
  greenwich: { n: 'Royal Observatory, Greenwich', reg: 'EUR', era: 5, y: 1675, d: 'Thought', pw: 'facD' },
  akademeia: { n: 'Plato\'s Academy', reg: 'MED', era: 2, y: -387, d: 'Thought', pw: 'line' }, padua: { n: 'University of Padua', reg: 'MED', era: 3, y: 1222, d: 'Thought', pw: 'line' },
  wisdom: { n: 'House of Wisdom', reg: 'MIDEAST', era: 3, y: 830, d: 'Thought', pw: 'facD' }, nalanda: { n: 'Nalanda', reg: 'ASIA', era: 2, y: 427, d: 'Thought', pw: 'draw' },
  royalsociety: { n: 'Royal Society', reg: 'EUR', era: 5, y: 1660, d: 'Thought', pw: 'draw' }, seneca: { n: 'Seneca Falls', reg: 'AMER', era: 6, y: 1848, d: 'Thought', pw: 'line', pw0: '' },
  // Land: walls, fortresses and passes
  gibraltar: { n: 'Rock of Gibraltar', reg: 'MED', era: 3, y: 711, d: 'Land', pw: 'fort' }, wall: { n: 'Great Wall', reg: 'ASIA', era: 2, y: -214, d: 'Land', pw: 'fort', pw0: 'fort' },
  thermopylae: { n: 'Thermopylae', reg: 'MED', era: 2, y: -480, d: 'Land', pw: 'narrow' }, himeji: { n: 'Himeji Castle', reg: 'ASIA', era: 4, y: 1609, d: 'Land', pw: 'closed' },
  laferriere: { n: 'Citadelle Laferrière', reg: 'AMER', era: 6, y: 1820, d: 'Land', pw: 'fort' }, orleans: { n: 'Orléans', reg: 'EUR', era: 3, y: 1429, d: 'Land', pw: 'fort' },
  siracusa: { n: 'Syracuse', reg: 'MED', era: 2, y: -213, d: 'Land', pw: 'fort' }, zimbabwe: { n: 'Great Zimbabwe', reg: 'AFR', era: 3, y: 1250, d: 'Land', pw: 'fort' },
  machu: { n: 'Machu Picchu', reg: 'AMER', era: 4, y: 1450, d: 'Land', pw: 'closed', pw0: 'closed' }, nanmadol: { n: 'Nan Madol', reg: 'OCE', era: 3, y: 1180, d: 'Land', pw: 'fort' },
  sigiriya: { n: 'Sigiriya', reg: 'ASIA', era: 3, y: 477, d: 'Land', pw: 'fort' },
  // Culture: theatres, temples, monuments and games
  rapanui: { n: 'Rapa Nui', reg: 'OCE', era: 3, y: 1200, d: 'Culture', pw: 'crowd' }, colosseum: { n: 'Colosseum', reg: 'MED', era: 2, y: 80, d: 'Culture', pw: 'arena', pw0: 'arena' },
  olympia: { n: 'Olympia', reg: 'MED', era: 1, y: -776, d: 'Culture', pw: 'crowd' }, prophetstown: { n: 'Prophetstown', reg: 'AMER', era: 6, y: 1808, d: 'Culture', pw: 'crowd' },
  acropolis: { n: 'Acropolis', reg: 'MED', era: 2, y: -447, d: 'Culture', pw: 'crowd', pw0: 'double' },
  globe: { n: 'Globe Theatre', reg: 'EUR', era: 4, y: 1599, d: 'Culture', pw: 'facA', pw0: 'facA' }, wien: { n: 'Vienna', reg: 'EUR', era: 5, y: 1780, d: 'Culture', pw: 'crowd' },
  sistine: { n: 'Sistine Chapel', reg: 'MED', era: 4, y: 1512, d: 'Culture', pw: 'facA' }, taj: { n: 'Taj Mahal', reg: 'ASIA', era: 5, y: 1653, d: 'Culture', pw: 'crowd' },
  heian: { n: 'Heian-kyō', reg: 'ASIA', era: 3, y: 794, d: 'Culture', pw: 'facA' }, deirelbahari: { n: 'Deir el-Bahari', reg: 'AFR', era: 1, y: -1470, d: 'Culture', pw: 'crowd' },
  versailles: { n: 'Versailles', reg: 'EUR', era: 5, y: 1682, d: 'Culture', pw: 'facA' },
  stonehenge: { n: 'Stonehenge', reg: 'EUR', era: 1, y: -2500, d: 'Culture', pw: 'crowd', pw0: 'spark' },
  giza: { n: 'Great Pyramid of Giza', reg: 'AFR', era: 1, y: -2560, d: 'Culture', pw: 'crowd' }, chichen: { n: 'Chichén Itzá', reg: 'AMER', era: 3, y: 900, d: 'Culture', pw: 'arena' },
  kumasi: { n: 'Kumasi', reg: 'AFR', era: 5, y: 1700, d: 'Culture', pw: 'crowd' },
  // Law: capitals, courts and council fires
  tordesillas: { n: 'Tordesillas', reg: 'EUR', era: 4, y: 1494, d: 'Law', pw: 'sanctuary' }, runnymede: { n: 'Runnymede', reg: 'EUR', era: 3, y: 1215, d: 'Law', pw: 'peace' },
  aachen: { n: 'Aachen', reg: 'EUR', era: 3, y: 800, d: 'Law', pw: 'facS' }, forum: { n: 'Roman Forum', reg: 'MED', era: 2, y: -500, d: 'Law', pw: 'facS' },
  independence: { n: 'Independence Hall', reg: 'AMER', era: 5, y: 1776, d: 'Law', pw: 'peace' }, persepolis: { n: 'Persepolis', reg: 'MIDEAST', era: 2, y: -518, d: 'Law', pw: 'facS' },
  babylon: { n: 'Babylon', reg: 'MIDEAST', era: 1, y: -1754, d: 'Law', pw: 'sanctuary' }, forbidden: { n: 'Forbidden City', reg: 'ASIA', era: 3, y: 1420, d: 'Law', pw: 'peace' },
  onondaga: { n: 'Onondaga', reg: 'AMER', era: 3, y: 1450, d: 'Law', pw: 'sanctuary' }, constantinople: { n: 'Constantinople', reg: 'MED', era: 2, y: 330, d: 'Law', pw: 'peace' },
  nineveh: { n: 'Nineveh', reg: 'MIDEAST', era: 1, y: -700, d: 'Law', pw: 'peace', pw0: '' }, winchester: { n: 'Winchester', reg: 'EUR', era: 3, y: 871, d: 'Law', pw: 'sanctuary' },
  // Routes: roads, straits and sea lanes
  silk: { n: 'Silk Road', reg: 'ASIA', era: 3, y: -130, d: 'Routes', pw: 'link', pw0: 'link' }, cape: { n: 'Cape of Good Hope', reg: 'AFR', era: 4, y: 1488, d: 'Routes', pw: 'link' },
  lanse: { n: 'L\'Anse aux Meadows', reg: 'AMER', era: 3, y: 1021, d: 'Routes', pw: 'road' }, dunhuang: { n: 'Dunhuang', reg: 'ASIA', era: 2, y: -111, d: 'Routes', pw: 'road' },
  magellanstrait: { n: 'Strait of Magellan', reg: 'AMER', era: 4, y: 1520, d: 'Routes', pw: 'road' }, appian: { n: 'Appian Way', reg: 'MED', era: 2, y: -312, d: 'Routes', pw: 'road' },
  grandcanal: { n: 'Grand Canal', reg: 'ASIA', era: 3, y: 609, d: 'Routes', pw: 'link' }, qhapaq: { n: 'Qhapaq Ñan', reg: 'AMER', era: 3, y: 1450, d: 'Routes', pw: 'link' },
  basra: { n: 'Basra', reg: 'MIDEAST', era: 3, y: 636, d: 'Routes', pw: 'road' }, kittyhawk: { n: 'Kitty Hawk', reg: 'AMER', era: 7, y: 1903, d: 'Routes', pw: 'road' },
};
// (the old fixed map: one of CENTER at the Crossroads, the Gates and Outposts dealt from EDGE. Lessons and old saves.)
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
// Each ready deck's Domain stack: fifteen Domains that suit it. A new player gets the stack of their starter deck.
// These are the prototype's third pass, unchanged. On this engine the five decks with these stacks sit 3.2 points
// apart over 8,000 games (the old fixed map: 6.6 on the same games), so the fourth pass the prototype asked for
// was not needed; two sets of swaps were tried and both pulled the decks further apart (scripts/anoria/domains.txt).
const STACKS = {
  Explorers: ['malacca', 'kilwa', 'tlatelolco', 'longjiang', 'greenwich', 'padua', 'gibraltar', 'rapanui', 'tordesillas', 'forbidden', 'silk', 'cape', 'lanse', 'dunhuang', 'magellanstrait'],
  Legion: ['carthage', 'laurion', 'damascus', 'ironbridge', 'wall', 'thermopylae', 'himeji', 'laferriere', 'orleans', 'colosseum', 'olympia', 'prophetstown', 'runnymede', 'aachen', 'appian'],
  Legacy: ['venice', 'petra', 'meroe', 'mainz', 'library', 'akademeia', 'wisdom', 'nalanda', 'royalsociety', 'siracusa', 'acropolis', 'globe', 'sistine', 'heian', 'forum'],
  Court: ['lisbon', 'firenze', 'timbuktu', 'jingdezhen', 'seneca', 'zimbabwe', 'wien', 'taj', 'deirelbahari', 'versailles', 'persepolis', 'babylon', 'onondaga', 'constantinople', 'grandcanal'],
  Pathfinders: ['djenne', 'benin', 'machu', 'nanmadol', 'sigiriya', 'stonehenge', 'giza', 'chichen', 'kumasi', 'independence', 'nineveh', 'winchester', 'qhapaq', 'basra', 'kittyhawk'],
};
const STACK = 15;   // (Domains in a stack)
Object.keys(ARCH).forEach(k => { ARCH[k].stack = STACKS[k]; });
return { CARDS, RETIRED, now, GUIDES, PLACES, DKINDS, DRULES, CENTER, EDGE, ARCH, GROWN, STACKS, STACK, THREADS, ERAS, PRINT3, PRINT4 };
});
