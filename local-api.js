// Client-side replacement for server.js (offline mode only; no keys, no network).
(function () {
  const G = window.NoirGame, sessions = new Map();
  const rid = () => Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  const err = (m) => ({ error: m });
  window.noirApi = function (p, b) {
    if (p === 'status') return { mode: 'offline', provider: null, model: null };
    if (p === 'new') { const g = G.generate(), sid = rid(); sessions.set(sid, g); return { sid, case: G.publicCase(g), mode: 'offline' }; }
    const g = sessions.get(b.sid); if (!g) return err('Unknown case. Start a new one.');
    if (p === 'examine') {
      if (g.state.over) return err('Case closed.');
      const c = G.examine(g, b.loc); return c ? { clue: c } : err('Nothing there.');
    }
    if (p === 'ask') {
      if (g.state.over) return err('Case closed.');
      const s = G.sf(g, b.suspectId); if (!s) return err('No such suspect.');
      const text = String(b.text || '').slice(0, 300).trim();
      let clue = null; if (b.clueId) { if (!g.state.examined[b.clueId]) return err('You have not found that yet.'); clue = g.clues.find(c => c.id === b.clueId); }
      if (!text && !clue) return err('Say something.');
      g.state.asked++;
      return { reply: G.replyOffline(g, s, text, clue && clue.id), via: 'offline' };
    }
    if (p === 'accuse') {
      if (g.state.over) return err('Case closed.');
      const s = G.sf(g, b.suspectId); if (!s) return err('No such suspect.');
      g.state.over = true;
      const correct = s.id === g.C.id, motiveRight = b.motive === g.C.motive;
      const found = Object.keys(g.state.examined).length;
      const score = (correct ? 60 : 0) + (correct && motiveRight ? 20 : 0) + Math.min(found, 6) * 3 + Math.max(0, 12 - Math.floor(g.state.asked / 2));
      const rank = !correct ? 'Cold case' : motiveRight && found >= 5 ? 'Legendary Gumshoe' : motiveRight ? 'Sharp Detective' : 'Lucky Hunch';
      const C = g.C;
      return {
        correct, motiveRight, accused: s.name, culprit: C.name, culpritRel: C.rel, motive: G.MOTIVES[C.motive].label, score, rank,
        story: `${C.name}, ${g.V.short}'s ${C.rel}, did it. Motive: ${G.MOTIVES[C.motive].label.split(' — ')[0].toLowerCase()}. ${C.first} claimed to be in the ${C.alibiPlace}, but it sat empty. Instead ${C.first} slipped into the ${g.st.scene} at ${G.fmtTime(g.T)} and struck ${g.V.short} with ${g.st.weapon}, leaving a ${C.item} engraved ${C.initials} behind.`,
        clues: g.clues.map(c => ({ title: c.title, text: c.text, found: !!g.state.examined[c.id] })),
        suspects: g.suspects.map(x => ({ name: x.name, rel: x.rel, motive: G.MOTIVES[x.motive].label, secret: x.culprit ? 'Murderer' : G.SECRETS[x.secret].short, alibi: x.alibiPlace })),
      };
    }
    return err('not found');
  };
})();
