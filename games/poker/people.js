// The people at the poker tables: computer players with names, ages, real jobs, hometowns and a line of
// backstory each, and, now and then (about 1 in 20 early on, more at the big events), a table nickname.
//   PokerPeople.make({ tough: 0..1, intl: 0..1, avoid: [names] }) -> { name, first, last, nick, age, job, home, story }
//   name is what the table shows: the nickname if there is one, otherwise first name and last initial.
(function () {
  'use strict';
  var FIRST = ('James Mary Robert Patricia John Jennifer Michael Linda David Elizabeth William Barbara Richard Susan Joseph Jessica ' +
    'Thomas Sarah Charles Karen Christopher Lisa Daniel Nancy Matthew Betty Anthony Sandra Mark Margaret Donald Ashley Steven Kimberly ' +
    'Paul Emily Andrew Donna Joshua Michelle Kenneth Carol Kevin Amanda Brian Melissa George Deborah Timothy Stephanie Ronald Rebecca ' +
    'Edward Sharon Jason Laura Jeffrey Cynthia Ryan Dorothy Jacob Amy Gary Kathleen Nicholas Angela Eric Shirley Jonathan Emma Stephen ' +
    'Brenda Larry Pamela Justin Nicole Scott Anna Brandon Samantha Benjamin Katherine Samuel Christine Gregory Debra Alexander Rachel ' +
    'Patrick Carolyn Frank Janet Raymond Maria Jack Olivia Dennis Heather Jerry Helen Tyler Catherine Aaron Diane Jose Julie Adam ' +
    'Victoria Nathan Joyce Henry Lauren Zachary Kelly Douglas Christina Peter Ruth Kyle Joan Noah Virginia Ethan Judith Jeremy Evelyn ' +
    'Walter Hannah Christian Andrea Keith Megan Roger Cheryl Terry Jacqueline Austin Madison Sean Teresa Gerald Abigail Carl Sophia ' +
    'Harold Martha Dylan Sara Arthur Gloria Lawrence Janice Jordan Kathryn Jesse Ann Bryan Isabella Billy Judy Bruce Charlotte Gabriel ' +
    'Julia Joe Grace Logan Amber Alan Alice Juan Jean Albert Denise Willie Frances Elijah Danielle Wayne Marilyn Randy Natalie Vincent ' +
    'Diana Mason Brittany Roy Beverly Ralph Kayla Bobby Alexis Russell Lori Bradley Tiffany Philip Rose Eugene Marie Priya Mateo ' +
    'Sofia Diego Camila Luis Valentina Hiroshi Yuki Kenji Mei Wei Jin Arjun Ananya Ravi Deepa Omar Layla Tariq Amira Kwame Ama ' +
    'Chidi Ngozi Sven Ingrid Lars Freya Pierre Amelie Luca Giulia Mateus Beatriz Dmitri Anya Pavel Nadia Mikhail Oksana Rafael Lucia ' +
    'Malik Aaliyah Darnell Keisha Tremaine Imani Bodhi Wren Rhett Delaney Cash Harper Boone Tatum Colt Remy Hollis Juniper').split(' ');
  var LAST = ('Smith Johnson Williams Brown Jones Garcia Miller Davis Rodriguez Martinez Hernandez Lopez Gonzalez Wilson Anderson Thomas ' +
    'Taylor Moore Jackson Martin Lee Perez Thompson White Harris Sanchez Clark Ramirez Lewis Robinson Walker Young Allen King Wright ' +
    'Scott Torres Nguyen Hill Flores Green Adams Nelson Baker Hall Rivera Campbell Mitchell Carter Roberts Gomez Phillips Evans Turner ' +
    'Diaz Parker Cruz Edwards Collins Reyes Stewart Morris Morales Murphy Cook Rogers Gutierrez Ortiz Morgan Cooper Peterson Bailey Reed ' +
    'Kelly Howard Ramos Kim Cox Ward Richardson Watson Brooks Chavez Wood James Bennett Gray Mendoza Ruiz Hughes Price Alvarez Castillo ' +
    'Sanders Patel Myers Long Ross Foster Jimenez Powell Jenkins Perry Russell Sullivan Bell Coleman Butler Henderson Barnes Gonzales ' +
    'Fisher Vasquez Simmons Romero Jordan Patterson Alexander Hamilton Graham Reynolds Griffin Wallace Moreno West Cole Hayes Bryant ' +
    'Herrera Gibson Ellis Tran Medina Aguilar Stevens Murray Ford Castro Marshall Owens Harrison Fernandez McDonald Woods Washington ' +
    'Kennedy Wells Vargas Henry Chen Freeman Webb Tucker Guzman Burns Crawford Olson Simpson Porter Hunter Gordon Mendez Silva Shaw ' +
    'Snyder Mason Dixon Munoz Hunt Hicks Holmes Palmer Wagner Black Robertson Boyd Rose Stone Salazar Fox Warren Mills Meyer Rice ' +
    'Schmidt Garza Daniels Ferguson Nichols Stephens Soto Weaver Ryan Gardner Payne Grant Dunn Kelley Spencer Hawkins Arnold Pierce ' +
    'Hansen Peters Santos Hart Bradley Knight Elliott Cunningham Duncan Armstrong Hudson Carroll Lane Riley Andrews Ray Berry Perkins ' +
    'Whitfield Calloway Delgado Okafor Mensah Lindqvist Novak Kowalski Petrov Volkov Rossi Ricci Moreau Laurent Tanaka Sato Yamamoto ' +
    'Nakamura Wong Liu Zhang Singh Sharma Iyer Rao Haddad Khoury Nasser Abbasi Brennan Gallagher Doyle Quinn Fitzgerald MacLeod Sinclair ' +
    'Ashworth Pemberton Holloway Merriweather Blackwood Thornton Whitaker Beauchamp Lindgren Halvorsen Kowalczyk Szabo Horvath Kovac').split(' ');
  var JOBS = ['dental hygienist', 'long-haul trucker', 'high school chemistry teacher', 'actuary', 'retired firefighter', 'ER nurse', 'electrician',
    'wedding photographer', 'tax accountant', 'line cook', 'pharmacist', 'real estate agent', 'airline pilot', 'veterinarian', 'plumber',
    'software engineer', 'insurance adjuster', 'cattle rancher', 'bartender', 'math professor', 'paramedic', 'used-car salesman',
    'school bus driver', 'orthodontist', 'crane operator', 'hairdresser', 'county judge', 'roofing contractor', 'sports radio host',
    'pastry chef', 'park ranger', 'claims auditor', 'tattoo artist', 'night-shift security guard', 'HVAC technician', 'piano tuner',
    'commercial fisherman', 'emergency room doctor', 'librarian', 'auto mechanic', 'data analyst', 'retired Army sergeant', 'chiropractor',
    'barista', 'restaurant owner', 'landscape architect', 'court stenographer', 'welder', 'mail carrier', 'yoga instructor',
    'investment banker', 'grad student in statistics', 'funeral director', 'flight attendant', 'golf pro', 'crop duster pilot',
    'real estate developer', 'hospice chaplain', 'florist', 'oil rig worker', 'magician', 'stand-up comic', 'zookeeper', 'sommelier',
    'carpenter', 'radiologist', 'retired schoolteacher', 'cab driver', 'event planner', 'small-town mayor', 'brewery owner',
    'casino dealer on a night off', 'professional poker player', 'day trader', 'sushi chef',
    'pawn shop owner', 'game designer', 'jazz drummer', 'retired cop', 'hedge fund analyst', 'physical therapist', 'Uber driver',
    'semi-retired dentist', 'archaeologist', 'auctioneer', 'weather forecaster', 'locksmith', 'beekeeper', 'tow truck driver',
    'cosmetic surgeon', 'divorce lawyer', 'public defender', 'campaign manager', 'travel nurse', 'diner waitress', 'sous-chef',
    'carnival ride operator', 'minor-league umpire', 'high school football coach', 'church organist', 'chess coach', 'bail bondsman',
    'mortgage broker', 'appliance repairman', 'semi-pro bowler', 'dog trainer', 'antique dealer', 'cardiologist', 'land surveyor',
    'vineyard owner', 'film editor', 'stunt double', 'race car mechanic', 'ski instructor', 'hotel night manager', 'retired NFL lineman',
    'cryptocurrency investor', 'shipping container broker', 'aerospace engineer', 'nursing home administrator', 'gym owner', 'tailor',
    'pet groomer', 'landlord with nine duplexes', 'grain elevator manager', 'harbor pilot', 'retired Navy cook', 'quarry foreman',
    'jewelry appraiser', 'video editor', 'tech startup founder', 'marine biologist', 'concert promoter', 'pediatrician',
    'crossword constructor', 'sports agent', 'jockey', 'horse trainer', 'mattress salesman', 'billboard painter', 'clockmaker'];
  var HOME = ['Tulsa', 'Boise', 'El Paso', 'Duluth', 'Mobile', 'Fresno', 'Wichita', 'Spokane', 'Shreveport', 'Amarillo', 'Akron', 'Lubbock',
    'Des Moines', 'Little Rock', 'Chattanooga', 'Knoxville', 'Savannah', 'Billings', 'Fargo', 'Sioux Falls', 'Rapid City', 'Cheyenne', 'Casper',
    'Pueblo', 'Grand Junction', 'Colorado Springs', 'Fort Collins', 'Highlands Ranch', 'Aurora', 'Albuquerque', 'Santa Fe', 'Tucson', 'Flagstaff',
    'Reno', 'Henderson', 'Bakersfield', 'Modesto', 'Stockton', 'Eugene', 'Tacoma', 'Anchorage', 'Honolulu', 'Omaha', 'Lincoln', 'Topeka',
    'Kansas City', 'Springfield', 'St. Louis', 'Peoria', 'Rockford', 'Madison', 'Green Bay', 'Grand Rapids', 'Flint', 'Toledo', 'Dayton',
    'Cincinnati', 'Louisville', 'Lexington', 'Memphis', 'Nashville', 'Birmingham', 'Jackson', 'Baton Rouge', 'Lafayette', 'Galveston',
    'Corpus Christi', 'San Antonio', 'Waco', 'Fort Worth', 'Dallas', 'Houston', 'Pensacola', 'Tallahassee', 'Tampa', 'Orlando',
    'Jacksonville', 'Charleston', 'Raleigh', 'Asheville', 'Richmond', 'Norfolk', 'Baltimore', 'Wilmington', 'Atlantic City', 'Scranton',
    'Pittsburgh', 'Erie', 'Buffalo', 'Syracuse', 'Albany', 'Hartford', 'Providence', 'Worcester', 'Portland, Maine', 'Burlington', 'Bangor',
    'Brooklyn', 'the Bronx', 'Queens', 'Jersey City', 'Philadelphia', 'Chicago', 'Detroit', 'Minneapolis', 'Milwaukee', 'Indianapolis',
    'Columbus', 'Cleveland', 'New Orleans', 'Las Vegas', 'Phoenix', 'San Diego', 'Sacramento', 'Seattle', 'Portland', 'Salt Lake City',
    'Denver', 'Austin', 'Miami', 'Atlanta', 'Boston'];
  var ABROAD = ['Toronto', 'Montreal', 'Vancouver', 'London', 'Manchester', 'Dublin', 'Glasgow', 'Paris', 'Lyon', 'Marseille', 'Berlin',
    'Hamburg', 'Vienna', 'Prague', 'Budapest', 'Warsaw', 'Stockholm', 'Oslo', 'Copenhagen', 'Helsinki', 'Amsterdam', 'Brussels', 'Madrid',
    'Barcelona', 'Lisbon', 'Rome', 'Milan', 'Naples', 'Athens', 'Istanbul', 'Tel Aviv', 'Dubai', 'Mumbai', 'Bangalore', 'Singapore',
    'Kuala Lumpur', 'Manila', 'Hong Kong', 'Macau', 'Shanghai', 'Seoul', 'Tokyo', 'Osaka', 'Sydney', 'Melbourne', 'Auckland',
    'Buenos Aires', 'Sao Paulo', 'Rio de Janeiro', 'Mexico City', 'Monterrey', 'Bogota', 'Lima', 'Johannesburg', 'Cape Town', 'Lagos',
    'Accra', 'Nairobi', 'Reykjavik', 'Tallinn', 'Kyiv', 'Bucharest', 'Sofia', 'Zagreb'];
  var STORY = [
    'Learned the game in the {svc} and hasn\'t missed a Thursday game since.',
    'Plays the same three numbers in the lottery every week and the same two cards in Hold\'em: anything suited.',
    'Started playing to pay for {kid}\'s braces. The braces are long paid for.',
    'Reads every poker book ever written, then ignores all of them.',
    'Keeps a notebook on every regular in {town}. You\'re in it now.',
    'Won a {car} in a radio contest in 1998 and still drives it to every game.',
    'Got hooked watching tournaments on TV during a long recovery from knee surgery.',
    'Took up poker after retiring and now plays more hours than at the old job.',
    'Has a lucky {charm} that goes on the table before every hand.',
    'Calls every bet "just to see." Sometimes it works.',
    'Once folded four aces on a dare and has never lived it down.',
    'Learned from a grandmother who ran the best kitchen game in {town}.',
    'Takes long, quiet pauses before every decision, even the easy ones.',
    'Taught {kid} to count cards at age eight. The family no longer plays Go Fish.',
    'Drove {miles} miles for this game and plans to drive home richer.',
    'Calculates pot odds out loud, under the breath, in a mild panic.',
    'Plays exactly one hand an orbit. When the chips go in, look out.',
    'Bluffs whenever it rains. Check the weather.',
    'Has been "about to quit poker" for {years} years.',
    'Runs a weekly home game in {town} with chili and a strict no-phones rule.',
    'Paid off a student loan with one great night in {town} and has been chasing that night since.',
    'Wears sunglasses indoors and insists it\'s for the glare.',
    'Was a chess prodigy, switched to poker at 19 and never looked back.',
    'Tips the dealer generously and the other players never.',
    'Says "nice hand" after every pot, especially the ones they lose.',
    'Shuffles chips like a pro and plays like an amateur. Or is that the act?',
    'Brought homemade cookies for the table. Suspiciously generous.',
    'Won the {town} charity tourney three years running and mentions it often.',
    'Was the youngest player ever to win the {town} charity tourney, at 21.',
    'Keeps a picture of {pet} in the card protector.',
    'Plays tight all night and then shoves with seven-deuce, every single time.',
    'Claims to have played with a famous pro in {town2} and lost "on a bad beat."',
    'Spends breaks reviewing hands on a phone app and muttering.',
    'Learned poker in a {svc} barracks and plays with the same discipline.',
    'Has never once raised before the flop. Not once.',
    'Talks the whole time and somehow remembers every card.',
    'Calls the clock on everybody. Everybody.',
    'Moved to {town} for work and found the card room before the grocery store.'];
  var FILL = {
    svc: ['Navy', 'Army', 'Coast Guard', 'Air Force', 'Marines', 'Peace Corps'],
    kid: ['a daughter', 'a son', 'the twins', 'a nephew'],
    car: ['minivan', 'pickup truck', 'convertible', 'station wagon'],
    charm: ['silver dollar', 'rabbit\'s foot', 'plastic dinosaur', 'poker chip from 1979', 'smooth river stone', 'casino dice'],
    miles: ['90', '140', '220', '310', '45'],
    years: ['six', 'eleven', 'twenty', 'three'],
    pet: ['a basset hound', 'a cat named Biscuit', 'a parrot', 'two dachshunds'],
    town2: ['Las Vegas', 'Atlantic City', 'Reno', 'Biloxi', 'Monte Carlo']
  };
  var NICK = ['Tex', 'Dr. Assassin', 'The Professor', 'Kid Dynamite', 'Ice Man', 'The Grinder', 'Lucky', 'Doc', 'Big Slick', 'Pocket Rocket',
    'The Magician', 'Mr. Freeze', 'The Mouth', 'Silent Bob', 'Slim', 'Moneybags', 'The Shark', 'Cowboy', 'The Accountant', 'Sarge', 'The Duchess',
    'Red', 'Whispers', 'Hollywood', 'The Machine', 'Bulldozer', 'Snake Eyes', 'The Rabbi', 'Coach', 'The Count', 'Ace', 'The Natural',
    'Bad Beat', 'Showtime', 'The Undertaker', 'Sweet Lou', 'Ma Barker', 'Lady Luck', 'The Kid', 'Big Tuna', 'Dutch', 'Smokey', 'Two-Gun',
    'The Ghost', 'Thunder', 'Jackpot', 'Captain Calls', 'The Dentist', 'Sugar Ray', 'Bones', 'The Bishop', 'Rocket', 'Minnesota Fats',
    'Grandma Grinder', 'The Viking', 'Mr. Clean', 'The Hammer', 'Pokerface', 'Dr. No', 'Fast Eddie', 'Calamity', 'The Wolf', 'Boomer'];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fill(t, town) { return t.replace(/\{(\w+)\}/g, function (m, k) { return k === 'town' ? town : pick(FILL[k] || ['']); }); }
  function make(o) {
    o = o || {};
    var tough = o.tough || 0, avoid = {}, i, p;
    (o.avoid || []).forEach(function (n) { avoid[String(n).toLowerCase()] = 1; });
    for (i = 0; i < 40; i++) {
      var first = pick(FIRST), last = pick(LAST);
      var nickP = 0.05 + 0.17 * Math.max(0, Math.min(1, tough));   // about 1 in 20 at a kitchen table, 1 in 5 at the Main Event
      var nick = Math.random() < nickP ? pick(NICK) : null;
      var name = nick || first + ' ' + last.charAt(0) + '.';
      if (avoid[name.toLowerCase()]) continue;
      var abroad = Math.random() < (o.intl || 0), home = abroad ? pick(ABROAD) : pick(HOME);
      var job = pick(JOBS);
      p = { name: name, first: first, last: last, nick: nick, age: 22 + Math.floor(Math.random() * 54), job: job, home: home, story: fill(pick(STORY), home) };
      if (/Grandma/.test(nick || '')) p.age = Math.max(p.age, 64);
      return p;
    }
    return p || { name: 'Player ' + Math.floor(Math.random() * 99), first: 'Player', last: '', nick: null, age: 40, job: 'mystery guest', home: 'parts unknown', story: '' };
  }
  window.PokerPeople = { make: make };
})();
