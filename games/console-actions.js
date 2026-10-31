// What each button does in each game on the shelves, shown in Controller buttons beside the button and its key.
// From each game's original instruction manual (archive.org); a button the manual gives no job is left out.
// By console, then game (matched on the cartridge's name; aka: other names it goes by). Keys are the console's own
// buttons (Genesis a b c, Atari fire select reset), dpad the directions in general, up/down/left/right their own job.
window.CONSOLE_ACTIONS = {
  nes: {
    "Baseball Simulator 1.000": { dpad: "Aim or pick base", a: "Swing or pitch", b: "Run or Ultra Play", start: "Time out" },
    "Baseball Stars II": { dpad: "Aim or pick base", a: "Swing or pitch", b: "Run or dive catch", start: "Time out" },
    "Baseball Stars": { dpad: "Aim or pick base", a: "Swing or pitch", b: "Run or pickoff", start: "Time out" },
    "Baseball (Nintendo, 1985)": { dpad: "Pick pitch or base", a: "Swing or pitch", b: "Run or pickoff", start: "Pause", aka: ["Baseball"] },
    "Bases Loaded II": { dpad: "Aim or pick base", a: "Swing or pitch", b: "Run or dive", start: "Time out" },
    "Bases Loaded III": { dpad: "Aim or pick base", a: "Swing or pitch", b: "Run or dive", select: "Bunt", start: "Time out" },
    "Bases Loaded IV": { dpad: "Aim or pick base", a: "Swing or pitch", b: "Bunt or run", start: "Time out" },
    "Bases Loaded": { dpad: "Aim or pick base", a: "Swing or pitch", b: "Bunt or run", start: "Time out" },
    "Blades of Steel": { dpad: "Skate", a: "Shoot", b: "Pass or switch player", start: "Pause" },
    "DuckTales": { dpad: "Move", up: "Climb", down: "Climb down", a: "Jump", b: "Pogo or swing cane", start: "Pause" },
    "Ikari Warriors": { dpad: "Move and aim", a: "Grenade or board tank", b: "Fire gun", start: "Pause" },
    "The Legend of Zelda": { dpad: "Walk", a: "Sword", b: "Use item", select: "Pause", start: "Item screen" },
    "Mega Man": { dpad: "Move", up: "Climb", down: "Climb down", a: "Jump", b: "Fire", select: "Pause", start: "Weapon menu" },
    "Mega Man 2": { dpad: "Move", up: "Climb", down: "Climb down", a: "Jump", b: "Fire", start: "Weapon menu" },
    "Mega Man 3": { dpad: "Move", up: "Climb", down: "Slide with A", a: "Jump", b: "Fire", start: "Weapon menu" },
    "Mega Man 4": { dpad: "Move", up: "Climb", down: "Slide with A", a: "Jump", b: "Fire, hold to charge", start: "Weapon menu" },
    "Mega Man 5": { dpad: "Move", up: "Climb", down: "Slide with A", a: "Jump", b: "Fire, hold to charge", start: "Weapon menu" },
    "Mega Man 6": { dpad: "Move", up: "Climb", down: "Slide with A", a: "Jump", b: "Fire, hold to charge", start: "Weapon menu" },
    "Mike Tyson's Punch-Out!!": { dpad: "Dodge", up: "Hold for face punches", down: "Block or duck", left: "Dodge left", right: "Dodge right", a: "Right punch", b: "Left punch", select: "Doc's advice", start: "Uppercut", aka: ["Punch-Out!!"] },
    "Super Mario Bros.": { dpad: "Walk", down: "Crouch", a: "Jump or swim", b: "Run or fireball", start: "Pause" },
    "Super Mario Bros. 2": { dpad: "Walk", up: "Climb or enter door", down: "Duck or super jump", a: "Jump", b: "Pick up or throw", start: "Pause" },
    "Super Mario Bros. 3": { dpad: "Walk", up: "Enter door", down: "Squat or slide", a: "Jump or fly", b: "Run or attack", start: "Pause" }
  },
  snes: {
    "Doom": { dpad: "Walk and turn", up: "Walk forward", down: "Walk back", left: "Turn left", right: "Turn right", a: "Open or use", b: "Run", x: "Switch weapon", y: "Fire", l: "Strafe left", r: "Strafe right", select: "Automap", start: "Pause and menu" },
    "Mega Man 7": { dpad: "Move", up: "Climb ladder", down: "Slide with B", b: "Jump", y: "Fire, hold to charge", l: "Switch weapon", r: "Switch weapon", start: "Weapon screen" },
    "Mega Man X": { dpad: "Move", a: "Dash", b: "Jump or wall climb", y: "Fire, hold to charge", l: "Switch weapon", r: "Switch weapon", start: "Status screen" },
    "Mega Man X2": { dpad: "Move", a: "Dash", b: "Jump or wall climb", y: "Fire, hold to charge", l: "Switch weapon", r: "Switch weapon", start: "Pause and weapon menu" },
    "Mega Man X3": { dpad: "Move", a: "Dash", b: "Jump or wall climb", y: "Fire, hold to charge", l: "Switch weapon", r: "Switch weapon", start: "Pause and weapon menu" },
    "NBA Jam": { dpad: "Move", b: "Shoot or block", y: "Pass or steal", l: "Turbo", r: "Turbo", start: "Pause" },
    "NBA Jam Tournament Edition": { dpad: "Move", a: "Shoot or block", b: "Shoot or block", x: "Pass or steal", y: "Pass or steal", l: "Turbo", r: "Turbo", start: "Pause" },
    "Super Bomberman": { dpad: "Move", a: "Drop bomb", b: "Detonate bomb", x: "Stop kicked bomb", y: "Punch bomb", l: "Punch bomb", r: "Stop kicked bomb", start: "Pause" },
    "Super Bomberman 2": { dpad: "Move", a: "Drop or pick up bomb", b: "Detonate bomb", x: "Stop kicked bomb", y: "Jump on battle stage 10", start: "Pause" },
    "Super Mario World": { dpad: "Move", up: "Climb", down: "Duck or slide on slopes", a: "Spin jump", b: "Jump", x: "Run or fireball", y: "Run or fireball", l: "Scroll view", r: "Scroll view", select: "Use reserve item", start: "Pause" },
    "Super Mario World 2: Yoshi's Island": { dpad: "Move", up: "Enter door", down: "Make egg or ground pound", a: "Aim and throw egg", b: "Jump or flutter", y: "Tongue or spit", l: "Hold aim", r: "Hold aim", start: "Pause", aka: ["Yoshi's Island"] },
    "Super Punch-Out!!": { dpad: "Guard and dodge", up: "Guard high or head punch", down: "Duck", left: "Dodge left", right: "Dodge right", a: "Knockout punch", b: "Right punch", y: "Left punch", start: "Pause" },
    "Super Street Fighter II: The New Challengers": { dpad: "Move, back to block", up: "Jump", down: "Crouch", a: "Medium kick", b: "Light kick", x: "Medium punch", y: "Light punch", l: "Hard punch", r: "Hard kick", start: "Pause", aka: ["Super Street Fighter II"] },
    "Tecmo Super Bowl": { dpad: "Move player", a: "Snap or switch player", b: "Pass or dive tackle", x: "Break free", y: "Timeout menu" },
    "WWF Raw": { dpad: "Move", up: "Climb turnbuckle", a: "Kick", b: "Punch", x: "Lock up or pin", y: "Run", l: "Eye gouge", r: "Choke or special move", select: "Quit match when paused", start: "Pause" },
    "WWF Royal Rumble": { dpad: "Move", a: "Kick", b: "Punch", x: "Grapple or pin", y: "Run", l: "Eye gouge", r: "Special move" },
    "WWF Super WrestleMania": { dpad: "Move", a: "Kick", b: "Punch", x: "Lock up or pin", y: "Run", select: "Pick next tag partner" },
    "WWF WrestleMania: The Arcade Game": { dpad: "Move", a: "Super kick", b: "Kick", x: "Super punch", y: "Punch", r: "Block" },
    "Wolfenstein 3D": { dpad: "Move and turn", up: "Forward", down: "Back up", left: "Turn left", right: "Turn right", a: "Fire", x: "Run", y: "Run", l: "Strafe left", r: "Strafe right", select: "Switch weapon", start: "Automap" }
  },
  genesis: {
    "Disney's Aladdin": { dpad: "Move", up: "Look up or climb", down: "Duck", a: "Throw apple", b: "Sword", c: "Jump", start: "Pause", aka: ["Aladdin"] },
    "The Lion King": { dpad: "Move", up: "Look up", down: "Crouch", a: "Roar", b: "Slash as adult Simba", c: "Jump", start: "Pause" },
    "Castle of Illusion Starring Mickey Mouse": { dpad: "Move", down: "Duck", a: "Throw", b: "Throw", c: "Jump or bounce attack", start: "Pause", aka: ["Mickey Mouse - Castle of Illusion", "Castle of Illusion"] },
    "Sonic the Hedgehog": { dpad: "Run", up: "Look up", down: "Roll or look down", a: "Spin jump", b: "Spin jump", c: "Spin jump", start: "Pause" },
    "Sonic the Hedgehog 2": { dpad: "Run", up: "Look up", down: "Roll or spin dash", a: "Spin jump", b: "Spin jump", c: "Spin jump", start: "Pause" },
    "Sonic the Hedgehog 3": { dpad: "Run", up: "Look up", down: "Roll or spin dash", a: "Jump or insta-shield", b: "Jump or insta-shield", c: "Jump or insta-shield", start: "Pause" }
  },
  atari2600: {
    "Jungle Hunt": { dpad: "Move or swim", down: "Duck", fire: "Jump or stab", select: "Skill level", reset: "Start game" },
    "Pitfall!": { dpad: "Run", up: "Climb up", down: "Climb down or let go", fire: "Jump", reset: "Start game" },
    "Pole Position": { dpad: "Steer and shift", up: "Low gear", down: "High gear", left: "Steer left", right: "Steer right", fire: "Brake", reset: "Restart race" }
  }
};
