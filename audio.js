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
let WN, PN, BN, IR, waves = {}, pre, musBus, musLP, tensG, droneO = [], style = 'title', styleT = null, bars = 0, tensTarget = 0;
let rain = {};
function mkNoise(sec, kind) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let b0 = 0, b1 = 0, b2 = 0, l = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1;
      if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else if (kind === 'brown') { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; }
      else d[i] = w; } }
  return b;
}
function impulse(sec) { const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const x = i / n; lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = lp * Math.pow(1 - x, 3.2) * (i < 40 ? i / 40 : 1); } }
  return b; }
// band-limited waves from explicit harmonic tables (no aliasing, warmer than raw saw/square)
function pw(h) { const re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1); h.forEach((v, i) => { im[i + 1] = v; }); return ctx.createPeriodicWave(re, im); }
function buildWaves() {
  const H = (n, f) => [...Array(n)].map((_, i) => f(i + 1));
  waves.warm = pw(H(12, n => (n % 2 ? 1 : 0.18) / (n * n) * (n === 1 ? 1 : 1.6)));
  waves.reed = pw(H(14, n => (n % 2 ? 1 : 0.12) / n * Math.exp(-n / 9)));
  waves.brass = pw(H(18, n => 1 / n * Math.exp(-n / 12)));
  waves.organ = pw(H(16, n => ({ 1: 1, 2: 0.8, 3: 0.55, 4: 0.5, 6: 0.3, 8: 0.25, 10: 0.08, 12: 0.1, 16: 0.06 }[n] || 0)));
  waves.string = pw(H(20, n => 1 / n * Math.exp(-n / 14) * (n % 2 ? 1 : 0.8)));
  waves.choir = pw(H(16, n => ({ 1: 1, 2: 0.6, 3: 0.75, 4: 0.3, 5: 0.25, 6: 0.18, 7: 0.1, 9: 0.06 }[n] || 0.02)));
}
function shaper(amt) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = (Math.tanh(amt * x + 0.18) - Math.tanh(0.18)) / Math.tanh(amt); } return c; }
function biq(type, f, q, gain) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (gain != null) b.gain.value = gain; return b; }
function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }

function start() {
  if (started || !AC) return; started = true;
  unlockIOS();
  try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { ctx = new AC(); }
  try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
  try { ctx.resume(); } catch (e) {}
  WN = mkNoise(2, 'white'); PN = mkNoise(3, 'pink'); BN = mkNoise(3, 'brown'); buildWaves();
  // master chain: sum -> HP -> low shelf warmth -> mid scoop -> high shelf (tame fizz) -> asymmetric tanh saturation (4x oversampled) -> glue comp -> limiter -> out
  master = ctx.createGain(); master.gain.value = on ? 0.9 : 0;
  pre = ctx.createGain(); pre.gain.value = 0.9;
  const sat = ctx.createWaveShaper(); sat.curve = shaper(1.6); sat.oversample = '4x';
  const glue = ctx.createDynamicsCompressor(); glue.threshold.value = -18; glue.ratio.value = 2.5; glue.attack.value = 0.02; glue.release.value = 0.25; glue.knee.value = 10;
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1; lim.knee.value = 0;
  chain(pre, biq('highpass', 34, 0.7), biq('lowshelf', 180, null, 2.5), biq('peaking', 2600, 0.8, -1.8), biq('highshelf', 8500, null, -4), sat, glue, master, lim, ctx.destination);
  const conv = ctx.createConvolver(); conv.buffer = IR = impulse(2.6); wet = ctx.createGain(); wet.gain.value = 0.32; chain(conv, biq('lowpass', 5200), wet, pre);
  // music bus with tape wobble (modulated short delay), mood low-pass and reverb send
  musBus = ctx.createGain(); musBus.gain.value = 1;
  const tape = ctx.createDelay(0.05); tape.delayTime.value = 0.012;
  const wob = ctx.createOscillator(), wobG = ctx.createGain(); wob.frequency.value = 0.55; wobG.gain.value = 0.0011; wob.connect(wobG); wobG.connect(tape.delayTime); wob.start();
  const flut = ctx.createOscillator(), flutG = ctx.createGain(); flut.frequency.value = 6.3; flutG.gain.value = 0.00012; flut.connect(flutG); flutG.connect(tape.delayTime); flut.start();
  musLP = biq('lowpass', 5200, 0.5);
  musG = ctx.createGain(); musG.gain.value = 0;
  chain(musBus, tape, musLP, musG, pre); musG.connect(conv);
  musG.gain.setTargetAtTime(0.62, ctx.currentTime, 1.2);
  rainG = ctx.createGain(); rainG.gain.value = 0.0; rainG.connect(pre); rainG.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5);
  sfxG = ctx.createGain(); sfxG.gain.value = 0.8; sfxG.connect(pre); const sfxSend = ctx.createGain(); sfxSend.gain.value = 0.5; sfxG.connect(sfxSend); sfxSend.connect(conv);
  tensG = ctx.createGain(); tensG.gain.value = 0; chain(tensG, biq('lowpass', 900, 0.7), musBus);
  buildRain(); buildDrone();
  nextT = ctx.currentTime + 0.3; step = 0;
  timer = setInterval(sched, 90);
  scheduleThunder(); dropLoop();
  document.addEventListener('visibilitychange', revive); addEventListener('pageshow', revive); addEventListener('focus', revive);
  ['touchend', 'click'].forEach(ev => document.addEventListener(ev, revive, true));
  setInterval(revive, 1500);
  setScene(style);
}
function revive() {
  if (!ctx) return;
  if (ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} }
  if (keepAlive && keepAlive.paused && on) { const p = keepAlive.play(); if (p && p.catch) p.catch(() => {}); }
}
function setOn(v) { on = !!v; try { localStorage.setItem('noir.snd', on ? '1' : '0'); } catch (e) {} if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.1); if (on && !started) start(); }

/* ---------- weather: hiss + body + gutter + droplets, shaped per setting ---------- */
function loopSrc(buf, rate) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate || 1; s.loopStart = 0; s.start(0, Math.random() * buf.duration); return s; }
function buildRain() {
  const hiss = loopSrc(WN), hb = biq('bandpass', 3800, 0.45), hg = ctx.createGain(); hg.gain.value = 0.16; chain(hiss, biq('highpass', 1200), hb, hg, rainG);
  const body = loopSrc(PN), bl = biq('lowpass', 1400, 0.4), bg = ctx.createGain(); bg.gain.value = 0.5; chain(body, biq('highpass', 220), bl, bg, rainG);
  const gut = loopSrc(BN, 0.8), gl = biq('bandpass', 420, 1.2), gg = ctx.createGain(); gg.gain.value = 0.35; chain(gut, gl, gg, rainG);
  const rum = loopSrc(BN, 0.5), rl = biq('lowpass', 90, 0.9), rg = ctx.createGain(); rg.gain.value = 0; chain(rum, rl, rg, rainG);
  const wind = loopSrc(PN, 0.7), wb = biq('bandpass', 600, 3), wg = ctx.createGain(); wg.gain.value = 0; chain(wind, wb, wg, rainG);
  // slow swell on the downpour
  const sw = ctx.createOscillator(), swg = ctx.createGain(); sw.frequency.value = 0.07; swg.gain.value = 0.06; sw.connect(swg); swg.connect(hg.gain); sw.start();
  const ww = ctx.createOscillator(), wwg = ctx.createGain(); ww.frequency.value = 0.11; wwg.gain.value = 380; ww.connect(wwg); wwg.connect(wb.frequency); ww.start();
  rain = { hg, bg, gg, rg, wg, drops: 1 };
}
const WEATHER = { // per setting: hiss, body, gutter, rumble, wind, droplet density
  title: [0.16, 0.5, 0.35, 0, 0, 1], club: [0.16, 0.5, 0.4, 0.05, 0, 1], manor: [0.2, 0.55, 0.15, 0, 0.35, 0.6],
  train: [0.1, 0.35, 0, 0.9, 0.08, 0.35], lab: [0.06, 0.15, 0, 0.1, 0.9, 0], studio: [0.12, 0.38, 0.3, 0.05, 0, 0.8],
};
function dropLoop() { // individual drips off a gutter: tiny pitched blips, randomly panned
  const go = () => { if (ctx && on && rain.drops > 0 && Math.random() < rain.drops) drip(); setTimeout(go, 70 + Math.random() * 260); }; go();
}
function drip() {
  const t = ctx.currentTime + 0.01, f = 900 + Math.random() * 2200, o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.05);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.018 + Math.random() * 0.03, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  if (p) { p.pan.value = Math.random() * 1.6 - 0.8; chain(o, g, p, rainG); } else chain(o, g, rainG);
  o.start(t); o.stop(t + 0.09);
}

/* ---------- instruments ---------- */
const now = () => ctx.currentTime;
function env(g, t, a, peak, dur, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur), rel || dur * 0.3); }
function osc(wave, f, t, stop, det) { const o = ctx.createOscillator(); if (waves[wave]) o.setPeriodicWave(waves[wave]); else o.type = wave; o.frequency.value = f; if (det) o.detune.value = det; o.start(t); o.stop(stop); return o; }
function pan(x) { if (!ctx.createStereoPanner) return ctx.createGain(); const p = ctx.createStereoPanner(); p.pan.value = x; return p; }
function ep(t, m, vol, dur, dest) { // rhodes-ish: sine body + fast decaying tine + bell
  const f = mtof(m), d = dur || 1.8, g = ctx.createGain(), p = pan((m - 60) / 30); env(g, t, 0.006, vol, d * 0.25, d * 0.35); chain(g, p, dest || musBus);
  osc('sine', f, t, t + d + 1).connect(g);
  const g2 = ctx.createGain(); env(g2, t, 0.002, vol * 0.5, 0.05, 0.12); osc('sine', f * 2, t, t + 0.8).connect(g2); g2.connect(p);
  const g3 = ctx.createGain(); env(g3, t, 0.001, vol * 0.12, 0.02, 0.05); osc('sine', f * 7.02, t, t + 0.3).connect(g3); g3.connect(p);
}
function vibe(t, m, vol) { const f = mtof(m), g = ctx.createGain(), p = pan(0.3); env(g, t, 0.003, vol, 0.3, 0.9); chain(g, p, musBus);
  const tr = ctx.createOscillator(), tg = ctx.createGain(); tr.frequency.value = 5.2; tg.gain.value = vol * 0.35; tr.connect(tg); tg.connect(g.gain); tr.start(t); tr.stop(t + 3);
  osc('sine', f, t, t + 3).connect(g); const g4 = ctx.createGain(); env(g4, t, 0.001, vol * 0.25, 0.05, 0.2); osc('sine', f * 4, t, t + 1).connect(g4); g4.connect(p); }
function bass(t, m, vol, dur) { // plucked upright: warm wave through a closing low-pass, plus a finger thump
  const f = mtof(m), g = ctx.createGain(), lp = biq('lowpass', 1100, 2); lp.frequency.setValueAtTime(1300, t); lp.frequency.exponentialRampToValueAtTime(240, t + 0.25);
  env(g, t, 0.008, vol, (dur || 0.5) * 0.6, 0.18); chain(osc('warm', f, t, t + (dur || 0.5) + 0.8), lp, g, musBus);
  const th = ctx.createGain(); env(th, t, 0.002, vol * 0.4, 0.02, 0.03); chain(osc('sine', f * 2, t, t + 0.15), th, musBus); }
function lead(t, m, vol, dur, wave, cut, bend) { // reed / harmonica / muted trumpet
  const f = mtof(m), g = ctx.createGain(), lp = biq('lowpass', cut || 1800, 1.2), o = osc(wave || 'reed', f, t, t + dur + 0.6), p = pan(-0.25);
  if (bend) { o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.09); }
  const vb = ctx.createOscillator(), vg = ctx.createGain(); vb.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6); vb.connect(vg); vg.connect(o.frequency); vb.start(t); vb.stop(t + dur + 0.6);
  lp.frequency.setValueAtTime((cut || 1800) * 0.6, t); lp.frequency.exponentialRampToValueAtTime(cut || 1800, t + 0.08);
  env(g, t, 0.05, vol, dur, 0.12); chain(o, lp, g, p, musBus); }
function pad(t, ms, vol, dur, wave, cut) { const g = ctx.createGain(), lp = biq('lowpass', cut || 1200, 0.6); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35); g.gain.setTargetAtTime(0.0001, t + dur * 0.8, dur * 0.25); chain(lp, g, musBus);
  ms.forEach((m, i) => { [-7, 7].forEach(d => { const o = osc(wave || 'string', mtof(m), t, t + dur * 1.6, d + (i % 2 ? 3 : -3)); o.connect(lp); }); }); }
function noiseHit(t, buf, type, f, q, vol, dur, dest, rate) { const s = ctx.createBufferSource(); s.buffer = buf || WN; s.playbackRate.value = rate || 1; const b = biq(type, f, q), g = ctx.createGain(); env(g, t, 0.002, vol, dur * 0.3, dur * 0.35); chain(s, b, g, dest || musBus); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.3); }
function brush(t, vol, long) { noiseHit(t, PN, 'bandpass', 5200, 0.6, vol, long ? 0.35 : 0.12); }
function ride(t, vol) { noiseHit(t, WN, 'bandpass', 8200, 2.5, vol, 0.5); const g = ctx.createGain(); env(g, t, 0.001, vol * 0.25, 0.1, 0.4); [1, 1.48, 2.13].forEach(r => osc('square', 2900 * r, t, t + 1).connect(g)); chain(g, biq('highpass', 6000), musBus); }
function kick(t, vol) { const g = ctx.createGain(), o = osc('sine', 110, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); env(g, t, 0.003, vol, 0.08, 0.1); chain(o, g, musBus); }
function clack(t, vol) { noiseHit(t, WN, 'bandpass', 1500, 4, vol, 0.05); noiseHit(t + 0.045, WN, 'bandpass', 1100, 4, vol * 0.8, 0.05); kick(t, vol * 0.5); }
function bell(t, m, vol) { const f = mtof(m), g = ctx.createGain(); env(g, t, 0.002, vol, 0.2, 2.2); chain(g, pan(-0.5), musBus); [1, 2.76, 5.4, 8.93].forEach((r, i) => { const gg = ctx.createGain(); gg.gain.value = [1, 0.5, 0.25, 0.12][i]; chain(osc('sine', f * r, t, t + 5), gg, g); }); }
function harpsi(t, m, vol) { const f = mtof(m), g = ctx.createGain(); env(g, t, 0.002, vol, 0.08, 0.35); chain(osc('brass', f, t, t + 1.4), biq('highpass', 300), g, pan(0.35), musBus); }
function ping(t, m, vol) { const f = mtof(m), g = ctx.createGain(); env(g, t, 0.004, vol, 0.05, 0.6); const dl = ctx.createDelay(1); dl.delayTime.value = 0.42; const fb = ctx.createGain(); fb.gain.value = 0.45; chain(osc('sine', f, t, t + 2.5), g, musBus); g.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(musBus); setTimeout(() => { try { fb.disconnect(); } catch (e) {} }, (t - now() + 4) * 1000); }

/* ---------- per-setting combos ---------- */
const R = () => Math.random();
const pk = a => a[Math.floor(R() * a.length)];
const STYLES = {
  // smoky swing combo: rhodes, walking bass, brushes, muted sax
  club: { bpm: 72, div: 2, swing: 0.18, ch: [[50, 53, 57, 60, 64], [43, 53, 59, 62, 64], [48, 52, 55, 59, 62], [45, 49, 55, 58, 61]], sc: [62, 64, 65, 67, 69, 72, 74, 76],
    play(t, bar, i, s, ch, tn) { if (i % 2 === 0) bass(t, ch[0] - 12 + [0, 7, 12, 10][i / 2] - (i === 6 ? 1 : 0), 0.55);
      if (i === 0 || (i === 5 && R() < 0.6) || (i === 3 && R() < 0.3)) ch.slice(1).forEach((m, k) => ep(t + k * 0.011, m, 0.06));
      if (i % 2 === 0) ride(t, 0.035); if (i === 2 || i === 6) brush(t, 0.08, true); if (i === 5) brush(t, 0.04);
      if (bar % 2 === 1 && (i === 1 || i === 3) && R() < 0.6) lead(t, pk(s.sc) - 12, 0.09, 0.5, 'reed', 1500, true);
      if (tn > 0.5 && i === 0) kick(t, 0.25); } },
  // candle-lit manor: organ pad, harpsichord arpeggio, chapel bell, slow 3/4-ish
  manor: { bpm: 58, div: 2, swing: 0, ch: [[45, 57, 60, 64], [41, 57, 60, 65], [38, 57, 62, 65], [40, 56, 59, 64]], sc: [57, 59, 60, 62, 64, 65, 68, 69],
    play(t, bar, i, s, ch, tn) { if (i === 0) { pad(t, ch.slice(1), 0.05, 4.4, 'organ', 1600); bass(t, ch[0], 0.4, 1.6); }
      if (i % 1 === 0) harpsi(t, ch[1 + (i % 3)] + (i > 3 ? 12 : 0), 0.05);
      if (i === 0 && bar === 0 && R() < 0.5) bell(t, 69, 0.06);
      if (tn > 0.5 && (i === 0 || i === 4)) kick(t, 0.2); } },
  // night train: 6/8 shuffle, track clack, harmonica, brushed snare
  train: { bpm: 84, div: 3, swing: 0, ch: [[43, 55, 59, 62], [48, 55, 60, 64], [43, 55, 59, 62], [50, 54, 57, 60]], sc: [55, 57, 59, 62, 64, 67],
    play(t, bar, i, s, ch, tn) { if (i === 0 || i === 3) clack(t, 0.18); if (i === 0) bass(t, ch[0], 0.5, 0.6); if (i === 3) bass(t, ch[0] + 7, 0.4, 0.5);
      if (i === 1 || i === 4) ch.slice(1).forEach((m, k) => ep(t + k * 0.008, m, 0.035, 0.5)); brush(t, i % 3 === 0 ? 0.06 : 0.025);
      if (bar % 2 === 0 && (i === 2 || i === 5) && R() < 0.55) lead(t, pk(s.sc) + 12, 0.07, 0.4, 'reed', 2600, true); } },
  // arctic station: drifting pad, sonar pings, glass vibes, no drums
  lab: { bpm: 52, div: 2, swing: 0, ch: [[38, 57, 62, 64, 69], [41, 57, 60, 65, 67], [36, 55, 60, 62, 67], [43, 55, 59, 62, 66]], sc: [69, 74, 76, 79, 81, 86],
    play(t, bar, i, s, ch, tn) { if (i === 0) { pad(t, ch.slice(1), 0.045, 5, 'string', 900 + tn * 1500); bass(t, ch[0], 0.25, 3); }
      if (i === 2 && R() < 0.5) ping(t, pk(s.sc), 0.05); if (i === 6 && R() < 0.4) vibe(t, pk(s.sc) - 12, 0.04);
      if (tn > 0.4 && i % 2 === 0) noiseHit(t, WN, 'highpass', 7000, 0.7, 0.015 + tn * 0.02, 0.05); } },
  // soundstage: brisk big-band small group, vibes, muted trumpet, ride
  studio: { bpm: 104, div: 2, swing: 0.2, ch: [[41, 57, 60, 64, 67], [50, 57, 60, 65, 66], [43, 58, 62, 65, 69], [48, 58, 64, 67, 70]], sc: [65, 67, 69, 72, 74, 77, 79],
    play(t, bar, i, s, ch, tn) { if (i % 2 === 0) bass(t, ch[0] + [0, 4, 7, 9][i / 2] - 12 + 12, 0.5, 0.35);
      if (i % 2 === 0) ride(t, 0.04); if (i === 3 || i === 7) brush(t, 0.07);
      if (i === 1 || (i === 4 && R() < 0.5)) ch.slice(1).forEach(m => vibe(t, m, 0.03));
      if ((i === 0 || i === 3 || i === 6) && bar % 2 === 1 && R() < 0.7) lead(t, pk(s.sc), 0.08, 0.25, 'brass', 1300, false); } },
};
STYLES.title = Object.assign({}, STYLES.club, { bpm: 64 });
function setScene(id) { style = STYLES[id] ? id : 'title';
  if (!ctx) return; const w = WEATHER[style] || WEATHER.title, n = now();
  [rain.hg, rain.bg, rain.gg, rain.rg, rain.wg].forEach((g, i) => g && g.gain.setTargetAtTime(w[i], n, 1.5)); rain.drops = w[5]; }
function sched() {
  if (!ctx) return;
  while (nextT < ctx.currentTime + 0.3) {
    const s = STYLES[style], per = s.div * 4, bpm = s.bpm * (1 + tension * 0.1), e = 60 / bpm / s.div, bar = Math.floor(step / per) % 4, i = step % per;
    const sw = (s.swing && i % 2) ? e * s.swing : 0, t = nextT + sw;
    if (on) { try { s.play(t, bar, i, s, s.ch[bar], tension); tensionLayer(t, i, e, per); } catch (er) { if (!sched.err) { sched.err = 1; console.error('audio: ' + er.message); } } }
    nextT += e; step++;
  }
}
function buildDrone() { // tension: tremolo strings drone and pulse, faded in as the clock runs down
  [38, 45, 51].forEach((m, k) => { const o = osc('string', mtof(m), now(), now() + 1e6, k * 5 - 5), g = ctx.createGain(); g.gain.value = 0.18;
    const tr = ctx.createOscillator(), tg = ctx.createGain(); tr.frequency.value = 6.5 + k * 0.7; tg.gain.value = 0.12; tr.connect(tg); tg.connect(g.gain); tr.start();
    chain(o, g, tensG); droneO.push(o); }); }
function tensionLayer(t, i, e, per) { if (tension > 0.55 && i === 0) heartAt(t, 0.35 * tension); if (tension > 0.85 && i === per / 2) heartAt(t, 0.3); }
function heartAt(t, vol) { [0, 0.17].forEach((d, k) => { const g = ctx.createGain(), o = osc('sine', 68, t + d, t + d + 0.4); o.frequency.exponentialRampToValueAtTime(38, t + d + 0.16); env(g, t + d, 0.004, vol * (k ? 0.7 : 1), 0.06, 0.08); chain(o, g, sfxG); }); }
function setTension(x) { x = Math.max(0, Math.min(1, +x || 0)); tension = x; if (!ctx) return; const n = now();
  tensG.gain.setTargetAtTime(x < 0.3 ? 0 : (x - 0.3) * 0.09, n, 1.2); musLP.frequency.setTargetAtTime(3400 + x * 4000, n, 1); }
function scheduleThunder() { clearTimeout(thunderT); thunderT = setTimeout(() => { if (style !== 'lab') thunder(); scheduleThunder(); }, 22000 + Math.random() * 30000); }
function thunder(big) {
  if (!ctx || !on) return; if (root.NoirFx && root.NoirFx.flash) root.NoirFx.flash();
  const t = now() + 0.3 + Math.random() * 0.4;
  noiseHit(t, WN, 'highpass', 2500, 0.5, big ? 0.35 : 0.18, 0.12, sfxG); // the crack
  const s = ctx.createBufferSource(); s.buffer = BN; const f = biq('lowpass', 700, 0.8); f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(60, t + 3.4);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(big ? 1.1 : 0.7, t + 0.09); g.gain.setTargetAtTime(0.0001, t + 0.6, 1.1);
  chain(s, f, g, sfxG); s.start(t, Math.random()); s.stop(t + 5);
}
/* ---------- sfx ---------- */
let lastTick = 0, lastBrush = 0;
const S = {
  type() { if (!ctx || !on) return; const n = now(); if (n - lastTick < 0.05) return; lastTick = n; noiseHit(n, WN, 'bandpass', 2600 + Math.random() * 900, 3, 0.05, 0.025, sfxG); },
  tap() { if (!ctx || !on) return; const t = now(); noiseHit(t, WN, 'bandpass', 1800, 6, 0.08, 0.03, sfxG); const g = ctx.createGain(); env(g, t, 0.002, 0.05, 0.02, 0.04); chain(osc('sine', 660, t, t + 0.2), g, sfxG); },
  chime() { if (!ctx || !on) return; const t = now(); [76, 83, 88].forEach((m, i) => { const g = ctx.createGain(); env(g, t + i * 0.08, 0.003, 0.07, 0.1, 0.5); chain(osc('sine', mtof(m), t + i * 0.08, t + 2), g, sfxG); }); },
  // pin pulled tight on the corkboard: plucked string + thunk
  link() { if (!ctx || !on) return; const t = now(); [0, 0.07].forEach((d, k) => { const f = k ? 1174 : 784, g = ctx.createGain(), o = osc('brass', f, t + d, t + d + 1); o.frequency.setValueAtTime(f * 1.03, t + d); o.frequency.exponentialRampToValueAtTime(f, t + d + 0.05); env(g, t + d, 0.002, 0.07, 0.04, 0.22); chain(o, biq('lowpass', 3200, 4), g, sfxG); });
    noiseHit(t, PN, 'lowpass', 400, 1, 0.3, 0.06, sfxG); },
  // the lie breaks: dissonant brass stab + timpani + cymbal swell
  contra() { if (!ctx || !on) return; const t = now(); [50, 56, 61, 63].forEach((m, i) => { const g = ctx.createGain(); env(g, t, 0.01, 0.06, 0.25, 0.4); chain(osc('brass', mtof(m), t, t + 2, i * 6 - 9), biq('lowpass', 2400, 1), g, sfxG); });
    const g = ctx.createGain(), o = osc('sine', 98, t, t + 2); o.frequency.exponentialRampToValueAtTime(70, t + 0.6); env(g, t, 0.003, 0.5, 0.15, 0.4); chain(o, g, sfxG);
    noiseHit(t, WN, 'highpass', 6000, 0.5, 0.06, 0.9, sfxG); },
  stamp() { if (!ctx || !on) return; const t = now(); const g = ctx.createGain(), o = osc('sine', 150, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(42, t + 0.25); env(g, t, 0.002, 0.8, 0.06, 0.12); chain(o, g, sfxG); noiseHit(t, PN, 'lowpass', 900, 1, 0.4, 0.08, sfxG); },
  sting() { if (!ctx || !on) return; const t = now(); [53, 59, 65, 71].forEach((m, i) => { const g = ctx.createGain(); env(g, t, 0.02, 0.045, 0.6, 0.6); chain(osc('string', mtof(m), t, t + 3, i * 4 - 6), biq('lowpass', 2600), g, sfxG); }); this.stamp(); },
  // the accusation: three gavel knocks, then a low choir
  accuse() { if (!ctx || !on) return; const t = now(); [0, 0.32, 0.64].forEach(d => { noiseHit(t + d, PN, 'bandpass', 700, 3, 0.6, 0.07, sfxG); const g = ctx.createGain(), o = osc('sine', 190, t + d, t + d + 0.3); o.frequency.exponentialRampToValueAtTime(120, t + d + 0.1); env(g, t + d, 0.002, 0.4, 0.04, 0.06); chain(o, g, sfxG); });
    const c = t + 0.95, g = ctx.createGain(); g.gain.setValueAtTime(0.0001, c); g.gain.exponentialRampToValueAtTime(0.09, c + 0.8); g.gain.setTargetAtTime(0.0001, c + 2, 0.8);
    const f1 = biq('bandpass', 700, 4), f2 = biq('bandpass', 1150, 5); f1.connect(g); f2.connect(g); g.connect(sfxG);
    [45, 52, 57, 60, 64].forEach((m, i) => { [-8, 8].forEach(dt => { const o = osc('choir', mtof(m), c, c + 5, dt); o.connect(f1); o.connect(f2); const vb = ctx.createOscillator(), vg = ctx.createGain(); vb.frequency.value = 4.6 + i * 0.2; vg.gain.value = 3; vb.connect(vg); vg.connect(o.detune); vb.start(c); vb.stop(c + 5); }); }); },
  wrong() { if (!ctx || !on) return; const t = now(); [[196, 0], [156, 0.13]].forEach(([f, d]) => { const g = ctx.createGain(); env(g, t + d, 0.01, 0.09, 0.2, 0.15); chain(osc('reed', f, t + d, t + d + 0.8), biq('lowpass', 1200), g, sfxG); }); },
  heart() { if (!ctx || !on) return; heartAt(now(), 0.6); },
  win() { if (!ctx || !on) return; const t = now(); [62, 66, 69, 74, 78].forEach((m, i) => ep(t + i * 0.11, m, 0.09, 2.4, sfxG)); },
  lose() { if (!ctx || !on) return; const t = now(); [57, 54, 50, 45].forEach((m, i) => lead(t + i * 0.3, m, 0.09, 0.5, 'reed', 1100, true)); },
  // fingerprint duster: soft bristle swish (throttled), and the puff when the print lifts
  brush(v) { if (!ctx || !on) return; const n = now(); if (n - lastBrush < 0.045) return; lastBrush = n; noiseHit(n, PN, 'bandpass', 3200 + Math.random() * 2600, 1.2, 0.03 + Math.min(0.06, (v || 0) * 0.004), 0.07, sfxG, 1.2 + Math.random() * 0.5); },
  puff() { if (!ctx || !on) return; const t = now(); noiseHit(t, PN, 'lowpass', 1400, 0.7, 0.22, 0.45, sfxG, 0.8); noiseHit(t + 0.05, WN, 'highpass', 5200, 0.6, 0.05, 0.35, sfxG);
    [79, 86, 91].forEach((m, i) => { const g = ctx.createGain(); env(g, t + 0.18 + i * 0.06, 0.004, 0.05, 0.12, 0.9); chain(osc('sine', mtof(m), t + 0.18 + i * 0.06, t + 2.4), g, sfxG); }); },
  page() { if (!ctx || !on) return; const t = now(); noiseHit(t, PN, 'bandpass', 2200, 0.8, 0.12, 0.18, sfxG, 1.4); },
  thunder, setTension,
};
root.NoirSnd = { start, setOn, setScene, isOn: () => on, started: () => started, ctx: () => ctx, sfx: S, style: () => style };
})(typeof window !== 'undefined' ? window : globalThis);
