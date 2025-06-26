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
    'fish', 'turtle', 'snake', 'lizard', 'frog', 'spider', 'ant', 'bee', 'cow', 'pig',
    'whale', 'shark', 'octopus', 'starfish', 'seahorse', 'jellyfish', 'crab', 'lobster',
    'shrimp', 'salmon', 'trout', 'bass', 'tuna', 'eagle', 'hawk', 'owl', 'robin', 'sparrow',
    'cardinal', 'bluejay', 'crow', 'raven', 'dove', 'swan', 'duck', 'goose', 'turkey', 'chicken',
    'rooster', 'peacock', 'flamingo', 'pelican', 'heron', 'stork', 'ostrich', 'emu', 'kiwi',
    'parrot', 'toucan', 'macaw', 'cockatoo', 'canary', 'finch', 'woodpecker', 'hummingbird',
    'vulture', 'condor', 'falcon', 'kestrel', 'buzzard', 'albatross', 'seagull', 'puffin',
    'cheetah', 'leopard', 'jaguar', 'lynx', 'bobcat', 'cougar', 'panther', 'ocelot',
    'wolf', 'fox', 'coyote', 'jackal', 'hyena', 'raccoon', 'skunk', 'badger', 'otter',
    'beaver', 'squirrel', 'chipmunk', 'groundhog', 'mole', 'hedgehog', 'porcupine', 'armadillo',
    'sloth', 'anteater', 'aardvark', 'platypus', 'echidna', 'koala', 'wombat', 'wallaby',
    'opossum', 'ferret', 'mink', 'weasel', 'stoat', 'ermine', 'marten', 'wolverine',
    'deer', 'elk', 'moose', 'caribou', 'reindeer', 'antelope', 'gazelle', 'impala',
    'buffalo', 'bison', 'yak', 'oxen', 'goat', 'sheep', 'lamb', 'llama', 'alpaca',
    'camel', 'dromedary', 'hippo', 'rhino', 'tapir', 'manatee', 'dugong', 'narwhal',
    'walrus', 'seal', 'sealion', 'orca', 'beluga', 'sperm', 'blue', 'gray', 'humpback',
    'python', 'cobra', 'viper', 'rattler', 'boa', 'anaconda', 'mamba', 'adder',
    'gecko', 'iguana', 'chameleon', 'monitor', 'skink', 'salamander', 'newt', 'tadpole',
    'toad', 'bullfrog', 'treefrog', 'poison', 'dart', 'axolotl', 'crocodile', 'alligator',
    'turtle', 'tortoise', 'terrapin', 'snapper', 'slider', 'box', 'sea', 'leatherback',
    'scorpion', 'tarantula', 'widow', 'recluse', 'centipede', 'millipede', 'tick', 'mite',
    'mosquito', 'fly', 'gnat', 'midge', 'wasp', 'hornet', 'yellowjacket', 'bumblebee',
    'honeybee', 'carpenter', 'leafcutter', 'mason', 'sweat', 'mining', 'cuckoo', 'orchid',
    'butterfly', 'monarch', 'swallowtail', 'admiral', 'painted', 'lady', 'fritillary', 'copper',
    'skipper', 'hairstreak', 'blue', 'sulfur', 'white', 'moth', 'luna', 'cecropia',
    'polyphemus', 'io', 'sphinx', 'hummingbird', 'clearwing', 'tiger', 'woolly', 'bear',
    'tent', 'caterpillar', 'inchworm', 'cutworm', 'armyworm', 'hornworm', 'webworm', 'bagworm',
    'beetle', 'ladybug', 'firefly', 'june', 'stag', 'rhinoceros', 'scarab', 'weevil',
    'borer', 'bark', 'click', 'ground', 'rove', 'soldier', 'blister', 'carrion',
    'cricket', 'grasshopper', 'katydid', 'locust', 'cicada', 'aphid', 'scale', 'mealybug',
    'whitefly', 'thrips', 'leafhopper', 'planthopper', 'psyllid', 'adelgid', 'woolly', 'aphid'
  ],
  'sports': [
    'football', 'basketball', 'baseball', 'soccer', 'tennis', 'swimming', 'hockey', 'golf',
    'volleyball', 'wrestling', 'boxing', 'cycling', 'running', 'jumping', 'skiing', 'skating',
    'surfing', 'bowling', 'archery', 'diving', 'karate', 'yoga', 'dancing', 'climbing',
    'badminton', 'cricket', 'rugby', 'polo', 'lacrosse', 'softball', 'handball', 'squash',
    'racquetball', 'pingpong', 'tabletennis', 'billiards', 'pool', 'snooker', 'darts', 'chess',
    'checkers', 'backgammon', 'scrabble', 'monopoly', 'poker', 'bridge', 'crossword', 'sudoku',
    'marathon', 'sprint', 'hurdles', 'relay', 'javelin', 'shotput', 'discus', 'hammer',
    'polevault', 'highjump', 'longjump', 'triplejump', 'decathlon', 'heptathlon', 'pentathlon', 'triathlon',
    'weightlifting', 'powerlifting', 'bodybuilding', 'crossfit', 'aerobics', 'pilates', 'zumba', 'spinning',
    'rowing', 'kayaking', 'canoeing', 'sailing', 'windsurfing', 'kitesurfing', 'wakeboarding', 'waterskiing',
    'snowboarding', 'sledding', 'bobsled', 'luge', 'skeleton', 'curling', 'biathlon', 'nordic',
    'alpine', 'freestyle', 'moguls', 'halfpipe', 'slopestyle', 'cross', 'country', 'downhill',
    'slalom', 'giant', 'super', 'combined', 'parallel', 'boardercross', 'skicross', 'aerials',
    'figureskating', 'speedskating', 'shorttrack', 'icedancing', 'pairs', 'singles', 'synchronized', 'ice',
    'fieldhockey', 'icehockey', 'roller', 'inline', 'street', 'bandy', 'floorball', 'broomball',
    'netball', 'korfball', 'dodgeball', 'kickball', 'wiffle', 'stickball', 'rounders', 'pesapallo',
    'futsal', 'beach', 'arena', 'gaelic', 'australian', 'canadian', 'american', 'association',
    'hurling', 'camogie', 'shinty', 'bandy', 'tchoukball', 'ultimate', 'frisbee', 'disc',
    'horseback', 'dressage', 'jumping', 'eventing', 'polo', 'rodeo', 'barrel', 'racing',
    'bronc', 'bull', 'riding', 'roping', 'cutting', 'reining', 'western', 'english',
    'motocross', 'supercross', 'enduro', 'trials', 'speedway', 'drag', 'nascar', 'formula',
    'rally', 'karting', 'autocross', 'hillclimb', 'drifting', 'touring', 'stock', 'open',
    'fencing', 'epee', 'foil', 'sabre', 'rapier', 'sword', 'blade', 'thrust',
    'judo', 'jujitsu', 'aikido', 'taekwondo', 'hapkido', 'kungfu', 'wushu', 'tai',
    'muay', 'thai', 'kickboxing', 'savate', 'capoeira', 'krav', 'maga', 'mixed',
    'martial', 'arts', 'grappling', 'submission', 'brazilian', 'jiujitsu', 'sambo', 'sumo',
    'rockclimbing', 'bouldering', 'mountaineering', 'rappelling', 'caving', 'spelunking', 'canyoning', 'via',
    'ferrata', 'alpine', 'aid', 'free', 'solo', 'trad', 'sport', 'indoor'
  ],
  'gross out': [
    'slime', 'booger', 'mud', 'worm', 'slug', 'spider', 'yucky', 'stinky', 'slimy', 'gooey',
    'messy', 'dirty', 'smelly', 'gross', 'icky', 'nasty', 'grimy', 'moldy', 'rotten', 'soggy',
    'gunk', 'grime', 'muck', 'crud', 'ooze', 'scum', 'filth', 'slop', 'sludge', 'gloop',
    'snot', 'phlegm', 'mucus', 'drool', 'slobber', 'spit', 'saliva', 'bile', 'pus', 'scab',
    'blister', 'pimple', 'zit', 'wart', 'fungus', 'mold', 'mildew', 'bacteria', 'germs', 'microbes',
    'garbage', 'trash', 'refuse', 'waste', 'rubbish', 'litter', 'debris', 'scraps', 'leftovers', 'spoiled',
    'putrid', 'rank', 'foul', 'fetid', 'musty', 'dank', 'sour', 'rancid', 'stale', 'funky',
    'sweat', 'perspiration', 'odor', 'stench', 'reek', 'funk', 'aroma', 'whiff', 'pong', 'smell',
    'maggot', 'larvae', 'grub', 'caterpillar', 'beetle', 'roach', 'cockroach', 'termite', 'louse', 'flea',
    'tick', 'mite', 'bed', 'bug', 'mosquito', 'gnat', 'fly', 'fruit', 'house', 'blow',
    'sewer', 'drain', 'toilet', 'bathroom', 'outhouse', 'porta', 'potty', 'cesspool', 'septic', 'manure',
    'dung', 'fertilizer', 'compost', 'decay', 'decompose', 'rot', 'putrefy', 'ferment', 'spoil', 'curdle',
    'vomit', 'puke', 'barf', 'hurl', 'spew', 'upchuck', 'ralph', 'toss', 'cookies', 'sick',
    'nausea', 'queasy', 'dizzy', 'woozy', 'green', 'gills', 'motion', 'sickness', 'car', 'sea',
    'burp', 'belch', 'hiccup', 'gas', 'fart', 'toot', 'flatulence', 'wind', 'pass', 'break',
    'earwax', 'cerumen', 'dirt', 'grit', 'sand', 'dust', 'lint', 'fuzz', 'hair', 'dandruff',
    'skin', 'flakes', 'scales', 'peeling', 'sunburn', 'blotchy', 'rash', 'hives', 'eczema', 'psoriasis',
    'pollen', 'allergens', 'sneeze', 'snot', 'runny', 'nose', 'congestion', 'stuffy', 'blocked', 'clogged',
    'tar', 'oil', 'grease', 'gum', 'sticky', 'tacky', 'adhesive', 'glue', 'paste', 'cement',
    'plaster', 'mortar', 'concrete', 'asphalt', 'pitch', 'resin', 'sap', 'latex', 'rubber', 'plastic'
  ],
  'school': [
    'teacher', 'student', 'classroom', 'homework', 'pencil', 'eraser', 'notebook', 'backpack',
    'lunch', 'recess', 'library', 'science', 'math', 'reading', 'writing', 'spelling', 'test',
    'grade', 'friend', 'playground', 'cafeteria', 'principal', 'desk', 'chair', 'book',
    'textbook', 'workbook', 'binder', 'folder', 'paper', 'pen', 'marker', 'crayon', 'chalk',
    'whiteboard', 'blackboard', 'smartboard', 'projector', 'computer', 'tablet', 'calculator', 'ruler', 'compass', 'protractor',
    'scissors', 'glue', 'tape', 'stapler', 'clips', 'pushpins', 'thumbtacks', 'bulletin', 'board', 'poster',
    'map', 'globe', 'dictionary', 'encyclopedia', 'atlas', 'almanac', 'thesaurus', 'reference', 'manual', 'guide',
    'curriculum', 'syllabus', 'lesson', 'plan', 'unit', 'chapter', 'section', 'page', 'paragraph', 'sentence',
    'word', 'letter', 'alphabet', 'phonics', 'grammar', 'vocabulary', 'comprehension', 'fluency', 'literacy', 'numeracy',
    'addition', 'subtraction', 'multiplication', 'division', 'fraction', 'decimal', 'percent', 'geometry', 'algebra', 'calculus',
    'biology', 'chemistry', 'physics', 'earth', 'space', 'astronomy', 'ecology', 'environment', 'weather', 'climate',
    'history', 'geography', 'civics', 'government', 'economics', 'sociology', 'psychology', 'philosophy', 'ethics', 'religion',
    'art', 'music', 'drama', 'theater', 'dance', 'physical', 'education', 'health', 'nutrition', 'safety',
    'foreign', 'language', 'spanish', 'french', 'german', 'italian', 'chinese', 'japanese', 'russian', 'latin',
    'kindergarten', 'elementary', 'middle', 'junior', 'high', 'senior', 'freshman', 'sophomore', 'junior', 'senior',
    'preschool', 'daycare', 'nursery', 'academy', 'institute', 'university', 'college', 'campus', 'dormitory', 'residence',
    'hallway', 'corridor', 'locker', 'combination', 'lock', 'key', 'card', 'badge', 'uniform', 'dress',
    'code', 'policy', 'rules', 'regulations', 'discipline', 'detention', 'suspension', 'expulsion', 'tardy', 'absent',
    'present', 'attendance', 'roll', 'call', 'register', 'roster', 'list', 'schedule', 'timetable', 'calendar',
    'semester', 'quarter', 'trimester', 'year', 'summer', 'winter', 'spring', 'fall', 'break', 'vacation',
    'report', 'card', 'transcript', 'diploma', 'certificate', 'award', 'honor', 'merit', 'distinction', 'achievement',
    'scholarship', 'grant', 'loan', 'tuition', 'fee', 'cost', 'budget', 'financial', 'aid', 'assistance',
    'club', 'activity', 'sport', 'team', 'band', 'choir', 'orchestra', 'drama', 'debate', 'chess',
    'student', 'council', 'government', 'election', 'vote', 'campaign', 'candidate', 'office', 'president', 'vice',
    'secretary', 'treasurer', 'representative', 'delegate', 'committee', 'meeting', 'assembly', 'rally', 'spirit', 'week'
  ],
  'magical': [
    'wizard', 'fairy', 'magic', 'wand', 'spell', 'potion', 'castle', 'dragon', 'unicorn',
    'princess', 'prince', 'knight', 'treasure', 'crystal', 'enchanted', 'mystical', 'fantasy',
    'sorcerer', 'witch', 'cauldron', 'phoenix', 'pegasus', 'mermaid', 'genie', 'rainbow',
    'warlock', 'shaman', 'druid', 'necromancer', 'alchemist', 'mage', 'sage', 'oracle', 'prophet', 'seer',
    'enchantress', 'sorceress', 'priestess', 'goddess', 'nymph', 'sprite', 'pixie', 'elf', 'dwarf', 'gnome',
    'hobbit', 'goblin', 'orc', 'troll', 'giant', 'ogre', 'demon', 'devil', 'angel', 'seraph',
    'cherub', 'archangel', 'guardian', 'spirit', 'ghost', 'phantom', 'specter', 'wraith', 'banshee', 'poltergeist',
    'vampire', 'werewolf', 'shapeshifter', 'metamorph', 'changeling', 'doppelganger', 'mimic', 'illusion', 'apparition', 'vision',
    'griffin', 'hippogriff', 'centaur', 'minotaur', 'sphinx', 'chimera', 'hydra', 'kraken', 'leviathan', 'behemoth',
    'basilisk', 'cockatrice', 'wyvern', 'drake', 'wyrm', 'salamander', 'phoenix', 'firebird', 'thunderbird', 'roc',
    'pegasus', 'hippocamp', 'kelpie', 'selkie', 'siren', 'harpy', 'banshee', 'valkyrie', 'amazon', 'warrior',
    'paladin', 'crusader', 'templar', 'champion', 'hero', 'heroine', 'adventurer', 'explorer', 'quest', 'journey',
    'mission', 'destiny', 'fate', 'prophecy', 'legend', 'myth', 'folklore', 'tale', 'story', 'epic',
    'saga', 'chronicle', 'ballad', 'song', 'chant', 'incantation', 'invocation', 'summoning', 'ritual', 'ceremony',
    'amulet', 'talisman', 'charm', 'pendant', 'medallion', 'locket', 'ring', 'crown', 'tiara', 'circlet',
    'scepter', 'staff', 'rod', 'orb', 'sphere', 'globe', 'crystal', 'ball', 'mirror', 'scrying',
    'divination', 'augury', 'omen', 'portent', 'sign', 'symbol', 'rune', 'glyph', 'sigil', 'seal',
    'scroll', 'tome', 'grimoire', 'spellbook', 'manual', 'codex', 'manuscript', 'parchment', 'papyrus', 'vellum',
    'elixir', 'philter', 'tonic', 'brew', 'concoction', 'mixture', 'formula', 'recipe', 'ingredient', 'component',
    'herb', 'flower', 'root', 'bark', 'leaf', 'seed', 'berry', 'fruit', 'mushroom', 'fungus',
    'tower', 'spire', 'dungeon', 'chamber', 'hall', 'throne', 'room', 'laboratory', 'workshop', 'forge',
    'altar', 'shrine', 'temple', 'monastery', 'abbey', 'cathedral', 'church', 'chapel', 'sanctuary', 'haven',
    'realm', 'kingdom', 'empire', 'domain', 'territory', 'land', 'world', 'dimension', 'plane', 'universe',
    'cosmos', 'void', 'abyss', 'netherworld', 'underworld', 'afterlife', 'heaven', 'paradise', 'elysium', 'nirvana',
    'portal', 'gateway', 'doorway', 'passage', 'bridge', 'tunnel', 'vortex', 'rift', 'tear', 'fissure'
  ],
  'silly fun': [
    'giggle', 'laugh', 'funny', 'joke', 'silly', 'goofy', 'crazy', 'wacky', 'hilarious',
    'amusing', 'tickle', 'smile', 'happy', 'cheerful', 'playful', 'bouncy', 'wiggly',
    'jiggly', 'bubbly', 'peppy', 'zippy', 'snappy', 'perky', 'quirky', 'zany',
    'nutty', 'loony', 'batty', 'bonkers', 'kooky', 'daffy', 'dippy', 'dotty', 'screwy', 'wacko',
    'whimsical', 'absurd', 'ridiculous', 'preposterous', 'outrageous', 'bizarre', 'odd', 'weird', 'strange', 'peculiar',
    'comical', 'droll', 'witty', 'clever', 'humorous', 'jovial', 'jolly', 'merry', 'gleeful', 'joyful',
    'elated', 'ecstatic', 'euphoric', 'exuberant', 'jubilant', 'thrilled', 'delighted', 'overjoyed', 'blissful', 'radiant',
    'giggly', 'chuckling', 'snickering', 'grinning', 'beaming', 'smirking', 'cackling', 'roaring', 'howling', 'shrieking',
    'chortling', 'tittering', 'snorting', 'belly', 'splitting', 'sides', 'ribs', 'tickled', 'pink', 'punch',
    'drunk', 'giddy', 'dizzy', 'lightheaded', 'whoozy', 'tipsy', 'punch', 'drunk', 'slaphappy', 'loopy',
    'bonkers', 'bananas', 'nuts', 'crackers', 'potty', 'barmy', 'daft', 'balmy', 'touched', 'unhinged',
    'clown', 'jester', 'comedian', 'comic', 'joker', 'prankster', 'trickster', 'buffoon', 'fool', 'court',
    'circus', 'carnival', 'fair', 'funhouse', 'amusement', 'park', 'roller', 'coaster', 'ferris', 'wheel',
    'merry', 'round', 'carousel', 'bumper', 'cars', 'cotton', 'candy', 'popcorn', 'balloon', 'confetti',
    'streamers', 'party', 'celebration', 'festival', 'fiesta', 'gala', 'bash', 'shindig', 'hootenanny', 'jamboree',
    'rumpus', 'hullabaloo', 'brouhaha', 'hubbub', 'commotion', 'fracas', 'kerfuffle', 'to', 'brouhaha', 'ballyhoo',
    'hoopla', 'fanfare', 'spectacle', 'extravaganza', 'pageant', 'parade', 'procession', 'march', 'rally', 'gathering',
    'assembly', 'congregation', 'convention', 'conference', 'summit', 'meeting', 'reunion', 'get', 'together', 'pow',
    'wow', 'huddle', 'session', 'workshop', 'seminar', 'symposium', 'colloquium', 'forum', 'panel', 'discussion',
    'whoopee', 'cushion', 'buzzer', 'squirter', 'fake', 'mustache', 'glasses', 'nose', 'bow', 'tie',
    'polka', 'dot', 'stripes', 'plaid', 'checkered', 'rainbow', 'multicolored', 'bright', 'vivid', 'neon',
    'fluorescent', 'glowing', 'sparkling', 'glittering', 'shimmering', 'twinkling', 'dazzling', 'brilliant', 'radiant', 'luminous',
    'squeaky', 'toy', 'rubber', 'duck', 'chicken', 'hammer', 'horn', 'whistle', 'kazoo', 'noisemaker',
    'rattle', 'bell', 'chime', 'ding', 'dong', 'ping', 'pong', 'boing', 'sproing', 'bonk',
    'thud', 'plop', 'splat', 'squish', 'squelch', 'splish', 'splash', 'whoosh', 'zoom', 'zip'
  ],
  'superheroes': [
    'hero', 'power', 'cape', 'mask', 'strength', 'flying', 'rescue', 'brave', 'courage',
    'justice', 'villain', 'battle', 'protect', 'save', 'mission', 'secret', 'identity',
    'costume', 'super', 'amazing', 'incredible', 'mighty', 'ultimate', 'fantastic',
    'superhuman', 'extraordinary', 'phenomenal', 'remarkable', 'outstanding', 'exceptional', 'marvelous', 'wonderful', 'spectacular', 'magnificent',
    'invincible', 'indestructible', 'invulnerable', 'unstoppable', 'unbeatable', 'unconquerable', 'undefeatable', 'impenetrable', 'impervious', 'immune',
    'telepathy', 'telekinesis', 'teleportation', 'invisibility', 'intangibility', 'shapeshifting', 'regeneration', 'immortality', 'precognition', 'clairvoyance',
    'superhearing', 'supervision', 'infrared', 'thermal', 'xray', 'laser', 'freeze', 'heat', 'fire', 'ice',
    'lightning', 'thunder', 'storm', 'weather', 'control', 'manipulation', 'elemental', 'earth', 'water', 'air',
    'magnetic', 'gravity', 'time', 'space', 'dimensional', 'portal', 'energy', 'plasma', 'radiation', 'atomic',
    'molecular', 'cellular', 'genetic', 'mutation', 'evolution', 'adaptation', 'transformation', 'metamorphosis', 'enhancement', 'augmentation',
    'cybernetic', 'bionic', 'robotic', 'mechanical', 'technological', 'futuristic', 'advanced', 'sophisticated', 'cutting', 'edge',
    'headquarters', 'base', 'lair', 'hideout', 'fortress', 'tower', 'cave', 'underground', 'laboratory', 'workshop',
    'gadget', 'device', 'tool', 'weapon', 'armor', 'suit', 'utility', 'belt', 'grappling', 'hook',
    'shield', 'sword', 'staff', 'hammer', 'bow', 'arrow', 'boomerang', 'throwing', 'star', 'explosive',
    'vehicle', 'motorcycle', 'car', 'plane', 'helicopter', 'submarine', 'spaceship', 'hovercraft', 'jetpack', 'rocket',
    'boots', 'gloves', 'helmet', 'goggles', 'visor', 'communicator', 'tracker', 'scanner', 'detector', 'analyzer',
    'sidekick', 'partner', 'ally', 'teammate', 'squad', 'league', 'alliance', 'federation', 'organization', 'agency',
    'mentor', 'trainer', 'guide', 'teacher', 'master', 'sensei', 'guru', 'sage', 'wise', 'elder',
    'nemesis', 'archenemy', 'adversary', 'foe', 'rival', 'opponent', 'antagonist', 'criminal', 'mastermind', 'overlord',
    'henchman', 'minion', 'lackey', 'thug', 'goon', 'assassin', 'mercenary', 'bounty', 'hunter', 'spy',
    'citizen', 'civilian', 'bystander', 'witness', 'victim', 'hostage', 'captive', 'prisoner', 'survivor', 'refugee',
    'comic', 'graphic', 'novel', 'series', 'issue', 'volume', 'chapter', 'panel', 'frame', 'bubble',
    'speech', 'thought', 'caption', 'narration', 'dialogue', 'monologue', 'exposition', 'backstory', 'origin', 'flashback',
    'cliffhanger', 'plot', 'twist', 'reveal', 'surprise', 'shocking', 'dramatic', 'climax', 'resolution', 'conclusion'
  ],
  'jobs': [
    'doctor', 'teacher', 'firefighter', 'police', 'nurse', 'pilot', 'chef', 'farmer',
    'builder', 'artist', 'singer', 'dancer', 'writer', 'scientist', 'engineer', 'mechanic',
    'dentist', 'veterinarian', 'librarian', 'mailman', 'baker', 'musician', 'actor', 'coach',
    'surgeon', 'physician', 'specialist', 'cardiologist', 'neurologist', 'pediatrician', 'psychiatrist', 'therapist', 'counselor', 'psychologist',
    'pharmacist', 'technician', 'paramedic', 'emergency', 'medical', 'responder', 'radiologist', 'anesthesiologist', 'pathologist', 'oncologist',
    'professor', 'instructor', 'educator', 'tutor', 'principal', 'superintendent', 'guidance', 'counselor', 'aide', 'substitute',
    'captain', 'lieutenant', 'sergeant', 'detective', 'investigator', 'officer', 'patrol', 'traffic', 'security', 'guard',
    'astronaut', 'aviation', 'controller', 'flight', 'attendant', 'navigator', 'copilot', 'helicopter', 'drone', 'operator',
    'pastry', 'sous', 'executive', 'line', 'cook', 'prep', 'server', 'waiter', 'waitress', 'bartender',
    'rancher', 'agricultural', 'worker', 'harvester', 'greenhouse', 'operator', 'livestock', 'manager', 'crop', 'inspector',
    'carpenter', 'electrician', 'plumber', 'roofer', 'mason', 'welder', 'painter', 'decorator', 'contractor', 'foreman',
    'sculptor', 'painter', 'illustrator', 'graphic', 'designer', 'photographer', 'filmmaker', 'animator', 'cartoonist', 'architect',
    'composer', 'conductor', 'pianist', 'guitarist', 'violinist', 'drummer', 'vocalist', 'songwriter', 'producer', 'sound',
    'director', 'producer', 'screenwriter', 'cinematographer', 'editor', 'makeup', 'costume', 'designer', 'stunt', 'double',
    'trainer', 'fitness', 'personal', 'sports', 'referee', 'umpire', 'commentator', 'broadcaster', 'journalist', 'reporter',
    'accountant', 'bookkeeper', 'financial', 'advisor', 'banker', 'teller', 'loan', 'officer', 'investment', 'analyst',
    'lawyer', 'attorney', 'judge', 'paralegal', 'court', 'clerk', 'bailiff', 'stenographer', 'mediator', 'arbitrator',
    'programmer', 'developer', 'analyst', 'technician', 'administrator', 'database', 'network', 'cybersecurity', 'specialist', 'consultant',
    'salesperson', 'representative', 'manager', 'supervisor', 'executive', 'director', 'president', 'chairman', 'owner', 'entrepreneur',
    'custodian', 'janitor', 'housekeeper', 'maintenance', 'worker', 'landscaper', 'groundskeeper', 'gardener', 'florist', 'decorator',
    'hairstylist', 'barber', 'beautician', 'manicurist', 'massage', 'therapist', 'personal', 'shopper', 'fashion', 'stylist',
    'social', 'worker', 'case', 'manager', 'volunteer', 'coordinator', 'fundraiser', 'nonprofit', 'administrator', 'community',
    'organizer', 'activist', 'advocate', 'lobbyist', 'politician', 'mayor', 'governor', 'senator', 'representative', 'diplomat',
    'translator', 'interpreter', 'language', 'specialist', 'foreign', 'correspondent', 'travel', 'agent', 'tour', 'guide'
  ],
  'food fun': [
    'pizza', 'hamburger', 'hotdog', 'sandwich', 'cookie', 'cake', 'candy', 'chocolate',
    'icecream', 'apple', 'banana', 'orange', 'grape', 'strawberry', 'watermelon', 'cheese',
    'bread', 'milk', 'juice', 'soda', 'popcorn', 'pretzel', 'donut', 'pancake', 'waffle',
    'spaghetti', 'lasagna', 'ravioli', 'macaroni', 'linguine', 'fettuccine', 'penne', 'rigatoni', 'tortellini', 'gnocchi',
    'burrito', 'taco', 'quesadilla', 'enchilada', 'nachos', 'salsa', 'guacamole', 'jalapeno', 'cilantro', 'lime',
    'sushi', 'ramen', 'noodles', 'tempura', 'teriyaki', 'wasabi', 'ginger', 'soy', 'sauce', 'rice',
    'curry', 'tikka', 'masala', 'naan', 'chapati', 'samosa', 'chutney', 'cardamom', 'turmeric', 'coriander',
    'croissant', 'baguette', 'danish', 'muffin', 'scone', 'bagel', 'toast', 'jam', 'jelly', 'marmalade',
    'honey', 'syrup', 'maple', 'butter', 'cream', 'yogurt', 'pudding', 'custard', 'mousse', 'souffle',
    'brownie', 'cupcake', 'frosting', 'icing', 'sprinkles', 'cherry', 'whipped', 'cream', 'caramel', 'fudge',
    'gummy', 'bears', 'lollipop', 'peppermint', 'licorice', 'taffy', 'marshmallow', 'jellybean', 'cotton', 'candy',
    'pineapple', 'mango', 'kiwi', 'papaya', 'coconut', 'avocado', 'blueberry', 'raspberry', 'blackberry', 'cranberry',
    'peach', 'pear', 'plum', 'apricot', 'cherry', 'lemon', 'lime', 'grapefruit', 'tangerine', 'mandarin',
    'carrot', 'broccoli', 'cauliflower', 'spinach', 'lettuce', 'cucumber', 'tomato', 'pepper', 'onion', 'garlic',
    'potato', 'sweet', 'corn', 'peas', 'beans', 'celery', 'mushroom', 'zucchini', 'eggplant', 'squash',
    'chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'lobster', 'crab',
    'eggs', 'bacon', 'sausage', 'ham', 'deli', 'meat', 'pepperoni', 'salami', 'pastrami', 'roast',
    'soup', 'stew', 'chili', 'broth', 'bisque', 'chowder', 'minestrone', 'gazpacho', 'consomme', 'ramen',
    'salad', 'coleslaw', 'potato', 'macaroni', 'caesar', 'greek', 'cobb', 'waldorf', 'caprese', 'antipasto',
    'smoothie', 'milkshake', 'lemonade', 'iced', 'tea', 'coffee', 'espresso', 'cappuccino', 'latte', 'mocha',
    'water', 'sparkling', 'energy', 'drink', 'sports', 'vitamin', 'protein', 'shake', 'herbal', 'tea',
    'cereal', 'oatmeal', 'granola', 'muesli', 'bran', 'flakes', 'cheerios', 'cornflakes', 'rice', 'krispies',
    'trail', 'mix', 'nuts', 'almonds', 'peanuts', 'cashews', 'walnuts', 'pecans', 'pistachios', 'hazelnuts',
    'chips', 'crackers', 'cookies', 'pretzels', 'popcorn', 'peanut', 'butter', 'sunflower', 'seeds', 'raisins'
  ],
  'vacations': [
    'beach', 'ocean', 'mountain', 'camping', 'hotel', 'airplane', 'suitcase', 'camera',
    'sunglasses', 'vacation', 'holiday', 'travel', 'adventure', 'explore', 'discover',
    'island', 'forest', 'lake', 'river', 'park', 'zoo', 'museum', 'castle', 'monument',
    'resort', 'lodge', 'cabin', 'cottage', 'villa', 'chalet', 'hostel', 'motel', 'inn', 'bed',
    'breakfast', 'cruise', 'ship', 'yacht', 'sailboat', 'catamaran', 'ferry', 'submarine', 'houseboat', 'raft',
    'train', 'subway', 'metro', 'trolley', 'bus', 'coach', 'taxi', 'uber', 'rental', 'car',
    'motorcycle', 'bicycle', 'scooter', 'skateboard', 'rollerblades', 'walking', 'hiking', 'trekking', 'backpacking', 'climbing',
    'passport', 'visa', 'ticket', 'boarding', 'pass', 'luggage', 'backpack', 'duffel', 'bag', 'carry',
    'sunscreen', 'sunhat', 'swimsuit', 'bikini', 'trunks', 'flip', 'flops', 'sandals', 'snorkel', 'mask',
    'fins', 'scuba', 'diving', 'surfboard', 'boogie', 'board', 'kayak', 'canoe', 'paddle', 'boat',
    'tent', 'sleeping', 'flashlight', 'lantern', 'compass', 'map', 'gps', 'binoculars', 'fishing', 'rod',
    'campfire', 'marshmallows', 'smores', 'hotdogs', 'barbecue', 'grill', 'cooler', 'thermos', 'water', 'bottle',
    'guidebook', 'brochure', 'postcard', 'souvenir', 'gift', 'shop', 'memento', 'keepsake', 'photo', 'album',
    'selfie', 'panorama', 'landscape', 'sunset', 'sunrise', 'wildlife', 'nature', 'scenery', 'vista', 'overlook',
    'tropical', 'paradise', 'exotic', 'remote', 'pristine', 'unspoiled', 'breathtaking', 'spectacular', 'magnificent', 'stunning',
    'relaxation', 'rejuvenation', 'recreation', 'leisure', 'entertainment', 'activities', 'excursions', 'tours', 'sightseeing', 'attractions',
    'culture', 'heritage', 'tradition', 'customs', 'cuisine', 'local', 'authentic', 'indigenous', 'native', 'folklore',
    'language', 'dialect', 'accent', 'communication', 'translation', 'interpreter', 'guide', 'concierge', 'receptionist', 'staff',
    'itinerary', 'schedule', 'agenda', 'reservation', 'booking', 'confirmation', 'check', 'checkout', 'departure', 'arrival',
    'weather', 'climate', 'temperature', 'humidity', 'rainfall', 'sunshine', 'cloudy', 'clear', 'windy', 'calm',
    'seasons', 'summer', 'winter', 'spring', 'autumn', 'fall', 'peak', 'season', 'shoulder', 'low',
    'budget', 'expensive', 'affordable', 'cheap', 'luxury', 'economy', 'first', 'class', 'business', 'premium',
    'memories', 'experiences', 'stories', 'adventures', 'journeys', 'destinations', 'wanderlust', 'exploration', 'discovery', 'freedom'
  ],
  'cool technology': [
    'computer', 'robot', 'rocket', 'spaceship', 'satellite', 'laser', 'hologram', 'gadget',
    'invention', 'machine', 'device', 'future', 'digital', 'virtual', 'cyber', 'nano',
    'solar', 'electric', 'wireless', 'remote', 'smartphone', 'tablet', 'video', 'gaming',
    'artificial', 'intelligence', 'machine', 'learning', 'neural', 'network', 'algorithm', 'automation', 'programming', 'software',
    'hardware', 'processor', 'chip', 'microchip', 'circuit', 'motherboard', 'memory', 'storage', 'hard', 'drive',
    'monitor', 'screen', 'display', 'keyboard', 'mouse', 'touchpad', 'trackball', 'joystick', 'controller', 'headset',
    'virtual', 'reality', 'augmented', 'mixed', 'immersive', 'simulation', 'three', 'dimensional', 'graphics', 'animation',
    'internet', 'website', 'browser', 'search', 'engine', 'social', 'media', 'networking', 'streaming', 'download',
    'upload', 'cloud', 'computing', 'server', 'database', 'backup', 'security', 'encryption', 'firewall', 'antivirus',
    'bluetooth', 'wifi', 'ethernet', 'fiber', 'optic', 'broadband', 'bandwidth', 'connectivity', 'network', 'protocol',
    'drone', 'quadcopter', 'helicopter', 'autonomous', 'self', 'driving', 'electric', 'vehicle', 'hybrid', 'tesla',
    'battery', 'charger', 'power', 'bank', 'adapter', 'cable', 'cord', 'plug', 'outlet', 'generator',
    'renewable', 'energy', 'wind', 'turbine', 'hydroelectric', 'geothermal', 'biomass', 'nuclear', 'fusion', 'fission',
    'space', 'exploration', 'mars', 'rover', 'telescope', 'hubble', 'james', 'webb', 'international', 'station',
    'astronaut', 'cosmonaut', 'mission', 'launch', 'orbit', 'gravity', 'zero', 'weightless', 'atmosphere', 'vacuum',
    'biotechnology', 'genetics', 'dna', 'gene', 'therapy', 'cloning', 'stem', 'cell', 'crispr', 'genome',
    'medical', 'scanner', 'mri', 'xray', 'ultrasound', 'ct', 'scan', 'pacemaker', 'prosthetic', 'implant',
    'three', 'printer', 'additive', 'manufacturing', 'prototype', 'rapid', 'production', 'material', 'plastic', 'metal',
    'quantum', 'computing', 'supercomputer', 'parallel', 'processing', 'bit', 'qubit', 'entanglement', 'superposition', 'interference',
    'cryptocurrency', 'bitcoin', 'blockchain', 'digital', 'currency', 'wallet', 'mining', 'ledger', 'transaction', 'decentralized',
    'smartphone', 'iphone', 'android', 'apps', 'application', 'touchscreen', 'fingerprint', 'face', 'recognition', 'voice',
    'assistant', 'alexa', 'siri', 'google', 'smart', 'home', 'automation', 'thermostat', 'security', 'camera',
    'wearable', 'smartwatch', 'fitness', 'tracker', 'heart', 'rate', 'steps', 'calories', 'sleep', 'monitoring',
    'innovation', 'breakthrough', 'cutting', 'edge', 'state', 'art', 'revolutionary', 'disruptive', 'emerging', 'trending'
  ],
  'kids tv and movies': [
    'cartoon', 'animation', 'movie', 'character', 'adventure', 'comedy', 'family', 'fun',
    'story', 'hero', 'villain', 'friendship', 'team', 'quest', 'journey', 'magical',
    'fantasy', 'action', 'mystery', 'detective', 'treasure', 'discovery', 'rescue', 'brave',
    'disney', 'pixar', 'dreamworks', 'nickelodeon', 'cartoon', 'network', 'pbs', 'kids', 'netflix', 'streaming',
    'princess', 'prince', 'castle', 'kingdom', 'fairy', 'tale', 'once', 'upon', 'time', 'happily',
    'ever', 'after', 'magic', 'spell', 'witch', 'wizard', 'dragon', 'unicorn', 'talking', 'animals',
    'superhero', 'powers', 'cape', 'mask', 'costume', 'saving', 'world', 'good', 'versus', 'evil',
    'school', 'classroom', 'teacher', 'students', 'homework', 'field', 'trip', 'science', 'project', 'talent',
    'show', 'competition', 'contest', 'winning', 'losing', 'teamwork', 'cooperation', 'helping', 'sharing', 'caring',
    'family', 'siblings', 'parents', 'grandparents', 'pets', 'house', 'neighborhood', 'community', 'neighbors', 'friends',
    'playground', 'park', 'beach', 'forest', 'mountains', 'space', 'underwater', 'jungle', 'desert', 'arctic',
    'robots', 'aliens', 'monsters', 'dinosaurs', 'pirates', 'knights', 'cowboys', 'ninjas', 'detectives', 'explorers',
    'singing', 'dancing', 'music', 'songs', 'instruments', 'band', 'concert', 'performance', 'talent', 'show',
    'sports', 'games', 'playground', 'recess', 'summer', 'camp', 'vacation', 'holidays', 'birthday', 'party',
    'christmas', 'halloween', 'thanksgiving', 'easter', 'new', 'year', 'valentines', 'day', 'mothers', 'fathers',
    'learning', 'education', 'numbers', 'letters', 'reading', 'writing', 'counting', 'colors', 'shapes', 'sizes',
    'feelings', 'emotions', 'happy', 'sad', 'angry', 'scared', 'excited', 'surprised', 'proud', 'disappointed',
    'manners', 'please', 'thank', 'you', 'sorry', 'excuse', 'me', 'polite', 'respectful', 'kind',
    'imagination', 'creativity', 'pretend', 'play', 'make', 'believe', 'dress', 'up', 'costumes', 'roleplay',
    'toys', 'dolls', 'action', 'figures', 'blocks', 'puzzles', 'games', 'board', 'video', 'outdoor',
    'bedtime', 'stories', 'lullabies', 'dreams', 'nightmares', 'monsters', 'under', 'bed', 'dark', 'light',
    'growing', 'up', 'getting', 'older', 'responsibilities', 'chores', 'allowance', 'money', 'saving', 'spending',
    'environment', 'nature', 'recycling', 'conservation', 'earth', 'day', 'pollution', 'clean', 'green', 'eco',
    'diversity', 'differences', 'cultures', 'languages', 'traditions', 'acceptance', 'inclusion', 'understanding', 'tolerance', 'respect'
  ]
};

// Bonus words for each category - these are hidden in the puzzle but not in the word bank
export const BONUS_WORDS: Record<GameCategory, string[]> = {
  'animals': ['ecosystem', 'habitat', 'species', 'mammal', 'reptile', 'amphibian', 'invertebrate', 'vertebrate', 'predator', 'prey'],
  'sports': ['athlete', 'competition', 'tournament', 'championship', 'victory', 'defeat', 'strategy', 'technique', 'training', 'practice'],
  'gross out': ['disgusting', 'revolting', 'repulsive', 'nauseating', 'vile', 'loathsome', 'abhorrent', 'detestable', 'offensive', 'horrid'],
  'school': ['education', 'knowledge', 'learning', 'studying', 'graduation', 'academic', 'scholarship', 'curriculum', 'assignment', 'examination'],
  'magical': ['supernatural', 'otherworldly', 'paranormal', 'mystical', 'ethereal', 'spiritual', 'divine', 'celestial', 'transcendent', 'miraculous'],
  'silly fun': ['entertainment', 'amusement', 'recreation', 'merriment', 'festivity', 'celebration', 'enjoyment', 'pleasure', 'delight', 'happiness'],
  'superheroes': ['extraordinary', 'phenomenal', 'remarkable', 'spectacular', 'magnificent', 'invincible', 'legendary', 'epic', 'heroic', 'valiant'],
  'jobs': ['profession', 'occupation', 'career', 'employment', 'vocation', 'expertise', 'specialist', 'professional', 'workforce', 'industry'],
  'food fun': ['delicious', 'nutritious', 'appetizing', 'scrumptious', 'flavorful', 'tasty', 'savory', 'cuisine', 'recipe', 'ingredient'],
  'vacations': ['destination', 'excursion', 'expedition', 'getaway', 'retreat', 'journey', 'voyage', 'adventure', 'exploration', 'relaxation'],
  'cool technology': ['innovation', 'advancement', 'breakthrough', 'discovery', 'invention', 'development', 'progress', 'evolution', 'revolution', 'futuristic'],
  'kids tv and movies': ['entertainment', 'storytelling', 'animation', 'characters', 'adventure', 'imagination', 'creativity', 'inspiration', 'education', 'childhood']
};

export const WORD_SEARCH_CATEGORIES = ['random', ...[...GAME_CATEGORIES].sort()] as const;
export type WordSearchCategory = typeof WORD_SEARCH_CATEGORIES[number];

export const WORD_LISTS_WITH_BONUS = GAME_CATEGORIES.reduce((acc, category) => {
  acc[category] = [...WORD_LISTS[category], ...BONUS_WORDS[category]];
  return acc;
}, {} as Record<GameCategory, string[]>);

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

export const MAD_LIBS_TEMPLATES = {
  animals: [
    {
      title: "The Amazing Zoo Adventure",
      template: "At the zoo, I saw a {adjective1} {animal1} that could {verb1} with its {body_part}! The zookeeper told us that this {animal1} loves to eat {adjective2} {food} and can {verb2} up to {number} feet high. Suddenly, a {adjective3} {animal2} started to {verb3} loudly, which made all the other animals {verb4}. The funniest part was when a tiny {animal3} {verb5} right onto my {noun}!",
      prompts: ["adjective1", "animal1", "verb1", "body_part", "adjective2", "food", "verb2", "number", "adjective3", "animal2", "verb3", "verb4", "animal3", "verb5", "noun"]
    },
    {
      title: "My Pet's Crazy Day",
      template: "My pet {animal} had the most {adjective1} day ever! First, it {verb1} all over the {noun1}, then it {verb2} the {adjective2} {noun2}. When I tried to {verb3} it, my {animal} just {verb4} and made a {adjective3} sound. By the end of the day, there were {number} {noun3} scattered everywhere and my {animal} was sleeping {adverb} in its {noun4}.",
      prompts: ["animal", "adjective1", "verb1", "noun1", "verb2", "adjective2", "noun2", "verb3", "verb4", "adjective3", "number", "noun3", "adverb", "noun4"]
    },
    {
      title: "Safari Expedition",
      template: "On our {adjective1} safari, we spotted a {adjective2} elephant {verb1} near the watering hole. Our guide whispered, 'Look! That {animal1} can {verb2} faster than a {vehicle}!' Suddenly, a pack of {adjective3} {animal2} appeared and started {verb3}. We {verb4} quickly back to our {noun} and watched as the {animal1} {verb5} away into the {adjective4} sunset.",
      prompts: ["adjective1", "adjective2", "verb1", "animal1", "verb2", "vehicle", "adjective3", "animal2", "verb3", "verb4", "noun", "verb5", "adjective4"]
    },
    {
      title: "The Animal Talent Show",
      template: "Welcome to the most {adjective1} animal talent show! First up, we have a {animal1} that can {verb1} while {verb2}. Next, a {adjective2} {animal2} will {verb3} on one {body_part}. But wait! Here comes a {animal3} riding a {noun1} and {verb4} a {adjective3} {noun2}. The crowd went {adjective4} when all the animals {verb5} together for the grand finale!",
      prompts: ["adjective1", "animal1", "verb1", "verb2", "adjective2", "animal2", "verb3", "body_part", "animal3", "noun1", "verb4", "adjective3", "noun2", "adjective4", "verb5"]
    },
    {
      title: "Jungle Adventure",
      template: "Deep in the {adjective1} jungle, I heard a {adjective2} roar. It was a {animal1} {verb1} through the trees! I {verb2} behind a {adjective3} {noun1} and watched as the {animal1} {verb3} down to drink from the {adjective4} river. Suddenly, a {animal2} {verb4} out of nowhere and both animals started {verb5}. It was the most {adjective5} thing I've ever seen!",
      prompts: ["adjective1", "adjective2", "animal1", "verb1", "verb2", "adjective3", "noun1", "verb3", "adjective4", "animal2", "verb4", "verb5", "adjective5"]
    }
  ],
  sports: [
    {
      title: "The Championship Game",
      template: "It was the most {adjective1} game of the season! Our team was {verb1} against the {adjective2} {team_name}. In the first quarter, our star player {verb2} the {sports_equipment} {number} yards for a touchdown. The crowd was {verb3} so {adverb} that the whole stadium {verb4}. With only {number2} seconds left, we managed to {verb5} and win the {adjective3} championship!",
      prompts: ["adjective1", "verb1", "adjective2", "team_name", "verb2", "sports_equipment", "number", "verb3", "adverb", "verb4", "number2", "verb5", "adjective3"]
    },
    {
      title: "My First Soccer Practice",
      template: "Today was my first day playing {sport}! The coach told us to {verb1} around the field {number} times. Then we practiced {verb2} the ball with our {body_part}. I was so {adjective1} that I accidentally {verb3} the ball into the {noun}! Everyone {verb4} and the coach said I was a {adjective2} player. Next week we play against the {adjective3} {team_name}!",
      prompts: ["sport", "verb1", "number", "verb2", "body_part", "adjective1", "verb3", "noun", "verb4", "adjective2", "adjective3", "team_name"]
    },
    {
      title: "Olympic Dreams",
      template: "I dream of competing in the {adjective1} Olympics! I would {verb1} in the {sport} competition and {verb2} faster than any {animal}. My secret training involves {verb3} for {number} hours every day and eating {adjective2} {food}. When I win the gold medal, I'll {verb4} on the podium and {verb5} to all my {adjective3} fans!",
      prompts: ["adjective1", "verb1", "sport", "verb2", "animal", "verb3", "number", "adjective2", "food", "verb4", "verb5", "adjective3"]
    },
    {
      title: "The Baseball Game",
      template: "Bottom of the ninth inning, bases loaded! The {adjective1} pitcher {verb1} the ball at {number} miles per hour. Our batter {verb2} it high into the {adjective2} sky. The ball {verb3} over the {noun1} and landed in the {noun2}. The crowd {verb4} so loudly that even the {animal} in the parking lot started {verb5}. What a {adjective3} home run!",
      prompts: ["adjective1", "verb1", "number", "verb2", "adjective2", "verb3", "noun1", "noun2", "verb4", "animal", "verb5", "adjective3"]
    },
    {
      title: "Swimming Championship",
      template: "At the {adjective1} swimming meet, I was {adjective2} but ready to {verb1}. The pool was {number} feet long and filled with {adjective3} water. When the whistle {verb2}, I {verb3} into the pool and started {verb4} as fast as a {animal}. I could hear my family {verb5} from the {noun} as I touched the wall and won first place!",
      prompts: ["adjective1", "adjective2", "verb1", "number", "adjective3", "verb2", "verb3", "verb4", "animal", "verb5", "noun"]
    }
  ],
  food: [
    {
      title: "The Cooking Disaster",
      template: "Today I decided to cook a {adjective1} meal for my family. I started by {verb1} {number} {food1} in a {adjective2} pot. Then I added some {adjective3} {food2} and {verb2} it for {number2} minutes. Suddenly, the mixture started to {verb3} and turned {color}! The kitchen filled with {adjective4} smoke, and my {family_member} came running and {verb4}. We ended up ordering {food3} for dinner instead!",
      prompts: ["adjective1", "verb1", "number", "food1", "adjective2", "adjective3", "food2", "verb2", "number2", "verb3", "color", "adjective4", "family_member", "verb4", "food3"]
    },
    {
      title: "The Great Bake-Off",
      template: "Welcome to the {adjective1} baking competition! Today's challenge is to make a {adjective2} cake using only {food1}, {food2}, and {adjective3} {food3}. The contestants must {verb1} their ingredients and {verb2} them in a {adjective4} oven for {number} minutes. The winner will receive a {adjective5} {noun} and the title of {adjective6} baker!",
      prompts: ["adjective1", "adjective2", "food1", "food2", "adjective3", "food3", "verb1", "verb2", "adjective4", "number", "adjective5", "noun", "adjective6"]
    },
    {
      title: "My Favorite Restaurant",
      template: "My favorite restaurant serves the most {adjective1} {food1} in town! The chef can {verb1} it in {number} different ways. My usual order is {adjective2} {food2} with a side of {food3}. The waiter always {verb2} to our table and says '{exclamation}!' in a {adjective3} voice. The best part is the {adjective4} dessert that makes everyone {verb3} with joy!",
      prompts: ["adjective1", "food1", "verb1", "number", "adjective2", "food2", "food3", "verb2", "exclamation", "adjective3", "adjective4", "verb3"]
    },
    {
      title: "Grocery Store Adventure",
      template: "At the {adjective1} grocery store, I needed to buy {number} {food1} for dinner. I {verb1} down the {adjective2} aisle and found some {adjective3} {food2}. Suddenly, I {verb2} and accidentally {verb3} into a display of {food3}. They went {verb4} everywhere! The store manager came over and {verb5} while I {adverb} cleaned up the {adjective4} mess.",
      prompts: ["adjective1", "number", "food1", "verb1", "adjective2", "adjective3", "food2", "verb2", "verb3", "food3", "verb4", "verb5", "adverb", "adjective4"]
    },
    {
      title: "The Food Truck Festival",
      template: "The {adjective1} food truck festival was amazing! I tried {adjective2} {food1} from the {color} truck, then {verb1} over to get some {food2} that was {adjective3}. The best vendor was {verb2} {adjective4} {food3} that tasted like {adjective5} {noun}. By the end of the day, I was so {adjective6} that I could barely {verb3} home!",
      prompts: ["adjective1", "adjective2", "food1", "color", "verb1", "food2", "adjective3", "verb2", "adjective4", "food3", "adjective5", "noun", "adjective6", "verb3"]
    }
  ],
  school: [
    {
      title: "The Test Day Surprise",
      template: "Today we had a {adjective1} test in {subject} class. I studied for {number} hours, but I forgot my {school_supply}! My teacher, {teacher_name}, told us to {verb1} quietly while she {verb2} the test papers. Question number {number2} was about {adjective2} {noun1}, which made me {verb3}. When I finished, I felt so {adjective3} that I {verb4} all the way to {place}!",
      prompts: ["adjective1", "subject", "number", "school_supply", "teacher_name", "verb1", "verb2", "number2", "adjective2", "noun1", "verb3", "adjective3", "verb4", "place"]
    },
    {
      title: "School Field Trip",
      template: "Our class went on a {adjective1} field trip to the {place}. We {verb1} on a {adjective2} bus for {number} minutes. When we arrived, the tour guide showed us {adjective3} {noun1} and explained how they {verb2}. My friend {name} accidentally {verb3} into the {noun2}, which made everyone {verb4}. It was the most {adjective4} trip ever!",
      prompts: ["adjective1", "place", "verb1", "adjective2", "number", "adjective3", "noun1", "verb2", "name", "verb3", "noun2", "verb4", "adjective4"]
    },
    {
      title: "The Science Fair Project",
      template: "For the science fair, I built a {adjective1} volcano that could {verb1} {color} lava! I mixed {noun1} with {adjective2} {noun2} to create the {adjective3} reaction. When I {verb2} the mixture, it {verb3} everywhere and covered {number} students! The judges were so {adjective4} that they gave me a {adjective5} ribbon. My {family_member} was {verb4} with pride!",
      prompts: ["adjective1", "verb1", "color", "noun1", "adjective2", "noun2", "adjective3", "verb2", "verb3", "number", "adjective4", "adjective5", "family_member", "verb4"]
    },
    {
      title: "Library Adventure",
      template: "In the {adjective1} school library, I was looking for a book about {adjective2} {noun1}. The librarian {verb1} me to the {adjective3} section where I found {number} interesting books. I {verb2} one about a {adjective4} {animal} who could {verb3}. While reading, I accidentally {verb4} so loudly that everyone {verb5}. The librarian gave me a {adjective5} look!",
      prompts: ["adjective1", "adjective2", "noun1", "verb1", "adjective3", "number", "verb2", "adjective4", "animal", "verb3", "verb4", "verb5", "adjective5"]
    },
    {
      title: "Cafeteria Chaos",
      template: "Lunchtime in the {adjective1} cafeteria is always {adjective2}! Today they served {adjective3} {food1} with a side of {food2}. I was {verb1} to my table when I {verb2} and my {food3} went {verb3} across the room. It landed on {name}'s {noun}, and they {verb4} in surprise. The lunch lady just {verb5} and gave me another {adjective4} helping!",
      prompts: ["adjective1", "adjective2", "adjective3", "food1", "food2", "verb1", "verb2", "food3", "verb3", "name", "noun", "verb4", "verb5", "adjective4"]
    }
  ],
  "gross out": [
    {
      title: "The Sticky Situation",
      template: "I was {verb1} through the {adjective1} basement when I stepped in something {adjective2}! It was {color} and {adjective3}, and it {verb2} like {adjective4} {food}. When I tried to {verb3} my foot out, it made a {adjective5} squelching sound. My {body_part} was covered in the {adjective6} goo, and I had to {verb4} all the way to the {noun} to clean it off!",
      prompts: ["verb1", "adjective1", "adjective2", "color", "adjective3", "verb2", "adjective4", "food", "verb3", "adjective5", "body_part", "adjective6", "verb4", "noun"]
    },
    {
      title: "The Mystery Lunch",
      template: "The cafeteria served a {adjective1} mystery meat today. It was {color} and {verb1} on my plate. When I {verb2} it, it tasted like {adjective2} {noun1} mixed with {adjective3} {liquid}. The texture was so {adjective4} that I almost {verb3}! My friend dared me to eat {number} bites, but I could only {verb4} down {number2} before I had to {verb5} to the bathroom!",
      prompts: ["adjective1", "color", "verb1", "verb2", "adjective2", "noun1", "adjective3", "liquid", "adjective4", "verb3", "number", "verb4", "number2", "verb5"]
    },
    {
      title: "The Garbage Day Disaster",
      template: "On {adjective1} garbage day, I had to {verb1} the {adjective2} trash cans to the curb. One bag was {verb2} and smelled like {adjective3} {food}. When I {verb3} it up, the bottom {verb4} open and {adjective4} garbage {verb5} everywhere! There were {noun1} covered in {adjective5} {liquid}, and a {adjective6} {noun2} that made me {verb6}!",
      prompts: ["adjective1", "verb1", "adjective2", "verb2", "adjective3", "food", "verb3", "verb4", "adjective4", "verb5", "noun1", "adjective5", "liquid", "adjective6", "noun2", "verb6"]
    },
    {
      title: "The Swamp Exploration",
      template: "Exploring the {adjective1} swamp was {adjective2}! I {verb1} through {adjective3} mud that came up to my {body_part}. Strange {color} bubbles were {verb2} on the surface, and the water smelled like {adjective4} {noun1}. When I {verb3} a stick into the {adjective5} water, something {adjective6} {verb4} out and {verb5} on my {noun2}!",
      prompts: ["adjective1", "adjective2", "verb1", "adjective3", "body_part", "color", "verb2", "adjective4", "noun1", "verb3", "adjective5", "adjective6", "verb4", "verb5", "noun2"]
    },
    {
      title: "The Dirty Laundry",
      template: "I found some {adjective1} socks under my {noun1} that had been there for {number} weeks! They were {color} and {adjective2}, and when I {verb1} them, they felt {adjective3}. The smell was like {adjective4} {food} mixed with {adjective5} {noun2}. I had to {verb2} them to the washing machine while {verb3} through my {body_part}. Even after washing, they still {verb4}!",
      prompts: ["adjective1", "noun1", "number", "color", "adjective2", "verb1", "adjective3", "adjective4", "food", "adjective5", "noun2", "verb2", "verb3", "body_part", "verb4"]
    }
  ],
  technology: [
    {
      title: "The Robot Helper",
      template: "My new {adjective1} robot can {verb1} the house and {verb2} my homework! It has {number} {adjective2} buttons and a {color} screen that {verb3} when it's {adjective3}. Today it accidentally {verb4} my {noun1} and started {verb5} around the {noun2}. I had to {verb6} the {adjective4} manual to figure out how to make it {verb7} properly!",
      prompts: ["adjective1", "verb1", "verb2", "number", "adjective2", "color", "verb3", "adjective3", "verb4", "noun1", "verb5", "noun2", "verb6", "adjective4", "verb7"]
    },
    {
      title: "Video Game Adventure",
      template: "In my favorite {adjective1} video game, I play as a {adjective2} {character} who can {verb1} through {adjective3} levels. My character has a {adjective4} {weapon} that can {verb2} enemies from {number} feet away. The final boss is a {adjective5} {monster} that {verb3} and {verb4}. To win, I have to {verb5} the {adjective6} {object} and {verb6} it at the monster's {body_part}!",
      prompts: ["adjective1", "adjective2", "character", "verb1", "adjective3", "adjective4", "weapon", "verb2", "number", "adjective5", "monster", "verb3", "verb4", "verb5", "adjective6", "object", "verb6", "body_part"]
    },
    {
      title: "The Smartphone Malfunction",
      template: "My {adjective1} smartphone started {verb1} this morning! Every time I tried to {verb2} someone, it would {verb3} and make {adjective2} sounds. The screen turned {color} and showed {number} {adjective3} {noun1}. When I {verb4} the {adjective4} button, it started {verb5} my {adjective5} photos and {verb6} them to {name}!",
      prompts: ["adjective1", "verb1", "verb2", "verb3", "adjective2", "color", "number", "adjective3", "noun1", "verb4", "adjective4", "verb5", "adjective5", "verb6", "name"]
    },
    {
      title: "Computer Class Chaos",
      template: "In {adjective1} computer class, we learned how to {verb1} a {adjective2} website. I was {verb2} when my computer started {verb3} and the screen showed {number} {color} {noun1}. The teacher came over and {verb4} the {adjective3} keyboard, but that made it {verb5} even more! Everyone's computers started {verb6} at the same time - it was {adjective4}!",
      prompts: ["adjective1", "verb1", "adjective2", "verb2", "verb3", "number", "color", "noun1", "verb4", "adjective3", "verb5", "verb6", "adjective4"]
    },
    {
      title: "The Internet Search",
      template: "I was {verb1} the internet for information about {adjective1} {noun1} when something {adjective2} happened. My browser started {verb2} to {number} different websites about {adjective3} {noun2}. Pop-ups were {verb3} everywhere showing {adjective4} {noun3}. I tried to {verb4} the {adjective5} window, but my computer just {verb5} and played {adjective6} music!",
      prompts: ["verb1", "adjective1", "noun1", "adjective2", "verb2", "number", "adjective3", "noun2", "verb3", "adjective4", "noun3", "verb4", "adjective5", "verb5", "adjective6"]
    }
  ],
  "kids tv and movies": [
    {
      title: "My Favorite Cartoon",
      template: "My favorite cartoon character is a {adjective1} {animal} named {name} who lives in a {adjective2} {place}. Every episode, {name} has to {verb1} the {adjective3} villain who wants to {verb2} all the {noun1} in the world. {name} uses a {adjective4} {object} to {verb3} and always says '{exclamation}!' when {verb4}. The show teaches kids to be {adjective5} and to always {verb5} others!",
      prompts: ["adjective1", "animal", "name", "adjective2", "place", "verb1", "adjective3", "verb2", "noun1", "adjective4", "object", "verb3", "exclamation", "verb4", "adjective5", "verb5"]
    },
    {
      title: "The Movie Theater Experience",
      template: "At the {adjective1} movie theater, we watched a {adjective2} film about a {character} who could {verb1}. I brought {adjective3} {snack} and {liquid} to {verb2} during the movie. The best part was when the {character} {verb3} the {adjective4} {villain} and everyone in the theater {verb4}. The {adjective5} special effects made it feel like {noun} were {verb5} right at us!",
      prompts: ["adjective1", "adjective2", "character", "verb1", "adjective3", "snack", "liquid", "verb2", "verb3", "adjective4", "villain", "verb4", "adjective5", "noun", "verb5"]
    },
    {
      title: "Saturday Morning Cartoons",
      template: "Every {day_of_week} morning, I {verb1} up early to watch {adjective1} cartoons. My favorite show is about {number} {adjective2} friends who {verb2} around the {place} solving {adjective3} mysteries. They have a {adjective4} {vehicle} that can {verb3} and a {adjective5} {pet} that always {verb4}. When the show ends, I always {verb5} because I want to {verb6} more episodes!",
      prompts: ["day_of_week", "verb1", "adjective1", "number", "adjective2", "verb2", "place", "adjective3", "adjective4", "vehicle", "verb3", "adjective5", "pet", "verb4", "verb5", "verb6"]
    },
    {
      title: "The Superhero Movie",
      template: "The new superhero movie was {adjective1}! The hero could {verb1} faster than a {adjective2} {vehicle} and {verb2} buildings with one {body_part}. The villain was a {adjective3} {character} who wanted to {verb3} the entire {place}. In the final battle, they {verb4} for {number} minutes while {adjective4} {noun} {verb5} everywhere. When the hero won, everyone {verb6} and cheered!",
      prompts: ["adjective1", "verb1", "adjective2", "vehicle", "verb2", "body_part", "adjective3", "character", "verb3", "place", "verb4", "number", "adjective4", "noun", "verb5", "verb6"]
    },
    {
      title: "The Disney Adventure",
      template: "At the {adjective1} theme park, I met my favorite {adjective2} character who could {verb1} and {verb2}! We took a {adjective3} photo together and they {verb3} my {noun1}. The best ride was the {adjective4} {ride_name} where we {verb4} through a {adjective5} {place} and saw {number} {adjective6} {noun2}. I was so {adjective7} that I {verb5} all day long!",
      prompts: ["adjective1", "adjective2", "verb1", "verb2", "adjective3", "verb3", "noun1", "adjective4", "ride_name", "verb4", "adjective5", "place", "number", "adjective6", "noun2", "adjective7", "verb5"]
    }
  ],
  family: [
    {
      title: "Family Game Night",
      template: "Every {day_of_week}, our family has a {adjective1} game night! We play {adjective2} board games and {verb1} until someone {verb2}. My {family_member1} always {verb3} when they lose, and my {family_member2} {verb4} whenever they win. Last week, we played a game where you have to {verb5} {number} {noun1} and {verb6} like a {adjective3} {animal}. Everyone was {verb7} so hard!",
      prompts: ["day_of_week", "adjective1", "adjective2", "verb1", "verb2", "family_member1", "verb3", "family_member2", "verb4", "verb5", "number", "noun1", "verb6", "adjective3", "animal", "verb7"]
    },
    {
      title: "The Family Vacation",
      template: "Our {adjective1} family vacation to {place} was {adjective2}! We {verb1} for {number} hours in our {adjective3} {vehicle}. When we arrived, we stayed in a {adjective4} hotel that had a {adjective5} {noun1} and {number2} {noun2}. My favorite part was when we {verb2} at the {adjective6} beach and {verb3} in the {adjective7} water. Dad {verb4} his {noun3} and Mom {verb5} the whole time!",
      prompts: ["adjective1", "place", "adjective2", "verb1", "number", "adjective3", "vehicle", "adjective4", "adjective5", "noun1", "number2", "noun2", "verb2", "adjective6", "verb3", "adjective7", "verb4", "noun3", "verb5"]
    },
    {
      title: "Thanksgiving Dinner",
      template: "Thanksgiving dinner at {family_member}'s house was {adjective1}! We had a {adjective2} turkey that weighed {number} pounds and {adjective3} {food1}. Uncle {name} {verb1} so much {food2} that he {verb2} and fell asleep on the {adjective4} {furniture}. Grandma's {adjective5} {dessert} was so {adjective6} that everyone {verb3} for seconds. After dinner, we all {verb4} and {verb5} together!",
      prompts: ["family_member", "adjective1", "adjective2", "number", "adjective3", "food1", "name", "verb1", "food2", "verb2", "adjective4", "furniture", "adjective5", "dessert", "adjective6", "verb3", "verb4", "verb5"]
    },
    {
      title: "Sibling Rivalry",
      template: "My {adjective1} sibling is always {verb1} my {noun1}! Yesterday, they {verb2} into my room and {verb3} my {adjective2} {noun2}. When I tried to {verb4} it back, they {verb5} and ran to {family_member}. Mom said we had to {verb6} nicely and share our {adjective3} {noun3}. But I know my sibling will just {verb7} it again when no one is {verb8}!",
      prompts: ["adjective1", "verb1", "noun1", "verb2", "verb3", "adjective2", "noun2", "verb4", "verb5", "family_member", "verb6", "adjective3", "noun3", "verb7", "verb8"]
    },
    {
      title: "Family Chores",
      template: "Mom gave everyone {adjective1} chores to do around the house. I had to {verb1} the {adjective2} {room} and {verb2} all the {noun1}. My {family_member} had to {verb3} the {adjective3} {noun2} and {verb4} the {appliance}. Dad's job was to {verb5} the {adjective4} yard and {verb6} the {noun3}. When we finished, Mom made {adjective5} {food} for everyone!",
      prompts: ["adjective1", "verb1", "adjective2", "room", "verb2", "noun1", "family_member", "verb3", "adjective3", "noun2", "verb4", "appliance", "verb5", "adjective4", "verb6", "noun3", "adjective5", "food"]
    }
  ],
  vehicles: [
    {
      title: "The Race Car Adventure",
      template: "I climbed into the {adjective1} race car and {verb1} the {adjective2} steering wheel. The engine {verb2} as I {verb3} down the {adjective3} track at {number} miles per hour! Other {adjective4} cars were {verb4} past me, but I {verb5} the gas pedal and {verb6} ahead. The crowd was {verb7} as I crossed the {adjective5} finish line and won the {adjective6} trophy!",
      prompts: ["adjective1", "verb1", "adjective2", "verb2", "verb3", "adjective3", "number", "adjective4", "verb4", "verb5", "verb6", "verb7", "adjective5", "adjective6"]
    },
    {
      title: "The Flying Machine",
      template: "My {adjective1} invention is a {vehicle} that can {verb1} through the {adjective2} sky! It has {number} {adjective3} wings and a {adjective4} propeller that {verb2} when it {verb3}. To start it, I have to {verb4} the {adjective5} button and {verb5} the {noun}. Yesterday, I {verb6} it to {place} and everyone {verb7} in amazement!",
      prompts: ["adjective1", "vehicle", "verb1", "adjective2", "number", "adjective3", "adjective4", "verb2", "verb3", "verb4", "adjective5", "verb5", "noun", "verb6", "place", "verb7"]
    },
    {
      title: "The Motorcycle Journey",
      template: "Riding my {adjective1} motorcycle through the {adjective2} countryside was {adjective3}! The wind was {verb1} through my {noun1} as I {verb2} around {adjective4} curves. I stopped at a {adjective5} gas station where the owner {verb3} me about the {adjective6} road ahead. He warned me about {number} {adjective7} {noun2} that might {verb4} in front of my bike!",
      prompts: ["adjective1", "adjective2", "adjective3", "verb1", "noun1", "verb2", "adjective4", "adjective5", "verb3", "adjective6", "number", "adjective7", "noun2", "verb4"]
    },
    {
      title: "The Submarine Exploration",
      template: "Deep underwater in my {adjective1} submarine, I could see {adjective2} fish {verb1} past the {adjective3} windows. The submarine {verb2} down to {number} feet below the surface where {adjective4} {sea_creature} were {verb3}. Suddenly, the {adjective5} sonar started {verb4} and I saw a {adjective6} {noun} on the ocean floor. I {verb5} the controls to {verb6} closer!",
      prompts: ["adjective1", "adjective2", "verb1", "adjective3", "verb2", "number", "adjective4", "sea_creature", "verb3", "adjective5", "verb4", "adjective6", "noun", "verb5", "verb6"]
    },
    {
      title: "The Space Rocket",
      template: "3, 2, 1, blast off! My {adjective1} rocket {verb1} into the {adjective2} space carrying {number} {adjective3} astronauts. We {verb2} past {adjective4} planets and {adjective5} stars that {verb3} like {adjective6} {noun1}. When we landed on {planet}, we {verb4} out and {verb5} the {adjective7} surface. We collected {number2} samples of {adjective8} {noun2} to bring back to Earth!",
      prompts: ["adjective1", "verb1", "adjective2", "number", "adjective3", "verb2", "adjective4", "adjective5", "verb3", "adjective6", "noun1", "planet", "verb4", "verb5", "adjective7", "number2", "adjective8", "noun2"]
    }
  ],
  pirates: [
    {
      title: "The Treasure Hunt",
      template: "Ahoy matey! Captain {name} and his {adjective1} crew were {verb1} for the {adjective2} treasure buried on {adjective3} Island. They had a {adjective4} map that showed {number} steps from the {adjective5} {noun1} to where the {adjective6} treasure chest was {verb2}. When they {verb3} it up, it was full of {adjective7} {noun2} and {number2} {adjective8} coins!",
      prompts: ["name", "adjective1", "verb1", "adjective2", "adjective3", "adjective4", "number", "adjective5", "noun1", "adjective6", "verb2", "verb3", "adjective7", "noun2", "number2", "adjective8"]
    },
    {
      title: "The Pirate Ship Battle",
      template: "The {adjective1} pirate ship {verb1} across the {adjective2} ocean with its {adjective3} sails {verb2} in the wind. Captain {name} {verb3} through his {adjective4} telescope and spotted {number} enemy ships {verb4} toward them. 'Fire the {adjective5} cannons!' he {verb5}. The crew {verb6} and {adjective6} cannonballs {verb7} through the air!",
      prompts: ["adjective1", "verb1", "adjective2", "adjective3", "verb2", "name", "verb3", "adjective4", "number", "verb4", "adjective5", "verb5", "verb6", "adjective6", "verb7"]
    },
    {
      title: "Life on a Pirate Ship",
      template: "Being a {adjective1} pirate is {adjective2}! Every morning, I {verb1} up the {adjective3} mast and {verb2} for {adjective4} ships on the horizon. For breakfast, we eat {adjective5} {food} and drink {adjective6} {liquid}. The ship's {adjective7} parrot can {verb3} and always says '{exclamation}!' When storms come, we {verb4} and {verb5} until the {adjective8} weather passes!",
      prompts: ["adjective1", "adjective2", "verb1", "adjective3", "verb2", "adjective4", "adjective5", "food", "adjective6", "liquid", "adjective7", "verb3", "exclamation", "verb4", "verb5", "adjective8"]
    },
    {
      title: "The Pirate's Pet",
      template: "My pirate pet is a {adjective1} {animal} named {name} who can {verb1} and {verb2}! Every day, {name} {verb3} around the ship and {verb4} the {adjective2} crew. When we find treasure, {name} always {verb5} and {verb6} with excitement. The best trick {name} can do is {verb7} on one {body_part} while {verb8} like a {adjective3} {noun}!",
      prompts: ["adjective1", "animal", "name", "verb1", "verb2", "verb3", "verb4", "adjective2", "verb5", "verb6", "verb7", "body_part", "verb8", "adjective3", "noun"]
    },
    {
      title: "The Pirate Code",
      template: "All {adjective1} pirates must follow the {adjective2} Pirate Code! Rule number one: Always {verb1} your {adjective3} captain. Rule number two: Never {verb2} the {adjective4} treasure map. Rule number three: {verb3} the ship's {adjective5} {noun1} every day. If a pirate breaks these rules, they must {verb4} the plank and {verb5} with the {adjective6} {sea_creature} for {number} days!",
      prompts: ["adjective1", "adjective2", "verb1", "adjective3", "verb2", "adjective4", "verb3", "adjective5", "noun1", "verb4", "verb5", "adjective6", "sea_creature", "number"]
    }
  ],
  holidays: [
    {
      title: "Halloween Night",
      template: "On {adjective1} Halloween night, I dressed up as a {adjective2} {character} and went {verb1} for candy. My costume had {number} {adjective3} {noun1} and a {adjective4} {noun2} that {verb2} when I {verb3}. At each house, I would {verb4} and say '{exclamation}!' The best house gave out {adjective5} {candy} that tasted like {adjective6} {food}!",
      prompts: ["adjective1", "adjective2", "character", "verb1", "number", "adjective3", "noun1", "adjective4", "noun2", "verb2", "verb3", "verb4", "exclamation", "adjective5", "candy", "adjective6", "food"]
    },
    {
      title: "Christmas Morning",
      template: "Christmas morning was {adjective1}! I {verb1} downstairs and saw {number} {adjective2} presents under the {adjective3} Christmas tree. The biggest present was {adjective4} and {verb2} when I {verb3} it. Inside was a {adjective5} {toy} that could {verb4} and {verb5}! Mom made {adjective6} {food} for breakfast while Dad {verb6} and {adjective7} Christmas music played!",
      prompts: ["adjective1", "verb1", "number", "adjective2", "adjective3", "adjective4", "verb2", "verb3", "adjective5", "toy", "verb4", "verb5", "adjective6", "food", "verb6", "adjective7"]
    },
    {
      title: "Fourth of July Celebration",
      template: "The Fourth of July celebration was {adjective1}! We {verb1} to the {adjective2} park where {number} families were {verb2}. Everyone brought {adjective3} food to share, and we played {adjective4} games like {game}. When it got dark, the {adjective5} fireworks {verb3} in the sky and made {adjective6} sounds. Everyone {verb4} and {verb5} as the {color} lights {verb6} overhead!",
      prompts: ["adjective1", "verb1", "adjective2", "number", "verb2", "adjective3", "adjective4", "game", "adjective5", "verb3", "adjective6", "verb4", "verb5", "color", "verb6"]
    },
    {
      title: "Easter Egg Hunt",
      template: "The {adjective1} Easter egg hunt in the {adjective2} backyard was {adjective3}! I {verb1} around looking for {adjective4} eggs hidden behind {noun1} and under {adjective5} {noun2}. I found {number} eggs filled with {adjective6} {candy}. The {adjective7} golden egg was hidden in the {adjective8} {noun3} and had a {adjective9} {prize} inside. Everyone {verb2} when I {verb3} it!",
      prompts: ["adjective1", "adjective2", "adjective3", "verb1", "adjective4", "noun1", "adjective5", "noun2", "number", "adjective6", "candy", "adjective7", "adjective8", "noun3", "adjective9", "prize", "verb2", "verb3"]
    },
    {
      title: "Thanksgiving Parade",
      template: "The {adjective1} Thanksgiving parade was {adjective2}! Giant {adjective3} balloons shaped like {character1} and {character2} {verb1} down the street. Marching bands were {verb2} {adjective4} music and {verb3} in {adjective5} uniforms. My favorite float had {number} {adjective6} {noun1} and a {adjective7} {noun2} that {verb4}. Everyone was {verb5} and {verb6} from the {adjective8} sidewalks!",
      prompts: ["adjective1", "adjective2", "adjective3", "character1", "character2", "verb1", "verb2", "adjective4", "verb3", "adjective5", "number", "adjective6", "noun1", "adjective7", "noun2", "verb4", "verb5", "verb6", "adjective8"]
    }
  ],
  space: [
    {
      title: "Mission to Mars",
      template: "Our {adjective1} mission to Mars was {adjective2}! The rocket {verb1} for {number} days through the {adjective3} space filled with {adjective4} stars. When we landed on the {color} planet, we saw {adjective5} craters and {adjective6} {noun1} everywhere. Our {adjective7} space suits helped us {verb2} on the surface while we {verb3} for signs of {adjective8} life!",
      prompts: ["adjective1", "adjective2", "verb1", "number", "adjective3", "adjective4", "color", "adjective5", "adjective6", "noun1", "adjective7", "verb2", "verb3", "adjective8"]
    },
    {
      title: "Alien Encounter",
      template: "I was {verb1} through space when I saw a {adjective1} UFO {verb2} toward my ship! Inside were {number} {adjective2} aliens with {adjective3} {body_part} and {color} skin. They could {verb3} and {verb4} in a {adjective4} language. The aliens showed me their {adjective5} {noun1} and taught me how to {verb5}. When they left, they {verb6} and said '{exclamation}!' in perfect English!",
      prompts: ["verb1", "adjective1", "verb2", "number", "adjective2", "adjective3", "body_part", "color", "verb3", "verb4", "adjective4", "adjective5", "noun1", "verb5", "verb6", "exclamation"]
    },
    {
      title: "Space Station Life",
      template: "Living on the {adjective1} space station is {adjective2}! Every morning, I {verb1} in zero gravity and {verb2} my {adjective3} breakfast that {verb3} around the room. The view of {planet} is {adjective4} with {adjective5} clouds and {color} oceans. Today we conducted {number} {adjective6} experiments and {verb4} with the {adjective7} robots that {verb5} around the station!",
      prompts: ["adjective1", "adjective2", "verb1", "verb2", "adjective3", "verb3", "planet", "adjective4", "adjective5", "color", "number", "adjective6", "verb4", "adjective7", "verb5"]
    },
    {
      title: "The Black Hole Adventure",
      template: "Our {adjective1} spaceship was {verb1} toward a {adjective2} black hole! The gravity was so {adjective3} that everything started to {verb2} and {verb3}. Time began to {verb4} and I could see {adjective4} lights {verb5} around us. Captain {name} {verb6} the {adjective5} controls and we {verb7} away just in time! The experience was so {adjective6} that we all {verb8}!",
      prompts: ["adjective1", "verb1", "adjective2", "adjective3", "verb2", "verb3", "verb4", "adjective4", "verb5", "name", "verb6", "adjective5", "verb7", "adjective6", "verb8"]
    },
    {
      title: "Asteroid Mining",
      template: "Our job was to {verb1} valuable {noun1} from the {adjective1} asteroid belt. We {verb2} our {adjective2} mining ship through {number} floating {adjective3} rocks. Each asteroid contained {adjective4} {mineral} that {verb3} when exposed to {adjective5} light. We collected {number2} tons of {adjective6} materials and {verb4} them back to the {adjective7} space colony where everyone {verb5}!",
      prompts: ["verb1", "noun1", "adjective1", "verb2", "adjective2", "number", "adjective3", "adjective4", "mineral", "verb3", "adjective5", "number2", "adjective6", "verb4", "adjective7", "verb5"]
    }
  ]
};

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
