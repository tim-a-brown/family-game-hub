// ═══════════════════════════════════════════════════════════════════════════
// Go Fish's themed decks (window.GoFishDecks, or require() in Node).
//
// A themed deck plays exactly like the standard one, the way the themed Go Fish decks sold for families do: 13
// subjects stand in for the 13 ranks (the first subject is the 2, the last the Ace), four cards of each, and a book is
// the four of a subject. The four cards of a subject have the same picture, each with its own color band (one for
// each suit: spades blue, hearts red, clubs green, diamonds gold, with the suit's mark on the band), so the core's
// rules, robots and saved games are the same for every deck. A game keeps its deck's id as st.theme; a game without
// one is the standard deck.
//
// Each subject is [key, one, many, a]: its picture's file name, its name for one card ("Tiger"), its name for more
// than one ("Tigers") and, only where "a" + one would read wrongly, how one card is said ("a piece of Sushi").
// Pictures: gofish/decks/<deck>/<key>.webp (360 px, for the card faces) and <key>-t.webp (120 px: books, history).
// How the pictures are made is scripts/gofish-decks/README.md.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  // the four bands, by suit: the same on every themed deck
  var BAND = { s: '#2f6bd3', h: '#d7404c', c: '#23955f', d: '#e6a521' };
  var MARK = { s: '♠', h: '♥', c: '♣', d: '♦' };
  // id, name, emblem (the subject on the deck's back and its setup tile), the back's two colors, the picture panel's
  // two colors (center, edge), then the 13 subjects
  var DECKS = [
    { id: 'space', name: 'Space', em: 'rocket', back: ['#1a2259', '#4a2c8a'], pan: ['#2b3a7a', '#141b45'], dark: 1, s: [
      ['sun', 'Sun', 'Suns'], ['moon', 'Moon', 'Moons'], ['earth', 'Earth', 'Earth cards', 'an Earth card'], ['mars', 'Mars', 'Mars cards', 'a Mars card'], ['saturn', 'Saturn', 'Saturns'],
      ['comet', 'Comet', 'Comets'], ['rocket', 'Rocket', 'Rockets'], ['astronaut', 'Astronaut', 'Astronauts'], ['satellite', 'Satellite', 'Satellites'],
      ['station', 'Space Station', 'Space Stations'], ['telescope', 'Telescope', 'Telescopes'], ['galaxy', 'Galaxy', 'Galaxies'], ['rover', 'Rover', 'Rovers']] },
    { id: 'cats', name: 'Cats', em: 'calico', back: ['#7a3d2a', '#c27a3a'], pan: ['#fbeee0', '#f1d6bd'], s: [
      ['ginger', 'Ginger Cat', 'Ginger Cats'], ['black', 'Black Cat', 'Black Cats'], ['siamese', 'Siamese', 'Siamese'], ['calico', 'Calico', 'Calicos'],
      ['tuxedo', 'Tuxedo Cat', 'Tuxedo Cats'], ['tabby', 'Tabby', 'Tabbies'], ['persian', 'Persian', 'Persians'], ['mainecoon', 'Maine Coon', 'Maine Coons'],
      ['sphynx', 'Sphynx', 'Sphynxes'], ['kitten', 'Kitten', 'Kittens'], ['bengal', 'Bengal', 'Bengals'], ['fold', 'Scottish Fold', 'Scottish Folds'],
      ['russianblue', 'Russian Blue', 'Russian Blues']] },
    { id: 'dogs', name: 'Dogs', em: 'corgi', back: ['#2b4a7a', '#4f86b8'], pan: ['#eaf2f8', '#cfe0ee'], s: [
      ['golden', 'Golden Retriever', 'Golden Retrievers'], ['dalmatian', 'Dalmatian', 'Dalmatians'], ['poodle', 'Poodle', 'Poodles'], ['beagle', 'Beagle', 'Beagles'],
      ['dachshund', 'Dachshund', 'Dachshunds'], ['shepherd', 'German Shepherd', 'German Shepherds'], ['bulldog', 'Bulldog', 'Bulldogs'], ['corgi', 'Corgi', 'Corgis'],
      ['husky', 'Husky', 'Huskies'], ['chihuahua', 'Chihuahua', 'Chihuahuas'], ['pug', 'Pug', 'Pugs'], ['collie', 'Border Collie', 'Border Collies'],
      ['stbernard', 'Saint Bernard', 'Saint Bernards']] },
    { id: 'zoo', name: 'Zoo Animals', em: 'giraffe', back: ['#2f5a2a', '#6f9a3a'], pan: ['#f2f3df', '#dfe3bf'], s: [
      ['lion', 'Lion', 'Lions'], ['tiger', 'Tiger', 'Tigers'], ['elephant', 'Elephant', 'Elephants', 'an Elephant'], ['giraffe', 'Giraffe', 'Giraffes'],
      ['zebra', 'Zebra', 'Zebras'], ['panda', 'Panda', 'Pandas'], ['penguin', 'Penguin', 'Penguins'], ['monkey', 'Monkey', 'Monkeys'], ['hippo', 'Hippo', 'Hippos'],
      ['kangaroo', 'Kangaroo', 'Kangaroos'], ['polarbear', 'Polar Bear', 'Polar Bears'], ['flamingo', 'Flamingo', 'Flamingos'], ['crocodile', 'Crocodile', 'Crocodiles']] },
    { id: 'food', name: 'Food', em: 'pizza', back: ['#a8322c', '#e0782e'], pan: ['#fff3e2', '#f7dcbc'], s: [
      ['pizza', 'Pizza', 'Pizzas'], ['burger', 'Burger', 'Burgers'], ['taco', 'Taco', 'Tacos'], ['hotdog', 'Hot Dog', 'Hot Dogs'], ['sushi', 'Sushi', 'Sushi', 'a piece of Sushi'],
      ['pretzel', 'Pretzel', 'Pretzels'], ['donut', 'Donut', 'Donuts'], ['cupcake', 'Cupcake', 'Cupcakes'], ['icecream', 'Ice Cream Cone', 'Ice Cream Cones', 'an Ice Cream Cone'],
      ['watermelon', 'Watermelon', 'Watermelons'], ['strawberry', 'Strawberry', 'Strawberries'], ['banana', 'Banana', 'Bananas'], ['carrot', 'Carrot', 'Carrots']] },
    { id: 'flowers', name: 'Flowers', em: 'sunflower', back: ['#6a2f6e', '#c05a8a'], pan: ['#f6f0f6', '#e6d6ea'], s: [
      ['rose', 'Rose', 'Roses'], ['sunflower', 'Sunflower', 'Sunflowers'], ['tulip', 'Tulip', 'Tulips'], ['daisy', 'Daisy', 'Daisies'], ['lily', 'Lily', 'Lilies'],
      ['orchid', 'Orchid', 'Orchids', 'an Orchid'], ['lotus', 'Lotus', 'Lotuses'], ['daffodil', 'Daffodil', 'Daffodils'], ['poppy', 'Poppy', 'Poppies'],
      ['lavender', 'Lavender', 'Lavender sprigs', 'a sprig of Lavender'], ['cherry', 'Cherry Blossom', 'Cherry Blossoms'], ['hibiscus', 'Hibiscus', 'Hibiscus flowers', 'a Hibiscus'],
      ['dandelion', 'Dandelion', 'Dandelions']] },
    { id: 'sports', name: 'Sports', em: 'soccer', back: ['#1f5a46', '#2f8a5e'], pan: ['#eef4ee', '#d4e4d6'], s: [
      ['soccer', 'Soccer Ball', 'Soccer Balls'], ['basketball', 'Basketball', 'Basketballs'], ['football', 'Football', 'Footballs'], ['glove', 'Baseball Glove', 'Baseball Gloves'],
      ['racket', 'Tennis Racket', 'Tennis Rackets'], ['golf', 'Golf Club', 'Golf Clubs'], ['hockey', 'Hockey Stick', 'Hockey Sticks'], ['bowling', 'Bowling Pin', 'Bowling Pins'],
      ['skateboard', 'Skateboard', 'Skateboards'], ['skate', 'Ice Skate', 'Ice Skates', 'an Ice Skate'], ['surfboard', 'Surfboard', 'Surfboards'],
      ['boxing', 'Boxing Glove', 'Boxing Gloves'], ['trophy', 'Trophy', 'Trophies']] },
    { id: 'jobs', name: 'Jobs', em: 'firefighter', back: ['#2d3f6e', '#c4553a'], pan: ['#f3efe8', '#e2d9ca'], s: [
      ['firefighter', 'Firefighter', 'Firefighters'], ['doctor', 'Doctor', 'Doctors'], ['teacher', 'Teacher', 'Teachers'], ['chef', 'Chef', 'Chefs'],
      ['police', 'Police Officer', 'Police Officers'], ['farmer', 'Farmer', 'Farmers'], ['pilot', 'Pilot', 'Pilots'], ['mail', 'Mail Carrier', 'Mail Carriers'],
      ['builder', 'Builder', 'Builders'], ['scientist', 'Scientist', 'Scientists'], ['artist', 'Artist', 'Artists', 'an Artist'], ['vet', 'Veterinarian', 'Veterinarians'],
      ['mechanic', 'Mechanic', 'Mechanics']] },
    { id: 'states', name: 'US States', em: 'newyork', back: ['#22386e', '#a8323a'], pan: ['#f1f0ea', '#dcdccf'], map: 1, s: [
      ['california', 'California'], ['texas', 'Texas'], ['florida', 'Florida'], ['newyork', 'New York'],
      ['alaska', 'Alaska'], ['hawaii', 'Hawaii'], ['arizona', 'Arizona'], ['washington', 'Washington'],
      ['louisiana', 'Louisiana'], ['michigan', 'Michigan'], ['southdakota', 'South Dakota'], ['pennsylvania', 'Pennsylvania'],
      ['maine', 'Maine']] },
    { id: 'countries', name: 'Countries', em: 'japan', back: ['#1e5a6e', '#3a8a8a'], pan: ['#eef3f1', '#d2e2dd'], map: 1, s: [
      ['japan', 'Japan'], ['china', 'China'], ['india', 'India'], ['france', 'France'], ['italy', 'Italy'],
      ['uk', 'United Kingdom'], ['egypt', 'Egypt'], ['southafrica', 'South Africa'], ['brazil', 'Brazil'],
      ['mexico', 'Mexico'], ['canada', 'Canada'], ['peru', 'Peru'], ['australia', 'Australia']] }
  ];
  var BY = {};
  function an(w) { return (/^(?:[AEIO]|U(?!ni))/.test(w) ? 'an ' : 'a ') + w; }   // ("a United Kingdom card")
  DECKS.forEach(function (d) {
    BY[d.id] = d; d.by = {};
    // (a place is said as its card: "any Texas cards?", "a Texas card")
    d.s.forEach(function (x, i) {
      var one = x[1], many = d.map ? one + ' cards' : x[2], a = d.map ? an(one) + ' card' : x[3] || an(one);
      d.by[RANKS[i]] = { k: x[0], one: one, many: many, a: a, r: RANKS[i] };
    });
  });
  function get(id) { return id && BY[id] || null; }
  function subj(id, r) { var d = get(id); return d ? d.by[r] : null; }
  // the picture of rank r in deck id ('t': the small one), as a path from the games folder
  function pic(id, r, small) { var s = subj(id, r); return s ? 'gofish/decks/' + id + '/' + s.k + (small ? '-t' : '') + '.webp' : ''; }
  var API = { RANKS: RANKS, BAND: BAND, MARK: MARK, DECKS: DECKS, get: get, subj: subj, pic: pic };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.GoFishDecks = API;
})(typeof window !== 'undefined' ? window : this);
