'use strict';
// Wax Pack's player pictures (games/waxpack/art/<k>.webp, 640 by 960, and <k>-s.webp, 240 by 360): photographs of
// anonymous ballplayers in plain uniforms, made by the picture tool from scripts/waxpack-art/briefs.py and packed by
// pack.py there. role: bat, swing, pitch, catcher, infield, first, outfield, run, pose, or sp-<kind> for a special card;
// hand: the side he bats or throws from (R, L); cap: his cap's color, so a card can pick a cap near its team's color;
// fy: where his head is, as the picture's object-position from the top (percent). Read by WaxCard.artFor (cardface.js).
(function (root) {
  var L = [
    {"k": "bat-r1", "role": "bat", "hand": "R", "cap": "#1d2a4a", "fy": 22, "what": "A righty in his stance at the plate, bat up, front foot lifting; gray road uniform, navy cap."},
    {"k": "bat-r2", "role": "bat", "hand": "R", "cap": "#b5232e", "fy": 24, "what": "A broad righty in a crouched stance; white home uniform, red cap and sleeves."},
    {"k": "bat-r3", "role": "bat", "hand": "R", "cap": "#2a52be", "fy": 26, "what": "A stocky righty with a mustache waiting in his stance under the lights; gray uniform, blue helmet."},
    {"k": "bat-r4", "role": "bat", "hand": "R", "cap": "#1a1a1a", "fy": 20, "what": "A tall young righty with high hands at a spring-training field; white uniform, black helmet."},
    {"k": "bat-r5", "role": "bat", "hand": "R", "cap": "#1f7a3a", "fy": 24, "what": "A bearded veteran righty in a closed stance; gray uniform, green cap."},
    {"k": "bat-l1", "role": "bat", "hand": "L", "cap": "#1d2a4a", "fy": 22, "what": "A slim lefty in his stance, bat up; white home uniform, navy cap."},
    {"k": "bat-l2", "role": "bat", "hand": "L", "cap": "#e0661f", "fy": 24, "what": "A powerful lefty under the lights; gray uniform, orange helmet and sleeves."},
    {"k": "bat-l3", "role": "bat", "hand": "L", "cap": "#6b1f2e", "fy": 24, "what": "A compact lefty in a crouch at a spring-training field; white uniform, maroon cap."},
    {"k": "bat-l4", "role": "bat", "hand": "L", "cap": "#b5232e", "fy": 24, "what": "A big red-bearded lefty with the bat held high; gray uniform, red cap."},
    {"k": "swing-r1", "role": "swing", "hand": "R", "cap": "#1d2a4a", "fy": 22, "what": "A righty finishing a long swing, eyes up after the ball; gray uniform, navy cap."},
    {"k": "swing-r2", "role": "swing", "hand": "R", "cap": "#1a1a1a", "fy": 24, "what": "A righty at the moment of contact, the ball leaving the bat, under the lights; white uniform, black cap."},
    {"k": "swing-r3", "role": "swing", "hand": "R", "cap": "#2a52be", "fy": 26, "what": "A righty checking his swing as the pitch goes by; white uniform, blue cap."},
    {"k": "swing-l1", "role": "swing", "hand": "L", "cap": "#b5232e", "fy": 20, "what": "A lefty finishing his swing; white uniform, red cap and sleeves."},
    {"k": "swing-l2", "role": "swing", "hand": "L", "cap": "#1f7a3a", "fy": 26, "what": "A lefty dropping the bat and breaking for first under the lights; gray uniform, green cap."},
    {"k": "pitch-r1", "role": "pitch", "hand": "R", "cap": "#b5232e", "fy": 22, "what": "A righty delivering over the top; white uniform, red cap and sleeves."},
    {"k": "pitch-r2", "role": "pitch", "hand": "R", "cap": "#1a1a1a", "fy": 20, "what": "A mustached veteran righty releasing the pitch at night; gray uniform, black cap."},
    {"k": "pitch-r3", "role": "pitch", "hand": "R", "cap": "#e0661f", "fy": 26, "what": "A heavy-set closer finishing his delivery; gray uniform, orange cap and sleeves."},
    {"k": "pitch-r4", "role": "pitch", "hand": "R", "cap": "#1f7a3a", "fy": 22, "what": "A tall righty striding into his pitch; gray uniform, green cap and sleeves."},
    {"k": "pitch-r5", "role": "pitch", "hand": "R", "cap": "#6b1f2e", "fy": 20, "what": "A mustached righty following through at night; white uniform, maroon cap."},
    {"k": "pitch-l1", "role": "pitch", "hand": "L", "cap": "#1d2a4a", "fy": 20, "what": "A lefty at the top of his windup, knee up, glove at his chest; gray uniform, navy cap."},
    {"k": "pitch-l2", "role": "pitch", "hand": "L", "cap": "#2a52be", "fy": 18, "what": "A lefty seen from behind, taking the sign from the stretch, palm trees beyond; white uniform, blue cap."},
    {"k": "pitch-l3", "role": "pitch", "hand": "L", "cap": "#1d2a4a", "fy": 18, "what": "A lefty at the top of his windup; white uniform, navy cap."},
    {"k": "catch-1", "role": "catcher", "hand": "R", "cap": "#1d2a4a", "fy": 34, "what": "A catcher in his crouch giving a target, a batter beside him; navy gear."},
    {"k": "catch-2", "role": "catcher", "hand": "R", "cap": "#b5232e", "fy": 22, "what": "A catcher springing up to throw, mask and mitt in one hand; red gear."},
    {"k": "catch-3", "role": "catcher", "hand": "R", "cap": "#1a1a1a", "fy": 16, "what": "A catcher reaching up for a pop-up at night, his mask on the dirt; gray uniform."},
    {"k": "inf-ss1", "role": "infield", "hand": "R", "cap": "#2a52be", "fy": 50, "what": "A shortstop diving flat out for a ground ball; gray uniform, blue cap."},
    {"k": "inf-ss2", "role": "infield", "hand": "R", "cap": "#b5232e", "fy": 24, "what": "A shortstop leaping over a sliding runner to turn two; white uniform, red cap."},
    {"k": "inf-2b", "role": "infield", "hand": "R", "cap": "#1d2a4a", "fy": 40, "what": "A second baseman down low fielding a grounder; white uniform, navy cap."},
    {"k": "inf-3b", "role": "infield", "hand": "R", "cap": "#1f7a3a", "fy": 20, "what": "A third baseman throwing across the diamond; gray uniform, green cap."},
    {"k": "first-1", "role": "first", "hand": "L", "cap": "#1a1a1a", "fy": 34, "what": "A bearded first baseman stretching for a throw; white uniform, black cap."},
    {"k": "first-2", "role": "first", "hand": "R", "cap": "#2a52be", "fy": 44, "what": "A first baseman in a full split for a low throw; gray uniform, blue cap."},
    {"k": "first-3", "role": "first", "hand": "R", "cap": "#e0661f", "fy": 38, "what": "A first baseman holding a runner on at the bag; white uniform, orange cap."},
    {"k": "of-1", "role": "outfield", "hand": "R", "cap": "#1d2a4a", "fy": 16, "what": "A center fielder making a running catch on the warning track; white uniform, navy cap."},
    {"k": "of-2", "role": "outfield", "hand": "L", "cap": "#b5232e", "fy": 18, "what": "An outfielder leaping at the wall to rob a home run; gray uniform, red cap."},
    {"k": "of-3", "role": "outfield", "hand": "R", "cap": "#6b1f2e", "fy": 54, "what": "An outfielder diving for a shoestring catch; white uniform, maroon cap."},
    {"k": "of-4", "role": "outfield", "hand": "R", "cap": "#1a1a1a", "fy": 24, "what": "An outfielder crow-hopping into a throw at night; gray uniform, black cap."},
    {"k": "run-1", "role": "run", "hand": "R", "cap": "#2a52be", "fy": 50, "what": "A runner sliding head-first into a base in a cloud of dust; gray uniform, blue helmet."},
    {"k": "run-2", "role": "run", "hand": "R", "cap": "#e0661f", "fy": 34, "what": "A runner sliding feet-first into second; white uniform, orange helmet."},
    {"k": "run-3", "role": "run", "hand": "L", "cap": "#1f7a3a", "fy": 26, "what": "A runner breaking for second on a steal; gray uniform, green helmet."},
    {"k": "pose-1", "role": "pose", "hand": "R", "cap": "#1d2a4a", "fy": 22, "what": "A smiling young player kneeling for his rookie picture with a bat and glove; white uniform, navy cap."},
    {"k": "pose-2", "role": "pose", "hand": "L", "cap": "#b5232e", "fy": 22, "what": "A player posing with a bat on his shoulder at spring training; gray uniform, red cap."},
    {"k": "pose-3", "role": "pose", "hand": "R", "cap": "#1a1a1a", "fy": 20, "what": "A weathered veteran pitcher posing with his glove under his arm; white uniform, black cap."},
    {"k": "pose-4", "role": "pose", "hand": "R", "cap": "#2a52be", "fy": 40, "what": "A catcher sitting on the dugout steps with his mitt and mask; gray uniform, blue cap."},
    {"k": "pose-5", "role": "pose", "hand": "R", "cap": "#6b1f2e", "fy": 24, "what": "A player posing in a fielder's crouch at spring training; white uniform, maroon cap."},
    {"k": "sp-team", "role": "sp-team", "hand": "-", "cap": "#1d2a4a", "fy": 50, "what": "The team picture: three rows of players on bleachers at spring training (the Team card)."},
    {"k": "sp-leaders", "role": "sp-leaders", "hand": "-", "cap": "#b5232e", "fy": 30, "what": "Two players posing side by side in front of the dugout (the League Leaders card)."},
    {"k": "sp-highlight", "role": "sp-highlight", "hand": "-", "cap": "#2a52be", "fy": 40, "what": "Teammates mobbing a man at home plate after a game-winning hit (the Highlight card)."}
  ];
  var byKey = {}; L.forEach(function (a) { byKey[a.k] = a; });
  root.WaxArt = { list: L, byKey: byKey };
})(this);
