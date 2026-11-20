# briefs.py [key,...] > jobs.json : the player pictures for Wax Pack's cards (Tim, 2026-11-20).
# Then: python3 scripts/gofish-decks/gen.py jobs.json <work>/raw (gpt-image-2, 1024x1536, Bearer dummy: the proxy adds
# the key), look at every picture at full size (handedness: the glove hand and the side he bats from; fingers; a bat
# held by the handle; nothing in a runner's hands; any letters or logos), then
# python3 scripts/waxpack-art/pack.py <work> <repo>. What was redone and why is at the end.
import json, sys
STYLE = ("A genuine-looking baseball card action photograph from about 1989, shot by a sports photographer on 35mm color "
  "slide film with a long telephoto lens: natural afternoon daylight, slightly warm late-1980s film color, visible fine film "
  "grain, a little softness, shallow depth of field. Upright portrait framing for a trading card, the player filling most of "
  "the frame with a little room above the cap. ")
UNI = ("He wears a plain {u} baseball uniform with absolutely no lettering, no numbers, no logos, no patches, no piping with "
  "words, no team name anywhere; a solid {c} baseball cap whose front panel is completely blank; {c} undershirt sleeves and "
  "{c} stirrup socks over white sanitary socks; a plain belt. ")
TAIL = ("He is an ordinary anonymous ballplayer who does not resemble any real or famous person; his face is small in the "
  "frame and shaded by the cap brim or turned away. Correct human anatomy: two arms, two legs, five fingers on each hand, "
  "realistic proportions. A baseball glove is worn on one hand only. A bat is held by its handle, never by the barrel. No "
  "text, letters, numbers, signs, scoreboards with writing, advertising, or watermarks anywhere in the picture; any background "
  "signs or walls are blank and blurred. No borders, no card frame: just the photograph.")
BG = {
  'park': "Behind him, out of focus, the stands of a big-league ballpark with a soft blur of fans.",
  'dug': "Behind him, out of focus, a dark dugout and a blurred railing.",
  'spring': "Behind him, out of focus, a spring-training field with palm trees, a low chain-link fence and bright sky.",
  'grass': "Behind him, out of focus, the green outfield grass and a padded outfield wall with nothing written on it.",
  'dirt': "Behind him, the infield dirt and green grass, the background soft and blurred.",
  'night': "Behind him, out of focus, a ballpark at dusk under the lights, soft glowing bokeh.",
}
# key, role, hand (R/L/-), cap color, uniform, background, the man, the action
J = [
 ('bat-r1','bat','R','navy','gray road','park','a lean man in his late twenties with light skin','in a right-handed batting stance at the plate, bat held up behind his right shoulder, front foot just lifting, seen from the third-base side'),
 ('bat-r2','bat','R','red','white home','park','a broad-shouldered Black man of about thirty, heavily muscled','in a right-handed batting stance, knees bent, hands at shoulder height, eyes on the pitcher, seen from the front-left at a three-quarter angle'),
 ('bat-r3','bat','R','royal blue','gray road','night','a stocky Latino man in his early thirties with a thick mustache','waiting in a crouched right-handed stance at the plate, wearing a plain batting helmet the same blue with no decals, seen from the first-base dugout side'),
 ('bat-r4','bat','R','black','white home','spring','a tall, wiry young man of about twenty-two with medium-brown skin','in an upright right-handed batting stance with a high hand position, wearing a plain black batting helmet with no decals'),
 ('bat-r5','bat','R','kelly green','gray road','park','a veteran in his late thirties with light skin and a graying beard','in a closed right-handed batting stance, bat angled flat behind his head, seen from the side'),
 ('bat-l1','bat','L','navy','white home','park','a slim man in his mid twenties with light olive skin','in a LEFT-handed batting stance: standing in the left-handed batter\'s box with his right shoulder toward the pitcher, the bat held up behind his left shoulder, seen from the first-base side'),
 ('bat-l2','bat','L','orange','gray road','night','a powerful Black man of about twenty-eight','in a LEFT-handed batting stance, right shoulder toward the pitcher, bat held vertically behind his left ear, wearing a plain orange batting helmet with no decals'),
 ('bat-l3','bat','L','maroon','white home','spring','a compact Latino man of about twenty-five','in a crouched LEFT-handed batting stance, right shoulder toward the pitcher, bat over his left shoulder'),
 ('bat-l4','bat','L','red','gray road','park','a big, heavy-set man in his early thirties with light skin and a red beard','in an open LEFT-handed batting stance, his right shoulder toward the pitcher, bat held high'),
 ('swing-r1','swing','R','navy','gray road','park','a muscular man of about twenty-seven with dark brown skin','finishing a right-handed home-run swing: the bat has come all the way around and finished over his LEFT shoulder, his back right foot pivoted, his eyes following the ball deep into the sky'),
 ('swing-r2','swing','R','black','white home','night','a lanky man in his mid twenties with light skin','just making contact on a right-handed swing, the ball a small blur leaving the bat, hips turned, a dusting of dirt at his feet'),
 ('swing-r3','swing','R','royal blue','white home','park','a short, sturdy Asian American man of about thirty','checking his swing from the right side: the bat stopped halfway around in front of him, both hands together at the bottom of the handle, his eyes on the ball going by'),
 ('swing-l1','swing','L','red','white home','park','a tall Black man of about twenty-six','finishing a LEFT-handed swing: right shoulder was toward the pitcher, the bat has come around and finished over his RIGHT shoulder, his front right leg braced'),
 ('swing-l2','swing','L','kelly green','gray road','night','a wiry Latino man of about twenty-four','beginning to run out of the box after a LEFT-handed slap swing, bat dropping from his hands, first step toward first base'),
 ('pitch-r1','pitch','R','navy','gray road','park','a tall, long-limbed man in his late twenties with light skin','pitching RIGHT-handed at the top of his windup on the mound: left knee raised high, the ball hidden in the brown glove on his LEFT hand at his chest'),
 ('pitch-r2','pitch','R','red','white home','park','a powerful Black man of about thirty','delivering a pitch RIGHT-handed: striding forward on his left leg, right throwing arm whipping forward over the top, the brown glove on his LEFT hand tucked at his side, cap brim shading his face'),
 ('pitch-r3','pitch','R','black','gray road','night','a thick-bodied veteran in his late thirties with light skin and a mustache','releasing a pitch with his RIGHT hand at three-quarters arm angle, glove on his LEFT hand, his back leg lifting off the rubber'),
 ('pitch-r4','pitch','R','royal blue','white home','spring','a lean Latino man of about twenty-three','looking in for the catcher\'s sign from the stretch, the ball in his RIGHT hand behind his back, the glove on his LEFT hand at his belt, seen from the side'),
 ('pitch-r5','pitch','R','orange','gray road','park','a heavy-set closer in his early thirties with medium-brown skin and a goatee','finishing a RIGHT-handed pitch, his right arm swept across his body, his left foot planted, his body bent forward toward home plate'),
 ('pitch-l1','pitch','L','navy','white home','park','a slender man of about twenty-five with light skin','pitching LEFT-handed: right knee raised high in his windup, the brown glove on his RIGHT hand, the ball in his left hand hidden in the glove'),
 ('pitch-l2','pitch','L','kelly green','gray road','park','a tall Black man of about twenty-nine','delivering a pitch LEFT-handed: striding on his right leg, his left arm coming over the top, the glove on his RIGHT hand'),
 ('pitch-l3','pitch','L','maroon','white home','night','a stocky Mexican American man in his mid thirties','releasing a LEFT-handed screwball sidearm, the glove on his RIGHT hand, his weight falling toward first base'),
 ('catch-1','catcher','R','navy','gray road','park','a stocky catcher of about thirty with light skin','in a full catcher\'s crouch behind home plate in plain dark navy chest protector and shin guards, wearing a plain navy helmet turned backward and a black wire-cage mask pushed up on top of his head, his big round catcher\'s mitt on his LEFT hand held out as a target'),
 ('catch-2','catcher','R','red','white home','park','a broad Black catcher of about twenty-eight','springing up out of his crouch to throw, ripping off his black wire-cage catcher\'s mask with his left hand that wears the round catcher\'s mitt, his right hand holding the ball, plain red chest protector and shin guards'),
 ('catch-3','catcher','R','black','gray road','night','a thick-legged Latino catcher in his early thirties','reaching up out of his crouch to catch a high pop-up, his mask tossed aside on the dirt, the catcher\'s mitt on his LEFT hand raised overhead, plain black shin guards'),
 ('inf-ss1','infield','R','royal blue','gray road','dirt','a quick, slender shortstop of about twenty-four with medium-brown skin','diving full-length to his left across the infield dirt, body stretched flat in the air, the glove on his LEFT hand reaching for a ground ball, dirt flying'),
 ('inf-ss2','infield','R','red','white home','dirt','a lean Latino shortstop of about twenty-six','leaping over a runner sliding into second base while throwing to first with his RIGHT hand, the glove on his LEFT hand, completing a double play; the sliding runner wears a plain gray uniform and a plain helmet'),
 ('inf-2b','infield','R','navy','white home','dirt','a compact second baseman of about thirty with light skin','fielding a ground ball, bent low with his glove on his LEFT hand down on the dirt and his right hand ready over it'),
 ('inf-3b','infield','R','kelly green','gray road','dirt','a solid third baseman in his late twenties with dark brown skin','throwing across the diamond with his RIGHT arm after fielding a slow roller, his glove on his LEFT hand swinging back for balance'),
 ('inf-1b1','first','L','black','white home','dirt','a big, tall first baseman of about thirty-two with light skin and a beard','stretching far forward at first base, his foot on the base bag, his first baseman\'s mitt on his RIGHT hand reaching for a throw'),
 ('inf-1b2','first','R','royal blue','gray road','dirt','a tall Black first baseman of about twenty-seven','doing a full split stretch at first base to catch a low throw, his first baseman\'s mitt on his LEFT hand, one foot on the base bag'),
 ('inf-1b3','first','R','orange','white home','dirt','a husky Latino first baseman in his mid thirties','holding a runner on at first base, crouched beside the bag with his mitt on his LEFT hand held up as a target toward the pitcher'),
 ('of-1','outfield','R','navy','white home','grass','a fast, lean center fielder of about twenty-five with dark brown skin','making a running catch on the warning track, glove on his LEFT hand reaching up high, the ball just entering the glove'),
 ('of-2','outfield','L','red','gray road','grass','a tall outfielder of about twenty-nine with light skin','leaping against the padded outfield wall, glove on his RIGHT hand stretched above the top of the wall to rob a home run'),
 ('of-3','outfield','R','maroon','white home','grass','a wiry Latino outfielder of about twenty-three','diving forward on the grass to make a shoestring catch, glove on his LEFT hand, grass flying'),
 ('of-4','outfield','R','black','gray road','night','a muscular outfielder of about thirty-one with medium-brown skin','throwing hard toward the infield after a catch, his RIGHT arm far back, his glove on his LEFT hand pointing toward the target, a crow-hop step'),
 ('slide-1','run','R','royal blue','gray road','dirt','a speedy runner of about twenty-five with dark brown skin','sliding head-first into a base in a cloud of dust, both arms stretched out ahead, wearing a plain batting helmet with no decals'),
 ('slide-2','run','R','orange','white home','dirt','a lean runner of about twenty-eight with light skin','sliding feet-first into second base, one leg bent under him, dust spraying, wearing a plain batting helmet with no decals; his hands are empty: he holds no bat and wears no glove, as a base runner carries nothing'),
 ('slide-3','run','L','kelly green','gray road','dirt','a quick Latino runner of about twenty-two','taking off on a steal from first base, leaning low into his first sprinting step, arms pumping, wearing a plain batting helmet with no decals; his hands are empty: he holds no bat and wears no glove, as a base runner carries nothing'),
 ('pose-1','pose','R','navy','white home','spring','a smiling young man of about twenty-one with light skin','posing for his rookie picture, kneeling on one knee on the grass with a bat resting upright beside him, cap brim shading his eyes'),
 ('pose-2','pose','L','red','gray road','spring','a confident Black man of about thirty','posing for a card photo, standing with a bat resting on his shoulder, his face turned slightly away and shaded by his cap'),
 ('pose-3','pose','R','black','white home','spring','a weathered veteran pitcher in his late thirties with light skin and gray stubble','posing for a card photo, standing with his glove on his LEFT hand tucked under his arm, half in shade, looking off to the side'),
 ('pose-4','pose','R','royal blue','gray road','dug','a stocky Latino catcher of about thirty','sitting on the dugout steps with his catcher\'s mitt on his knee and his plain mask beside him, looking out at the field'),
 ('sp-team','sp-team','-','navy','white home','spring','the whole team of twenty-four players in identical plain white uniforms and navy caps, a team picture','sitting and standing in three neat rows on bleachers at a spring-training field, every face small and far away, each man different in build and skin tone, hands on knees; the shot is wide, so no single face is clear'),
 ('sp-leaders','sp-leaders','-','red','gray road','park','two different players side by side, one tall and one short and stocky','posing together for a league leaders card in front of the dugout, one resting a bat on his shoulder and the other holding a glove on his LEFT hand, both faces shaded by their caps'),
 ('sp-highlight','sp-highlight','-','royal blue','white home','night','a crowd of five teammates seen mostly from behind','mobbing a teammate at home plate after a game-winning hit, arms raised, helmets and caps flying, joy and motion blur; their backs are to the camera with no letters or numbers on the jerseys'),
 ('pose-5','pose','R','maroon','white home','spring','a lean East Asian man of about twenty-six','posing for a card photo in a fielder\'s ready crouch with his glove on his LEFT hand, face shaded by the cap brim'),
]
if __name__ == '__main__':
    only = set(sys.argv[1].split(',')) if len(sys.argv) > 1 else None
    out = []
    for k, role, hand, cap, uni, bg, man, act in J:
        if only and k not in only: continue
        p = STYLE + "The photograph shows " + man + ", " + act + ". " + UNI.format(u=uni, c=cap) + BG[bg] + " " + TAIL
        out.append({'k': k, 'prompt': p, 'size': '1024x1536'})
    print(json.dumps(out, indent=1))

# Redone (2026-11-20): slide-2 and slide-3 came out with a runner holding a bat (and a glove), so their briefs say his
# hands are empty; swing-r3, a bunt, had the gloved top hand pinching the barrel, so it is a checked swing now.
# Came out on the other side and are re-listed in pack.py: pitch-r1 and pitch-r4 are lefties (glove on the right hand),
# pitch-l2 and pitch-l3 righties; bat-l1, bat-l2 and bat-l4 stood in as righties and are mirrored.
