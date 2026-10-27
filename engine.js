/* NOIR: Last Call — rules engine. Pure logic, no DOM. */
(function (root) {
'use strict';
const D = (typeof require === 'function' && typeof module !== 'undefined' && module.exports) ? require('./content.js') : root.NoirData;
const MAXT = 16, START = 23 * 60 + 30; // 11:30 PM, 15 minutes per tick

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function fmt(m) { m = ((m % 1440) + 1440) % 1440; let h = Math.floor(m / 60); const mm = m % 60, ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(mm).padStart(2, '0') + ' ' + ap; }
function fill(s, d) { return s.replace(/\{(\w+)\}/g, (m, k) => { if (d[k] === undefined) throw new Error('missing {' + k + '} in: ' + s); return d[k]; }); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
const norm = s => s.replace(/\s+/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();

function newCase(seed) {
  const r = mulberry(seed >>> 0);
  const pick = a => a[Math.floor(r() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const st = D.SETTINGS[Math.floor(r() * D.SETTINGS.length)];
  const V = st.victim;
  const vr = r(), variant = vr < 0.34 ? 'classic' : vr < 0.67 ? 'frame' : 'staged';
  const people = st.cast.map((c, i) => Object.assign({ idx: i, rolelabel: c.role }, c));
  const order = shuffle([0, 1, 2, 3]);
  const roleNames = ['K', 'P1', 'P2', variant === 'staged' ? 'L' : 'S'];
  order.forEach((idx, n) => { people[idx].role = roleNames[n]; });
  const byRole = {}; people.forEach(p => { byRole[p.role] = p; });
  const P1 = byRole.P1, P2 = byRole.P2, S = byRole.S || null, L = byRole.L || null, K = byRole.K;
  const mot = shuffle(Object.keys(D.MOTIVES));
  people.forEach((p, i) => { p.motive = mot[i]; });
  people.forEach(p => { const others = people.filter(o => o.idx !== p.idx); p.gossipAbout = pick(others).idx; });
  const T = 22 * 60 + 39 + Math.floor(r() * 11);           // the time the clock shows
  const Treal = variant === 'staged' ? 22 * 60 + 6 + Math.floor(r() * 9) : T; // the time it really happened
  const placeIds = shuffle(st.places);
  people.forEach((p, i) => { p.place = placeIds[i]; });
  const pairIdx = Math.floor(r() * D.PAIRSECRET.length), spot = pick(st.spots);
  const callKey = pick(Object.keys(D.CALLS));
  const call = fill(D.CALLS[callKey], { callSpot: st.callSpot });
  const claimTpl = shuffle(D.CLAIM);
  const wrapStatic = (p, body) => { const v = D.VOICES[p.voice]; return norm((r() < 0.7 ? pick(v.o) : '') + body + (r() < 0.5 ? pick(v.c) : '')); };

  const clues = {};
  const mkClue = (id, title, text, icon, kind, loc) => { clues[id] = { id, title, text, icon, kind: kind || 'clue', loc: loc || null }; };
  mkClue('c_scene', 'The Body', fill(st.body, { T: fmt(T) }), '🩸', 'clue', 'scene');
  // absence clues at each claimed room (P2's room hides something else)
  const ab = shuffle(D.ABSENT.slice(1)); let abi = 0;
  const outTime = { K: variant === 'staged' ? '10:00' : '10:25', P1: variant === 'staged' ? '9:50' : '10:20', S: '10:20', L: '10:28' };
  ['K', 'P1', 'S', 'L'].forEach(rl => {
    const p = byRole[rl]; if (!p) return;
    const a = (rl === 'L' || (r() < 0.3 && rl !== 'L')) ? D.ABSENT[0] : ab[abi++ % ab.length];
    const d = { place: p.place.name, who: p.short, staff: st.staff.name, out: outTime[rl] };
    mkClue('c_' + rl, fill(a.t, d), fill(a.x, d), '📎', 'clue', p.place.id);
  });
  const subj = pick(people.filter(p => p.role !== 'K'));
  if (variant === 'staged') mkClue('c_stage', 'The ' + st.piece + ', again', fill(D.STAGECLUE, { piece: st.piece, staff: st.staff.name, v: V.short, Treal: fmt(Treal), T: fmt(T), place: P2.place.name }), '⏱️', 'clue', P2.place.id);
  else mkClue('c_RH', 'Incriminating papers', 'Tucked out of sight in the ' + P2.place.name + ': ' + fill(D.MOTIVES[subj.motive].doc, { name: subj.short, v: V.short }), '📄', 'clue', P2.place.id);
  const F = variant === 'frame' ? pick([P1, P2, S]) : null;
  if (F) mkClue('c_N', F.itemShort, fill('Dumped by the {exit}, still wet: {item}. Odd, though: it reeks of {trait}.', { exit: st.exit.name, item: F.item, trait: K.trait }), '🧤', 'clue', 'exit');
  else mkClue('c_N', 'Bloody evidence', fill('Dumped by the {exit}, still wet: {thing}. No name on it. But it reeks of {trait}.', { exit: st.exit.name, thing: K.anon, trait: K.trait }), '🧤', 'clue', 'exit');
  mkClue('c_body', st.staff.name + '\'s last entry', fill('{staff}\'s logbook, last line, scrawled in a shaking hand: “{t} — someone went out the {exit}, fast. Smelled of {trait}.”', { staff: st.staff.name, exit: st.exit.name, trait: K.trait, t: fmt(Treal + 3) }), '📓', 'clue', 'exit');
  const since = variant === 'staged' ? 'since before ten' : 'from before half past ten';
  mkClue('t_P1', P1.short + ' admits…', fill('{p1} was with {p2} in {spot} {since}, when {v} died. Neither left. Ask {p2} to confirm.', { p1: P1.short, p2: P2.short, spot, v: V.short, since }), '🗣️', 'testimony');
  if (S) mkClue('t_S', S.short + ' admits…', fill('{s} was on a call from {callSpot} at {t}, logged by the exchange. {s} never saw {k} near the {kp}.', { s: S.short, callSpot: st.callSpot, t: fmt(T - 3), k: K.short, kp: K.place.name }), '🗣️', 'testimony');
  if (variant !== 'staged') mkClue('t_K', K.short + ' admits…', fill('{k} left the {kp} around 10:30 through the {exit}, alone and unseen. No alibi for {T}.', { k: K.short, kp: K.place.name, exit: st.exit.name, T: fmt(T) }), '🗣️', 'testimony');
  else {
    mkClue('t_KC', K.short + '\'s phone call', fill('{k} was on a logged call from {callSpot}, 10:38 to 10:50. Covers {T}, the time on the {piece}. Airtight, if the {piece} is honest.', { k: K.short, callSpot: st.callSpot, T: fmt(T), piece: st.piece }), '☎️', 'testimony');
    mkClue('t_L', L.short + ' admits…', fill('{l} slipped out the {exit} alone at about 10:28. Nobody saw where {l} went. No alibi for {T}.', { l: L.short, exit: st.exit.name, T: fmt(T) }), '🗣️', 'testimony');
  }

  const stmts = {};
  people.forEach(p => {
    let body = fill(claimTpl[p.idx], { place: p.place.name, scene: st.scene.name });
    if (p.role === 'K' && S) body += fill(pick(D.VOUCH), { s: S.short });
    else if (r() < 0.55) body += fill(pick(D.VOUCH), { s: pick(people.filter(o => o.idx !== p.idx)).short });
    const br = { K: S ? ['c_K', 't_S', 'c_N'] : ['c_K', 'c_N'], P1: ['c_P1'], P2: ['t_P1'], S: ['c_S'], L: ['c_L'] }[p.role];
    stmts['st_claim_' + p.idx] = { id: 'st_claim_' + p.idx, who: p.idx, kind: 'claim', place: p.place.name, text: wrapStatic(p, body), breakers: br, broken: false };
  });

  const tw = { conf: false, body: false, confAt: 6 + Math.floor(r() * 2), bodyAt: 7 + Math.floor(r() * 2) };
  const tr = r();
  if (tr < 0.4) tw.conf = true; else if (tr < 0.8) tw.body = true; else { tw.conf = true; tw.body = true; tw.bodyAt = 9; }

  const g = {
    seed, st, V, people, T, Treal, variant, F, clues, stmts, tw, pairIdx, spot, since, callKey, call, K, P1, P2, S, L, subj,
    byRole, r: mulberry((seed ^ 0x9E3779B9) >>> 0),
    t: 0, max: MAXT, found: {}, searched: {}, met: {}, asked: {}, nerve: {}, status: {},
    leadExit: false, bodyDone: false, conf: null, confSeen: false, confBroken: false, over: false, dawn: false,
    bluffs: 0, hints: 0, cracks: 0, notes: {}, log: [], planted: false,
  };
  people.forEach(p => { g.asked[p.idx] = {}; g.nerve[p.idx] = 0; g.status[p.idx] = 'unchecked'; g.notes[p.idx] = []; });
  g.found.c_scene = true; // the body is the free first look
  return g;
}

/* ---------- helpers ---------- */
const pk = (g, a) => a[Math.floor(g.r() * a.length)];
const LOWER = /^(The|A|An|My|We|Everything|It|There|That|This|Ask|Every|Half)\b/;
function joinOpen(o, body) { if (/, $/.test(o) && LOWER.test(body)) body = body.charAt(0).toLowerCase() + body.slice(1); return o + body; }
function wrap(g, p, body, quip) {
  const v = D.VOICES[p.voice];
  let t = joinOpen(g.r() < 0.65 ? pk(g, v.o) : '', body) + (g.r() < 0.45 ? pk(g, v.c) : '');
  if (quip && g.r() < 0.4) t += ' ' + fresh(g, 'quip' + p.idx, p.quips);
  return norm(t);
}
function fresh(g, key, arr) { g.used = g.used || {}; let u = g.used[key] = g.used[key] || []; if (u.length >= arr.length) u = g.used[key] = []; const left = arr.filter(x => u.indexOf(x) < 0); const c = left[Math.floor(g.r() * left.length)]; u.push(c); return c; }
function beat(g, p) {
  if (g.nerve[p.idx] >= 2 && g.r() < 0.6) return fresh(g, 'tell' + p.idx, D.TELLS);
  return g.r() < 0.5 ? fresh(g, 'beat' + p.idx, p.beats) : null;
}
function L(g, p, text, mood, withBeat) { const out = []; if (withBeat) { const b = beat(g, p); if (b) out.push({ k: 'b', text: b }); } out.push({ k: 's', text, mood: mood || moodOf(g, p) }); return out; }
function moodOf(g, p) { const n = g.nerve[p.idx]; return n >= 3 ? 'nervous' : n >= 2 ? 'nervous' : 'neutral'; }
function person(g, i) { return g.people[i]; }
function addNote(g, i, text, kind) { if (!g.notes[i].some(n => n.text === text)) g.notes[i].push({ text, kind }); }
function pushClue(g, id, out) { if (!g.found[id]) { g.found[id] = true; out.push(g.clues[id]); } }

/* ---------- time & events ---------- */
function spend(g, n) {
  g.t = Math.min(g.max, g.t + n);
  const ev = [];
  if (g.tw.body && !g.bodyDone && g.t >= g.tw.bodyAt && !g.dawn) {
    g.bodyDone = true; g.leadExit = true; g.t = Math.min(g.max, g.t + 1);
    ev.push({ type: 'body', text: fill(g.st.dead2, { exit: g.st.exit.name }), staff: g.st.staff.name });
  }
  if (g.tw.conf && !g.conf && g.t >= g.tw.confAt && !g.dawn) {
    const elig = g.people.filter(p => p.role !== 'K' && !g.stmts['st_claim_' + p.idx].broken && g.status[p.idx] !== 'holds');
    if (elig.length) {
      const p = elig[Math.floor(g.r() * elig.length)];
      const v = D.VOICES[p.voice];
      const text = norm(pk(g, v.conf) + ' ' + fill(pk(g, D.CONF), { fake: g.st.fake, v: g.V.short }));
      g.conf = { idx: p.idx, id: 'st_conf_' + p.idx };
      g.stmts[g.conf.id] = { id: g.conf.id, who: p.idx, kind: 'confession', text, breakers: ['c_scene'], broken: false };
      g.confSeen = true; g.nerve[p.idx] = Math.max(g.nerve[p.idx], 2);
      ev.push({ type: 'confession', idx: p.idx, text, mood: 'nervous' });
    }
  }
  if (g.t >= g.max && !g.dawn) { g.dawn = true; ev.push({ type: 'dawn' }); }
  return ev;
}
function locked(g) { return g.over || g.dawn; }

/* ---------- views ---------- */
function locations(g) {
  const st = g.st, out = [{ id: 'scene', name: st.scene.name, icon: st.scene.icon, scene: true, searched: true }];
  st.places.forEach(p => out.push({ id: p.id, name: p.name, icon: p.icon, searched: !!g.searched[p.id] }));
  if (g.leadExit) out.push({ id: 'exit', name: st.exit.name, icon: st.exit.icon, searched: !!g.searched.exit, lead: true });
  return out;
}
function statementsFor(g, i) {
  const out = [];
  if (g.met[i]) out.push(g.stmts['st_claim_' + i]);
  ['st_call_', 'st_alone_'].forEach(k => { if (g.stmts[k + i]) out.push(g.stmts[k + i]); });
  if (g.conf && g.conf.idx === i) out.unshift(g.stmts[g.conf.id]);
  return out;
}
function clueList(g) { return Object.keys(g.found).filter(k => g.found[k]).map(k => g.clues[k]); }
function topics(g, i) {
  const p = g.people[i], a = g.asked[i], s = g.status[i];
  const out = [
    { id: 'victim', label: 'About ' + g.V.short, done: !!a.victim },
    { id: 'gossip', label: 'Who had a grudge?', done: !!a.gossip },
  ];
  const talks = p.role === 'K' ? (g.variant === 'staged' && s === 'holds') : (s === 'holds' || s === 'pending' || (p.role === 'L' && s === 'collapsed'));
  if (talks) out.push({ id: 'saw', label: 'What did you notice?', done: !!a.saw });
  return out;
}

/* ---------- actions ---------- */
function meet(g, i) {
  const p = person(g, i), s = g.stmts['st_claim_' + i];
  if (g.met[i]) return { ok: true, first: false, lines: [] };
  g.met[i] = true;
  addNote(g, i, 'Smells of ' + p.trait + '.', 'trait');
  const lines = L(g, p, s.text, 'neutral', true);
  return { ok: true, first: true, lines, events: [] };
}
function search(g, locId) {
  if (locked(g)) return { ok: false, error: 'dawn' };
  if (g.searched[locId]) return { ok: false, error: 'done' };
  if (locId === 'exit' && !g.leadExit) return { ok: false, error: 'nolead' };
  const found = [];
  const place = g.st.places.find(x => x.id === locId);
  if (locId === 'exit') { pushClue(g, 'c_N', found); if (g.bodyDone) pushClue(g, 'c_body', found); }
  else if (place) {
    const owner = g.people.find(p => p.place.id === locId);
    const rl = owner.role; pushClue(g, rl === 'P2' ? (g.variant === 'staged' ? 'c_stage' : 'c_RH') : 'c_' + rl, found);
  } else return { ok: false, error: 'nowhere' };
  g.searched[locId] = true;
  const events = spend(g, 1);
  return { ok: true, cost: 1, clues: found, loc: place || g.st.exit, events, nothing: !found.length };
}
function ask(g, i, topic) {
  if (locked(g)) return { ok: false, error: 'dawn' };
  const p = person(g, i), a = g.asked[i];
  const avail = topics(g, i).find(t => t.id === topic);
  if (!avail || a[topic]) return { ok: false, error: 'unavailable' };
  a[topic] = true; g.nerve[i] = Math.min(3, g.nerve[i] + 1);
  const V = g.V.short; let lines = [];
  if (topic === 'victim') {
    const body = p.role === 'K' ? fill(pk(g, D.DENY), { v: V }) : fill(pk(g, D.MOTIVES[p.motive].admit), { v: V });
    lines = L(g, p, wrap(g, p, body, true), null, true);
    if (p.role !== 'K') addNote(g, i, 'Motive: ' + D.MOTIVES[p.motive].label.toLowerCase() + ' (admitted).', 'motive');
    else addNote(g, i, 'Says they got along with ' + V + '.', 'motive');
  } else if (topic === 'gossip') {
    const tgt = g.people[p.gossipAbout];
    const body = fill(pk(g, D.MOTIVES[tgt.motive].gossip), { name: tgt.short, v: V });
    lines = L(g, p, wrap(g, p, body, true), null, true);
    addNote(g, tgt.idx, D.MOTIVES[tgt.motive].label + ' motive, per ' + p.short + '.', 'gossip');
    addNote(g, i, 'Pointed at ' + tgt.short + '.', 'gossip');
  } else if (topic === 'saw') {
    const staged = g.variant === 'staged';
    let body;
    if (p.role === 'L') body = fill(pk(g, D.SAWL), { exit: g.st.exit.name, trait: g.K.trait });
    else if (p.role === 'K') body = fill(pk(g, D.SAW), { exit: g.st.exit.name, trait: g.L.trait, when: 'half past ten' });
    else body = fill(pk(g, D.SAW), { exit: g.st.exit.name, trait: g.K.trait, when: staged ? 'quarter past ten' : 'ten-forty' });
    lines = L(g, p, wrap(g, p, body, false), null, true);
    addNote(g, i, 'Says someone used the ' + g.st.exit.name + '.', 'sighting');
    if (!g.leadExit) { g.leadExit = true; lines.push({ k: 'n', text: 'NEW LEAD: ' + g.st.exit.name }); }
  }
  const events = spend(g, 1);
  return { ok: true, cost: 1, lines, events, mood: moodOf(g, p) };
}
function breakStmt(g, s, by) { s.broken = true; s.brokenBy = by; }
function present(g, i, clueId) {
  if (locked(g)) return { ok: false, error: 'dawn' };
  if (!g.found[clueId]) return { ok: false, error: 'nothave' };
  const p = person(g, i), v = D.VOICES[p.voice];
  const mine = Object.values(g.stmts).filter(s => s.who === i);
  const hit = mine.filter(s => !s.broken && s.breakers.indexOf(clueId) >= 0);
  if (!hit.length) {
    if (g.F && g.F.idx === i && clueId === 'c_N') {
      g.planted = true; g.nerve[i] = Math.min(3, g.nerve[i] + 1);
      addNote(g, i, 'Says the ' + p.itemShort.toLowerCase() + ' was stolen and planted. It smells of ' + g.K.trait + ', not ' + p.trait + '.', 'crack');
      const events = spend(g, 1);
      return { ok: true, type: 'planted', cost: 1, lines: L(g, p, norm(fill(pk(g, D.FRAMED), { trait: p.trait, other: g.K.trait })), 'angry', true), events, mood: 'angry' };
    }
    const was = mine.some(s => s.broken && s.breakers.indexOf(clueId) >= 0);
    if (was) return { ok: true, type: 'already', cost: 0, lines: L(g, p, pk(g, D.PRESSALREADY), 'smug'), events: [] };
    g.bluffs++; g.nerve[i] = Math.min(3, g.nerve[i] + 1);
    const events = spend(g, 2);
    return { ok: true, type: 'miss', cost: 2, lines: L(g, p, norm(pk(g, v.fail)), 'smug', true), events, mood: 'smug' };
  }
  const conf = hit.find(s => s.kind === 'confession'), claim = hit.find(s => s.kind !== 'confession');
  const lines = [], newClues = [], bits = [];
  g.nerve[i] = Math.min(3, g.nerve[i] + 2);
  const say = t => bits.push({ k: 's', text: norm(pk(g, v.crack) + ' ' + t + (g.r() < 0.6 ? ' ' + p.crack : '')), mood: 'caught' });
  if (conf) { breakStmt(g, conf, clueId); g.confBroken = true; g.cracks++; bits.push({ k: 's', text: norm(pk(g, v.crack) + ' ' + fill(pk(g, D.CONFBREAK), { v: g.V.short })), mood: 'caught' }); }
  if (claim) {
    if (g.conf && g.conf.idx === i && !g.stmts[g.conf.id].broken) { breakStmt(g, g.stmts[g.conf.id], clueId); g.confBroken = true; }
    breakStmt(g, claim, clueId); g.cracks++;
    const d = { place: p.place.name, exit: g.st.exit.name, spot: g.spot, Spot: cap(g.spot), p1: g.P1.short, p2: g.P2.short, k: g.K.short, kplace: g.K.place.name, callSpot: g.st.callSpot, since: g.since, v: g.V.short, piece: g.st.piece, staff: g.st.staff.name, Treal: fmt(g.Treal) };
    const lead = () => { if (!g.leadExit) { g.leadExit = true; bits.push({ k: 'n', text: 'NEW LEAD: ' + g.st.exit.name }); } };
    if (claim.kind === 'call') { // staged killer, second lie
      g.status[i] = 'collapsed'; say(fill(pk(g, D.KSTAGE), d));
      addNote(g, i, 'The ' + g.st.piece + ' was set forward. The phone call proves nothing. No alibi for ' + fmt(g.Treal) + '.', 'crack');
    } else if (claim.kind === 'alone') { // staged loner, cleared
      g.status[i] = 'holds'; say(fill(pk(g, D.LSTAGE), d));
      addNote(g, i, 'Still in the ' + p.place.name + ' until 10:28, so clear for ' + fmt(g.Treal) + '. Alibi holds.', 'crack');
    } else if (p.role === 'P1') {
      d.secret = D.PAIRSECRET[g.pairIdx]; g.status[i] = 'pending'; pushClue(g, 't_P1', newClues);
      say(fill(pk(g, D.PAIRCRACK), d));
      addNote(g, i, 'Was with ' + g.P2.short + ' in ' + g.spot + ' (needs ' + g.P2.short + ' to confirm).', 'crack');
    } else if (p.role === 'P2') {
      d.secret = D.PAIRSECRET[g.pairIdx]; g.status[i] = 'holds'; g.status[g.P1.idx] = 'holds';
      say(fill(pk(g, D.PAIRCONFIRM), d));
      addNote(g, i, 'Confirmed: with ' + g.P1.short + ' in ' + g.spot + '. Alibi holds.', 'crack');
      addNote(g, g.P1.idx, 'Confirmed by ' + g.P2.short + '. Alibi holds.', 'crack');
    } else if (p.role === 'S') {
      d.call = g.call; g.status[i] = 'holds'; pushClue(g, 't_S', newClues);
      say(fill(D.SOLOCRACK, d));
      addNote(g, i, 'Was on a logged call at ' + fmt(g.T - 3) + '. Alibi holds.', 'crack');
    } else if (p.role === 'L') {
      g.status[i] = 'collapsed'; pushClue(g, 't_L', newClues); say(fill(pk(g, D.KCRACK), d)); lead();
      addNote(g, i, 'Out the ' + g.st.exit.name + ' alone at 10:28. No alibi for ' + fmt(g.T) + '.', 'crack');
      g.stmts['st_alone_' + i] = { id: 'st_alone_' + i, who: i, kind: 'alone', text: norm(p.short + ' admits: out the ' + g.st.exit.name + ' alone from about 10:28. Nobody saw where.'), breakers: ['c_stage'], broken: false };
    } else if (g.variant === 'staged') { // killer's first lie gives way to a perfect alibi
      g.status[i] = 'holds'; pushClue(g, 't_KC', newClues); say(fill(pk(g, D.KCALL), d));
      addNote(g, i, 'On a logged call 10:38 to 10:50. Covers ' + fmt(g.T) + '. Alibi holds?', 'crack');
      g.stmts['st_call_' + i] = { id: 'st_call_' + i, who: i, kind: 'call', text: norm(fill(D.KCALLQUOTE, d)), breakers: ['c_stage'], broken: false };
    } else {
      g.status[i] = 'collapsed'; pushClue(g, 't_K', newClues); say(fill(pk(g, D.KCRACK), d)); lead();
      addNote(g, i, 'Alibi collapsed. Alone, unseen, at the time of death.', 'crack');
    }
  }
  if (g.r() < 0.5) lines.push({ k: 'b', text: pk(g, D.STINGERS) });
  const events = spend(g, 1);
  return { ok: true, type: 'crack', cost: 1, lines: lines.concat(bits), newClues, events, mood: 'caught', stmtIds: hit.map(s => s.id), brokeConfession: !!conf };
}

function nextHint(g) {
  if (g.conf && !g.stmts[g.conf.id].broken) {
    const p = g.people[g.conf.idx];
    return fill('{p} confessed too easily. Compare the confession with the body. Show {p} the body.', { p: p.short });
  }
  const unmet = g.people.filter(p => !g.met[p.idx]);
  if (unmet.length) return 'You haven\'t talked to ' + unmet[0].short + ' yet. Everyone has a story, and every story has a hole.';
  const K = g.K;
  if (g.status[K.idx] === 'collapsed' && (g.searched.exit || (g.variant === 'staged' && g.found.c_stage)))
    return 'One alibi has nothing under it: ' + K.short + '\'s. Make the accusation, and bring your best proof.';
  for (const p of g.people) for (const s of statementsFor(g, p.idx)) {
    if (s.broken) continue;
    const c = s.breakers.find(b => g.found[b]);
    if (c) return 'Show ' + g.clues[c].title + ' to ' + p.short + '. Their story won\'t survive it.';
  }
  if (g.F && g.found.c_N && !g.planted) return 'That ' + g.F.itemShort.toLowerCase() + ' points straight at ' + g.F.short + '. Too straight. Show it to ' + g.F.short + ', and smell it.';
  if (g.leadExit && !g.searched.exit) return 'Somebody went out the ' + g.st.exit.name + '. Search it.';
  const un = g.st.places.filter(pl => !g.searched[pl.id]);
  if (un.length) {
    let pl = un[Math.floor(g.r() * un.length)];
    if (g.variant === 'staged' && g.status[K.idx] === 'holds' && !g.searched[g.P2.place.id]) { pl = g.P2.place; return 'That phone call is awfully convenient. Check the time again. Search the ' + pl.name + '.'; }
    const owner = g.people.find(p => p.place.id === pl.id);
    return owner.short + ' says they were in the ' + pl.name + '. Go see for yourself.';
  }
  if (g.status[g.P1.idx] === 'pending') return g.P1.short + ' named ' + g.P2.short + '. Press ' + g.P2.short + ' with ' + g.P1.short + '\'s testimony.';
  if (!g.leadExit) return 'Ask the ones you\'ve cracked what they noticed. Someone heard a door.';
  return 'Weigh the alibis. One person has none that holds.';
}
function hint(g) {
  if (locked(g)) return { ok: false, error: 'dawn' };
  g.hints++;
  const text = nextHint(g);
  const events = spend(g, 1);
  return { ok: true, cost: 1, text, events };
}

/* ---------- accusation ---------- */
function accuse(g, i, proofId) {
  if (g.over) return { ok: false, error: 'over' };
  g.over = true;
  const p = person(g, i), K = g.K, V = g.V;
  const win = p.idx === K.idx;
  const strongSet = g.variant === 'staged' ? ['c_N', 'c_stage'] : ['c_N'];
  const fairSet = ['c_K', 't_K', 't_S', 'c_body', 't_KC'];
  const proof = win ? (strongSet.indexOf(proofId) >= 0 ? 'strong' : fairSet.indexOf(proofId) >= 0 ? 'fair' : 'none') : 'none';
  const left = g.max - g.t;
  let score = 0;
  if (win) {
    score = 450 + (proof === 'strong' ? 250 : proof === 'fair' ? 110 : 0) + left * 25 + g.cracks * 60 - g.bluffs * 50 - g.hints * 75
      + (g.confSeen && g.confBroken ? 100 : 0) + (g.variant === 'frame' && g.planted ? 60 : 0) + (g.variant === 'staged' && g.stmts['st_call_' + K.idx] && g.stmts['st_call_' + K.idx].broken ? 60 : 0);
    score = Math.max(100, score);
  } else score = clueList(g).length * 20;
  const rank = win ? D.RANKS.find(r => score >= r.min) : { name: 'Cold Case', icon: '🥶', line: p.short + ' walked. ' + K.short + ' laughed all the way home.' };
  const lines = [], vK = D.VOICES[K.voice], vP = D.VOICES[p.voice], st = g.st;
  lines.push({ k: 'n', text: win ? 'You lay it out under the lamp. ' + K.short + ' doesn\'t blink.' : 'You point at ' + p.short + '. The room holds its breath.' });
  if (win) {
    if (g.variant === 'staged') lines.push({ k: 'n', text: 'The ' + st.piece + ' said ' + fmt(g.T) + '. It lied. ' + V.short + ' died around ' + fmt(g.Treal) + ', and ' + K.short + '\'s phone call was an alibi built after the fact.' });
    else if (g.variant === 'frame') lines.push({ k: 'n', text: 'The ' + g.F.itemShort.toLowerCase() + ' said ' + g.F.short + '. But ' + g.F.short + ' was nowhere near, and it reeks of ' + K.trait + '. Somebody planted it. Somebody who smells like ' + K.short + '.' });
    else lines.push({ k: 'n', text: 'The ' + st.piece + ' stopped at ' + fmt(g.T) + '. ' + K.short + ' swore to the ' + K.place.name + '. It was empty.' });
    if (proof === 'strong' && g.variant !== 'frame') lines.push({ k: 'n', text: proofId === 'c_stage' ? 'You hold up the ' + st.piece + '. The crown is still pulled out.' : 'And in the ' + st.exit.name + ': ' + K.anon + ', reeking of ' + K.trait + '.' });
    else if (proof === 'fair') lines.push({ k: 'n', text: 'No weapon, no glove. Just a story with nothing under it. It was enough.' });
    else if (proof === 'none') lines.push({ k: 'n', text: 'No proof in your hand. Just nerve. ' + K.short + ' smiles at you. For a second.' });
    const mot = fill(pk(g, D.MOTIVES[K.motive].reveal), { v: V.short, weapon: st.weapon });
    lines.push({ k: 's', text: norm(pk(g, vK.conf) + ' ' + mot + ' ' + K.caughtLine), mood: 'caught', idx: K.idx });
  } else {
    lines.push({ k: 's', text: norm(p.wrongAcc + ' ' + pk(g, vP.fail)), mood: 'smug', idx: p.idx });
    let why = '';
    if (g.variant === 'staged' && p.role === 'L') why = ' The ' + st.piece + ' had been set forward. ' + p.short + ' was in the ' + p.place.name + ' when it happened.';
    if (g.variant === 'frame' && g.F && p.idx === g.F.idx) why = ' The ' + p.itemShort.toLowerCase() + ' was planted. It smelled of ' + K.trait + ' all along.';
    lines.push({ k: 'n', text: 'The Commissioner takes it from there. By morning ' + p.short + ' is gone, and so is your case.' + why + ' It was ' + K.short + '.' });
  }
  const recap = g.people.map(x => ({ idx: x.idx, name: x.name, role: x.role,
    truth: x.role === 'K' ? (g.variant === 'staged' ? 'The killer. Set the ' + st.piece + ' forward, then made a phone call for an alibi.' : g.variant === 'frame' ? 'The killer. Planted ' + g.F.short + '\'s ' + g.F.itemShort.toLowerCase().replace(/^bloody /, '') + '.' : 'The killer.') + ' Motive: ' + D.MOTIVES[x.motive].label.toLowerCase() + '.' :
      x.role === 'P1' || x.role === 'P2' ? 'Was with ' + (x.role === 'P1' ? g.P2.short : g.P1.short) + ' in ' + g.spot + '.' + (g.F && g.F.idx === x.idx ? ' Framed.' : '') :
      x.role === 'L' ? 'Slipped out the ' + st.exit.name + ' at 10:28, after it was already done. Innocent, and very unlucky.' :
      'Was on a phone call from ' + st.callSpot + '.' + (g.F && g.F.idx === x.idx ? ' Framed.' : '') }));
  return { ok: true, win, proof, score, rank, left, lines, recap, killer: K.idx, accused: p.idx, epi: st.epi, variant: g.variant,
    stats: { cracks: g.cracks, bluffs: g.bluffs, hints: g.hints, left, confession: g.confSeen, sawThrough: g.confSeen && g.confBroken, body: g.bodyDone, variant: g.variant } };
}
function clock(g) { return fmt(START + g.t * 15); }

const API = { newCase, search, ask, present, meet, hint, accuse, locations, statementsFor, clueList, topics, clock, fmt, MAXT, mulberry };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Noir = API;
})(typeof window !== 'undefined' ? window : globalThis);
