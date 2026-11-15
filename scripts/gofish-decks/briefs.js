// Go Fish's themed decks: the brief for every picture, and the house style they share (see README.md here).
//   node scripts/gofish-decks/briefs.js [deck,deck...] [key,key...] > jobs.json    (the image jobs, for gen.py)
// A picture's prompt is STYLE, the deck's palette, the subject's brief, then TAIL. A brief that was corrected after a
// rejected picture keeps the corrected words here, so the next run of the same picture starts from them.
'use strict';
const STYLE = 'Illustration for a premium designer card game, drawn by a top contemporary picture-book illustrator. ' +
  'Refined cartoon: the subject is redesigned into a few big, deliberate, well-proportioned shapes with appealing rounded geometry and a confident silhouette, ' +
  'simplified and gently stylized in proportion while every real feature that makes it recognizable stays correct. ' +
  'Clean crisp edges with thin outlines in a darker shade of each neighboring color, never black. ' +
  'Matte gouache color with a fine risograph grain; shading is one flat shadow shape and one flat highlight shape on each form, no gradients. ' +
  'Only a few tasteful details, no busy texture, no noise. ' +
  'Not a 3D render, not glossy or plastic, no airbrushed gradients, no photorealism, no generic big-eyed mascot face: eyes keep their real shape and size. ';
const TAIL = ' One single subject, centered, shown whole and not cut off by any edge, filling about seventy percent of the square with even space around it. ' +
  'Plain flat warm off-white background with nothing else on it: no ground, no scenery, no cast shadow, no frame, no border, ' +
  'no text, no letters, no numbers, no logos, no writing on anything. Nothing in the four corners.';
const PEOPLE = ' The whole person is shown, head to feet, standing on nothing, with natural proportions (the head about one sixth of the height) and a face with its own particular features and age, not a generic face. Exactly two arms and two hands with five fingers each, two legs. Nothing tied to stereotype: ordinary modern work clothes.';
const PLACE = ' Drawn as a compact, self-contained vignette with soft rounded edges, floating on the plain background, true to the real place in every structural detail.';

const D = {
  space: { pal: 'deep navy, coral red, teal, soft gold, lavender and cream', s: {
    sun: 'The Sun as a glowing golden-orange ball with gentle swirling surface patterns and a ring of short, soft, wavy solar flares around its edge. No face.',
    moon: 'The full Moon, a pale silver-gray ball with a few round craters of different sizes and the darker gray patches of its seas. No face.',
    earth: 'Planet Earth seen from space: deep blue oceans, green and sandy-tan continents with North and South America facing the viewer in their true shapes, white swirling clouds, and a thin pale blue glow round its edge. No face.',
    mars: 'The planet Mars: a rusty red-orange ball with darker red-brown markings, a small white polar ice cap at the top, and the long dark canyon of Valles Marineris across its middle. No face.',
    saturn: 'The planet Saturn: a pale butterscotch-gold ball with soft horizontal bands, circled by its wide, flat, tilted rings in cream and tan with one dark gap in them; the rings pass in front of the planet below its middle and behind it above. No face.',
    comet: 'A comet: a small bright icy-white head with a long glowing tail of pale blue and lavender streaming away from it in a gentle curve, from the upper right to the lower left, with a few tiny sparkles.',
    rocket: 'A classic space rocket lifting off, pointing straight up, with a cream body, a coral-red nose cone, exactly three fins, one round porthole window and a short plume of flame and puffy smoke under it.',
    astronaut: 'An astronaut in a bulky white spacesuit with a life-support backpack, a round helmet with a reflective gold visor (no face visible), floating weightlessly at a slight tilt with one gloved hand raised in a wave. Exactly two arms and two legs, two gloves, two boots. No flags, patches with writing or text.',
    satellite: 'A satellite: a boxy body wrapped in crinkled gold foil, two long rectangular solar panel wings in deep blue with a fine grid, one on each side, and a white dish antenna on top.',
    station: 'The International Space Station seen from a slight angle: a long straight central truss, four pairs of long rectangular gold-and-dark-blue solar array wings along it, white cylinder modules joined in the middle, and white radiator panels.',
    telescope: 'A backyard refracting telescope: a long navy and brass tube pointing up to the upper right, with a small finder scope on top and an eyepiece at the lower end, on a wooden tripod with three legs.',
    galaxy: 'A spiral galaxy seen face-on: a glowing golden core and two sweeping spiral arms of tiny blue-white and lavender stars with soft pink patches, all within a round shape.',
    rover: 'A Mars rover like NASA\'s Perseverance, seen exactly side-on: a boxy white body; only three wheels show, one at the front, one in the middle and one at the back, evenly spaced on rocker-bogie suspension arms (the wheels on the far side are hidden exactly behind them); a tall mast with a camera head on top, and a robotic arm folded at the front. Not five or six wheels in a row: three. No ground under it.'
  } },
  cats: { pal: 'warm ginger, cream, charcoal, dusty rose and sage green', s: {
    ginger: 'A ginger (orange) tabby house cat curled up asleep in a round loaf, its soft stripes following the curve of its body, its tail wrapped around to its nose, eyes closed peacefully.',
    black: 'A sleek black house cat sitting tall and alert, seen side-on with its head turned toward the viewer, bright yellow-green eyes, its tail rising in a gentle curve behind it. Four legs, one tail.',
    siamese: 'A Siamese cat lying down with its front paws stretched forward and head up: a slender cream body with dark seal-brown points on its face mask, ears, paws and tail, and bright blue almond-shaped eyes.',
    calico: 'A calico house cat (patches of white, ginger orange and black) sitting neatly with its tail curled round its front paws, looking at the viewer. Four legs, one tail.',
    tuxedo: 'A black-and-white tuxedo cat standing on all fours, side-on, tail held straight up, looking back over its shoulder at the viewer: a black coat with a white chest bib, white muzzle and four white paws.',
    tabby: 'A brown tabby house cat with the classic M marking on its forehead and swirled dark stripes, sitting upright with its head tilted in curiosity. Four legs, one tail.',
    persian: 'A white Persian cat with long, cloud-like fluffy fur, a short flat face and round copper eyes, sitting on a small round dusty-rose cushion.',
    mainecoon: 'A large brown-and-silver tabby Maine Coon cat standing proudly side-on, with lynx-like tufts on the tips of its ears, a thick ruff round its neck and a huge bushy tail. Four legs, one tail.',
    sphynx: 'A hairless Sphynx cat sitting upright, with soft wrinkly peach-pink skin, very large upright ears, lemon-shaped green eyes and a thin tail curled at its side.',
    kitten: 'A tiny gray-and-white kitten batting at a red ball of yarn with one front paw, a loose strand of yarn trailing from the ball across the floor in front of it.',
    bengal: 'A Bengal cat walking side-on with a low prowling step: a golden coat covered in dark brown rosette spots, a striped tail with a dark tip. Exactly four legs and one tail.',
    fold: 'A Scottish Fold cat in silver tabby coloring sitting facing the viewer: a very round face, small ears folded forward and down flat against its head, big round amber eyes. Four legs, one tail.',
    russianblue: 'A Russian Blue cat sitting tall in elegant profile with its head turned slightly toward the viewer: a short, dense, silvery blue-gray coat, vivid green eyes and a slim graceful build.'
  } },
  dogs: { pal: 'golden tan, warm brown, cream, sky blue and soft red', s: {
    golden: 'A Golden Retriever sitting happily, mouth open in a relaxed smile, with a feathery golden coat and feathered tail. Four legs, one tail.',
    dalmatian: 'A Dalmatian standing side-on, head turned toward the viewer: a white coat with round black spots of different sizes, black-spotted ears. Exactly four legs, one tail.',
    poodle: 'A standard poodle standing proudly side-on, in apricot color, with a puffy curly topknot, long curly ears, a pom-pom on the tail and pom-poms at the ankles. Four legs.',
    beagle: 'A tricolor beagle (tan, black saddle and white) sitting, with long floppy ears and its white-tipped tail held up. Four legs, one tail.',
    dachshund: 'A smooth red-brown dachshund trotting side-on: a long low body, very short legs, long ears and a long tail. Exactly four legs.',
    shepherd: 'A German Shepherd lying down but alert, head up, large pointed ears standing upright, a black saddle over a tan coat. Four legs, one bushy tail.',
    bulldog: 'An English bulldog standing square to the viewer: stocky and low, a wide wrinkled face with a gentle underbite, rose ears, a brindle and white coat. Four legs.',
    corgi: 'A Pembroke Welsh corgi standing side-on and turning its head to the viewer, happy, with big upright ears, short legs, a fluffy white chest and no tail showing. Exactly four legs.',
    husky: 'A Siberian husky sitting, gray and white with the classic face mask, bright blue eyes, upright triangular ears and a fluffy tail curled up beside it. Four legs.',
    chihuahua: 'A tiny fawn Chihuahua sitting, with a round apple-shaped head, very large upright ears and big dark eyes, one front paw lifted. Four legs.',
    pug: 'A fawn pug sitting with its head tilted: a black wrinkled face mask, black velvety ears, a curly tail over its hip. Four legs.',
    collie: 'A black-and-white Border Collie crouched low in a herding stance, side-on, head forward and focused, white blaze, white chest and white-tipped tail. Four legs.',
    stbernard: 'A big Saint Bernard lying down calmly, front paws crossed, a large gentle head with a white blaze and dark mask, a red-brown and white coat. No barrel.'
  } },
  zoo: { pal: 'savanna gold, leaf green, warm gray, sky blue and coral', s: {
    lion: 'A male African lion sitting proudly facing three-quarters toward the viewer, with a full dark golden-brown mane. Four legs, one tail with a dark tuft.',
    tiger: 'A Bengal tiger sitting upright, facing three-quarters toward the viewer, calm and dignified. Exactly four legs and one tail, correct tiger stripes.',
    elephant: 'An African elephant walking side-on, trunk raised in a friendly curl, two ivory tusks, very large ears. Exactly four legs, one trunk, one thin tail.',
    giraffe: 'A whole giraffe standing, head turned toward the viewer: a long neck, two short horn-like ossicones on its head, a patchwork coat of brown patches separated by cream lines. Exactly four long legs.',
    zebra: 'A plains zebra standing side-on: bold black and white stripes that run vertically on the body and horizontally on the legs, an upright striped mane. Exactly four legs, one tail.',
    panda: 'A giant panda sitting and holding a green bamboo stalk in its front paws, eating leaves: black eye patches, black ears, black arms and legs, white body. Four limbs.',
    penguin: 'An emperor penguin standing upright: black back and head, white belly, a soft golden-yellow patch on each side of the neck, a slender curved bill. Two flippers, two feet.',
    monkey: 'A capuchin monkey sitting and looking curious: a cream-colored face and chest, a dark brown cap on its head, brown body, a long tail curling round beside it. Two arms, two legs.',
    hippo: 'A hippopotamus standing side-on, barrel-shaped gray-purple body with pink undertones, a huge rounded muzzle, small ears and eyes on top of its head. Exactly four short legs.',
    kangaroo: 'A red kangaroo standing upright on its big back feet, leaning on its thick tail, with a small joey peeking out of its pouch. The mother has two small front arms, two big hind legs and one tail.',
    polarbear: 'A polar bear walking on all fours, side-on, head low and swinging forward: creamy white fur with soft blue-gray shading, black nose. Exactly four legs.',
    flamingo: 'An American flamingo standing on one long leg with the other leg tucked up, its long neck in an S-curve, bright coral-pink feathers and a bent black-tipped bill.',
    crocodile: 'A Nile crocodile lying side-on with its long snout slightly open showing a neat row of teeth, bumpy olive-green back scales and a long tail. Exactly four short legs.'
  } },
  food: { pal: 'tomato red, golden yellow, fresh green, chocolate brown, cream and pink', s: {
    pizza: 'A whole round pepperoni pizza seen from above at a three-quarter angle, cut into eight slices, with one slice pulled a little away from the rest and stretchy melted cheese between them, a few basil leaves.',
    burger: 'A cheeseburger seen from the side: a sesame seed bun, a juicy patty, a slice of melted yellow cheese, green lettuce, two tomato slices.',
    taco: 'One crunchy taco seen from the side at a slight angle: a folded golden corn tortilla shell filled with seasoned meat, shredded lettuce, diced tomato and grated cheese.',
    hotdog: 'A hot dog in a soft split bun seen from the side, with a neat zigzag of yellow mustard along the top.',
    sushi: 'Sushi on a small wooden board: two pieces of salmon nigiri (orange salmon over a block of white rice) and two maki rolls (rice rolls wrapped in dark seaweed with a pink and green center).',
    pretzel: 'A big soft pretzel in the classic knot shape: one long rope of dough whose two arms cross over twice in the middle and whose ends press into the bottom of the loop, making three openings; a glossy brown crust sprinkled with coarse white salt.',
    donut: 'A round donut with pink frosting and colorful sprinkles, with a hole in the middle, seen at a slight angle.',
    cupcake: 'A cupcake in a pleated pastel paper liner, topped with a tall swirl of vanilla frosting and one red cherry on top.',
    icecream: 'An ice cream cone: a crisp waffle cone holding two scoops, strawberry pink on the bottom and chocolate brown on top, with a little drip running down.',
    watermelon: 'A whole round green-striped watermelon with one wedge-shaped slice resting in front of it, the slice showing red fruit, black seeds and a pale green rind.',
    strawberry: 'One big ripe strawberry with a leafy green top, its red skin dotted with small yellow seeds.',
    banana: 'One yellow banana, half peeled, with three strips of peel hanging down and the cream-colored fruit showing at the top.',
    carrot: 'One orange carrot lying slightly diagonal, with a feathery green leafy top and faint rings across its root.'
  } },
  flowers: { pal: 'rose pink, sunshine yellow, leaf green, lavender purple, coral and cream', s: {
    rose: 'A single red rose in full bloom, petals spiraling around the center, on a short stem with two leaves and a few small thorns.',
    sunflower: 'A single sunflower facing the viewer: a ring of bright golden petals round a large dark brown seed center, on a thick stem with two large heart-shaped leaves.',
    tulip: 'A single pink tulip: a closed cup of six smooth petals (three in front, three behind), on a straight stem with two long pointed leaves.',
    daisy: 'A single white daisy facing the viewer: many slim white petals round a bright yellow center, on a slender stem with one small leaf.',
    lily: 'An orange tiger lily flower: exactly six petals curling back, dotted with dark spots, with six long stamens reaching out from the center, on a stem with narrow leaves.',
    orchid: 'A pink-and-white moth orchid: one arching stem carrying three open flowers and two buds; each flower has three narrow sepals, two wide rounded petals and a small colored lip in the center.',
    lotus: 'A pink lotus flower in bloom with layered pointed petals and a yellow center, resting on a round flat green lotus leaf, with a couple of small ripples.',
    daffodil: 'A single yellow daffodil seen from the side: six pale yellow petals spread round a deeper yellow trumpet with a ruffled rim, on a green stem with long flat leaves.',
    poppy: 'A red poppy: exactly four papery, crinkled petals round a dark center, on a thin curving stem, with one nodding bud on another stem.',
    lavender: 'A small bunch of lavender: several straight stems topped with spikes of tiny purple flowers, tied together near the bottom with a lilac ribbon bow.',
    cherry: 'A short cherry blossom branch with clusters of pale pink flowers, each flower with exactly five rounded petals, and a few small buds.',
    hibiscus: 'A red hibiscus flower facing the viewer: exactly five broad overlapping petals with a dark red center and a long central stamen column tipped with yellow, with two glossy green leaves.',
    dandelion: 'A dandelion seed head: a round white fluffy globe of seeds on a slender green stem, with three or four seeds drifting away on their tiny parachutes.'
  } },
  sports: { pal: 'grass green, navy, white, orange, red and gold', s: {
    soccer: 'A classic soccer ball: white hexagon panels and black pentagon panels, each black pentagon surrounded by five white hexagons, drawn as a correct round ball.',
    basketball: 'An orange basketball with its black seams: one seam all the way round, one crossing it, and two curved seams on the sides, with a pebbled surface.',
    football: 'An American football: a brown leather ball with pointed ends, one row of white laces across the seam on top, and a white stripe near each end.',
    glove: 'A brown leather baseball glove with a white baseball held in its pocket, the ball showing its red stitching. The glove has a thumb and four fingers.',
    racket: 'A tennis racket with a navy frame and a taut string grid, a wrapped handle, with one bright yellow-green tennis ball resting against it.',
    golf: 'A golf club (an iron with a silver head and black grip) leaning beside a white dimpled golf ball sitting on a wooden tee.',
    hockey: 'An ice hockey stick with a black taped blade, lying diagonally, with a black rubber puck in front of the blade.',
    bowling: 'A white bowling pin with two red stripes round its neck, standing beside a dark blue bowling ball with exactly three finger holes.',
    skateboard: 'A skateboard tilted to show its colorful underside (an abstract wave pattern, no letters), with exactly four wheels on two trucks.',
    skate: 'One white figure ice skate seen side-on: a laced leather boot with a small heel and a long silver steel blade with toe picks at the front.',
    surfboard: 'A surfboard standing upright: a long rounded board in teal with a coral stripe down its middle and one small fin at the bottom.',
    boxing: 'A pair of red boxing gloves tied together by their white laces, hanging side by side.',
    trophy: 'A shiny gold cup trophy with two curved handles, on a small stepped dark wooden base. No plate or writing.'
  } },
  jobs: { pal: 'navy, red, mustard yellow, teal, cream and natural skin tones', people: 1, s: {
    firefighter: 'A firefighter, a woman of East Asian descent in her thirties, smiling with quiet confidence, wearing tan turnout gear with yellow reflective stripes, black boots and a red helmet, holding the brass nozzle of a coiled fire hose.',
    doctor: 'A doctor, a South Asian man in his sixties with gray hair and a neat gray beard, kind eyes, wearing a white coat over a blue shirt, a stethoscope round his neck, holding a clipboard (nothing written on it).',
    teacher: 'A teacher, a Black man in his thirties with glasses and a mustard cardigan, holding a small desk globe in one hand and pointing to it with the other, mid-explanation and smiling.',
    chef: 'A chef, a Latina woman in her forties in a white double-breasted chef\'s jacket, a tall white toque and a red neckerchief, holding a frying pan with a few vegetables tossing up out of it.',
    police: 'A police officer, a white man in his fifties with a friendly face and graying temples, in a navy uniform with a peaked cap and a plain silver badge (no writing), a radio on his shoulder, giving a cheerful wave.',
    farmer: 'A farmer, a Black woman in her sixties with short gray hair, denim overalls over a checked shirt, a straw hat and rubber boots, holding a basket of fresh carrots, tomatoes and lettuce.',
    pilot: 'An airline pilot, a white woman in her forties with auburn hair in a bun, in a navy captain\'s uniform with four gold stripes on each cuff and a peaked cap with a winged badge, a headset round her neck, standing tall with a small flight bag.',
    mail: 'A mail carrier, a Pacific Islander man in his twenties with curly black hair, in a light blue-gray uniform shirt, navy shorts and a cap, with a satchel full of envelopes on his shoulder, holding out an envelope (nothing written on it).',
    builder: 'A builder, a Native American woman in her thirties with a long black braid, wearing a white hard hat, an orange safety vest over a denim shirt, work gloves and boots, holding a hammer and a rolled-up blue plan.',
    scientist: 'A scientist, an East Asian man in his seventies with white hair, a white lab coat and safety goggles pushed up on his forehead, holding up a glass flask of glowing green liquid and looking at it with delight.',
    artist: 'An artist, a young South Asian woman in her twenties sitting in a modern wheelchair (two large wheels and two small front wheels), wearing a paint-spotted apron, holding a wooden paint palette and a brush, smiling.',
    vet: 'A veterinarian, a Latino man in his thirties in teal scrubs with a stethoscope round his neck, gently holding a fluffy brown-and-white puppy in his arms.',
    mechanic: 'A mechanic, a Middle Eastern woman in her fifties with gray-streaked dark hair tied back, in navy coveralls with the sleeves rolled up and a smudge of grease on her cheek, holding a large wrench, smiling with confidence.'
  } },
  states: { pal: 'warm red, navy, sky blue, forest green, sand and cream', place: 1, s: {
    california: 'The Golden Gate Bridge seen from the side: its two tall red-orange Art Deco towers with the main cables sweeping in deep curves between and beyond them, the flat roadway beneath, small and whole, over a little strip of blue water.',
    texas: 'A Texas Longhorn steer standing side-on in a small patch of bluebonnet flowers: a reddish-brown and white coat and very long, wide horns curving out to each side. Exactly four legs.',
    florida: 'A West Indian manatee swimming gently: a round gray body, a wrinkled whiskered snout, two small front flippers and a broad, rounded paddle tail, with a few bubbles. No legs.',
    newyork: 'The Statue of Liberty, seen whole on her stone pedestal: the robed copper-green woman holding a torch high in her raised right hand and a tablet in her left arm, a crown with seven rays. No writing on the tablet.',
    alaska: 'A bull moose standing side-on: a dark brown body, a long face with a dewlap, and very broad, flat, palm-shaped antlers. Exactly four long legs.',
    hawaii: 'A Hawaiian green sea turtle swimming gracefully: an olive and brown patterned shell, four flippers, a small head.',
    arizona: 'The Grand Canyon: layered red, orange and cream canyon walls with a green river winding at the bottom, and a tall saguaro cactus with two upturned arms in the front.',
    washington: 'The Space Needle in Seattle in front of Mount Rainier, the way the city sees it on a clear day: a tall slender tower on three pairs of curved legs rising to a flying-saucer-shaped top with a thin spire, standing at the left of center; behind it to the right, Mount Rainier as one broad, snow-and-glacier-covered volcano rising from a low band of dark green forest, its wide gentle summit level with the Space Needle\'s saucer top and its base about half the picture wide, clearly a whole mountain resting on the ground, not floating and not cut off. One mountain only.',
    louisiana: 'A brown pelican, the state bird, standing on a weathered wooden dock post: a gray-brown body, a white neck and a pale yellow crown, a long gray bill with a throat pouch.',
    michigan: 'An American robin, the state bird, perched on a branch of apple blossoms, the state flower: a gray-brown back, an orange-red breast, a yellow bill; white five-petaled blossoms with pink edges.',
    southdakota: 'Mount Rushmore: the four colossal granite faces of the presidents Washington, Jefferson, Theodore Roosevelt and Lincoln carved side by side into a gray granite mountainside, with pine trees at its foot. Respectful, dignified, recognizable likenesses carved in stone.',
    pennsylvania: 'The Liberty Bell hanging from its dark wooden yoke on a sturdy wooden frame: a bronze bell with its famous long crack running up from the rim. No lettering on the bell.',
    maine: 'A white lighthouse on a rocky granite shore with a small red-roofed white keeper\'s house beside it, a black lantern room at the top, a few small waves breaking on the rocks.'
  } },
  countries: { pal: 'warm red, teal, sky blue, sand gold, leaf green and cream', place: 1, s: {
    japan: 'Mount Fuji: its snow-capped, almost perfectly symmetrical cone, with a red five-story pagoda (exactly five roofs) in front of it on a green hillside and a few pink cherry blossom branches.',
    china: 'The Great Wall of China winding up and over green mountain ridges, with square stone watchtowers along it.',
    india: 'The Taj Mahal seen from the front: a white marble mausoleum with a large central onion dome, four small domed pavilions round it, on a raised platform with exactly four tall minarets, one at each corner, and a long reflecting pool in front.',
    france: 'The Eiffel Tower: a tall wrought-iron lattice tower in warm bronze-brown, with its four curved legs, two viewing platforms and a slender top.',
    italy: 'The Leaning Tower of Pisa: a white marble cylindrical bell tower with rows of round arches and columns, tilting clearly to the right, with a smaller belfry on top.',
    uk: 'The Elizabeth Tower in London (Big Ben): a tall golden-stone Gothic clock tower with a large clock face showing simple hands and plain marks instead of numerals, and a pointed spire on top.',
    egypt: 'The pyramids of Giza: three golden pyramids of different sizes on the sand, with the Great Sphinx resting in front of them.',
    southafrica: 'Table Mountain in Cape Town: a long flat-topped mountain above a blue bay, with a pink king protea, the national flower, in the front.',
    brazil: 'The statue of Christ the Redeemer standing with arms outstretched on the green peak of Corcovado mountain, with Sugarloaf Mountain smaller behind it.',
    mexico: 'El Castillo, the pyramid at Chichen Itza: a stone step pyramid of nine terraces with one steep staircase up the middle of each side and a small square temple on top, with green jungle at its foot.',
    canada: 'A North American beaver sitting up and holding a small stick in its front paws, with its broad flat paddle tail, beside one bright red maple leaf.',
    peru: 'Machu Picchu: gray stone Inca ruins and green terraces on a mountain ridge with the steep peak of Huayna Picchu rising behind, and a white llama standing in front.',
    australia: 'The Sydney Opera House: white, shell-shaped sail roofs rising in overlapping groups on a stone platform at the edge of a blue harbor.'
  } }
};

function prompt(deck, key) {
  const d = D[deck];
  return STYLE + 'A limited palette of five colors plus warm off-white: ' + d.pal + '. Subject: ' + d.s[key] + (d.people ? PEOPLE : '') + (d.place ? PLACE : '') + TAIL;
}
module.exports = { STYLE, TAIL, PEOPLE, PLACE, D, prompt };
if (require.main === module) {
  const decks = process.argv[2] ? process.argv[2].split(',') : Object.keys(D);
  const keys = process.argv[3] ? process.argv[3].split(',') : null;
  const jobs = [];
  decks.forEach(dk => Object.keys(D[dk].s).forEach(k => { if (!keys || keys.indexOf(k) >= 0) jobs.push({ k: dk + '-' + k, prompt: prompt(dk, k) }); }));
  process.stdout.write(JSON.stringify(jobs, null, 1));
}
