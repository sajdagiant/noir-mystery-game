// browser build of game.js
(function(){ var module={exports:{}}; var exports=module.exports;
'use strict';
// Procedural case generation + offline suspect brain. Zero dependencies.

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const R = { f: Math.random };
function pick(a, r = R.f) { return a[Math.floor(r() * a.length)]; }
function shuffle(a, r = R.f) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function fmtTime(m) { m = ((m % 1440) + 1440) % 1440; let h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(mm).padStart(2, '0')} ${ap}`; }

const SETTINGS = [
  { id: 'club', venue: 'The Velvet Larkspur', blurb: 'a smoky jazz club on the wrong side of the river', victim: { first: 'Marcus', short: 'Lucky', full: 'Marcus "Lucky" Delano', title: 'club owner' },
    weapon: 'a bronze statuette', places: ['Back Office', 'Stage', 'Dressing Room', 'Bar', 'Alley Door', 'Coat Check'], scene: 'Back Office' },
  { id: 'manor', venue: 'Blackwood Manor', blurb: 'a rain-lashed estate with too many locked doors', victim: { first: 'Alistair', short: 'Alistair', full: 'Lord Alistair Blackwood', title: 'master of the house' },
    weapon: 'a fireplace poker', places: ['Study', 'Library', 'Conservatory', 'Kitchen', 'Wine Cellar', 'Garden Gate'], scene: 'Study' },
  { id: 'train', venue: 'The Midnight Meridian', blurb: 'a night train rattling through nowhere', victim: { first: 'Viktor', short: 'Viktor', full: 'Count Viktor Halloran', title: 'railway magnate' },
    weapon: 'a silver letter opener', places: ['Private Cabin', 'Dining Car', 'Baggage Car', 'Observation Deck', 'Bar Car', "Conductor's Booth"], scene: 'Private Cabin' },
  { id: 'lab', venue: 'Halcyon Research Station', blurb: 'a polar lab where the storm has cut every road and radio', victim: { first: 'Elena', short: 'Dr. Marsh', full: 'Dr. Elena Marsh', title: 'station director' },
    weapon: 'a heavy steel torque wrench', places: ['Director\'s Office', 'Mess Hall', 'Generator Room', 'Sample Freezer', 'Radio Shack', 'Dormitory'], scene: "Director's Office" },
];
const FIRST = [['Vivian', 'f'], ['Desmond', 'm'], ['Odette', 'f'], ['Rafferty', 'm'], ['Imogen', 'f'], ['Silas', 'm'], ['Lorraine', 'f'], ['Theo', 'm'], ['Marisol', 'f'], ['Cornelius', 'm'], ['Beatrix', 'f'], ['Jasper', 'm'], ['Delphine', 'f'], ['Walter', 'm'], ['Nadia', 'f'], ['Gideon', 'm']];
const LAST = ['Crane', 'Voss', 'Whitlock', 'Sterling', 'Moreau', 'Quill', 'Hargrove', 'Navarro', 'Pierce', 'Kessler', 'Dunmore', 'Alder', 'Fontaine', 'Rook', 'Yarrow', 'Torres'];
const RELS = ['business partner', 'bitter rival', 'longtime employee', 'estranged relative', 'old friend', 'personal physician', 'former lover', 'chief of security', 'private accountant'];
const VOICES = {
  smooth: { label: 'smooth-talking', o: ['Detective. ', 'Come now. ', 'Ah. ', 'Let me be plain. '], c: [' Do try to keep up.', ' I trust that settles it.', '', ''] },
  nervous: { label: 'jittery', o: ['Um— ', 'Look, I— ', 'Okay, okay. ', 'I... '], c: [" Please, I've told you everything.", ' Is it hot in here?', ' Sorry. Sorry.', ''] },
  gruff: { label: 'gruff', o: ['Listen. ', 'Hmph. ', 'Straight up. ', 'Look, pal. '], c: [" That's all you're getting.", ' Now beat it.', ' Write that down.', ''] },
  theatrical: { label: 'dramatic', o: ['Darling. ', 'Oh, the horror! ', 'Must we? ', 'Ah, '], c: [' Tragic, simply tragic!', ' Curtain.', ' I weep, truly.', ''] },
  icy: { label: 'ice-cold', o: ['', 'Precisely. ', 'Noted. ', ''], c: [" I won't repeat myself.", ' Next question.', " You're wasting time.", ''] },
  folksy: { label: 'folksy', o: ['Well now. ', 'Shoot. ', "I'll tell ya. ", 'Honest to goodness. '], c: [" That's the gospel.", ' Rotten business all round.', ' Swear on my mother.', ''] },
  flirty: { label: 'flirtatious', o: ['Mm, detective. ', "Oh, you're direct. ", 'Sweetheart. ', 'Careful. '], c: [' Buy me a drink and I might say more.', ' You have lovely eyes for an interrogator.', '', ''] },
};
const ITEMS = ['gold cufflink', 'silk handkerchief', 'brass lighter', 'pearl hairpin', 'leather glove', 'fountain pen', 'silver locket'];
const MOTIVES = {
  money: { label: 'Money — debts and inheritance', doc: (S, V) => `a ledger and an amended will: ${S} owed ${V} a fortune, and the amendment would have ruined ${S} for good.`, admit: (V) => `I owed ${V} money. A lot. Everyone knew it.`, gossip: (S, V) => `${S} was drowning in debts to ${V}.` },
  love: { label: 'Love — jealousy and heartbreak', doc: (S, V) => `a bundle of letters: ${S} and ${V} were lovers, and ${V} had just ended it, cruelly and in public.`, admit: (V) => `${V} and I... we were involved. It ended last week. Badly.`, gossip: (S, V) => `${S} and ${V} had a thing, and it ended badly.` },
  blackmail: { label: 'Blackmail — being squeezed dry', doc: (S, V) => `a note in ${V}'s hand: ${S}'s name beside a payment schedule. ${V} was blackmailing ${S}.`, admit: (V) => `${V} had something on me. I paid. Don't make me say what.`, gossip: (S, V) => `${V} was squeezing ${S} for money, I heard.` },
  revenge: { label: 'Revenge — an old ruin', doc: (S, V) => `a yellowed clipping: ${V}'s dirty deal destroyed ${S}'s career and good name years ago.`, admit: (V) => `${V} ruined me. I won't pretend I mourn.`, gossip: (S, V) => `${S} never forgave ${V} for what happened years back.` },
  coverup: { label: 'Cover-up — a secret about to surface', doc: (S, V) => `a half-written letter: ${V} was about to expose ${S}'s fraud to the authorities.`, admit: (V) => `${V} was threatening to go to the authorities about a... misunderstanding.`, gossip: (S, V) => `${V} was threatening to go to the police about ${S}.` },
};
const SECRETS = {
  affair: { clue: (S) => `a hotel matchbook and a note with ${S}'s initials: a secret late-night rendezvous planned for tonight.`, admit: 'I was meeting someone I shouldn\'t be. That\'s all you get. It is why I was creeping around.', short: 'a secret rendezvous' },
  theft: { clue: (S) => `a pawn ticket in ${S}'s name for stolen goods, and a petty-cash drawer that was jimmied open.`, admit: "I've been skimming small sums. Pocket change. I didn't kill anyone over it.", short: 'petty theft' },
  gambling: { clue: (S) => `an IOU from an underground card game, signed by ${S}, due within the week.`, admit: "I gamble. I'm in deep with some bad people. But that's not murder.", short: 'gambling debts' },
  escape: { clue: (S) => `a packed travel bag and one-way tickets booked in ${S}'s name for tomorrow at dawn.`, admit: "I was leaving town tonight. Running, not killing. There's a difference.", short: 'planning to flee' },
};

function generate() {
  const st = pick(SETTINGS), V = st.victim;
  const T = 21 * 60 + 30 + Math.floor(Math.random() * 120);
  // names with unique initials
  let people, tries = 0;
  do {
    const fs = shuffle(FIRST).slice(0, 4), ls = shuffle(LAST).slice(0, 4);
    people = fs.map((f, i) => ({ first: f[0], g: f[1], last: ls[i] }));
    tries++;
  } while (new Set(people.map(p => p.first[0] + p.last[0])).size < 4 && tries < 50);
  const places = st.places.filter(p => p !== st.scene);
  const alibiPlaces = shuffle(places).slice(0, 4);
  const extraPlace = places.find(p => !alibiPlaces.includes(p));
  const rels = shuffle(RELS), voices = shuffle(Object.keys(VOICES)), items = shuffle(ITEMS);
  const motiveIds = shuffle(Object.keys(MOTIVES)), secretIds = shuffle(Object.keys(SECRETS));
  const culpritIdx = Math.floor(Math.random() * 4);
  const suspects = people.map((p, i) => ({
    id: 's' + i, name: `${p.first} ${p.last}`, first: p.first, g: p.g, initials: `${p.first[0]}.${p.last[0]}.`,
    rel: rels[i], voice: voices[i], item: items[i], motive: motiveIds[i], secret: secretIds[i],
    alibiPlace: alibiPlaces[i], hue: Math.floor(Math.random() * 360), culprit: i === culpritIdx,
  }));
  const C = suspects[culpritIdx], inn = suspects.filter(s => !s.culprit);
  const [h1, h2, h3] = shuffle(inn);
  const clues = [
    { id: 'c_time', kind: 'time', title: 'Shattered watch', text: `${V.short}'s wristwatch, smashed in the struggle and frozen at ${fmtTime(T)}. That is when the killing happened.` },
    { id: 'c_scene', kind: 'scene', title: `${cap(st.weapon)} and a ${C.item}`, suspect: C.id, text: `${cap(st.weapon)}, wiped clean. Wedged beneath it is a ${C.item} engraved ${C.initials}` },
    { id: 'c_alibi', kind: 'alibi', title: `The ${C.alibiPlace} was empty`, suspect: C.id, place: C.alibiPlace, text: `Staff log: the ${C.alibiPlace} was locked and empty from ${fmtTime(T - 50)} to ${fmtTime(T + 70)}. Nobody was inside all night.` },
    { id: 'c_motive', kind: 'motive', title: 'Incriminating papers', suspect: C.id, text: `Papers stashed in ${V.short}'s things: ${MOTIVES[C.motive].doc(C.name, V.short)}` },
    { id: 'c_h1', kind: 'herring', title: `Evidence on ${h1.first}`, suspect: h1.id, text: `Found among ${V.short}'s effects: ${SECRETS[h1.secret].clue(h1.name)}` },
    { id: 'c_h2', kind: 'herring', title: `Evidence on ${h2.first}`, suspect: h2.id, text: `A torn diary page: a loud quarrel with ${h2.name} the night of the murder. Beside it, ${SECRETS[h2.secret].clue(h2.name)}` },
  ];
  // locations: scene gets the scene clue; others shuffled
  const locs = st.places.map((p, i) => ({ id: 'l' + i, name: p }));
  const sceneLoc = locs.find(l => l.name === st.scene);
  const rest = shuffle(locs.filter(l => l !== sceneLoc));
  const others = shuffle(clues.filter(c => c.id !== 'c_scene'));
  const loc2clue = { [sceneLoc.id]: 'c_scene' };
  rest.forEach((l, i) => { loc2clue[l.id] = others[i].id; });
  const motiveOpts = Object.entries(MOTIVES).map(([id, m]) => ({ id, label: m.label }));
  return {
    st, V, T, suspects, C, clues, locs, loc2clue, h: [h1, h2, h3], motiveOpts,
    caseNo: 'No. ' + (1000 + Math.floor(Math.random() * 8999)), extraPlace,
    state: { examined: {}, per: {}, asked: 0, over: false, history: {} },
  };
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function publicCase(g) {
  return {
    caseNo: g.caseNo, venue: g.st.venue, blurb: g.st.blurb, victim: g.V.full, victimTitle: g.V.title, victimShort: g.V.short,
    timeFound: fmtTime(g.T + 55), weapon: g.st.weapon, scene: g.st.scene,
    suspects: g.suspects.map(s => ({ id: s.id, name: s.name, first: s.first, rel: s.rel, voice: VOICES[s.voice].label, hue: s.hue, initials: s.initials })),
    locations: g.locs.map(l => ({ id: l.id, name: l.name, scene: l.name === g.st.scene })),
    motives: g.motiveOpts,
  };
}

function examine(g, locId) {
  const cid = g.loc2clue[locId]; if (!cid) return null;
  const c = g.clues.find(x => x.id === cid), loc = g.locs.find(l => l.id === locId);
  g.state.examined[cid] = true;
  return { id: c.id, title: c.title, text: c.text, location: loc.name };
}

// ---------- offline suspect brain ----------
const sf = (g, id) => g.suspects.find(s => s.id === id);
function per(g, id) { return (g.state.per[id] ||= { pressure: 0, alibiCrack: false, motiveAdmit: false, itemAdmit: false, secretOut: false, lies: 0 }); }

function dress(s, body) {
  const v = VOICES[s.voice];
  const o = Math.random() < 0.8 ? pick(v.o) : '', c = Math.random() < 0.6 ? pick(v.c) : '';
  return o + body + c;
}

function detectIntent(g, t) {
  t = t.toLowerCase();
  const mention = g.suspects.find(s => t.includes(s.first.toLowerCase()) || t.includes(s.name.split(' ')[1].toLowerCase()));
  const intents = [];
  if (/(did you (kill|do|murder)|you (killed|murdered)|guilty|confess|admit it|murderer)/.test(t)) intents.push('accuse');
  if (/(where were|alibi|were you|whereabouts|doing (at|when|that)|that night|at the time|what time)/.test(t)) intents.push('alibi');
  if (/(why|motive|hate|money|inherit|argu|fight|enem|angry|jealous|threat|owe|blackmail|grudge|reason|debt|will\b|love|affair)/.test(t)) intents.push('motive');
  if (/(secret|hiding|hide|lying|\blie|truth|nervous|honest|sweat|suspicious|something to)/.test(t)) intents.push('secret');
  if (/(see|saw|seen|hear|heard|notice|anything (strange|odd|unusual)|witness|spot)/.test(t)) intents.push('witness');
  if (/(weapon|body|scene|how was|killed with|poker|statuette|wrench|opener|found)/.test(t)) intents.push('scene');
  if (/(cufflink|handkerchief|lighter|hairpin|glove|pen\b|locket|initials|engrav)/.test(t)) intents.push('item');
  if (/(relationship|know (him|her|the victim)|how well|close|work for|work with|friend|boss|feel about)/.test(t) || /victim/.test(t)) intents.push('victim');
  if (/(who (do you|did you|else)|suspect|think|anyone|everyone|others|opinion)/.test(t) || mention) intents.push('others');
  if (/^(hi|hello|hey|good evening|evening|detective)/.test(t) || t.length < 3) intents.push('greet');
  return { intents, mention };
}

function replyOffline(g, s, text, clueId) {
  const p = per(g, s.id), V = g.V, C = g.C, M = MOTIVES[s.motive], isC = s.culprit;
  const pronounSelf = s.g === 'f' ? 'her' : 'his';
  let body;

  if (clueId) {
    const c = g.clues.find(x => x.id === clueId);
    p.pressure++;
    if (c.kind === 'time') body = isC ? `Yes, I know when it happened. ${fmtTime(g.T)}. I was nowhere near, so what of it?` : `${fmtTime(g.T)}, you say. Then I can account for myself, ask me.`;
    else if (c.kind === 'scene') {
      if (isC) {
        if (p.pressure >= 2 || p.alibiCrack) { p.itemAdmit = true; body = `Fine. That ${s.item} is mine. I was in the ${g.st.scene} earlier, to talk. ${V.short} was alive when I left. You can't prove otherwise.`; }
        else body = `Initials? Plenty of people share initials. I lose things all the time. That proves nothing.`;
      } else if (c.suspect === s.id) body = 'That is not mine.';
      else body = `Those initials, ${C.initials}... that's ${C.name}'s, isn't it? ${C.first} is the ${C.rel}.`;
    } else if (c.kind === 'alibi') {
      if (isC) { p.alibiCrack = true; body = `The ${c.place} was... empty? I may have stepped out. I needed air. I did not say I was lying, I said I was there. Alright, I wasn't. But being somewhere else is not murder.`; }
      else body = `The ${c.place} was locked and empty all night? Then anyone who claims to have been there is lying. Ask around who said so.`;
    } else if (c.kind === 'motive') {
      if (isC) { p.motiveAdmit = true; body = M.admit(V.short) + ` Plenty of people had a reason. Mine is not proof.`; }
      else body = `Those papers... they concern ${C.name}, don't they? I had my own troubles with ${V.short}, but ${C.first}'s are worse.`;
    } else if (c.kind === 'herring') {
      if (c.suspect === s.id) { p.secretOut = true; body = SECRETS[s.secret].admit; }
      else { const o = sf(g, c.suspect); body = `${o.first}? I had no idea. Yet ${o.first} had nothing to gain from ${V.short} dying, I'd have thought.`; }
    }
    return dress(s, body);
  }

  const { intents, mention } = detectIntent(g, text);
  const it = intents[0] || 'fallback';
  const place = s.alibiPlace;
  const lines = {
    greet: [`I'd say it's a pleasure, but someone is dead. ${V.short}, of all people.`, `Ask what you must, detective. I have nothing to hide.`],
    victim: [`${V.full}, ${V.title}. I'm ${V.short}'s ${s.rel}. We had... history.`, `I knew ${V.short} well enough. As ${V.short}'s ${s.rel}, I saw things others didn't.`],
    scene: [`${V.short} was found in the ${g.st.scene}, killed with ${g.st.weapon}. That's all I know, and more than I wanted to.`, `A dreadful scene. ${cap(g.st.weapon)}. Look in the ${g.st.scene} yourself, detective.`],
    item: isC && !p.itemAdmit ? [`Sounds like half the people here own something like that. Show me proof, not hints.`] : [`If you found something, show it to me. Use the evidence button and I'll tell you what I know.`],
    fallback: [`I'm not sure what you're asking. Try asking where I was, how I knew ${V.short}, or what I saw.`, `Ask me something I can answer: my whereabouts, my history with ${V.short}, who I suspect.`, `You'll have to be more specific, detective.`],
  };
  if (it === 'alibi') {
    if (isC && !p.alibiCrack) body = pick([`I was in the ${place} the whole time. Ask anyone.`, `The ${place}. Alone with my thoughts, I'm afraid. Nobody to vouch for me.`]);
    else if (isC) body = `I... stepped out for air. I was near the ${g.st.scene} for a moment. Never inside.`;
    else body = pick([`I was in the ${place} around ${fmtTime(g.T)}. I stayed there, and I'd swear to it.`, `${fmtTime(g.T - 20)} to ${fmtTime(g.T + 30)}? The ${place}. I never left.`]);
  } else if (it === 'accuse') {
    if (isC && p.alibiCrack && p.motiveAdmit && p.itemAdmit) body = `I... *(long silence)* ...you can't prove it. You can't. Take me in if you must.`;
    else if (isC) body = pick([`How dare you. I'm a ${s.rel}, not a killer. Find real evidence.`, `That's slander. Prove it.`]);
    else body = pick([`Me? No. Absolutely not. I had no wish to see ${V.short} dead.`, `You have the wrong person. Look elsewhere.`]);
  } else if (it === 'motive') {
    if (isC) body = p.motiveAdmit ? M.admit(V.short) + ` But that doesn't make me a murderer.` : pick([`Motive? ${V.short} and I got along fine. Ask around.`, `We had our disagreements. Who didn't? That's no motive.`]);
    else { p.pressure++; body = M.admit(V.short) + ' But I did not kill anyone.'; }
  } else if (it === 'secret') {
    if (isC) body = p.pressure >= 3 ? `I won't say another word without a lawyer.` : pick([`Secrets? I have none. You're fishing.`, `There's nothing to hide. You're looking at the wrong person.`]);
    else { p.pressure++; if (p.pressure >= 3 || p.secretOut) { p.secretOut = true; body = SECRETS[s.secret].admit; } else body = pick([`Everyone has secrets. Mine have nothing to do with murder.`, `I'm not hiding anything that matters.`]); }
  } else if (it === 'witness') {
    const [h1, h2] = g.h;
    if (isC) { const f = pick(g.suspects.filter(x => !x.culprit)); body = `Nothing worth noting. Well... I thought I saw ${f.name} acting strange near ${g.st.scene} earlier. Take that for what it's worth.`;  }
    else if (s.id === h1.id) body = `Now that you mention it, I saw ${C.name} looking badly rattled shortly before the body was found. ${C.first} would not meet my eye.`;
    else if (s.id === h2.id) body = `I heard raised voices earlier between ${V.short} and ${h1.name}. Nothing to do with the end, I think.`;
    else body = `I saw nothing. I was in the ${place} the whole time.`;
  } else if (it === 'others') {
    const o = mention && mention.id !== s.id ? mention : pick(g.suspects.filter(x => x.id !== s.id));
    if (isC) { const inno = o.culprit ? pick(g.suspects.filter(x => !x.culprit)) : o; body = `${inno.name}? ${inno.first} is the ${inno.rel}, and frankly capable of anything. I'd look hard there.`; }
    else if (o.culprit) body = `${o.name}, the ${o.rel}. ${o.first} told me they were in the ${o.alibiPlace}. Beyond that, I couldn't say.`;
    else body = `${o.name}, the ${o.rel}. ${MOTIVES[o.motive].gossip(o.name, V.short)} And ${o.first} said ${o.first} was in the ${o.alibiPlace}.`;
  } else body = pick(lines[it]);
  return dress(s, body);
}

module.exports = { generate, publicCase, examine, replyOffline, fmtTime, MOTIVES, SECRETS, VOICES, sf, per };
; window.NoirGame = module.exports; })();
