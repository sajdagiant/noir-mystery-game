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
// the chase: instrumental only. Driving octave bass, four-on-the-floor kick, backbeat snare, brass stabs, tremolo strings
function snare(t, vol) { noiseHit(t, WN, 'bandpass', 1900, 0.8, vol, 0.16); const g = ctx.createGain(), o = osc('sine', 200, t, t + 0.3); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); env(g, t, 0.002, vol * 0.9, 0.03, 0.06); chain(o, g, musBus); }
STYLES.chase = { bpm: 172, div: 2, swing: 0, ch: [[40, 52, 55, 59], [40, 52, 55, 59], [36, 52, 55, 60], [38, 50, 54, 57]], sc: [64, 67, 69, 71, 74, 76, 79],
  play(t, bar, i, s, ch) { bass(t, ch[0] + (i % 2 ? 12 : 0), 0.5, 0.15);
    if (i % 2 === 0) kick(t, 0.5); if (i === 2 || i === 6) snare(t, 0.26); if (i === 7 && bar === 3) snare(t, 0.18);
    noiseHit(t, WN, 'highpass', 8200, 0.7, i % 2 ? 0.018 : 0.034, 0.04);
    if (i === 0 || (i === 3 && bar % 2 === 1)) ch.slice(1).forEach((m, k) => lead(t + k * 0.006, m + 12, 0.045, 0.16, 'brass', 2600, false));
    if (i === 0 && bar % 2 === 0) pad(t, ch.slice(1).map(m => m + 12), 0.025, 2.6, 'string', 2400);
    if (bar === 3 && i >= 4) lead(t, s.sc[i - 2], 0.06, 0.12, 'brass', 3000, false); } };
// the safe: instrumental only. Hushed heist vamp: pizzicato bass, brushed hat, a low tremolo string, a muted vibe that leaves room for the clicks
STYLES.safe = { bpm: 92, div: 2, swing: 0.12, ch: [[38, 53, 57, 60], [38, 53, 57, 61], [36, 52, 55, 60], [37, 52, 56, 59]], sc: [62, 65, 67, 68, 69, 72],
  play(t, bar, i, s, ch) { if (i === 0 || i === 3 || i === 6) bass(t, ch[0] + (i === 3 ? 7 : i === 6 ? 12 : 0), 0.32, 0.18);
    if (i % 2 === 1) noiseHit(t, WN, 'highpass', 7800, 0.7, 0.012, 0.03); if (i === 4) brush(t, 0.04);
    if (i === 0 && bar % 2 === 0) pad(t, ch.slice(1).map(m => m - 12), 0.02, 4.4, 'string', 700);
    if (bar === 3 && (i === 2 || i === 5) && R() < 0.8) vibe(t, pk(s.sc), 0.025); } };
// the lift: instrumental only. Tiptoe vamp: staccato pizzicato bass creeping chromatically, finger snaps on 2 and 4, a muted vibe answering on the offbeats
STYLES.lift = { bpm: 100, div: 2, swing: 0.16, ch: [[45, 60, 64, 67], [45, 60, 63, 67], [44, 59, 62, 65], [43, 58, 62, 65]], sc: [69, 72, 74, 75, 76, 79],
  play(t, bar, i, s, ch) { if (i % 2 === 0) bass(t, ch[0] + [0, 7, 12, 6][i / 2], 0.34, 0.09); if (i === 7 && bar % 2) bass(t, ch[0] + 11, 0.22, 0.07);
    if (i === 2 || i === 6) { noiseHit(t, WN, 'bandpass', 2300, 3, 0.05, 0.03); noiseHit(t + 0.004, PN, 'bandpass', 900, 2, 0.03, 0.04); }
    if (i % 2 === 1) noiseHit(t, WN, 'highpass', 8000, 0.7, 0.008, 0.025);
    if ((i === 3 || i === 7) && R() < 0.55) vibe(t, pk(s.sc) - 12, 0.022); if (i === 0 && bar === 0) pad(t, ch.slice(1).map(m => m - 12), 0.016, 4.2, 'string', 650); } };
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
let lastTick = 0, lastBrush = 0, ther = null, polyN = null;
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
  // tactile evidence: glass squeak (fog wipe), paper rip (ticket stub), match strike, UV ballast buzz, red-string twang
  squeak(v) { if (!ctx || !on) return; const n = now(); if (n - lastBrush < 0.06) return; lastBrush = n; const f = 900 + Math.random() * 700 + Math.min(600, (v || 0) * 18), g = ctx.createGain(), o = osc('sine', f, n, n + 0.25); o.frequency.exponentialRampToValueAtTime(f * (1.12 + Math.random() * 0.2), n + 0.12); env(g, n, 0.01, 0.022, 0.08, 0.05); chain(o, biq('bandpass', f, 3), g, sfxG); noiseHit(n, PN, 'bandpass', 2600, 2, 0.018, 0.08, sfxG, 1.5); },
  rip(v) { if (!ctx || !on) return; const n = now(); if (n - lastBrush < 0.035) return; lastBrush = n; noiseHit(n, WN, 'bandpass', 1600 + Math.random() * 2400, 1.4, 0.05 + Math.min(0.08, (v || 0) * 0.004), 0.05, sfxG, 0.8 + Math.random()); },
  strike() { if (!ctx || !on) return; const t = now(); noiseHit(t, WN, 'highpass', 3000, 0.8, 0.2, 0.12, sfxG, 1.3); noiseHit(t + 0.07, PN, 'lowpass', 900, 0.6, 0.28, 1.0, sfxG, 0.6); noiseHit(t + 0.1, PN, 'bandpass', 500, 0.7, 0.08, 1.6, sfxG, 0.4); },
  buzz(v) { if (!ctx || !on) return; const t = now(); const g = ctx.createGain(); env(g, t, 0.02, 0.012 + (v || 0) * 0.02, 0.18, 0.12); chain(osc('sawtooth', 120, t, t + 0.5), biq('lowpass', 520, 2), g, sfxG); },
  twang() { if (!ctx || !on) return; const t = now(); [0, 0.012].forEach((d, k) => { const f = k ? 330 : 220, g = ctx.createGain(), o = osc('triangle', f * 1.03, t + d, t + d + 1.4); o.frequency.exponentialRampToValueAtTime(f, t + d + 0.08); env(g, t + d, 0.002, 0.11, 0.14, 0.55); chain(o, biq('lowpass', 2400, 2), g, sfxG); }); },
  // séance: a theremin that follows the planchette, a hushed minor drone, glass tings on each letter, candles snuffed at the end
  seance(onOff) { if (!ctx) return; const t = now();
    if (onOff) {
      if (ther) return; musG.gain.setTargetAtTime(0.12, t, 0.6); rainG.gain.setTargetAtTime(0.18, t, 0.8);
      const g = ctx.createGain(); g.gain.value = 0.0001; const lp = biq('lowpass', 2600, 0.7), o = ctx.createOscillator(), o2 = ctx.createOscillator(), h = ctx.createGain(); h.gain.value = 0.18;
      o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = 440; o2.frequency.value = 880;
      const vb = ctx.createOscillator(), vg = ctx.createGain(); vb.frequency.value = 5.4; vg.gain.value = 9; vb.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
      o.connect(lp); chain(o2, h, lp); chain(lp, g, sfxG); o.start(t); o2.start(t); vb.start(t);
      const dg = ctx.createGain(); dg.gain.value = 0.0001; dg.gain.setTargetAtTime(0.05, t, 1.5); const dl = biq('lowpass', 700, 0.6); chain(dl, dg, sfxG);
      const drones = [38, 45, 50, 53].map((m, i) => { const d = osc('string', mtof(m), t, t + 600, i * 5 - 7); d.connect(dl); return d; });
      ther = { g, o, o2, vb, dg, drones };
    } else {
      if (!ther) return; const T = ther; ther = null; musG.gain.setTargetAtTime(0.62, t, 1.2); rainG.gain.setTargetAtTime(0.5, t, 1.5);
      T.g.gain.setTargetAtTime(0.0001, t, 0.15); T.dg.gain.setTargetAtTime(0.0001, t, 0.5);
      setTimeout(() => { [T.o, T.o2, T.vb].concat(T.drones).forEach(x => { try { x.stop(); } catch (e) {} }); }, 3000);
    } },
  // x,y in 0..1 across the board; amp 0..1 (finger down = singing)
  theremin(x, y, amp) { if (!ther || !on) return; const t = now(), f = 196 * Math.pow(2, x * 2.2 + (1 - y) * 0.6);
    ther.o.frequency.setTargetAtTime(f, t, 0.09); ther.o2.frequency.setTargetAtTime(f * 2.003, t, 0.09); ther.g.gain.setTargetAtTime(Math.max(0.0001, (amp || 0) * 0.07), t, 0.12); },
  ting(i) { if (!ctx || !on) return; const t = now(), m = [69, 72, 76, 77, 81, 84, 88][(i || 0) % 7]; bell(t, m, 0.05);
    const g = ctx.createGain(); env(g, t, 0.002, 0.04, 0.05, 1.2); chain(osc('sine', mtof(m + 12), t, t + 3, 7), g, sfxG); },
  snuff() { if (!ctx || !on) return; const t = now(); noiseHit(t, PN, 'lowpass', 900, 0.6, 0.35, 0.7, sfxG, 0.7); noiseHit(t + 0.1, WN, 'bandpass', 2400, 1, 0.06, 0.6, sfxG);
    [45, 52, 56].forEach((m, i) => { const g = ctx.createGain(); env(g, t + 0.3 + i * 0.12, 0.08, 0.05, 0.8, 1.4); chain(osc('choir', mtof(m), t + 0.3, t + 5, i * 5 - 5), biq('lowpass', 1600), g, sfxG); }); },
  // the lie box: chart-motor hum + pen scratch while the paper rolls, heartbeats on every pulse, an alarm bell on a spike, a sinking tone when the needle goes flat
  poly(onOff) { if (!ctx) return; const t = now();
    if (onOff) {
      if (polyN) return; musG.gain.setTargetAtTime(0.18, t, 0.5);
      const mg = ctx.createGain(); mg.gain.value = 0.0001; const m1 = osc('sawtooth', 58, t, t + 900), m2 = osc('sawtooth', 116.7, t, t + 900), ml = biq('lowpass', 260, 2);
      chain(m1, ml); chain(m2, ml); chain(ml, mg, sfxG);
      const sc = loopSrc(PN, 1.6), sb = biq('bandpass', 4200, 2.2), sg = ctx.createGain(); sg.gain.value = 0.0001; chain(sc, biq('highpass', 1800), sb, sg, sfxG);
      polyN = { mg, sg, sb, m1, m2, sc };
    } else {
      if (!polyN) return; const P = polyN; polyN = null; musG.gain.setTargetAtTime(0.62, t, 1);
      P.mg.gain.setTargetAtTime(0.0001, t, 0.1); P.sg.gain.setTargetAtTime(0.0001, t, 0.05);
      setTimeout(() => { [P.m1, P.m2, P.sc].forEach(x => { try { x.stop(); } catch (e) {} }); }, 800);
    } },
  // rolling 0/1, pen speed 0..1
  polyRoll(rolling, speed) { if (!polyN || !on) return; const t = now();
    polyN.mg.gain.setTargetAtTime(rolling ? 0.05 : 0.0001, t, rolling ? 0.08 : 0.15);
    polyN.sg.gain.setTargetAtTime(rolling ? 0.015 + Math.min(1, speed || 0) * 0.11 : 0.0001, t, 0.03);
    polyN.sb.frequency.setTargetAtTime(3200 + Math.min(1, speed || 0) * 3600, t, 0.05); },
  beat(vol) { if (!ctx || !on) return; heartAt(now(), vol == null ? 0.5 : vol); },
  polyAlarm() { if (!ctx || !on) return; const t = now(); for (let k = 0; k < 8; k++) { const g = ctx.createGain(), tt = t + k * 0.07; env(g, tt, 0.002, 0.05, 0.03, 0.12); chain(osc('square', mtof(k % 2 ? 84 : 88), tt, tt + 0.5), biq('lowpass', 3500), g, sfxG); }
    noiseHit(t, WN, 'bandpass', 5200, 3, 0.12, 0.25, sfxG, 1.3); },
  polyFlat() { if (!ctx || !on) return; const t = now(); [50, 49].forEach((m, i) => { const g = ctx.createGain(); env(g, t + i * 0.02, 0.4, 0.05, 1.6, 1.2); const o = osc('sine', mtof(m + 12), t, t + 5, i * 9); o.frequency.exponentialRampToValueAtTime(mtof(m + 5), t + 2.6); chain(o, g, sfxG); }); },
  polyTrue() { if (!ctx || !on) return; const t = now(); [76, 81].forEach((m, i) => { const g = ctx.createGain(), tt = t + i * 0.09; env(g, tt, 0.002, 0.05, 0.05, 0.6); chain(osc('sine', mtof(m), tt, tt + 2), g, sfxG); }); },
  // the safe
  dial(k) { if (!ctx || !on) return; const t = now(); noiseHit(t, WN, 'bandpass', 3800 + (k || 0) * 60, 9, 0.07, 0.012, sfxG); const g = ctx.createGain(); env(g, t, 0.001, 0.02, 0.01, 0.03); chain(osc('square', 2400 + (k || 0) * 20, t, t + 0.1), biq('bandpass', 2600, 10), g, sfxG); },
  tumbler() { if (!ctx || !on) return; const t = now(); const g = ctx.createGain(), o = osc('sine', 210, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(95, t + 0.09); env(g, t, 0.001, 0.4, 0.03, 0.08); chain(o, g, sfxG);
    noiseHit(t, WN, 'bandpass', 1200, 6, 0.3, 0.035, sfxG); [1, 2.7].forEach((r, i) => { const gg = ctx.createGain(); env(gg, t, 0.001, 0.03 / (i + 1), 0.02, 0.18); chain(osc('sine', 880 * r, t, t + 0.6), gg, sfxG); }); },
  wheelSet(n) { if (!ctx || !on) return; const t = now(); this.tumbler(); const g = ctx.createGain(), o = osc('sine', 120, t + 0.04, t + 0.6); o.frequency.exponentialRampToValueAtTime(48, t + 0.25); env(g, t + 0.04, 0.002, 0.6, 0.08, 0.14); chain(o, g, sfxG);
    noiseHit(t + 0.04, PN, 'lowpass', 600, 1, 0.5, 0.1, sfxG); const m = [69, 72, 76][Math.min(2, n || 0)], g2 = ctx.createGain(); env(g2, t + 0.12, 0.002, 0.05, 0.08, 1.1); chain(osc('sine', mtof(m), t + 0.12, t + 3), g2, sfxG); },
  wheelBad() { if (!ctx || !on) return; const t = now(); for (let k = 0; k < 5; k++) noiseHit(t + k * 0.035, WN, 'bandpass', 900 + Math.random() * 1400, 7, 0.16, 0.04, sfxG); const g = ctx.createGain(); env(g, t, 0.005, 0.06, 0.12, 0.15); chain(osc('reed', 98, t, t + 0.6), biq('lowpass', 700), g, sfxG); },
  safeOpen() { if (!ctx || !on) return; const t = now(); noiseHit(t, PN, 'bandpass', 500, 2, 0.6, 0.25, sfxG, 0.6); // the bolts slide back
    const g = ctx.createGain(), o = osc('sawtooth', 70, t + 0.3, t + 2.2); o.frequency.setValueAtTime(70, t + 0.3); o.frequency.linearRampToValueAtTime(92, t + 0.9); o.frequency.linearRampToValueAtTime(64, t + 1.6); // the hinge
    env(g, t + 0.3, 0.1, 0.05, 1.1, 0.3); chain(o, biq('bandpass', 1100, 9), g, sfxG);
    [50, 57, 62, 66, 69, 74].forEach((m, i) => { const gg = ctx.createGain(); env(gg, t + 0.9 + i * 0.05, 0.01, 0.05, 0.7, 1); chain(osc('brass', mtof(m), t + 0.9 + i * 0.05, t + 4, i * 4 - 8), biq('lowpass', 2600, 1), gg, sfxG); }); },
  boom() { if (!ctx || !on) return; const t = now(); noiseHit(t, PN, 'lowpass', 500, 0.7, 1.4, 1.6, sfxG, 0.5); noiseHit(t, WN, 'highpass', 2000, 0.5, 0.4, 0.3, sfxG);
    const g = ctx.createGain(), o = osc('sine', 90, t, t + 2); o.frequency.exponentialRampToValueAtTime(28, t + 0.9); env(g, t, 0.003, 1, 0.3, 0.6); chain(o, g, sfxG);
    for (let k = 0; k < 14; k++) noiseHit(t + 0.4 + Math.random() * 1.2, WN, 'bandpass', 2000 + Math.random() * 4000, 8, 0.05 + Math.random() * 0.08, 0.05, sfxG); }, // debris
  fuse() { if (!ctx || !on) return; const t = now(); for (let k = 0; k < 22; k++) noiseHit(t + k * 0.07 + Math.random() * 0.03, WN, 'highpass', 5000 + Math.random() * 3000, 1, 0.03 + Math.random() * 0.04, 0.04, sfxG); },
  // the chase
  // the lift
  liftMode(onOff) { if (!ctx || !musG) return; musG.gain.setTargetAtTime(onOff ? 0.5 : 0.62, now(), 0.4); },
  freeze(onOff) { if (!ctx || !musG) return; musG.gain.setTargetAtTime(onOff ? 0.03 : 0.5, now(), onOff ? 0.03 : 0.12); },
  rustle(v) { if (!ctx || !on) return; const n = now(); if (n - lastBrush < 0.05) return; lastBrush = n; const k = Math.min(1, (v || 0) / 600);
    noiseHit(n, PN, 'bandpass', 700 + Math.random() * 900 + k * 800, 0.9, 0.025 + k * 0.07, 0.09, sfxG, 0.7 + Math.random() * 0.4); },
  hm() { if (!ctx || !on) return; const t = now(); [[150, 0.07], [300, 0.025]].forEach(([f, v]) => { const g = ctx.createGain(), o = osc('triangle', f, t, t + 0.6); o.frequency.setValueAtTime(f, t + 0.08); o.frequency.exponentialRampToValueAtTime(f * 1.24, t + 0.32);
    env(g, t, 0.04, v, 0.22, 0.08); chain(o, biq('lowpass', 900, 0.8), g, sfxG); }); },
  grab() { if (!ctx || !on) return; const t = now(); const g = ctx.createGain(), o = osc('sine', 140, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(50, t + 0.16); env(g, t, 0.002, 0.45, 0.05, 0.1); chain(o, g, sfxG);
    noiseHit(t, PN, 'lowpass', 1100, 0.7, 0.3, 0.14, sfxG, 0.8); [[110, 0.12], [98, 0.34]].forEach(([f, d]) => { const gg = ctx.createGain(); env(gg, t + d, 0.02, 0.06, 0.25, 0.25); chain(osc('reed', f, t + d, t + d + 1), biq('lowpass', 800), gg, sfxG); }); },
  flutter() { if (!ctx || !on) return; const t = now(); for (let k = 0; k < 6; k++) noiseHit(t + k * 0.06, PN, 'bandpass', 900 + k * 260, 1.1, 0.06 - k * 0.006, 0.08, sfxG, 1 + k * 0.08);
    [79, 84, 88].forEach((m, i) => { const g = ctx.createGain(); env(g, t + 0.25 + i * 0.09, 0.003, 0.045, 0.08, 0.7); chain(osc('sine', mtof(m), t + 0.25 + i * 0.09, t + 3), g, sfxG); }); },
  jump() { if (!ctx || !on) return; const t = now(); noiseHit(t, PN, 'bandpass', 1300, 0.9, 0.16, 0.2, sfxG, 1.4); const g = ctx.createGain(), o = osc('sine', 260, t, t + 0.3); o.frequency.exponentialRampToValueAtTime(520, t + 0.12); env(g, t, 0.004, 0.03, 0.06, 0.08); chain(o, g, sfxG); },
  land(v) { if (!ctx || !on) return; const t = now(), k = Math.min(1, v || 0.5); const g = ctx.createGain(), o = osc('sine', 130, t, t + 0.4); o.frequency.exponentialRampToValueAtTime(48, t + 0.14); env(g, t, 0.002, 0.18 + k * 0.25, 0.05, 0.1); chain(o, g, sfxG); noiseHit(t, PN, 'lowpass', 1500, 0.8, 0.12 + k * 0.12, 0.12, sfxG, 0.9); },
  step() { if (!ctx || !on) return; const t = now(); noiseHit(t, PN, 'bandpass', 700 + Math.random() * 500, 1.4, 0.07, 0.05, sfxG, 1.1); },
  stumble() { if (!ctx || !on) return; const t = now(); for (let k = 0; k < 6; k++) noiseHit(t + k * 0.045 + Math.random() * 0.02, WN, 'bandpass', 1800 + Math.random() * 3000, 6, 0.12, 0.08, sfxG);
    [0, 0.09].forEach(d => { const g = ctx.createGain(); env(g, t + d, 0.002, 0.05, 0.05, 0.35); chain(osc('square', 520 + Math.random() * 260, t + d, t + d + 1), biq('bandpass', 1400, 8), g, sfxG); }); this.land(0.9); },
  gutter() { if (!ctx || !on) return; const t = now(); [1, 2.41, 3.77, 5.9].forEach((r, i) => { const g = ctx.createGain(); env(g, t, 0.001, 0.07 / (i + 1), 0.05, 0.9); chain(osc('sine', 330 * r, t, t + 2.5), g, sfxG); });
    noiseHit(t + 0.05, WN, 'bandpass', 3200, 2, 0.09, 0.5, sfxG, 0.7); this.land(1); },
  cuffs() { if (!ctx || !on) return; const t = now(); [0, 0.16].forEach(d => { noiseHit(t + d, WN, 'bandpass', 5200, 9, 0.35, 0.03, sfxG); const g = ctx.createGain(); env(g, t + d, 0.001, 0.05, 0.02, 0.1); chain(osc('square', 3100, t + d, t + d + 0.3), biq('bandpass', 3100, 12), g, sfxG); });
    [52, 59, 64, 67, 71].forEach((m, i) => { const g = ctx.createGain(); env(g, t + 0.32, 0.01, 0.06, 0.5, 0.8); chain(osc('brass', mtof(m), t + 0.32, t + 3, i * 5 - 10), biq('lowpass', 2800, 1), g, sfxG); }); },
  escape() { if (!ctx || !on) return; const t = now(); [0, 0.25].forEach((d, k) => { const g = ctx.createGain(), o = osc('reed', mtof(k ? 64 : 69), t + d, t + d + 2); o.frequency.exponentialRampToValueAtTime(mtof(k ? 52 : 57), t + d + 1.4); env(g, t + d, 0.02, 0.07, 0.8, 0.5); chain(o, biq('lowpass', 1800), g, sfxG); });
    [0, 0.5, 1].forEach(d => { const g = ctx.createGain(); env(g, t + 0.6 + d, 0.002, 0.04, 0.05, 0.6); chain(osc('sine', 1568, t + 0.6 + d, t + 2.8 + d), g, sfxG); }); },
  thunder, setTension,
};
root.NoirSnd = { start, setOn, setScene, isOn: () => on, started: () => started, ctx: () => ctx, sfx: S, style: () => style };
})(typeof window !== 'undefined' ? window : globalThis);
