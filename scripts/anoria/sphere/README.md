# The sphere on the card back and in the logo

The sphere at Anoria's heart is a real object: `scene.html` builds it in three.js the way an armillary sphere is
built (a meridian ring on a spindle; inside it, on two pivots, a cage of equator, two colures, the ecliptic and the
tropics, each ring a whole circle lying a ring's thickness inside the one it crosses, riveted where they meet; a sun
on the axle). The first card back was a generated picture whose rings wove through one another in ways no object could.

To make the pictures again (a local server on port 8799 from the repo root; Playwright from /opt/node-tools):

    node render.js back-sphere.png 1720 '{"yaw":32,"lat":25,"spin":20,"pitch":18}' .38
    node compose.js back-sphere.png back-new.png 150        # paints the old sphere out of ui/card-back.webp and sets this one in
    node render.js logo-sphere.png 1200 '{"yaw":0,"lat":28,"spin":24,"pitch":15,"zoom":1.06,"merT":0.11,"merTorus":1}' 0
    node logo.js logo-sphere.png logo-new.png               # the same, for ui/logo.webp

`compose.js` and `logo.js` read the picture that is in `games/anoria/ui/` now, so run them on the original pictures
(git history, the release before this change), not on their own output.
