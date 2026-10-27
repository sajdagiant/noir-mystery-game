'use strict';
const $ = s => document.querySelector(s);
let S = null, C = null, cur = null, ev = [], logs = {}, pend = false, mSel = null, mSus = null;
const api = (p, b) => Promise.resolve().then(() => window.noirApi(p, b ? Object.assign({ sid: S }, b) : null));
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

api('status').then(s => { const m = $('#mode'); m.textContent = s.mode === 'ai' ? `AI live · ${s.provider}` : 'Offline mode'; m.className = 'badge ' + (s.mode === 'ai' ? 'ai' : 'off'); m.title = s.mode === 'ai' ? 'Suspects are improvised by an LLM' : 'Procedural suspects. Add an API key for live AI.'; });

async function start() {
  $('#startBtn').disabled = true;
  const r = await api('new', {}); S = r.sid; C = r.case; ev = []; logs = {}; cur = null;
  $('#title').hidden = true; $('#game').hidden = false; $('#newBtn').hidden = false; $('#result').hidden = true; $('#modal').hidden = true;
  $('#startBtn').disabled = false; render(); go('scene'); window.scrollTo(0, 0);
}
function render() {
  $('#brief').innerHTML = `<div class="no">CASE ${esc(C.caseNo)}</div><h2>${esc(C.victim)}</h2><p>${esc(C.victimTitle.charAt(0).toUpperCase()+C.victimTitle.slice(1))}, found dead at <b>${esc(C.venue)}</b> — ${esc(C.blurb)}. Found at ${esc(C.timeFound)}. Weapon: ${esc(C.weapon)}. One of four people did it. Three are lying about something.</p>`;
  $('#locs').innerHTML = C.locations.map(l => `<button class="loc ${l.scene ? 'scene' : ''}" data-id="${l.id}">${esc(l.name)}<span class="t">${l.scene ? 'CRIME SCENE' : 'SEARCH'}</span></button>`).join('');
  $('#cards').innerHTML = C.suspects.map(s => `<button class="card" data-id="${s.id}"><div class="avatar" style="background:hsl(${s.hue} 35% 55%)">${esc(s.initials)}</div><b>${esc(s.name)}</b><div class="m">${esc(s.rel)}</div><div class="v">${esc(s.voice)}</div></button>`).join('');
  $('#interview').hidden = true; updEv();
}
function updEv() {
  $('#evCount').textContent = `${ev.length}/6`; $('#evBadge').textContent = ev.length || '';
  $('#evList').innerHTML = ev.length ? ev.map(e => `<div class="ev"><div class="w">${esc(e.location)}</div><b>${esc(e.title)}</b>${esc(e.text)}</div>`).join('') : '<p class="muted">Nothing yet. Search the scene.</p>';
  $('#evSel').innerHTML = '<option value="">— Present evidence —</option>' + ev.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
}
$('#locs').onclick = async e => {
  const b = e.target.closest('.loc'); if (!b || b.classList.contains('done')) return;
  b.classList.add('done'); const r = await api('examine', { loc: b.dataset.id });
  if (r.clue) { ev.push(r.clue); updEv(); b.querySelector('.t').textContent = 'SEARCHED ✓'; if (matchMedia('(max-width:820px)').matches) go('evidence'); else $('#evidence').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
};
$('#cards').onclick = e => {
  const b = e.target.closest('.card'); if (!b) return; cur = C.suspects.find(s => s.id === b.dataset.id);
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('on', c === b));
  $('#interview').hidden = false; $('#iname').textContent = cur.name; $('#irel').textContent = `${cur.rel} · ${cur.voice}`;
  const av = $('#iav'); av.textContent = cur.initials; av.style.background = `hsl(${cur.hue} 35% 55%)`;
  if (!logs[cur.id]) logs[cur.id] = [{ t: 'sys', x: `You sit across from ${cur.name}. Ask anything, or present evidence.` }];
  $('#chips').innerHTML = ['Where were you?', `How did you know ${C.victimShort}?`, 'Did you have a motive?', 'Did you see anything?', 'What are you hiding?', 'Who do you suspect?'].map(q => `<button type="button">${esc(q)}</button>`).join('');
  drawLog(); $('#interview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};
function drawLog() { const l = $('#log'); l.innerHTML = logs[cur.id].map(m => `<div class="msg ${m.t}">${esc(m.x)}</div>`).join(''); l.scrollTop = l.scrollHeight; }
async function ask(text, clueId) {
  if (pend || !cur) return; const who = cur, sel = ev.find(e => e.id === clueId);
  if (!text && !clueId) return; pend = true;
  if (sel) logs[who.id].push({ t: 'sys', x: `You show: ${sel.title}` });
  if (text) logs[who.id].push({ t: 'me', x: text });
  logs[who.id].push({ t: 'them typing', x: `${who.first} is thinking…` }); drawLog();
  try { const r = await api('ask', { suspectId: who.id, text, clueId }); logs[who.id].pop(); logs[who.id].push({ t: 'them', x: r.reply || r.error }); }
  catch (e) { logs[who.id].pop(); logs[who.id].push({ t: 'sys', x: 'Connection lost.' }); }
  pend = false; if (cur === who) drawLog();
}
$('#askForm').onsubmit = e => { e.preventDefault(); const t = $('#q').value.trim(), c = $('#evSel').value; $('#q').value = ''; $('#evSel').value = ''; ask(t, c); };
$('#chips').onclick = e => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); };
$('#accuseBtn').onclick = () => {
  mSus = cur; mSel = null; $('#mName').textContent = cur.name; $('#mGo').disabled = true;
  $('#mOpts').innerHTML = C.motives.map(m => `<button class="opt" data-id="${m.id}">${esc(m.label)}</button>`).join(''); $('#modal').hidden = false;
};
$('#mOpts').onclick = e => { const b = e.target.closest('.opt'); if (!b) return; mSel = b.dataset.id; document.querySelectorAll('.opt').forEach(o => o.classList.toggle('on', o === b)); $('#mGo').disabled = false; };
$('#mCancel').onclick = () => $('#modal').hidden = true;
$('#mGo').onclick = async () => {
  const r = await api('accuse', { suspectId: mSus.id, motive: mSel }); $('#modal').hidden = true;
  $('#resBox').innerHTML = `<div class="stamp ${r.correct ? 'win' : 'lose'}">${r.correct ? 'CASE CLOSED' : 'WRONG MAN'}</div>
  <h2 class="res-h ${r.correct ? 'win' : 'lose'}">${r.correct ? 'You got them.' : 'The killer walks.'}</h2>
  <p class="muted">${r.correct ? (r.motiveRight ? 'Culprit and motive, both nailed.' : 'Right person, wrong motive.') : `You accused ${esc(r.accused)}. It was ${esc(r.culprit)}.`} · Rank: <b>${esc(r.rank)}</b> · Score ${r.score}</p>
  <div class="story">${esc(r.story)}</div>
  <table><tr><th>Suspect</th><th>Motive</th><th>Secret</th></tr>${r.suspects.map(s => `<tr class="${s.secret === 'Murderer' ? 'cul' : ''}"><td>${esc(s.name)}<br><span class="muted">${esc(s.rel)}</span></td><td>${esc(s.motive.split(' — ')[0])}</td><td>${esc(s.secret)}</td></tr>`).join('')}</table>
  <div class="row"><button class="cta" id="again">Next case</button></div>`;
  $('#result').hidden = false; $('#again').onclick = start;
};
function go(t) { document.querySelectorAll('.panel').forEach(p => p.classList.toggle('show', p.dataset.tab === t)); document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === t)); }
$('.tabs').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.go); };
$('#startBtn').onclick = start; $('#newBtn').onclick = () => { if (confirm('Abandon this case and start a new one?')) start(); };
