/* NOIR — sound: rain, thunder, lazy noir combo, SFX. All synthesized. */
(function (root) {
'use strict';
const AC = root.AudioContext || root.webkitAudioContext;
let ctx, master, rainG, musG, sfxG, wet, keepAlive, started = false, on = true, timer = null, nextT = 0, step = 0, thunderT = null, tension = 0;
try { on = localStorage.getItem('noir.snd') !== '0'; } catch (e) {}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function silentWav() {
  const sr = 8000, n = sr, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, i & 1 ? 1 : -1, true);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
function unlockIOS() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  try {
    if (!keepAlive) { keepAlive = document.createElement('audio'); keepAlive.src = silentWav(); keepAlive.loop = true; keepAlive.setAttribute('playsinline', ''); keepAlive.style.display = 'none'; document.body.appendChild(keepAlive); }
    const p = keepAlive.play(); if (p && p.catch) p.catch(() => {});
  } catch (e) {}
}
function noiseBuf(sec, tilt) {
  const n = ctx.sampleRate * sec, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let l = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; l = tilt ? l * 0.97 + w * 0.03 : w; d[i] = tilt ? l * 5 : w; }
  return b;
}
function impulse(sec) { const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); } return b; }

function start() {
  if (started || !AC) return; started = true;
  unlockIOS();
  ctx = new AC();
  try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
  try { ctx.resume(); } catch (e) {}
  master = ctx.createGain(); master.gain.value = on ? 1 : 0;
  const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
  const conv = ctx.createConvolver(); conv.buffer = impulse(2.2); wet = ctx.createGain(); wet.gain.value = 0.35; conv.connect(wet); wet.connect(master);
  rainG = ctx.createGain(); rainG.gain.value = 0.2; rainG.connect(master);
  musG = ctx.createGain(); musG.gain.value = 0.34; musG.connect(master); musG.connect(conv);
  sfxG = ctx.createGain(); sfxG.gain.value = 0.7; sfxG.connect(master); sfxG.connect(conv);
  // rain
  const nb = noiseBuf(4, false), s1 = ctx.createBufferSource(); s1.buffer = nb; s1.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.35; s1.connect(bp); bp.connect(rainG); s1.start();
  const nb2 = noiseBuf(4, true), s2 = ctx.createBufferSource(); s2.buffer = nb2; s2.loop = true; const g2 = ctx.createGain(); g2.gain.value = 0.35; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; s2.connect(lp); lp.connect(g2); g2.connect(rainG); s2.start();
  nextT = ctx.currentTime + 0.3; step = 0;
  timer = setInterval(sched, 120);
  scheduleThunder();
  document.addEventListener('visibilitychange', revive); addEventListener('pageshow', revive); addEventListener('focus', revive);
  ['touchend', 'click'].forEach(ev => document.addEventListener(ev, revive, true));
  setInterval(revive, 1500);
}
function revive() {
  if (!ctx) return;
  if (ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} }
  if (keepAlive && keepAlive.paused && on) { const p = keepAlive.play(); if (p && p.catch) p.catch(() => {}); }
}
function setOn(v) { on = !!v; try { localStorage.setItem('noir.snd', on ? '1' : '0'); } catch (e) {} if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.1); if (on && !started) start(); }

// ---- music: 4-bar loop, Dm9 | G13 | Cmaj9 | A7b9
const CH = [[50, 53, 57, 60, 64], [43, 53, 59, 62, 64], [48, 52, 55, 59, 62], [45, 49, 55, 58, 52]];
const BASS = [[38, 38, 41, 45, 43, 41, 40, 38], [43, 43, 47, 50, 48, 47, 46, 43], [36, 36, 40, 43, 41, 40, 38, 36], [45, 45, 49, 52, 51, 49, 48, 44]];
const SCALE = [62, 64, 65, 67, 69, 72, 74, 76];
function tone(t, f, dur, type, vol, dest, det) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || musG); o.start(t); o.stop(t + dur + 0.05);
}
function rhodes(t, m, vol) { const f = mtof(m); tone(t, f, 1.6, 'sine', vol, musG); tone(t, f * 2, 0.5, 'sine', vol * 0.35, musG); tone(t, f * 4.01, 0.12, 'sine', vol * 0.12, musG); }
function brush(t, vol) { const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.3, false); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); s.connect(f); f.connect(g); g.connect(musG); s.start(t); s.stop(t + 0.3); }
function sched() {
  if (!ctx) return;
  while (nextT < ctx.currentTime + 0.35) {
    const bpm = 64 + tension * 6, e = 60 / bpm / 2, bar = Math.floor(step / 8) % 4, i = step % 8;
    const sw = (i % 2) ? e * 0.18 : 0, t = nextT + sw;
    if (i % 2 === 0) { const bm = BASS[bar][i]; tone(t, mtof(bm), 0.5, 'triangle', 0.5, musG); }
    if (i === 0 || (i === 5 && Math.random() < 0.6) || (i === 3 && Math.random() < 0.25)) { const ch = CH[bar]; ch.slice(1).forEach((m, k) => rhodes(t + k * 0.012, m + (Math.random() < 0.08 ? 12 : 0), 0.07)); }
    if (i === 2 || i === 6) brush(t, 0.07);
    if (i === 4) brush(t, 0.04);
    if ((i === 1 || i === 3 || i === 7) && Math.random() < 0.2) rhodes(t, SCALE[Math.floor(Math.random() * SCALE.length)], 0.09);
    nextT += e; step++;
  }
}
function scheduleThunder() { clearTimeout(thunderT); thunderT = setTimeout(() => { thunder(); scheduleThunder(); }, 22000 + Math.random() * 30000); }
function thunder(big) {
  if (!ctx || !on) return; if (root.NoirFx && root.NoirFx.flash) root.NoirFx.flash();
  const t = ctx.currentTime + 0.35 + Math.random() * 0.4;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf(4, true); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(70, t + 3);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(big ? 0.9 : 0.55, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
  s.connect(f); f.connect(g); g.connect(sfxG); s.start(t); s.stop(t + 4);
}
// ---- sfx
let lastTick = 0;
const S = {
  type() { if (!ctx || !on) return; const n = ctx.currentTime; if (n - lastTick < 0.045) return; lastTick = n; const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.05, false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200 + Math.random() * 900; f.Q.value = 2; const g = ctx.createGain(); g.gain.setValueAtTime(0.05, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.035); s.connect(f); f.connect(g); g.connect(sfxG); s.start(n); s.stop(n + 0.06); },
  tap() { if (!ctx || !on) return; tone(ctx.currentTime, 520, 0.08, 'triangle', 0.12, sfxG); },
  chime() { if (!ctx || !on) return; const t = ctx.currentTime; [76, 83, 88].forEach((m, i) => tone(t + i * 0.09, mtof(m), 1.1, 'sine', 0.12, sfxG)); },
  stamp() { if (!ctx || !on) return; const t = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + 0.4); const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.2, false); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200; const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.4, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.15); s.connect(f); f.connect(g2); g2.connect(sfxG); s.start(t); s.stop(t + 0.25); },
  sting() { if (!ctx || !on) return; const t = ctx.currentTime; [53, 59, 65, 71].forEach(m => { tone(t, mtof(m), 1.6, 'sawtooth', 0.045, sfxG); tone(t, mtof(m) * 1.003, 1.6, 'sawtooth', 0.04, sfxG); }); this.stamp(); },
  wrong() { if (!ctx || !on) return; const t = ctx.currentTime; tone(t, 196, 0.35, 'square', 0.06, sfxG); tone(t + 0.13, 156, 0.5, 'square', 0.06, sfxG); },
  heart() { if (!ctx || !on) return; const t = ctx.currentTime; [0, 0.18].forEach((d, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, t + d); o.frequency.exponentialRampToValueAtTime(40, t + d + 0.14); g.gain.setValueAtTime(i ? 0.5 : 0.8, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18); o.connect(g); g.connect(sfxG); o.start(t + d); o.stop(t + d + 0.22); }); },
  win() { if (!ctx || !on) return; const t = ctx.currentTime; [62, 66, 69, 74, 78].forEach((m, i) => tone(t + i * 0.12, mtof(m), 1.8, 'triangle', 0.1, sfxG)); },
  lose() { if (!ctx || !on) return; const t = ctx.currentTime; [57, 54, 50, 45].forEach((m, i) => tone(t + i * 0.28, mtof(m), 1.4, 'triangle', 0.1, sfxG)); },
  page() { if (!ctx || !on) return; const n = ctx.currentTime; const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.25, false); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(0.1, n + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.22); s.connect(f); f.connect(g); g.connect(sfxG); s.start(n); s.stop(n + 0.3); },
  thunder, setTension(n) { tension = n; },
};
root.NoirSnd = { start, setOn, isOn: () => on, started: () => started, ctx: () => ctx, sfx: S };
})(typeof window !== 'undefined' ? window : globalThis);
