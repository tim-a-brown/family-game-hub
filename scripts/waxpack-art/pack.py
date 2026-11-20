# pack.py <work folder> <repo> [key,...]: <work folder>/raw/<src>.png -> <repo>/games/waxpack/art/<key>.webp (640x960) and <key>-s.webp (240x360), and
# <repo>/games/waxpack/art/index.js. Python with Pillow. A source whose man came out on the other side from his
# brief is listed under his true hand, or mirrored. A picture whose batter or pitcher came out on the other side is mirrored (there
# is no lettering anywhere, so a mirror is a true picture of a man on the other side).
import sys, os, json
from PIL import Image
D = sys.argv[1]; R = sys.argv[2]; OUT = R + '/games/waxpack/art'; os.makedirs(OUT, exist_ok=True)
CAP = {'navy': '#1d2a4a', 'red': '#b5232e', 'royal blue': '#2a52be', 'black': '#1a1a1a', 'kelly green': '#1f7a3a', 'orange': '#e0661f', 'maroon': '#6b1f2e'}
# key: (source, mirror, role, hand, cap, fy, what it shows)
A = [
 ('bat-r1', 'bat-r1', 0, 'bat', 'R', 'navy', 22, 'A righty in his stance at the plate, bat up, front foot lifting; gray road uniform, navy cap.'),
 ('bat-r2', 'bat-r2', 0, 'bat', 'R', 'red', 24, 'A broad righty in a crouched stance; white home uniform, red cap and sleeves.'),
 ('bat-r3', 'bat-r3', 0, 'bat', 'R', 'royal blue', 26, 'A stocky righty with a mustache waiting in his stance under the lights; gray uniform, blue helmet.'),
 ('bat-r4', 'bat-r4', 0, 'bat', 'R', 'black', 20, 'A tall young righty with high hands at a spring-training field; white uniform, black helmet.'),
 ('bat-r5', 'bat-r5', 0, 'bat', 'R', 'kelly green', 24, 'A bearded veteran righty in a closed stance; gray uniform, green cap.'),
 ('bat-l1', 'bat-l1', 1, 'bat', 'L', 'navy', 22, 'A slim lefty in his stance, bat up; white home uniform, navy cap.'),
 ('bat-l2', 'bat-l2', 1, 'bat', 'L', 'orange', 24, 'A powerful lefty under the lights; gray uniform, orange helmet and sleeves.'),
 ('bat-l3', 'bat-l3', 0, 'bat', 'L', 'maroon', 24, 'A compact lefty in a crouch at a spring-training field; white uniform, maroon cap.'),
 ('bat-l4', 'bat-l4', 1, 'bat', 'L', 'red', 24, 'A big red-bearded lefty with the bat held high; gray uniform, red cap.'),
 ('swing-r1', 'swing-r1', 0, 'swing', 'R', 'navy', 22, 'A righty finishing a long swing, eyes up after the ball; gray uniform, navy cap.'),
 ('swing-r2', 'swing-r2', 0, 'swing', 'R', 'black', 24, 'A righty at the moment of contact, the ball leaving the bat, under the lights; white uniform, black cap.'),
 ('swing-r3', 'swing-r3', 0, 'swing', 'R', 'royal blue', 26, 'A righty checking his swing as the pitch goes by; white uniform, blue cap.'),
 ('swing-l1', 'swing-l1', 0, 'swing', 'L', 'red', 20, 'A lefty finishing his swing; white uniform, red cap and sleeves.'),
 ('swing-l2', 'swing-l2', 0, 'swing', 'L', 'kelly green', 26, 'A lefty dropping the bat and breaking for first under the lights; gray uniform, green cap.'),
 ('pitch-r1', 'pitch-r2', 0, 'pitch', 'R', 'red', 22, 'A righty delivering over the top; white uniform, red cap and sleeves.'),
 ('pitch-r2', 'pitch-r3', 0, 'pitch', 'R', 'black', 20, 'A mustached veteran righty releasing the pitch at night; gray uniform, black cap.'),
 ('pitch-r3', 'pitch-r5', 0, 'pitch', 'R', 'orange', 26, 'A heavy-set closer finishing his delivery; gray uniform, orange cap and sleeves.'),
 ('pitch-r4', 'pitch-l2', 0, 'pitch', 'R', 'kelly green', 22, 'A tall righty striding into his pitch; gray uniform, green cap and sleeves.'),
 ('pitch-r5', 'pitch-l3', 0, 'pitch', 'R', 'maroon', 20, 'A mustached righty following through at night; white uniform, maroon cap.'),
 ('pitch-l1', 'pitch-r1', 0, 'pitch', 'L', 'navy', 20, 'A lefty at the top of his windup, knee up, glove at his chest; gray uniform, navy cap.'),
 ('pitch-l2', 'pitch-r4', 0, 'pitch', 'L', 'royal blue', 18, 'A lefty seen from behind, taking the sign from the stretch, palm trees beyond; white uniform, blue cap.'),
 ('pitch-l3', 'pitch-l1', 0, 'pitch', 'L', 'navy', 18, 'A lefty at the top of his windup; white uniform, navy cap.'),
 ('catch-1', 'catch-1', 0, 'catcher', 'R', 'navy', 34, 'A catcher in his crouch giving a target, a batter beside him; navy gear.'),
 ('catch-2', 'catch-2', 0, 'catcher', 'R', 'red', 22, 'A catcher springing up to throw, mask and mitt in one hand; red gear.'),
 ('catch-3', 'catch-3', 0, 'catcher', 'R', 'black', 16, 'A catcher reaching up for a pop-up at night, his mask on the dirt; gray uniform.'),
 ('inf-ss1', 'inf-ss1', 0, 'infield', 'R', 'royal blue', 50, 'A shortstop diving flat out for a ground ball; gray uniform, blue cap.'),
 ('inf-ss2', 'inf-ss2', 0, 'infield', 'R', 'red', 24, 'A shortstop leaping over a sliding runner to turn two; white uniform, red cap.'),
 ('inf-2b', 'inf-2b', 0, 'infield', 'R', 'navy', 40, 'A second baseman down low fielding a grounder; white uniform, navy cap.'),
 ('inf-3b', 'inf-3b', 0, 'infield', 'R', 'kelly green', 20, 'A third baseman throwing across the diamond; gray uniform, green cap.'),
 ('first-1', 'inf-1b1', 0, 'first', 'L', 'black', 34, 'A bearded first baseman stretching for a throw; white uniform, black cap.'),
 ('first-2', 'inf-1b2', 0, 'first', 'R', 'royal blue', 44, 'A first baseman in a full split for a low throw; gray uniform, blue cap.'),
 ('first-3', 'inf-1b3', 0, 'first', 'R', 'orange', 38, 'A first baseman holding a runner on at the bag; white uniform, orange cap.'),
 ('of-1', 'of-1', 0, 'outfield', 'R', 'navy', 16, 'A center fielder making a running catch on the warning track; white uniform, navy cap.'),
 ('of-2', 'of-2', 0, 'outfield', 'L', 'red', 18, 'An outfielder leaping at the wall to rob a home run; gray uniform, red cap.'),
 ('of-3', 'of-3', 0, 'outfield', 'R', 'maroon', 54, 'An outfielder diving for a shoestring catch; white uniform, maroon cap.'),
 ('of-4', 'of-4', 0, 'outfield', 'R', 'black', 24, 'An outfielder crow-hopping into a throw at night; gray uniform, black cap.'),
 ('run-1', 'slide-1', 0, 'run', 'R', 'royal blue', 50, 'A runner sliding head-first into a base in a cloud of dust; gray uniform, blue helmet.'),
 ('run-2', 'slide-2', 0, 'run', 'R', 'orange', 34, 'A runner sliding feet-first into second; white uniform, orange helmet.'),
 ('run-3', 'slide-3', 0, 'run', 'L', 'kelly green', 26, 'A runner breaking for second on a steal; gray uniform, green helmet.'),
 ('pose-1', 'pose-1', 0, 'pose', 'R', 'navy', 22, 'A smiling young player kneeling for his rookie picture with a bat and glove; white uniform, navy cap.'),
 ('pose-2', 'pose-2', 0, 'pose', 'L', 'red', 22, 'A player posing with a bat on his shoulder at spring training; gray uniform, red cap.'),
 ('pose-3', 'pose-3', 0, 'pose', 'R', 'black', 20, 'A weathered veteran pitcher posing with his glove under his arm; white uniform, black cap.'),
 ('pose-4', 'pose-4', 0, 'pose', 'R', 'royal blue', 40, 'A catcher sitting on the dugout steps with his mitt and mask; gray uniform, blue cap.'),
 ('pose-5', 'pose-5', 0, 'pose', 'R', 'maroon', 24, 'A player posing in a fielder\'s crouch at spring training; white uniform, maroon cap.'),
 ('sp-team', 'sp-team', 0, 'sp-team', '-', 'navy', 50, 'The team picture: three rows of players on bleachers at spring training (the Team card).'),
 ('sp-leaders', 'sp-leaders', 0, 'sp-leaders', '-', 'red', 30, 'Two players posing side by side in front of the dugout (the League Leaders card).'),
 ('sp-highlight', 'sp-highlight', 0, 'sp-highlight', '-', 'royal blue', 40, 'Teammates mobbing a man at home plate after a game-winning hit (the Highlight card).'),
]
only = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
idx = []; tot = 0
for k, src, mir, role, hand, cap, fy, what in A:
    p = D + '/raw/' + src + '.png'
    if not os.path.exists(p): print('missing', src); continue
    idx.append({'k': k, 'role': role, 'hand': hand, 'cap': CAP[cap], 'fy': fy, 'what': what})
    if only and k not in only: continue
    im = Image.open(p).convert('RGB')
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.resize((640, 960), Image.LANCZOS).save(OUT + '/' + k + '.webp', 'WEBP', quality=76, method=6)
    im.resize((240, 360), Image.LANCZOS).save(OUT + '/' + k + '-s.webp', 'WEBP', quality=72, method=6)
    tot += os.path.getsize(OUT + '/' + k + '.webp') + os.path.getsize(OUT + '/' + k + '-s.webp')
js = ("'use strict';\n// Wax Pack's player pictures (games/waxpack/art/<k>.webp, 640 by 960, and <k>-s.webp, 240 by 360): photographs of\n"
  "// anonymous ballplayers in plain uniforms, made by the picture tool from scripts/waxpack-art/briefs.py and packed by\n"
  "// pack.py there. role: bat, swing, pitch, catcher, infield, first, outfield, run, pose, or sp-<kind> for a special card;\n"
  "// hand: the side he bats or throws from (R, L); cap: his cap's color, so a card can pick a cap near its team's color;\n"
  "// fy: where his head is, as the picture's object-position from the top (percent). Read by WaxCard.artFor (cardface.js).\n"
  "(function (root) {\n  var L = [\n" + ',\n'.join('    ' + json.dumps(a, ensure_ascii=False) for a in idx) + "\n  ];\n"
  "  var byKey = {}; L.forEach(function (a) { byKey[a.k] = a; });\n  root.WaxArt = { list: L, byKey: byKey };\n})(this);\n")
open(OUT + '/index.js', 'w').write(js)
print(len(idx), 'pictures, written this run', tot // 1024, 'KB')
