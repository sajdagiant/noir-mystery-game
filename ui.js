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
const PAT = { tap: 9, link: [14, 50, 22], crack: [30, 40, 80], miss: [70, 60, 70], planted: [20, 40, 20, 40, 20], heavy: [90, 70, 160], accuse: [35, 110, 35, 110, 35, 220], win: [20, 70, 20, 70, 140], lose: [260], beat: [28, 150, 40], dust: 6, lift: [12, 40, 12, 40, 60] };
function hap(kind) {
  if (!Hap.on || !canVib || isIOS) return; const n = performance.now();
  if ((kind === 'tap' && n - Hap.last < 60) || (kind === 'dust' && n - Hap.last < 90)) return; Hap.last = n;
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
  seed = sd; daily = !!dly; G = E.newCase(sd); logs = {}; lifted = {}; armed = null; cur = null; busy = false; boardNew = 0; over = false;
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
  <button class="hintbtn" id="hintBtn">🕯️ Phone the Lieutenant for a hint · 1 move · −75 pts</button>`;
  $$('#v-scene .loc').forEach(b => b.onclick = () => doSearch(b.dataset.id));
  $('#hintBtn').onclick = doHint;
}
function renderSuspects() {
  $('#v-suspects').innerHTML = `<div class="cards">${G.people.map(p => { const [c, tx] = chipFor(p.idx); return `<button class="sc" data-i="${p.idx}"><div class="pt">${A.portrait(p.art, { accent: G.st.accent, mood: G.nerve[p.idx] >= 2 ? 'nervous' : 'neutral', nerve: G.nerve[p.idx], label: p.name })}${G.met[p.idx] ? '' : '<span class="new">NEW</span>'}</div><div class="inf"><b>${esc(p.name)}</b><span class="role">${esc(p.rolelabel)}</span><span class="chip ${c}">${tx}</span></div></button>`; }).join('')}</div>`;
  $$('#v-suspects .sc').forEach(b => b.onclick = () => { S.sfx.tap(); openInterview(+b.dataset.i); });
}
function renderBoard() {
  const clues = E.clueList(G);
  let h = `<div class="cork"><div class="pinhint">${armed ? 'Now tap the statement it contradicts ↓' : 'Tap a clue, then tap the lie it breaks.'}</div><div class="pins">${clues.map((c, i) => `<button class="pin ${c.kind === 'testimony' ? 't' : ''} ${armed === c.id ? 'armed' : ''}" data-c="${c.id}" style="--r:${(i % 3 - 1) * 1.6}deg"><span class="ic">${c.icon}</span><b>${esc(c.title)}</b></button>`).join('')}</div>${armed ? `<div class="pinhint" style="color:#f0e2c0;font-size:13px;margin-top:6px">${esc(G.clues[armed].text)}</div>` : ''}</div>`;
  G.people.forEach(p => {
    const [c, tx] = chipFor(p.idx), sts = E.statementsFor(G, p.idx);
    h += `<div class="folder"><button class="fh" data-i="${p.idx}"><span class="av">${A.portrait(p.art, { accent: G.st.accent, mood: 'neutral', label: p.name })}</span><span style="flex:1"><b>${esc(p.name)}</b><span class="role">${esc(p.rolelabel)}</span></span><span class="chip ${c}">${tx}</span></button><div class="notes">`;
    if (!G.met[p.idx]) h += `<div class="dos">Not interviewed yet. Tap to meet.</div>`;
    sts.forEach(s => { h += `<button class="note ${s.kind === 'confession' ? 'conf' : s.kind} ${s.broken ? 'broken' : ''} ${armed && !s.broken ? 'armed-t' : ''}" data-s="${s.id}"><span class="k">${({ confession: 'Confession', call: 'Phone alibi', alone: 'Admission' })[s.kind] || 'Alibi claim'}</span><span class="tx">“${esc(s.text)}”</span>${s.broken ? `<span class="lie">LIE</span><span class="by">🧵 Broken by: ${esc(G.clues[s.brokenBy].title)}</span>` : ''}</button>`; });
    if (G.notes[p.idx].length) h += `<div class="dos"><ul>${G.notes[p.idx].map(n => `<li>${esc(n.text)}</li>`).join('')}</ul></div>`;
    h += `</div></div>`;
  });
  h += `<button class="hintbtn" id="hintBtn2">🕯️ Phone the Lieutenant for a hint · 1 move · −75 pts</button>`;
  $('#v-board').innerHTML = h;
  $$('#v-board .pin').forEach(b => b.onclick = () => { if (armed !== b.dataset.c) { S.sfx.link(); hap('link'); } else S.sfx.tap(); armed = armed === b.dataset.c ? null : b.dataset.c; renderBoard(); });
  $$('#v-board .fh').forEach(b => b.onclick = () => openInterview(+b.dataset.i));
  $$('#v-board .note').forEach(b => b.onclick = () => {
    const s = G.stmts[b.dataset.s];
    if (!armed) return toast('Tap a clue above first.');
    if (s.broken) return toast('That lie is already broken.');
    const c = armed; armed = null; S.sfx.link(); hap('link'); openInterview(s.who, c);
  });
  $('#hintBtn2').onclick = doHint;
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
    + `<button class="ab ev" id="aEv">🗂️ Show evidence<small>right: 1 · wrong: 2</small></button><button class="ab acc" id="aAcc">☠️ Accuse<small>final</small></button>`;
  a.querySelectorAll('[data-t]').forEach(b => b.onclick = () => doAsk(b.dataset.t));
  $('#aEv').onclick = () => pickEvidence(); $('#aAcc').onclick = () => openAccuse(false);
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
  const st = store.get('stats', { played: 0, solved: 0, best: 0, streak: 0 });
  st.played++; if (res.win) { st.solved++; st.streak++; st.best = Math.max(st.best, res.score); } else st.streak = 0; store.set('stats', st);
  if (daily) store.set('daily', { date: today(), win: res.win, rank: res.rank.name, score: res.score });
  showResult(res); busy = false;
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
  ${res.stats.confession ? `<p class="rline">${res.stats.sawThrough ? '🎭 You saw through the false confession.' : '🎭 Someone confessed. It wasn\'t true.'}</p>` : ''}${res.stats.body ? `<p class="rline">💀 A second body turned up.</p>` : ''}
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
  const txt = `🕵️ NOIR: Last Call · ${daily ? 'Daily ' + String(seed).slice(4, 6) + '/' + String(seed).slice(6) : 'Case #' + seed} (${G.st.name})\n${res.rank.icon} ${res.rank.name} · ${res.score.toLocaleString()} pts\n⏱ ${res.stats.left} moves left · 🔓 ${res.stats.cracks} lies cracked${res.stats.sawThrough ? ' · 🎭 saw through a false confession' : ''}\nBeat me: ${url}`;
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

window.__noir = { get G() { return G; }, E, newGame, setView, get busy() { return busy; }, Hap, isIOS };
showTitle();
})();
