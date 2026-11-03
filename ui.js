/* NOIR: Last Call — UI */
(function () {
'use strict';
const E = window.Noir, A = window.NoirArt, S = window.NoirSnd, D = window.NoirData;
const $ = s => document.querySelector(s), $$ = s => [].slice.call(document.querySelectorAll(s));
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAST = /[?&]fast\b/.test(location.search);
let G = null, seed = 0, daily = false, view = 'scene', armed = null, cur = null, busy = false, logs = {}, skipFn = null, boardNew = 0, over = false;

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('noir.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('noir.' + k, JSON.stringify(v)); } catch (e) {} },
};
const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

/* ---------- palette ---------- */
const PAL_KEYS = ['bg', 'panel', 'line', 'fg', 'mut', 'acc', 'acc2', 'gold'];
function setPal(p) { const r = document.documentElement.style; PAL_KEYS.forEach(k => { if (p && p[k]) r.setProperty('--' + k, p[k]); else r.removeProperty('--' + k); });
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', (p && p.bg) || '#0d0912'); }

/* ---------- haptics ---------- */
// Android: navigator.vibrate patterns. iOS Safari has no vibrate API, but a real tap that toggles an <input type=checkbox switch>
// gives the native haptic tick (iOS 17.4+). So on iOS every button gets an invisible switch-label overlay; only genuine taps trigger it.
const UA = navigator.userAgent || '';
const isIOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const canVib = typeof navigator.vibrate === 'function';
const Hap = { on: store.get('hap', true) && (isIOS || canVib), last: 0, can: isIOS || canVib };
const PAT = { tap: 9, link: [14, 50, 22], crack: [30, 40, 80], miss: [70, 60, 70], planted: [20, 40, 20, 40, 20], heavy: [90, 70, 160], accuse: [35, 110, 35, 110, 35, 220], win: [20, 70, 20, 70, 140], lose: [260], beat: [28, 150, 40], dust: 6, pulse: 7, lift: [12, 40, 12, 40, 60], boom: [220, 60, 120, 60, 320] };
function hap(kind) {
  if (!Hap.on || !canVib || isIOS) return; const n = performance.now();
  if ((kind === 'tap' && n - Hap.last < 60) || (kind === 'dust' && n - Hap.last < 90) || (kind === 'pulse' && n - Hap.last < 200)) return; Hap.last = n;
  try { navigator.vibrate(PAT[kind] || PAT.tap); } catch (e) {}
}
function hapArm(b) {
  if (!isIOS || b.querySelector(':scope > label[data-hap]')) return;
  if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
  const lab = document.createElement('label'); lab.setAttribute('data-hap', ''); lab.setAttribute('aria-hidden', 'true');
  const inp = document.createElement('input'); inp.type = 'checkbox'; inp.tabIndex = -1; if (Hap.on) inp.setAttribute('switch', '');
  inp.addEventListener('click', e => e.stopPropagation()); lab.appendChild(inp); b.appendChild(lab);
  // let the switch toggle (and tick) before the handler re-renders this button away; gesture-critical buttons (audio, share) run inline
  lab.addEventListener('click', e => { if (!Hap.on || b.hasAttribute('data-now')) return; e.stopPropagation(); setTimeout(() => { if (b.isConnected && !b.disabled) b.click(); }, 0); });
}
function hapSync() { $$('label[data-hap] input').forEach(i => { if (Hap.on) i.setAttribute('switch', ''); else i.removeAttribute('switch'); }); store.set('hap', Hap.on); $$('[data-haptgl]').forEach(b => { b.classList.toggle('on', Hap.on); b.firstChild.textContent = '📳 Haptics ' + (Hap.on ? 'on' : 'off'); }); }
function setHap(v) { Hap.on = !!v && Hap.can; hapSync(); if (Hap.on && canVib && !isIOS) try { navigator.vibrate(18); } catch (e) {} }
if (isIOS) { const arm = () => $$('button').forEach(hapArm); new MutationObserver(arm).observe(document.body, { childList: true, subtree: true }); arm(); }
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button')) hap('tap'); }, true);

/* ---------- fx ---------- */
const flashEl = $('#flash');
window.NoirFx = { flash() { flashEl.classList.add('on'); setTimeout(() => flashEl.classList.remove('on'), 90); setTimeout(() => { flashEl.classList.add('on'); setTimeout(() => flashEl.classList.remove('on'), 60); }, 190); } };
(function rain() {
  const c = $('#rain'), x = c.getContext('2d'); let W, H, drops = [];
  function size() { const r = devicePixelRatio > 1 ? 1.5 : 1; W = c.width = innerWidth * r; H = c.height = innerHeight * r; drops = []; for (let i = 0; i < 90; i++) drops.push({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 22, v: 9 + Math.random() * 11 }); }
  size(); addEventListener('resize', size);
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  (function f() { x.clearRect(0, 0, W, H); x.strokeStyle = 'rgba(170,190,230,.35)'; x.lineWidth = 1; x.beginPath(); drops.forEach(d => { x.moveTo(d.x, d.y); x.lineTo(d.x - d.l * 0.18, d.y + d.l); d.y += d.v; d.x -= d.v * 0.18; if (d.y > H) { d.y = -d.l; d.x = Math.random() * W * 1.2; } }); x.stroke(); requestAnimationFrame(f); })();
})();
function toast(msg, cls) { const t = $('#toast'); t.textContent = msg; t.className = 'toast on ' + (cls || ''); clearTimeout(toast._t); toast._t = setTimeout(() => t.className = 'toast', 2200); }

/* ---------- typing ---------- */
document.addEventListener('pointerdown', () => { if (skipFn) skipFn(); }, true);
function typeText(el, text, speed) {
  return new Promise(res => {
    if (FAST) { el.textContent = text; return res(); }
    let i = 0, done = false, tm; el.classList.add('caret'); speed = speed || 15;
    const fin = () => { if (done) return; done = true; clearTimeout(tm); el.textContent = text; el.classList.remove('caret'); if (skipFn === fin) skipFn = null; scrollLog(); res(); };
    skipFn = fin;
    const step = () => { if (done) return; i++; el.textContent = text.slice(0, i); if (i % 2 === 0) S.sfx.type(); if (i >= text.length) return fin(); const ch = text[i - 1]; tm = setTimeout(step, speed + (/[.!?]/.test(ch) ? 150 : /[,;—:]/.test(ch) ? 60 : 0)); scrollLog(); };
    step();
  });
}
function scrollLog() { const l = $('#iLog'); if (l && !$('#interview').hidden) l.scrollTop = l.scrollHeight; }
function modal(html, onShow) {
  return new Promise(res => {
    const m = $('#modal'), b = $('#mbox'); b.innerHTML = html; m.hidden = false; m.scrollTop = 0;
    b.querySelectorAll('[data-r]').forEach(x => x.onclick = () => { m.hidden = true; S.sfx.tap(); res(x.dataset.r); });
    if (onShow) onShow(b);
  });
}

/* ---------- title ---------- */
function showTitle() {
  over = false; $('#hud').hidden = true; $('#game').hidden = true; $('#intro').hidden = true; $('#interview').hidden = true; $('#result').hidden = true; $('#modal').hidden = true; $('#sheet').hidden = true;
  const st = store.get('stats', { played: 0, solved: 0, best: 0, streak: 0 }), dl = store.get('daily', {}), friend = (location.search.match(/[?&]c=(\d+)/) || [])[1];
  const t = $('#title'); t.hidden = false; t.scrollTop = 0; setPal(null); if (S.setScene) S.setScene('title');
  t.innerHTML = `<div class="tbanner">${A.skyline('title', '#ff3d7f', ['#1a0b1a', '#0b0710'], 'club', 400, 210)}</div>
  <div class="tcard"><p class="kicker">A five-minute murder</p><h1 class="logo">NOIR<small>last call</small></h1>
  <p class="sub">Four suspects. Four lies. One night, one clock, and the rain won't quit.</p>
  ${friend ? `<button class="cta" id="bFriend" data-now>Play case #${esc(friend)}<small>a friend sent you this one</small></button>` : ''}
  <button class="cta ${friend ? 'alt' : ''}" id="bPlay" data-now>${friend ? 'Random case' : 'Open a case'}<small>${friend ? '' : 'a fresh murder every time'}</small></button>
  <button class="cta alt" id="bDaily" data-now>📅 Today's case ${dl.date === today() ? '· ' + (dl.win ? '✓ ' + dl.rank : 'tried') : ''}</button>
  <div class="hallo">📈 <b>New: the lie box.</b> Strap a suspect in, hold the lever, watch the needles.</div>
  ${isHalloween() ? `<div class="hallo">🎃 <b>Halloween night.</b> The dead are talking. Hold a <b>séance</b> in any case 👻</div>` : ''}
  <div class="toggles"><button class="tg ${S.isOn() ? 'on' : ''}" id="tSnd" data-now>${S.isOn() ? '🔊 Sound on' : '🔇 Sound off'}</button>${Hap.can ? `<button class="tg" data-haptgl>📳 Haptics</button>` : ''}</div>
  <ul class="how"><li><b>Search</b> rooms for evidence. Each move burns 15 minutes. Dawn is your deadline.</li><li><b>Everyone lies</b>. Show the right evidence to break a lie. Wrong guesses cost double.</li><li>Cracked liars talk. But an alibi that checks out can still be a lie, and the obvious clue can be a plant. Trust nothing, not even the clock.</li></ul>
  <div class="stats">${st.played ? `CASES ${st.played} · SOLVED ${st.solved} · BEST ${st.best} · STREAK ${st.streak}` : 'NO CASES YET. THE CITY IS WAITING.'}</div></div>`;
  $('#tSnd').onclick = () => { S.start(); S.setOn(!S.isOn()); const b = $('#tSnd'); b.classList.toggle('on', S.isOn()); b.firstChild.textContent = S.isOn() ? '🔊 Sound on' : '🔇 Sound off'; };
  $$('[data-haptgl]').forEach(b => b.onclick = () => setHap(!Hap.on)); hapSync();
  const go = (sd, dly) => { S.start(); S.setOn(S.isOn()); newGame(sd, dly); };
  if (friend) $('#bFriend').onclick = () => go(+friend, false);
  $('#bPlay').onclick = () => go(1000 + Math.floor(Math.random() * 90000), false);
  $('#bDaily').onclick = () => go(today(), true);
}

/* ---------- game start ---------- */
function newGame(sd, dly) {
  seed = sd; daily = !!dly; G = E.newCase(sd); G.polyStrip = {}; logs = {}; lifted = {}; armed = null; cur = null; busy = false; boardNew = 0; over = false;
  setPal(G.st.pal || { acc: G.st.accent }); if (S.setScene) S.setScene(G.st.id);
  $('#title').hidden = true; $('#result').hidden = true; $('#game').hidden = true; $('#hud').hidden = true;
  const it = $('#intro'); it.hidden = false; it.className = 'screen intro'; it.scrollTop = 0;
  const caseLabel = daily ? 'DAILY ' + String(sd).slice(4, 6) + '/' + String(sd).slice(6) : '#' + sd;
  it.innerHTML = `<div class="tbanner" style="height:170px">${A.skyline(G.st.id + 'i', G.st.accent, G.st.sky, G.st.id, 400, 170)}</div>
  <div class="meta">CASE ${caseLabel} · ${esc(G.st.name)}</div><p class="cold" id="cold"></p>
  <div class="rule">DEADLINE ${E.fmt(23 * 60 + 30 + E.MAXT * 15)}. Every move burns 15 minutes. At dawn the Commissioner takes the case. Name the killer first.</div>
  <button class="cta" id="bBody" style="visibility:hidden">Examine the body</button><div class="tapskip">TAP TO SKIP</div>`;
  S.sfx.thunder(false);
  typeText($('#cold'), G.st.open, 22).then(() => { $('#bBody').style.visibility = 'visible'; $('.tapskip').style.display = 'none'; });
  $('#bBody').onclick = async () => {
    it.hidden = true; $('#game').hidden = false; $('#hud').hidden = false; setView('scene'); updateHud(); renderAll();
    await showClue(G.clues.c_scene, 'The body');
    renderAll();
  };
}

/* ---------- HUD ---------- */
function updateHud(beat) {
  const left = G.max - G.t;
  $('#hudClock').textContent = E.clock(G);
  $('#hudBar').style.width = (left / G.max * 100) + '%';
  $('.tbar').classList.toggle('low', left <= 4); $('#hud').classList.toggle('hud-low', left <= 4);
  $('#hudLeft').textContent = left + ' moves left';
  $('#hudCase').textContent = daily ? 'DAILY' : '#' + seed;
  $('#sndBtn').textContent = S.isOn() ? '🔊' : '🔇';
  S.sfx.setTension(Math.max(0, Math.min(1, (10 - left) / 9)));
  if (beat && left <= 3 && left > 0) { S.sfx.heart(); hap('beat'); }
  $('#boardBadge').textContent = boardNew || ''; $('#boardBadge').classList.toggle('on', boardNew > 0 && view !== 'board');
}
$('#sndBtn').onclick = () => { S.start(); S.setOn(!S.isOn()); updateHud(); };
$('#menuBtn').onclick = async () => {
  const r = await modal(`<div class="dark"><h3 style="color:var(--fg)">PAUSED</h3><ul class="ul"><li><b>Search</b> rooms. Each move costs 15 min.</li><li>Show evidence to <b>break lies</b>. Wrong guess = 2 moves.</li><li>Cracked liars give <b>testimony</b>. Use it on others.</li><li>Find who has <b>no alibi</b>. Accuse with proof.</li></ul><button class="btn" data-r="x">Back to the case</button><button class="btn alt" data-r="snd" data-now>${S.isOn() ? '🔇 Sound off' : '🔊 Sound on'}</button>${Hap.can ? `<button class="btn alt" data-r="hap">📳 Haptics ${Hap.on ? 'off' : 'on'}</button>` : ''}<button class="btn alt" data-r="re">Restart this case</button><button class="btn alt" data-r="q">Quit to title</button></div>`);
  if (r === 're') newGame(seed, daily); else if (r === 'q') showTitle(); else if (r === 'snd') { S.start(); S.setOn(!S.isOn()); updateHud(); } else if (r === 'hap') setHap(!Hap.on);
};

/* ---------- nav & rendering ---------- */
function setView(v) {
  view = v; ['scene', 'suspects', 'board'].forEach(n => $('#v-' + n).hidden = n !== v);
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'board') boardNew = 0; updateHud(); renderAll();
}
$$('#nav button').forEach(b => b.onclick = () => { S.sfx.tap(); setView(b.dataset.v); });
function renderAll() { if (!G) return; if (view === 'scene') renderScene(); else if (view === 'suspects') renderSuspects(); else renderBoard(); updateHud(); }
function chipFor(i) {
  if (G.conf && G.conf.idx === i && !G.stmts[G.conf.id].broken) return ['warn', '⚠ Confessed'];
  const s = G.status[i]; return s === 'holds' ? ['ok', '✓ Alibi checks out'] : s === 'collapsed' ? ['bad', '✗ Alibi broken'] : s === 'pending' ? ['pend', '… Needs a witness'] : ['', 'Story unchecked'];
}
function tipText() {
  const searched = Object.keys(G.searched).length, met = Object.keys(G.met).length;
  if (G.leadExit && !G.searched.exit) return 'Somebody slipped out the ' + G.st.exit.name + '. Go look. It might be the whole case.';
  if (!searched && !met) return 'Four suspects, four alibis. Someone is lying. Search a room, or hear their stories first.';
  if (searched && !G.cracks) return 'Found something that contradicts a story? Open Suspects, pick them, and show it. Wrong guesses cost 2 moves.';
  if (G.cracks && !G.leadExit) return 'Cracked liars talk, and their testimony becomes evidence. Pin it. Press the others with it.';
  return '';
}
function renderScene() {
  const st = G.st, locs = E.locations(G), first = !Object.keys(G.searched).length;
  const tip = tipText();
  $('#v-scene').innerHTML = `<div class="sbanner">${A.skyline(st.id + 's', st.accent, st.sky, st.id, 400, 118)}<div class="nm">${esc(st.name)}<small>${esc(st.victim.full)} · ${esc(st.victim.title)}</small></div></div>
  ${tip ? `<div class="tip">${esc(tip)}</div>` : ''}<h3 class="sec">Where to?</h3><div class="locs">${locs.map((l, i) => {
    const owner = G.people.find(p => p.place && p.place.id === l.id && G.met[p.idx]);
    const em = l.scene ? 'THE BODY · FREE' : l.searched ? 'SEARCHED ✓' : l.lead ? 'NEW LEAD · 1 MOVE' : (owner ? esc(owner.short.toUpperCase()) + '\'S ALIBI · 1 MOVE' : 'SEARCH · 1 MOVE');
    return `<button class="loc ${l.searched && !l.scene ? 'done' : ''} ${l.lead && !l.searched ? 'lead' : ''} ${first && l.scene ? 'start' : ''}" data-id="${l.id}"><span class="ic">${l.icon}</span><span><b>${esc(l.name)}</b><em>${em}</em></span></button>`; }).join('')}</div>
  ${seanceBtn('seBtn')}${safeBtn('sfBtn')}<button class="hintbtn" id="hintBtn">🕯️ Phone the Lieutenant for a hint · 1 move · −75 pts</button>`;
  $$('#v-scene .loc').forEach(b => b.onclick = () => doSearch(b.dataset.id));
  $('#hintBtn').onclick = doHint; $('#seBtn').onclick = doSeance; $('#sfBtn').onclick = doSafe;
}
function renderSuspects() {
  $('#v-suspects').innerHTML = `<div class="cards">${G.people.map(p => { const [c, tx] = chipFor(p.idx); return `<button class="sc" data-i="${p.idx}"><div class="pt">${A.portrait(p.art, { accent: G.st.accent, mood: G.nerve[p.idx] >= 2 ? 'nervous' : 'neutral', nerve: G.nerve[p.idx], label: p.name })}${G.met[p.idx] ? '' : '<span class="new">NEW</span>'}</div><div class="inf"><b>${esc(p.name)}</b><span class="role">${esc(p.rolelabel)}</span><span class="chip ${c}">${tx}</span></div></button>`; }).join('')}</div>`;
  $$('#v-suspects .sc').forEach(b => b.onclick = () => { S.sfx.tap(); openInterview(+b.dataset.i); });
}
function renderBoard() {
  const clues = E.clueList(G);
  let h = safeNote() + (G.seanceWord ? `<div class="ghostnote"><span>👻</span><div><b>THE SPIRIT SPELLED</b><em>${esc(G.seanceWord)}</em><small>Somebody in this room smells of it.</small></div></div>` : '') + `<div class="cork"><div class="pinhint">${armed ? 'Now tap the statement it contradicts ↓' : 'Tap a clue, then tap the lie it breaks.'}</div><div class="pins">${clues.map((c, i) => `<button class="pin ${c.kind === 'testimony' ? 't' : ''} ${armed === c.id ? 'armed' : ''}" data-c="${c.id}" style="--r:${(i % 3 - 1) * 1.6}deg"><span class="ic">${c.icon}</span><b>${esc(c.title)}</b></button>`).join('')}</div>${armed ? `<div class="pinhint" style="color:#f0e2c0;font-size:13px;margin-top:6px">${esc(G.clues[armed].text)}</div>` : ''}</div>`;
  G.people.forEach(p => {
    const [c, tx] = chipFor(p.idx), sts = E.statementsFor(G, p.idx);
    h += `<div class="folder"><button class="fh" data-i="${p.idx}"><span class="av">${A.portrait(p.art, { accent: G.st.accent, mood: 'neutral', label: p.name })}</span><span style="flex:1"><b>${esc(p.name)}</b><span class="role">${esc(p.rolelabel)}</span></span><span class="chip ${c}">${tx}</span></button><div class="notes">`;
    if (!G.met[p.idx]) h += `<div class="dos">Not interviewed yet. Tap to meet.</div>`;
    sts.forEach(s => { h += `<button class="note ${s.kind === 'confession' ? 'conf' : s.kind} ${s.broken ? 'broken' : ''} ${armed && !s.broken ? 'armed-t' : ''}" data-s="${s.id}"><span class="k">${({ confession: 'Confession', call: 'Phone alibi', alone: 'Admission' })[s.kind] || 'Alibi claim'}</span><span class="tx">“${esc(s.text)}”</span>${s.broken ? `<span class="lie">LIE</span><span class="by">🧵 Broken by: ${esc(G.clues[s.brokenBy].title)}</span>` : ''}</button>`; });
    if (G.polyStrip && G.polyStrip[p.idx]) h += `<div class="pstrip"><span>📈 LIE BOX · ${esc(POLY_TAG[G.poly[p.idx].murder][0])}</span><img src="${G.polyStrip[p.idx]}" alt="Polygraph strip"></div>`;
    if (G.notes[p.idx].length) h += `<div class="dos"><ul>${G.notes[p.idx].map(n => `<li>${esc(n.text)}</li>`).join('')}</ul></div>`;
    h += `</div></div>`;
  });
  h += seanceBtn('seBtn2') + safeBtn('sfBtn2') + `<button class="hintbtn" id="hintBtn2">🕯️ Phone the Lieutenant for a hint · 1 move · −75 pts</button>`;
  $('#v-board').innerHTML = h;
  $$('#v-board .pin').forEach(b => b.onclick = () => { if (armed !== b.dataset.c) { S.sfx.link(); hap('link'); } else S.sfx.tap(); armed = armed === b.dataset.c ? null : b.dataset.c; renderBoard(); });
  $$('#v-board .fh').forEach(b => b.onclick = () => openInterview(+b.dataset.i));
  $$('#v-board .note').forEach(b => b.onclick = () => {
    const s = G.stmts[b.dataset.s];
    if (!armed) return toast('Tap a clue above first.');
    if (s.broken) return toast('That lie is already broken.');
    const c = armed; armed = null; S.sfx.link(); hap('link'); openInterview(s.who, c);
  });
  $('#hintBtn2').onclick = doHint; $('#seBtn2').onclick = doSeance; $('#sfBtn2').onclick = doSafe;
}

/* ---------- clues, search, hints ---------- */
async function showClue(c, tag) {
  S.sfx.page(); S.sfx.chime();
  const dust = !FAST && c.kind !== 'testimony' && !lifted[c.id] && !RM;
  const pr = modal(`<div class="paper"><div class="tag">${esc(tag || (c.kind === 'testimony' ? 'New testimony' : 'Evidence'))}</div><h3>${c.icon} ${esc(c.title)}</h3>${dust ? `<div class="dustw" id="dustW"><p id="clueTx"></p><canvas class="dustc" id="dustC" aria-hidden="true"></canvas><canvas class="motec" id="moteC" aria-hidden="true"></canvas><div class="dusthint" id="dustHint"><b>🖌️</b>Brush the powder to lift the print</div><button class="blow" id="dustBlow" aria-label="Blow the powder away">💨</button></div>` : '<p id="clueTx"></p>'}<button class="btn" data-r="ok">${c.kind === 'testimony' ? 'Pin to the board' : 'Pin it to the board'}</button></div>`);
  if (dust) { $('#clueTx').textContent = c.text; dustFor(c); } else typeText($('#clueTx'), c.text, 11);
  await pr; if (dustStop) dustStop();
}
/* ---------- fingerprint dusting: every new piece of evidence arrives under graphite powder; brush it off with a finger ---------- */
const RM = matchMedia('(prefers-reduced-motion:reduce)').matches; let lifted = {}, dustStop = null;
function dustFor(c) {
  const w = $('#dustW'), cv = $('#dustC'), mc = $('#moteC'), x = cv.getContext('2d'), mx = mc.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.max(1, w.offsetWidth), H = Math.max(1, w.offsetHeight);
  [cv, mc].forEach(k => { k.width = W * dpr; k.height = H * dpr; }); x.scale(dpr, dpr); mx.scale(dpr, dpr);
  let h = 0; for (const ch of c.id + seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const rnd = E.mulberry ? E.mulberry(h) : Math.random;
  // powder: graphite base, grain, smudges
  const g0 = x.createLinearGradient(0, 0, W, H); g0.addColorStop(0, '#3b3a40'); g0.addColorStop(1, '#25242a'); x.fillStyle = g0; x.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 22; i++) { const v = 40 + rnd() * 90 | 0; x.fillStyle = `rgba(${v},${v},${v + 8},${0.25 + rnd() * 0.4})`; x.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
  for (let i = 0; i < 6; i++) { const sx = rnd() * W, sy = rnd() * H, rg = x.createRadialGradient(sx, sy, 0, sx, sy, 30 + rnd() * 50); rg.addColorStop(0, 'rgba(15,14,18,.45)'); rg.addColorStop(1, 'rgba(15,14,18,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H); }
  // the latent print: a whorl of broken silver ridges, different for every clue
  const fx = W * (0.58 + rnd() * 0.22), fy = H * 0.5, sc = Math.min(1.1, H / 120), tilt = (rnd() - 0.5) * 0.7, wob = 2 + rnd() * 3, ph = rnd() * 6;
  x.save(); x.translate(fx, fy); x.rotate(tilt); x.strokeStyle = 'rgba(214,214,226,.5)'; x.lineWidth = 1.6; x.lineCap = 'round';
  for (let k = 0; k < 15; k++) { const rr = (5 + k * 4.2) * sc; x.beginPath(); let pen = false;
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.06) { if (rnd() < 0.012) { pen = false; continue; } const q = rr + Math.sin(a * 3 + ph + k * 0.4) * wob * 0.35 * sc, px = Math.cos(a) * q * 0.8, py = Math.sin(a) * q * 1.12 - (a > 3.6 && a < 5.8 ? k * 0.6 * sc : 0); if (pen) x.lineTo(px, py); else { x.moveTo(px, py); pen = true; } }
    x.stroke(); }
  x.restore();
  x.font = '700 9px ' + getComputedStyle(document.body).getPropertyValue('--sans'); x.fillStyle = 'rgba(214,214,226,.35)'; x.fillText('LATENT · ' + c.id.replace(/^c_/, '').toUpperCase() + '-' + (h % 9000 + 1000), 8, H - 8);
  // brushing
  let last = null, moved = 0, done = false, motes = [], raf = 0, hintGone = false;
  const coverage = () => { const d = x.getImageData(0, 0, cv.width, cv.height).data; let s = 0, n = 0; for (let i = 3; i < d.length; i += 4 * 37) { n++; if (d[i] < 60) s++; } return s / n; };
  const dab = (px, py, sp) => { const rad = 22 + Math.min(14, sp * 0.6), rg = x.createRadialGradient(px, py, 0, px, py, rad); rg.addColorStop(0, 'rgba(0,0,0,.85)'); rg.addColorStop(0.6, 'rgba(0,0,0,.4)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = rg; x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 3; i++) motes.push({ x: px, y: py, vx: (rnd() - 0.5) * 3 + sp * 0.08, vy: -rnd() * 2.5, l: 1, s: 1 + rnd() * 2 }); if (!raf) raf = requestAnimationFrame(tick); };
  const tick = () => { mx.clearRect(0, 0, W, H); motes = motes.filter(m => (m.l -= 0.03) > 0); motes.forEach(m => { m.x += m.vx; m.y += m.vy; m.vy += 0.12; mx.fillStyle = `rgba(70,68,78,${m.l})`; mx.fillRect(m.x, m.y, m.s, m.s); }); raf = motes.length ? requestAnimationFrame(tick) : 0; };
  const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
  const lift = (blown) => { if (done) return; done = true; lifted[c.id] = 1; const n = Object.keys(lifted).length; store.set('prints', store.get('prints', 0) + 1);
    S.sfx.puff(); hap('lift'); w.classList.add('lifted'); if (blown) w.classList.add('blown');
    const st = document.createElement('div'); st.className = 'printstamp'; st.innerHTML = `<span>PRINT LIFTED</span><small>#${n} tonight · ${store.get('prints', 1)} career</small>`; w.appendChild(st); };
  const move = e => { if (done || !last) return; e.preventDefault(); const [px, py] = pos(e), dx = px - last[0], dy = py - last[1], d = Math.hypot(dx, dy); if (d < 1.5) return;
    for (let k = 0; k <= d; k += 7) dab(last[0] + dx * k / d, last[1] + dy * k / d, d); last = [px, py]; moved += d;
    S.sfx.brush(d); hap('dust'); if (!hintGone) { hintGone = true; $('#dustHint').classList.add('gone'); }
    if (moved > 120) { moved = 0; if (coverage() > 0.55) lift(false); } };
  cv.addEventListener('pointerdown', e => { if (done) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} last = pos(e); dab(last[0], last[1], 0); S.sfx.brush(1); });
  cv.addEventListener('pointermove', move); ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => cv.addEventListener(k, () => { last = null; }));
  $('#dustBlow').onclick = () => lift(true);
  dustStop = () => { cancelAnimationFrame(raf); dustStop = null; if (!done) lifted[c.id] = 1; };
}
async function doSearch(id) {
  if (busy || G.over) return;
  if (id === 'scene') return showClue(G.clues.c_scene, 'The body');
  const loc = E.locations(G).find(l => l.id === id); if (loc.searched) { const found = Object.values(G.clues).filter(c => G.found[c.id] && c.loc === id); if (found.length) await showClue(found[0], 'Already searched'); return; }
  busy = true; S.sfx.tap();
  const r = E.search(G, id); if (!r.ok) { busy = false; return; }
  updateHud(true); boardNew += r.clues.length;
  for (const c of r.clues) await showClue(c, 'Found in the ' + r.loc.name);
  await afterAction(r.events); busy = false;
}
async function doHint() {
  if (busy || G.over) return; busy = true;
  const r = E.hint(G); if (!r.ok) { busy = false; return; }
  updateHud(true); S.sfx.page();
  await modal(`<div class="paper"><div class="tag">Lieutenant Mae, on the line</div><h3>☎️ “Listen, kid…”</h3><p id="hintTx"></p><button class="btn" data-r="ok">Got it</button></div>`, () => typeText($('#hintTx'), r.text, 14));
  await afterAction(r.events); busy = false;
}
async function afterAction(events) {
  updateHud(); renderAll();
  for (const e of events || []) await showEvent(e);
  updateHud(); renderAll(); if (cur !== null) renderIAct();
}
async function showEvent(e) {
  if (e.type === 'body') {
    S.sfx.sting(); S.sfx.thunder(true); hap('heavy'); document.body.classList.add('redflash'); setTimeout(() => document.body.classList.remove('redflash'), 700);
    boardNew++;
    await modal(`<div class="dark red"><h3>A SECOND BODY</h3><p id="evTx"></p><ul class="ul"><li>The Commissioner's men trample the scene: <b>−1 move</b>.</li><li>New lead: the <b>${esc(G.st.exit.name)}</b>.</li></ul><button class="btn" data-r="ok">Go see it</button></div>`, () => typeText($('#evTx'), e.text, 16));
  } else if (e.type === 'confession') {
    const p = G.people[e.idx]; S.sfx.sting(); hap('heavy'); boardNew++;
    addLog(e.idx, 's', e.text, 'nervous');
    await modal(`<div class="dark red"><h3>CONFESSION</h3><div class="pt">${A.portrait(p.art, { accent: G.st.accent, mood: 'nervous', nerve: 3, label: p.name })}</div><b style="font:700 18px var(--serif)">${esc(p.name)}</b><p id="evTx" style="margin-top:10px"></p><ul class="ul"><li>Too easy. Too fast. Check it against the scene.</li></ul><button class="btn" data-r="ok">I'm not buying it</button></div>`, () => typeText($('#evTx'), '“' + e.text + '”', 16));
  } else if (e.type === 'dawn') {
    S.sfx.sting(); S.sfx.thunder(true);
    await modal(`<div class="dark red"><h3>DAWN</h3><p id="evTx"></p><button class="btn" data-r="ok">Name the killer</button></div>`, () => typeText($('#evTx'), 'Headlights in the rain. The Commissioner\'s car. Time\'s up. Whoever you point at is going down for this.', 16));
    await openAccuse(true);
  }
}

/* ---------- interview ---------- */
function addLog(i, k, text, mood) { (logs[i] = logs[i] || []).push({ k, text, mood }); }
function renderILog() {
  const el = $('#iLog'); el.innerHTML = '';
  (logs[cur] || []).forEach(m => el.appendChild(msgEl(m)));
  scrollLog();
}
function msgEl(m, empty) { const d = document.createElement('div'); d.className = 'msg ' + m.k + (m.mood === 'caught' ? ' caught' : ''); if (!empty) d.textContent = m.text; return d; }
function setPort(i, mood) { const p = G.people[i]; $('#iPort').innerHTML = A.portrait(p.art, { accent: G.st.accent, mood: mood || 'neutral', nerve: G.nerve[i], label: p.name }); }
function renderIHead() {
  const p = G.people[cur], n = G.nerve[cur], [c, tx] = chipFor(cur);
  $('#iName').textContent = p.name; $('#iRole').textContent = p.rolelabel + ' · ' + p.look; setPort(cur, n >= 2 ? 'nervous' : 'neutral');
  $('#iNerve').innerHTML = 'Composure ' + [0, 1, 2].map(k => `<i class="${k < 3 - n ? 'on' : ''} ${3 - n <= 1 ? 'hot' : ''}"></i>`).join('');
  $('#iStat').className = 'chip ' + c; $('#iStat').textContent = tx;
}
function renderIAct() {
  if (cur === null) return;
  const tps = E.topics(G, cur), a = $('#iAct'), dawn = G.dawn || G.over;
  a.innerHTML = tps.map((t, i) => `<button class="ab ${t.done ? 'done' : ''} ${tps.length === 3 && i === 2 ? 'wide' : ''}" data-t="${t.id}">${esc(t.label)}<small>1 move</small></button>`).join('')
    + polyBtn() + `<button class="ab ev" id="aEv">🗂️ Show evidence<small>right: 1 · wrong: 2</small></button><button class="ab acc" id="aAcc">☠️ Accuse<small>final</small></button>`;
  a.querySelectorAll('[data-t]').forEach(b => b.onclick = () => doAsk(b.dataset.t));
  $('#aEv').onclick = () => pickEvidence(); $('#aAcc').onclick = () => openAccuse(false); if ($('#aPoly')) $('#aPoly').onclick = doPoly;
  a.classList.toggle('busy', busy || dawn);
}
async function openInterview(i, pressWith) {
  if (busy) return; cur = i; S.sfx.tap();
  $('#interview').hidden = false; renderIHead(); renderILog(); renderIAct();
  $('#iBack').onclick = closeInterview;
  if (!G.met[i]) {
    busy = true; renderIAct();
    const r = E.meet(G, i); renderIHead();
    await playLines(i, r.lines); busy = false; renderIAct(); renderAll();
  }
  if (pressWith) await doPresent(pressWith);
}
function closeInterview() { if (busy) return; cur = null; $('#interview').hidden = true; renderAll(); }
async function playLines(i, lines) {
  for (const l of lines) {
    if (cur !== i) { addLog(i, l.k, l.text, l.mood); continue; }
    const m = { k: l.k, text: l.text, mood: l.mood }; addLog(i, l.k, l.text, l.mood);
    const el = msgEl(m, true); $('#iLog').appendChild(el); scrollLog();
    if (l.k === 's') { setPort(i, l.mood); await typeText(el, l.text, 14); }
    else { el.textContent = l.text; if (l.k === 'b') await sleep(FAST ? 0 : 350); if (l.k === 'n') { S.sfx.chime(); boardNew += 0; } }
  }
}
function youSay(text) { addLog(cur, 'you', text); const el = msgEl({ k: 'you', text }); $('#iLog').appendChild(el); scrollLog(); }
async function doAsk(topic) {
  if (busy || G.over || cur === null) return;
  const t = E.topics(G, cur).find(x => x.id === topic); if (!t || t.done) return;
  busy = true; renderIAct(); const i = cur;
  youSay(({ victim: '“Tell me about ' + G.V.short + '.”', gossip: '“Who else had a reason?”', saw: '“What did you notice tonight?”' })[topic]);
  const r = E.ask(G, i, topic); if (!r.ok) { busy = false; renderIAct(); return; }
  updateHud(true); await sleep(FAST ? 0 : 350);
  await playLines(i, r.lines); renderIHead(); renderAll();
  if (r.lines.some(l => l.k === 'n')) { toast('New lead: ' + G.st.exit.name, 'good'); S.sfx.chime(); }
  await afterAction(r.events); busy = false; renderIAct(); if (cur !== null) setPort(cur, r.mood === 'caught' ? 'neutral' : r.mood);
}
async function pickEvidence() {
  if (busy || G.over) return;
  const clues = E.clueList(G);
  const sh = $('#sheet'); sh.hidden = false;
  sh.innerHTML = `<div class="sbox"><h3>Show evidence to ${esc(G.people[cur].short)}</h3><p class="d">Pick the thing that contradicts their story. A wrong pick costs 2 moves.</p><div class="picks">${clues.map(c => `<button class="pk ${c.kind === 'testimony' ? 't' : ''}" data-c="${c.id}"><span class="ic">${c.icon}</span><span><b>${esc(c.title)}</b><small>${esc(c.text.length > 110 ? c.text.slice(0, 108) + '…' : c.text)}</small></span></button>`).join('')}</div><button class="cta alt" id="shCancel">Never mind</button></div>`;
  $('#shCancel').onclick = () => { sh.hidden = true; };
  sh.querySelectorAll('.pk').forEach(b => b.onclick = () => { sh.hidden = true; doPresent(b.dataset.c); });
}
async function doPresent(clueId) {
  if (busy || G.over || cur === null) return; busy = true; renderIAct(); const i = cur, c = G.clues[clueId];
  youSay('*lays down: ' + c.title + '*');
  await sleep(FAST ? 0 : 450);
  const r = E.present(G, i, clueId); if (!r.ok) { busy = false; renderIAct(); return; }
  updateHud(true);
  const pane = $('#interview');
  if (r.type === 'crack') {
    S.sfx.contra(); hap('crack'); document.body.classList.add('redflash'); pane.classList.add('shake'); const sf = $('#stampfx'); sf.hidden = false; sf.classList.remove('go'); void sf.offsetWidth; sf.classList.add('go');
    setPort(i, 'caught'); await sleep(FAST ? 0 : 900); sf.hidden = true; pane.classList.remove('shake'); document.body.classList.remove('redflash');
    boardNew += (r.newClues || []).length;
  } else if (r.type === 'planted') { S.sfx.link(); hap('planted'); toast('A plant? Remember that smell.', 'good'); boardNew++;
  } else if (r.type === 'miss') { S.sfx.wrong(); hap('miss'); pane.classList.add('shake'); setTimeout(() => pane.classList.remove('shake'), 450); toast('Wrong move. −2 moves', 'bad'); }
  await playLines(i, r.lines);
  renderIHead(); renderAll();
  if (r.type === 'crack') {
    if (r.brokeConfession) toast('You saw through the confession.', 'good');
    for (const nc of (r.newClues || [])) { await sleep(FAST ? 0 : 300); await showClue(nc, 'New testimony'); }
    if (r.lines.some(l => l.k === 'n')) { toast('New lead: ' + G.st.exit.name, 'good'); }
    renderIHead();
  }
  await afterAction(r.events); busy = false; renderIAct();
}

/* ---------- accusation ---------- */
function openAccuse(forced) {
  return new Promise(resolve => {
    if (G.over) return resolve();
    let sel = null, proof = null; const sh = $('#sheet'); sh.hidden = false;
    const clues = E.clueList(G);
    const draw = () => {
      sh.innerHTML = `<div class="sbox"><h3>${forced ? 'Dawn. Name the killer.' : 'Make your accusation'}</h3><p class="d">Pick the killer, then your best proof. There is no second try.</p>
      <div class="sus4">${G.people.map(p => `<button class="pk ${sel === p.idx ? 'sel' : ''}" data-i="${p.idx}"><div class="pt">${A.portrait(p.art, { accent: G.st.accent, mood: 'neutral', label: p.name })}</div><div class="i"><b>${esc(p.short)}</b><small>${esc(chipFor(p.idx)[1])}</small></div></button>`).join('')}</div>
      <div class="picks"><button class="pk ${proof === null ? 'sel' : ''}" data-p=""><span class="ic">🎲</span><span><b>No proof, just a hunch</b><small>Risky. Worth fewer points.</small></span></button>${clues.map(c => `<button class="pk ${c.kind === 'testimony' ? 't' : ''} ${proof === c.id ? 'sel' : ''}" data-p="${c.id}"><span class="ic">${c.icon}</span><span><b>${esc(c.title)}</b><small>${esc(c.text.length > 90 ? c.text.slice(0, 88) + '…' : c.text)}</small></span></button>`).join('')}</div>
      <button class="cta" id="goAcc" ${sel === null ? 'disabled style="opacity:.4"' : ''}>${sel === null ? 'Pick a suspect' : 'Accuse ' + esc(G.people[sel].short)}</button>${forced ? '' : '<button class="cta alt" id="shCancel">Not yet</button>'}</div>`;
      sh.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { S.sfx.tap(); sel = +b.dataset.i; draw(); });
      sh.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { S.sfx.tap(); proof = b.dataset.p || null; draw(); });
      const c = $('#shCancel'); if (c) c.onclick = () => { sh.hidden = true; resolve(); };
      $('#goAcc').onclick = () => { if (sel === null) return; S.sfx.accuse(); hap('accuse'); sh.hidden = true; finish(sel, proof); resolve(); };
    };
    draw();
  });
}
async function finish(idx, proof) {
  busy = true; const res = E.accuse(G, idx, proof); over = true;
  $('#interview').hidden = true; cur = null;
  if (res.win && (!FAST || /[?&]autochase\b/.test(location.search))) { // the killer makes a run for it
    if (S.setScene) S.setScene('chase'); res.chase = await runChase(G.people[res.killer]); if (S.setScene) S.setScene(G.st.id);
    if (res.chase.caught) res.score += CHASE_BONUS;
  }
  const st = store.get('stats', { played: 0, solved: 0, best: 0, streak: 0 });
  st.played++; if (res.win) { st.solved++; st.streak++; st.best = Math.max(st.best, res.score); } else st.streak = 0; store.set('stats', st);
  if (daily) store.set('daily', { date: today(), win: res.win, rank: res.rank.name, score: res.score });
  showResult(res); busy = false;
}


/* ---------- séance: the victim's ghost drags a planchette across a spirit board and spells one true word ---------- */
const isHalloween = () => { const d = new Date(); return (d.getMonth() === 9 && d.getDate() >= 30) || (d.getMonth() === 10 && d.getDate() === 1) || /[?&]halloween\b/.test(location.search); };
function seanceBtn(id) {
  return G.seanceWord ? `<button class="sebtn used" id="${id}"><span>👻</span><span><b>The spirit spelled: ${esc(G.seanceWord)}</b><small>Who smells of it? Check their notes.</small></span></button>`
    : `<button class="sebtn" id="${id}"><span>🔮</span><span><b>Hold a séance</b><small>Ask ${esc(G.V.short)} who did it · ${E.SEANCE_COST} moves · −100 pts · once</small></span></button>`;
}
const BOARD = (() => { const P = {}, arc = (str, y0, depth, x0, x1) => { const n = str.length; for (let i = 0; i < n; i++) { const k = i / (n - 1); P[str[i]] = [x0 + (x1 - x0) * k, y0 + depth * (1 - Math.sin(Math.PI * k))]; } };
  arc('ABCDEFGHIJKLM', 30, 9, 7, 93); arc('NOPQRSTUVWXYZ', 52, 9, 9, 91); arc('1234567890', 76, 0, 18, 82);
  P.YES = [13, 10]; P.NO = [87, 10]; P.GOODBYE = [50, 91]; P[' '] = [50, 64]; return P; })();
async function doSeance() {
  if (busy || G.over) return;
  if (G.seanceWord) { S.sfx.tap(); return toast('👻 ' + G.V.short + ' already said: ' + G.seanceWord); }
  const ok = await modal(`<div class="dark seancepre"><div class="crystal">🔮</div><h3>A SÉANCE?</h3><p>Madame Ostrova keeps a spirit board in her handbag and a candle in her coat. ${esc(G.V.short)} can't name a name. The dead never can. But they remember what was on the air.</p><ul class="ul"><li>Costs <b>${E.SEANCE_COST} moves</b> and <b>100 points</b>. Once per case.</li><li>Rest a finger on the board. <b>Don't push.</b> Let ${esc(G.V.short)} move it.</li></ul><button class="btn" data-r="go">Light the candles</button><button class="btn alt" data-r="no">Leave the dead alone</button></div>`);
  if (ok !== 'go') return;
  busy = true; const r = E.seance(G); if (!r.ok) { busy = false; return; }
  G.seanceWord = r.word; updateHud(true);
  await runSeance(r);
  renderAll();
  await afterAction(r.events); busy = false;
}
function runSeance(r) {
  return new Promise(done => {
    const v = G.V, ov = document.createElement('div'); ov.className = 'seance'; ov.id = 'seance';
    const letters = Object.keys(BOARD).filter(k => k.length === 1 && k !== ' ');
    ov.innerHTML = `<div class="sfog"></div><div class="ghost" aria-hidden="true"><svg viewBox="0 0 120 150"><defs><radialGradient id="gG" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="#f4ecff" stop-opacity=".95"/><stop offset=".6" stop-color="#b9a4ff" stop-opacity=".55"/><stop offset="1" stop-color="#7a5cff" stop-opacity="0"/></radialGradient></defs><path d="M60 6C30 6 14 30 14 60v70l12-10 12 12 11-12 11 12 11-12 12 12 12-10V60C106 30 90 6 60 6z" fill="url(#gG)"/><ellipse cx="45" cy="56" rx="7" ry="10" fill="#140b24"/><ellipse cx="75" cy="56" rx="7" ry="10" fill="#140b24"/><ellipse cx="60" cy="84" rx="8" ry="11" fill="#140b24" opacity=".85"/></svg></div>
      <div class="shead"><small>THE SÉANCE · ${esc(G.st.name)}</small><b>${esc(v.full)}</b><em>is listening</em></div>
      <div class="spelled" id="spelled" aria-live="polite"></div>
      <div class="oboard" id="oboard"><div class="sun">☀</div><div class="moon">☾</div>${letters.map(k => `<span class="ol" data-k="${k}" style="left:${BOARD[k][0]}%;top:${BOARD[k][1]}%">${k}</span>`).join('')}
        <span class="ol w" data-k="YES" style="left:${BOARD.YES[0]}%;top:${BOARD.YES[1]}%">YES</span><span class="ol w" data-k="NO" style="left:${BOARD.NO[0]}%;top:${BOARD.NO[1]}%">NO</span><span class="ol w bye" data-k="GOODBYE" style="left:50%;top:${BOARD.GOODBYE[1]}%">GOODBYE</span>
        <div class="planch" id="planch"><i></i></div></div>
      <div class="shint" id="shint">☝️ Rest a finger on the board. Don't push.</div>
      <div class="candles">${[0, 1, 2].map(i => `<div class="cdl" style="--d:${i * 0.37}s"><b></b><span></span></div>`).join('')}</div>`;
    document.body.appendChild(ov); S.sfx.seance(true); S.sfx.thunder(false); hap('heavy');
    const bd = $('#oboard'), pl = $('#planch'), sp = $('#spelled'), hint = $('#shint');
    const word = r.word, seq = word.split('').concat(['GOODBYE']); let qi = 0, pos = [50, 66], vel = [0, 0], touch = false, dwell = 0, t0 = performance.now(), lastT = t0, raf = 0, shown = '', finished = false, idle = 0;
    const auto = FAST || /[?&]autoseance\b/.test(location.search);
    const place = () => { pl.style.left = pos[0] + '%'; pl.style.top = pos[1] + '%'; };
    place();
    const down = e => { e.preventDefault(); touch = true; ov.classList.add('touch'); try { bd.setPointerCapture(e.pointerId); } catch (_) {} hint.classList.add('gone'); hap('tap'); };
    const up = () => { touch = false; ov.classList.remove('touch'); };
    bd.addEventListener('pointerdown', down); ['pointerup', 'pointercancel'].forEach(k => bd.addEventListener(k, up));
    const step = now => {
      const dt = Math.min(50, now - lastT) / 1000; lastT = now; const T = (now - t0) / 1000;
      const moving = touch || auto;
      if (!moving) { idle += dt; if (idle > 5) { hint.classList.remove('gone'); hint.textContent = '☝️ ' + v.short + ' can\'t move it alone. Touch the board.'; } }
      else idle = 0;
      if (qi < seq.length) {
        const tg = BOARD[seq[qi]], dx = tg[0] - pos[0], dy = tg[1] - pos[1], d = Math.hypot(dx, dy);
        if (moving) {
          if (d < 1.2) { dwell += dt; vel = [vel[0] * 0.7, vel[1] * 0.7];
            if (dwell > (auto ? 0.05 : seq[qi] === ' ' ? 0.3 : 0.55)) { dwell = 0; const k = seq[qi]; qi++;
              const el = bd.querySelector(`.ol[data-k="${k === ' ' ? '_' : k}"]`); if (el) { el.classList.remove('lit'); void el.offsetWidth; el.classList.add('lit'); }
              if (k === 'GOODBYE') { finish(); } else { shown += k; sp.innerHTML = shown.split('').map((c, i) => `<b style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</b>`).join(''); if (k !== ' ') { S.sfx.ting(qi); hap('lift'); } }
            } }
          else { const sp2 = (auto ? 260 : 46) * Math.min(1, d / 14 + 0.25), wob = auto ? 0 : 1; // the spirit's hand: eased glide with a wobble, sometimes it circles
            const ax = dx / d * sp2 + Math.sin(T * 3.1 + qi) * 18 * wob, ay = dy / d * sp2 + Math.cos(T * 2.3 + qi * 2) * 14 * wob;
            vel = [vel[0] + (ax - vel[0]) * Math.min(1, dt * 4), vel[1] + (ay - vel[1]) * Math.min(1, dt * 4)]; pos = [pos[0] + vel[0] * dt, pos[1] + vel[1] * dt]; }
        } else { vel = [vel[0] * 0.9, vel[1] * 0.9]; pos = [pos[0] + Math.sin(T * 1.7) * 0.02, pos[1] + Math.cos(T * 1.3) * 0.02]; }
        pos = [Math.max(4, Math.min(96, pos[0])), Math.max(6, Math.min(94, pos[1]))]; place();
        S.sfx.theremin(pos[0] / 100, pos[1] / 100, moving ? 1 : 0.15);
        ov.style.setProperty('--glow', (moving ? 0.55 + 0.25 * Math.sin(T * 6) : 0.25).toFixed(2));
      }
      if (!finished) raf = requestAnimationFrame(step);
    };
    const finish = () => {
      finished = true; cancelAnimationFrame(raf); S.sfx.theremin(0.3, 0.5, 0); S.sfx.snuff(); hap('heavy'); ov.classList.add('out');
      setTimeout(() => {
        S.sfx.seance(false);
        const card = document.createElement('div'); card.className = 'scard';
        card.innerHTML = `<small>THE SPIRIT SPELLED</small><div class="sword">${esc(word)}</div><p>${esc(r.text)}</p><p class="sm">Every suspect smells of something. Match it. Then find proof the living will believe.</p><button class="btn" id="seDone">Back to the living</button>`;
        ov.appendChild(card); requestAnimationFrame(() => card.classList.add('on'));
        $('#seDone').onclick = () => { S.sfx.tap(); ov.classList.add('bye'); setTimeout(() => { ov.remove(); done(); }, FAST ? 0 : 450); };
      }, FAST ? 0 : 1500);
    };
    raf = requestAnimationFrame(step);
  });
}

/* ---------- the wall safe: spin the dial by ear, feel for the tumblers, set three wheels. Or blow the door off. ---------- */
const SAFE_DIRS = [1, -1, 1]; // right (clockwise), left, right
function safeBtn(id) {
  if (G.safe) return `<button class="sfbtn used" id="${id}"><span>🔓</span><span><b>Safe ${G.safe.how === 'blow' ? 'blown' : 'cracked'}: frame 17 is on the Board</b><small>${esc(G.people[G.safe.idx].short)} is in the photograph. Not the killer.</small></span></button>`;
  return `<button class="sfbtn" id="${id}"><span>🔐</span><span><b>Crack ${esc(G.V.short)}'s wall safe</b><small>By ear: 1 move · +${E.SAFE_BONUS} pts · or blow it: 2 moves · once</small></span></button>`;
}
function safeNote() {
  if (!G.safe) return '';
  const p = G.people[G.safe.idx], o = G.people.find(x => x.idx !== p.idx && G.notes[x.idx].some(n => n.kind === 'safe'));
  return `<div class="safenote ${G.safe.how === 'blow' ? 'blown' : 'clean'}"><div class="neg">${[p, o].filter(Boolean).map(x => `<span>${A.portrait(x.art, { accent: G.st.accent, mood: 'neutral', label: x.name })}</span>`).join('')}<i>17</i></div><div><b>${G.safe.how === 'blow' ? '🧨 FROM THE BLOWN SAFE' : '🔐 FROM THE SAFE'}</b><p>${esc(G.safe.text)}</p></div></div>`;
}
async function doSafe() {
  if (busy || G.over) return;
  if (G.safe) { S.sfx.tap(); return toast('🔓 Already open. Frame 17 is pinned to the Board.'); }
  const ok = await modal(`<div class="dark safepre"><div class="crystal">🔐</div><h3>THE WALL SAFE</h3><p>Behind a bad oil painting in ${esc(G.V.short)}'s office: a Mosler, 1931, forty numbers on the dial. The house photographer swears the night's contact sheet is in there.</p><ul class="ul"><li><b>Crack it by ear</b> (1 move, +${E.SAFE_BONUS} pts): turn the dial <b>RIGHT ↻</b>, then <b>LEFT ↺</b>, then <b>RIGHT ↻</b>. Go slow. When a tumbler lines up you'll hear (and see) a heavy <b>CLUNK</b>. Stop and hit <b>SET</b>.</li><li>Or <b>blow it</b> with Lefty's dynamite: 2 moves, no bonus.</li><li>Sound on helps. Walk away any time, free.</li></ul><button class="btn" data-r="go">Swing the painting aside</button><button class="btn alt" data-r="no">Leave it</button></div>`);
  if (ok !== 'go') return;
  busy = true; if (S.setScene) S.setScene('safe');
  const how = await runSafe();
  if (S.setScene) S.setScene(G.st.id);
  if (!how) { busy = false; renderAll(); return; }
  const r = E.safe(G, how); if (!r.ok) { busy = false; renderAll(); return; }
  boardNew++; updateHud(true);
  await showSafeCard(r);
  renderAll(); await afterAction(r.events); busy = false;
}
function runSafe() {
  return new Promise(done => {
    const combo = E.safeCombo(G), N = E.SAFE_N, auto = FAST || /[?&]autosafe\b/.test(location.search);
    const ov = document.createElement('div'); ov.className = 'safe'; ov.id = 'safe';
    const ticks = Array.from({ length: N }, (_, i) => `<line x1="100" y1="${i % 5 ? 14 : 10}" x2="100" y2="${i % 5 ? 22 : 26}" transform="rotate(${i * 360 / N} 100 100)"/>`).join('');
    const nums = Array.from({ length: N / 5 }, (_, k) => `<text x="100" y="40" transform="rotate(${k * 5 * 360 / N} 100 100)">${k * 5}</text>`).join('');
    ov.innerHTML = `<div class="sfhead"><small>THE WALL SAFE · ${esc(G.st.name.toUpperCase())}</small><b>Crack it by ear</b><em id="sfMsg">Wheel 1: turn RIGHT ↻ until it clunks.</em></div>
      <div class="sfwheels">${[0, 1, 2].map(i => `<div class="sfw" data-w="${i}"><i>${SAFE_DIRS[i] > 0 ? '↻' : '↺'}</i><b>?</b><small>${SAFE_DIRS[i] > 0 ? 'RIGHT' : 'LEFT'}</small></div>`).join('')}</div>
      <div class="sfscope"><canvas id="sfScope"></canvas><span>🩺 STETHOSCOPE</span></div>
      <div class="sfdoor" id="sfDoor"><div class="sfriv">${Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join('')}</div><div class="sfbrand">MOSLER &amp; SONS · 1931</div>
        <div class="sfidx">▼</div><div class="sfdial" id="sfDial"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="sfG" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#f5f1e6"/><stop offset=".55" stop-color="#b8b2a4"/><stop offset="1" stop-color="#4c4840"/></radialGradient></defs><circle cx="100" cy="100" r="96" fill="url(#sfG)" stroke="#2a2620" stroke-width="3"/><g class="tk">${ticks}</g><g class="nm">${nums}</g><circle cx="100" cy="100" r="44" fill="#26231e" stroke="#8a836f" stroke-width="2"/><circle cx="100" cy="100" r="30" fill="url(#sfG)"/><path d="M100 58v14" stroke="#c8102e" stroke-width="5" stroke-linecap="round"/></svg></div><div class="sfnum" id="sfNum">0</div>
        <div class="sfin" id="sfIn"></div></div>
      <div class="sfact"><button class="btn sfset" id="sfSet">🔒 SET WHEEL 1</button><div class="sfrow"><button class="sfblow" id="sfBlow">🧨 Blow it · 2 moves</button><button class="sfaway" id="sfAway">Walk away</button></div></div>`;
    document.body.appendChild(ov); hap('heavy'); S.sfx.page();
    const dial = $('#sfDial'), numEl = $('#sfNum'), msg = $('#sfMsg'), setB = $('#sfSet'), cv = $('#sfScope'), cx = cv.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1); const sz = () => { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; }; sz();
    let ang = 0, lastN = 0, dir = 0, w = 0, misses = 0, drag = null, closed = false, raf = 0, energy = 0, ring = 0, ph = 0, contact = 0, t0 = performance.now(), last = t0, moved = 0;
    const scope = new Float32Array(160);
    const numAt = a => (((Math.round(-a / (360 / N))) % N) + N) % N;
    const cdist = (a, b) => { const d = Math.abs(a - b) % N; return Math.min(d, N - d); };
    const setDial = () => { dial.style.transform = `rotate(${ang}deg)`; const n = numAt(ang); numEl.textContent = n;
      if (n !== lastN) { // one click per number crossed
        const steps = Math.min(6, cdist(n, lastN)); for (let s = 1; s <= steps; s++) { const m = ((lastN + (dir > 0 ? -s : s)) % N + N) % N; click(m); }
        lastN = n; } };
    const click = m => { moved++;
      if (w < 3 && m === combo[w] && dir === SAFE_DIRS[w]) { S.sfx.tumbler(); energy = 1; ring = 1; contact = 1; hap('tap'); ov.classList.remove('thunk'); void ov.offsetWidth; ov.classList.add('thunk'); }
      else { S.sfx.dial(m % 7); energy = Math.max(energy, 0.18 + (w < 3 && cdist(m, combo[w]) <= 2 && dir === SAFE_DIRS[w] ? 0.12 : 0)); } };
    const angOf = e => { const r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    dial.addEventListener('pointerdown', e => { if (closed || w >= 3) return; e.preventDefault(); drag = angOf(e); try { dial.setPointerCapture(e.pointerId); } catch (_) {} ov.classList.add('grip'); });
    dial.addEventListener('pointermove', e => { if (drag === null) return; const a = angOf(e); let d = a - drag; if (d > 180) d -= 360; if (d < -180) d += 360; drag = a; if (Math.abs(d) < 0.01) return;
      const nd = d > 0 ? 1 : -1; if (nd !== dir) { dir = nd; hintDir(); } ang += d; setDial(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => dial.addEventListener(k, () => { drag = null; ov.classList.remove('grip'); }));
    const hintDir = () => { if (w >= 3) return; const good = dir === SAFE_DIRS[w]; ov.classList.toggle('wrongway', !good); if (!good) msg.textContent = 'Wrong way. Wheel ' + (w + 1) + ' turns ' + (SAFE_DIRS[w] > 0 ? 'RIGHT ↻' : 'LEFT ↺') + '.'; else msg.textContent = 'Wheel ' + (w + 1) + ': keep turning ' + (SAFE_DIRS[w] > 0 ? 'RIGHT ↻' : 'LEFT ↺') + '. Listen for the clunk.'; };
    const wheelEl = i => ov.querySelector(`.sfw[data-w="${i}"]`);
    const doSet = () => { if (closed || w >= 3) return; const n = numAt(ang);
      if (cdist(n, combo[w]) <= 1 && dir === SAFE_DIRS[w]) {
        const el = wheelEl(w); el.classList.add('ok'); el.querySelector('b').textContent = combo[w]; S.sfx.wheelSet(w); hap('crack'); w++; energy = 1; ring = 1.3;
        ov.classList.remove('wrongway'); dir = 0;
        if (w < 3) { msg.textContent = 'Wheel ' + w + ' set at ' + combo[w - 1] + '. Wheel ' + (w + 1) + ': turn ' + (SAFE_DIRS[w] > 0 ? 'RIGHT ↻' : 'LEFT ↺') + '.'; setB.textContent = '🔒 SET WHEEL ' + (w + 1); wheelEl(w).classList.add('on'); }
        else openUp('crack');
      } else { misses++; S.sfx.wheelBad(); hap('miss'); ov.classList.remove('shake'); void ov.offsetWidth; ov.classList.add('shake');
        msg.textContent = (dir !== SAFE_DIRS[w] ? 'The wheel slips. Turn it ' + (SAFE_DIRS[w] > 0 ? 'RIGHT ↻' : 'LEFT ↺') + ' first.' : 'Nothing caught at ' + n + '. Go back, slower. Wait for the heavy CLUNK.') + (misses >= 4 ? ' (Or blow it.)' : '');
        if (misses >= 4) $('#sfBlow').classList.add('pulse'); } };
    setB.onclick = doSet;
    $('#sfAway').onclick = () => { if (closed) return; close(null); };
    $('#sfBlow').onclick = () => { if (closed || w >= 3) return; w = 3; blow(); };
    wheelEl(0).classList.add('on');
    const close = how => { closed = true; cancelAnimationFrame(raf); ov.classList.add('bye'); setTimeout(() => { ov.remove(); done(how); }, FAST ? 0 : 420); };
    const openUp = how => { setB.disabled = true; msg.textContent = how === 'blow' ? 'Well. That\'s one way.' : 'All three wheels. Throw the handle.';
      setTimeout(() => { S.sfx.safeOpen(); hap('lift'); ov.classList.add('open'); if (window.NoirFx && how !== 'blow') NoirFx.flash(); setTimeout(() => close(how), FAST ? 0 : 1700); }, FAST ? 0 : how === 'blow' ? 200 : 650); };
    const blow = () => { setB.disabled = true; $('#sfBlow').disabled = true; ov.classList.add('fuse'); msg.textContent = 'Lefty lights the fuse. Everybody down!'; S.sfx.fuse();
      setTimeout(() => { S.sfx.boom(); S.sfx.thunder(true); hap('boom'); ov.classList.remove('fuse'); ov.classList.add('boom'); if (window.NoirFx) NoirFx.flash(); energy = 1; ring = 2; openUp('blow'); }, FAST ? 0 : 1600); };
    // the stethoscope trace + the auto-cracker for tests and demos
    let ai = { w: 0, phase: 'spin', t: 0, spun: 0 };
    const step = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (auto && !closed && w < 3) { const tgt = combo[w], d = SAFE_DIRS[w];
        if (ai.phase === 'spin') { dir !== d && (dir = d); const before = numAt(ang); ang += d * (FAST ? 40 : 160) * dt; ai.spun += (FAST ? 40 : 160) * dt; setDial(); if (ai.spun > 200 && cdist(numAt(ang), tgt) === 0 && before !== undefined) { ai.phase = 'set'; ai.t = 0; } }
        else if ((ai.t += dt) > (FAST ? 0 : 0.35)) { doSet(); ai = { w, phase: 'spin', t: 0, spun: 0 }; } }
      ph += dt; energy *= Math.pow(0.02, dt); ring *= Math.pow(0.15, dt); contact *= Math.pow(0.1, dt);
      scope.copyWithin(0, 1); scope[scope.length - 1] = (Math.random() * 2 - 1) * (0.04 + energy) + Math.sin(ph * 70) * ring * 0.6;
      const W2 = cv.width, H2 = cv.height; cx.clearRect(0, 0, W2, H2); cx.strokeStyle = contact > 0.2 ? '#ffd36b' : '#7dffb0'; cx.lineWidth = 1.6 * dpr; cx.shadowColor = cx.strokeStyle; cx.shadowBlur = 8 * dpr; cx.beginPath();
      for (let i = 0; i < scope.length; i++) { const x = i / (scope.length - 1) * W2, y = H2 / 2 - scope[i] * H2 * 0.45; i ? cx.lineTo(x, y) : cx.moveTo(x, y); } cx.stroke();
      ov.style.setProperty('--contact', contact.toFixed(2));
      if (!closed) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  });
}
async function showSafeCard(r) {
  const p = G.people[r.idx], o = G.people.find(x => x.idx !== p.idx && G.notes[x.idx].some(n => n.kind === 'safe'));
  S.sfx.page(); hap('lift');
  await modal(`<div class="dark safecard ${r.how === 'blow' ? 'blown' : 'clean'}"><small>${r.how === 'blow' ? '🧨 WHAT SURVIVED THE BLAST' : '🔓 INSIDE THE SAFE'}</small><div class="neg big">${[p, o].filter(Boolean).map(x => `<span>${A.portrait(x.art, { accent: G.st.accent, mood: 'neutral', label: x.name })}</span>`).join('')}<i>17</i></div><p id="sfTx"></p><ul class="ul"><li>Pinned to the Board.${r.how === 'crack' ? ' <b>+' + E.SAFE_BONUS + ' pts</b> for a clean job.' : ''}</li></ul><button class="btn" data-r="ok">Pin it</button></div>`, () => typeText($('#sfTx'), r.text, 12));
}

/* ---------- the lie box: a 1940s polygraph. Hold the lever, the chart paper rolls, three pens draw the suspect's pulse, breath and sweat ---------- */
const POLY_TAG = { true: ['TRUE', 'ok'], lie: ['LIE', 'bad'], jump: ['SPIKE', 'bad'], ice: ['FLAT', 'ice'] };
function polyBtn() {
  if (!G.met[cur]) return '';
  if (G.poly && G.poly[cur]) return `<button class="ab poly wide done" id="aPoly">📈 Lie box: strip pinned to the Board<small>${esc(POLY_TAG[G.poly[cur].murder][0])} on the murder question</small></button>`;
  const n = E.polyLeft(G);
  return `<button class="ab poly wide ${n < 1 ? 'out' : ''}" id="aPoly">📈 Strap ${esc(G.people[cur].short)} to the lie box<small>${n < 1 ? 'out of chart paper tonight' : '1 move · −40 pts · ' + n + ' strip' + (n === 1 ? '' : 's') + ' of paper left'}</small></button>`;
}
async function doPoly() {
  if (busy || G.over || cur === null) return;
  const i = cur, p = G.people[i];
  if (G.poly && G.poly[i]) { S.sfx.tap(); return toast('📈 ' + p.short + '\'s strip is already on the Board.'); }
  if (E.polyLeft(G) < 1) { S.sfx.wrong(); return toast('📈 Out of chart paper. Two strips a night.'); }
  const ok = await modal(`<div class="dark polypre"><div class="crystal">📈</div><h3>THE LIE BOX?</h3><p>Officer Keeler wheels in the polygraph: a walnut case, three ink pens, a roll of chart paper. A cuff on the arm, a tube round the chest, two brass plates under ${esc(p.short)}'s fingertips.</p><ul class="ul"><li>Costs <b>1 move</b> and <b>40 points</b>. Paper for <b>${E.polyLeft(G)} strip${E.polyLeft(G) === 1 ? '' : 's'}</b> tonight, one per suspect.</li><li><b>Hold the lever</b> to roll the paper. Three questions. Watch the needles.</li></ul><button class="btn" data-r="go">Strap ${esc(p.short)} in</button><button class="btn alt" data-r="no">Not yet</button></div>`);
  if (ok !== 'go') return;
  busy = true; renderIAct(); const r = E.polygraph(G, i); if (!r.ok) { busy = false; renderIAct(); return; }
  updateHud(true);
  await runPoly(p, r);
  renderAll(); if (cur !== null) renderIHead();
  await afterAction(r.events); busy = false; renderIAct();
}
function runPoly(p, r) {
  return new Promise(done => {
    const ov = document.createElement('div'); ov.className = 'liebox'; ov.id = 'liebox';
    ov.innerHTML = `<div class="lbhead"><div class="lbport" id="lbPort">${A.portrait(p.art, { accent: G.st.accent, mood: 'neutral', nerve: G.nerve[p.idx], label: p.name })}</div><div class="lbinf"><small>THE LIE BOX · KEELER MODEL 6</small><b>${esc(p.name)}</b><em id="lbQ">Cuff on. Plates under the fingers.</em></div><div class="lbbpm" id="lbBpm"><b>--</b><small>BPM</small></div></div>
      <div class="lbmach"><div class="lbpaper" id="lbPaper"><canvas id="lbC"></canvas><canvas id="lbA"></canvas><div class="lblab"><span class="l1">PULSE</span><span class="l2">BREATH</span><span class="l3">SWEAT</span></div></div><div class="lbbrass"><i></i><i></i><i></i><i></i></div></div>
      <div class="lbqs">${r.qs.map((q, k) => `<div class="lbq" data-k="${k}"><span class="n">Q${k + 1}</span><span class="tx">${esc(q.q)}</span><span class="pill"></span></div>`).join('')}</div>
      <div class="lbhint" id="lbHint">✊ Hold the lever to roll the paper</div>
      <button class="lblever" id="lbLever" data-now aria-label="Hold to roll the chart paper"><span class="knob"></span><b>HOLD TO ROLL</b></button>`;
    document.body.appendChild(ov); S.sfx.poly(true); hap('heavy');
    const paper = $('#lbPaper'), pc = $('#lbC'), ac = $('#lbA'), lever = $('#lbLever'), bpmEl = $('#lbBpm b'), qEl = $('#lbQ'), hint = $('#lbHint');
    const dpr = Math.min(2, devicePixelRatio || 1), bb = paper.getBoundingClientRect(), W = Math.max(280, Math.round(bb.width)), H = Math.max(180, Math.round(bb.height));
    [pc, ac].forEach(c => { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; });
    const px = pc.getContext('2d'), ax = ac.getContext('2d'); px.scale(dpr, dpr); ax.scale(dpr, dpr);
    const tmp = document.createElement('canvas'); tmp.width = pc.width; tmp.height = pc.height; const tx = tmp.getContext('2d');
    const PAPER = '#efe4c8', GRID = 'rgba(196,92,92,.22)', GRID2 = 'rgba(196,92,92,.45)', INK = ['#b3122a', '#1f3f9a', '#1d6b3a'], LANE = [0.2, 0.5, 0.8].map(k => k * H), penX = Math.round(W * 0.74);
    px.fillStyle = PAPER; px.fillRect(0, 0, W, H);
    let off = 0; const SPEED = 46; // px of paper per second of rolling
    // paper is scrolled in whole device pixels (no resampling smear); grid columns are drawn per device pixel
    const gridCol = (X, o) => { px.save(); px.setTransform(1, 0, 0, 1, 0, 0); px.fillStyle = PAPER; px.fillRect(X, 0, 1, H * dpr); const col = Math.round(o / dpr);
      if (o % Math.round(10 * dpr) === 0) { px.fillStyle = (o % Math.round(50 * dpr) === 0) ? GRID2 : GRID; px.fillRect(X, 0, 1, H * dpr); }
      px.fillStyle = GRID; for (let y = 10; y < H; y += 10) px.fillRect(X, Math.round(y * dpr), 1, y % 50 === 0 ? 2 : 1); px.restore(); };
    for (let X = 0; X < W * dpr; X++) gridCol(X, X);
    off = Math.round(W * dpr); let acc = 0;
    const SEG = 3.0, ASK = 0.9, auto = FAST || /[?&]autopoly\b/.test(location.search), rate = FAST ? 8 : auto ? 2.5 : 1;
    let qi = 0, tq = 0, T = 0, beatPh = 0, last = performance.now(), raf = 0, hold = false, prevY = LANE.slice(), finished = false, alarmed = false, idle = 0, typed = -1, jitter = [0, 0, 0], sweat = 0, bpmShow = 0, shake = 0;
    const read = () => r.qs[Math.min(qi, r.qs.length - 1)].r;
    const sig = (kind, e) => { // e: 0..1 response envelope inside the answer window
      const base = r.bpm; if (kind === 'lie') return { bpm: base * (1 + 0.38 * e), pa: 1 + 0.9 * e, ba: 1 + 0.8 * e, br: 1 + 0.9 * e, sw: 0.55 * e, jit: 0.35 * e };
      if (kind === 'jump') return { bpm: base * (1 + 0.55 * e), pa: 1 + 1.3 * e, ba: 1 + 1.4 * e, br: 1 + 1.6 * e, sw: 0.75 * e, jit: 0.9 * e };
      if (kind === 'ice') return { bpm: base * (1 - 0.32 * e), pa: 1 - 0.75 * e, ba: 1 - 0.85 * e, br: 1 - 0.5 * e, sw: -0.12 * e, jit: 0 };
      return { bpm: base * (1 + 0.04 * e), pa: 1 + 0.08 * e, ba: 1, br: 1, sw: 0.04 * e, jit: 0 };
    };
    const pulseWave = ph => Math.exp(-Math.pow((ph - 0.1) / 0.025, 2)) - 0.35 * Math.exp(-Math.pow((ph - 0.17) / 0.03, 2)) + 0.22 * Math.exp(-Math.pow((ph - 0.5) / 0.07, 2));
    const stampAt = (k, x) => { const [txt, cl] = POLY_TAG[r.qs[k].r]; px.save(); px.translate(x - 30, H * 0.5); px.rotate(-0.18 + (k - 1) * 0.08); px.globalAlpha = 0.8; px.strokeStyle = px.fillStyle = cl === 'ok' ? '#1d6b3a' : cl === 'ice' ? '#1f3f9a' : '#b3122a'; px.lineWidth = 3; px.font = '900 26px "Courier New",monospace'; const w = px.measureText(txt).width + 18; px.strokeRect(-w / 2, -20, w, 38); px.textAlign = 'center'; px.textBaseline = 'middle'; px.fillText(txt, 0, 1); px.restore(); };
    const setQ = k => { $$('#liebox .lbq').forEach((el, j) => el.classList.toggle('on', j === k)); qEl.textContent = '“' + r.qs[k].q + '”'; S.sfx.type(); };
    const settle = k => { const q = r.qs[k], [txt, cl] = POLY_TAG[q.r], el = $(`#liebox .lbq[data-k="${k}"]`); el.classList.remove('on'); el.classList.add('done', cl); el.querySelector('.pill').textContent = txt;
      stampAt(k, penX - 8); S.sfx.stamp(); hap(cl === 'ok' ? 'tap' : 'crack');
      if (q.r === 'true') S.sfx.polyTrue();
      if (k === 2) $('#lbPort').innerHTML = A.portrait(p.art, { accent: G.st.accent, mood: q.r === 'ice' ? 'smug' : q.r === 'jump' ? 'nervous' : 'neutral', nerve: G.nerve[p.idx], label: p.name }); };
    const down = e => { e.preventDefault(); hold = true; ov.classList.add('rolling'); try { lever.setPointerCapture(e.pointerId); } catch (_) {} hint.classList.add('gone'); hap('tap'); S.sfx.tap(); };
    const up = () => { hold = false; ov.classList.remove('rolling'); };
    lever.addEventListener('pointerdown', down); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(k => lever.addEventListener(k, up));
    lever.addEventListener('contextmenu', e => e.preventDefault());
    setQ(0); if (auto) hint.classList.add('gone');
    const step = now => {
      const dtR = Math.min(0.05, (now - last) / 1000); last = now;
      const rolling = (hold || auto) && !finished, dt = rolling ? dtR * rate : 0;
      if (!rolling && !finished && !auto) { idle += dtR; if (idle > 4) { hint.classList.remove('gone'); hint.textContent = '✊ Keep holding the lever. ' + p.short + ' is sweating it out.'; } } else idle = 0;
      const kind = read(), e = tq < ASK ? 0 : Math.min(1, (tq - ASK) / 0.7) * (tq > SEG - 0.35 ? Math.max(0.35, (SEG - tq) / 0.35) : 1), s = sig(kind, e);
      if (rolling) {
        T += dt; tq += dt; const ph0 = beatPh; beatPh = (beatPh + dt * s.bpm / 60) % 1;
        if (ph0 < 0.1 && beatPh >= 0.1 || ph0 > beatPh && beatPh >= 0.1) { S.sfx.beat(kind === 'ice' && e > 0.5 ? 0.25 : 0.4 + 0.25 * e); hap('pulse'); paper.parentNode.classList.remove('thump'); void paper.offsetWidth; paper.parentNode.classList.add('thump'); }
        if (!alarmed && e > 0.85 && (kind === 'lie' || kind === 'jump')) { alarmed = true; S.sfx.polyAlarm(); hap('heavy'); shake = kind === 'jump' ? 1 : 0.6; }
        if (!alarmed && e > 0.85 && kind === 'ice') { alarmed = true; S.sfx.polyFlat(); hap('miss'); ov.classList.add('cold'); }
        // scroll the paper left by dx, draw fresh paper on the right
        acc += SPEED * dt * dpr; const sh = Math.floor(acc), dx = sh / dpr; if (sh > 0) { acc -= sh;
          tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tmp.width, tmp.height); tx.drawImage(pc, 0, 0);
          px.save(); px.setTransform(1, 0, 0, 1, 0, 0); px.imageSmoothingEnabled = false; px.drawImage(tmp, -sh, 0); px.restore();
          const PW = pc.width; for (let k = sh; k > 0; k--) gridCol(PW - k, off + sh - k); off += sh;
          // three pens
          jitter = jitter.map(j => j * 0.7 + (Math.random() * 2 - 1) * s.jit * 0.3);
          const amp = H * 0.11;
          const yP = LANE[0] - amp * s.pa * pulseWave(beatPh) + jitter[0] * amp * 0.9;
          const yB = LANE[1] - amp * 0.75 * s.ba * Math.sin(T * Math.PI * 2 / 3.6 * s.br) + jitter[1] * amp;
          sweat += ((s.sw) - sweat) * Math.min(1, dt * 2.2);
          const yS = LANE[2] - amp * 1.4 * sweat + jitter[2] * amp * 0.6 + Math.sin(T * 0.7) * 2;
          [yP, yB, yS].forEach((y, k) => { y = Math.max(6, Math.min(H - 6, y)); px.strokeStyle = INK[k]; px.lineWidth = 1.6; px.lineCap = 'round'; px.beginPath(); px.moveTo(penX - dx, prevY[k]); px.lineTo(penX, y); px.stroke(); prevY[k] = y; });
          S.sfx.polyRoll(true, Math.min(1, Math.abs(yP - LANE[0]) / amp * 0.5 + Math.abs(jitter[1]) + s.jit * 0.4));
        }
        if (tq >= SEG) { settle(qi); qi++; tq = 0; alarmed = false; if (qi >= r.qs.length) finish(); else setQ(qi); }
      } else S.sfx.polyRoll(false, 0);
      // the pen arms (redrawn every frame)
      ax.clearRect(0, 0, W, H); prevY.forEach((y, k) => { ax.strokeStyle = 'rgba(40,30,20,.85)'; ax.lineWidth = 2.2; ax.beginPath(); ax.moveTo(W + 4, LANE[k] - 26 + k * 4); ax.lineTo(penX + 2, y); ax.stroke(); ax.fillStyle = INK[k]; ax.beginPath(); ax.arc(penX, y, 3.2, 0, Math.PI * 2); ax.fill(); });
      ax.fillStyle = 'rgba(0,0,0,.08)'; ax.fillRect(penX + 1, 0, W - penX, H);
      const tb = Math.round(s.bpm); bpmShow += (tb - bpmShow) * 0.2; bpmEl.textContent = rolling || finished ? Math.round(bpmShow) : '--';
      if (shake > 0) { shake = Math.max(0, shake - dtR * 1.6); ov.style.setProperty('--shx', ((Math.random() * 2 - 1) * shake * 7).toFixed(1) + 'px'); ov.style.setProperty('--shy', ((Math.random() * 2 - 1) * shake * 4).toFixed(1) + 'px'); } else ov.style.removeProperty('--shx');
      if (!finished || !done._closed) raf = requestAnimationFrame(step);
    };
    const finish = () => {
      finished = true; hold = false; ov.classList.remove('rolling'); S.sfx.polyRoll(false, 0);
      G.polyStrip = G.polyStrip || {}; try { G.polyStrip[p.idx] = pc.toDataURL('image/jpeg', 0.72); } catch (_) {}
      setTimeout(() => {
        cancelAnimationFrame(raf); done._closed = true; S.sfx.poly(false);
        const [txt, cl] = POLY_TAG[r.murder], card = document.createElement('div'); card.className = 'lbcard ' + cl;
        card.innerHTML = `<small>KEELER'S READING · ${esc(p.short.toUpperCase())}</small><div class="lbverd">${txt}</div><p>${esc(r.verdict)}</p><p class="sm">Story: <b>${r.story ? 'spiked' : 'steady'}</b>. The strip is pinned to ${esc(p.short)}'s folder on the Board. ${r.left ? r.left + ' strip of paper left tonight.' : 'That was the last of the paper.'}</p><button class="btn" id="lbDone">Tear off the strip</button>`;
        ov.appendChild(card); requestAnimationFrame(() => card.classList.add('on')); hap(cl === 'ice' ? 'heavy' : 'link');
        $('#lbDone').onclick = () => { S.sfx.page(); hap('lift'); ov.classList.add('bye'); setTimeout(() => { ov.remove(); done(); }, FAST ? 0 : 450); };
      }, FAST ? 0 : 900);
    };
    raf = requestAnimationFrame(step);
  });
}

/* ---------- the chase: name the right killer and they bolt. Tap to leap the gaps, hold to fly further, collar them before they're gone ---------- */
const CHASE_WHERE = {
  club: ['out the dressing-room window', 'over the rooftops of the river district', 'HOTEL', 'dropped onto a passing tram'],
  manor: ['through the conservatory glass', 'across the slate roofs of Blackwood', 'BLACKWOOD', 'vanished into the hedge maze'],
  train: ['up the ladder between carriages', 'along the carriage roofs at sixty miles an hour', 'MERIDIAN', 'swung down into the mail car'],
  lab: ['out through the radio-shack hatch', 'across the iced-over station modules', 'HALCYON', 'disappeared into the whiteout'],
  studio: ['up the lighting gantry', 'over the soundstage roofs of Studio Nine', 'STUDIO 9', 'climbed into a prop truck'],
};
const CHASE_T = 24, CHASE_BONUS = 150, CHASE_D0 = 60;
function runChase(k) {
  return new Promise(done => {
    const st = G.st, P = st.pal || {}, acc = st.accent, acc2 = P.acc2 || '#39e0ff', gold = P.gold || '#ffcf5c', wh = CHASE_WHERE[st.id] || CHASE_WHERE.club;
    const auto = /[?&]autochase\b/.test(location.search), flat = st.id === 'train';
    const ov = document.createElement('div'); ov.className = 'chase'; ov.id = 'chase'; ov.style.setProperty('--acc', acc); ov.style.setProperty('--acc2', acc2);
    ov.innerHTML = `<canvas id="chC"></canvas><label class="chtap" id="chTap" aria-label="Tap to jump"><input type="checkbox" tabindex="-1" ${Hap.on ? 'switch' : ''}></label>
      <div class="chhead"><div class="chport">${A.portrait(k.art, { accent: acc, mood: 'smug', nerve: 0, label: k.name })}</div><div class="chinf"><small>THE CHASE · ${esc(wh[0].toUpperCase())}</small><b>${esc(k.short)} bolted!</b><em id="chMsg">${esc(wh[1][0].toUpperCase() + wh[1].slice(1))}. Collar ${k.g === 'f' ? 'her' : 'him'}.</em></div><div class="chclock" id="chClock"><b>${CHASE_T}</b><small>SEC</small></div></div>
      <div class="chgap"><span>🕵️</span><div class="chbar"><i id="chBar"></i></div><span>🏃</span><b id="chYds">${CHASE_D0} yds</b></div>
      <div class="chtip" id="chTip">TAP to jump · HOLD to leap further</div><div class="chstamp" id="chStamp" hidden></div><button class="chskip" id="chSkip">Let the uniforms handle it</button>`;
    document.body.appendChild(ov); hap('heavy'); S.sfx.thunder(true); if (window.NoirFx) NoirFx.flash();
    const cv = ov.querySelector('#chC'), x = cv.getContext('2d'), tap = ov.querySelector('#chTap');
    const dpr = Math.min(2, devicePixelRatio || 1); let W = 0, H = 0;
    const size = () => { W = ov.clientWidth; H = ov.clientHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const rnd = Math.random, lerp = (a, b, t) => a + (b - a) * t;
    // the city behind: two parallax layers of lit windows, one neon sign
    const layer = (n, hMin, hMax, wMin, wMax) => { const a = []; let bx = 0; while (bx < 1600) { const w = wMin + rnd() * (wMax - wMin), h = hMin + rnd() * (hMax - hMin), win = []; for (let wy = 10; wy < h - 8; wy += 13) for (let wx = 6; wx < w - 8; wx += 11) if (rnd() < 0.22) win.push([wx, wy, rnd() < 0.15]); a.push({ x: bx, w, h, win, tower: rnd() < 0.18 }); bx += w + 4 + rnd() * 14; } a.len = bx; return a; };
    const far = layer(0, 120, 300, 50, 110), mid = layer(0, 80, 210, 60, 140), signAt = 300 + rnd() * 600;
    const drops = []; for (let i = 0; i < 140; i++) drops.push({ x: rnd() * 1.4, y: rnd(), l: 10 + rnd() * 20, v: 0.9 + rnd() * 0.8 });
    // the roofs we run on (world coords). y = roof top in screen px
    const roofs = [], obs = [];
    const top0 = () => H * (flat ? 0.7 : 0.68);
    roofs.push({ x: -200, w: W * 0.95 + 200, y: top0() });
    const extend = () => { while (roofs[roofs.length - 1].x + roofs[roofs.length - 1].w < cam + W * 2.2) { const p = roofs[roofs.length - 1], hard = Math.min(1, T0 / CHASE_T * 1.2);
      const gap = flat ? 46 + rnd() * 40 + hard * 20 : 64 + rnd() * (50 + hard * 30), w = flat ? 280 + rnd() * 140 : 190 + rnd() * 290;
      const y = flat ? top0() : Math.max(H * 0.52, Math.min(H * 0.8, p.y + (rnd() * 96 - 56)));
      const r = { x: p.x + p.w + gap, w, y }; roofs.push(r);
      const nO = w > 430 && rnd() < 0.45 ? 2 : w > 330 && rnd() < 0.75 ? 1 : 0, span = w - 320;
      for (let j = 0; j < nO; j++) { const ow = 16 + rnd() * 14, oh = 22 + rnd() * 20; obs.push({ x: r.x + 110 + (j + 0.2 + rnd() * 0.6) * span / Math.max(1, nO) - ow / 2, w: ow, h: oh, y: r.y, kind: flat ? 'vent' : rnd() < 0.5 ? 'chimney' : 'vent', hit: false }); } } };
    const roofAt = wx => roofs.find(r => wx >= r.x && wx <= r.x + r.w);
    // state
    let cam = 0, v = 300, T0 = 0, dist = CHASE_D0, feet = top0(), vy = 0, grounded = true, coyote = 0, buffer = 0, hold = false, holdT = 0, stumble = 0, shake = 0, flash = 0, phase = 0, stepAcc = 0;
    let botLong = true, clean = 0, falls = 0, bumps = 0, over = false, outcome = null, tackle = 0, raf = 0, last = performance.now(), nextBolt = 4 + rnd() * 4, msgT = 0;
    const PX = () => Math.max(70, W * 0.24);
    extend();
    const msg = (t, cls) => { const m = ov.querySelector('#chMsg'); m.textContent = t; m.className = cls || ''; msgT = 1.6; };
    const press = e => { if (e) e.preventDefault && e.cancelable && e.preventDefault(); if (over) return; hold = true; buffer = 0.14; ov.querySelector('#chTip').classList.add('gone'); };
    const release = () => { hold = false; };
    tap.addEventListener('pointerdown', press); tap.addEventListener('pointerup', release); tap.addEventListener('pointercancel', release); tap.addEventListener('pointerleave', release);
    tap.querySelector('input').addEventListener('click', e => e.stopPropagation());
    const key = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (e.type === 'keydown') { if (!e.repeat) press(); } else release(); } };
    addEventListener('keydown', key); addEventListener('keyup', key);
    ov.querySelector('#chSkip').onclick = () => { if (over) return; end('skip'); };
    // drawing helpers
    function runner(px, fy, ph, air, rim, scarf, dir, rot) {
      x.save(); x.translate(px, fy); if (rot) x.rotate(rot); x.scale((dir || 1) * 1.3, 1.3); x.shadowColor = rim; x.shadowBlur = 9; x.lineCap = 'round'; x.lineJoin = 'round';
      const sw = air ? 0.9 : Math.sin(ph), sw2 = air ? -0.6 : Math.sin(ph + Math.PI);
      const hip = [0, -20], sh = [3, -38];
      const leg = (s, back) => { const kx = hip[0] + s * 9, ky = hip[1] + 10 - Math.abs(s) * 2, fx = kx + (air ? (back ? -10 : 6) : s * 5 - (s < 0 ? 4 : 0)), fy2 = air ? (back ? -4 : -8) : -Math.max(0, -s) * 7; x.beginPath(); x.moveTo(hip[0], hip[1]); x.lineTo(kx, ky); x.lineTo(fx, fy2); x.stroke(); };
      x.strokeStyle = '#06050a'; x.lineWidth = 5; leg(sw, 0); leg(sw2, 1);
      // coat with flapping tail
      const flap = Math.sin(ph * 2) * 3 + (air ? 6 : 0);
      x.fillStyle = '#08070c'; x.beginPath(); x.moveTo(sh[0] - 6, sh[1]); x.lineTo(sh[0] + 6, sh[1]); x.lineTo(5, -14); x.lineTo(-12 - flap, -10 + flap * 0.3); x.closePath(); x.fill();
      x.strokeStyle = rim; x.globalAlpha = 0.85; x.lineWidth = 1.2; x.beginPath(); x.moveTo(sh[0] + 6, sh[1]); x.lineTo(5, -14); x.stroke(); x.globalAlpha = 1;
      // arms
      x.strokeStyle = '#06050a'; x.lineWidth = 4; [sw2, sw].forEach(s => { x.beginPath(); x.moveTo(sh[0], sh[1] + 2); x.lineTo(sh[0] + s * 8, sh[1] + 11); x.lineTo(sh[0] + s * 12 + 4, sh[1] + 6 + (air ? -8 : 0)); x.stroke(); });
      // head + hat
      x.fillStyle = '#08070c'; x.beginPath(); x.arc(sh[0] + 2, sh[1] - 7, 5, 0, 7); x.fill();
      x.beginPath(); x.moveTo(sh[0] - 7, sh[1] - 10); x.lineTo(sh[0] + 11, sh[1] - 10); x.lineTo(sh[0] + 7, sh[1] - 12); x.lineTo(sh[0] + 6, sh[1] - 17); x.lineTo(sh[0] - 2, sh[1] - 17); x.lineTo(sh[0] - 3, sh[1] - 12); x.closePath(); x.fill();
      x.strokeStyle = rim; x.lineWidth = 1; x.beginPath(); x.moveTo(sh[0] - 7, sh[1] - 10); x.lineTo(sh[0] + 11, sh[1] - 10); x.stroke();
      if (scarf) { x.strokeStyle = scarf; x.lineWidth = 3; x.beginPath(); x.moveTo(sh[0], sh[1] - 1); x.quadraticCurveTo(sh[0] - 10, sh[1] - 4 + Math.sin(ph * 3) * 3, sh[0] - 20, sh[1] + 2 + Math.sin(ph * 3 + 1) * 4); x.stroke(); }
      x.restore();
    }
    function draw(dt) {
      const sx = shake > 0 ? (rnd() * 2 - 1) * shake * 8 : 0, sy = shake > 0 ? (rnd() * 2 - 1) * shake * 5 : 0;
      x.save(); x.translate(sx, sy);
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bg || '#0b0710'); g.addColorStop(0.62, P.panel || '#22102f'); g.addColorStop(1, acc + '66'); x.fillStyle = g; x.fillRect(-20, -20, W + 40, H + 40);
      // moon + neon haze
      const mx = W * 0.8, my = H * 0.17; const mg = x.createRadialGradient(mx, my, 4, mx, my, 120); mg.addColorStop(0, '#fff6dcdd'); mg.addColorStop(0.18, '#f4e7c255'); mg.addColorStop(1, '#0000'); x.fillStyle = mg; x.fillRect(mx - 130, my - 130, 260, 260); x.fillStyle = '#fbf3dc'; x.beginPath(); x.arc(mx, my, 20, 0, 7); x.fill();
      const lay = (L, par, base, col, winCol) => { const off = (cam * par) % L.len; for (let rep = -1; rep < 2; rep++) L.forEach(b => { const bx = b.x - off + rep * L.len; if (bx > W || bx + b.w < 0) return; const by = base - b.h; x.fillStyle = col; x.fillRect(bx, by, b.w, b.h + 400); if (b.tower) { x.fillRect(bx + b.w * 0.3, by - 26, b.w * 0.3, 26); x.fillRect(bx + b.w * 0.44, by - 44, 2, 18); }
        b.win.forEach(w => { x.fillStyle = w[2] ? acc2 + 'cc' : winCol; x.fillRect(bx + w[0], by + w[1], 5, 7); }); }); };
      lay(far, 0.12, H * 0.62, P.line || '#2a2238', gold + '55');
      // neon sign on the far layer
      const sgx = ((signAt - cam * 0.12) % 1600 + 1600) % 1600 - 100; if (sgx > -160 && sgx < W + 40) { const on = rnd() > 0.04; x.font = '900 22px Georgia,serif'; x.textAlign = 'left'; x.shadowColor = acc2; x.shadowBlur = on ? 18 : 0; x.fillStyle = on ? acc2 : acc2 + '33'; x.fillText(wh[2], sgx, H * 0.36); x.shadowBlur = 0; }
      lay(mid, 0.38, H * 0.7, P.panel || '#1a1424', gold + '77');
      const hz = x.createLinearGradient(0, H * 0.45, 0, H * 0.75); hz.addColorStop(0, '#0000'); hz.addColorStop(1, acc + '55'); x.fillStyle = hz; x.fillRect(-20, H * 0.45, W + 40, H * 0.35);
      // rain
      x.strokeStyle = 'rgba(190,205,240,.32)'; x.lineWidth = 1; x.beginPath(); drops.forEach(d => { d.y += d.v * dt * 1.4; d.x -= (0.25 + v / 1800) * dt * d.v; if (d.y > 1) { d.y = -0.05; d.x = rnd() * 1.4; } if (d.x < -0.1) d.x += 1.4; const X = d.x * W, Y = d.y * H; x.moveTo(X, Y); x.lineTo(X - d.l * (0.3 + v / 1200), Y + d.l); }); x.stroke();
      // roofs + obstacles
      roofs.forEach(r => { const rx = r.x - cam; if (rx > W + 10 || rx + r.w < -10) return; x.fillStyle = '#050408'; x.fillRect(rx, r.y, r.w, H - r.y + 40);
        x.fillStyle = acc; x.globalAlpha = 0.7; x.fillRect(rx, r.y, r.w, 2); x.globalAlpha = 0.18; x.fillRect(rx, r.y + 2, 2, H); x.fillRect(rx + r.w - 2, r.y + 2, 2, H); x.globalAlpha = 1;
        if (flat) { x.fillStyle = '#0e0c14'; for (let wx = rx + 14; wx < rx + r.w - 20; wx += 34) x.fillRect(wx, r.y + 16, 20, 12); x.fillStyle = acc2 + '55'; for (let wx = rx + 14; wx < rx + r.w - 20; wx += 34) x.fillRect(wx + 2, r.y + 18, 16, 8); } });
      obs.forEach(o => { const ox = o.x - cam; if (ox > W + 10 || ox + o.w < -10) return; x.fillStyle = o.hit ? '#2a0f12' : '#08070c'; x.fillRect(ox, o.y - o.h, o.w, o.h); x.fillStyle = acc; x.globalAlpha = 0.55; x.fillRect(ox - 2, o.y - o.h - 3, o.w + 4, 3); x.globalAlpha = 1;
        if (o.kind === 'chimney' && !o.hit) { x.fillStyle = 'rgba(200,200,220,.10)'; for (let s = 0; s < 3; s++) { x.beginPath(); x.arc(ox + o.w / 2 - s * 8 - (T0 * 30 % 8), o.y - o.h - 8 - s * 10, 5 + s * 3, 0, 7); x.fill(); } } });
      // the killer ahead
      const kx = Math.min(W * 0.9, PX() + 34 + dist * 3.6) - tackle * 0, kwx = cam + kx; let ky = kAt(kwx);
      if (outcome === 'caught') runner(PX() + 44, feet - 4, 0.4, true, acc2, acc2, 1, 1.45 * Math.min(1, tackle * 1.4)); // face-down on the tar paper
      else runner(kx, ky, phase * 1.04 + 1.3, ky < (roofAt(kwx) || { y: 1e9 }).y - 2, acc2, acc2);
      // you
      runner(PX() + (outcome === 'caught' ? tackle * 18 : 0), feet, outcome === 'caught' ? 0.3 : phase, !grounded, acc, null);
      if (stumble > 0) { x.fillStyle = gold; x.font = '900 16px Arial'; x.textAlign = 'center'; x.fillText('✶', PX() + 6, feet - 62 - stumble * 20); }
      // lightning
      if (flash > 0) { x.fillStyle = `rgba(235,240,255,${flash * 0.55})`; x.fillRect(-20, -20, W + 40, H + 40); }
      // vignette
      const vg = x.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.85); vg.addColorStop(0, '#0000'); vg.addColorStop(1, '#000a'); x.fillStyle = vg; x.fillRect(-20, -20, W + 40, H + 40);
      x.restore();
    }
    function kAt(wx) { const r = roofAt(wx); let y; if (r) { y = r.y; const o = obs.find(o => wx > o.x - 26 && wx < o.x + o.w + 26 && Math.abs(o.y - r.y) < 1); if (o) { const t = (wx - (o.x - 26)) / (o.w + 52); y -= Math.sin(Math.PI * t) * (o.h + 18); } return y; }
      const i = roofs.findIndex(r => r.x > wx); if (i < 1) return top0(); const a = roofs[i - 1], b = roofs[i], t = (wx - (a.x + a.w)) / (b.x - a.x - a.w); return lerp(a.y, b.y, t) - Math.sin(Math.PI * t) * 64; }
    function botThink() { // ?autochase: a perfect runner, for demos and tests
      if (!grounded) { hold = vy < 0 && (botLong || holdT < 0.06); return; } const fx = cam + PX() + 12, r = roofAt(cam + PX());
      const edge = r ? r.x + r.w - fx : 0, nextO = obs.find(o => !o.hit && o.x - fx < v * 0.09 + 8 && o.x - fx > 0);
      if (r && edge < v * 0.06 + 6) { botLong = true; press(); } else if (nextO) { botLong = false; press(); }
    }
    function end(kind) {
      if (over) return; over = true; outcome = kind; hold = false; const s = ov.querySelector('#chStamp'); ov.querySelector('#chSkip').hidden = true;
      if (kind === 'caught') { msg('Got ' + (k.g === 'f' ? 'her' : 'him') + '! Cuffs on.', 'good'); S.sfx.cuffs(); hap('win'); s.textContent = 'COLLARED!'; s.className = 'chstamp ok'; tackle = 0.001; }
      else if (kind === 'gone') { msg(k.short + ' ' + wh[3] + '.', 'bad'); S.sfx.escape(); hap('lose'); s.textContent = 'GONE'; s.className = 'chstamp bad'; }
      s.hidden = kind === 'skip';
      setTimeout(() => {
        const secs = Math.round(T0 * 10) / 10, card = document.createElement('div'); card.className = 'chcard ' + (kind === 'caught' ? 'ok' : 'bad');
        card.innerHTML = kind === 'caught' ? `<small>THE COLLAR · ${secs}s · ${falls + bumps ? falls + bumps + ' stumble' + (falls + bumps === 1 ? '' : 's') : 'not a single stumble'}</small><div class="chverd">+${CHASE_BONUS}</div><p>You brought ${esc(k.short)} down ${esc(wh[1])}. The cuffs click shut in the rain.</p><button class="btn" id="chDone">Book 'em</button>`
          : kind === 'gone' ? `<small>THE CHASE · ${Math.max(0, Math.ceil(dist))} yards short</small><div class="chverd">GONE</div><p>${esc(k.short)} ${esc(wh[3])}. The uniforms pick ${k.g === 'f' ? 'her' : 'him'} up at dawn. No collar bonus.</p><button class="btn" id="chDone">Close the case</button>`
          : `<small>THE CHASE</small><div class="chverd">BADGE 714</div><p>You let the uniforms run. They get ${esc(k.short)} at the docks. No collar bonus.</p><button class="btn" id="chDone">Close the case</button>`;
        ov.appendChild(card); requestAnimationFrame(() => card.classList.add('on'));
        const fin = () => { S.sfx.page(); ov.classList.add('bye'); removeEventListener('resize', size); removeEventListener('keydown', key); removeEventListener('keyup', key); setTimeout(() => { cancelAnimationFrame(raf); ov.remove(); done({ caught: kind === 'caught', skipped: kind === 'skip', secs, stumbles: falls + bumps }); }, FAST ? 0 : 450); };
        card.querySelector('#chDone').onclick = fin; if (auto && /[?&]autoclose\b/.test(location.search)) setTimeout(fin, 400);
      }, kind === 'skip' ? 0 : 1300);
    }
    function step(n) {
      const dt = Math.min(0.05, (n - last) / 1000); last = n;
      if (!over) { const N = Math.max(1, Math.ceil(dt / (1 / 120))); for (let q = 0; q < N && !over; q++) sim(dt / N);
        const left = CHASE_T - T0; const ck = ov.querySelector('#chClock b'); ck.textContent = Math.max(0, Math.ceil(left)); ov.querySelector('#chClock').classList.toggle('hot', left < 6);
        const yd = Math.max(0, dist); ov.querySelector('#chBar').style.width = Math.min(100, yd / CHASE_D0 * 100) + '%'; ov.querySelector('#chYds').textContent = Math.ceil(yd) + ' yds';
      } else { if (tackle > 0) tackle = Math.min(1, tackle + dt * 3); phase += dt * 3; if (outcome === 'gone') dist += dt * 60; }
      msgT -= dt; flash = Math.max(0, flash - dt * 2.2); shake = Math.max(0, shake - dt * 2);
      draw(dt); raf = requestAnimationFrame(step);
    }
    function sim(dt) {
        if (auto) botThink();
        T0 += dt; const left = CHASE_T - T0;
        v = (300 + Math.min(110, T0 * 6)) * (stumble > 0 ? 0.55 : 1);
        cam += v * dt; extend(); phase += dt * v / 22;
        // physics: variable-height jump, coyote time, jump buffer
        const GR = 2300; coyote = grounded ? 0.09 : coyote - dt; buffer -= dt;
        if (buffer > 0 && (grounded || coyote > 0)) { vy = -700; grounded = false; coyote = 0; buffer = 0; holdT = 0; S.sfx.jump(); hap('tap'); }
        if (!grounded) { holdT += dt; const g2 = (hold && vy < 0 && holdT < 0.3) ? GR * 0.45 : GR; const pf = feet; vy += g2 * dt; feet += vy * dt;
          const wx = cam + PX(), r = roofAt(wx);
          const ob = vy > 0 && obs.find(o => wx + 7 > o.x && wx - 7 < o.x + o.w && pf <= o.y - o.h + 2 && feet >= o.y - o.h);
          if (ob) { feet = ob.y - ob.h; grounded = true; S.sfx.land(0.6); hap('dust'); vy = 0; ob.top = true; }
          else if (r && vy > 0 && pf <= r.y + 2 && feet >= r.y) { feet = r.y; grounded = true; S.sfx.land(Math.min(1, vy / 1100)); hap('dust'); vy = 0; }
          else if (r && feet > r.y + 2 && feet <= r.y + 26) { feet = r.y; grounded = true; vy = 0; S.sfx.land(0.4); } // mantle a ledge
          else if (r && feet > r.y + 26 && pf > r.y + 2) { // smacked the wall of a taller roof: scramble up, lose ground
            feet = r.y; grounded = true; vy = 0; bumps++; dist += 7; stumble = 0.45; shake = 0.7; clean = 0; S.sfx.gutter(); hap('miss'); msg('Smacked a wall. Scrambled up.', 'bad'); }
          if (feet > H + 40) { // fell: catch the gutter, haul up on the next roof
            const nx = roofs.find(q => q.x > wx - 4) || roofs[roofs.length - 1]; cam = nx.x - PX() + 14; feet = nx.y; vy = 0; grounded = true; falls++; dist += 12; shake = 1; flash = 0.25; clean = 0; S.sfx.gutter(); hap('heavy'); msg('Caught a drainpipe! Lost ground.', 'bad'); }
        } else { const wx = cam + PX(), r = roofAt(wx - 4) || roofAt(wx + 4), ob = obs.find(o => wx + 7 > o.x && wx - 7 < o.x + o.w && Math.abs(feet - (o.y - o.h)) < 2);
          if (ob) feet = ob.y - ob.h; else if (!r) { grounded = false; vy = 0; } else if (feet < r.y - 2) { grounded = false; vy = 0; } else feet = r.y;
          stepAcc += dt * v / 46; if (stepAcc >= 1) { stepAcc = 0; S.sfx.step(); } }
        // chimneys and vents
        obs.forEach(o => { if (o.hit || o.top) return; const ox = o.x - cam; if (PX() + 8 > ox && PX() - 8 < ox + o.w && feet > o.y - o.h + 3) { o.hit = true; bumps++; dist += 6; stumble = 0.5; shake = 0.8; clean = 0; S.sfx.stumble(); hap('miss'); msg('Clipped a ' + (o.kind === 'chimney' ? 'chimney' : 'vent') + '!', 'bad'); } });
        stumble = Math.max(0, stumble - dt); if (stumble <= 0) { clean += dt; dist -= (4.2 + Math.min(1.8, clean * 0.15)) * dt; }
        if (clean > 4 && msgT <= 0 && !auto) { msg('Gaining on ' + (k.g === 'f' ? 'her' : 'him') + '…', 'good'); }
        if (dist <= 0) end('caught'); else if (left <= 0) end('gone');
        nextBolt -= dt; if (nextBolt <= 0) { nextBolt = 5 + rnd() * 5; flash = 1; S.sfx.thunder(false); }
    }
    raf = requestAnimationFrame(step);
  });
}

/* ---------- result ---------- */
async function showResult(res) {
  const R = $('#result'); R.hidden = false; R.scrollTop = 0; $('#hud').hidden = false; updateHud();
  const who = G.people[res.win ? res.killer : res.accused];
  R.innerHTML = `<div class="rport">${A.portrait(who.art, { accent: G.st.accent, mood: res.win ? 'caught' : 'smug', nerve: res.win ? 3 : 0, label: who.name })}</div><div class="rlog" id="rlog"></div><div id="rfin"></div>`;
  await sleep(FAST ? 0 : 1100); S.sfx.thunder(true);
  for (const l of res.lines) {
    const el = document.createElement('div'); el.className = 'msg ' + (l.k === 's' ? 's' + (res.win ? ' caught' : '') : 'n'); $('#rlog').appendChild(el); R.scrollTop = R.scrollHeight;
    if (l.k === 's') { const nm = G.people[l.idx].name; await typeText(el, nm + ': “' + l.text + '”', 14); } else { await typeText(el, l.text, 14); }
    await sleep(FAST ? 0 : 350);
  }
  res.win ? S.sfx.win() : S.sfx.lose(); hap(res.win ? 'win' : 'lose');
  const shareUrl = location.origin + location.pathname + '?c=' + seed;
  const rank = res.rank;
  $('#rfin').innerHTML = `<div class="rcard" style="text-align:center"><div class="rstamp ${res.win ? 'ok' : 'bad'}">${res.win ? 'CASE CLOSED' : 'COLD CASE'}</div><p class="rank">${rank.icon} ${esc(rank.name)}</p><p class="rline">${esc(rank.line)}</p><div class="score" id="scoreN">0</div>
  <div class="sgrid"><div><b>${res.stats.left}</b>moves left</div><div><b>${res.stats.cracks}</b>lies cracked</div><div><b>${res.stats.bluffs}</b>bad guesses</div><div><b>${res.proof === 'strong' ? '✓' : res.proof === 'fair' ? '~' : '–'}</b>proof</div></div>
  ${res.stats.confession ? `<p class="rline">${res.stats.sawThrough ? '🎭 You saw through the false confession.' : '🎭 Someone confessed. It wasn\'t true.'}</p>` : ''}${res.stats.body ? `<p class="rline">💀 A second body turned up.</p>` : ''}${res.stats.poly ? `<p class="rline">📈 You strapped ${res.stats.poly} to the lie box.</p>` : ''}${res.stats.safe ? `<p class="rline">${res.stats.safe === 'crack' ? '🔐 You cracked the safe by ear. +' + E.SAFE_BONUS : '🧨 You blew the safe. Lefty sends his regards.'}</p>` : ''}${res.stats.seance ? `<p class="rline">👻 You asked the dead. ${esc(G.V.short)} answered.</p>` : ''}${res.chase ? `<p class="rline">${res.chase.caught ? '🚓 You collared ' + esc(who.short) + ' on the rooftops in ' + res.chase.secs + 's. +' + CHASE_BONUS : res.chase.skipped ? '🚔 You let the uniforms do the running.' : '🏃 ' + esc(who.short) + ' outran you over the rooftops.'}</p>` : ''}
  <div class="recap">${res.recap.map(r => { const p = G.people[r.idx]; return `<div><span class="av">${A.portrait(p.art, { accent: G.st.accent, mood: 'neutral', label: p.name })}</span><span><b>${esc(p.name)}</b><br><span class="${r.role === 'K' ? 'k' : ''}">${esc(r.truth)}</span></span></div>`; }).join('')}</div>
  <p class="epi">${esc(res.epi)}</p>
  <button class="cta" id="bShare" data-now>📤 Share result</button><button class="cta alt" id="bNext">Next case</button><button class="cta alt" id="bRe">Replay this case</button><button class="cta alt" id="bTitle">Title</button></div>`;
  { const rc = R.querySelector('.rcard'); R.scrollTop = Math.max(0, rc.offsetTop - 12); }
  const sc = $('#scoreN'); const t0 = performance.now(); (function up(n) { const k = Math.min(1, (n - t0) / (FAST ? 1 : 900)); sc.textContent = Math.round(res.score * k).toLocaleString(); if (k < 1) requestAnimationFrame(up); })(t0);
  $('#bNext').onclick = () => newGame(1000 + Math.floor(Math.random() * 90000), false);
  $('#bRe').onclick = () => newGame(seed, daily);
  $('#bTitle').onclick = showTitle;
  $('#bShare').onclick = () => share(res, shareUrl);
}
async function share(res, url) {
  const txt = `🕵️ NOIR: Last Call · ${daily ? 'Daily ' + String(seed).slice(4, 6) + '/' + String(seed).slice(6) : 'Case #' + seed} (${G.st.name})\n${res.rank.icon} ${res.rank.name} · ${res.score.toLocaleString()} pts\n⏱ ${res.stats.left} moves left · 🔓 ${res.stats.cracks} lies cracked${res.stats.sawThrough ? ' · 🎭 saw through a false confession' : ''}${res.chase && res.chase.caught ? ' · 🚓 collared on the rooftops in ' + res.chase.secs + 's' : ''}\nBeat me: ${url}`;
  try {
    let files = null;
    try { const blob = await makeCard(res); if (blob) { const f = new File([blob], 'noir-case.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) files = [f]; } } catch (e) {}
    if (navigator.share) { await navigator.share(files ? { files, text: txt } : { text: txt }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(txt); toast('Result copied. Paste it anywhere.', 'good'); } catch (e) { prompt('Copy your result:', txt); }
}
function makeCard(res) {
  return new Promise(resolve => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 1350); const P = G.st.pal || {}; g.addColorStop(0, P.panel || '#1a0b1a'); g.addColorStop(1, P.bg || '#07060b'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = G.st.accent + '33'; x.beginPath(); x.arc(860, 220, 260, 0, 7); x.fill();
    x.textAlign = 'center'; x.fillStyle = '#f4ecd8'; x.font = '900 150px Georgia,serif'; x.fillText('NOIR', 540, 190); x.fillStyle = G.st.accent; x.font = 'italic 48px Georgia,serif'; x.fillText('last call', 540, 250);
    x.fillStyle = '#9b93a4'; x.font = '34px "Courier New",monospace'; x.fillText((daily ? 'DAILY CASE' : 'CASE #' + seed) + ' · ' + G.st.name.toUpperCase(), 540, 330);
    const who = G.people[res.win ? res.killer : res.accused];
    const svg = A.portrait(who.art, { accent: G.st.accent, mood: res.win ? 'caught' : 'smug', nerve: 3 }).replace('<svg ', '<svg width="200" height="240" ');
    const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const done = () => {
      x.fillStyle = res.win ? '#4fc08a' : '#d63b3b'; x.font = '900 64px Arial,sans-serif'; x.fillText(res.win ? 'CASE CLOSED' : 'COLD CASE', 540, 800);
      x.fillStyle = '#f4ecd8'; x.font = '700 80px Georgia,serif'; x.fillText(res.rank.icon + ' ' + res.rank.name, 540, 910);
      x.fillStyle = '#e6c25a'; x.font = '900 150px "Courier New",monospace'; x.fillText(res.score.toLocaleString(), 540, 1080);
      x.fillStyle = '#cfc6b4'; x.font = '40px "Courier New",monospace'; x.fillText(res.stats.left + ' moves left · ' + res.stats.cracks + ' lies cracked', 540, 1160);
      x.fillStyle = G.st.accent; x.font = '36px "Courier New",monospace'; x.fillText('sajdagiant.github.io/noir-mystery-game', 540, 1270);
      c.toBlob(b => resolve(b), 'image/png');
    };
    img.onload = () => { x.save(); x.beginPath(); x.roundRect ? x.roundRect(390, 380, 300, 360, 26) : x.rect(390, 380, 300, 360); x.clip(); x.drawImage(img, 390, 380, 300, 360); x.restore(); x.strokeStyle = G.st.accent; x.lineWidth = 4; x.strokeRect(390, 380, 300, 360); URL.revokeObjectURL(url); done(); };
    img.onerror = () => { URL.revokeObjectURL(url); done(); };
    img.src = url;
  });
}

window.__noir = { get G() { return G; }, E, newGame, setView, safe: doSafe, chase: k => runChase(k || G.people[G.K.idx]), get busy() { return busy; }, Hap, isIOS };
showTitle();
})();
