// Apples to Apples style cards for games/applestoapples.html. Original cards written for this site.
// Each pack: g = green cards "Word|synonyms|tags", r = red cards "Name|description|tags" (one per line).
// Tags let computer players match cards; tags lists the word a robot judge says for each, opp the opposites (Crab Apples).
// Card numbers are the order of the packs and lines below: add new cards at the end of a pack's list or in a new pack.
window.A2A_CARDS = {
  tags: {"hot":"hot","cold":"cold","big":"big","small":"small","fast":"fast","slow":"slow","loud":"loud","quiet":"quiet","scary":"scary","cute":"cute","funny":"funny","gross":"gross","smelly":"smelly","sweet":"sweet","sour":"sour","tasty":"tasty","spicy":"spicy","old":"old","new":"new","classic":"classic","famous":"famous","rich":"fancy","cheap":"cheap","danger":"dangerous","safe":"safe","wild":"wild","calm":"calm","happy":"happy","sad":"sad","angry":"grumpy","crazy":"crazy","smart":"smart","silly":"silly","strong":"strong","weak":"weak","soft":"soft","hard":"tough","smooth":"smooth","rough":"rough","wet":"wet","dry":"dry","bright":"bright","dark":"dark","color":"colorful","nature":"natural","tech":"high-tech","sport":"sporty","magic":"magical","love":"romantic","lazy":"lazy","busy":"busy","popular":"popular","boring":"boring","exciting":"exciting","messy":"messy","clean":"clean","heavy":"heavy","light":"light","sharp":"sharp","sticky":"sticky","healthy":"healthy","junk":"junky","weird":"weird","evil":"evil","hero":"heroic","royal":"royal","shiny":"shiny","fluffy":"fluffy","slimy":"slimy","tall":"tall","long":"long","round":"round","fun":"fun","brave":"brave","shy":"shy","beautiful":"beautiful","ugly":"ugly","fake":"fake","real":"real","annoying":"annoying","relaxing":"relaxing","cozy":"cozy","fresh":"fresh","rotten":"rotten","rare":"rare","common":"ordinary","simple":"simple","complicated":"complicated","music":"musical","water":"watery","space":"out of this world","festive":"festive","important":"important","mysterious":"mysterious","sleepy":"sleepy","flying":"high-flying","cool":"cool","powerful":"powerful","kind":"kind","lonely":"lonely"},
  opp: {"hot":["cold"],"cold":["hot"],"big":["small"],"small":["big","tall"],"fast":["slow"],"slow":["fast"],"loud":["quiet"],"quiet":["loud"],"scary":["cute","cozy"],"cute":["scary"],"sweet":["sour"],"sour":["sweet"],"old":["new"],"new":["old"],"rich":["cheap"],"cheap":["rich"],"danger":["safe"],"safe":["danger"],"wild":["calm"],"calm":["wild"],"happy":["sad"],"sad":["happy"],"smart":["silly"],"silly":["smart"],"strong":["weak"],"weak":["strong"],"soft":["hard"],"hard":["soft"],"smooth":["rough"],"rough":["smooth"],"wet":["dry"],"dry":["wet"],"bright":["dark"],"dark":["bright"],"clean":["messy"],"messy":["clean"],"heavy":["light"],"light":["heavy"],"healthy":["junk"],"junk":["healthy"],"exciting":["boring"],"boring":["exciting"],"beautiful":["ugly"],"ugly":["beautiful"],"fake":["real"],"real":["fake"],"relaxing":["annoying"],"annoying":["relaxing"],"fresh":["rotten"],"rotten":["fresh"],"rare":["common"],"common":["rare"],"simple":["complicated"],"complicated":["simple"],"brave":["shy"],"shy":["brave"],"busy":["lazy"],"lazy":["busy"],"evil":["hero"],"hero":["evil"],"fluffy":["slimy"],"slimy":["fluffy"],"tall":["small"],"kind":["angry"],"angry":["kind"],"popular":["lonely"],"lonely":["popular"],"cozy":["scary"]},
  packs: [
    { id: "core", name: "Core Set",
      g: `Absurd|Ridiculous, silly, nonsensical|silly crazy weird funny
Adorable|Cute, sweet, charming|cute sweet small fluffy
Adventurous|Daring, bold, thrill-seeking|brave exciting wild danger
Amazing|Wonderful, astonishing, incredible|exciting famous powerful
Ancient|Old, prehistoric, timeworn|old classic rare mysterious
Annoying|Irritating, bothersome, pesky|annoying loud busy
Artistic|Creative, imaginative, crafty|color beautiful weird
Awkward|Clumsy, uncomfortable, embarrassing|shy silly weird
Bald|Hairless, shiny, smooth|smooth shiny round
Beautiful|Lovely, gorgeous, pretty|beautiful color nature
Bizarre|Strange, odd, peculiar|weird crazy mysterious
Bold|Daring, brave, fearless|brave strong loud
Boring|Dull, tedious, humdrum|boring slow common
Bouncy|Springy, lively, elastic|fun round light exciting
Brave|Courageous, fearless, gutsy|brave hero strong
Bright|Shiny, glowing, brilliant|bright shiny color
Brilliant|Genius, clever, dazzling|smart bright shiny
Bumpy|Lumpy, rough, jolting|rough hard
Busy|Hectic, bustling, swamped|busy fast loud
Calm|Peaceful, tranquil, serene|calm quiet relaxing
Cheap|Inexpensive, bargain, thrifty|cheap common
Cheerful|Happy, jolly, sunny|happy bright fun
Chewy|Gummy, rubbery, tough|sticky tasty soft
Chilly|Cold, nippy, frosty|cold
Chunky|Thick, bulky, lumpy|big heavy
Classic|Timeless, traditional, iconic|classic old famous
Classy|Elegant, refined, stylish|rich beautiful royal
Clean|Spotless, tidy, pure|clean fresh
Clever|Smart, crafty, quick-witted|smart
Clumsy|Bumbling, awkward, butterfingered|silly funny
Colorful|Vivid, vibrant, rainbow-hued|color bright fun
Comfy|Comfortable, cushy, snug|cozy soft relaxing
Complicated|Complex, tangled, confusing|complicated tech smart
Cool|Hip, awesome, trendy|cool popular new
Cozy|Snug, warm, homey|cozy soft relaxing calm
Crazy|Wild, nutty, bonkers|crazy wild silly
Creepy|Eerie, spooky, unsettling|scary dark mysterious weird
Crispy|Crunchy, crusty, brittle|tasty dry hot
Crowded|Packed, jammed, swarming|busy loud big
Crunchy|Crispy, crackly, brittle|tasty hard dry
Cuddly|Huggable, soft, snuggly|cute soft fluffy cozy
Curious|Inquisitive, nosy, interested|smart mysterious
Cute|Adorable, darling, precious|cute small sweet
Dangerous|Risky, perilous, hazardous|danger scary wild
Dark|Shadowy, gloomy, unlit|dark scary mysterious
Delicate|Fragile, dainty, tender|light soft beautiful weak
Delicious|Tasty, scrumptious, yummy|tasty sweet
Dirty|Filthy, grimy, muddy|messy gross smelly
Dramatic|Theatrical, over-the-top, intense|exciting loud famous
Dreamy|Heavenly, fanciful, enchanting|beautiful magic love relaxing
Dry|Arid, parched, dusty|dry boring
Dusty|Musty, grimy, neglected|old dry messy
Easy|Simple, effortless, a breeze|simple safe
Educational|Informative, instructive, enlightening|smart important
Elegant|Graceful, polished, refined|beautiful rich royal
Embarrassing|Humiliating, cringeworthy, awkward|funny silly shy
Energetic|Lively, peppy, spirited|fast busy exciting
Enormous|Huge, gigantic, colossal|big heavy tall
Evil|Wicked, villainous, sinister|evil dark scary
Exciting|Thrilling, electrifying, stirring|exciting fast fun
Expensive|Costly, pricey, steep|rich rare
Explosive|Volatile, booming, fiery|loud danger hot powerful exciting
Fabulous|Fantastic, marvelous, glamorous|famous shiny rich
Fake|Phony, bogus, counterfeit|fake
Famous|Well-known, celebrated, legendary|famous popular
Fancy|Elaborate, ornate, posh|rich royal shiny
Fantastic|Fabulous, terrific, wonderful|exciting magic fun
Fast|Speedy, quick, rapid|fast
Fearless|Brave, daring, unafraid|brave hero
Feisty|Spirited, scrappy, spunky|angry wild brave
Fierce|Ferocious, savage, intense|wild strong danger angry
Flashy|Showy, gaudy, loud|shiny bright color rich
Fluffy|Fuzzy, downy, puffy|fluffy soft light cute
Fragrant|Aromatic, perfumed, sweet-smelling|smelly fresh nature
Free|Complimentary, gratis, on the house|cheap
Fresh|New, crisp, just-picked|fresh new healthy
Friendly|Kind, warm, neighborly|happy cute safe
Frightening|Scary, alarming, terrifying|scary danger
Fun|Enjoyable, amusing, entertaining|fun happy exciting
Funny|Hilarious, comical, hysterical|funny silly
Fuzzy|Furry, hairy, blurry|fluffy soft
Gentle|Mild, tender, soft|soft calm safe
Giant|Huge, massive, towering|big tall heavy
Glamorous|Dazzling, ritzy, stylish|rich shiny famous beautiful
Gloomy|Dreary, dismal, moody|dark sad
Glorious|Magnificent, splendid, triumphant|hero royal bright
Gooey|Sticky, gloppy, oozy|sticky slimy sweet
Graceful|Elegant, poised, flowing|beautiful smooth light
Greasy|Oily, slick, fatty|junk slimy gross
Green|Leafy, grassy, eco-friendly|nature fresh healthy color
Grouchy|Grumpy, cranky, crabby|angry annoying
Gross|Disgusting, nasty, yucky|gross smelly slimy
Grumpy|Cranky, sour, crabby|angry sad
Hairy|Furry, shaggy, woolly|fluffy gross
Handsome|Good-looking, dashing, striking|beautiful famous
Happy|Glad, joyful, cheerful|happy fun
Hard|Tough, solid, rigid|hard strong
Harmless|Safe, innocent, gentle|safe cute calm
Healthy|Wholesome, nutritious, fit|healthy fresh nature
Heavy|Hefty, weighty, massive|heavy big strong
Heroic|Valiant, gallant, noble|hero brave strong
Hilarious|Side-splitting, uproarious, comical|funny silly
Hot|Fiery, scorching, steamy|hot spicy
Huge|Enormous, vast, gigantic|big heavy
Icy|Frozen, frosty, glacial|cold slimy hard
Important|Significant, vital, major|important famous powerful
Impossible|Unachievable, hopeless, unthinkable|complicated crazy
Innocent|Blameless, pure, naive|cute safe
Irresistible|Tempting, captivating, alluring|tasty love sweet
Itchy|Scratchy, prickly, irritating|annoying rough
Jolly|Merry, cheerful, jovial|happy festive fun
Juicy|Succulent, moist, ripe|tasty wet fresh sweet
Lazy|Idle, sluggish, slothful|lazy slow sleepy
Legendary|Mythical, famous, epic|famous classic hero
Little|Small, tiny, teeny|small cute
Loud|Noisy, booming, deafening|loud
Lovely|Charming, delightful, pleasant|beautiful love sweet
Lucky|Fortunate, blessed, charmed|magic happy
Luxurious|Lavish, opulent, plush|rich soft royal
Magical|Enchanting, mystical, spellbinding|magic mysterious
Majestic|Grand, regal, stately|royal big beautiful
Massive|Huge, bulky, immense|big heavy
Mean|Nasty, unkind, cruel|evil angry
Messy|Sloppy, cluttered, untidy|messy
Mighty|Powerful, strong, mega|strong powerful big
Mischievous|Naughty, impish, playful|silly evil fun
Modern|Contemporary, up-to-date, new|new tech
Moody|Temperamental, sulky, changeable|sad angry
Mushy|Soft, squishy, sentimental|soft slimy love
Mysterious|Puzzling, secretive, enigmatic|mysterious dark
Natural|Organic, wild, unprocessed|nature fresh real
Naughty|Bad, disobedient, mischievous|evil silly
Nervous|Anxious, jittery, edgy|shy scary
Noisy|Loud, rowdy, clamorous|loud annoying
Nutty|Crazy, wacky, loopy|crazy silly
Obnoxious|Annoying, rude, unbearable|annoying loud
Old|Aged, elderly, antique|old classic
Peaceful|Calm, serene, still|calm quiet relaxing
Perfect|Flawless, ideal, spotless|beautiful clean
Pointy|Sharp, spiky, prickly|sharp danger
Polite|Courteous, well-mannered, respectful|calm quiet
Popular|Well-liked, trendy, in demand|popular famous cool
Powerful|Strong, mighty, potent|strong powerful
Precious|Valuable, treasured, priceless|rich rare cute
Prickly|Thorny, spiky, touchy|sharp rough angry
Proud|Confident, dignified, boastful|royal famous hero
Puffy|Swollen, inflated, poofy|fluffy round soft
Quiet|Hushed, silent, soft-spoken|quiet calm shy
Radical|Extreme, wild, revolutionary|exciting wild cool
Rare|Uncommon, scarce, unusual|rare
Relaxing|Restful, soothing, calming|relaxing calm cozy
Rich|Wealthy, loaded, well-off|rich
Ridiculous|Absurd, laughable, preposterous|silly crazy funny
Romantic|Loving, passionate, sentimental|love sweet beautiful
Rotten|Spoiled, decayed, putrid|rotten smelly gross
Rough|Coarse, rugged, harsh|rough hard
Round|Circular, spherical, rotund|round
Royal|Regal, kingly, majestic|royal rich
Rude|Impolite, disrespectful, crude|annoying angry
Sad|Unhappy, gloomy, blue|sad
Safe|Secure, protected, harmless|safe calm
Salty|Briny, savory, grumpy|tasty junk angry
Scary|Frightening, terrifying, spooky|scary danger dark
Secret|Hidden, confidential, hush-hush|mysterious quiet
Selfish|Greedy, self-centered, stingy|evil
Serious|Solemn, grave, no-nonsense|important boring
Sharp|Pointed, keen, razor-edged|sharp danger
Shiny|Glossy, gleaming, sparkly|shiny bright
Shy|Bashful, timid, reserved|shy quiet
Silly|Goofy, foolish, zany|silly funny
Simple|Plain, basic, easy|simple common
Sizzling|Searing, scorching, sensational|hot exciting tasty
Sleepy|Drowsy, tired, yawning|sleepy lazy relaxing
Slimy|Slick, gooey, slippery|slimy gross wet
Slippery|Slick, greasy, sneaky|slimy wet smooth danger
Slow|Sluggish, leisurely, poky|slow lazy
Small|Tiny, little, petite|small
Smart|Intelligent, clever, bright|smart
Smelly|Stinky, reeking, funky|smelly gross
Smooth|Silky, sleek, even|smooth soft
Sneaky|Sly, crafty, shifty|mysterious evil quiet
Soft|Squishy, plush, tender|soft fluffy
Sour|Tart, tangy, bitter|sour angry
Sparkly|Glittery, twinkling, dazzling|shiny bright beautiful
Speedy|Fast, swift, zippy|fast
Spicy|Hot, peppery, zesty|spicy hot tasty
Spooky|Eerie, haunted, ghostly|scary dark mysterious festive
Sticky|Gluey, tacky, gummy|sticky gross
Stinky|Smelly, rank, pungent|smelly gross rotten
Strange|Odd, peculiar, unusual|weird mysterious
Strong|Powerful, sturdy, muscular|strong powerful
Stubborn|Obstinate, pigheaded, unbending|hard angry
Sweet|Sugary, kind, delightful|sweet cute tasty
Tall|High, lofty, towering|tall big
Tasty|Delicious, flavorful, appetizing|tasty
Tender|Gentle, soft, loving|soft love
Terrible|Awful, dreadful, horrible|ugly sad evil
Terrifying|Horrifying, petrifying, chilling|scary danger
Thrilling|Exhilarating, electrifying, gripping|exciting fast danger
Tiny|Miniature, wee, minuscule|small cute
Tough|Rugged, durable, hard-nosed|hard strong rough
Tricky|Sneaky, difficult, puzzling|complicated mysterious
Ugly|Unsightly, hideous, homely|ugly gross
Unbelievable|Incredible, astounding, far-fetched|crazy exciting fake
Unique|One-of-a-kind, distinctive, special|rare weird
Useful|Handy, practical, helpful|important simple
Useless|Pointless, futile, worthless|silly cheap boring
Valuable|Precious, costly, prized|rich rare important
Weird|Odd, bizarre, offbeat|weird
Wet|Soggy, damp, drenched|wet water
Wild|Untamed, unruly, feral|wild nature crazy
Wise|Sage, knowing, thoughtful|smart old
Wonderful|Marvelous, terrific, delightful|happy beautiful magic
Wrinkly|Creased, crumpled, puckered|old rough
Yummy|Delicious, tasty, mouthwatering|tasty sweet
Zany|Wacky, goofy, madcap|silly crazy funny`,
      r: `A Bad Haircut|Six weeks of hats, minimum.|ugly funny sad
A Big Hug|The best thing you can give away and still keep.|love cozy happy soft
A Bounce House|An inflatable castle full of sock-footed chaos.|fun exciting loud
A Broken Umbrella|Now it's just a sad stick with flaps.|sad silly wet
A Car Wash|A drive-thru shower for your minivan.|wet clean fun
A Cardboard Box|Better than whatever toy came inside it.|simple cheap fun
A Clown Car|Physics says no. Twenty clowns say yes.|funny silly crazy small
A Comfy Couch|Where remote controls go to hide.|cozy soft lazy relaxing
A Cozy Blanket Fort|Engineering at its finest, sponsored by every pillow in the house.|cozy fun soft
A Dentist Appointment|Open wide and think about your choices.|scary annoying sharp
A Dripping Faucet|Drip. Drip. Drip. Forever.|annoying wet
A Fire Drill|Everyone outside, nobody panicking, everybody chatting.|loud busy safe
A First Kiss|Equal parts magic and nose collision.|love sweet exciting
A Flat Tire|The universe's way of saying you're going to be late.|sad annoying
A Garage Sale|Your neighbor's junk, priced to sell.|cheap old messy
A Gold Medal|Shiny proof you were the best that day.|shiny rich famous sport hero
A Haunted House|Squeaky floors and a guy in a sheet.|scary dark mysterious
A Hot Bath|Bubbles, silence, and wrinkly fingers.|hot relaxing wet calm
A Jigsaw Puzzle|Five hundred pieces, four hundred ninety-nine found.|complicated quiet smart
A Junk Drawer|Batteries, rubber bands, and a mystery key.|messy weird mysterious
A Lemonade Stand|Small business, big sugar.|sweet sour cheap bright happy
A Long Line|You picked the slowest one. You always do.|slow boring annoying long
A Lost Sock|Somewhere, a lonely dryer knows the truth.|sad mysterious small
A Magic Trick|Is this your card? It's always your card.|magic mysterious fun
A Messy Room|Organized chaos. Mostly chaos.|messy
A Mosquito Bite|Tiny vampire, big itch.|annoying small rough
A Paper Cut|The smallest wound with the biggest attitude.|sharp annoying small
A Parking Ticket|A love note from the city.|annoying rich
A Pillow Fight|Feathers everywhere and nobody wins.|soft fun silly messy
A Pop Quiz|Surprise! Hope you read chapter four.|scary annoying smart
A Rainy Day|Puddles outside, cocoa inside.|wet cozy sad calm
A Road Trip|Are we there yet? No.|fun long exciting
A Rubber Duck|Bathtub captain, squeak enthusiast.|cute funny water color
A Sandcastle|Prime real estate until high tide.|beautiful water fun
A Snow Day|School's out, sleds out.|cold fun happy exciting
A Snowball Fight|Cold war in the front yard.|cold fun wild
A Spelling Bee|Can you use it in a sentence, please?|smart quiet important
A Squeaky Door|Every horror movie's favorite sound effect.|annoying loud scary
A Stubbed Toe|Furniture's revenge.|annoying sharp angry
A Surprise Party|Everybody hiding behind the couch, holding their breath.|exciting fun loud festive
A Swimming Pool|Cannonball season starts here.|wet water fun cold
A Thunderstorm|Nature's drum solo.|loud scary dark wet powerful
A Tire Swing|Spin until the trees go blurry.|fun exciting
A Toddler's Tantrum|Small human, enormous opinions.|loud angry small crazy
A Traffic Jam|A parking lot on the highway.|slow annoying busy boring
A Treasure Map|X marks the spot. Probably.|mysterious exciting rare old
A Trip to the Moon|One small step, very long commute.|space exciting important
A Tuxedo|Fancy pants with a matching jacket.|rich classic
A Water Balloon|A water slingshot's best friend.|wet fun silly
A Whoopee Cushion|The oldest joke in the book, still working.|funny silly loud
Acne|Your face's surprise guest.|gross annoying ugly
Air Guitar|All the rock, none of the lessons.|music silly fun
Airline Food|A tiny tray of mystery.|gross small cheap
Airports|Hurry up and wait, then run.|busy loud boring annoying
Alarm Clocks|Rude awakening, every single morning.|annoying loud
Albert Einstein|E equals MC squared, hair equals chaos.|smart famous classic
Aliens|Probably just as confused by us.|weird space mysterious
Allergies|Sneezing season, now open.|annoying sad
Amusement Parks|Long lines, short rides, huge smiles.|fun exciting busy loud
Antiques|Old stuff your grandma calls valuable.|old rich classic rare
Ants at a Picnic|Uninvited guests who bring their whole family.|annoying small busy
Applause|The sound of people liking you.|loud happy popular
April Fools' Day|Trust no one. Check your shampoo.|funny silly festive
Aquariums|Fish TV with no remote.|water calm beautiful color
Arm Wrestling|Two hands, one winner, lots of grunting.|strong sport
Astronauts|Professional floaters.|space brave smart hero
Auctions|Do I hear a hundred? Do I hear a sneeze?|rich exciting fast
Avalanches|When a mountain sneezes.|cold danger powerful big
Babies|Tiny boss, huge needs.|cute small loud soft
Baby Teeth|Worth a quarter under the right pillow.|small cute
Backpacks|Portable black holes for permission slips.|busy messy
Bacon|Sizzling strips of joy.|tasty junk hot smelly
Bad Breath|A secret everyone knows except you.|smelly gross
Balloons|Party fun until someone hears a pop.|fun color light festive
Bananas|Nature's own smiley face, with handy packaging.|healthy color fresh
Band-Aids|Tiny bandages with big superpowers.|safe small
Bank Robbers|Guys with stockings on their heads and bad ideas.|evil danger
Barbershops|Snip, buzz, and the latest gossip.|busy clean
Basements|Every creepy noise lives down here.|dark scary cold
Bath Time|Bubbles, rubber ducks, and splashing.|wet clean fun
Bathroom Scales|They never tell you what you want to hear.|annoying heavy
Bats|Upside-down flying mice.|dark flying scary
Beach Volleyball|Sand in places you didn't know you had.|sport fun hot
Beaches|Sun, sand, and sunscreen in your eyes.|hot water relaxing fun
Bedtime|The most negotiated hour of the day.|sleepy calm cozy
Bees|Tiny gardeners with stingers.|busy small sharp
Beethoven|Wrote masterpieces he couldn't hear.|music classic famous smart
Bicycles|Two wheels, one wobbly beginner.|fast fun healthy
Big Brothers|Protector, teaser, blanket-stealer.|strong annoying
Big Feet|Clown shoes not included.|big funny
Billionaires|Money they can't spend in ten lifetimes.|rich powerful
Birthday Cake|Candles, frosting, and a wish.|sweet tasty festive happy
Black Holes|Space vacuums that eat light.|space dark scary mysterious powerful
Blizzards|When the snow means business.|cold danger wild
Board Games|Family fun until someone flips the board.|fun smart classic
Boogers|Gross, but everybody has them.|gross slimy sticky
Bowling|Rent the shoes, roll the ball, hope.|sport fun loud
Braces|A metal smile with a monthly tune-up.|shiny annoying
Brain Freeze|Ice cream's sneak attack.|cold funny annoying
Bridges|Roads that decided to fly.|big long strong important
Broccoli|Tiny trees on your dinner plate.|healthy color nature
Bubble Gum|Chew it, blow it, step in it.|sweet sticky fun
Bubble Wrap|The most satisfying packaging ever.|fun loud cheap
Buffets|All you can eat and then some.|tasty big cheap junk
Bulldozers|Big yellow pushers.|big strong heavy loud
Bumper Cars|The only place it's okay to crash.|fun exciting loud
Bunk Beds|Top bunk privileges are a serious debate.|fun cozy
Burnt Toast|Black, crunchy, and smoking.|hot dry gross
Burps|The body's applause after a good meal.|loud gross funny
Butterflies|Caterpillars after a glow-up.|beautiful color light flying nature
Cactuses|Hug at your own risk.|sharp dry nature
Camping|Sleeping on rocks on purpose.|nature fun messy cozy
Candles|Tiny fires we light on purpose.|hot bright cozy calm
Candy Corn|Love it or hate it, no in-between.|sweet festive
Canoes|Paddle in a straight line. Try it. You can't.|water slow calm
Carnivals|Cotton candy, Ferris wheels, and rigged games.|fun loud color exciting
Carrots|Bunnies swear by them.|healthy fresh hard
Cartwheels|Gymnastics for the backyard.|fun fast
Cats|Royalty that knocks things off tables.|cute soft lazy evil
Caves|Nature's basement.|dark cold mysterious
Celebrities|Famous for being famous.|famous rich popular
Cell Phones|The thing you check before you check the time.|tech new popular
Chain Saws|Loud, sharp, and best kept far from your toes.|sharp danger loud
Chalk Drawings|Sidewalk art with a rain expiration date.|color fun cheap
Cheerleaders|Peppy people with pom-poms.|loud happy sport
Cheese|Moldy milk, magnificently done.|tasty smelly
Chess|Kings, queens, and long silences.|smart quiet classic complicated
Chewing Gum Under Desks|A hidden museum of chewed treasures.|gross sticky old
Chicken Nuggets|Shapes of chicken, dunk-ready.|tasty junk
Chocolate|Happiness in a wrapper.|sweet tasty love
Chores|Things that magically appear the second you sit down.|boring annoying clean
Christmas Lights|Beautiful once untangled.|bright festive color
Circus Clowns|Big shoes, red noses, mixed feelings.|funny scary silly color
Cleaning Your Room|The world's longest five minutes.|boring clean
Clocks|Always watching, always ticking.|boring common
Clouds|Floating cotton balls with mood swings.|soft light fluffy nature
Coffee|Bean juice that turns grown-ups back on.|hot smelly busy
Coin Collections|Pocket change, carefully curated.|old rare boring
Cold Pizza|Breakfast of champions.|cold tasty junk
Comic Books|Heroes in panels.|fun hero color
Computers|Smart boxes that freeze when you need them most.|tech smart
Construction Workers|Hard hats, harder work.|strong busy loud
Cookie Jars|The thing that's always empty when you need it.|sweet round
Cookies|Round little circles of happiness.|sweet tasty round
Cotton Candy|Sugar that thinks it's a cloud.|sweet fluffy color
Coupons|Clip, save, forget them at home.|cheap boring
Cousins|Built-in friends at every holiday.|fun loud
Cowboys|Yee-haw with a hat.|wild brave classic
Crayons|Waxy rainbows in a box.|color cheap fun
Crickets|Nature's night-shift orchestra.|small music quiet
Crocodiles|Living dinosaurs with a big grin.|danger scary water
Crossword Puzzles|Seven letters for confusing.|smart complicated quiet
Crowded Elevators|Silent standing, staring at numbers.|busy shy silly small
Cruise Ships|Floating buffets.|big water rich relaxing
Crying at Movies|Totally just something in your eye.|sad wet
Cupcakes|Cake you don't have to share.|sweet cute small tasty
Daisies|The flower that loves you, loves you not.|beautiful nature small
Dancing|Everybody looks great doing it in the kitchen.|fun music exciting
Dandelions|Weeds or wishes? Depends who you ask.|nature color light
Dark Chocolate|For grown-ups who like it bitter.|sweet tasty dark
Deserts|Sandboxes the size of countries.|hot dry big
Detectives|Magnifying glasses and hunches.|smart mysterious
Diamonds|Shiny, hard, and very pricey.|shiny rich hard rare beautiful
Diapers|Absorbent, regrettable, necessary.|gross smelly
Dinosaurs|Big lizards with bad timing.|big old scary rare
Dirty Laundry|A mountain growing in the corner.|smelly messy
Dish Duty|Scrub, rinse, repeat.|boring wet clean
Disco Balls|Shiny spinning party planets.|shiny bright music fun
Doctors|Say ahh, then they poke you.|smart important
Dodgeball|A game where the ball hunts you.|sport fast danger
Dogs|Your best friend with fur and no secrets.|cute happy loud
Doughnuts|Breakfast with a hole in the middle.|sweet round junk
Dragons|Flying lizards with a fire problem.|magic danger hot big flying
Dreams|Free movies every night.|weird magic sleepy mysterious
Driving Lessons|White knuckles, gripping the dashboard.|scary slow
Ducks|Calm on top, paddling like crazy underneath.|cute water
Duct Tape|Fixes everything. Seriously, everything.|strong sticky important
Dust Bunnies|Fluffy little monsters under your bed.|fluffy messy
Earthquakes|When the ground forgets the rules.|danger scary powerful
Eggs|Breakfast in a fragile shell.|healthy round fresh
Electric Guitars|Plug in and wake the neighbors.|loud music cool
Elephants|Big ears, bigger memory.|big heavy strong
Elevator Music|The soundtrack of going nowhere slowly.|music boring calm
Emails|A full inbox of things you'll read later.|tech boring busy
Escalators|Stairs that do the work.|lazy tech
Exploding Volcanoes|Mountains with a temper problem.|hot danger powerful loud
Fairy Tales|Once upon a time, happily ever after.|magic classic love
Family Dinner|Everyone talking at once, nobody passing the salt.|loud cozy happy
Family Photos|Say cheese, someone blinked.|happy funny
Farmers|Up before the rooster.|nature busy strong
Fart Jokes|Low brow, high laughs.|funny gross silly
Fast Food|Cheap, quick, and slightly regrettable.|fast cheap junk tasty
Feathers|Light as, well, a feather.|light soft fluffy
Fire Trucks|Big red heroes with sirens.|loud hero fast color
Fireflies|Tiny lanterns on summer nights.|bright small magic nature
Fireworks|Booming flowers in the sky.|loud bright color exciting festive
First Day of School|New shoes, new backpack, butterflies.|new exciting scary
Fishing|Mostly waiting, a little catching.|calm water slow relaxing
Flamingos|Pink birds that stand on one leg.|color beautiful weird
Flip-Flops|Shoes that slap the back of your feet.|cheap loud
Flowers|A bouquet says what words can't.|beautiful color nature love
Flying Kites|Running with string, hoping for wind.|fun light flying
Fog|The world, set to blurry.|mysterious wet calm dark
Football Fans|Face paint and foam fingers.|loud sport crazy
Fortune Cookies|Crunchy wisdom with a side of lucky numbers.|mysterious sweet
Fossils|Bones that turned into rocks.|old rare
Fountains|Water that does tricks.|water beautiful
French Fries|Potatoes' finest form.|tasty junk hot
Friday Afternoons|The weekend is in sight.|happy relaxing
Frogs|Jumpy, slimy, princely potential.|slimy nature wet color
Frozen Yogurt|Ice cream with an alibi.|cold sweet healthy
Fruitcake|The gift that keeps getting regifted.|old heavy sweet
Garbage Trucks|Stinky giants that wake you on Tuesdays.|smelly loud big
Garden Gnomes|Little lawn guards with pointy hats.|small cute weird
Gardening|Dirt under the nails, tomatoes on the vine.|nature calm healthy
Ghosts|See-through guests who won't leave.|scary mysterious dark light
Giraffes|Tall, spotted, and very good at high shelves.|tall cute
Glitter|Use it once, find it for the rest of your life.|shiny messy color
Goldfish|Three-second memory, lifelong friend.|small cute water
Golf|A long walk with frequent stops to swing.|slow quiet sport rich
Gossip|Did you hear what happened?|annoying popular
Grandmas|Cookies, hugs, and a dollar in a card.|cozy sweet old
Grandpas|Stories that start in 1962.|old smart funny
Grapes|Bite-size juice balloons.|sweet healthy round
Grass Stains|Badges of a good day outside.|messy color
Gravity|It keeps you down.|powerful heavy important
Group Projects|One does the work, everyone gets the grade.|annoying busy
Gum on Your Shoe|The sticky surprise of the sidewalk.|sticky gross annoying
Gummy Bears|Squishy, chewy, colorful bears.|sweet sticky cute color
Hair Dryers|Hot wind in a handle.|hot loud
Halloween Candy|Trick or treat, mostly treat.|sweet festive scary
Hamburgers|A sandwich that went to the gym.|tasty junk hot
Hammocks|Naps that swing.|relaxing lazy calm
Hand Sanitizer|Squirt, rub, smell like a hospital.|clean wet
Hard Candy|Lasts longer than your patience.|sweet hard
Hats|Covers bad hair days.|cool simple
Hay Rides|Bumpy, itchy, and seasonal.|fun rough festive
Hiccups|Hic. Hic. Hic.|annoying funny
Hide and Seek|Counting to ten, peeking at eight.|fun quiet mysterious
High Heels|Fashion that hurts.|tall sharp rich
Hiking|Walking, but uphill, on purpose.|nature healthy brave
Hippos|Chunky river kings with grumpy faces.|big heavy danger water
Homework|School that follows you home.|boring annoying smart
Honey|Bee-made sticky gold.|sweet sticky color
Horror Movies|Don't go in the basement!|scary dark exciting
Hot Air Balloons|Picnic baskets that float.|light flying beautiful calm
Hot Chocolate|Warm cocoa with mini marshmallows.|hot sweet cozy
Hot Dogs|Mystery meat in a bun.|tasty junk
Hot Sauce|Liquid fire in a bottle.|hot spicy danger
Hurricanes|Spinning storms with names.|danger powerful wet wild
Ice Cream Trucks|The jingle that makes everyone run.|sweet cold happy
Ice Skating|Graceful gliding, followed by falling.|cold smooth sport
Igloos|Ice houses for the brave.|cold round
Itchy Sweaters|A gift that keeps on itching.|rough annoying cozy
Jack-O'-Lanterns|Pumpkins with personality.|festive scary bright
Jellyfish|Squishy floating stingers.|slimy danger water
Jet Skis|Motorcycles that float.|fast wet fun loud
Jury Duty|Twelve strangers, one long week.|boring important
Jogging|Running, but slower and on purpose.|healthy sport
Juggling|Three balls, two hands, one show-off.|fun complicated
Jump Ropes|Skip it, trip it, double-dutch it.|fun fast healthy
Jungles|Green, wet, and loud with critters.|wild nature wet
Junk Food|Snacks with no regrets until later.|tasty junk cheap
Kangaroos|Hoppers with built-in pockets.|fast weird
Karate|Hi-ya! with a colored belt.|strong sport cool
Ketchup|Goes with everything. Ask a ten-year-old.|tasty color sweet
Kindergarten|Naps, snacks, and finger paints.|fun messy cute
Kisses from Grandma|Lipstick prints and love.|love sweet funny
Kittens|Tiny fluff tornadoes.|cute small soft fluffy
Knights|Tin-can heroes on horseback.|brave hero old strong
Koalas|Sleepy tree huggers.|cute sleepy fluffy lazy
Ladders|Stairs that you can carry.|tall important danger
Lasagna|Layers of cheesy glory.|tasty hot heavy
Laughing Too Loud|In the library. At a funeral. In church.|loud funny shy silly
Lava Lamps|Groovy blobs in slow motion.|color weird relaxing old
Lawn Mowers|Loud machines that give grass a buzz cut.|loud nature
Leftovers|Last night's dinner, round two.|cold cheap tasty
Lego Bricks|Building blocks and the floor's secret weapon.|color fun sharp small
Lemons|Sour little sunshines.|sour fresh color
Libraries|Shhh. Books live here.|quiet smart calm
Licking a Battery|Tingly. Don't.|silly danger tech
Lighthouses|Tall night-lights for ships.|tall bright water lonely
Lightning|Nature's camera flash.|bright danger powerful fast loud
Limousines|Long cars with tinted secrets.|long rich
Llamas|Fluffy, proud, and occasionally spitty.|fluffy funny weird
Lollipops|Candy on a stick.|sweet color cute
Losing Your Keys|They're always in the last place you look.|annoying sad
Lottery Tickets|Scratch, sigh, try again.|cheap exciting rare
Love Letters|Swoon on paper.|love sweet old
Lunch Lady|Hairnet hero of the cafeteria.|busy important
Magicians|Pick a card, any card.|magic mysterious fun
Mail Carriers|Rain or shine, they bring the bills.|busy brave
Makeovers|Before and after, mostly after.|beautiful new
Mall Santas|Ho, ho, how long is this line?|festive fake funny
Marching Bands|Tubas on the move.|loud music
Marshmallows|Squishy puffs made for campfires.|sweet soft fluffy
Mattresses|Rectangles of sleep.|soft sleepy cozy
Meatloaf|Dinner shaped like a brick.|heavy tasty boring
Mermaids|Half fish, all fabulous.|magic beautiful water
Microwaves|Thirty seconds to lukewarm.|fast hot tech
Milk Mustaches|Got milk? It's on your lip.|funny color
Mimes|Trapped in an invisible box, forever.|quiet silly weird
Mini Golf|Windmills, clowns, and gentle rage.|fun sport small
Mirrors|The only one who sees you every morning.|shiny
Monday Mornings|The week's slow, sleepy start.|sleepy sad boring annoying
Money|It doesn't grow on trees, they say.|rich important
Monkeys|Bananas, swinging, and flinging.|silly wild funny
Monster Trucks|Big wheels crushing small cars.|big loud powerful exciting
Moon Landings|One small step, one giant leap.|space famous important
Mosquitoes|Summer's tiniest vampires.|annoying small
Mothers|Know where everything is, always.|love important smart
Motorcycles|Two wheels, lots of noise.|fast loud cool danger
Mountains|Big rocks that touch the clouds.|big tall nature cold
Movie Theaters|Popcorn, previews, and sticky floors.|dark loud fun
Mud|Dirt plus water plus kids equals fun.|messy wet
Mud Pies|Dessert you should not eat.|messy fun
Mullets|Business in the front, party in the back.|funny classic weird
Mummies|Wrapped up and very old.|old scary
Museums|Old stuff behind glass.|old quiet smart classic
Music Class|Recorders. So many recorders.|music loud
Mustard|Yellow zing for your hot dog.|spicy color tasty
Naps|Mini sleeps for maximum happiness.|sleepy relaxing lazy cozy
Neighbors|The people you wave at but never meet.|common kind
New Car Smell|Smells like a monthly payment.|new fresh rich
Night Lights|Tiny guards against the dark.|bright safe small
Ninjas|Silent, sneaky, and usually in black.|quiet mysterious fast cool
Noodles|Slurp-able strings of joy.|tasty long
Nosebleeds|Out of nowhere, all over your shirt.|gross color
Nursery Rhymes|Humpty Dumpty had a bad day.|classic cute silly
Octopuses|Eight arms, zero bones, all brains.|weird smart slimy water
Oil Spills|Ocean's worst day.|gross sad danger
Old Shoes|Comfy, smelly, and falling apart.|old smelly cozy
Onions|They make everyone cry.|smelly sad
Opera|Loud singing in languages you don't know.|music loud classic rich
Orange Juice|Morning sunshine in a glass.|sweet fresh healthy
Oreo Cookies|Twist, lick, dunk.|sweet tasty dark
Outer Space|The final frontier.|space dark big mysterious
Overalls|Pants with a built-in vest.|classic funny
Pajamas|Clothes for doing nothing.|cozy soft sleepy
Pancakes|Breakfast's fluffy stack.|tasty sweet fluffy
Paper Airplanes|Cleared for takeoff in class.|light flying fun
Parades|Floats, bands, and candy throwers.|loud color festive fun
Parents|Professional worriers.|important love
Parking Lots|Where you lose your car.|boring big
Parrots|Colorful copycats.|color loud funny
Pencils|Wood and lead, eraser not included.|simple cheap
Penguins|Birds in tuxedos.|cute cold funny
Pennies|Lucky if heads up.|cheap small common
Pet Rocks|The lowest-maintenance pet.|simple silly cheap
Pianos|Eighty-eight keys to happiness.|music big classic
Picnics|Lunch on a blanket with ants.|fun nature relaxing
Piggy Banks|Pig-shaped savings accounts.|cute cheap round
Pillows|Clouds for your head.|soft fluffy cozy
Piñatas|Smash a paper donkey, get candy.|fun festive color
Pirates|Arr, matey! Where's the gold?|danger wild evil
Pizza|Round, cheesy, and always welcome.|tasty junk hot round
Plastic Flamingos|Lawn decor with a pink attitude.|fake color funny
Playgrounds|Slides, swings, and sandbox kingdoms.|fun loud
Plumbers|Heroes of the clogged toilet.|important gross
Pogo Sticks|Bounce until your knees complain.|fun silly
Poison Ivy|Leaves of three, let it be.|danger nature annoying
Polar Bears|Fluffy white giants with icy toes.|cold big danger fluffy
Pools of Jello|Wobbly, wiggly, colorful.|slimy sweet color
Popcorn|Pop, pop, pop goes the snack.|tasty light fun
Porcupines|Hug them carefully.|sharp cute
Potholes|Road craters that eat tires.|annoying danger
Potty Training|A big step, many accidents.|messy funny
Presents|Wrapped mysteries.|exciting festive happy
Principal's Office|Where the trouble ends up.|scary important
Prom|Dress up, dance, take pictures.|rich exciting love
Puddles|Small lakes made for jumping.|wet fun messy
Pumpkins|Big orange pie-to-be.|round festive big
Puppies|Fluffy chaos with a wagging tail.|cute happy fluffy
Puppets|Hands with personalities.|funny silly
Quicksand|Every movie's favorite trap.|danger scary
Rabbits|Hop, twitch, carrot.|cute fluffy fast
Raccoons|Masked trash pandas.|mysterious cute messy
Rainbows|Colorful bridges in the sky.|color beautiful bright magic
Rattlesnakes|Shake, shake, danger.|danger scary sharp
Reality TV|Real people, fake drama.|fake popular loud
Recess|The best subject in school.|fun happy loud
Recycling|Paper, plastic, and good karma.|nature clean
Report Cards|Grades your parents frame or hide.|important scary
Roller Coasters|Screaming for fun.|exciting fast scary loud
Roller Skates|Shoes with wheels.|fast fun classic
Root Canals|The dentist's big finale.|annoying sharp
Rubber Bands|Snap! Ow!|weird cheap
Running Late|Every morning's sport.|busy fast annoying
Rusty Nails|Get your tetanus shot.|old sharp danger
Sad Movies|Pass the tissues.|sad
Sand in Your Sandwich|The beach's flavor of the day.|gross funny
Sandwiches|Two slices hugging something good.|tasty simple
Santa Claus|Jolly guy, very busy one night.|festive happy famous
Saturday Mornings|Cartoons and cereal.|relaxing happy cozy
Scarecrows|Straw men on bird patrol.|scary funny
School Buses|Big yellow rides.|loud color busy
School Lunch|Mystery meat Mondays.|gross cheap
Science Fairs|Volcanoes made of baking soda.|smart fun
Scuba Diving|Breathing underwater with a tank.|water exciting brave
Seagulls|Beach bandits after your fries.|loud annoying flying
Sharks|Fins, teeth, and the sound of a cello.|danger scary water sharp
Shopping Malls|Indoor towns of stores.|busy big loud
Shoveling Snow|Winter's workout.|cold hard heavy
Sidewalk Cracks|Step on one, break your mother's back.|silly common
Sisters|Clothes borrowers and best friends.|love annoying
Skateboards|Four wheels and a lot of scabs.|fast cool danger
Skunks|Smelly little warning signs.|smelly cute
Sky Diving|Jumping out of a perfectly good airplane.|danger exciting brave flying
Sleepovers|Who's actually sleeping?|fun loud
Slime|Gooey, green, and fun to squish.|slimy sticky gross fun
Slinkies|Toys that walk down the stairs.|fun classic
Slow Walkers|Always right in front of you.|slow annoying
Slugs|Snails without a house.|slimy gross slow
Smoke Alarms|Beeping at 3 a.m. to remind you.|loud annoying safe
Snakes|Legless and slithering.|scary slimy danger
Sneezes|Ah... ah... CHOO!|loud gross
Snoring|Midnight chainsaw.|loud annoying sleepy
Snow Angels|Lie down and flap.|cold beautiful fun
Snowmen|Frosty fellows with carrot noses.|cold festive cute
Soap Bubbles|Floating rainbows that pop.|light beautiful color
Socks with Sandals|A brave fashion choice.|silly weird cozy
Soggy Cereal|Waited too long.|wet gross sad
Space Shuttles|Rockets with wings.|space fast tech
Spaghetti|Saucy noodles that slap your face.|tasty messy long
Spiders|Eight legs and a web of fear.|scary small
Spinach|Popeye's secret weapon.|healthy color
Spring Cleaning|Out with the old.|clean busy
Squirrels|Nut hoarders with parkour skills.|fast cute crazy
Stage Fright|Knees knocking, mind blank.|scary shy
Stinky Feet|Air freshener needed, stat.|smelly gross
Storms|Thunder, lightning, and power outages.|loud scary dark
Summer Camp|Bug spray, songs, and new friends.|fun nature
Summer Vacation|No school, no rules, no shoes.|happy hot relaxing
Sunburns|Lobster mode activated.|hot color annoying
Sunflowers|Big yellow faces chasing the sun.|tall color nature
Sunsets|The sky's grand finale.|beautiful color calm
Superheroes|Capes, masks, and super saves.|hero strong famous
Surfing|Riding the wave, falling off the wave.|water cool sport
Sushi|Rice, fish, and a bit of fancy.|tasty fresh rare
Swing Sets|Back and forth, higher and higher.|fun
Taco Tuesday|The best day of the week.|tasty spicy festive
Talking Toys|Pull the string, hear the phrase.|loud fun
Tap Dancing|Shoes that make music.|loud music fun
Tattoos|Ink you can't take back.|color cool
Tax Day|April's least favorite day.|boring annoying
Teddy Bears|Cuddly confidants.|cute soft cozy fluffy
Teenagers|Eye rolls with phones attached.|annoying angry sad
Thanksgiving Dinner|Food coma central.|tasty festive heavy
The Dentist's Drill|Bzzzzzz.|scary loud sharp
The Ice Age|When the world chilled out.|cold old
The Internet|Everything, all the time.|tech popular big
The Moon|The night's big night-light.|bright round space
The Ocean|Big, blue, and salty.|water big color
The Sun|Big hot ball of light.|hot bright space
Thunder|The sky clearing its throat.|loud scary powerful
Tickling|Laughing you can't control.|funny fun
Tightrope Walkers|One wrong step...|danger brave
Time Machines|Back to the future!|tech mysterious exciting
Toasters|Bread tanning beds.|hot tech
Toilets|Porcelain thrones.|gross important
Tornadoes|Spinning wind monsters.|danger powerful scary fast
Toy Boxes|Overflowing chests of fun.|fun messy
Traffic Lights|Red, yellow, green, repeat.|color boring
Trampolines|Bouncing until someone cries.|fun exciting
Treehouses|Kid clubhouses in the branches.|fun nature cozy
Trophies|Shiny rewards for being best.|shiny rich hero
Truck Stops|Snacks and showers for road warriors.|cheap busy
Tuba Players|Oom-pah-pah heroes.|loud music
Tug of War|Pull until someone falls in the mud.|strong sport
Turtles|Slow and steady wins the race.|slow cute old
Twins|Double the trouble.|fun cute
Umbrellas|Portable roofs.|important wet
Unicorns|Horses with a horn and a sparkle.|magic beautiful rare
Vacuum Cleaners|Loud machines that eat dust.|loud clean
Vampires|Pale, thirsty, and up all night.|scary evil dark
Video Games|One more level, Mom!|fun tech exciting
Volcanoes|Mountains with a fiery temper.|hot danger
Waffles|Pancakes with abs.|tasty sweet
Wasps|Angry bees with no chill.|angry sharp danger
Water Parks|Slides, splashes, and sunburns.|wet fun exciting
Water Slides|Gravity plus water equals screaming.|wet fast fun
Weddings|Cake, vows, and the chicken dance.|love rich festive
Whales|Giants of the sea.|big water heavy
Whipped Cream|Fluffy topping straight from the can.|sweet fluffy soft
Whistling|Happy tunes through pursed lips.|music happy
Wigs|Hair you can take off.|fake funny
Wind Chimes|Music for breezy days.|music calm
Winter Coats|Puffy walking sleeping bags.|cozy fluffy cold
Wishing Wells|Toss a coin, make a wish.|magic water
Wolves|Howling at the moon.|wild danger
Worms|Wiggly dirt diggers.|slimy gross nature
Yard Sales|Treasures for a quarter.|cheap old
Yawning|Contagious. You just did it.|sleepy lazy
Yo-Yos|Up, down, and walk the dog.|fun classic
Yodeling|Mountain singing with flair.|loud music weird
Zebras|Striped horses that won't be ridden.|wild nature
Zippers|They always catch at the worst time.|annoying important
Zombies|Brains! Slowly.|scary slow gross
Zoos|Animals behind glass.|fun nature busy` },
    { id: "party", name: "Party",
      g: `Awesome|Excellent, epic, rad|exciting cool fun
Bonkers|Nuts, loopy, off the wall|crazy silly wild
Cheesy|Corny, hokey, tacky|silly funny cheap
Chaotic|Disorderly, wild, frantic|crazy messy wild busy
Contagious|Catching, spreading, infectious|popular gross
Corny|Cheesy, sappy, groan-worthy|silly cheap
Cringey|Awkward, embarrassing, painful|shy silly weird
Daring|Bold, gutsy, audacious|brave danger exciting
Epic|Heroic, grand, legendary|hero big famous exciting
Extra|Over-the-top, dramatic, too much|loud shiny crazy
Fancy-Schmancy|Posh, highfalutin, swanky|rich royal
Festive|Merry, celebratory, jolly|festive happy color
Fizzy|Bubbly, sparkling, effervescent|light sweet fun
Flamboyant|Showy, flashy, dazzling|color shiny loud
Frantic|Hectic, frenzied, panicky|busy fast crazy
Goofy|Silly, dopey, clownish|silly funny
Groovy|Funky, far-out, cool|cool classic music color
Hyper|Overexcited, wired, bouncy|fast busy crazy
Jazzy|Snazzy, lively, stylish|music cool shiny
Pumped|Psyched, fired up, stoked|exciting happy fast
Loopy|Dizzy, goofy, wacky|silly crazy
Outrageous|Shocking, scandalous, wild|crazy loud wild
Over the Top|Excessive, extreme, too much|crazy loud big
Rowdy|Boisterous, unruly, raucous|loud wild
Sassy|Cheeky, bold, spirited|brave funny cool
Snazzy|Stylish, sharp, flashy|cool shiny rich
Spontaneous|Impulsive, unplanned, on a whim|exciting crazy fun
Squishy|Soft, mushy, spongy|soft slimy cute
Tacky|Gaudy, cheap, garish|cheap ugly color
Wacky|Zany, eccentric, nutty|silly weird crazy
Wholesome|Good, pure, heartwarming|healthy cute sweet safe
Iconic|Legendary, memorable, classic|famous classic popular`,
      r: `A Conga Line|Everyone hold on and nobody knows where it's going.|fun silly music
A Dance-Off|Settle it on the dance floor.|music fun exciting loud
A Karaoke Night|Off-key and proud of it.|music loud fun silly
A Limbo Contest|How low can you go?|fun silly sport
A Piñata Blindfold|Swinging wildly in a room full of people.|danger fun silly
A Photo Booth|Four poses, two props, one blink.|fun silly
A Slumber Party|Pillow fights and secrets until 3 a.m.|fun loud cozy
A Surprise Guest|Wait, who invited them?|exciting mysterious
An Awkward Silence|Crickets. Literal crickets.|quiet shy silly
An Ugly Sweater Party|The uglier the better.|ugly festive funny
Balloon Animals|A twisted little poodle.|funny color fun
Bean Bag Chairs|Comfy until you try to stand up.|soft lazy cozy
Birthday Candles|Make a wish, blow hard.|bright festive hot
Bouncy Castles|Inflatable kingdoms.|fun
Cake Smash|A baby's first act of destruction.|messy funny sweet
Charades|Sounds like... the word you're thinking.|funny silly fun
Chips and Dip|Double-dippers beware.|tasty junk
Confetti|Tiny paper celebration.|color festive messy
Costume Parties|Everyone's someone else tonight.|fun weird color
Cupcake Wars|Frosting battles to the end.|sweet messy
Dad Dancing|Embarrassment in motion.|funny silly shy
Dad Jokes|So bad they're good.|funny silly
Disco Night|Platform shoes and spinning lights.|music shiny classic
Doorbell Ditching|Ring and run!|mysterious fun silly
Double Dutch|Two ropes, quick feet.|fast sport fun
Duck, Duck, Goose|Goose! Run!|fun silly
Face Paint|Turn into a tiger for a day.|color fun
Fortune Tellers|The future, for five bucks.|mysterious magic fake
Freeze Tag|Stop! You're frozen.|fun fast
Fruit Punch|Red, sweet, and spilled on the carpet.|sweet color
Glow Sticks|Crack, shake, glow.|bright color fun
Goody Bags|The party's parting gift.|cute cheap fun
Group Selfies|Arms too short to fit everyone.|fun popular
Hide the Remote|A household game no one agreed to.|annoying mysterious
High Fives|Up top! Down low! Too slow!|happy fun
Hot Potato|Pass it! Pass it!|fast fun
Ice Breakers|Tell us one weird fact about you.|shy silly fun
Inflatable Flamingos|Pool floats with attitude.|fun color silly
Joke Books|Why did the chicken cross the road?|funny silly
Kazoos|Hum into it, sound amazing.|music silly cheap
Knock-Knock Jokes|Who's there? Interrupting cow. Interrupting c-MOO!|funny silly
Leapfrog|Hop over your friends.|fun silly
Magic Eight Ball|Reply hazy, try again.|mysterious magic
Marshmallow Roasting|Golden brown or flaming torch.|hot sweet fun
Musical Chairs|One less chair every round.|music exciting
Mustache Disguises|Nobody will ever know it's you.|fake funny
Name Tags|Hello, my name is... forgotten already.|simple boring
Nerf Wars|Foam dart showdowns.|fun exciting wild
Paper Hats|Instant party royalty.|cheap fun
Party Animals|Last to leave, first to dance.|wild loud fun
Party Hats|Pointy cones with chin straps.|silly festive
Party Poppers|Pull the string, make a mess.|loud messy festive
Pin the Tail on the Donkey|Blindfolded and spun until dizzy.|silly classic fun
Pizza Parties|Everyone gets a slice.|tasty fun
Potato Sack Races|Hop to victory.|fun silly sport
Prank Calls|Is your refrigerator running?|silly mysterious funny
Pool Parties|Cannonballs and splashing.|wet fun loud
Red Rover|Red Rover, send someone right over.|fun strong
Rock, Paper, Scissors|The fairest way to decide anything.|simple fun
Scavenger Hunts|Find the clues, win the prize.|fun exciting mysterious
Secret Handshakes|Only cool kids know the moves.|mysterious cool
Silly String|Spray it, wear it, clean it.|silly messy color
Simon Says|Simon says touch your nose.|silly fun
Sing-Alongs|Everybody knows the chorus.|music happy
Slow Dancing|Swaying awkwardly in a circle.|love shy silly calm
Snack Tables|Where everybody really hangs out.|tasty fun
Sparklers|Hand-held fireworks.|bright hot festive
Musical Statues|Freeze when the music stops. Wobbling counts!|music silly fun
Talent Shows|Juggling, singing, and one guy doing magic.|fun music
Tea Parties|Pinkies up.|rich cute calm
Telephone Game|What was whispered is not what comes out.|silly funny
Theme Parties|Dress code: dinosaurs.|fun weird
Three-Legged Races|Two people, one awkward speed.|silly fun sport
Trick Candles|They keep relighting!|funny magic
Truth or Dare|I pick dare. Wait, no.|exciting danger
Twister|Right hand red, left foot yellow, back hurts.|fun silly color
Water Gun Fights|Soaked and grinning.|wet fun
Whack-a-Mole|Bop it, it pops up elsewhere.|fast fun
Wrapping Paper|Torn to shreds in three seconds.|color festive messy
Writing Party Invitations|You're invited, RSVP never.|fun simple
Kitchen Dance Parties|Spatula microphones required.|music fun silly
Board Game Arguments|That is not how you play.|angry loud fun
Pool Noodles|Floating foam swords.|fun soft silly
Cannonballs|Splash everyone in a ten-foot radius.|wet loud fun
Late-Night Pancakes|Breakfast at midnight.|tasty fun
Pajama Day|Comfort is the dress code.|cozy fun
Bubble Machines|Endless floating bubbles.|fun light beautiful
Cupcake Sprinkles|Tiny rainbow crumbs everywhere.|color sweet messy
Group Hugs|Everybody in!|love happy cozy
Party Favors|Plastic treasures from the goody bag.|cheap fun small
Party Crashers|Uninvited and having the best time.|annoying fun mysterious
Pinky Promises|Unbreakable. Absolutely.|cute important love
Selfie Sticks|Arms, but longer.|tech silly
Snack Attacks|Midnight trips to the fridge.|tasty mysterious
Tickle Fights|No mercy.|funny fun
Toga Parties|Bedsheets as fashion.|silly classic
Whoopee Cushions on Grandpa's Chair|A timeless family tradition.|funny silly loud` },
    { id: "pop", name: "Pop Culture",
      g: `Viral|Trending, shared, everywhere|popular new tech
Overrated|Overhyped, inflated, meh|popular boring fake
Underrated|Overlooked, unsung, hidden gem|rare cool
Retro|Vintage, old-school, throwback|old classic cool
Glam|Glitzy, showy, sparkly|shiny rich famous beautiful
Nerdy|Geeky, bookish, techy|smart tech weird
Trendy|Fashionable, hip, in style|cool popular new
Cringeworthy|Awkward, embarrassing, painful|silly shy weird
Binge-Worthy|Addictive, gripping, can't stop|exciting popular fun
Scandalous|Shocking, juicy, outrageous|evil exciting famous
Dramatic Comeback|Return, revival, resurgence|famous hero exciting
Nostalgic|Sentimental, wistful, old-timey|old classic cozy
Edgy|Daring, bold, provocative|cool dark brave
Mainstream|Popular, common, everywhere|popular common
Quirky|Offbeat, unusual, kooky|weird silly cute
Superstar|Famous, top, A-list|famous rich popular
Hyped|Buzzing, anticipated, built-up|popular exciting new
Influential|Powerful, leading, game-changing|powerful important famous
Meme-Worthy|Funny, shareable, ridiculous|funny popular silly
Sparkling|Glittering, shimmering, gleaming|shiny bright beautiful
Low-Budget|Cheap, scrappy, homemade|cheap simple
Blockbuster|Huge, smash, hit|big famous popular exciting
Fan-Favorite|Beloved, cherished, adored|popular love famous
Unforgettable|Memorable, iconic, haunting|famous important classic
Over-Produced|Glossy, slick, overdone|shiny fake rich`,
      r: `Selfies|Duck face, good lighting, twenty retakes.|popular silly tech
Emojis|Tiny faces that say everything.|cute popular tech
Memes|Inside jokes the whole internet is in on.|funny popular tech
Hashtags|Putting a pound sign on feelings.|popular tech silly
Influencers|Famous for showing you their breakfast.|popular fake rich
Viral Dance Crazes|Everyone learned it in a week.|music popular fun
Cat Videos|The internet's true purpose.|cute funny popular
Unboxing Videos|Watching someone open a package for twenty minutes.|boring popular weird
Boy Bands|Five guys, matching outfits, one key change.|music popular cute
Red Carpets|Fancy walking for cameras.|famous rich
Paparazzi|Cameras that follow you everywhere.|annoying busy famous
Award Shows|Thank you to my agent and my mom.|famous rich long
Talent Show Judges|One mean one, one nice one, one confused one.|famous important
Autographs|A scribble worth a lot.|famous rare
Fan Clubs|Superfans with matching shirts.|popular loud love
Sequels|More of the same, hopefully better.|popular new
Reboots|The same movie, just newer.|new popular old
Spoilers|He was the ghost the whole time.|annoying evil
Cliffhangers|To be continued...|exciting mysterious
Binge-Watching|Just one more episode, at 2 a.m.|lazy exciting sleepy
Laugh Tracks|Canned giggles for your sitcom.|fake funny
Infomercials|But wait, there's more!|fake loud cheap
Fidget Spinners|A toy that spun the world for one summer.|fun popular cheap
Rubik's Cubes|Colorful frustration in a cube.|color complicated smart classic
Lava Lamp Revival|Back in style, again.|old classic color weird
Mixtapes|A playlist with feelings.|music love old
VHS Tapes|Be kind, rewind.|old classic
Cassette Tapes|Pencil not included.|old music classic
Pet Rocks Craze|Somebody got rich off rocks.|silly cheap classic
Tamagotchis|A digital pet that dies of loneliness.|tech cute sad old
Bell-Bottoms|Pants that flare to the floor.|old classic funny
Shoulder Pads|1980s power dressing.|old classic big
Neon Leg Warmers|Workout fashion from the past.|old classic color
Mullet Revivals|Some things should stay in the past.|funny weird
Cabbage Patch Kids|Adopt-a-doll mania.|cute classic
Beanie Babies|Investments that turned out to be toys.|cute cheap classic
Hula Hoops|Swivel your hips and pray.|fun round classic
Yo-Yo Tricks|Around the world!|fun classic
Slap Bracelets|Snap it on your wrist.|fun old classic
Pogs|Cardboard circles everyone collected.|old classic cheap
Mood Rings|Your finger's feelings.|magic color old classic
Lightsabers|Glowing swords from a galaxy far away.|bright cool space
Wizards with Wands|Swish and flick.|magic famous
Princess Movies|Ballgowns, castles, and talking animals.|magic beautiful royal
Superhero Movies|Explosions and capes, two hours long.|hero exciting popular loud
Dinosaur Movies|Life finds a way.|scary big exciting
Talking Animal Movies|Your dog has opinions.|funny cute silly
Zombie Shows|The dead keep walking, season after season.|scary gross
Cooking Competitions|Thirty minutes, a mystery basket.|exciting tasty busy
Home Makeover Shows|Demo day!|new fun
Game Shows|Come on down!|exciting loud fun
Soap Operas|Evil twins and amnesia.|fake silly love
Saturday Morning Cartoons|Cereal and animated chaos.|fun cozy classic
Theme Songs|Stuck in your head all day.|music popular annoying
Catchphrases|Say it again, everyone loves it.|funny popular
Elvis Impersonators|Thank you, thank you very much.|funny music fake
Rock Stars|Leather pants and loud guitars.|loud cool famous music
Pop Divas|High notes and higher demands.|famous music rich
Movie Stars|Bigger than life.|famous rich beautiful
Child Actors|Famous before they could spell it.|famous cute
Stunt Doubles|Taking the falls for the stars.|brave danger
Cameo Appearances|Blink and you'll miss them.|famous rare
Bloopers|Outtakes everyone loves.|funny silly
Behind the Scenes|The movie magic, revealed.|mysterious tech
Popcorn Flicks|Turn your brain off and enjoy.|fun exciting
Fan Fiction|What if they kissed?|weird love popular
Comic Conventions|Capes, costumes, and long lines.|fun weird popular
Cosplay|Dressing up as your favorite character.|fun color weird
Video Game Speedruns|Beat it in eleven minutes.|fast tech smart
Esports|Video games, but a stadium.|tech sport exciting
Podcasts|People talking into microphones about everything.|popular quiet
Audiobooks|Someone reads you to sleep.|quiet relaxing
Streaming Services|Twenty minutes picking, zero watching.|tech popular
Smart Speakers|Always listening, rarely understanding.|tech annoying
Robot Vacuums|Lost under the couch again.|tech funny clean
Photo Filters|Your face, but sparkly.|fake beautiful tech
Celebrity Chefs|Yelling in kitchens on TV.|famous loud tasty
Talk Show Hosts|Late night chats with famous guests.|famous funny
Weather Forecasters|Seventy percent chance of guessing.|important funny
Teen Idols|Posters on every bedroom wall.|famous cute popular
Tabloids|Aliens married my neighbor!|fake weird
Fashion Week|Runways and weird outfits.|rich weird beautiful
Sneakerheads|Shoes that never touch the ground.|cool rich
Graffiti Art|Painting the town, literally.|color cool wild
Breakdancing|Spinning on your head on purpose.|music cool sport
Lip Syncing|Mouth the words with feeling.|music fake funny
Talent Agents|They get ten percent of your dreams.|rich mysterious
Viral Challenges|Everybody dumps ice water on their head.|silly popular cold
Movie Trailers|In a world... where everything explodes.|exciting loud
Drive-In Movies|Watching from the car.|old classic cozy fun
Slow-Motion Explosions|Hero walks away, never looks back.|cool loud hot
Plot Twists|Didn't see that coming!|mysterious exciting
Happy Endings|And they lived happily ever after.|happy love
Villain Monologues|Before I defeat you, let me explain my plan.|evil long funny
Sidekicks|The hero's best friend.|hero funny
Time Travel Movies|Don't touch anything!|tech mysterious exciting
Space Operas|Laser battles in faraway galaxies.|space exciting
Mockumentaries|Real-looking, totally fake.|funny fake
Musicals|People breaking into song for no reason.|music happy fun
Puppet Shows|Felt friends with big mouths.|funny silly cute
Animated Movies|Cartoons that make adults cry.|color fun cute
Stand-Up Comedy|One person, one mic, many jokes.|funny loud
Magic Shows|Sawing someone in half, nightly.|magic mysterious
Chart-Topping Hits|Number one with a bullet.|music popular famous
One-Hit Wonders|Remember that song? Neither do they.|music funny
Album Covers|Art you judge music by.|music color
Guest Stars|Famous faces, one episode only.|famous rare
TV Dinners|Supper on a tray in front of the screen.|old classic lazy tasty
Fan Theories|Clearly the butler is a time traveler.|weird mysterious smart
Opening Night|Red carpet, nervous stars.|exciting famous rich` },
    { id: "science", name: "Science and Nature",
      g: `Atomic|Tiny, nuclear, powerful|small powerful tech
Cosmic|Universal, vast, galactic|space big mysterious
Electric|Charged, shocking, buzzing|tech bright powerful exciting
Evolving|Changing, adapting, growing|nature new smart
Fossilized|Petrified, preserved, ancient|old hard rare
Frozen Solid|Icy, rigid, glacial|cold hard
Gaseous|Airy, vaporous, smelly|light smelly weird
Geeky|Nerdy, techy, scholarly|smart tech weird
Glowing|Radiant, luminous, shining|bright magic
Infinite|Endless, boundless, eternal|big long space
Invisible|Unseen, hidden, transparent|mysterious magic
Liquid|Fluid, runny, flowing|wet water
Magnetic|Attractive, pulling, irresistible|powerful love tech
Microscopic|Tiny, minuscule, invisible|small
Molten|Melted, fiery, red-hot|hot danger
Organic|Natural, earthy, chemical-free|nature healthy fresh
Prehistoric|Primeval, ancient, Jurassic|old wild big
Radioactive|Glowing, toxic, unstable|danger bright tech
Scientific|Logical, analytical, methodical|smart tech complicated
Spinning|Rotating, twirling, whirling|fast round
Toxic|Poisonous, harmful, deadly|danger gross
Tropical|Steamy, humid, lush|hot wet nature color
Vast|Huge, immense, endless|big
Volcanic|Fiery, explosive, molten|hot danger powerful
Weightless|Floating, airy, zero-g|light space
Fluorescent|Neon, glowing, vivid|bright color tech`,
      r: `Atoms|Tiny building blocks of everything.|small important
Bacteria|Microscopic roommates.|small gross
Beakers|Glass cups for bubbly experiments.|tech
Bunsen Burners|Lab campfires.|hot danger
Chemistry Sets|Explosions waiting to happen.|danger fun smart
Clones|Two of you. Twice the trouble.|tech weird
Comets|Space snowballs with long tails.|space fast cold
Coral Reefs|Underwater cities of color.|beautiful water color nature
Craters|Dents where space rocks landed.|space big
DNA|The instruction manual for you.|small smart important
Earthworms|Soil's tiny tillers.|slimy nature
Echoes|Hello... hello... hello...|loud mysterious
Eclipses|When the moon photobombs the sun.|space dark rare
Electricity|Shocking, but useful.|tech powerful danger
Erosion|Wind and water, slowly winning.|slow nature
Evolution|Survival of the fittest.|nature smart slow
Fingerprints|Nobody else has yours.|small mysterious
Galaxies|Billions of stars hanging out.|space big beautiful
Geysers|The ground blowing off steam.|hot water powerful
Glaciers|Rivers of ice that move slowly.|cold slow big
Gravity Experiments|Drop it and see.|smart simple
Hurricanes from Space|Swirls you can see from orbit.|powerful big
Icebergs|Mostly hidden under the surface.|cold big danger
Lab Coats|Instant scientist outfit.|clean smart
Lasers|Pointy beams of light.|bright tech sharp
Light Bulbs|Bright ideas.|bright tech
Magnets|Opposites attract.|powerful tech
Mars Rovers|Robots on road trips to Mars.|space tech
Meteor Showers|Shooting stars, all night.|space beautiful bright
Microscopes|Peeping on tiny things.|tech small smart
Mold|Fuzzy science happening in your fridge.|gross smelly fluffy
Northern Lights|The sky's green light show.|beautiful bright magic cold
Oxygen|You're breathing it right now.|important light
Periodic Table|Every element, in a grid.|smart complicated
Photosynthesis|Plants eating sunshine.|nature color smart
Planets|Big round neighbors in space.|space round big
Quarks|Smaller than small.|small weird
Rain Forests|Earth's lungs, dripping wet.|wet nature wild color
Robots|Metal helpers that might take over.|tech smart strong
Rockets|Fire-powered rides to space.|fast loud space powerful
Safety Goggles|Fashion that protects your eyeballs.|safe silly
Satellites|Space spies and TV helpers.|space tech
Saturn's Rings|Space hula hoops.|space beautiful round
Sloths|Nature's slowest life coaches.|slow lazy cute
Snowflakes|No two alike.|cold beautiful small
Solar Panels|Sun-powered roof tiles.|tech nature
Space Stations|Floating homes for astronauts.|space tech
Space Suits|The ultimate puffy outfit.|space tech big
Static Electricity|Hair standing on end.|funny weird
Steam|Water in a hurry.|hot wet
Stars|Distant suns twinkling at night.|bright space beautiful
Sunspots|Freckles on the sun.|hot space
Telescopes|Peeking at faraway things.|space tech smart
Test Tubes|Skinny cups for science.|tech small
The Big Bang|The ultimate opening act.|space big loud powerful
The Food Chain|Who's eating whom.|nature wild
Thermometers|Hot or not?|hot cold
Tides|The moon pulling on the ocean.|water slow
Tsunamis|Waves gone wild.|danger water powerful big
Venus Flytraps|Plants with a bite.|danger nature weird
Viruses|Tiny troublemakers.|small danger gross
Waterfalls|Rivers taking the express route.|water beautiful loud
Weather Balloons|Big floating science bubbles.|light flying
Wind Turbines|Giant pinwheels making power.|tall nature tech
Wormholes|Shortcuts through space.|space mysterious weird
X-Rays|Seeing your skeleton.|tech weird
Zero Gravity|Floating everything.|space light fun
Baking Soda Volcanoes|Science fair's classic eruption.|messy fun
Mad Scientists|Wild hair, wilder ideas.|crazy smart evil
Petri Dishes|Little gardens of germs.|gross small
Inventions|Bright ideas made real.|smart new
Hot Springs|Nature's hot tubs.|hot water relaxing
Rainbows After Rain|Science you can see.|beautiful color
Tornado Chasers|Driving toward the danger.|brave danger crazy
Sand Dunes|Deserts doing waves.|dry hot big
Quicksilver|Liquid metal, very shiny.|shiny danger weird
Diamonds in the Rough|Pressure makes perfection.|rare hard
Bioluminescence|Animals that glow in the dark.|bright magic water
Pond Scum|Green goo on the water.|slimy gross color
Moss|Soft green carpet for rocks.|soft color nature
Mushrooms|Little umbrellas in the forest.|nature weird
Pine Cones|Spiky tree seeds.|nature rough
Pebbles|Smooth little rocks.|small smooth hard
Rocks|Very patient things.|hard heavy boring
Crystals|Rocks that got fancy.|shiny beautiful hard
Seashells|Ocean souvenirs.|beautiful water
Thunderclouds|Big, dark, and grumbling.|dark loud
Fog Banks|Clouds that came down to visit.|mysterious wet
Dewdrops|Morning sparkles on the grass.|wet fresh beautiful small
Oak Trees|Mighty from little acorns.|tall strong old nature
Redwoods|Trees taller than buildings.|tall big old
Cactus Flowers|Beauty with a prickly guard.|beautiful sharp
Tumbleweeds|Desert drifters.|dry weird
Swamps|Murky water with eyes.|wet slimy scary
Tide Pools|Little oceans in the rocks.|water small cute
Global Warming|The planet running a fever.|hot important sad
Recycled Robots|Built from junk, full of heart.|tech cute
Neutron Stars|A spoonful weighs a mountain.|space heavy
Space Junk|Floating litter in orbit.|space messy
Asteroids|Rocks with somewhere to be.|space danger
The Speed of Light|Faster than anything.|fast bright` },
    { id: "sports", name: "Sports",
      g: `Athletic|Sporty, fit, muscular|sport strong healthy
Clutch|Pressure-proof, game-winning, dependable|hero brave exciting
Competitive|Cutthroat, driven, ambitious|sport angry exciting
Sweaty|Damp, drenched, glistening|wet smelly hot sport
Underdog|Long shot, scrappy, unlikely|brave weak hero
Victorious|Triumphant, winning, conquering|hero happy famous
Unbeatable|Invincible, dominant, unstoppable|strong powerful hero
Sore|Aching, stiff, tender|sad weak
Muscular|Brawny, buff, ripped|strong big
Agile|Nimble, quick, spry|fast light
Fair|Just, even, square|safe simple
Rough and Tumble|Scrappy, physical, tough|rough hard wild
Record-Breaking|Historic, unprecedented, best-ever|famous fast exciting
Rookie|New, green, beginner|new small shy
Veteran|Seasoned, experienced, wise|old smart
Exhausting|Tiring, draining, grueling|sleepy hard
Hard-Fought|Close, tough, gritty|hard brave
Lucky Streak|Hot, charmed, on a roll|exciting magic
Fumbling|Clumsy, butterfingered, bumbling|silly funny
Championship|Title-winning, top-tier, elite|hero famous important
Speedy Comeback|Rally, recovery, turnaround|fast hero exciting`,
      r: `A Buzzer Beater|Swish at zero seconds.|exciting fast hero
A Hole in One|One swing, total glory.|rare exciting sport
A Home Run|Going, going, gone!|exciting sport famous
A Hat Trick|Three goals, one hero.|hero sport rare
A Penalty Kick|Everyone holds their breath.|exciting sport
A Perfect Ten|Gymnastics gold.|beautiful rare sport
A Slam Dunk|Rim-rattling show-off move.|exciting strong sport
A Touchdown Dance|Spike it and shimmy.|fun silly sport
A Triple Axel|Spinning on ice, three and a half times.|fast beautiful cold
A Victory Lap|Running around just to show off.|happy hero
Archery|Bullseye or bust.|sharp sport
Badminton|Tennis with a feathery birdie.|light fun sport
Ballet|Tiptoes and tutus.|beautiful music light
Baseball Cards|Gum included, mostly cardboard.|classic old rare
Baseball Caps|Shade for your eyes, style for your head.|cool classic
Basketball|Dribble, shoot, swish.|sport fast tall
Bench Warming|Best seat for watching.|lazy boring
Bobsledding|Four people in an icy bullet.|fast cold danger
Boxing Gloves|Big red puffy punchers.|strong color soft
Bull Riding|Eight seconds of chaos.|danger wild
Bungee Jumping|Falling, bouncing, screaming.|danger exciting brave
Cartwheel Contests|Who can spin the most?|fun silly
Championship Rings|Bling for winners.|shiny rich hero
Cheer Squads|Give me an A!|loud happy
Coaches|Whistles and clipboards.|loud important
Cross-Country Skiing|Walking with sticks on snow.|cold slow healthy
Curling|Shuffleboard on ice, with brooms.|cold weird slow
Dodgeball Champions|Dodge, duck, dip, dive, and dodge.|fast sport
Dog Sledding|Pups pulling you across snow.|cold fast fun
Fantasy Football|Pretend teams, real arguments.|sport smart
Fencing|Sword fighting with manners.|sharp rich sport
Figure Skating|Spins, sequins, and ice.|beautiful cold shiny
Finish Lines|Lean in!|exciting important
Fishing Trophies|The one that didn't get away.|happy water
Football Helmets|Hard hats for the field.|hard safe sport
Foul Balls|Grab your glove!|exciting fast
Frisbee|Flying disc, chasing dog.|fun light flying
Go-Karts|Racing for the rest of us.|fast fun loud
Golf Carts|Tiny cars on grass.|slow fun
Gymnastics|Flips, twists, and sticking the landing.|beautiful strong
Half-Time Shows|Fireworks and pop stars.|loud exciting music
Hockey Fights|Gloves off, on ice.|angry cold wild
Horse Racing|And they're off!|fast exciting
Hot Dogs at the Ballpark|Tastes better at the game.|tasty junk
Hurdles|Running with obstacles.|fast sport
Instant Replay|Let's see that again.|tech slow
Javelins|Spears for sport.|sharp long
Jockeys|Tiny riders, fast horses.|small fast
Jump Shots|Up, flick, swish.|sport cool
Kayaking|Paddling through rapids.|water sport exciting
Kickball|Recess royalty.|fun sport
Lacrosse|Catching with a net on a stick.|sport fast
Locker Rooms|Smell of victory and socks.|smelly loud
Marathons|Twenty-six miles of choices.|long healthy hard
Mascots|Big fuzzy cheerleaders.|funny fluffy loud
Medals|Gold, silver, or bronze.|shiny hero
Mouthguards|Protecting your smile.|safe gross
Mud Runs|Obstacle courses and mud.|messy wild
Olympics|The world's biggest sports party.|famous important exciting
Overtime|The game that won't end.|exciting long
Ping-Pong|Ping. Pong. Ping. Pong.|fast fun
Pit Crews|Tire change in two seconds.|fast busy
Pole Vaulting|Flying over a bar on a stick.|brave flying
Pom-Poms|Sparkly shaker balls.|fun color
Professional Wrestling|Body slams and costumes.|loud fake strong
Push-Ups|Floor work.|strong healthy
Race Cars|Loud, fast, and left turns only.|fast loud
Referees|Striped shirts, unpopular calls.|annoying important
Rock Climbing|Spider-person training.|brave strong danger
Rowing|Everybody pull together.|water strong
Rugby|Football without the padding.|rough strong wild
Running Shoes|Speed in your step.|fast light
Sailing|Wind-powered water fun.|water calm
Scoreboards|Big bright numbers.|bright important
Skateparks|Ramps, rails, and road rash.|cool danger
Ski Lifts|Chairs in the sky.|cold fun
Snowboarding|Surfing down a mountain.|cold cool fast
Soccer Moms|Orange slices and folding chairs.|busy loud
Sports Bloopers|Faceplants and fumbles.|funny silly
Stadium Waves|Stand up, sit down, repeat.|fun loud
Sumo Wrestling|Big pushers in a ring.|big heavy strong
Surfboards|Long planks for big waves.|water cool
Swimming Laps|Back and forth, back and forth.|wet healthy
Sweatbands|Fashion for the forehead.|old classic sport
Table Football|Spin those little players.|fun fast
Team Huddles|Secret plans in a circle.|important fun
Tennis Balls|Fuzzy yellow bouncers.|fluffy round sport
Tie-Breakers|Sudden death.|exciting
Trampoline Parks|Bouncing walls to walls.|fun exciting
Trophy Cases|Shiny bragging rights.|shiny hero
Underdog Victories|Nobody saw it coming.|hero exciting happy
Water Polo|Horse-free pool soccer.|wet sport
Weightlifting|Picking up heavy things for fun.|heavy strong
Wiffle Ball|Holes in the ball, backyard fun.|fun light
Yoga|Bendy, stretchy calm.|calm healthy relaxing
Zambonis|Ice smoothers on parade.|cold slow smooth
Golf Balls in Ponds|Lost forever, every time.|wet funny sad
Victory Parades|Confetti for the champs.|happy loud festive
Bleachers|Hard seats, big cheers.|hard loud
Water Breaks|Sip, gasp, and back in.|wet relaxing
Sports Drinks|Neon-colored thirst quenchers.|color sweet` },
    { id: "food", name: "Food",
      g: `Appetizing|Mouthwatering, tempting, inviting|tasty fresh
Bland|Plain, tasteless, flavorless|boring simple
Buttery|Rich, creamy, smooth|tasty soft smooth
Cheesy Goodness|Gooey, melty, cheddar-y|tasty sticky hot
Creamy|Smooth, velvety, rich|smooth soft tasty
Crusty|Crunchy, flaky, crisp|hard dry
Filling|Hearty, satisfying, stuffing|heavy big
Flaky|Crumbly, layered, unreliable|light dry silly
Frosted|Iced, sugar-coated, frozen|sweet cold
Garlicky|Pungent, savory, stinky|smelly tasty
Gourmet|Fancy, upscale, chef-made|rich tasty
Homemade|Handmade, from scratch, made with love|cozy love real
Leftover|Day-old, reheated, second-round|old cold cheap
Melty|Gooey, dripping, oozing|hot sticky slimy
Nutritious|Healthy, wholesome, nourishing|healthy fresh
Overcooked|Burnt, dried out, charred|dry hot gross
Raw|Uncooked, fresh, natural|fresh nature danger
Savory|Flavorful, salty, rich|tasty
Smoky|Charred, barbecued, hazy|hot smelly
Soggy|Mushy, damp, limp|wet gross
Starving|Famished, ravenous, hungry|sad weak
Stuffed|Full, bloated, packed|heavy big
Sugary|Sweet, candied, syrupy|sweet junk
Tangy|Zesty, tart, zingy|sour fresh
Zesty|Spirited, lively, citrusy|sour spicy fresh`,
      r: `Apple Pie|As American as it gets.|sweet tasty classic
Avocado Toast|Mashed green on bread.|healthy color cool popular
Bagels|Doughnuts that went to college.|tasty round
Baked Beans|Picnic side dish with consequences.|tasty smelly
Banana Splits|Three scoops and a fruit alibi.|sweet cold
Barbecue Ribs|Messy fingers guaranteed.|tasty messy hot
Birthday Pizza|The official party food.|tasty fun
Blue Cheese|Moldy and proud.|smelly weird
Bread Bowls|Soup in an edible bowl.|tasty
Breakfast Burritos|Morning in a tortilla.|tasty hot
Broccoli Casserole|Sneaky green vegetables in cheese.|healthy color
Brownies|Chocolate squares of happiness.|sweet tasty
Brussels Sprouts|Mini cabbages nobody asked for.|healthy color gross
Bubble Tea|Drink with chewy surprises.|sweet weird
Buttered Popcorn|Movie theater gold.|tasty junk
Caesar Salad|Croutons doing the heavy lifting.|healthy fresh
Candy Apples|Healthy fruit, coated in sugar.|sweet sticky color
Caramel|Gooey golden sweetness.|sweet sticky
Cereal|Breakfast in a box.|sweet simple
Cheese Fondue|Dip everything in hot cheese.|hot tasty rich
Cheeseburgers|Burgers with a melty upgrade.|tasty junk hot
Chicken Soup|A hug in a bowl.|hot cozy healthy
Chili Peppers|Tiny red hot rockets.|spicy hot color
Chocolate Chip Pancakes|Dessert for breakfast.|sweet tasty
Chocolate Fountains|Rivers of fudge.|sweet rich
Cinnamon Rolls|Swirls of sticky sweetness.|sweet sticky hot cozy
Corn Dogs|Hot dogs in a sweater.|tasty junk
Corn on the Cob|Typewriter eating.|tasty fresh
Cotton Candy Grapes|Fruit pretending to be candy.|sweet weird
Cream Puffs|Pastries full of fluff.|sweet soft
Croissants|Flaky French crescents.|rich tasty
Cupcake Frosting|The best part, obviously.|sweet sticky
Deep-Fried Butter|The fair's finest bad idea.|junk weird
Deviled Eggs|Devilishly good picnic eggs.|tasty classic
Dinner Rolls|Fluffy bread bites.|soft tasty
Dumplings|Little pillows of filling.|tasty soft
Egg Rolls|Crispy wrapped goodness.|tasty hot
Fish Sticks|Fish, but rectangular.|tasty junk
Fried Chicken|Crispy, juicy, finger-licking.|tasty junk hot
Fruit Salad|Healthy and colorful.|healthy color fresh
Fudge|Dense chocolate blocks.|sweet heavy
Garlic Bread|Vampires hate it.|tasty smelly
Gingerbread Houses|Edible architecture.|sweet festive
Gravy|Brown sauce for everything.|tasty hot
Green Beans|The vegetable everyone tolerates.|healthy color
Grilled Cheese|Melty sandwich comfort.|tasty hot cozy
Guacamole|Green dip of joy.|tasty color fresh
Gumbo|Spicy stew from the South.|spicy hot
Hot Wings|Saucy and fiery.|spicy hot messy
Ice Cream Sandwiches|Ice cream between cookies.|sweet cold
Jelly Beans|Rainbow candy, including popcorn flavor.|sweet color
Kale Chips|Trying very hard to be a snack.|healthy weird
Key Lime Pie|Tart and creamy.|sour sweet
Lemon Bars|Sweet and sour squares.|sour sweet
Licorice|Love it or hate it.|sweet sticky
Lobster|Fancy seafood with a bib.|rich color
Mac and Cheese|Comfort in a bowl.|tasty cozy
Mashed Potatoes|Fluffy spud clouds.|soft tasty
Meatballs|Round and saucy.|tasty round
Milkshakes|Ice cream you drink.|sweet cold
Mint Chocolate Chip|Toothpaste ice cream, but good.|sweet cold color
Mushroom Pizza|Fungi on a fun guy.|tasty weird
Nachos|Cheesy chip mountains.|tasty junk messy
Oatmeal|Warm mushy breakfast.|healthy boring
Olives|Salty little circles.|tasty weird
Onion Rings|Crispy fried circles.|tasty junk round
Pasta Salad|Cold noodles and veggies.|tasty cold
Peanut Butter|Sticks to the roof of your mouth.|sticky tasty
PB and J|The classic lunch box sandwich.|classic tasty simple
Pickles|Cucumbers with a sour attitude.|sour color
Pigs in a Blanket|Mini hot dogs in pastry.|tasty cute
Pineapple Pizza|Controversial toppings.|weird sweet
Popsicles|Ice on a stick.|cold sweet
Pot Roast|Sunday dinner.|tasty heavy cozy
Potato Chips|Crunchy, salty, can't stop.|tasty junk
Pretzels|Twisty salty snacks.|tasty
Pudding Cups|Lunchbox treasures.|sweet soft
Pumpkin Pie|Fall in a crust.|sweet festive
Ramen Noodles|Cheap and slurpable.|cheap tasty hot
Root Beer Floats|Fizzy ice cream drinks.|sweet cold fun
S'mores|Gooey campfire sandwiches.|sweet sticky hot
Salsa|Spicy chip dip.|spicy fresh
Sardines|Fish in a tin.|smelly weird
Sauerkraut|Fermented cabbage.|sour smelly
Sloppy Joes|Messy meat sandwiches.|messy tasty
Smoothies|Blended fruit in a cup.|healthy cold sweet
Sour Gummy Worms|Pucker up.|sour sweet slimy
Spaghetti and Meatballs|Classic Italian comfort.|tasty classic
Spicy Salsa|Dip at your own risk.|spicy hot
Sprinkles|Rainbow decorations.|color sweet small
Steak|Juicy grilled meat.|tasty rich
Strawberries|Red, sweet, and seedy.|sweet color fresh
String Cheese|Peel it like a banana.|fun tasty
Stuffing|Holiday bread mush.|tasty festive
Sweet Potatoes|Orange spuds.|healthy sweet
Tacos|Crunchy shells of joy.|tasty spicy
Tater Tots|Little potato nuggets.|tasty junk
Toast|Bread that took a sunbath.|simple hot
Tofu|Takes on any flavor.|healthy weird
Trail Mix|Hikers' snack.|healthy
Turkey Legs|Medieval fair food.|tasty big
Waffle Cones|Crunchy ice cream holders.|sweet hard
Watermelon|Juicy summer slices.|sweet wet fresh
Whipped Cream Pies|Clown weapons.|sweet funny messy
Wedding Cake|Tiers of frosting.|sweet rich
Yogurt|Creamy cultured snack.|healthy cold
Zucchini Bread|Sneaky vegetable dessert.|healthy sweet
Clam Chowder|Creamy ocean soup.|tasty hot
Jalapeño Poppers|Spicy bites with cheesy hearts.|spicy hot
Mystery Casserole|Grandma won't tell what's in it.|mysterious tasty
Ghost Peppers|The spiciest dare.|spicy danger hot
Moldy Bread|Science experiment in your cupboard.|gross rotten
Glazed Ham|Holiday centerpiece.|tasty festive` },
    { id: "history", name: "History",
      g: `Historic|Momentous, landmark, memorable|old important famous
Medieval|Feudal, castle-era, olde|old classic royal
Revolutionary|Radical, groundbreaking, rebellious|important brave new
Victorian|Prim, proper, old-fashioned|old rich classic
Primitive|Basic, crude, early|old simple wild
Imperial|Commanding, regal, empire-sized|royal powerful big
Pioneering|Trailblazing, first, groundbreaking|brave new important
Forgotten|Lost, neglected, obscure|old sad rare
Heroic Deed|Gallant, valiant, courageous|hero brave
Old-Fashioned|Outdated, quaint, traditional|old classic
Rebellious|Defiant, unruly, mutinous|wild angry brave
Patriotic|Proud, loyal, flag-waving|happy important
Ruthless|Merciless, cruel, cutthroat|evil danger
Legendary Battle|Fierce, epic, famous|danger hero famous
Wise Old|Learned, sage, experienced|smart old
Inventive|Ingenious, creative, resourceful|smart new tech
Majestic Ruins|Crumbling, grand, ancient|old big beautiful
Tyrannical|Oppressive, bossy, dictatorial|evil powerful angry
Uncharted|Unexplored, unknown, mysterious|mysterious exciting
Noble|Honorable, aristocratic, dignified|royal hero`,
      r: `Abraham Lincoln|Tall hat, short speech, big legacy.|famous tall smart hero
Amelia Earhart|Flew farther than anyone dared.|brave flying famous mysterious
Ancient Egypt|Pyramids, pharaohs, and mummies.|old mysterious famous
Ancient Rome|Togas, roads, and gladiators.|old powerful
Benjamin Franklin|Kites, keys, and lightning.|smart old famous
Betsy Ross|Sewed the stars and stripes.|famous classic
Blacksmiths|Hammering hot metal.|hot strong loud
Castles|Stone houses with moats.|big royal old
Cave Paintings|The first art galleries.|old color mysterious
Christopher Columbus|Sailed the ocean blue.|famous old brave
Cleopatra|Queen of the Nile.|royal famous beautiful
Covered Wagons|Bumpy road trips westward.|old slow rough
Dinosaur Hunters|Digging up giant bones.|brave smart
Edison's Light Bulb|One bright idea.|bright smart famous
Explorers|Going where no one has mapped.|brave exciting
Florence Nightingale|The lady with the lamp.|hero kind famous
George Washington|Couldn't tell a lie, allegedly.|famous important hero
Gladiators|Arena fighters with big crowds.|danger strong
Gold Rush|Panning for riches.|rich exciting old
Harriet Tubman|Led hundreds to freedom.|brave hero famous
Henry VIII|Six wives, one big appetite.|royal famous
Hieroglyphics|Picture writing on walls.|old mysterious
Inventors|Tinkerers who change the world.|smart new
Joan of Arc|Teen warrior in armor.|brave hero famous
Jousting|Medieval horse-and-lance showdowns.|danger sport old
Julius Caesar|Came, saw, conquered.|famous powerful royal
King Arthur|The sword, the stone, the round table.|royal hero magic
King Tut|Boy king with lots of gold.|royal rich famous
Knights of the Round Table|Brave guys, fancy furniture.|hero brave
Leonardo da Vinci|Painter, inventor, show-off.|smart famous
Lewis and Clark|Road trip to the Pacific.|brave exciting
Marco Polo|Traveled to the far east.|famous brave
Marie Curie|Discovered glowing elements.|smart famous
Martin Luther King Jr.|Had a dream and shared it.|hero important famous
Medieval Feasts|Turkey legs and goblets.|tasty loud
Mount Rushmore|Presidents carved in rock.|big famous hard
Napoleon|Short temper, big ambitions.|powerful famous
Neil Armstrong|First footprints on the Moon.|space famous brave hero
Pharaohs|Kings of ancient Egypt.|royal rich
Pilgrims|Big buckled hats.|old classic
Pony Express|Mail delivered at a gallop.|fast old
Pyramids|Giant triangles in the desert.|big old famous mysterious
Queen Elizabeth I|Ruled England from inside a giant ruffled collar.|royal famous powerful
Robin Hood|Robbed the rich, gave to the poor.|hero mysterious
Rosa Parks|Kept her seat and made history.|brave hero important
Samurai|Swordsmen with honor.|sharp brave
Shakespeare|To be or not to be.|smart classic famous
Sitting Bull|A fearless leader of his people.|brave famous
Socrates|Asked a lot of questions.|smart old
Stone Age Tools|Rocks with ambition.|old simple hard
Stonehenge|Giant rocks in a circle.|mysterious old big
Telegraphs|Dots and dashes.|old tech
The Alamo|Remember it!|famous brave
The Boston Tea Party|Tea time in the harbor.|wet famous wild
The Declaration of Independence|We hold these truths.|important famous old
The Great Wall of China|Longest wall ever built.|big long famous
The Industrial Revolution|Factories everywhere.|loud busy tech
The Liberty Bell|Cracked but still famous.|famous old
The Middle Ages|Knights, castles, and plague.|old dark
The Moon Landing|One giant leap.|space famous exciting
The Oregon Trail|You have died of dysentery.|old danger long
The Renaissance|Rebirth of art and science.|beautiful smart old
The Roaring Twenties|Flappers and jazz.|music fun old
The Stone Age|Caves and clubs.|old simple
The Titanic|Unsinkable, they said.|big sad water famous
The Trojan Horse|A wooden gift with a surprise.|mysterious big
The Wild West|Cowboys, saloons, and showdowns.|wild danger
The Wright Brothers|First to fly.|flying smart famous
Thomas Jefferson|Wrote big words, liked big ideas.|smart famous
Time Capsules|Messages to the future.|old mysterious
Totem Poles|Carved stories reaching up.|tall old
Town Criers|Hear ye! Hear ye!|loud old
Typewriters|Clack, clack, ding.|old loud
Vikings|Horned helmets, long boats.|wild danger
Walt Disney|Started with a mouse.|famous magic
World's Fairs|Showcases of the future.|exciting new
Ye Olde Taverns|Mugs and minstrels.|old cozy
Zeppelins|Floating cigar-shaped airships.|flying big
Sir Isaac Newton|Bonked by an apple, discovered gravity.|smart famous
Galileo|Looked up and changed everything.|smart space
Mona Lisa|The smirk everyone stares at.|famous mysterious beautiful
Sundials|Clocks that need sunshine.|old simple
Mammoths|Big hairy elephants of the Ice Age.|big cold fluffy old
Roman Baths|Ancient spa day.|wet relaxing old
Suits of Armor|Metal pajamas for knights.|hard heavy shiny
Catapults|Medieval rock launchers.|powerful danger
Moats|Castle swimming pools with alligators.|water danger
Messages in Bottles|Ocean-delivered mail.|mysterious water
Steam Locomotives|Chugging iron horses.|loud old powerful
Old Maps|Here be dragons.|old mysterious
Quill Pens|Writing with feathers.|old classic
The First Thanksgiving|A harvest feast.|tasty festive old
Fort Building|Defense from younger siblings.|fun strong
Pioneers|Brave folks heading west.|brave old
Atlantis|Sunken city of legend.|mysterious water
Ancient Olympics|Olive wreaths instead of gold medals.|sport old famous
Printing Presses|Books for everyone.|important tech
Lighthouse Keepers|Lonely guardians of the coast.|quiet brave
Abacuses|Ancient calculators.|old smart
Dinosaur Bones|Big skeletons in museums.|big old` },
    { id: "places", name: "Places",
      g: `Exotic|Foreign, unusual, faraway|rare beautiful weird
Remote|Isolated, faraway, secluded|quiet lonely mysterious
Bustling|Busy, lively, hectic|busy loud
Scenic|Picturesque, pretty, breathtaking|beautiful nature
Urban|City, metropolitan, downtown|busy loud tech
Rural|Country, rustic, pastoral|nature quiet calm
Touristy|Crowded, souvenir-filled, overpriced|busy popular cheap
Humid|Muggy, sticky, steamy|hot wet sticky
Breezy|Windy, airy, gusty|light cold fresh
Snowy|Wintry, white, flurried|cold beautiful
Sunny|Bright, clear, cloudless|bright hot happy
Foggy|Misty, hazy, murky|mysterious wet dark
Hidden|Secret, tucked away, concealed|mysterious quiet
Spacious|Roomy, open, vast|big
Cramped|Tight, squished, crowded|small busy
Swanky|Posh, ritzy, luxurious|rich
Rugged|Rough, rocky, wild|rough wild nature
Haunted|Spooky, ghostly, cursed|scary mysterious dark
Charming|Quaint, delightful, cute|cute beautiful cozy
Faraway|Distant, remote, far-off|mysterious exciting`,
      r: `Alaska|Bears, glaciers, and twenty-hour days.|cold big wild
Antarctica|Penguins only, please.|cold lonely
Australia|Everything there can bite you.|wild danger hot
Big Cities|Taxis, sirens, and skyscrapers.|busy loud
Bowling Alleys|Shoes for rent, pins for knocking.|loud fun
Brazil|Carnival, soccer, and rainforest.|exciting hot color
Canada|Polite and full of maple syrup.|cold kind
Candy Shops|Wall-to-wall sugar.|sweet color
Car Dealerships|Inflatable tube men waving.|busy mysterious
Caribbean Islands|Palm trees and turquoise water.|hot beautiful water relaxing
Chicago|Deep-dish and windy.|cold busy
Chinatown|Dumplings and lanterns.|busy color tasty
Cornfields|Get lost in the maze.|nature color
Cow Pastures|Moo-tiful meadows.|nature smelly calm
Dentist Offices|Smells like mint and fear.|scary clean
Disney World|The most magical traffic jam.|magic busy fun
Egypt|Pyramids and sand.|hot old
Farmers' Markets|Fresh veggies and homemade jam.|fresh healthy
Fire Stations|Brass poles and Dalmatians.|hero loud
France|Bonjour, baguettes, and berets.|rich beautiful
Gas Stations|Snacks and fumes.|smelly cheap
Ghost Towns|Tumbleweeds and empty saloons.|scary quiet old
Gift Shops|Exit through here.|cheap popular busy
Grand Canyon|A really big hole.|big beautiful
Greenland|More ice than green.|cold lonely
Hawaii|Leis, luaus, and volcanoes.|hot beautiful relaxing
Hollywood|The land of stars.|famous rich
Hospitals|Beeping machines and jello.|clean important
Hotels|Tiny soaps and big beds.|cozy clean
Ice Cream Parlors|Thirty-one flavors of joy.|sweet cold happy
Iceland|Glaciers and hot springs.|cold beautiful
India|Spices, colors, and the Taj Mahal.|color spicy
Italy|Pasta, pizza, and leaning towers.|tasty beautiful
Japan|Bullet trains and cherry blossoms.|tech beautiful
Jungle Gyms|Climbing kingdoms.|fun
Kitchens|Where the snacks live.|tasty cozy
Las Vegas|Bright lights, desert heat.|bright loud rich
Laundromats|Spinning socks.|boring clean
London|Big Ben and double-deckers.|classic old busy
Mexico|Tacos and beaches.|hot tasty
Mount Everest|Top of the world.|tall cold danger
Movie Studios|Where fake becomes real.|famous fake
New York City|The city that never sleeps.|busy loud big
Niagara Falls|Big, loud waterfall.|water loud beautiful
Nursing Homes|Bingo and stories.|old quiet
Office Cubicles|Gray little boxes.|boring busy
Paris|The Eiffel Tower and croissants.|beautiful rich love
Pet Stores|Puppies in the window.|cute loud
Pizza Parlors|Cheesy heaven.|tasty fun
Post Offices|Lines and stamps.|boring slow
Rome|All roads lead here.|old famous
Russia|Big, cold, and full of dolls inside dolls.|cold big
Sahara Desert|Sand as far as you can see.|hot dry big
School Cafeterias|Tater tots and chaos.|loud messy
Scotland|Bagpipes and kilts.|cold music
Skating Rinks|Round and round to music.|cold fun
Smelly Locker Rooms|Funk central.|smelly gross
Space Camp|Training for the stars.|space fun
Swiss Alps|Snow, cheese, and chocolate.|cold beautiful
Texas|Everything is bigger there.|big hot
The Arctic|Polar bears and snow.|cold lonely
The Bermuda Triangle|Where things go missing.|mysterious danger water
The Dentist's Waiting Room|Old magazines and dread.|boring scary
The DMV|Take a number. Wait forever.|slow boring annoying
The Eiffel Tower|Iron lace over Paris.|tall famous beautiful
The Far Side of the Moon|Nobody has ever had a picnic there.|space dark mysterious quiet
The North Pole|Santa's workshop.|cold festive
The Statue of Liberty|A green lady with a torch.|tall famous color
Theme Parks|Rides and churros.|fun exciting
Toy Stores|Wonderland for kids.|fun color
Train Stations|All aboard!|busy loud
Treehouse Hotels|Sleeping in the branches.|nature fun cozy
Underwater Caves|Dark and wet.|dark wet danger
Venice|Streets made of water.|water beautiful
Volcano Islands|Paradise with a temper.|hot danger beautiful
Waiting Rooms|Ticking clocks and coughs.|boring slow
Washington, D.C.|Monuments and politics.|important famous
Water Towers|Giant tanks on stilts.|tall water
Wedding Chapels|I do, in under five minutes.|love fast
Yellowstone|Geysers, bison, and bears.|nature wild
Your Bedroom|Your kingdom, mostly messy.|cozy messy
Grandma's House|Smells like cookies.|cozy sweet
The Principal's Office|Uh oh.|scary
Space Station Kitchens|Floating peanut butter.|space weird
Bus Stops|Waiting in the rain.|boring wet
Beach Boardwalks|Salt water taffy and arcades.|fun sweet
Campgrounds|Tents and marshmallows.|nature fun
Haunted Hotels|Room service from beyond.|scary
Fishing Villages|Boats and seagulls.|water calm
Mountain Cabins|Fireplaces and snow.|cozy cold
Lighthouses on Cliffs|Lonely and beautiful.|beautiful lonely
Secret Gardens|Behind the hidden gate.|beautiful mysterious
The Amazon River|Piranhas and pink dolphins.|wild water danger
Times Square|Big screens and crowds.|bright busy loud
Antique Shops|Grandma's furniture for sale.|old rare
The Backseat|Are we there yet?|annoying cozy
Elevators|Small rooms that move.|small tech
Attics|Dusty treasures.|old messy mysterious
Moon Bases|The ultimate remote office.|space lonely tech
Rooftop Gardens|Tomatoes in the sky.|nature beautiful` },
    { id: "screen", name: "Movies and TV",
      g: `Action-Packed|Explosive, thrilling, nonstop|exciting fast loud
Animated|Lively, cartoonish, spirited|color fun
Award-Winning|Acclaimed, honored, celebrated|famous important
Cinematic|Epic, sweeping, larger-than-life|big beautiful famous
Heartwarming|Touching, uplifting, sweet|sweet happy love
Suspenseful|Tense, gripping, nail-biting|exciting scary mysterious
Tearjerking|Sad, moving, weepy|sad love
Cheesy Sequel|Recycled, corny, unnecessary|cheap silly
Family-Friendly|Wholesome, clean, all-ages|safe happy cute
Spine-Tingling|Chilling, creepy, eerie|scary
Laugh-Out-Loud|Hilarious, uproarious, side-splitting|funny
Plot-Twisting|Surprising, shocking, unexpected|mysterious exciting
Black and White|Classic, old, monochrome|old classic
Dubbed|Translated, lip-off, out-of-sync|funny weird
Slow-Motion|Dramatic, stretched, epic|slow cool
Behind the Scenes|Backstage, secret, exclusive|mysterious tech
Villainous|Wicked, dastardly, menacing|evil scary
Over-Acted|Hammy, theatrical, melodramatic|silly loud
Sci-Fi|Futuristic, spacey, high-tech|space tech new
Romantic Comedy|Sweet, funny, swoony|love funny`,
      r: `Action Heroes|Walk away from explosions without looking back.|hero strong cool
Alien Invasions|They came in peace. Just kidding.|space scary
Bad Guys in Black Hats|You can always tell who they are.|evil classic
Car Chases|Fruit stands always get knocked over.|fast exciting loud
Cartoon Anvils|Falling from the sky right on cue.|heavy funny
Cartoon Villains|Twirling mustaches and evil laughs.|evil funny
Creature Features|Giant ants attack the city!|scary big silly
Dance Movies|Everyone knows the choreography.|music fun
Detective Shows|Just one more thing...|smart mysterious
Disaster Movies|The world ends every summer.|danger exciting
Documentaries|Facts with dramatic music.|smart real
Dream Sequences|It was all a dream!|weird mysterious
Evil Twins|Same face, worse attitude.|evil weird
Fairy Godmothers|Bibbidi-bobbidi-boo.|magic kind
Famous Movie Monsters|Stomping cities since forever.|scary big
Fast Forward|Skipping the boring parts.|fast
Final Showdowns|The hero versus the villain.|exciting danger
Flashbacks|Meanwhile, twenty years earlier.|old mysterious
Ghost Hunters|Did you hear that?|scary silly
Giant Robots|Skyscraper-sized metal heroes.|big tech strong
Haunted Dolls|They moved. They definitely moved.|scary weird
Heist Movies|One last job.|mysterious exciting smart
Hero Montages|Training to a pump-up song.|hero music exciting
Horror Movie Basements|Never go down there.|scary dark
Jump Scares|Boo! Popcorn everywhere.|scary loud
Kung Fu Movies|Flying kicks and dubbed dialogue.|fast cool
Laser Battles|Pew pew pew!|bright space
Late-Night Talk Shows|Monologues and celebrity chats.|funny famous
Love Triangles|Who will she pick?|love complicated
Mad Science Labs|It's alive!|crazy evil tech
Movie Popcorn|Butter-drenched and overpriced.|tasty rich
Movie Theater Sticky Floors|Your shoes stick to the floor.|sticky gross
Mystery Novels on TV|Whodunit?|mysterious smart
Nature Documentaries|Lions hunting, narrated gently.|nature wild calm
News Anchors|Serious faces, good hair.|important
Old Westerns|Saloon doors and showdowns.|old classic
Pirate Movies|Yo ho ho, and a bottle of soda.|danger fun
Princess Castles|Turrets and fireworks.|royal beautiful magic
Puppet Villains|Scarier than they should be.|evil funny
Reality Show Drama|Tears, gasps, and confession booths.|fake loud
Remote Controls|Lost in the couch again.|tech annoying
Robot Sidekicks|Beeping, booping, loyal.|tech cute funny
Romantic Comedies|Meet cute, misunderstanding, airport chase.|love funny
Rubber Monster Suits|You can see the zipper.|fake funny
Sad Dog Movies|Bring a box of tissues.|sad cute
Sci-Fi Spaceships|Warp speed ahead.|space tech fast
Shark Movies|Get out of the water!|scary danger water
Sitcom Families|The same couch for ten seasons.|funny classic
Slapstick Comedy|Banana peels and pies.|funny silly
Spy Gadgets|A shoe phone and an exploding pen.|tech mysterious cool
Spy Movies|Shaken, not stirred.|mysterious cool danger
Stop-Motion Animation|One frame at a time.|slow cute
Superhero Capes|No capes! Well, maybe.|hero cool
Talking Cars|Four wheels and a personality.|funny tech
The Credits|Who even reads these?|long boring
The End|Finally, or too soon.|sad important
Time Loops|Same day, again and again.|weird annoying
Treasure Hunts on Screen|X marks the spot.|exciting mysterious
TV Chefs|Bam! Kick it up a notch.|tasty loud
TV Commercials|Bathroom breaks.|annoying loud
TV Game Show Hosts|Big smiles, bigger prizes.|famous happy
TV Weather Maps|Swirling clouds and pointing.|tech boring
Undercover Agents|Not who they seem.|mysterious
Vampire Movies|Sparkly or scary, you choose.|scary dark
Villains' Lairs|Volcano hideouts with sharks.|evil danger
War Movies|Loud and serious.|loud danger
Werewolf Movies|Full moon problems.|scary wild
Western Saloons|Swinging doors and piano music.|old wild
Zombie Apocalypse|Brains, brains, brains.|scary gross
Animated Talking Toys|They come alive when you leave.|cute magic
Cartoon Explosions|Ka-boom with smoke and soot.|loud funny
Movie Marathons|Eight hours on the couch.|lazy fun long
3-D Glasses|Things flying at your face.|fun weird
Animated Princesses|Singing to woodland creatures.|magic music beautiful
Cooking Show Disasters|Collapsed cakes on live TV.|funny messy
Drive-In Theaters|Movies under the stars.|old classic fun
Film Festivals|Indie movies and fancy people.|rich smart
Green Screens|Anything is possible.|tech fake
Kids' TV Hosts|Big sweaters and kind words.|kind calm
Movie Villain Laughs|Mwahahaha!|evil loud
Overdramatic Deaths|He's not dead, he's just resting.|funny silly
Monster Under the Bed|It only comes out at night.|scary dark
Puppet Shows on TV|Sock puppets with attitude.|funny cute
Ridiculous Movie Science|Enhance! Enhance!|silly fake tech
Rom-Com Airport Chases|Running through security for love.|love fast silly
Sing-Along Movies|Lyrics on the screen.|music fun
Soundtracks|Music that makes scenes work.|music
Special Effects|Explosions made with computers.|tech fake
Stuntmen|Getting thrown through windows for a living.|brave danger
Superhero Origin Stories|Bitten by something radioactive.|hero weird
Teen Movies|Prom drama and lockers.|fun love
The Movie Was Better than the Book|Said no one ever.|funny rare
Trailers That Spoil Everything|Thanks for nothing.|annoying
TV Reruns|Seen it ten times. Watching again.|old cozy
Quick Costume Changes|Ninety seconds to get into the gorilla suit.|funny fast
Award Acceptance Speeches|Please play me off.|long famous
Movie Snacks Sneaked in|A purse full of candy.|mysterious sweet` },
    { id: "music", name: "Music",
      g: `Catchy|Hooky, memorable, sticky|music popular fun
Off-Key|Out of tune, sour, flat|annoying funny
Harmonious|Melodic, in tune, balanced|music calm beautiful
Rocking|Loud, energetic, electric|loud music exciting
Soulful|Heartfelt, deep, moving|music love sad
Funky|Groovy, soulful, offbeat|music cool weird
Mellow|Laid-back, smooth, easygoing|calm relaxing smooth
Deafening|Earsplitting, thunderous, booming|loud
Rhythmic|Beat-driven, pulsing, steady|music
Jammin'|Grooving, playing, rocking out|music fun
Twangy|Country, nasal, guitar-y|music weird
Operatic|Grand, dramatic, booming|music loud rich
Heavy Metal|Thrashing, loud, intense|loud hard music
Lyrical|Poetic, wordy, expressive|music smart
Head-Banging|Wild, thrashing, rocking|wild loud
Toe-Tapping|Upbeat, bouncy, lively|music happy
Squeaky|Shrill, high-pitched, screechy|annoying loud
Unplugged|Acoustic, stripped-down, raw|quiet simple real
Encore-Worthy|Amazing, show-stopping, crowd-pleasing|famous exciting
Bluesy|Sad, soulful, low-down|sad music`,
      r: `Accordions|Squeezeboxes with lungs.|music weird
Bagpipes|Beautiful to some, alarming to others.|loud music weird
Banjos|Twang in a can.|music
Barbershop Quartets|Four guys, one harmony.|music classic
Battle of the Bands|Loudest wins.|loud music exciting
Beatboxing|Drum machine in your mouth.|music cool
Bongos|Hand drums for beatniks.|music fun
Car Radios|Singing loud with the windows down.|music fun
Church Choirs|Hallelujah, in harmony.|music calm
Classical Music|Fancy music without words.|music classic calm
Concert Tickets|Expensive and worth it.|rich exciting
Conductors|Waving a stick at an orchestra.|music important
Country Music|Trucks, dogs, and heartbreak.|music sad
Cowbells|You need more of them.|loud music funny
Crowd Surfing|Floating on hands.|wild fun
Drum Solos|Loud and very long.|loud music
Earbuds|Tiny speakers that get lost.|tech small
Elevator Music Covers|Your favorite song, but sleepy.|boring calm
Fiddles|Violins with attitude.|music
Garage Bands|Loud practice, annoyed neighbors.|loud music
Glockenspiels|Ding-dong in metal bars.|music cute
Gospel Singers|Joyful noise.|music happy loud
Guitar Picks|Always lost in the couch.|small music
Guitar Solos|Notes flying everywhere.|music loud cool
Harmonicas|Blues in your pocket.|music small
Harps|Angels' instrument of choice.|music beautiful calm
Headphones|Your own private concert.|music tech
Heavy Metal Bands|Long hair and loud guitars.|loud music wild
Hip-Hop|Beats and rhymes.|music cool
Jazz|Improvising everything.|music cool smooth
Jingles|Commercial songs you can't forget.|music annoying
Jukeboxes|Quarter for a song.|music old classic
Karaoke Machines|Your living room becomes a stage.|music fun loud
Kettle Drums|Thundering timpani.|loud music
Lullabies|Songs for sleepy babies.|music calm sleepy
Marching Drums|Rat-a-tat-tat.|loud music
Metronomes|Tick-tock tempo keepers.|music boring
Mosh Pits|Bumping into strangers on purpose.|wild loud danger
Music Boxes|Tiny dancers spinning.|music cute
Music Lessons|Practice makes perfect, eventually.|music boring
Music Videos|Songs with stories.|music popular
Opera Singers|Hitting notes that shatter glass.|loud music rich
Orchestras|Lots of instruments working together.|music big classic
Piano Recitals|Nervous kids in fancy clothes.|music shy silly
Pop Songs|Catchy and everywhere.|music popular
Punk Rock|Loud, fast, and angry.|loud angry music
Rappers|Rhymes at lightning speed.|music cool fast
Record Players|Vinyl spins again.|music old classic
Recorders|School's squeakiest instrument.|music annoying
Reggae|Island rhythms.|music relaxing
Rock Concerts|Lights, smoke, and loud guitars.|loud music exciting
Saxophones|Smooth jazz in brass.|music cool
Sheet Music|Notes on paper.|music smart
Singing in the Shower|Best acoustics in the house.|music wet funny
Square Dancing|Swing your partner round and round.|music fun
Stage Diving|Jump and hope.|danger wild
Street Performers|Hats out for coins.|music fun
Synthesizers|Beep boop music machines.|tech music
Tambourines|Shaky jingly fun.|music fun
Theme Song Medleys|Every show's song, in one go.|music funny
Triangles|Ding!|music small
Trombones|Slide into the notes.|music loud
Trumpets|Loud announcements in brass.|loud music
Ukuleles|Tiny guitars for happy songs.|music happy small
Violins|Strings that cry.|music beautiful
Waltzes|One-two-three, one-two-three.|music classic calm
Wedding DJs|Everybody do the chicken dance.|music fun
Whistles|Tweet!|loud
Xylophones|Wooden rainbow bars.|music color
Yodelers|Echoing in the Alps.|loud music weird
Air Drums|Ba-dum-tss!|music silly
Boom Boxes|Shoulder-carried speakers.|loud music old classic
Disco Dancing|Point to the sky.|music fun old classic
Love Songs|Baby, baby, baby.|love music sweet
Lip-Sync Battles|Mouth it with feeling.|music funny
Rock Star Smashing a Guitar|Expensive tantrum.|loud angry
Sad Ballads|Heartbreak in three minutes.|sad music
Song Lyrics You Get Wrong|Hold me closer, Tony Danza.|funny silly
Concert T-Shirts|Proof you were there.|music cool
Bands with One Name|Mononymous and proud.|famous cool
Encores|One more song!|exciting music
Out-of-Tune Pianos|Grandma's living room classic.|annoying music old
Tone-Deaf Singers|Confident, not correct.|funny loud
Rhythm Sticks|Clack clack.|music simple
Talent Show Singers|Brave and wobbly.|music brave
Music Festivals|Mud, tents, and bands.|music fun messy` },
    { id: "holidays", name: "Holidays",
      g: `Merry|Jolly, festive, cheery|festive happy
Spooktacular|Ghoulish, eerie, frightful|scary festive fun
Thankful|Grateful, appreciative, blessed|happy love
Twinkly|Sparkling, glittering, glimmering|bright shiny beautiful
Wintry|Snowy, frosty, icy|cold beautiful
Generous|Giving, kind, big-hearted|love kind happy
Overstuffed|Gorged, bloated, full|heavy big
Traditional|Customary, time-honored, classic|classic old
Patriotic Parade|Red-white-and-blue, proud, marching|loud festive
Lovey-Dovey|Mushy, romantic, smitten|love sweet
Gift-Wrapped|Bowed, boxed, surprising|festive exciting
Candlelit|Glowing, warm, romantic|bright cozy love
Hectic Holiday|Rushed, frenzied, crowded|busy loud
Lucky Charm|Fortunate, blessed, four-leafed|magic happy
Resolution-Ready|Determined, fresh-start, motivated|new healthy
Egg-Citing|Thrilling, hatching, eggs-ellent|exciting fun silly
Snowed-In|Stuck, cozy, buried|cold cozy quiet
Masked|Costumed, disguised, hidden|mysterious fake
Gobble-Worthy|Delicious, feast-ready, hearty|tasty big
Sentimental|Nostalgic, emotional, tender|love sad old`,
      r: `Advent Calendars|A chocolate a day.|sweet festive
April Showers|Bring May flowers.|wet nature
Birthday Songs at Restaurants|The whole staff clapping, off-key.|loud funny festive shy silly
Black Friday Sales|Doorbusters and elbows.|busy cheap crazy
Candy Hearts|Be mine, text me, cutie.|sweet love cute
Chinese New Year|Dragons, firecrackers, red envelopes.|loud festive color
Christmas Morning|Wrapping paper explosion.|exciting festive happy
Christmas Sweaters|Knit reindeer and jingle bells.|ugly festive cozy
Cinco de Mayo|Tacos and celebration.|festive tasty
Costume Contests|Best dressed ghoul.|fun festive
Day of the Dead|Sugar skulls and marigolds.|color festive
Easter Bunny|A rabbit who brings eggs. Somehow.|cute festive weird
Easter Egg Hunts|Find them before the dog does.|fun exciting
Eggnog|Holiday drink, love it or loathe it.|sweet weird
Elf on the Shelf|Watching. Always watching.|scary weird festive
Family Reunions|Who's that cousin?|loud happy
Father's Day Ties|The gift of the year, every year.|boring classic
Fourth of July|Fireworks and barbecues.|loud festive hot
Groundhog Day|A rodent predicts the weather.|silly weird
Gingerbread Men|Run, run, as fast as you can!|sweet cute
Halloween|Trick or treat!|scary festive
Hanukkah|Eight nights of lights.|bright festive
Holiday Leftovers|Turkey sandwiches for a week.|tasty cold
Holiday Shopping|Crowded malls and long lists.|busy annoying
Holiday Travel|Packed airports and delays.|busy annoying
Kwanzaa|Seven principles, seven candles.|festive important
Labor Day|The last summer barbecue.|relaxing
Leap Day|Once every four years.|rare weird
Love Letters on Valentine's|Doodled hearts and secrets.|love sweet
Mardi Gras|Beads and masks.|festive color loud
Memorial Day|Remembering heroes.|important
Mistletoe|Watch where you stand.|love festive
Mother's Day Breakfast|Burnt toast made with love.|love sweet
New Year's Eve|Countdown and confetti.|festive exciting loud
New Year's Resolutions|Gym memberships in January.|new silly
Nutcrackers|Wooden soldiers with big teeth.|festive classic
Office Holiday Parties|Awkward secret Santa.|shy silly festive
Pumpkin Carving|Gooey insides, glowing faces.|messy fun festive
Pumpkin Spice|It's in everything now.|popular sweet
Reindeer|Santa's flying team.|festive flying cute
Santa's Workshop|Elves working overtime.|busy festive
Secret Santa|Who got me socks?|mysterious festive
Shamrocks|Lucky green leaves.|color magic happy
Sleigh Rides|Dashing through the snow.|cold fun festive
Snow Globes|Shake it and watch.|cute beautiful
St. Patrick's Day|Wear green or get pinched.|color festive
Stockings|Stuffed with treats.|festive cozy
Sugar Plums|Dancing in your head.|sweet festive
Thanksgiving Turkey|The star of the table.|tasty festive big
Tinsel|Shiny strings everywhere.|shiny festive messy
Toy Drives|Gifts for everyone.|kind festive
Trick-or-Treaters|Doorbell ringing all night.|fun festive
Turkey Comas|Nap time after dinner.|sleepy lazy
Valentine's Day|Roses, chocolates, and cards.|love sweet
Wreaths|Front door decorations.|festive beautiful
Yule Logs|A fire you watch on TV.|cozy festive
Christmas Carolers|Singing at your door.|music festive
Holiday Lights Contest|The neighbor with too many lights.|bright festive
Dreidels|Spin to win.|fun festive
Fruitcake Doorstops|Its true purpose.|heavy funny
Leprechauns|Tiny guys with gold.|magic small mysterious
Birthday Wishes|Blow out the candles.|magic happy
Birthday Crowns|King or queen for a day.|royal festive
Haunted Hayrides|Screaming on a tractor.|scary fun
Halloween Masks|Who's behind there?|scary fake
Gift Receipts|Just in case.|important
Wrapping Paper Battles|Tape everywhere.|messy fun
Snow Days on Holidays|Double bonus.|happy cold
Holiday Movie Marathons|Same movies every year.|cozy festive
Candy Canes|Peppermint shepherd hooks.|sweet festive` },
    { id: "animals", name: "Animals",
      g: `Furry|Fuzzy, hairy, woolly|fluffy soft
Feathery|Plumed, downy, fluffy|fluffy light flying
Scaly|Reptilian, armored, rough|rough hard weird
Slithery|Snaky, wriggly, sly|slimy scary mysterious
Ferocious|Savage, fierce, vicious|wild danger angry
Playful|Frisky, bouncy, fun-loving|fun happy cute
Loyal|Faithful, devoted, true|love hero
Nocturnal|Night-loving, after-dark, owlish|dark quiet
Venomous|Poisonous, toxic, deadly|danger scary
Domesticated|Tame, house-trained, gentle|safe calm cute
Majestic Beast|Grand, noble, impressive|big royal beautiful
Clever Critter|Crafty, cunning, sly|smart mysterious
Slobbery|Drooly, wet, sloppy|wet gross
Stealthy|Sneaky, silent, prowling|quiet mysterious
Migrating|Traveling, wandering, flocking|flying long
Endangered|Rare, threatened, vulnerable|rare sad
Spotted|Dotted, speckled, freckled|color weird
Snuggly|Cuddly, warm, huggable|cute soft cozy
Chirpy|Tweeting, cheerful, twittery|happy music small
Stampeding|Charging, thundering, rushing|fast loud danger big`,
      r: `Alligators|Toothy grins in the swamp.|danger scary water
Alpacas|Llamas' fluffier cousins.|fluffy cute weird
Anteaters|Long tongues, long noses.|weird long
Armadillos|Armored and rolled-up.|hard weird
Baby Ducklings|Following in a perfect line.|cute small
Bald Eagles|Proud and patriotic.|flying famous
Barn Owls|Who? Who?|quiet flying dark
Beavers|Nature's carpenters.|busy nature
Bison|Big shaggy grazers.|big strong
Blue Whales|Biggest animal ever.|big water
Bulldogs|Wrinkly snorers.|cute ugly
Bumblebees|Fuzzy flying buzzers.|small fluffy flying
Camels|Desert taxis with humps.|dry weird
Chameleons|Color-changing lizards.|color weird mysterious
Cheetahs|Fastest on land.|fast wild
Chickens|Cluck, peck, lay.|silly loud
Chihuahuas|Small dogs, big attitudes.|small loud angry
Chimpanzees|Our clever cousins.|smart funny
Chipmunks|Cheek-stuffing cuties.|cute small fast
Cockroaches|Survivors of everything.|gross strong
Cows|Milk machines that moo.|calm big
Crabs|Sideways pinchers.|sharp funny
Crows|Clever black birds.|smart dark
Dalmatians|Spotted firehouse dogs.|cute famous
Deer|Bambi's family.|cute nature
Dolphins|Smart, playful swimmers.|smart water happy
Donkeys|Stubborn and loud.|loud funny
Dragonflies|Helicopter bugs.|flying beautiful
Eagles|Sharp-eyed sky hunters.|flying strong
Eels|Slippery and shocking.|slimy danger
Elephant Seals|Big noisy beach blobs.|big loud
Emus|Big birds that can't fly.|weird tall
Ferrets|Wiggly noodle pets.|fun cute
Flamingos in a Pond|Pink and on one leg.|color funny
Foxes|Sly and orange.|mysterious smart
Geese|Honking bullies.|loud angry
Gerbils|Pocket-sized pets.|small cute
Gorillas|Gentle giants.|big strong
Grizzly Bears|Big, brown, and hungry.|big danger strong
Guinea Pigs|Squeaky potatoes.|cute small loud
Hamsters|Wheel runners.|cute small
Hedgehogs|Spiky little balls.|cute sharp small
Hermit Crabs|Moving house all the time.|small weird
Horses|Gallop and neigh.|fast strong beautiful
Hummingbirds|Tiny, fast, hovering.|small fast flying
Hyenas|Laughing for no reason.|funny evil
Iguanas|Mini dinosaurs.|weird old
Jaguars|Spotted jungle cats.|fast danger
Killer Whales|Black and white ocean bosses.|big danger water
Ladybugs|Spotted good luck.|cute small
Lemurs|Big-eyed tree dancers.|cute weird
Leopards|Spots that never change.|fast danger
Lions|Kings of the jungle.|royal strong danger
Lizards|Sun-loving scalies.|small weird
Lobsters|Red when they're cooked.|weird sharp
Manatees|Sea cows.|slow calm cute
Meerkats|Lookouts on duty.|cute small
Moles|Underground diggers.|small dark
Moose|Big antlers, bigger nose.|big weird
Mountain Goats|Cliffside climbers.|brave
Mules|Stubborn helpers.|strong angry hard
Narwhals|Unicorns of the sea.|rare magic water
Ostriches|Head-in-the-sand birds.|tall silly fast
Otters|Holding hands while sleeping.|cute water
Owls|Wise night watchers.|smart quiet
Pandas|Bamboo munchers.|cute fluffy lazy
Panthers|Black and sleek.|dark danger
Peacocks|Show-off feathers.|beautiful color
Pelicans|Fish in the beak.|funny water
Pigeons|City birds.|common annoying
Pigs|Muddy and smart.|messy smart
Piranhas|Tiny teeth, big appetite.|danger sharp
Platypuses|Duck-billed puzzles.|weird
Poodles|Fancy haircuts.|rich fluffy
Prairie Dogs|Pop-up neighbors.|cute
Pufferfish|Inflate when scared.|weird round
Pugs|Squished faces and snorts.|cute funny
Raccoon Bandits|Trash can heists.|mysterious
Rams|Head-butting champs.|strong hard
Rattlesnake Tails|Shake, rattle, run.|danger
Reindeer Herds|Snowy travelers.|cold
Rhinoceroses|Horned tanks.|big strong
Roosters|Wake-up calls.|loud annoying
Salmon|Swimming upstream.|brave water
Scorpions|Stinging tails.|danger scary
Sea Lions|Barking beach-loungers.|loud lazy
Sea Turtles|Ancient ocean wanderers.|old slow
Seahorses|Dads give birth.|weird cute
Sheep|Fluffy followers.|fluffy calm
Snails|Slow mail.|slow slimy
Sparrows|Small chirpers.|small common
Squids|Ink and tentacles.|weird slimy
Starfish|Five-armed sea stars.|cute water
Swans|Graceful but grumpy.|beautiful angry
Tarantulas|Hairy, big spiders.|scary fluffy
Tigers|Striped and fierce.|danger strong beautiful
Toucans|Big colorful beaks.|color funny
Tree Frogs|Sticky toes.|sticky color small
Vultures|Waiting patiently.|scary weird flying
Walruses|Mustached tuskers.|big funny
Warthogs|Not pretty, very proud.|ugly funny
Wolf Packs|Howling together.|wild loud
Woodpeckers|Head bangers.|loud annoying
Yaks|Hairy mountain cows.|fluffy cold
Bloodhounds|Noses that never quit.|smart smelly
Guide Dogs|Heroes in harnesses.|hero smart
Stray Cats|Alley kings.|wild mysterious
Pet Fish|They never fetch.|boring calm
Barn Animals|Moos, oinks, and clucks.|loud smelly` },
    { id: "tech", name: "Technology",
      g: `Digital|Electronic, computerized, online|tech new
Wireless|Cordless, Bluetooth, untethered|tech new light
Glitchy|Buggy, crashing, broken|annoying tech weird
Futuristic|Space-age, advanced, cutting-edge|new tech space
Obsolete|Outdated, retired, ancient tech|old boring
User-Friendly|Easy, intuitive, simple|simple safe
Automated|Robotic, self-running, hands-free|tech lazy
Virtual|Simulated, online, pretend|fake tech
Hackable|Insecure, breakable, leaky|danger tech
Battery-Draining|Power-hungry, exhausting, greedy|annoying tech
Pixelated|Blocky, grainy, low-res|old classic tech
Cloud-Based|Online, remote, floating somewhere|tech mysterious
Plugged In|Online, connected, wired|tech busy
Upgraded|Improved, enhanced, souped-up|new powerful
Buffering|Loading, stalling, waiting|slow annoying
Supercharged|Turbocharged, boosted, powerful|fast powerful
Robotic|Mechanical, stiff, automated|tech weird
High-Definition|Crystal-clear, sharp, crisp|bright beautiful tech
Encrypted|Secret, coded, locked|mysterious smart
Addictive|Habit-forming, can't stop, irresistible|fun popular`,
      r: `3-D Printers|Print a toy, not a page.|tech new
Apps|There's one for that.|tech popular
Artificial Intelligence|Computers that try to think.|tech smart
Autocorrect|Turning 'on my way' into 'on my whale.'|annoying funny tech
Batteries|Always dead when you need them.|tech small
Blue Screen of Death|Your computer's fainting spell.|tech scary
Bluetooth Speakers|Party in your pocket.|music tech
Calculators|Math's best friend.|smart tech
Captchas|Click every traffic light.|annoying tech
Charging Cables|Never long enough.|tech annoying
Chatbots|Robots that answer back.|tech weird
Computer Viruses|Digital sneezes.|danger tech
Cyber Security|Passwords with special characters.|tech important
Dial-Up Internet|Beep-boop-screech.|old loud slow
Digital Cameras|Thousands of photos you'll never look at.|tech
Drones|Flying cameras.|flying tech
E-Readers|Books without paper.|tech quiet
Electric Cars|Quiet and plug-in.|tech quiet new
Emoji Keyboards|A hundred faces to choose from.|fun tech
Fax Machines|Beeping paper senders.|old loud
Firewalls|Digital castle walls.|safe tech
Fitness Trackers|Counting every step.|healthy tech
Flash Drives|Tiny file carriers.|small tech
Floppy Disks|The save icon in real life.|old classic
Game Controllers|Button-mashing tools.|fun tech
GPS|Recalculating...|tech smart
Hackers|Hooded figures typing fast.|mysterious danger tech
Hard Drives|Spinning memory.|tech
Holograms|Ghosts made of light.|tech bright weird
Hoverboards|Not quite hovering.|tech fun danger
Jetpacks|Still waiting for these.|flying exciting
Keyboard Shortcuts|Control-Z saves lives.|smart tech
Laptops|Computers on your lap.|tech
Loading Screens|Please wait...|slow annoying
Lost Wi-Fi Signal|Panic mode activated.|annoying sad
Mechanical Keyboards|Clickety-clack, loudly.|loud tech
Motherboards|Computer cities.|tech complicated
Online Shopping|Click, buy, regret.|tech fun
Online Video Calls|You're on mute.|tech shy silly
Passwords|Password123.|tech annoying
Phone Cases|Sparkly protection.|tech cute
Phone Notifications|Ding! Ding! Ding!|annoying tech
Pinball Machines|Flippers and flashing lights.|fun loud old classic
Pixel Art|Blocky beauty.|old classic color
Pop-Up Ads|Close! Close! Close!|annoying tech
Printers|Paper jams on demand.|annoying tech
Remote-Control Cars|Zoom around the living room.|fast fun
Robot Dogs|Fetch without fur.|tech cute weird
Rocket Science|Not that hard, right?|smart complicated
Screen Time|Just five more minutes.|tech lazy
Search Engines|Answers to everything.|tech smart
Self-Driving Cars|Look ma, no hands!|tech new
Smart Fridges|They know you ate the cheese.|tech weird
Smartwatches|Tiny phones on your wrist.|tech
Social Media|Everyone's highlights.|popular tech
Software Updates|Restart now or later?|annoying tech
Solar Cars|Sun-powered rides.|tech nature
Spam Emails|You've won a prince's fortune!|annoying fake
Spreadsheets|Rows and columns forever.|boring complicated
Supercomputers|Brains the size of rooms.|tech powerful smart
Tablets|Big phones without calls.|tech
Teleporters|Beam me up.|tech magic
Text Messages|lol, brb, ttyl.|tech popular
The Cloud|Your stuff, somewhere.|tech mysterious
Touchscreens|Smudge-covered glass.|tech
Video Calls with Grandma|Can you see me? I can see your forehead.|funny tech love
Virtual Reality|Goggles to another world.|tech fun
Voice Assistants|Sorry, I didn't catch that.|tech annoying
Walkie-Talkies|Over and out.|fun old classic
Webcams|Tape over it.|tech scary weird
Wi-Fi Passwords|Taped to the fridge.|tech important
Wires Behind the TV|Spaghetti of cables.|messy tech
Word Processors|Typing with spell check.|tech boring
Zip Files|Squished folders.|tech small
Arcade Games|Quarters and high scores.|fun old classic
Computer Mice|Click and scroll.|tech small
Escape Rooms|Locked in on purpose.|fun mysterious
Gadgets|Shiny things that beep.|tech shiny
Lasers in Labs|Do not look directly.|bright danger
Robot Arms|Precise and mechanical.|tech strong
Satellite Dishes|Catching signals from space.|tech space
Smart Homes|Lights turn on when you clap.|tech fun
Coding|Writing in computer language.|smart tech
Video Game Glitches|Walking through walls.|weird funny tech
Charging at One Percent|Living on the edge.|danger annoying
Old Cell Phones|Bricks with antennas.|old classic heavy
Tech Support|Have you tried turning it off and on?|tech annoying
Emojis in Work Emails|Bold choice.|funny shy silly
Selfie Drones|Following you around.|tech flying` },
    { id: "fantasy", name: "Fantasy and Myth",
      g: `Enchanted|Bewitched, spellbound, charmed|magic beautiful mysterious
Mythical|Legendary, fabled, storied|magic old famous
Cursed|Jinxed, hexed, doomed|evil scary dark
Wizardly|Sorcerous, arcane, mystic|magic smart
Fire-Breathing|Flaming, scorching, dragonish|hot danger
Otherworldly|Unearthly, alien, supernatural|weird mysterious space
Heroic Quest|Epic, adventurous, daring|hero brave exciting
Immortal|Undying, eternal, everlasting|old powerful
Gigantic|Titanic, colossal, mountainous|big heavy tall
Mischievous Fairy|Impish, puckish, prankish|silly magic small
Spellbinding|Captivating, mesmerizing, hypnotic|magic exciting
Shape-Shifting|Morphing, changing, transforming|magic weird
Haunting|Ghostly, eerie, unforgettable|scary sad mysterious
Golden|Gilded, gleaming, precious|shiny rich
Dark Lord|Sinister, villainous, menacing|evil dark powerful
Fabled|Legendary, storied, mythic|old famous
Celestial|Heavenly, starry, divine|space beautiful bright
Monstrous|Beastly, hideous, enormous|scary ugly big
Sacred|Holy, revered, blessed|important old
Whimsical|Playful, fanciful, quirky|silly magic cute`,
      r: `Angels|Halos and harps.|kind beautiful flying
Bigfoot|Blurry photos only.|big mysterious fluffy
Centaurs|Half horse, half human.|weird magic
Cerberus|Three heads, three times the barking.|scary danger
Cupid|Diaper-clad archer of love.|love flying cute
Cyclops|One eye, big temper.|big angry
Dragon Eggs|Hatching soon.|hot rare magic
Dungeons|Damp, dark, and full of monsters.|dark scary
Dwarves|Miners with big beards.|small strong
Elves|Pointy ears, keen eyes.|magic beautiful
Enchanted Forests|Trees that whisper.|magic nature mysterious
Excalibur|The sword in the stone.|sharp royal magic
Fairies|Tiny wings, big mischief.|magic small cute
Fire-Breathing Dragons|Toasty and terrifying.|hot danger flying
Flying Carpets|Rugs with frequent flyer miles.|flying magic
Genies|Three wishes, fine print.|magic powerful
Ghost Ships|Sailing with no crew.|scary mysterious water
Giants|Fee-fi-fo-fum.|big tall
Gnomes|Garden guardians.|small cute
Goblins|Greedy little troublemakers.|evil small ugly
Golden Eggs|Laid by a very special goose.|shiny rich rare
Gorgons|Don't look at their hair.|scary danger
Griffins|Eagle front, lion back.|flying strong magic
Hercules|Strongest guy around.|strong hero famous
Hobbits|Second breakfast, anyone?|small cozy
Hydras|Cut one head, two grow back.|danger scary
Invisibility Cloaks|Now you see me...|magic mysterious
Krakens|Giant sea monsters.|big danger water
Leprechaun Gold|At the end of the rainbow.|rich magic
Loch Ness Monster|Shy lake celebrity.|mysterious water famous
Love Potions|Bottled crushes.|love magic
Magic Beans|Grow to the clouds.|magic weird
Magic Carpets|Floating rug rides.|flying magic
Magic Mirrors|Who's the fairest of them all?|magic shiny
Magic Wands|Flick, swish, sparkle.|magic
Medusa|Hair full of snakes.|scary evil
Merlin|The wizard's wizard.|magic smart old
Minotaurs|Bull-headed maze dwellers.|scary strong
Mount Olympus|Home of the gods.|tall royal
Mummies' Curses|Disturb the tomb, regret it.|scary evil
Ogres|Grumpy swamp giants with big appetites.|big ugly angry
Pegasus|Horse with wings.|flying beautiful magic
Phoenixes|Rise from the ashes.|hot flying magic
Pixie Dust|A sprinkle and you fly.|magic flying shiny
Poseidon|Ruler of the seas.|water powerful
Potions|Bubbling cauldron concoctions.|magic weird
Princes on White Horses|Late but heroic.|royal hero
Pumpkin Carriages|Midnight deadline.|magic festive
Robots in Fantasy|Clockwork knights.|tech weird
Santa's Elves|Toy makers in tights.|festive busy small
Sea Serpents|Twisty monsters of the deep.|scary water long
Sirens|Singing sailors into trouble.|music danger beautiful
Sleeping Beauty|The ultimate nap.|sleepy beautiful
Sorcerers|Spellcasters supreme.|magic powerful
Spell Books|Ancient instructions for magic.|magic old
Talking Animals|They have opinions.|magic funny
The Boogeyman|Under your bed, maybe.|scary dark
The Fountain of Youth|Drink and stay young.|magic water
The Holy Grail|The ultimate lost cup.|rare important
The Tooth Fairy|Pays cash for teeth.|magic cute
Thor's Hammer|Only the worthy can lift it.|strong powerful
Time-Traveling Wizards|Spells across the ages.|magic weird
Treasure Chests|Gold, jewels, and a curse.|rich mysterious
Trolls|Under bridges, charging tolls.|ugly angry
Unicorn Horns|Sparkly and pointy.|magic sharp
Valkyries|Warrior maidens in the sky.|brave flying
Vampire Castles|Bats in the belfry.|scary dark
Werewolves|Hairy on full moons.|scary wild
Witches' Brooms|Flying housekeeping tools.|flying magic
Wizard Hats|Pointy and starry.|magic
Yetis|Abominable snowmen.|cold big mysterious
Zeus|Lightning-bolt-throwing boss.|powerful loud
Dragon Hoards|Mountains of gold.|rich big
Enchanted Castles|Turrets and spells.|magic royal
Crystal Balls|See your future.|magic mysterious
Fairy Rings|Mushroom circles.|magic nature
Haunted Forests|Trees with eyes.|scary dark
Hidden Kingdoms|Not on any map.|mysterious royal
Magic Lamps|Rub for a surprise.|magic shiny
Moon Goddesses|Glowing night rulers.|beautiful space
Mythical Beasts|Half this, half that.|weird magic
Sword Fights|Clang! Clang!|danger exciting
Talking Trees|Wise and slow.|old slow smart
Three Wishes|Choose wisely.|magic important
Trolls Under Bridges|Pay the toll.|annoying
Wishing Stars|Twinkle twinkle.|magic bright
Wizard Duels|Spells flying everywhere.|magic exciting
Fairy Godparents|Magic helpers.|magic kind
Ice Queens|Cold-hearted rulers.|cold royal evil` }
  ]
};
