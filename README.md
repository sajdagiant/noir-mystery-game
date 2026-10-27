# NOIR: Last Call

A five-minute murder mystery that runs entirely in the browser. No server, no AI key, no build step.

**Play:** https://sajdagiant.github.io/noir-mystery-game/

- 5 settings (jazz club, manor, night train, arctic station, Studio Nine), 20 suspects, each with their own voice and their own lines when caught.
- Three kinds of case: a plain liar, a frame-up (the obvious evidence is planted; follow the smell), and a staged clock (the alibi that "checks out" is the lie). Plus false confessions and second bodies.
- Sound is all WebAudio: band-limited instruments, a different combo per setting, layered rain/wind/train, tension layers as dawn nears, tape wobble, EQ, saturation and reverb. Unlocks on iPhone even with the silent switch on.
- Haptics: vibration patterns on Android, native taps on iPhone (iOS 17.4+), with a toggle on the title and in the menu.

Files: `content.js` (all the writing), `engine.js` (rules and solvability), `art.js` (SVG portraits), `audio.js`, `ui.js`, `style.css`.
