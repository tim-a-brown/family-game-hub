export const GAME_CATEGORIES = [
  'animals',
  'sports',
  'gross out',
  'school',
  'magical',
  'silly fun',
  'superheroes',
  'jobs',
  'food fun',
  'vacations',
  'cool technology',
  'kids tv and movies'
] as const;

export type GameCategory = typeof GAME_CATEGORIES[number];

export const WORD_LISTS: Record<GameCategory, string[]> = {
  'animals': [
    'elephant', 'giraffe', 'penguin', 'kangaroo', 'butterfly', 'dolphin', 'tiger', 'panda',
    'monkey', 'zebra', 'lion', 'bear', 'rabbit', 'mouse', 'horse', 'dog', 'cat', 'bird',
    'fish', 'turtle', 'snake', 'lizard', 'frog', 'spider', 'ant', 'bee', 'cow', 'pig'
  ],
  'sports': [
    'football', 'basketball', 'baseball', 'soccer', 'tennis', 'swimming', 'hockey', 'golf',
    'volleyball', 'wrestling', 'boxing', 'cycling', 'running', 'jumping', 'skiing', 'skating',
    'surfing', 'bowling', 'archery', 'diving', 'karate', 'yoga', 'dancing', 'climbing'
  ],
  'gross out': [
    'slime', 'booger', 'mud', 'worm', 'slug', 'spider', 'yucky', 'stinky', 'slimy', 'gooey',
    'messy', 'dirty', 'smelly', 'gross', 'icky', 'nasty', 'grimy', 'moldy', 'rotten', 'soggy'
  ],
  'school': [
    'teacher', 'student', 'classroom', 'homework', 'pencil', 'eraser', 'notebook', 'backpack',
    'lunch', 'recess', 'library', 'science', 'math', 'reading', 'writing', 'spelling', 'test',
    'grade', 'friend', 'playground', 'cafeteria', 'principal', 'desk', 'chair', 'book'
  ],
  'magical': [
    'wizard', 'fairy', 'magic', 'wand', 'spell', 'potion', 'castle', 'dragon', 'unicorn',
    'princess', 'prince', 'knight', 'treasure', 'crystal', 'enchanted', 'mystical', 'fantasy',
    'sorcerer', 'witch', 'cauldron', 'phoenix', 'pegasus', 'mermaid', 'genie', 'rainbow'
  ],
  'silly fun': [
    'giggle', 'laugh', 'funny', 'joke', 'silly', 'goofy', 'crazy', 'wacky', 'hilarious',
    'amusing', 'tickle', 'smile', 'happy', 'cheerful', 'playful', 'bouncy', 'wiggly',
    'jiggly', 'bubbly', 'peppy', 'zippy', 'snappy', 'perky', 'quirky', 'zany'
  ],
  'superheroes': [
    'hero', 'power', 'cape', 'mask', 'strength', 'flying', 'rescue', 'brave', 'courage',
    'justice', 'villain', 'battle', 'protect', 'save', 'mission', 'secret', 'identity',
    'costume', 'super', 'amazing', 'incredible', 'mighty', 'ultimate', 'fantastic'
  ],
  'jobs': [
    'doctor', 'teacher', 'firefighter', 'police', 'nurse', 'pilot', 'chef', 'farmer',
    'builder', 'artist', 'singer', 'dancer', 'writer', 'scientist', 'engineer', 'mechanic',
    'dentist', 'veterinarian', 'librarian', 'mailman', 'baker', 'musician', 'actor', 'coach'
  ],
  'food fun': [
    'pizza', 'hamburger', 'hotdog', 'sandwich', 'cookie', 'cake', 'candy', 'chocolate',
    'icecream', 'apple', 'banana', 'orange', 'grape', 'strawberry', 'watermelon', 'cheese',
    'bread', 'milk', 'juice', 'soda', 'popcorn', 'pretzel', 'donut', 'pancake', 'waffle'
  ],
  'vacations': [
    'beach', 'ocean', 'mountain', 'camping', 'hotel', 'airplane', 'suitcase', 'camera',
    'sunglasses', 'vacation', 'holiday', 'travel', 'adventure', 'explore', 'discover',
    'island', 'forest', 'lake', 'river', 'park', 'zoo', 'museum', 'castle', 'monument'
  ],
  'cool technology': [
    'computer', 'robot', 'rocket', 'spaceship', 'satellite', 'laser', 'hologram', 'gadget',
    'invention', 'machine', 'device', 'future', 'digital', 'virtual', 'cyber', 'nano',
    'solar', 'electric', 'wireless', 'remote', 'smartphone', 'tablet', 'video', 'gaming'
  ],
  'kids tv and movies': [
    'cartoon', 'animation', 'movie', 'character', 'adventure', 'comedy', 'family', 'fun',
    'story', 'hero', 'villain', 'friendship', 'team', 'quest', 'journey', 'magical',
    'fantasy', 'action', 'mystery', 'detective', 'treasure', 'discovery', 'rescue', 'brave'
  ]
};

export const WOULD_YOU_RATHER_SCENARIOS: Record<GameCategory, string[]> = {
  'animals': [
    'Would you rather be able to talk to animals or be invisible to them?',
    'Would you rather have a pet dragon or a pet unicorn?',
    'Would you rather swim with dolphins or fly with eagles?',
    'Would you rather be as strong as an elephant or as fast as a cheetah?',
    'Would you rather have a house full of puppies or kittens?'
  ],
  'sports': [
    'Would you rather be the best basketball player or the best soccer player?',
    'Would you rather win an Olympic gold medal or be on your favorite sports team?',
    'Would you rather be able to throw a football 100 yards or hit a baseball 500 feet?',
    'Would you rather be super fast or super strong in sports?',
    'Would you rather play your favorite sport year-round or try a new sport every month?'
  ],
  'gross out': [
    'Would you rather step in a puddle of slime or find a worm in your apple?',
    'Would you rather have to clean up after a messy pet or a messy little sibling?',
    'Would you rather eat food that looks gross but tastes great or looks great but tastes gross?',
    'Would you rather have to pick up trash for a day or clean dirty bathrooms for an hour?',
    'Would you rather have sticky hands for a week or smelly feet for a month?'
  ],
  'school': [
    'Would you rather have no homework for a year or no tests for a year?',
    'Would you rather be the smartest kid in school or the most popular?',
    'Would you rather have a longer summer vacation or longer winter break?',
    'Would you rather always sit in the front row or always sit in the back row?',
    'Would you rather have school start later or end earlier?'
  ],
  'magical': [
    'Would you rather have a magic wand or a magic carpet?',
    'Would you rather be able to cast spells or brew potions?',
    'Would you rather live in a castle or a treehouse?',
    'Would you rather have a fairy godmother or a wise wizard mentor?',
    'Would you rather be able to turn invisible or read minds?'
  ],
  'silly fun': [
    'Would you rather have a silly walk or a silly laugh that you can\'t control?',
    'Would you rather wear clown shoes everywhere or a clown nose everywhere?',
    'Would you rather only be able to speak in rhymes or only be able to sing what you say?',
    'Would you rather have rainbow colored hair or glitter skin?',
    'Would you rather laugh like a hyena or snort when you laugh?'
  ],
  'superheroes': [
    'Would you rather be able to fly or be super strong?',
    'Would you rather have X-ray vision or super hearing?',
    'Would you rather wear a cape or a mask?',
    'Would you rather be able to become invisible or read minds?',
    'Would you rather save people from burning buildings or stop bank robbers?'
  ],
  'jobs': [
    'Would you rather be a doctor who helps people or a chef who makes delicious food?',
    'Would you rather be a teacher or a firefighter?',
    'Would you rather be famous for being an artist or a scientist?',
    'Would you rather work with animals all day or work with computers all day?',
    'Would you rather be a pilot who travels the world or an astronaut who goes to space?'
  ],
  'food fun': [
    'Would you rather eat pizza for every meal or ice cream for every meal?',
    'Would you rather give up candy for a year or give up pizza for a year?',
    'Would you rather eat food that\'s too hot or too cold?',
    'Would you rather only eat sweet foods or only eat salty foods?',
    'Would you rather cook your own meals or never have to cook again?'
  ],
  'vacations': [
    'Would you rather go to the beach or go camping in the mountains?',
    'Would you rather visit a theme park or a water park?',
    'Would you rather travel by plane or by train?',
    'Would you rather stay in a fancy hotel or camp under the stars?',
    'Would you rather visit a foreign country or explore your own country?'
  ],
  'cool technology': [
    'Would you rather have a robot that does your chores or a robot that does your homework?',
    'Would you rather live in the future with flying cars or the past with dinosaurs?',
    'Would you rather have a smartphone that never breaks or a computer that never gets slow?',
    'Would you rather be able to teleport anywhere or time travel?',
    'Would you rather invent something amazing or discover something incredible?'
  ],
  'kids tv and movies': [
    'Would you rather be in your favorite animated movie or your favorite live-action movie?',
    'Would you rather meet your favorite cartoon character or your favorite movie hero?',
    'Would you rather have superpowers like your favorite superhero or be as smart as your favorite detective?',
    'Would you rather live in the world of your favorite fantasy movie or your favorite sci-fi movie?',
    'Would you rather be the main character in a comedy or an adventure movie?'
  ]
};

export const MAD_LIBS_TEMPLATES = [
  {
    title: "The Amazing Adventure",
    template: "Once upon a time, there was a {adjective1} {noun1} who lived in a {adjective2} {place}. Every morning, the {noun1} would {verb1} to the {place2} and {verb2} with the {adjective3} {noun2}. One day, something {adjective4} happened! A {noun3} appeared and said '{exclamation}! I need your help to {verb3} the {adjective5} {noun4}!' So they {verb4} together and saved the day!",
    prompts: ["adjective1", "noun1", "adjective2", "place", "place2", "verb1", "verb2", "adjective3", "noun2", "adjective4", "noun3", "exclamation", "verb3", "adjective5", "noun4", "verb4"]
  },
  {
    title: "The Silly School Day",
    template: "Today at school was absolutely {adjective1}! In math class, our teacher Mr./Mrs. {name} asked us to {verb1} all the {noun1}. Then in science, we learned about {adjective2} {noun2} and how they {verb2}. At lunch, I ate a {adjective3} {food} sandwich and {number} {noun3}. During recess, we played {game} and I {verb3} so {adverb} that everyone said '{exclamation}!'",
    prompts: ["adjective1", "name", "verb1", "noun1", "adjective2", "noun2", "verb2", "adjective3", "food", "number", "noun3", "game", "verb3", "adverb", "exclamation"]
  },
  {
    title: "The Magic Pet",
    template: "I have the most {adjective1} pet in the whole {place}! My pet {animal} can {verb1} and {verb2} better than any other {animal} I know. Every day, we {verb3} to the {place2} and {verb4} for {number} hours. My pet's favorite food is {adjective2} {food} and its favorite toy is a {adjective3} {noun}. The most amazing thing is that my pet can {verb5} and even {verb6}! Everyone who meets my pet says '{exclamation}!'",
    prompts: ["adjective1", "place", "animal", "verb1", "verb2", "verb3", "place2", "verb4", "number", "adjective2", "food", "adjective3", "noun", "verb5", "verb6", "exclamation"]
  }
];

export const HANGMAN_PUZZLES = [
  // 1 word puzzles (8-21 letters)
  "BIRTHDAY", "SANDWICH", "ELEPHANT", "COMPUTER", "VACATION", "TREASURE", "BUTTERFLY", "CHOCOLATE",
  "ADVENTURE", "DINOSAUR", "FOOTBALL", "HOMEWORK", "KEYBOARD", "LEMONADE", "MUSHROOM", "NOTEBOOK",
  "UMBRELLA", "WATERFALL", "AIRPLANE", "BASEBALL", "CAMPFIRE", "DOORBELL", "EARPHONE", "FIREFLY",
  "GOLDFISH", "HAMBURGER", "ICECREAM", "JELLYBEAN", "KANGAROO", "LADYBUG", "MAGAZINE", "NECKLACE",
  "ORANGES", "POPCORN", "QUESTION", "RAINBOW", "STARFISH", "TOOTHBRUSH", "UNIVERSE", "VOLLEYBALL",
  "WORKSHOP", "XYLOPHONE", "YESTERDAY", "ZEPPELIN", "BACKPACK", "CUCUMBER", "DRAGONFLY", "ENVELOPE",
  "FLAMINGO", "GIRAFFE", "HEDGEHOG", "INTERNET", "JIGSAW", "KITCHEN", "LIBRARY", "MIDNIGHT",
  "NOODLES", "OCTOPUS", "PENGUIN", "QUICKSAND", "RACCOON", "SNOWMAN", "TORNADO", "UNDERDOG",
  "VOLCANO", "WINDOW", "YOGURT", "ZIPPER", "ALLIGATOR", "BUMBLEBEE", "CATERPILLAR", "DETECTIVE",
  "EMERALD", "FREEDOM", "GARBAGE", "HUMMINGBIRD", "INTERNET", "JACKPOT", "KALEIDOSCOPE", "LIZARD",
  "MOUNTAIN", "NUGGETS", "ORCHESTRA", "PASSPORT", "QUICKNESS", "RECTANGLE", "SUBMARINE", "TELESCOPE",
  "UNDERGROUND", "VEGETABLE", "WEEKEND", "EXCELLENT", "YEARBOOK", "ZOOKEEPER", "ACROBAT", "BROTHERS",
  "CARNIVAL", "DISCOVERY", "ELEPHANT", "FANTASTIC", "GYMNASIUM", "HAPPINESS", "INVISIBLE", "JELLYFISH",
  "KNOCKOUT", "LAUGHTER", "MARMALADE", "NAVIGATE", "OPERATION", "PARACHUTE", "QUOTATION", "RHYMING",
  "SANDWICH", "TOURNAMENT", "ULTIMATE", "VACATION", "WONDERFUL", "EXCITING", "YESTERDAY", "ZEPPELIN",
  
  // 2 word puzzles (8-21 letters total)
  "ICE CREAM", "HOT DOG", "SNOW DAY", "BEST PAL", "CAKE POP", "TOY BOX", "CAR WASH", "PET SHOP",
  "GAME TIME", "BIKE RIDE", "FIRE TRUCK", "SPACE SHIP", "BOOK CLUB", "FISH TANK", "TREE HOUSE",
  "MOON WALK", "SUN SHINE", "RAIN COAT", "SAND BOX", "BIRD NEST", "POOL PARTY", "CAMP FIRE",
  "FAST FOOD", "TEAM WORK", "COOL DOWN", "WARM UP", "TURN LEFT", "GO RIGHT", "STAY HOME",
  "GET READY", "HAVE FUN", "PLAY BALL", "RIDE BIKE", "LOVE LIFE", "MAKE TIME", "TAKE CARE",
  "MAIL BOX", "BUS STOP", "BANK ROLL", "CASH FLOW", "WORK HARD", "STUDY TIME", "DANCE FLOOR",
  "SING SONG", "DRAW WELL", "WRITE GOOD", "READ BOOK", "WATCH TV", "PHONE CALL", "TEXT SEND",
  "EMAIL SEND", "SURF WEB", "CLICK HERE", "SAVE FILE", "OPEN DOOR", "CLOSE LID", "TURN KEY",
  "LOCK UP", "WAKE UP", "GET UP", "SIT DOWN", "STAND UP", "WALK FAST", "RUN QUICK", "JUMP HIGH",
  "SWIM DEEP", "CLIMB TREE", "FLY KITE", "THROW BALL", "CATCH FISH", "BUILD TOY", "FIX BIKE",
  "CLEAN ROOM", "WASH CAR", "FEED PET", "WATER TREE", "PLANT SEED", "PICK FRUIT", "BAKE CAKE",
  "COOK MEAL", "MAKE SOUP", "POUR MILK", "DRINK TEA", "EAT FOOD", "TASTE GOOD", "SMELL NICE",
  "LOOK GOOD", "FEEL WELL", "SOUND FUN", "TOUCH SOFT", "THINK HARD", "DREAM BIG", "HOPE HIGH",
  "WISH WELL", "LOVE MUCH", "CARE DEEP", "HELP OUT", "GIVE BACK", "TAKE TURN", "SHARE TOY",
  "PLAY NICE", "BE KIND", "SAY HELLO", "WAVE BYE", "SMILE BIG", "LAUGH LOUD", "CRY SOFT",
  "SLEEP WELL", "REST GOOD", "RELAX NOW", "CALM DOWN", "SLOW UP", "SPEED UP", "MOVE FAST",
  
  // 3 word puzzles (8-21 letters total)
  "I LOVE YOU", "BE MY PAL", "GO TO BED", "GET UP NOW", "EAT YOUR FOOD", "WASH YOUR FACE",
  "BRUSH YOUR TEETH", "COMB YOUR HAIR", "PUT ON SHOES", "TIE YOUR LACES", "PACK YOUR BAG",
  "DO YOUR BEST", "TRY YOUR BEST", "GIVE YOUR ALL", "HAVE A BALL", "PLAY ALL DAY", "REST ALL NIGHT",
  "SLEEP ALL NIGHT", "DREAM ALL NIGHT", "WAKE UP EARLY", "GET UP LATE", "EAT ALL UP", "DRINK ALL UP",
  "USE IT ALL", "SAVE IT ALL", "KEEP IT ALL", "GIVE IT ALL", "TAKE IT ALL", "MAKE IT ALL",
  "FIX IT ALL", "DO IT ALL", "SAY IT ALL", "HEAR IT ALL", "SEE IT ALL", "FEEL IT ALL",
  "KNOW IT ALL", "LOVE IT ALL", "LIKE IT ALL", "WANT IT ALL", "NEED IT ALL", "GET IT ALL",
  "HAVE IT ALL", "BE THE BEST", "DO THE BEST", "TRY THE BEST", "GIVE THE BEST", "TAKE THE BEST",
  "MAKE THE BEST", "USE THE BEST", "KEEP THE BEST", "SAVE THE BEST", "FIND THE BEST", "PICK THE BEST",
  "CHOOSE THE BEST", "LOVE THE BEST", "LIKE THE BEST", "WANT THE BEST", "NEED THE BEST", "GET THE BEST",
  "HAVE THE BEST", "BE VERY GOOD", "DO VERY WELL", "TRY VERY HARD", "WORK VERY HARD", "PLAY VERY WELL",
  "SLEEP VERY WELL", "EAT VERY WELL", "FEEL VERY GOOD", "LOOK VERY GOOD", "SOUND VERY GOOD", "TASTE VERY GOOD",
  "SMELL VERY GOOD", "THINK VERY HARD", "DREAM VERY BIG", "HOPE VERY HIGH", "WISH VERY WELL", "LOVE VERY MUCH",
  "CARE VERY MUCH", "HELP VERY MUCH", "GIVE VERY MUCH", "TAKE VERY MUCH", "SHARE VERY MUCH", "PLAY VERY NICE",
  "BE VERY KIND", "SAY VERY NICE", "WAVE VERY HIGH", "SMILE VERY BIG", "LAUGH VERY LOUD", "CRY VERY SOFT"
];
