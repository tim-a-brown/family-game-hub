// Riddles: the first 100 riddles, the answer checker and the daily schedule (games/riddles.html; checked by
// scripts/riddles-check.js). More riddles come in packs, data/riddles-pack-1.js .. -4.js, each adding to
// window.RIDDLES_MORE with ids like 'p3-...'. Every answer is unique across all of them, and no riddle accepts
// another riddle's answer or alternates.
//
// Each riddle: {id, q, a, alt:[], hints:[h1, h2], d:'easy'|'medium'|'hard', why, from?}
//   q      the riddle ("\n" breaks a verse into lines)
//   a      the canonical answer, shown when solved or given up
//   alt    other answers that count. An entry starting with "+" is a word set: the guess counts if it has all
//          of those words in any order ("+horse" accepts "he rode a horse called Friday").
//   hints  two hints: a nudge, then a strong push
//   why    a sentence or two shown after the riddle is over
//   from   (classics only) where the riddle comes from
// Classics are public domain (Greek myth, the Bible, the Exeter Book, Mother Goose, Swift, old English folk
// riddles), reworded where the old wording is hard going. The rest are folk riddles retold and new ones.
//
// ── Answer checking (RiddleCheck.check) ─────────────────────────────────────
// Both the guess and every accepted answer are normalised the same way:
//   lower case, accents dropped, "&" -> "and", apostrophes dropped (don't -> dont), other punctuation -> space,
//   contractions expanded (dont -> do not, its -> it is, cant/cannot -> can not ...), numbers 0-20 -> words,
//   articles a/an/the dropped, lead-ins dropped ("I think it's ...", "is it ...", "maybe ..."),
//   and each word made singular (s/es/ies; y/ie endings unified) so "eggs" = "egg", "berries" = "berry".
// A guess is right when, after that, it equals an accepted answer (words in any order also count, and spaces
// don't matter: "tea pot" = "teapot"), or it has every word of a "+" word set, or it is a small typo:
//   Typos are judged word by word with Damerau-Levenshtein distance (a swap of two neighbouring letters is one
//   edit), allowing per word, by the length L of the answer word:
//        L <= 4: 0 edits    5-7: 1 edit    8-11: 2 edits    12+: 3 edits
//   Short words get no slack because one letter turns them into another word (cat/car, coin/corn, bee/bed).
//   And a typo never counts if the guessed word is itself a real English word (words-en.js, when loaded):
//   "handle" is not a typo of "candle", nor "tower" of "towel". Without the word list, a typo must keep the
//   answer word's first letter instead. Run-together or split words (foot stpes) use the whole answer's length.
// "Close!" is when the guess isn't accepted but is one edit beyond the allowance, was a real word one edit
// away, shares a meaningful word with an answer ("an old man" for the Sphinx), or contains/is inside an answer.
(function (root) {
  'use strict';
  var R = [
    // ── Easy ─────────────────────────────────────────────────────────────────
    { id: 'piano', d: 'easy', q: "What has keys but can't open a single lock?", a: 'a piano',
      alt: ['pianos', 'grand piano', 'upright piano'],
      hints: ["You play it. You don't unlock anything with it.", 'Its keys are black and white.'],
      why: 'A piano has 88 keys, and not one of them fits a lock.' },
    { id: 'clock', d: 'easy', q: "What has hands but can't clap, and a face but can't smile?", a: 'a clock',
      alt: ['clocks', 'watch', 'wristwatch', 'alarm clock', 'wall clock', 'grandfather clock'],
      hints: ['It hangs on a wall or sits on a shelf.', 'Its hands go round and round all day long.'],
      why: "A clock's hands point to the hours and minutes on its face." },
    { id: 'towel', d: 'easy', q: 'What gets wetter the more it dries?', a: 'a towel',
      alt: ['towels', 'bath towel', 'hand towel', 'beach towel', 'tea towel', 'dish towel'],
      hints: ["You'll find one hanging in the bathroom.", 'You grab it when you step out of the shower.'],
      why: 'A towel soaks up the water as it dries you, so the more drying it does, the wetter it gets.' },
    { id: 'coin', d: 'easy', q: 'What has a head and a tail, but no body and no legs?', a: 'a coin',
      alt: ['coins', 'penny', 'quarter', 'nickel', 'dime', 'cent'],
      hints: ['You might flip it to settle an argument.', 'It jingles in your pocket.'],
      why: "Coins have heads on one side and tails on the other." },
    { id: 'comb', d: 'easy', q: 'I have lots of teeth but I never bite, and I help keep your hair neat.', a: 'a comb',
      alt: ['combs', 'hair comb'],
      hints: ["It's small enough to fit in a pocket.", 'You run it through your hair.'],
      why: 'A comb has a row of teeth that untangle hair without ever biting.' },
    { id: 'age', d: 'easy', q: 'What goes up and up but never comes down?', a: 'your age',
      alt: ['age', 'my age', 'how old you are', '+age'],
      hints: ['Everyone has one, and it changes once a year.', "There's usually a cake when it goes up."],
      why: 'Your age only ever goes up, one birthday at a time.' },
    { id: 'name', d: 'easy', q: 'What belongs to you, but other people use it much more than you do?', a: 'your name',
      alt: ['name', 'my name', 'first name', '+name'],
      hints: ['People say it to get your attention.', "It's written on your birth certificate."],
      why: "Your name is yours, but it's mostly other people who say it." },
    { id: 'sponge', d: 'easy', q: 'What is full of holes but still holds water?', a: 'a sponge',
      alt: ['sponges', 'kitchen sponge', 'sea sponge', 'bath sponge'],
      hints: ['You might use it to wash the dishes.', 'Squeeze it and the water pours out.'],
      why: 'A sponge is full of little holes that soak up water and hold it until you squeeze.' },
    { id: 'stairs', d: 'easy', q: 'What goes up and down but never moves?', a: 'stairs',
      alt: ['staircase', 'stairway', 'steps', 'flight of stairs', 'stairwell'],
      hints: ["It's inside lots of houses.", 'You climb it to get to bed.'],
      why: 'Stairs lead up and down, but they stay right where they are.' },
    { id: 'eye', d: 'easy', q: 'What has a pupil but never goes to school?', a: 'an eye',
      alt: ['eyes', 'eyeball', 'your eye'],
      hints: ['You have two of them.', "You're using them to read this."],
      why: 'The pupil is the dark circle in the middle of your eye that lets the light in.' },
    { id: 'bottle', d: 'easy', q: 'What has a neck but no head, and wears a cap but has no hair?', a: 'a bottle',
      alt: ['bottles', 'water bottle', 'glass bottle', 'soda bottle', 'plastic bottle', 'milk bottle', 'wine bottle'],
      hints: ['You drink from it.', 'Twist off the top to open it.'],
      why: 'A bottle narrows into a neck at the top, and its lid is called a cap.' },
    { id: 'map', d: 'easy', q: 'I have cities but no houses, forests but no trees, and rivers but no water. What am I?', a: 'a map',
      alt: ['maps', 'atlas', 'road map', 'world map', 'globe'],
      hints: ['You might use me to find your way.', "I'm usually printed on paper and folded up."],
      why: 'A map shows cities, forests and rivers, but only as drawings.' },
    { id: 'river', d: 'easy', q: 'I run but never walk, I have a mouth but never talk, and a bed but never sleep.', a: 'a river',
      alt: ['rivers', 'stream', 'creek', 'brook'],
      hints: ["I'm full of water.", 'I flow all the way to the sea.'],
      why: 'A river runs, it ends at a mouth where it meets the sea, and it flows along a riverbed.' },
    { id: 'book', d: 'easy', q: "I have a spine but no bones, a jacket but no arms, and I'm full of words but never speak.", a: 'a book',
      alt: ['books', 'novel', 'hardback', 'hardcover', 'paperback', 'storybook'],
      hints: ["You'll find lots of me on a shelf.", 'Turn my pages to read my story.'],
      why: 'A book has a spine, a dust jacket, and pages full of words it can never say out loud.' },
    { id: 'glove', d: 'easy', q: "What has four fingers and a thumb, but isn't alive?", a: 'a glove',
      alt: ['gloves', 'pair of gloves', 'baseball glove', 'rubber glove', 'mitt'],
      hints: ['You wear it.', 'It keeps your hand warm in winter.'],
      why: "A glove has four fingers and a thumb, but there's no hand in it until you put yours in." },
    { id: 'mushroom', d: 'easy', q: 'What kind of room has no doors, no windows and no walls?', a: 'a mushroom',
      alt: ['mushrooms', 'toadstool'],
      hints: ["It isn't in a house at all. It grows.", 'You might find it in the woods, or on a pizza.'],
      why: "A mush-room is a room in name only." },
    { id: 'stamp', d: 'easy', q: 'What can travel all around the world while staying in one corner?', a: 'a stamp',
      alt: ['stamps', 'postage stamp'],
      hints: ['It goes everywhere the mail goes.', "It's stuck in the top corner of a letter."],
      why: 'A stamp sits in the corner of an envelope and travels as far as the letter does.' },
    { id: 'library', d: 'easy', q: 'Which building has the most stories?', a: 'a library',
      alt: ['libraries', 'public library', 'bookstore', 'bookshop'],
      hints: ['Think of a different kind of story.', 'You can borrow books there.'],
      why: "A library isn't the tallest building, but it holds the most stories: in its books." },
    { id: 'shoe', d: 'easy', q: 'I have a tongue but never talk, and I go everywhere you walk.', a: 'a shoe',
      alt: ['shoes', 'sneaker', 'boot', 'trainer', 'running shoe'],
      hints: ['You usually wear two of me.', 'I have laces that you tie.'],
      why: 'A shoe has a tongue under its laces, and it goes with you every step.' },
    { id: 'hole', d: 'easy', q: 'What gets bigger the more you take away from it?', a: 'a hole',
      alt: ['holes', 'pit', 'ditch', 'hollow'],
      hints: ['Think of digging.', 'Every shovelful you take out makes it bigger.'],
      why: 'The more dirt you dig out of a hole, the bigger the hole gets.' },
    { id: 'silence', d: 'easy', q: 'What is so fragile that just saying its name breaks it?', a: 'silence',
      alt: ['quiet', 'quietness'],
      hints: ["You can't see it or touch it.", 'Shhh...'],
      why: "As soon as you say \"silence\", it isn't silent any more." },
    { id: 'echo', d: 'easy', q: "I can't talk, but I answer back when you shout into a canyon.", a: 'an echo',
      alt: ['echoes', 'echos'],
      hints: ['I always say exactly what you said.', "I'm your voice bouncing back off the rocks."],
      why: 'An echo is your own voice bouncing back off cliffs and walls.' },
    { id: 'outside', d: 'easy', q: 'Which side of a cup is the handle on?', a: 'the outside',
      alt: ['outer side', '+outside'],
      hints: ["It isn't left or right.", "It isn't inside the cup."],
      why: 'Left or right depends on how you hold it, but the handle is always on the outside.' },
    { id: 'moon', d: 'easy', q: 'I light up the night but have no light of my own. I change my shape all month, and I pull the sea back and forth.', a: 'the moon',
      alt: ['full moon', 'moonlight', 'half moon', 'crescent moon'],
      hints: ["You'll see me up in the sky.", "Sometimes I'm full, sometimes just a thin slice."],
      why: 'The moon shines with reflected sunlight, goes through phases, and its pull makes the tides.' },
    { id: 'shadow', d: 'easy', q: 'I follow you all day in the sunshine, copying every move you make, but I vanish when night falls.', a: 'your shadow',
      alt: ['shadow', 'my shadow', '+shadow'],
      hints: ["I'm the same shape as you, only flat and dark.", 'I appear where your body blocks the sunlight.'],
      why: 'Your shadow is made where your body blocks the light, so it follows you wherever the sun shines.' },
    { id: 'kite', d: 'easy', q: 'I fly without wings and climb higher when the wind blows, but a string stops me getting away.', a: 'a kite',
      alt: ['kites'],
      hints: ["You'd fly me at the beach or in the park.", "I'm made of fabric or paper, often with a long tail."],
      why: 'A kite rides on the wind, and its string keeps it from blowing away.' },
    { id: 'cake', d: 'easy', q: "I'm cut but never hurt, I wear candles but don't light the room, and everyone sings to me once a year.", a: 'a birthday cake',
      alt: ['cake', 'cakes', 'birthday cakes'],
      hints: ["You'll find me at a party.", 'Make a wish and blow out my flames.'],
      why: 'A birthday cake gets cut into slices, wears candles, and gets "Happy Birthday" sung to it.' },
    { id: 'snail', d: 'easy', q: 'I carry my house on my back, I move very slowly, and I leave a silvery trail wherever I go.', a: 'a snail',
      alt: ['snails', 'garden snail'],
      hints: ['I live in gardens and love the rain.', 'My house is a spiral shell.'],
      why: 'A snail carries its shell everywhere and leaves a trail of slime behind it.' },
    { id: 'owl', d: 'easy', q: "I sleep all day and hunt all night. I can turn my head almost all the way round, and I keep asking \"who?\"", a: 'an owl',
      alt: ['owls', 'barn owl', 'night owl'],
      hints: ["I'm a bird.", 'I have big round eyes and I hoot.'],
      why: 'Owls hunt at night, can turn their heads about three-quarters of the way round, and call "hoo, hoo".' },
    { id: 'bee', d: 'easy', q: "I make something sweet that you spread on toast, but you'd better not bother my home.", a: 'a bee',
      alt: ['bees', 'honeybee', 'honey bee', 'bumblebee', 'bumble bee'],
      hints: ['I buzz from flower to flower.', 'I live in a hive, and I can sting.'],
      why: "Bees make honey in their hive, and they'll sting to protect it." },
    { id: 'onion', d: 'easy', q: "Take off my skin and I won't cry, but you will.", a: 'an onion',
      alt: ['onions', 'red onion', 'shallot'],
      hints: ["You'll find me in the kitchen.", 'Chopping me makes your eyes water.'],
      why: 'Cutting an onion releases a gas that stings your eyes and makes them water.' },
    { id: 'shirt', d: 'easy', q: 'I have a neck but no head, and two arms but no hands.', a: 'a shirt',
      alt: ['shirts', 't shirt', 'tshirt', 'sweater', 'jumper', 'blouse', 'top', 'sweatshirt', 'jacket', 'coat', 'jersey'],
      hints: ['You wear me.', 'I have buttons, or I pull on over your head.'],
      why: 'A shirt has a neck hole and two sleeves, but nobody inside until you put it on.' },
    { id: 'watermelon', d: 'easy', q: "There's a green house. Inside the green house is a white house. Inside the white house is a red house. And inside the red house are lots of little babies.", a: 'a watermelon',
      alt: ['watermelons', 'water melon', 'melon'],
      hints: ['You can eat it.', "It's a big, juicy summer fruit."],
      why: 'A watermelon has a green rind, then a white layer, then red flesh full of little seeds.' },
    { id: 'mirror', d: 'easy', q: "If you drop me I'm likely to crack, but smile at me and I'll always smile back.", a: 'a mirror',
      alt: ['mirrors', 'looking glass', 'bathroom mirror'],
      hints: ['I hang on a wall.', 'You see yourself in me.'],
      why: 'A mirror reflects whatever is in front of it, including your smile.' },
    { id: 'hair', d: 'easy', from: 'Mother Goose', q: 'Riddle me, riddle me, what is that,\nOver the head and under the hat?', a: 'hair',
      alt: ['your hair', 'my hair', '+hair'],
      hints: ['It grows on you.', 'You brush it in the morning.'],
      why: 'Your hair is on top of your head and under your hat.' },

    // ── Medium ───────────────────────────────────────────────────────────────
    { id: 'sphinx', d: 'medium', from: 'The Riddle of the Sphinx, Greek myth', q: 'What walks on four legs in the morning, two legs at noon, and three legs in the evening?', a: 'a human',
      alt: ['humans', 'man', 'person', 'people', 'human being', 'mankind', 'humankind', 'humanity', 'men', 'woman', 'women', 'old man', '+human', '+person', '+man'],
      hints: ['The "day" is a whole lifetime.', 'A baby crawls, a grown-up walks, and an old person uses a cane.'],
      why: 'Morning, noon and evening are the stages of life: a baby crawls on all fours, a grown-up walks on two legs, and in old age you lean on a walking stick. Oedipus solved it, and the Sphinx was beaten.' },
    { id: 'candle', d: 'medium', from: 'Mother Goose', q: 'Little Nancy Etticoat,\nIn a white petticoat,\nAnd a red nose;\nThe longer she stands,\nThe shorter she grows.', a: 'a candle',
      alt: ['candles', 'wax candle', '+candle'],
      hints: ['Her "red nose" is very hot.', 'She has a wick and drips wax.'],
      why: 'A white candle with a red flame on top burns shorter the longer it stands lit.' },
    { id: 'needle', d: 'medium', from: 'Mother Goose', q: 'Old Mother Twitchett had but one eye,\nAnd a long tail which she let fly;\nAnd every time she went through a gap,\nShe left a bit of her tail in a trap.', a: 'a needle and thread',
      alt: ['needle', 'needles', 'sewing needle', '+needle'],
      hints: ['Her one "eye" is very, very small.', "She's used for sewing."],
      why: 'A needle has one eye, its long tail is the thread, and every stitch leaves a little thread behind in the cloth.' },
    { id: 'teeth', d: 'medium', from: 'Mother Goose', q: 'Thirty white horses upon a red hill,\nNow they tramp, now they champ,\nNow they stand still.', a: 'teeth',
      alt: ['tooth', 'your teeth', 'my teeth', '+teeth'],
      hints: ['The red hill is in your mouth.', 'You brush them twice a day.'],
      why: 'Your teeth stand in a row on your red gums. They chomp when you eat, and stand still when you stop.' },
    { id: 'tree', d: 'medium', from: 'Mother Goose', q: 'In spring I look gay,\nDecked in comely array;\nIn summer more clothing I wear.\nWhen colder it grows,\nI fling off my clothes,\nAnd in winter quite naked appear.', a: 'a tree',
      alt: ['trees', 'oak', 'oak tree', 'maple', 'maple tree', 'apple tree', 'deciduous tree'],
      hints: ['My "clothes" are green, then red and gold.', 'In autumn they all fall to the ground.'],
      why: 'A leafy tree blossoms in spring, is thick with leaves in summer, drops them in autumn and stands bare all winter.' },
    { id: 'icicle', d: 'medium', from: 'Mother Goose', q: 'It lives in winter,\nDies in summer,\nAnd grows with its root upward.', a: 'an icicle',
      alt: ['icicles'],
      hints: ['It hangs from the edge of a roof.', "It's made of frozen drips of water."],
      why: 'Icicles form in freezing weather and melt in the warm, and they grow downward from their "root" at the top.' },
    { id: 'rainbow', d: 'medium', from: 'Mother Goose', q: "Purple, yellow, red and green,\nThe king cannot reach it, nor the queen;\nNor can Old Noll, whose power's so great:\nTell me this riddle while I count eight.", a: 'a rainbow',
      alt: ['rainbows', 'double rainbow'],
      hints: ["It's up in the sky.", 'You see it when the sun comes out during rain.'],
      why: 'No king or queen can touch a rainbow, however powerful they are. "Old Noll" was Oliver Cromwell.' },
    { id: 'mist', d: 'medium', from: 'Mother Goose', q: 'A hill full, a hole full,\nYet you cannot catch a bowl full.', a: 'mist',
      alt: ['fog', 'morning mist', 'haze'],
      hints: ["It's thickest early on a cool morning.", "It's like a cloud lying on the ground."],
      why: "Mist can fill a whole hill or valley, but you can't scoop up a single bowlful." },
    { id: 'footsteps', d: 'medium', q: 'The more of them you take, the more you leave behind.', a: 'footsteps',
      alt: ['footstep', 'steps', 'footprints', 'footprint', 'foot prints', 'tracks'],
      hints: ['You leave them in sand or snow.', 'You take them when you walk.'],
      why: 'Every step you take leaves a footprint behind you.' },
    { id: 'teapot', d: 'medium', q: 'What starts with T, ends with T, and has T in it?', a: 'a teapot',
      alt: ['teapots', 'tea pot'],
      hints: ['One of the "T"s is something you drink.', 'You pour from it.'],
      why: "Teapot starts and ends with the letter T, and it's full of tea." },
    { id: 'incorrectly', d: 'medium', q: 'Which word is always spelled incorrectly in every dictionary?', a: 'incorrectly',
      alt: ['the word incorrectly', '+incorrectly'],
      hints: ['Read the question very literally.', 'The answer is right there in the question.'],
      why: 'The word "incorrectly" is spelled i-n-c-o-r-r-e-c-t-l-y in every dictionary.' },
    { id: 'garbagetruck', d: 'medium', q: "What has four wheels and flies, but isn't an airplane?", a: 'a garbage truck',
      alt: ['trash truck', 'rubbish truck', 'garbage lorry', 'bin lorry', 'dump truck', 'refuse truck', 'dustcart', '+garbage truck', '+trash truck', '+bin truck', '+garbage lorry'],
      hints: ['The "flies" are insects.', 'It comes down your street on collection day.'],
      why: "A garbage truck has four wheels, and it's usually buzzing with flies." },
    { id: 'letterw', d: 'medium', q: "What's at the end of a rainbow?", a: 'the letter W',
      alt: ['w', 'letter w', 'double u', 'double you'],
      hints: ['Look at the word, not the sky.', 'Spell it out and look at the last letter.'],
      why: 'R-A-I-N-B-O-W: the letter W is at the end of "rainbow".' },
    { id: 'lunch', d: 'medium', q: 'What two things can you never eat for breakfast?', a: 'lunch and dinner',
      alt: ['lunch and supper', 'lunch dinner', 'lunch or dinner'],
      hints: ["They aren't foods at all.", "They're the other two meals of the day."],
      why: "Whatever you eat in the morning is breakfast, so you can't have lunch or dinner then." },
    { id: 'dictionary', d: 'medium', q: 'Where does today come before yesterday?', a: 'in a dictionary',
      alt: ['dictionary', 'dictionaries', 'alphabetical order', '+dictionary', '+alphabetical'],
      hints: ['Think about the order of words, not days.', 'T comes before Y.'],
      why: 'In a dictionary the words are in alphabetical order, so "today" comes before "yesterday".' },
    { id: 'deck', d: 'medium', q: 'What has thirteen hearts but no other organs?', a: 'a deck of cards',
      alt: ['deck', 'pack of cards', 'playing cards', 'cards', 'card deck', '+deck', '+cards'],
      hints: ['It also has thirteen spades.', 'You shuffle it before a game.'],
      why: 'A deck of cards has thirteen hearts, from the ace to the king.' },
    { id: 'bank', d: 'medium', q: 'I have branches, but no fruit, no trunk and no leaves. What am I?', a: 'a bank',
      alt: ['banks', '+bank'],
      hints: ['Think money, not trees.', 'You keep your savings in me.'],
      why: "Banks have branches all over town, but they don't grow anything (except your savings)." },
    { id: 'anchor', d: 'medium', q: "What do you throw out when you want to use it, and take in when you don't?", a: 'an anchor',
      alt: ['anchors', "ship's anchor", 'boat anchor'],
      hints: ['Think about boats.', 'It stops a ship from drifting away.'],
      why: 'Sailors drop the anchor to hold the boat still, and haul it back in to sail on.' },
    { id: 'fire', d: 'medium', q: "I'm always hungry and must always be fed.\nThe finger I lick will soon turn red.", a: 'fire',
      alt: ['fires', 'flame', 'flames', 'campfire', 'bonfire'],
      hints: ['Water is my enemy.', 'You feed me logs and I crackle.'],
      why: "A fire needs fuel to keep going, and if it licks your finger you'll be burned." },
    { id: 'keyboard', d: 'medium', q: 'I have keys but no locks, space but no room, and you can enter but never go inside.', a: 'a keyboard',
      alt: ['keyboards', 'computer keyboard'],
      hints: ['Read the names of my keys: Space, Enter...', 'You type on me.'],
      why: 'A computer keyboard has keys, a space bar and an Enter key.' },
    { id: 'bald', d: 'medium', q: 'A man was out in the pouring rain with no umbrella and no hat, yet not a single hair on his head got wet. How?', a: 'he was bald',
      alt: ['bald', 'bald man', 'he had no hair', 'no hair', '+bald', '+no hair', '+hairless'],
      hints: ['Read it again: "not a single hair".', 'He had nothing up top to get wet.'],
      why: "He was bald. His head got wet, but there wasn't a single hair on it." },
    { id: 'cloud', d: 'medium', q: 'I fly without wings and cry without eyes. Wherever I go, the sky turns gray.', a: 'a cloud',
      alt: ['clouds', 'rain cloud', 'raincloud', 'storm cloud', 'thundercloud'],
      hints: ['My "tears" are raindrops.', "I'm made of tiny drops of water floating in the sky."],
      why: 'Clouds drift across the sky, rain falls from them, and they block out the sun.' },
    { id: 'envelope', d: 'medium', q: 'What starts with E, ends with E, and usually holds just one letter?', a: 'an envelope',
      alt: ['envelopes'],
      hints: ["The \"letter\" isn't from the alphabet.", 'You seal it and stick a stamp on it.'],
      why: 'An envelope begins and ends with E, and inside it is a letter you mail.' },
    { id: 'chick', d: 'medium', q: 'I live alone in a little house with no doors and no windows. When I want to go out, I have to break through the wall.', a: 'a chick',
      alt: ['chicks', 'baby chicken', 'chicken', 'baby bird', 'bird', 'duckling', 'hatchling', '+chick', '+chicken', '+bird'],
      hints: ['My house is white and oval.', "When I'm ready, I hatch."],
      why: 'A baby chick grows inside an eggshell and pecks its way out when it hatches.' },
    { id: 'generations', d: 'medium', q: 'Two fathers and two sons went fishing. Each caught one fish, yet only three fish were caught in all. How?', a: 'a grandfather, father and son',
      alt: ['grandfather father and son', 'three generations', 'three people', '+grandfather', '+grandpa', '+grandad', '+granddad', '+grandson', '+three generations', '+three people'],
      hints: ["There weren't four people in the boat.", 'One of the men is both a father and a son.'],
      why: 'A grandfather, his son and his grandson make two fathers and two sons, but only three people.' },
    { id: 'friday', d: 'medium', q: 'A cowboy rode into town on Friday. He stayed three nights, and rode out on Friday. How?', a: 'his horse is named Friday',
      alt: ['horse named friday', '+horse'],
      hints: ['The first "Friday" isn\'t a day of the week.', 'What did he ride into town on?'],
      why: 'He rode into town on a horse called Friday, and rode out on it too.' },
    { id: 'feathers', d: 'medium', q: 'Which is heavier: a pound of feathers or a pound of bricks?', a: 'neither',
      alt: ['they weigh the same', 'same', 'equal', 'both', 'neither one', 'same weight', '+same weight', '+weigh same', '+same amount', '+equal', '+both pound', '+both weigh'],
      hints: ['Read the question again, slowly.', 'A pound is a pound.'],
      why: 'They both weigh exactly one pound. The bricks just take up less room.' },
    { id: 'sunflower', d: 'medium', q: 'My first shines bright in the sky all day. My second smells sweet in a vase. Put us together, and I turn my face to follow my first.', a: 'a sunflower',
      alt: ['sunflowers', 'sun flower'],
      hints: ["It's a charade: two words joined into one.", 'Sun + ...?'],
      why: 'Sun + flower = sunflower, a flower that turns its face to follow the sun.' },
    { id: 'earring', d: 'medium', q: 'My first is what you hear with. My second you wear on your finger. Put us together, and I hang from my first.', a: 'an earring',
      alt: ['earrings', 'ear ring'],
      hints: ["It's a charade: two words joined into one.", 'Ear + ...?'],
      why: 'Ear + ring = earring, which hangs from your ear.' },
    { id: 'alphabet', d: 'medium', q: 'Which word has twenty-six letters but only three syllables?', a: 'the alphabet',
      alt: ['alphabet', 'alphabets', 'abc', 'abcs'],
      hints: ['The "letters" are A to Z.', 'You learn it with a song when you\'re small.'],
      why: 'Al-pha-bet has three syllables, and the alphabet has all twenty-six letters.' },
    { id: 'secret', d: 'medium', q: "If you have me, you want to share me. If you share me, you don't have me any more.", a: 'a secret',
      alt: ['secrets', '+secret'],
      hints: ['You might whisper me.', '"Can you keep a ___?"'],
      why: "Once you tell a secret, it isn't a secret any more." },
    { id: 'time', d: 'medium', q: 'I can be measured but never weighed. I fly without wings, I heal all wounds, and I always run out.', a: 'time',
      alt: ['+time'],
      hints: ['Clocks keep track of me.', '"___ flies when you\'re having fun."'],
      why: 'Time is measured in hours, it flies, it heals, and sooner or later it always runs out.' },
    { id: 'mary', d: 'medium', q: "Mary's father has five daughters: Nana, Nene, Nini and Nono. What is the fifth daughter's name?", a: 'Mary',
      alt: ['+mary'],
      hints: ["Don't follow the pattern.", 'Read the very first word again.'],
      why: 'The fifth daughter is Mary herself. The question tells you in its very first word.' },
    { id: 'rooster', d: 'medium', q: 'A rooster lays an egg right on the peak of a barn roof. Which way does the egg roll?', a: "roosters don't lay eggs",
      alt: ["it doesn't", "it won't", 'neither way', 'no way', 'nowhere', 'no egg', '+rooster not', '+no egg', '+male'],
      hints: ["Think about who's laying the egg.", 'Roosters are male chickens.'],
      why: "Only hens lay eggs. A rooster is a male chicken, so there's no egg to roll." },
    { id: 'mississippi', d: 'medium', q: "What has four eyes but can't see?", a: 'Mississippi',
      alt: ['mississippi river', '+mississippi'],
      hints: ['Count letters, not faces.', "It's a long American river."],
      why: 'M-i-s-s-i-s-s-i-p-p-i has four I\'s, but not one of them can see.' },

    // ── Hard ─────────────────────────────────────────────────────────────────
    { id: 'samson', d: 'hard', from: 'Samson\'s riddle, the Book of Judges', q: 'Out of the eater came something to eat;\nout of the strong came something sweet.', a: 'honey from a lion',
      alt: ['honey', 'honey in a lion', 'lion and honey', 'bees in a lion', 'honeycomb', '+honey'],
      hints: ['The "eater" and "the strong" are one fierce animal.', 'Bees made a hive inside a lion that Samson had killed.'],
      why: 'Samson killed a lion, and later found that bees had made honey inside its body: food from the eater, sweetness from the strong. He asked it as a riddle at his wedding feast.' },
    { id: 'vowels', d: 'hard', from: 'Jonathan Swift', q: "We are little airy creatures,\nAll of different voice and features;\nOne of us in glass is set,\nOne of us you'll find in jet,\nAnother you may see in tin,\nAnd the fourth a box within.\nIf the fifth you should pursue,\nIt can never fly from you.", a: 'the vowels',
      alt: ['vowels', 'vowel', 'a e i o u', 'aeiou', '+vowel'],
      hints: ['The "creatures" are letters.', 'Find the one letter that glass, jet, tin, box and you each have.'],
      why: 'Glass, jet, tin, box and you each hold one vowel: A, E, I, O and U. Letters are "airy" because, spoken, they\'re only breath.' },
    { id: 'year', d: 'hard', from: 'Cleobulus, ancient Greece', q: 'There is one father with twelve children. Each child has thirty daughters, white on one side and black on the other. They never die, and yet they all die.', a: 'a year',
      alt: ['year', 'one year', '+year'],
      hints: ['The twelve children are months.', 'The daughters are days, each with its night.'],
      why: 'The father is the year, his twelve children are the months, and each month\'s thirty daughters are its days: light on one side, dark night on the other. Every day passes, yet there are always more.' },
    { id: 'lice', d: 'hard', from: 'The legend of Homer, ancient Greece', q: "Fishermen on the shore told a famous poet: \"What we caught, we threw away. What we didn't catch, we're carrying with us.\" What were they talking about?", a: 'lice',
      alt: ['louse', 'head lice', 'fleas', 'flea', 'nits', '+lice', '+louse', '+flea', '+nit'],
      hints: ["They hadn't caught any fish.", 'Itchy little creatures that live in your hair.'],
      why: 'They had spent the day picking lice. The ones they caught they threw away, and the ones they missed were still in their hair. The legend says the poet Homer was stumped.' },
    { id: 'bookworm', d: 'hard', from: 'The Exeter Book, about 1000 AD', q: "A thief crept in and swallowed a poet's words, whole verses gulped down in the dark. Yet the guest was not one bit wiser for all the words it ate.", a: 'a bookworm',
      alt: ['bookworms', 'book worm', 'moth', 'worm', 'silverfish', 'book moth', '+bookworm'],
      hints: ["It's a tiny creature, not a person.", 'It chews holes through the pages of old books.'],
      why: 'A bookworm eats its way through old books, swallowing the words without learning a thing. In the Old English riddle it is a moth.' },
    { id: 'swan', d: 'hard', from: 'The Exeter Book, about 1000 AD', q: 'My robe is silent when I walk on land or stir the water. But when I lift into the sky, my wings sing as I sail over the people below.', a: 'a swan',
      alt: ['swans', 'mute swan', 'white swan'],
      hints: ["I'm a big white bird.", 'I glide across lakes with my long, curved neck.'],
      why: 'A swan is quiet on land and water, but its great wings make a singing, whooshing sound in flight.' },
    { id: 'stives', d: 'hard', from: 'Mother Goose', q: 'As I was going to St Ives,\nI met a man with seven wives.\nEach wife had seven sacks,\nEach sack had seven cats,\nEach cat had seven kits.\nKits, cats, sacks and wives:\nHow many were going to St Ives?', a: 'one',
      alt: ['just one', 'only one', 'just me', 'only me', 'me', 'the narrator', 'one person', '+just one', '+only one', '+narrator', '+speaker'],
      hints: ['Who in the rhyme is actually going to St Ives?', 'Everyone else was met coming the other way.'],
      why: 'Only the speaker was going to St Ives. The man, his wives, sacks, cats and kits were all met coming away from it.' },
    { id: 'elizabeth', d: 'hard', from: 'Mother Goose', q: "Elizabeth, Elspeth, Betsy and Bess,\nThey all went together to seek a bird's nest.\nThey found a bird's nest with five eggs in;\nThey all took one, and left four in.\nHow can that be?", a: "they're all the same girl",
      alt: ['same girl', 'same person', 'one girl', 'only one girl', '+same girl', '+same person', '+one girl', '+one person', '+same name', '+nickname'],
      hints: ['Count the girls again. Are there really four?', 'Betsy and Bess are short for something.'],
      why: 'Elspeth, Betsy and Bess are all nicknames for Elizabeth. There was only one girl, so she took one egg and left four.' },
    { id: 'walnut', d: 'hard', from: 'Mother Goose', q: 'As soft as silk, as white as milk,\nAs bitter as gall, a thick wall,\nAnd a green coat covers me all.', a: 'a walnut',
      alt: ['walnuts', 'nut', 'nuts'],
      hints: ['I grow on a tree.', 'Crack my hard shell to eat what\'s inside.'],
      why: 'A walnut has a soft white kernel, a bitter skin, a thick shell, and a green husk over it all.' },
    { id: 'sunshine', d: 'hard', from: 'Mother Goose', q: "Hick-a-more, Hack-a-more,\nOn the king's kitchen door;\nAll the king's horses\nAnd all the king's men\nCouldn't drive Hick-a-more, Hack-a-more\nOff the king's kitchen door.", a: 'sunshine',
      alt: ['sunlight', 'sun light', 'the sun', 'sun', 'sunbeam', 'light', 'daylight', '+sun'],
      hints: ["It isn't something you can grab or push.", 'It\'s warm and bright, and it pours in through doors and windows.'],
      why: 'Sunshine falling on the door can\'t be pushed away by any number of horses or men.' },
    { id: 'bed', d: 'hard', from: 'Old English riddle', q: "Formed long ago, yet made today,\nI'm used the most while others sleep.\nWhat few would like to give away,\nAnd none would ever wish to keep.", a: 'a bed',
      alt: ['beds', 'your bed'],
      hints: ['You "make" it every morning.', 'You lie in it at night.'],
      why: 'A bed was built long ago but is "made" every day, it\'s used while you sleep, nobody wants to give theirs up, and nobody wants to "keep to their bed" with an illness.' },
    { id: 'pencillead', d: 'hard', from: 'Old English riddle', q: "I'm taken from a mine and shut up in a wooden case, from which I'm never set free. And yet I'm used by almost everybody.", a: 'pencil lead',
      alt: ['lead', 'graphite', 'pencil', 'pencils', '+pencil', '+graphite'],
      hints: ['You hold my wooden case in your hand.', 'You sharpen the case to get at me.'],
      why: 'The "lead" in a pencil is graphite, dug from a mine and sealed inside wood for good.' },
    { id: 'coffin', d: 'hard', q: 'The one who makes it sells it. The one who buys it never uses it. The one who uses it never sees it.', a: 'a coffin',
      alt: ['coffins', 'casket'],
      hints: ["It's made of wood and has a lid.", "It's used at a funeral."],
      why: 'A coffin is bought by the family, and the person who lies in it never sees it.' },
    { id: 'eight', d: 'hard', q: 'Turn me on my side and I am everything. Cut me in half and I am nothing.', a: 'eight',
      alt: ['the number eight', 'number eight', 'figure eight'],
      hints: ["I'm a number.", 'Lying down, I look like the sign for infinity.'],
      why: 'On its side, 8 looks like ∞, infinity. Cut it across the middle and you get two zeros.' },
    { id: 'bookkeeper', d: 'hard', q: 'Which English word has three double letters in a row?', a: 'bookkeeper',
      alt: ['bookkeepers', 'bookkeeping', 'book keeper', 'book keeping'],
      hints: ["It's a job.", 'Someone who keeps the accounts.'],
      why: 'Bookkeeper: oo, kk, ee, one pair after another.' },
    { id: 'short', d: 'hard', q: 'What five-letter word becomes shorter when you add two letters to it?', a: 'short',
      alt: ['the word short'],
      hints: ['The answer is hiding in the question.', 'Add "er" to the end.'],
      why: 'Add "er" to "short" and you get "shorter".' },
    { id: 'queue', d: 'hard', q: 'What word sounds exactly the same even after you take away four of its five letters?', a: 'queue',
      alt: ['queues', 'q'],
      hints: ['You wait in one.', "It's the British word for a line of people."],
      why: 'Take "ueue" off "queue" and the Q that\'s left sounds just the same.' },
    { id: 'starting', d: 'hard', q: "I'm an eight-letter word. Take away one letter at a time and I'm still a word, all the way down to a single letter. What word am I?", a: 'starting',
      alt: [],
      hints: ['The single letter at the end is "I".', 'One way down: staring, string, sting, sing, sin, in, I.'],
      why: 'Starting, staring, string, sting, sing, sin, in, I.' },
    { id: 'seven', d: 'hard', q: "I'm an odd number. Take away one letter and I become even.", a: 'seven',
      alt: ['the number seven', 'number seven'],
      hints: ["I'm a single digit.", 'Take away my first letter.'],
      why: 'Take the S off "seven" and you\'re left with "even".' },
    { id: 'eleven', d: 'hard', q: 'How many letters are in "the alphabet"?', a: 'eleven',
      alt: ['11 letters', 'eleven letters'],
      hints: ['Read the question exactly as it\'s written.', 'Count the letters in the words "the alphabet".'],
      why: 'T-H-E A-L-P-H-A-B-E-T: eleven letters.' },
    { id: 'monopoly', d: 'hard', q: "A man pushes his car up to a hotel and tells the owner he's bankrupt. Why?", a: "he's playing Monopoly",
      alt: ['monopoly', 'playing monopoly', '+monopoly', '+board game'],
      hints: ["It's not a real car or a real hotel.", 'There\'s a top hat and a little dog on the board too.'],
      why: "He's playing Monopoly: his token is the car, and landing on a hotel he couldn't pay for bankrupted him." },
    { id: 'smiles', d: 'hard', q: 'What is the longest word in the dictionary?', a: 'smiles',
      alt: ['smile'],
      hints: ['Think of distance, not letters.', "There's a whole mile between its first and last letters."],
      why: 'S-mile-s: there\'s a mile between the first and last letters.' },
    { id: 'lettere', d: 'hard', q: "I'm the beginning of eternity, the end of time and space, the beginning of every end, and the end of every place.", a: 'the letter E',
      alt: ['e', 'letter e'],
      hints: ['Think about spelling, not meaning.', 'Look at the first letter of "eternity" and the last letter of "time".'],
      why: 'Eternity starts with E, and time, space and place all end with it.' },
    { id: 'nothing', d: 'hard', q: "It's greater than any treasure and worse than any villain. The poor have it, the rich need it, and if you eat it you'll starve.", a: 'nothing',
      alt: ['nothing at all', '+nothing'],
      hints: ['The answer is a word you use every day.', 'The poor have ___. If you eat ___, you\'ll starve.'],
      why: 'Nothing is greater than treasure, nothing is worse than a villain, the poor have nothing, the rich need nothing, and if you eat nothing you starve.' },
    { id: 'carpet', d: 'hard', q: 'My first is something you drive. My second is an animal you keep at home. Put us together, and I lie on the floor.', a: 'a carpet',
      alt: ['carpets'],
      hints: ["It's a charade: two short words make one longer one.", 'Car + ...?'],
      why: 'Car + pet = carpet.' },
    { id: 'tomorrow', d: 'hard', from: 'Old English riddle', q: 'What is it that no one has ever seen, which never was, but always is to be?', a: 'tomorrow',
      alt: ['the future', 'future'],
      hints: ["It's always coming, but it never arrives.", 'When it gets here, it has a different name: today.'],
      why: "Tomorrow is always on its way, but by the time it comes it's today." },
    { id: 'ice', d: 'hard', from: 'The Exeter Book, about 1000 AD', q: 'I saw a wonder on the waves: the water had turned to bone.', a: 'ice',
      alt: ['frozen water', 'sea ice', 'ice floe', 'pack ice', '+ice'],
      hints: ['It only happens in the cold.', "It's hard, white, and floats, but it's still water."],
      why: 'When the sea freezes, water becomes hard and white, like bone.' },
    { id: 'bark', d: 'hard', q: 'What goes all the way round the wood but never goes into the wood?', a: 'bark',
      alt: ['tree bark', 'bark of a tree', '+bark'],
      hints: ['"Wood" here means the wood of a tree.', "It's the rough skin of a tree trunk."],
      why: 'Bark wraps all the way round a tree\'s wood, but stays on the outside.' },
    { id: 'umbrella', d: 'hard', q: "What can go up a chimney down, but can't go down a chimney up?", a: 'an umbrella',
      alt: ['umbrellas', 'brolly', 'parasol'],
      hints: ['"Down" and "up" describe its shape, not its direction.', 'You open it in the rain.'],
      why: "A closed (down) umbrella slides up a chimney, but an open (up) one won't fit down it." },
    { id: 'corn', d: 'hard', q: 'You throw away the outside and cook the inside. Then you eat the outside and throw away the inside.', a: 'corn on the cob',
      alt: ['corn', 'corncob', 'corn cob', 'ear of corn', 'sweetcorn', 'sweet corn', 'maize', '+corn'],
      hints: ["It's a vegetable.", 'First you peel off the green husk. At the end, only the core is left.'],
      why: 'You strip off the husk, cook the ear, eat the kernels off the outside, and throw away the cob.' }
  ];

  // ── Normalising ─────────────────────────────────────────────────────────────
  var NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  var CONTRACT = { dont: 'do not', doesnt: 'does not', didnt: 'did not', cant: 'can not', cannot: 'can not', wont: 'will not',
    isnt: 'is not', arent: 'are not', wasnt: 'was not', werent: 'were not', couldnt: 'could not', wouldnt: 'would not',
    shouldnt: 'should not', hasnt: 'has not', havent: 'have not', its: 'it is', thats: 'that is', whats: 'what is',
    hes: 'he is', shes: 'she is', theyre: 'they are', youre: 'you are', im: 'i am', theres: 'there is' };
  var ARTICLE = { a: 1, an: 1, the: 1 };
  // lead-ins people type before the answer ("I think it's a towel")
  var LEAD = [['i', 'think'], ['i', 'guess'], ['my', 'answer', 'is'], ['answer', 'is'], ['it', 'is'], ['that', 'is'], ['is', 'it'],
    ['you', 'are'], ['they', 'are'], ['i', 'am'], ['maybe'], ['perhaps'], ['probably'], ['um'], ['uh'], ['er'], ['hmm'], ['oh'], ['ooh']];
  // words that carry no meaning on their own (for "Close!" overlap and the bag compare)
  var STOP = { and: 1, or: 1, of: 1, in: 1, on: 1, at: 1, to: 1, for: 1, with: 1, from: 1, it: 1, is: 1, are: 1, was: 1, be: 1,
    he: 1, she: 1, they: 1, his: 1, her: 1, their: 1, your: 1, my: 1, you: 1, me: 1, i: 1, we: 1, our: 1, all: 1, just: 1, only: 1,
    do: 1, does: 1, did: 1, can: 1, will: 1, not: 1, no: 1, that: 1, this: 1, what: 1, so: 1, very: 1, there: 1, has: 1, had: 1, have: 1 };
  var NEG = { not: 1, no: 1, never: 1, neither: 1, nor: 1 };

  function stem(w) {
    if (w.length <= 3) return w;
    if (/s$/.test(w) && !/(ss|us|is)$/.test(w)) {
      w = /(sh|ch|x|z|ss)es$/.test(w) ? w.slice(0, -2) : w.slice(0, -1);
    }
    if (w.length > 3) w = w.replace(/(ie|y)$/, 'i');   // berries/berry, cookies/cookie
    return w;
  }
  // -> {raw:[words as typed, cleaned], toks:[stemmed words]}
  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    s = s.replace(/&/g, ' and ').replace(/['‘’ʼ`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    var raw = [];
    s.split(' ').forEach(function (w) {
      if (!w) return;
      if (/^\d+$/.test(w) && +w <= 20) w = NUM[+w];
      (CONTRACT[w] || w).split(' ').forEach(function (x) { raw.push(x); });
    });
    raw = raw.filter(function (w) { return !ARTICLE[w]; });
    var again = true;
    while (again && raw.length > 1) {
      again = false;
      for (var i = 0; i < LEAD.length; i++) {
        var L = LEAD[i];
        if (raw.length > L.length && L.every(function (x, k) { return raw[k] === x; })) { raw = raw.slice(L.length); again = true; break; }
      }
    }
    return { raw: raw, toks: raw.map(stem) };
  }

  // Damerau-Levenshtein (optimal string alignment): insert, delete, change, or swap two neighbours = 1 edit
  function dist(a, b, max) {
    if (a === b) return 0;
    var n = a.length, m = b.length;
    if (max != null && Math.abs(n - m) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= n; i++) { d[i] = [i]; }
    for (j = 0; j <= m; j++) d[0][j] = j;
    for (i = 1; i <= n; i++) {
      var rowMin = Infinity;
      for (j = 1; j <= m; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
        d[i][j] = v; if (v < rowMin) rowMin = v;
      }
      if (max != null && rowMin > max) return max + 1;
    }
    return d[n][m];
  }
  // typo allowance for an answer word of length L
  function allow(L) { return L <= 4 ? 0 : L <= 7 ? 1 : L <= 11 ? 2 : 3; }

  // The dictionary: words-en.js (window.Words) when the page loaded it, or one handed in with setDict
  var dict = null, dictTried = false;
  function getDict() {
    if (dict || dictTried) return dict;
    if (!root.Words || !root.Words.common) return null;   // not loaded yet: try again next time
    dictTried = true;
    try { if (root.Words && root.Words.common) dict = new Set(root.Words.common().concat(root.Words.extra ? root.Words.extra() : [])); } catch (e) {}
    return dict;
  }
  function setDict(d) { dict = d; dictTried = true; }
  function isWord(w) {
    var D = getDict(); if (!D) return false;
    return D.has(w) || (/s$/.test(w) && D.has(w.slice(0, -1))) || (/es$/.test(w) && D.has(w.slice(0, -2)));
  }

  // One guessed word against one answer word (stemmed and as typed): 'ok', 'near' or false.
  // near: a real word inside the typo allowance (handle for candle), or a non-word one edit past it (cta for cat)
  function wordVs(gs, gr, ts, tr) {
    if (gs === ts || gr === tr) return 'ok';
    // each pair is judged by its own length: the stems (coins/coin vs corn) and the words as typed (smlies/smiles)
    var aS = allow(ts.length), aR = allow(tr.length), dS = dist(gs, ts, aS + 1), dR = dist(gr, tr, aR + 1);
    var D = getDict(), real = D ? isWord(gr) : false;
    if (dS <= aS || dR <= aR) return (D ? real : gr[0] !== tr[0]) ? 'near' : 'ok';
    return (dS === aS + 1 || dR === aR + 1) && ts.length >= 3 && !real ? 'near' : false;
  }

  // A prepared answer form: {toks, raw, join, set} or {pat:[toks]}
  function prep(s) {
    var p = String(s);
    if (p.charAt(0) === '+') { var m = norm(p.slice(1)); return { pat: m.toks, praw: m.raw }; }
    var n = norm(p);
    return { toks: n.toks, raw: n.raw, join: n.toks.join(''), bag: n.toks.filter(function (w) { return w !== 'and'; }).slice().sort().join(' ') };
  }
  function formsOf(r) {
    if (!r._forms) r._forms = [prep(r.a)].concat((r.alt || []).map(prep));
    return r._forms;
  }

  // Check a guess. -> {ok, close, how:'exact'|'typo'|'words'|''}
  function check(r, guess) {
    var g = norm(guess), gt = g.toks, gj = gt.join('');
    var res = { ok: false, close: false, how: '' };
    if (!gt.length) return res;
    var gbag = gt.filter(function (w) { return w !== 'and'; }).slice().sort().join(' ');
    var neg = gt.some(function (w) { return NEG[w]; });
    var forms = formsOf(r), near = false, i, k;
    // 1. exact (words in any order, spaces don't matter)
    for (i = 0; i < forms.length; i++) {
      var f = forms[i]; if (f.pat) continue;
      if (f.join === gj || f.bag === gbag) { res.ok = true; res.how = 'exact'; return res; }
    }
    // 2. word sets
    for (i = 0; i < forms.length; i++) {
      var P = forms[i].pat; if (!P) continue;
      if (neg && !P.some(function (w) { return NEG[w]; })) { if (P.every(function (w) { return gt.indexOf(w) >= 0; })) near = true; continue; }
      var all = true, pNear = false;
      for (k = 0; k < P.length; k++) {
        var best = false;
        for (var j = 0; j < gt.length && best !== 'ok'; j++) { var v = wordVs(gt[j], g.raw[j], P[k], forms[i].praw[k]); if (v === 'ok' || (v && !best)) best = v; }
        if (best !== 'ok') { all = false; if (best) pNear = true; }
      }
      if (all) { res.ok = true; res.how = 'words'; return res; }
      if (pNear) near = true;
    }
    // 3. typos
    for (i = 0; i < forms.length; i++) {
      var F = forms[i]; if (F.pat) continue;
      if (F.toks.length === gt.length) {
        var allOk = true, anyNear = false, bad = 0;
        for (k = 0; k < gt.length; k++) {
          var w = wordVs(gt[k], g.raw[k], F.toks[k], F.raw[k]);
          if (w !== 'ok') { allOk = false; if (w) anyNear = true; else bad++; }
        }
        if (allOk) { res.ok = true; res.how = 'typo'; return res; }
        if (anyNear && !bad) near = true;
      } else {
        // run together or split up: compare the whole thing
        var a = allow(F.join.length), d = dist(gj, F.join, a + 1);
        if (d <= a) {
          var D = getDict(), fine = D ? g.raw.every(function (x) { return x.length < 3 || !isWord(x) || F.join.indexOf(stem(x)) >= 0; }) : gj[0] === F.join[0];
          if (fine) { res.ok = true; res.how = 'typo'; return res; }
          near = true;
        } else if (d === a + 1 && F.join.length >= 4) near = true;
      }
    }
    // 4. close: a shared meaningful word, or one inside the other
    if (!near) {
      var mine = gt.filter(function (w) { return w.length >= 3 && !STOP[w]; });
      for (i = 0; i < forms.length && !near; i++) {
        var T = forms[i].pat || forms[i].toks;
        if (mine.some(function (w) { return T.indexOf(w) >= 0; })) near = true;
        var J = T.join('');
        // one inside the other: ice / iceberg, incorrect / incorrectly (but not fir / fire)
        var lo = Math.min(gj.length, J.length), hi = Math.max(gj.length, J.length);
        if ((lo >= 4 || (lo === 3 && hi >= 6)) && (J.indexOf(gj) >= 0 || gj.indexOf(J) >= 0)) near = true;
      }
    }
    res.close = near;
    return res;
  }

  // ── The daily riddle (RiddleDaily.pick(all, day)) ──────────────────────────
  // all = RIDDLES.concat(RIDDLES_MORE): these 100, then the packs in the order the page loads them.
  // day = days since 1 Jan 2024 (local) + 1, the numbering daily.js uses.
  //   Up to day 1017 (13 Oct 2026, the day the daily started, with these 100 riddles) the daily was a shuffle of
  //   the first 100: all[OLD[(day - 1) % 100]]. Those days stay exactly as they were.
  //   From day 1018 the dailies walk a frozen shuffled order of the first FROZEN riddles, so none repeats for
  //   FROZEN days (1,133: to late 2029). Riddles already used as a daily (days LAUNCH..CUT) go to the back of it.
  // FROZEN and the order never change, so a day's riddle never changes. To keep it that way:
  //   - add new riddles only at the END of `all` (a new pack file loaded after the others, or the end of the last
  //     pack), and never delete, move or reorder the first FROZEN riddles (fix their wording in place instead);
  //   - don't raise FROZEN. New riddles show up in rounds straight away; to bring them into the daily, start a
  //     new schedule from a future day (as CUT does here), leaving every earlier day alone.
  // scripts/riddles-check.js pins the frozen riddles' ids and today's daily.
  var CUT = 1017, LAUNCH = 1017, FROZEN = 1133, OLD_N = 100;
  function shuffled(n, seed) {
    var a = [], s = seed, i;
    for (i = 0; i < n; i++) a.push(i);
    function rnd() { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    for (i = n - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  var OLD = null, NEW = null, NEW_N = 0;
  function oldIndex(day) { if (!OLD) OLD = shuffled(OLD_N, 20241013); return OLD[(day - 1) % OLD_N]; }
  function newOrder(n) {
    if (NEW && NEW_N === n) return NEW;
    var a = shuffled(n, 20261014), used = {}, d;
    for (d = LAUNCH; d <= CUT; d++) used[oldIndex(d)] = d;   // the last day each riddle was the daily
    // never-used riddles first, then used ones, longest ago first
    NEW = a.filter(function (k) { return !used[k]; }).concat(a.filter(function (k) { return used[k]; }).sort(function (x, y) { return used[x] - used[y]; }));
    NEW_N = n;
    return NEW;
  }
  // From day V2 (Tue 20 Oct 2026) the daily is only real riddles, and gets harder through the week like the
  // crossword: Monday and Tuesday a quick one, Wednesday to Friday one that needs thought, the weekend a hard one.
  // Each level walks its own frozen list in data/riddles-sort.js (RIDDLE_SORT.daily.t1/t2/t3), so a day's riddle
  // never changes; days before V2 stay exactly as they were.
  var V2 = 1024, V2_TIER = [1, 1, 2, 2, 2, 3, 3];   // Mon..Sun (day 1 was Monday 1 Jan 2024)
  var V2_POS = null;
  function v2Index(all, day) {
    var D = root.RIDDLE_SORT && root.RIDDLE_SORT.daily; if (!D) return -1;
    var t = V2_TIER[(day - 1) % 7], list = D['t' + t], n = 0, d;
    for (d = V2; d < day; d++) if (V2_TIER[(d - 1) % 7] === t) n++;   // that level's earlier days since V2
    var id = list[n % list.length];
    if (!V2_POS || V2_POS.n !== all.length) { V2_POS = { n: all.length, at: {} }; all.forEach(function (r, i) { V2_POS.at[r.id] = i; }); }
    return V2_POS.at[id] != null ? V2_POS.at[id] : -1;
  }
  // index into all of the daily riddle for day
  function dailyIndex(all, day) {
    if (day >= V2) { var v = v2Index(all, day); if (v >= 0) return v; }
    if (day <= CUT) return oldIndex(day);
    var o = newOrder(Math.min(FROZEN, all.length));
    return o[(day - CUT - 1) % o.length];
  }

  root.RIDDLES = R;
  root.RiddleCheck = { check: check, norm: norm, dist: dist, allow: allow, stem: stem, setDict: setDict, isWord: isWord };
  root.RiddleDaily = { pick: function (all, day) { return all[dailyIndex(all, day)]; }, index: dailyIndex, tier: function (day) { return day >= V2 ? V2_TIER[(day - 1) % 7] : 0; }, CUT: CUT, LAUNCH: LAUNCH, FROZEN: FROZEN, V2: V2 };
})(typeof window !== 'undefined' ? window : this);
