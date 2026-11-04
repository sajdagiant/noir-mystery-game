# NOIR: Last Call

A five-minute murder mystery that runs entirely in the browser. No server, no AI key, no build step.

**Play:** https://sajdagiant.github.io/noir-mystery-game/

- 5 settings (jazz club, manor, night train, arctic station, Studio Nine), 20 suspects, each with their own voice and their own lines when caught.
- Three kinds of case: a plain liar, a frame-up (the obvious evidence is planted; follow the smell), and a staged clock (the alibi that "checks out" is the lie). Plus false confessions and second bodies.
- Sound is all WebAudio: band-limited instruments, a different combo per setting, layered rain/wind/train, tension layers as dawn nears, tape wobble, EQ, saturation and reverb. Unlocks on iPhone even with the silent switch on.
- Fingerprint dusting: new evidence arrives under graphite powder. Drag a finger to brush it off and lift a latent print (or tap 💨 to blow it away).
- Séance (once per case, 2 moves): rest a finger on the spirit board and the victim's ghost drags the planchette to spell one true word, the smell on the killer. A theremin follows the planchette; candles snuff out at GOODBYE.
- Lie box (2 strips of chart paper per case, 1 move each): strap a suspect to a 1940s polygraph and hold the lever. The paper rolls, three ink pens draw pulse, breath and sweat, with a heartbeat thump (and haptic tick) on every beat. A lie spikes the needles and rings the alarm; a scared innocent goes wild; a killer goes dead flat. The torn strip is pinned to their folder on the Board.
- The chase: name the right killer and they bolt out a window. A neon-lit rooftop runner in the rain (or along the train roofs, across the ice, over Studio Nine): tap to jump the gaps, hold to leap further, land on chimneys, catch drainpipes. Close the distance before the clock runs out to collar them for +150. Its own driving instrumental cue, thunder, footsteps, and a native haptic tick on every jump on iPhone.
- The wall safe (once per case): crack the victim's 1931 Mosler by ear. Drag the dial RIGHT, LEFT, RIGHT; every number clicks, and when a tumbler lines up you hear a heavy CLUNK and see it spike on the stethoscope trace. Stop and SET (native haptic tick on iPhone). Three wheels and the door swings open on gold light: the house photographer's frame 17, which clears an innocent (1 move, +60 pts). Or hand Lefty the dynamite: fuse, boom, screen shake, 2 moves. Its own hushed instrumental heist vamp.
- The lift (2 per case, 1 move each): pick a suspect's pocket while their back is turned. Pinch the handkerchief and draw it up slowly, wiggle it past the coat button, and FREEZE when they glance back: the tiptoe vamp cuts to silence like musical statues. Move too fast and the 👁 meter fills and they grab your wrist. A clean lift gives their scent, matched against the bloody glove.
- Haptics: vibration patterns on Android, native taps on iPhone (iOS 17.4+), with a toggle on the title and in the menu.

Files: `content.js` (all the writing), `engine.js` (rules and solvability), `art.js` (SVG portraits), `audio.js`, `ui.js`, `style.css`.
