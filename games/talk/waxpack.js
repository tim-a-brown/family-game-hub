// What Wax Pack's announcer says, read by games/waxpack/ui.js through Talk.line (games/talk/talk.js). The real history
// comes from the player database (games/waxpack/mlb.json): his season on the card, his career, his All-Star teams,
// awards, World Series rings and the Hall of Fame. Slots: {name} the player, {last} his last name, {team} his team that
// season, {sy} the season on the card, {y} the card's year, and the numbers each line names.
window.TALK_WAXPACK = {
  // A hitter steps in: his season on the card
  hitSeason: [
    '{name} hit {avg} with {hr} home runs for the {team} in {sy}.',
    'In {sy}, {name} batted {avg} for the {team} and hit {hr} home runs.',
    'The back of this card says {avg} with {hr} homers and {rbi} runs batted in, for the {team} in {sy}.',
    'Here comes {name}. He hit {avg} for the {team} the year before this card came out.',
    '{name} drove in {rbi} runs for the {team} in {sy}, with {hr} home runs.',
    'Stepping in, {name}, a {avg} hitter for the {team} in {sy}.',
    '{name} had {hits} hits for the {team} in {sy}.',
    'Batting now, {name}. He played {g} games for the {team} in {sy} and hit {avg}.',
    '{name} comes up. His {sy} season: {avg}, {hr} home runs, {rbi} runs batted in.',
    'Next up is {name}, who hit {avg} with the {team} in {sy}.',
    'Now batting, {name}. The {team} got {hr} home runs out of him in {sy}.',
    'Here’s {name}, a {avg} hitter in {sy}, the season printed on this card.'
  ],
  // A big season: 30 or more home runs, or a .320 average
  bigSeason: [
    '{name} hit {hr} home runs in {sy}. Pitchers were careful with him that year.',
    'That {sy} season was something: {avg} and {hr} home runs for {name}.',
    '{name} was one of the most feared hitters in baseball in {sy}.',
    'Look out. {name} had {hr} home runs in {sy}.',
    'A {avg} hitter in {sy}. Not many batters in the league could say that.',
    '{name} had the kind of year in {sy} that puts a player on a box of cereal.'
  ],
  // Speed: 40 or more steals
  speed: [
    '{name} stole {sb} bases in {sy}. Watch him if he gets on.',
    'If {name} reaches first, he’s going. He stole {sb} bases in {sy}.',
    '{name} ran wild in {sy}, with {sb} stolen bases.',
    'The catcher had better be ready. {name} stole {sb} bases that season.'
  ],
  // A pitcher takes the mound or comes in
  pitchSeason: [
    '{name} went {w} and {l} for the {team} in {sy}, with an earned run average of {era}.',
    'On the mound, {name}. He struck out {so} batters for the {team} in {sy}.',
    '{name} pitched {ip} innings for the {team} in {sy}, with a {era} earned run average.',
    'Taking the ball, {name}, who won {w} games for the {team} in {sy}.',
    '{name} had a {era} earned run average in {sy}, and struck out {so}.',
    'Here’s {name}. The {team} gave him the ball {g} times in {sy}.'
  ],
  closer: [
    '{name} saved {sv} games for the {team} in {sy}.',
    'The {team} closed games with {name} in {sy}. He had {sv} saves.',
    '{name} comes in. He saved {sv} games in {sy}.'
  ],
  // His career and honors
  hof: [
    '{name} is in the Hall of Fame. He went into Cooperstown in {hof}.',
    'A Hall of Famer, {name} was inducted in {hof}.',
    'You’re looking at a Hall of Famer. {name} went into Cooperstown in {hof}.'
  ],
  hofLater: [
    'Nobody knew it in {y}, but {name} would go into the Hall of Fame in {hof}.',
    'This card is from {y}. {name} was inducted into the Hall of Fame in {hof}.',
    'Hang on to this one. {name} went into the Hall of Fame in {hof}.'
  ],
  allStar: [
    '{name} made {n} All-Star teams in his career.',
    'An All-Star {n} times, {name}.',
    '{name} was picked for the All-Star game {n} times.',
    '{n} All-Star teams for {name}.'
  ],
  mvp: [
    '{name} won the Most Valuable Player award in {mvp}.',
    'He was the Most Valuable Player in {mvp}, {name}.',
    '{name}, the Most Valuable Player in {mvp}.'
  ],
  cy: [
    '{name} won the Cy Young Award in {cy}.',
    'A Cy Young winner in {cy}, {name}.',
    '{name} was the best pitcher in his league in {cy}. He won the Cy Young Award that year.'
  ],
  roy: [
    '{name} was the Rookie of the Year in {roy}.',
    'The Rookie of the Year in {roy}, {name}.'
  ],
  ring: [
    '{name} won the World Series with the {wsteam} in {ws}.',
    'He has a World Series ring, {name}, from the {wsteam} in {ws}.',
    '{name} was on the {wsteam} team that won it all in {ws}.'
  ],
  careerHr: [
    '{name} hit {chr} home runs in a career that ran from {y0} to {y1}.',
    'Over {nys} seasons in the big leagues, {name} hit {chr} home runs.',
    '{name} played from {y0} to {y1} and finished with {chits} hits.'
  ],
  careerK: [
    '{name} struck out {cso} batters in {nys} seasons.',
    'Over a career from {y0} to {y1}, {name} won {cw} games.',
    '{name} pitched in the big leagues from {y0} to {y1}.'
  ],
  rookie: [
    'This is {name}’s rookie card. He’s got something to prove.',
    'A rookie card. {name} was just getting started in {y}.',
    'The kid on the rookie card, {name}, steps in for the first time.'
  ],
  // A card nobody can find: a scout's report
  scout: [
    'Nobody in the record book knows {name}. The scout says: {note}.',
    'The book has nothing on {name}. Here’s what the scout wrote: {note}.',
    '{name} is a mystery. The scout’s report says {note}.',
    'Who is {name}? The scout’s notes say {note}.'
  ],
  scoutNote: [
    'quick hands and a long swing', 'a strong arm and a slow first step', 'line drives to every field',
    'can fly, still learning to hit a curve', 'raw power, chases the high fastball', 'a patient hitter with a short stroke',
    'soft hands, light bat', 'swings at everything', 'a ballplayer’s ballplayer'
  ],
  kid: [
    'A sandlot kid fills in. Nobody had a card for this spot.',
    'Here’s a kid from the neighborhood, filling in.',
    'The sandlot kid steps in. He’s just happy to be here.'
  ],
  // His numbers in your league, from your games
  league: [
    '{name} has {lhr} home runs in your league, in {lg} games.',
    'In your league, {name} is hitting {lavg} over {lg} games.',
    'Your league knows {name}: {lh} hits and {lhr} home runs so far.'
  ],
  leagueP: [
    '{name} has struck out {lk} batters in your league.',
    'In your league, {name} has pitched in {lg} games.'
  ],
  // The duel
  guessed: [
    'He was sitting on it.', 'He knew it was coming.', 'Right where he was looking.', 'He guessed right.',
    'That’s the pitch he wanted.', 'He read it all the way.', 'He was ready for that one.'
  ],
  fooled: [
    'He was looking for something else.', 'That pitch fooled him.', 'Not what he expected.', 'He guessed wrong.',
    'The pitcher crossed him up.', 'He was way out in front.'
  ],
  // What happened
  HR: ['Back, back, gone! A home run for {name}!', 'Way back and gone! {name} hits it out!', 'That ball is gone! A home run for {name}!',
    'Goodbye, baseball! {name} goes deep!', 'Into the seats! {name} with a home run!', 'He crushed that one. {name} homers!'],
  slam: ['A grand slam! {name} clears the bases!', 'Grand slam! Four runs on one swing from {name}!', 'Bases loaded and he hits it out! A grand slam for {name}!'],
  S: ['{name} lines a single.', 'A base hit for {name}.', '{name} punches one through the infield.', 'Single for {name}.', '{name} drops one in for a hit.', 'A clean single by {name}.'],
  D: ['{name} rips a double into the gap.', 'Off the wall! A double for {name}.', '{name} doubles down the line.', 'That’s a double for {name}.'],
  T: ['{name} legs out a triple!', 'A triple! {name} slides into third.', 'Into the corner, and {name} has a triple.'],
  BB: ['Ball four. {name} walks.', '{name} takes his base on four balls.', 'He works a walk, {name}.'],
  HBP: ['That one hit him. {name} takes first.', '{name} is hit by the pitch.'],
  K: ['Strike three! {pit} gets him.', '{name} goes down swinging.', 'Struck him out. {pit} wins that one.', 'Called strike three on {name}.', 'Got him swinging. A strikeout for {pit}.'],
  GB: ['{name} grounds out.', 'A ground ball, and {name} is out at first.', '{name} hits it on the ground. One out more.', 'Routine grounder, {name} is out.'],
  FB: ['{name} flies out.', 'A fly ball, caught. {name} is out.', '{name} lifts it, but not far enough.', 'Fly ball to the outfield, and that’s an out.'],
  LD: ['{name} lines out. Right at somebody.', 'Hard hit, but caught. {name} is out.', 'A line drive, snagged. {name} is out.'],
  PU: ['{name} pops it up.', 'A pop-up. Easy out.', '{name} gets under it. Pop out.'],
  dp: ['A double play! Two outs on one swing.', 'Around the horn. Double play!', 'Six, four, three. A double play.'],
  sf: ['A sacrifice fly brings the run home.', 'Deep enough. The runner tags and scores.'],
  E: ['An error! The ball gets away from {fld}.', '{fld} boots it. {name} is on.', 'That’s an error on {fld}. {name} is safe.', 'He couldn’t handle it. An error on {fld}.'],
  Eoff: ['{fld} is playing out of position, and it shows. An error.', 'That’s what happens when a {home} plays {at}. {fld} drops it.', '{fld} doesn’t look at home out there. An error.'],
  // Moments
  sideK: ['Three up, three strikeouts! {pit} strikes out the side!', '{pit} struck out the side. Every one of them!'],
  walkoff: ['That’s the ball game! A walk-off for {name}!', 'They win it! {name} walks it off!', 'Game over! {name} sends everybody home!'],
  pinch: ['The pinch hitter delivers! {name} comes off the bench with a hit!', 'Off the bench, {name}, and he comes through!'],
  pinchHR: ['A pinch-hit home run! {name} came off the bench and hit it out!'],
  noHit: ['{pit} has a no-hitter! Not one hit allowed!', 'No hits! {pit} threw a no-hitter!'],
  change: ['{pit} comes in to pitch.', 'A pitching change. Here comes {pit}.', 'The manager goes to the bullpen for {pit}.'],
  tired: ['{pit} is tiring.', 'That arm is getting heavy for {pit}.', '{pit} is laboring out there.']
};
