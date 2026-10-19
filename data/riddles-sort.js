// Which riddles are real riddles, and how hard (sorted by hand, Oct 2026). games/riddles.html plays only these;
// the others (plain descriptions and trivia) stay in the packs so past dailies and history still show them.
//   tier  {id: 1|2|3}: 1 = quick (an adult gets it in seconds), 2 = needs real thought, 3 = hard (Sphinx level)
//   daily the daily riddle's frozen lists from day 1024 (Tue 20 Oct 2026), one per tier (RiddleDaily in
//         data/riddles.js: Mon-Tue tier 1, Wed-Fri tier 2, Sat-Sun tier 3). Never reorder or edit these lists:
//         each day's riddle is read from them. To bring new riddles into the daily, start new lists from a future
//         day and leave every earlier day alone. Riddles with a doubtful answer are left out of the daily.
(function (root) { root.RIDDLE_SORT = {
  tier: {"piano":1,"clock":1,"towel":1,"coin":1,"age":1,"name":1,"sponge":1,"stairs":1,"eye":1,"bottle":1,"map":1,"river":1,"book":1,"glove":1,"mushroom":2,"stamp":2,"library":1,"shoe":1,"hole":1,"silence":1,"outside":1,"onion":1,"shirt":1,"watermelon":1,"mirror":1,"hair":1,"sphinx":3,"candle":2,"needle":2,"teeth":2,"tree":1,"icicle":2,"rainbow":1,"mist":2,"footsteps":2,"teapot":2,"incorrectly":1,"garbagetruck":2,"letterw":2,"lunch":1,"dictionary":2,"deck":1,"bank":2,"anchor":2,"fire":1,"keyboard":1,"bald":1,"cloud":1,"envelope":1,"chick":2,"generations":2,"friday":2,"feathers":1,"sunflower":1,"earring":1,"alphabet":2,"secret":1,"time":1,"mary":1,"rooster":1,"mississippi":2,"samson":3,"vowels":3,"year":2,"lice":3,"bookworm":2,"swan":3,"stives":2,"elizabeth":2,"walnut":3,"sunshine":3,"bed":2,"pencillead":2,"coffin":2,"eight":2,"short":2,"queue":2,"starting":3,"seven":2,"eleven":1,"monopoly":3,"smiles":2,"lettere":2,"nothing":2,"carpet":1,"tomorrow":2,"ice":2,"bark":2,"umbrella":2,"corn":2,"p1-chair":1,"p1-teabag":1,"p1-nail":1,"p1-doormat":1,"p1-mailbox":1,"p1-fence":1,"p1-hose":1,"p1-bookmark":1,"p1-wrappingpaper":1,"p1-recipe":1,"p1-hotdog":1,"p1-jellybean":1,"p1-phone":1,"p1-button":1,"p1-broom":2,"p1-tap":1,"p1-shower":1,"p1-toilet":1,"p1-doorknob":1,"p1-soap":1,"p1-zipper":1,"p1-hanger":1,"p1-pillow":1,"p1-napkin":1,"p1-hammock":1,"p1-cupboard":1,"p1-sandwich":1,"p1-pineapple":1,"p1-doughnut":1,"p1-ajar":2,"p1-paint":2,"p1-charcoal":2,"p1-blackboard":2,"p1-paper":2,"p1-ruler":1,"p1-slippers":1,"p1-lettuce":2,"p1-pear":1,"p1-leek":1,"p1-cashew":1,"p1-chocolate":2,"p1-jam":1,"p1-blueberry":1,"p1-livingroom":2,"p1-plumpudding":3,"p1-tongs":3,"p1-sieve":2,"p1-blackberry":2,"p1-drawer":1,"p1-artichoke":2,"p1-eggplant":1,"p1-rubberband":1,"p1-bottomrung":2,"p1-calendar":1,"p1-hourglass":1,"p1-thimble":2,"p1-rollingpin":1,"p1-bookcase":1,"p1-wardrobe":1,"p1-keyhole":1,"p1-meatball":1,"p1-saucepan":1,"p1-jigsaw":1,"p1-bandage":1,"p1-ketchup":1,"p1-peanut":2,"p1-beet":1,"p1-match":1,"p1-nostairs":1,"p1-cabbage":3,"p1-wateringcan":1,"p1-rake":2,"p1-saw":1,"p1-clothespin":1,"p1-salad":2,"p1-trousers":2,"p1-mittens":2,"p1-shoelace":1,"p1-yoyo":1,"p1-dice":1,"p1-lightbulb":1,"p1-newspaper":1,"p1-chessboard":1,"p1-chimney":3,"p1-egg":2,"p1-wheelbarrow":2,"p1-lamp":1,"p1-floor":1,"p1-photo":1,"p1-grater":1,"p1-playpen":1,"p1-wheat":1,"p2-mouth":1,"p2-tongue":2,"p2-nose":1,"p2-thumb":1,"p2-peacock":1,"p2-starfish":1,"p2-seahorse":1,"p2-grasshopper":1,"p2-dragonfly":1,"p2-cocoon":1,"p2-spiderweb":1,"p2-seaweed":1,"p2-seed":1,"p2-hurricane":1,"p2-wind":3,"p2-dew":3,"p2-earth":1,"p2-earthquake":1,"p2-valley":1,"p2-bluebird":1,"p2-kitten":1,"p2-snowdrop":1,"p2-bluebell":1,"p2-buttercup":1,"p2-anthill":1,"p2-rainforest":1,"p2-eyebrows":1,"p2-oyster":2,"p2-cuckoo":2,"p2-fish":2,"p2-star":3,"p2-coal":2,"p2-snow":3,"p2-nettle":3,"p2-parrot":1,"p2-beehive":2,"p2-lap":2,"p2-cold":1,"p2-legs":2,"p2-breath":2,"p2-elbow":2,"p2-kidney":1,"p2-antelope":1,"p2-earwig":1,"p2-kingfisher":1,"p2-foxglove":1,"p2-palm":1,"p2-puffin":1,"p2-adder":1,"p2-monkey":1,"p2-nightday":2,"p2-horizon":1,"p2-darkness":1,"p2-halfway":2,"p2-anyanimal":2,"p2-moses":2,"p2-wet":2,"p2-season":1,"p2-voice":2,"p2-dream":1,"p2-water":1,"p2-spark":1,"p2-forest":1,"p2-stump":1,"p2-tulip":1,"p2-eyelids":1,"p2-blink":2,"p3-letter-b":1,"p3-letter-c":1,"p3-letter-d":2,"p3-letter-g":2,"p3-letter-h":2,"p3-letter-i":1,"p3-letter-j":1,"p3-letter-m":2,"p3-letter-n":2,"p3-letter-p":2,"p3-letter-t":2,"p3-letter-u":1,"p3-letter-y":1,"p3-mt":1,"p3-nv":1,"p3-icu":1,"p3-swims":1,"p3-wow":1,"p3-stressed":1,"p3-ton":2,"p3-ten":1,"p3-now":1,"p3-heroine":1,"p3-underground":1,"p3-listen":2,"p3-habit":1,"p3-dozens":2,"p3-initials":1,"p3-friendship":1,"p3-understand":1,"p3-forget":1,"p3-together":2,"p3-mistake":1,"p3-day":1,"p3-after":1,"p3-break":1,"p3-home":1,"p3-every":1,"p3-minute":1,"p3-present":1,"p3-two":1,"p3-socks":2,"p3-four":1,"p3-five":1,"p3-sixminutes":2,"p3-nine":1,"p3-twelve":1,"p3-sixteen":2,"p3-romannumerals":2,"p3-forty":2,"p3-seventy":2,"p3-housenumbers":2,"p3-secondplace":1,"p3-bighands":1,"p3-once":1,"p3-clockstrike":2,"p3-triplets":1,"p3-february":1,"p3-december":1,"p3-today":1,"p3-threedays":1,"p3-leapday":2,"p3-stoppedclock":1,"p3-someday":1,"p3-daytime":2,"p3-sleepsatnight":1,"p3-promise":1,"p3-rumour":1,"p3-advice":2,"p3-memory":1,"p3-attention":1,"p3-trust":1,"p3-temper":1,"p3-news":1,"p3-imagination":1,"p3-thought":1,"p3-grudge":2,"p3-opinion":1,"p3-conversation":1,"p3-mystery":1,"p3-stopimagining":2,"p3-married":2,"p3-myson":3,"p3-baby":2,"p3-asleep":2,"p3-reachbutton":3,"p3-thirtyfive":1,"p3-backtoback":1,"p3-strengths":2,"p3-cu":1,"p3-oic":1,"p3-pronunciation":1,"p3-misspell":1,"p3-lisp":2,"p3-live":1,"p4-barber":1,"p4-swimmingpool":1,"p4-electrician":1,"p4-carpenter":1,"p4-photographer":1,"p4-waiter":1,"p4-cobbler":1,"p4-bowling":1,"p4-spinningtop":1,"p4-bell":1,"p4-test":1,"p4-telescope":1,"p4-internet":1,"p4-compass":1,"p4-skyscraper":1,"p4-prison":1,"p4-hungary":1,"p4-norway":1,"p4-steeringwheel":1,"p4-sparetire":1,"p4-knight":1,"p4-cinderella":2,"p4-basketball":1,"p4-baseball":1,"p4-shuttlecock":1,"p4-computer":1,"p4-wifi":1,"p4-surgeon":2,"p4-electrictrain":1,"p4-busdriver":2,"p4-nobody":2,"p4-pen":3,"p4-ship":3,"p4-well":2,"p4-traindriver":1,"p4-courtship":2,"p4-batter":2,"p4-lyre":1,"p4-cartoon":1,"p4-cargo":1,"p4-passport":1,"p4-sailor":1,"p4-pilot":1,"p4-cowboy":1,"p4-cartwheel":1,"p4-airport":1,"p4-poland":1,"p4-denmark":1,"p4-racket":2,"p4-archery":1,"p4-electricity":1,"p4-canal":1,"p4-northpole":2,"p4-bccoin":2,"p4-organ":1,"p5-shield":3,"p5-sword":3,"p5-chainmail":3,"p5-bow":3,"p5-horn":3,"p5-bellows":3,"p5-weathercock":3,"p5-dough":3,"p5-gold":3,"p5-corkscrew":3,"p5-counterfeit":3,"p5-mule":3,"p5-whetstone":3,"p5-loom":3,"p5-saddle":3,"p5-anvil":3,"p5-fan":3,"p5-seal":3,"p5-pomegranate":3,"p5-mask":3,"p5-blacksmith":3,"p5-churn":3,"p5-ink":3,"p5-road":3,"p5-scythe":3,"p5-moat":3,"p5-windmill":2,"p5-scarecrow":2,"p5-bat":2,"p5-mousetrap":2,"p5-cradle":2,"p5-fishhook":2,"p5-oar":2,"p5-thistle":2,"p5-spinningwheel":2,"p5-signpost":2,"p5-nutcracker":2,"p5-axe":2,"p5-barrel":2,"p5-flag":2,"p5-countryside":3,"p5-mine":3,"p5-club":3,"p5-dormitory":3,"p5-astronomer":3,"p5-pattern":3,"p5-legend":3,"p5-catalogue":3,"p5-earnest":3,"p5-princess":3,"p5-polish":3,"p5-nice":3,"p5-refuse":3,"p5-content":3,"p5-fine":3,"p5-pitch":3,"p5-oversight":3,"p5-left":3,"p5-adrift":3,"p5-elder":3,"p5-knot":3,"p5-funnybone":3,"p5-bound":3,"p5-often":2,"p5-few":2,"p5-scold":2,"p5-carnation":2,"p5-brother":2,"p5-candy":2,"p5-reward":2,"p5-change":2,"p5-dove":2,"p5-longunderwear":2,"p5-radar":2,"p5-aha":2,"p5-harp":2,"p5-fast":2,"p5-deafparrot":3,"p5-wallbuilt":3,"p5-swapcamels":3,"p5-pushcork":3,"p5-lastapple":3,"p5-warmbulb":3,"p5-scruffybarber":3,"p5-pennies":3,"p5-newyearsday":3,"p5-parkedplane":3,"p5-vicar":3,"p5-chessfriends":3,"p5-taxi":3,"p5-looserope":3,"p5-underdoor":3,"p5-sugar":3,"p5-shipladder":3,"p5-lorry":3,"p5-leaves":3,"p5-concrete":3,"p5-buseyes":3,"p5-dryumbrella":2,"p5-cardoor":2,"p5-everest":2,"p5-butcher":2,"p5-exercisebike":2,"p5-workfromhome":2,"p5-wearingglasses":2,"p5-straightup":2,"p5-overtakelast":2,"p5-bigfamily":3,"p5-queue":3,"p5-fenceposts":3,"p5-newyeartwins":3,"p5-twocoins":3,"p5-callsheep":2,"p5-wife":2,"p5-unclesister":2,"p5-nora":2,"p5-thirdsister":2,"p5-scar":3,"p5-crater":3,"p5-delta":3,"p5-treerings":3,"p5-dune":3,"p5-music":3,"p5-word":3,"p5-fear":3,"p5-childhood":3,"p5-border":3,"p5-pride":3,"p5-deadline":3,"p5-orbit":3,"p5-constellation":3,"p5-handshake":3,"p5-stranger":3,"p5-distance":3,"p5-worldrecord":3,"p5-contrail":3,"p5-forgiveness":3,"p5-hindsight":3,"p5-geode":3,"p5-drought":3,"p5-dust":3,"p5-rust":2,"p5-path":2,"p5-sleep":2,"p5-hunger":2,"p5-kiss":2,"p5-blush":2,"p5-fever":2,"p5-debt":2,"p5-antlers":2,"p5-bruise":2,"p5-pollen":2,"p5-wink":2,"p5-shrug":2,"p5-argument":2,"p5-itch":2,"p5-money":2},
  daily: { start: 1024,
    t1: [
      "p1-mailbox", "p4-airport", "earring", "p1-calendar", "p1-yoyo", "p2-dream", "p3-trust", "p1-eggplant", 
      "p3-twelve", "lunch", "p1-ruler", "p4-cartwheel", "p1-bandage", "p1-napkin", "sponge", "p3-letter-y", 
      "p1-button", "p3-promise", "p1-hose", "p4-sailor", "book", "sunflower", "p4-organ", "p1-sandwich", 
      "p3-mystery", "age", "eleven", "p1-wateringcan", "p2-water", "p3-live", "piano", "p4-cowboy", "p2-horizon", 
      "p1-slippers", "bald", "time", "p1-rubberband", "p3-forget", "p1-doormat", "p4-shuttlecock", "p1-dice", 
      "p1-hotdog", "p3-letter-u", "p1-shower", "p2-palm", "p4-spinningtop", "p3-letter-c", "p2-earthquake", 
      "p4-wifi", "p1-rollingpin", "mary", "p1-wheat", "p3-oic", "p4-norway", "p4-bell", "p4-lyre", "p1-hourglass", 
      "p2-valley", "p4-steeringwheel", "p1-saw", "p3-memory", "p3-someday", "p1-bookcase", "p1-hammock", 
      "p2-spiderweb", "p3-news", "glove", "p3-nine", "p4-photographer", "name", "p2-parrot", "p2-antelope", 
      "p3-heroine", "p3-december", "p4-sparetire", "mirror", "p1-clothespin", "p1-pear", "p2-buttercup", "p2-tulip", 
      "p3-friendship", "p3-nv", "p3-five", "p1-ketchup", "p3-bighands", "p4-baseball", "p1-match", "p4-cobbler", 
      "p3-now", "map", "hole", "p3-temper", "p1-shoelace", "p3-underground", "p2-adder", "p2-darkness", 
      "p4-electrician", "p3-mistake", "p4-prison", "rooster", "p4-basketball", "p2-kitten", "p1-recipe", "p3-today", 
      "p3-february", "tree", "p4-swimmingpool", "p2-eyelids", "p4-cargo", "p3-threedays", "p4-barber", "p2-anthill", 
      "p2-thumb", "p3-understand", "p1-nail", "p3-triplets", "outside", "clock", "p1-teabag", "incorrectly", 
      "p1-soap", "p1-bookmark", "library", "p2-seed", "watermelon", "p1-lamp", "keyboard", "p4-waiter", 
      "p3-stoppedclock", "p3-two", "p4-archery", "p2-kidney", "p1-zipper", "p3-letter-i", "cloud", "p2-eyebrows", 
      "p1-doughnut", "eye", "p2-rainforest", "p4-carpenter", "p3-ten", "p1-jellybean", "p4-cartoon", "p1-hanger", 
      "p3-present", "p4-pilot", "p4-hungary", "p1-blueberry", "p1-chessboard", "p4-denmark", "p2-bluebird", 
      "p1-meatball", "p1-lightbulb", "p4-traindriver", "p3-habit", "p3-day", "p2-season", "p4-passport", "p2-puffin", 
      "p4-electrictrain", "p4-test", "p3-letter-j", "p2-seaweed", "p3-wow", "secret", "p4-electricity", "shirt", 
      "p3-misspell", "p3-rumour", "p2-hurricane", "p3-after", "p3-pronunciation", "p4-skyscraper", "p1-saucepan", 
      "p3-stressed", "p3-secondplace", "p2-cold", "coin", "p1-keyhole", "silence", "p1-pillow", "p1-wrappingpaper", 
      "p4-internet", "p3-backtoback", "p4-poland", "p2-dragonfly", "shoe", "p3-conversation", "p1-nostairs", 
      "carpet", "p2-kingfisher", "rainbow", "p4-knight", "p1-doorknob", "p2-mouth", "bottle", "p4-telescope", 
      "p2-stump", "p1-toilet", "p2-seahorse", "p1-drawer", "p3-attention", "p2-cocoon", "p1-cashew", "hair", 
      "p3-letter-b", "p4-bowling", "p2-bluebell", "p1-pineapple", "p1-leek", "p3-every", "p4-compass", "towel", 
      "p1-jigsaw", "stairs", "p2-grasshopper", "p2-earwig", "p3-break", "p2-spark", "p3-four", "p1-tap", "feathers", 
      "p4-canal", "p3-icu", "p3-thought", "p2-peacock", "p1-photo", "deck", "envelope", "p1-fence", "p3-home", 
      "p3-swims", "p1-beet", "p3-cu", "p3-mt", "p3-initials", "p1-floor", "p1-grater", "p3-once", "p1-jam", 
      "p2-foxglove", "p3-minute", "p1-playpen", "p1-phone", "p4-computer", "river", "p2-starfish", "p2-monkey", 
      "p1-cupboard", "p1-wardrobe", "p3-sleepsatnight", "p2-earth", "p3-thirtyfive", "p2-snowdrop", "onion", 
      "p2-forest", "fire"
    ],
    t2: [
      "p3-letter-p", "umbrella", "p5-aha", "p2-breath", "p2-halfway", "p5-harp", "p4-northpole", "p5-carnation", 
      "p3-forty", "p1-wheelbarrow", "p1-livingroom", "p3-letter-m", "p1-salad", "icicle", "p5-fishhook", 
      "p3-housenumbers", "pencillead", "p2-coal", "p5-itch", "candle", "dictionary", "p3-seventy", "p3-grudge", 
      "p5-workfromhome", "short", "p1-lettuce", "p1-mittens", "p5-longunderwear", "p3-together", "p4-busdriver", 
      "teapot", "bed", "p2-elbow", "p4-racket", "footsteps", "p5-scarecrow", "queue", "p5-axe", "p4-well", 
      "p1-artichoke", "p3-sixteen", "p5-bruise", "p2-oyster", "seven", "tomorrow", "needle", "p3-socks", 
      "p3-strengths", "p3-baby", "p5-flag", "p3-letter-n", "p5-dove", "p1-paper", "alphabet", "p5-reward", "p5-wink", 
      "p5-windmill", "p3-married", "p5-spinningwheel", "elizabeth", "generations", "p2-voice", "p2-moses", 
      "p5-radar", "mississippi", "p4-surgeon", "p5-path", "p2-fish", "bookworm", "p2-lap", "p2-wet", "p1-chocolate", 
      "bark", "p5-thirdsister", "lettere", "p3-leapday", "p5-wife", "p5-often", "p5-fever", "p5-wearingglasses", 
      "p3-letter-d", "p3-romannumerals", "p5-candy", "chick", "p5-rust", "mist", "p5-hunger", "p2-anyanimal", 
      "stamp", "p4-batter", "p4-bccoin", "p5-scold", "p3-ton", "p1-rake", "nothing", "p5-cardoor", "p3-letter-h", 
      "p5-cradle", "p5-nora", "p1-sieve", "p5-butcher", "p3-stopimagining", "p2-legs", "p5-sleep", "p5-nutcracker", 
      "teeth", "p2-tongue", "p5-change", "p1-egg", "p5-antlers", "p1-charcoal", "p5-everest", "p5-fast", "year", 
      "p3-lisp", "p1-trousers", "p3-sixminutes", "p5-bat", "p5-brother", "p5-overtakelast", "anchor", "bank", 
      "p5-argument", "p3-dozens", "p2-nightday", "mushroom", "p5-kiss", "p1-peanut", "p5-straightup", "p5-callsheep", 
      "eight", "p1-bottomrung", "p5-oar", "p3-listen", "p5-unclesister", "p5-barrel", "p3-letter-t", "p1-blackberry", 
      "coffin", "p5-exercisebike", "p4-cinderella", "p5-few", "p4-nobody", "p1-thimble", "p5-mousetrap", "p5-blush", 
      "p5-dryumbrella", "corn", "garbagetruck", "p5-money", "friday", "p1-ajar", "p5-pollen", "p3-clockstrike", 
      "p3-letter-g", "p5-thistle", "p5-debt", "p2-cuckoo", "p5-signpost", "p1-blackboard", "p5-shrug", "stives", 
      "p2-beehive", "p3-daytime", "p1-paint", "p3-advice"
    ],
    t3: [
      "p5-worldrecord", "vowels", "p5-horn", "p5-anvil", "p5-sword", "p5-swapcamels", "p5-scar", "p1-chimney", 
      "p5-newyearsday", "p5-pride", "p5-pitch", "p2-wind", "p5-sugar", "p5-buseyes", "p5-mine", "p5-whetstone", 
      "p5-drought", "p5-mule", "p5-childhood", "p5-content", "p5-border", "p5-lastapple", "p5-deadline", "p5-legend", 
      "p5-newyeartwins", "p5-fear", "p5-pomegranate", "p4-pen", "p5-oversight", "p5-princess", "p5-lorry", "p5-knot", 
      "p5-forgiveness", "p5-chessfriends", "p5-treerings", "p5-hindsight", "p5-shield", "p5-vicar", "p5-countryside", 
      "p5-loom", "sphinx", "p5-dust", "p5-corkscrew", "p5-scythe", "p3-reachbutton", "p5-queue", "p1-tongs", 
      "p5-twocoins", "p5-leaves", "p5-word", "p5-bellows", "p1-cabbage", "p5-geode", "p5-concrete", "p5-underdoor", 
      "p5-refuse", "p5-delta", "p5-road", "p5-adrift", "p5-taxi", "p5-pennies", "p5-weathercock", "p5-churn", 
      "p5-dune", "p2-dew", "lice", "p5-left", "p5-music", "p5-warmbulb", "p5-mask", "p5-contrail", "samson", 
      "monopoly", "p5-elder", "p5-ink", "p5-dormitory", "p5-blacksmith", "p5-wallbuilt", "p5-saddle", 
      "p1-plumpudding", "p5-gold", "p5-astronomer", "p5-stranger", "p5-bow", "p5-seal", "p5-earnest", "p5-orbit", 
      "p5-parkedplane", "p5-looserope", "sunshine", "p5-shipladder", "p5-handshake", "p5-constellation", 
      "p5-catalogue", "p5-bound", "p5-funnybone", "p5-chainmail", "p5-deafparrot", "p5-scruffybarber", 
      "p5-fenceposts", "p5-club", "p5-pattern", "p5-fan", "p3-myson", "p5-polish", "p5-counterfeit", "p5-bigfamily", 
      "p5-nice", "p5-moat", "p5-dough", "p5-pushcork", "p5-fine", "walnut", "p5-distance", "p5-crater", "p2-snow"
    ]
  }
}; })(typeof window !== 'undefined' ? window : this);
