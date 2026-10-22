// The Oregon Trail: the trail, the store, the rivers and the people met along the way.
// Numbers follow the MECC game (1985 Apple II, 1990 DOS): landmark mileage, Matt's prices, the three
// occupations and their score bonus, the scoring table and the Oregon Top Ten ratings.
var OT = window.OT = window.OT || {};
(function () {
  'use strict';

  // ── Occupations: starting cash and the score multiplier ─────────────────
  OT.OCC = {
    banker:    { name: 'Banker',    from: 'from Boston',   cash: 1600, mult: 1, perk: 'Starts with the most money' },
    carpenter: { name: 'Carpenter', from: 'from Ohio',     cash: 800,  mult: 2, perk: 'Better at fixing a broken wagon. Double points' },
    farmer:    { name: 'Farmer',    from: 'from Illinois', cash: 400,  mult: 3, perk: 'Keeps the oxen healthier. Triple points' }
  };

  OT.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  OT.DEPART = [
    { m: 2, name: 'March', note: 'Early. Cold nights and thin grass, but plenty of time before the snow.' },
    { m: 3, name: 'April', note: 'The usual time. The grass is coming up on the prairie.' },
    { m: 4, name: 'May', note: 'Rivers run high, but the grass is good for the oxen.' },
    { m: 5, name: 'June', note: 'Late. You will have to hurry to cross the mountains before the snow.' },
    { m: 6, name: 'July', note: 'Very late. Snow in the Blue Mountains is likely.' }
  ];

  // ── Matt's General Store (Independence) ──────────────────────────────────
  // Oxen sell by the yoke (two) at Matt's and one at a time at the forts. Prices at the forts go up the
  // farther west they are (mult on each fort below).
  OT.STORE = {
    oxen:    { name: 'Oxen', unit: 'yoke', price: 40, each: 2, max: 9, desc: '$40 a yoke (2 oxen)', advice: 'I recommend at least three yoke. Six oxen keep the wagon moving when one goes lame.' },
    food:    { name: 'Food', unit: 'lb', price: 0.2, step: 50, max: 2000, desc: '20 cents a pound', advice: 'Plan on 200 pounds of flour, bacon and coffee for each person.' },
    clothes: { name: 'Clothing', unit: 'set', price: 10, max: 99, desc: '$10 a set', advice: 'Take two sets each. The mountains are cold, even in summer.' },
    bullets: { name: 'Ammunition', unit: 'box', price: 2, each: 20, max: 99, desc: '$2 a box of 20 bullets', advice: 'A box of 20 bullets. You will hunt for most of your meat out there.' },
    wheels:  { name: 'Wagon wheel', unit: 'wheel', price: 10, max: 3, desc: '$10 each', advice: 'A spare wheel, axle and tongue can save weeks if one breaks far from a fort.' },
    axles:   { name: 'Wagon axle', unit: 'axle', price: 10, max: 3, desc: '$10 each', advice: '' },
    tongues: { name: 'Wagon tongue', unit: 'tongue', price: 10, max: 3, desc: '$10 each', advice: '' }
  };
  OT.FOOD_MAX = 2000;   // the wagon can only carry 2,000 pounds of food

  // ── Pace and rations ─────────────────────────────────────────────────────
  OT.PACE = [
    { id: 1, name: 'Steady', desc: 'About 8 hours a day, with rest stops. Easiest on everyone.', mph: 1, wear: 2 },
    { id: 2, name: 'Strenuous', desc: 'About 12 hours a day, starting at sunrise. Tiring.', mph: 1.3, wear: 4 },
    { id: 3, name: 'Grueling', desc: 'About 16 hours a day, sunrise to sunset. Hard on health.', mph: 1.6, wear: 6 }
  ];
  OT.RATIONS = [
    { id: 1, name: 'Filling', desc: 'Meals are large and generous. 3 pounds a person a day.', lb: 3, wear: 0 },
    { id: 2, name: 'Meager', desc: 'Meals are small, but adequate. 2 pounds a person a day.', lb: 2, wear: 2 },
    { id: 3, name: 'Bare bones', desc: 'Meals are very small; everyone stays hungry. 1 pound a person a day.', lb: 1, wear: 4 }
  ];
  OT.HEALTH = ['good', 'fair', 'poor', 'very poor'];

  // ── Scoring (the 1985 table) ─────────────────────────────────────────────
  OT.SCORE = {
    person: [500, 400, 300, 200],   // each survivor, by the party's health
    wagon: 50, ox: 4, part: 2, clothes: 2, bullets: 50, food: 25, cash: 5   // points: 1 per 50 bullets, 25 lb food, $5
  };
  OT.RATINGS = [[7000, 'Trail guide'], [3000, 'Adventurer'], [0, 'Greenhorn']];
  // the Oregon Top Ten the game ships with, people who really went west
  OT.PIONEERS = [['Stephen Meek', 7650], ['Celinda Hines', 5694], ['Andrew Sublette', 4138], ['David Hastings', 2945], ['Ezra Meeker', 2052],
    ['William Vaughn', 1401], ['Mary Bartlett', 937], ['William Wiggins', 615], ['Charles Hopper', 396], ['Elijah White', 250]];

  // ── The trail ────────────────────────────────────────────────────────────
  // kind: start | river | fort | landmark | end.  next: [{to, mi}] (two at a fork).  land: the country from here to
  // the next stop (the travel scene draws it).  high: high country (colder, slower).  mult: fort prices.
  // lon/lat place it on the map.
  OT.NODES = {
    independence: { name: 'Independence', full: 'Independence, Missouri', kind: 'start', next: [{ to: 'kansas', mi: 102 }], land: 'prairie', lon: -94.42, lat: 39.09 },
    kansas:     { name: 'Kansas River crossing', short: 'Kansas River', kind: 'river', next: [{ to: 'bigblue', mi: 83 }], land: 'prairie', lon: -95.68, lat: 39.06 },
    bigblue:    { name: 'Big Blue River crossing', short: 'Big Blue River', kind: 'river', next: [{ to: 'kearney', mi: 119 }], land: 'prairie', lon: -96.65, lat: 39.84 },
    kearney:    { name: 'Fort Kearney', kind: 'fort', mult: 1.25, next: [{ to: 'chimney', mi: 250 }], land: 'platte', lon: -98.95, lat: 40.65 },
    chimney:    { name: 'Chimney Rock', kind: 'landmark', next: [{ to: 'laramie', mi: 86 }], land: 'bluffs', lon: -103.35, lat: 41.70 },
    laramie:    { name: 'Fort Laramie', kind: 'fort', mult: 1.5, next: [{ to: 'indrock', mi: 190 }], land: 'sage', lon: -104.55, lat: 42.20 },
    indrock:    { name: 'Independence Rock', kind: 'landmark', next: [{ to: 'southpass', mi: 102 }], land: 'sage', lon: -107.13, lat: 42.49 },
    southpass:  { name: 'South Pass', kind: 'landmark', fork: true, high: true,
      next: [{ to: 'greenriver', mi: 57, label: 'Head for Green River', sub: 'The shorter way, but there is a deep river to cross' },
             { to: 'bridger', mi: 125, label: 'Head for Fort Bridger', sub: 'Longer, with a fort for supplies and no river' }], land: 'rockies', lon: -108.9, lat: 42.35 },
    greenriver: { name: 'Green River crossing', short: 'Green River', kind: 'river', high: true, next: [{ to: 'soda', mi: 144 }], land: 'rockies', lon: -110.0, lat: 42.05 },
    bridger:    { name: 'Fort Bridger', kind: 'fort', mult: 1.75, high: true, next: [{ to: 'soda', mi: 162 }], land: 'rockies', lon: -110.39, lat: 41.32 },
    soda:       { name: 'Soda Springs', kind: 'landmark', high: true, next: [{ to: 'forthall', mi: 57 }], land: 'rockies', lon: -111.60, lat: 42.65 },
    forthall:   { name: 'Fort Hall', kind: 'fort', mult: 2, next: [{ to: 'snake', mi: 182 }], land: 'snake', lon: -112.45, lat: 43.02 },
    snake:      { name: 'Snake River crossing', short: 'Snake River', kind: 'river', next: [{ to: 'boise', mi: 113 }], land: 'snake', lon: -115.4, lat: 42.95 },
    boise:      { name: 'Fort Boise', kind: 'fort', mult: 2.25, next: [{ to: 'bluemtns', mi: 160 }], land: 'snake', lon: -117.0, lat: 43.8 },
    bluemtns:   { name: 'Blue Mountains', kind: 'landmark', fork: true, high: true,
      next: [{ to: 'wallawalla', mi: 55, label: 'Head for Fort Walla Walla', sub: 'A fort to rest and buy supplies, then on to The Dalles' },
             { to: 'dalles', mi: 125, label: 'Head for The Dalles', sub: 'Straight on, no stops' }], land: 'forest', lon: -118.3, lat: 45.45 },
    wallawalla: { name: 'Fort Walla Walla', kind: 'fort', mult: 2.5, next: [{ to: 'dalles', mi: 120 }], land: 'columbia', lon: -118.95, lat: 46.06 },
    dalles:     { name: 'The Dalles', kind: 'landmark', last: true, next: [], land: 'columbia', lon: -121.18, lat: 45.6 },
    willamette: { name: 'Willamette Valley', full: 'the Willamette Valley, Oregon', kind: 'end', next: [], land: 'valley', lon: -122.6, lat: 45.3 }
  };
  // From The Dalles: float the Columbia (the raft) or take the Barlow Road around Mount Hood
  OT.BARLOW = { toll: 5, mi: 100, days: [8, 12] };
  OT.COLUMBIA = { mi: 85 };

  // the land between stops: what the travel scene draws and how hard going it is
  OT.LAND = {
    prairie:  { name: 'prairie', slow: 1, water: 0 },
    platte:   { name: 'Platte River valley', slow: 1, water: 1 },
    bluffs:   { name: 'North Platte bluffs', slow: 1, water: 1 },
    sage:     { name: 'sagebrush plains', slow: 0.95, water: 1 },
    rockies:  { name: 'Rocky Mountains', slow: 0.8, water: 0 },
    snake:    { name: 'Snake River plain', slow: 0.9, water: 1 },
    forest:   { name: 'Blue Mountains', slow: 0.75, water: 0 },
    columbia: { name: 'Columbia plateau', slow: 0.95, water: 0 },
    valley:   { name: 'Willamette Valley', slow: 1, water: 0 }
  };

  // ── Rivers ───────────────────────────────────────────────────────────────
  // depth (feet) = base + spring * how high the snowmelt is that month + rain lately; width in feet
  OT.SPRING = [0, 0, 0.3, 0.7, 1, 0.85, 0.45, 0.15, 0, 0, 0.1, 0.1];
  OT.RIVERS = {
    kansas:     { base: 2.0, spring: 2.6, width: [580, 700], ferry: { cost: 5, wait: [1, 4] } },
    bigblue:    { base: 1.5, spring: 1.8, width: [170, 260] },
    greenriver: { base: 6.0, spring: 8.0, width: [380, 460], ferry: { cost: 10, wait: [1, 5] } },
    snake:      { base: 5.0, spring: 4.0, width: [950, 1060], guide: { clothes: 3 } }
  };

  // ── Names ────────────────────────────────────────────────────────────────
  OT.NAMES = ['Mary', 'Sarah', 'Elizabeth', 'Martha', 'Hannah', 'Abigail', 'Rebecca', 'Lydia', 'Susannah', 'Clara', 'Emma', 'Nancy', 'Eliza', 'Harriet', 'Lucy', 'Ruth',
    'John', 'William', 'James', 'George', 'Thomas', 'Samuel', 'Henry', 'Jacob', 'Joseph', 'Isaac', 'Daniel', 'Jedediah', 'Ezra', 'Amos', 'Silas', 'Caleb', 'Levi', 'Eli'];
  // tombstone epitaphs to pick from: earnest and not so earnest (six are dealt at random)
  OT.EPITAPHS = [
    "Gone to a better trail",
    "Loved by all who knew",
    "Never once complained",
    "Rest easy, friend",
    "Taken too soon",
    "Walked every mile",
    "Kept the fire going",
    "Sang us across the prairie",
    "Gone west ahead of us",
    "A brave heart",
    "Faithful to the end",
    "Asleep under the prairie sky",
    "Dreamed of Oregon",
    "Kind to every stranger",
    "Forever on the trail",
    "The trail goes on without you",
    "Shared the last of the bacon",
    "May the wind carry you home",
    "A true pioneer",
    "Missed by all",
    "Pepperoni and cheese",
    "Should have caulked the wagon",
    "Should have taken the ferry",
    "Ate the wrong berries",
    "It was only a little dysentery",
    "Died of dysentery. Obviously.",
    "Shot a ton of buffalo, carried 100 lb",
    "The rattlesnake won",
    "Lost an argument with an ox",
    "Took the shortcut",
    "Wanted Oregon. Got Nebraska.",
    "Finally stopped asking \"are we there\"",
    "I told you I was sick",
    "Never trust a ford over 3 feet",
    "Should have bought more clothing",
    "At least I am done walking",
    "Pace: grueling. Rations: bare bones.",
    "Resting at a steady pace",
    "Here lies the worst cook on the trail",
    "Hunted a bear with 3 bullets",
    "Broke a wagon axle and my heart",
    "Will haunt the fort prices",
    "Should have rested at the fort",
    "Too stubborn to turn back",
    "Outlived by an ox named Steve",
    "Swam the river. River won.",
    "Wrote the wrong name on the map",
    "Not lost, just very early",
    "Finally got some rest",
    "Owes Matt 3 dollars"
  ];

  // ── Talking to people at each stop (written for this game) ───────────────
  OT.TALK = {
    independence: [
      ['Jeb Calloway, a wagon outfitter', 'Most folks go too heavy. You can\'t eat a rocking chair, and the oxen have to pull it two thousand miles.'],
      ['Mrs. Abigail Fenn, setting out', 'My husband says April. The grass is up by then, and we reach the mountains before the snow.'],
      ['A trapper in buckskins', 'Buy oxen, not mules. Oxen are slow, but they eat grass and thieves don\'t want them.']
    ],
    kansas: [
      ['Pierre Papin, ferry hand', 'The ferry costs you five dollars, but you keep your flour dry. Water is high in the spring.'],
      ['Rachel Dorn, emigrant', 'We forded two days ago. Lost a barrel of bacon and nearly lost the baby\'s cradle.'],
      ['A Kansa trader', 'The river is wide but not so deep in summer. Look at the depth before you choose.']
    ],
    bigblue: [
      ['Amos Wheeler, emigrant', 'No ferry here. If it\'s over three feet, wait a day and see if it drops.'],
      ['Lucy Hartwell, emigrant', 'Prettiest water I\'ve seen since home. Fill your barrels here; the water gets worse west of Kearney.'],
      ['Sergeant Dodd, cavalry scout', 'Caulk your wagon bed and float it if the water\'s deep. Just keep the wagon straight in the current.']
    ],
    kearney: [
      ['Captain Woodbury, the fort\'s builder', 'Follow the Platte. A mile wide and an inch deep, they say, but it will lead you all the way to Fort Laramie.'],
      ['Ellen Blake, emigrant', 'Cholera went through the camp ahead of us. Boil your water if you can, and don\'t camp where others have.'],
      ['A buffalo hunter', 'Herds out here as far as you can see. One good shot and you\'ve got more meat than you can carry. Take only what you can.']
    ],
    chimney: [
      ['Silas Dean, emigrant', 'You can see that rock for three days before you reach it. Folks carve their names at the bottom.'],
      ['Martha Price, emigrant', 'We\'re a third of the way there. I keep telling the children: one rock at a time.'],
      ['A Lakota man', 'The storms come fast on these bluffs. When the sky goes green, find low ground.']
    ],
    laramie: [
      ['Mr. Tutt, the fort\'s clerk', 'Prices here are higher than Missouri. It\'s a long way to haul flour.'],
      ['Hannah Moss, emigrant', 'Leave behind what you don\'t need. The trail past here is littered with stoves and dressers.'],
      ['A blacksmith', 'Get your wheels looked at. The road gets rocky from here to the Sweetwater.']
    ],
    indrock: [
      ['Jacob Fry, emigrant', 'Be here by the Fourth of July, they say, or you\'ll meet snow in the mountains. How are we doing?'],
      ['Clara Wood, emigrant', 'I climbed it this morning and painted our names in axle grease. Hundreds of names up there.'],
      ['A trader with a mule string', 'The water along the Sweetwater is good. Beyond the pass, mind the alkali springs; they\'ll kill an ox.']
    ],
    southpass: [
      ['Ezra Stone, guide', 'You\'re on the Continental Divide. Every river from here runs to the Pacific.'],
      ['Mrs. Lyle, emigrant', 'Hard to believe this is the mountain crossing. It\'s so wide and gentle, you hardly feel the climb.'],
      ['A mountain man', 'Green River is shorter, but that water is deep. Bridger\'s fort is out of the way, but Jim will sell you what you need.']
    ],
    greenriver: [
      ['A ferryman', 'Ten dollars to cross on my boat. People drown every season trying to ford this one.'],
      ['Daniel Ross, emigrant', 'Our wagon nearly went over in the middle. The current is stronger than it looks.'],
      ['Sarah Webb, emigrant', 'Good grass across the river. Rest the oxen a day before the climb.']
    ],
    bridger: [
      ['Jim Bridger\'s clerk', 'Mr. Bridger built this place to sell to folks like you. Fresh oxen, if you need them.'],
      ['Isaac Moore, emigrant', 'Some are taking a cutoff to California from here. Not us. Oregon or bust.'],
      ['A Shoshone woman trading', 'The trail to Soda Springs follows the Bear River. Good water and grass.']
    ],
    soda: [
      ['Eliza Pratt, emigrant', 'The water bubbles right out of the ground and tastes like soda. The children love it.'],
      ['Levi Hart, emigrant', 'Don\'t let the oxen drink from the steamboat spring. It hisses like an engine.'],
      ['A trapper', 'Fort Hall is close now. After that, the Snake River country is dry and hard.']
    ],
    forthall: [
      ['Captain Grant, the Hudson\'s Bay man', 'Many take wagons on from here, though we used to say it couldn\'t be done. Mind the Snake.'],
      ['Ruth Allen, emigrant', 'We traded our last good dress for flour. Things cost twice what they did in Missouri.'],
      ['A Shoshone guide', 'At the Snake crossing I can take you across for some clothing. The river is deep and fast.']
    ],
    snake: [
      ['A Shoshone guide', 'Three islands here. Cross from one to the next and the river is easier. I know the way.'],
      ['Thomas Reed, emigrant', 'We tried to ford and lost two oxen. I\'d pay the guide if I had it to do again.'],
      ['Nancy Cole, emigrant', 'The road along the south bank is dry and full of rocks. Better grass on the north side.']
    ],
    boise: [
      ['Mr. Payette, the fort\'s keeper', 'Salmon in the river this time of year. The Blue Mountains are next, and they\'re steep.'],
      ['Caleb Ward, emigrant', 'Our oxen are worn thin. Rest them here if you can; the mountains will take everything they have.'],
      ['Harriet Lane, emigrant', 'I hear the Whitman mission at Walla Walla takes in the sick and tired. That\'s where we\'re headed.']
    ],
    bluemtns: [
      ['Henry Cole, emigrant', 'Thick timber. We had to cut our way through in places, and let the wagons down the hills with ropes.'],
      ['Emma Fields, emigrant', 'If you can, go on to The Dalles directly. Walla Walla is out of the way.'],
      ['A Cayuse horseman', 'Snow comes early in these mountains. Do not stay long.']
    ],
    wallawalla: [
      ['A Hudson\'s Bay clerk', 'The Dalles is a hundred and twenty miles down the Columbia. From there, the river or the mountain road.'],
      ['Joseph Burns, emigrant', 'We sold our wagon here and bought a boat. It\'s the end of the road for the oxen.'],
      ['Lydia Grant, emigrant', 'The worst is almost behind us. I can nearly smell the green of the valley.']
    ],
    dalles: [
      ['Samuel Barlow, road builder', 'My road goes around the south side of Mount Hood. Five dollars a wagon. It\'s rough, but it\'s dry.'],
      ['A Wasco boatman', 'The river is fast here, with rocks under the water. Keep away from the shore and watch for rapids.'],
      ['Susannah Kerr, emigrant', 'We built a raft out of our wagon bed. Ninety miles of river and we\'re there.']
    ]
  };

  // ── The map: the trail drawn over the country ────────────────────────────
  OT.MAP = { lon: [-124.6, -93.4], lat: [37.8, 47.6],
    rivers: [
      // Missouri, Kansas, Big Blue, Platte / North Platte, Sweetwater, Green, Bear, Snake, Columbia, Willamette
      [[-93.4, 38.9], [-94.6, 39.1], [-95.2, 39.9], [-95.9, 41.2], [-96.4, 42.5], [-97.4, 42.9], [-99.0, 44.3], [-100.4, 44.4], [-101.2, 46.0], [-103.4, 47.6]],
      [[-94.6, 39.1], [-95.7, 39.06], [-96.6, 39.2], [-97.3, 39.0]],
      [[-96.6, 39.2], [-96.65, 39.84], [-96.9, 40.6]],
      [[-95.9, 41.0], [-97.4, 41.2], [-98.9, 40.7], [-100.8, 41.1], [-102.0, 41.2], [-103.4, 41.75], [-104.6, 42.2], [-105.9, 42.7], [-106.4, 42.8], [-106.9, 42.4]],
      [[-106.9, 42.45], [-107.6, 42.5], [-108.6, 42.4]],
      [[-109.9, 43.2], [-110.0, 42.0], [-109.6, 41.4], [-109.7, 40.6]],
      [[-111.0, 41.6], [-111.4, 42.4], [-111.6, 42.65], [-112.0, 42.3], [-112.1, 41.6]],
      [[-110.8, 43.4], [-111.9, 43.4], [-112.45, 43.0], [-113.6, 42.6], [-114.8, 42.7], [-115.4, 42.95], [-116.4, 43.5], [-117.0, 43.8], [-116.9, 44.6], [-116.7, 45.5], [-117.0, 46.4], [-118.9, 46.2]],
      [[-117.4, 47.6], [-118.6, 47.0], [-118.95, 46.06], [-119.9, 45.85], [-121.2, 45.62], [-122.0, 45.6], [-122.8, 45.65], [-123.4, 46.2], [-124.0, 46.25]],
      [[-122.65, 45.6], [-122.6, 45.3], [-123.0, 44.9], [-123.1, 44.1]]
    ],
    // mountain ranges, as rows of peaks: [lon, lat]
    peaks: [[-105.6, 40.4], [-106.2, 40.9], [-105.4, 41.4], [-106.0, 39.6], [-105.3, 39.0], [-109.4, 43.0], [-109.8, 43.6], [-110.6, 43.8], [-110.7, 41.0], [-111.6, 40.6], [-111.7, 41.6],
      [-114.0, 44.0], [-114.8, 44.6], [-115.8, 45.0], [-113.0, 44.4], [-118.1, 45.1], [-118.5, 45.7], [-117.6, 44.9], [-121.7, 45.37], [-121.8, 46.2], [-122.2, 44.4], [-121.75, 44.1], [-121.9, 47.0]]
  };
})();
