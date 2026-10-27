/* NOIR — procedural art: portraits, banners */
(function (root) {
'use strict';
function sh(hex, amt) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(v + amt))); return '#' + [f(r), f(g), f(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
let uid = 0;
function portrait(a, o) {
  o = o || {}; const mood = o.mood || 'neutral', acc = o.accent || '#ff3d7f', id = 'p' + (uid++);
  const skin = a.skin, sk2 = sh(skin, -38), sk3 = sh(skin, 18), hc = a.hc || '#222', out = a.out || '#333';
  const w = a.wide ? 1.12 : 1, rx = 37 * w, ry = 47;
  const ey = 108, ex = 17 * (a.wide ? 1.05 : 1);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" class="port m-${mood}" role="img" aria-label="${(o.label || 'portrait')}">`;
  s += `<defs><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1824"/><stop offset="1" stop-color="#07060b"/></linearGradient>
<radialGradient id="${id}g" cx=".85" cy=".25" r=".8"><stop offset="0" stop-color="${acc}" stop-opacity=".55"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".72"/><stop offset=".55" stop-color="#000" stop-opacity=".15"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<radialGradient id="${id}v" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
<clipPath id="${id}h"><ellipse cx="100" cy="110" rx="${rx}" ry="${ry}"/></clipPath></defs>`;
  s += `<rect width="200" height="240" fill="url(#${id}b)"/><rect width="200" height="240" fill="url(#${id}g)"/>`;
  s += `<g opacity=".13" fill="#fff"><polygon points="-10,10 210,-6 210,6 -10,22"/><polygon points="-10,40 210,24 210,36 -10,52"/><polygon points="-10,70 210,54 210,66 -10,82"/><polygon points="-10,100 210,84 210,96 -10,112"/></g>`;
  // hair back
  const back = { waves: `<path d="M56 108C44 56 90 38 118 48C150 58 158 104 146 152C150 178 156 196 142 210L128 166L72 166L58 210C46 196 52 176 56 152Z" fill="${hc}"/>`,
    bob: `<path d="M56 96C50 44 150 44 144 96L148 146C140 158 128 156 126 144L74 144C72 156 60 158 52 146Z" fill="${hc}"/>`,
    bun: `<circle cx="100" cy="57" r="15" fill="${hc}"/>` }[a.hair] || '';
  s += back;
  // shoulders + outfit
  const sw = a.wide ? 0 : 12;
  s += `<path d="M${6 + sw * 0} 240C6 192 48 176 100 176C152 176 194 192 194 240Z" fill="${out}"/>`;
  s += `<path d="M100 176C60 178 20 190 8 240L40 240C48 206 70 186 100 180Z" fill="#000" opacity=".25"/>`;
  s += `<rect x="85" y="146" width="30" height="38" fill="${sk2}"/>`;
  const cl = a.cl;
  if (cl === 'suit') s += `<polygon points="78,176 100,212 122,176" fill="#d9d4c8"/><polygon points="64,178 84,240 100,214 78,176" fill="${sh(out, -14)}"/><polygon points="136,178 116,240 100,214 122,176" fill="${sh(out, -6)}"/>${a.tie ? `<polygon points="96,190 104,190 107,236 100,244 93,236" fill="${a.tie}"/>` : ''}`;
  else if (cl === 'dress') s += `<path d="M72 178Q100 224 128 178Z" fill="${skin}"/><path d="M72 178Q100 224 128 178" fill="none" stroke="${sh(out, 30)}" stroke-width="2"/>`;
  else if (cl === 'collar') s += `<polygon points="80,176 100,206 120,176" fill="#d9d4c8"/><polygon points="70,178 96,206 80,176" fill="#e8e2d4"/><polygon points="130,178 104,206 120,176" fill="#e8e2d4"/>`;
  else if (cl === 'vest') s += `<polygon points="76,176 100,236 124,176" fill="#cfc9b8"/><path d="M60 180L100 240L140 180" fill="none" stroke="#111" stroke-width="3"/>`;
  else if (cl === 'apron') s += `<path d="M82 178L72 240M118 178L128 240" stroke="#d9d4c8" stroke-width="7"/><rect x="80" y="205" width="40" height="35" fill="#d9d4c8" opacity=".85"/>`;
  else if (cl === 'uniform') s += `<polygon points="76,176 100,200 124,176" fill="#cfd4dc"/><circle cx="92" cy="216" r="3" fill="#d8b04a"/><circle cx="108" cy="216" r="3" fill="#d8b04a"/><circle cx="92" cy="232" r="3" fill="#d8b04a"/><circle cx="108" cy="232" r="3" fill="#d8b04a"/><rect x="97" y="196" width="6" height="44" fill="#000" opacity=".2"/>`;
  else if (cl === 'labcoat') s += `<polygon points="70,176 100,226 130,176" fill="#7aa0b8" opacity=".9"/><polygon points="62,178 90,222 82,176" fill="#f4f6f8"/><polygon points="138,178 110,222 118,176" fill="#f4f6f8"/>`;
  else if (cl === 'parka') s += `<ellipse cx="100" cy="182" rx="46" ry="16" fill="none" stroke="#e8d9bd" stroke-width="12"/><rect x="97" y="196" width="6" height="44" fill="#000" opacity=".25"/>`;
  else if (cl === 'overalls') s += `<rect x="76" y="190" width="48" height="50" fill="#3a5a7a"/><path d="M80 190L72 178M120 190L128 178" stroke="#3a5a7a" stroke-width="8"/><polygon points="80,176 100,196 120,176" fill="#b0453c"/>`;
  else if (cl === 'open') s += `<path d="M76 178L100 214L124 178Z" fill="${skin}"/><polygon points="76,178 100,214 90,176" fill="#e0dacb"/><polygon points="124,178 100,214 110,176" fill="#e0dacb"/>`;
  if (a.pearls) { for (let i = 0; i < 9; i++) { const t = i / 8, x = 78 + t * 44, y = 180 + Math.sin(t * Math.PI) * 16; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.1" fill="#f1ece0"/>`; } }
  // ears
  s += `<ellipse cx="${100 - rx + 2}" cy="114" rx="5" ry="9" fill="${sk2}"/><ellipse cx="${100 + rx - 2}" cy="114" rx="5" ry="9" fill="${skin}"/>`;
  if (a.earring) s += `<circle cx="${100 + rx - 2}" cy="127" r="3" fill="#e6c25a"/><circle cx="${100 - rx + 2}" cy="127" r="3" fill="#b99a3e"/>`;
  // head
  s += `<ellipse cx="100" cy="110" rx="${rx}" ry="${ry}" fill="${skin}"/>`;
  s += `<g clip-path="url(#${id}h)"><rect x="40" y="55" width="130" height="110" fill="url(#${id}l)"/><ellipse cx="${100 + rx - 6}" cy="118" rx="7" ry="42" fill="${sk3}" opacity=".35"/>`;
  if (a.stubble) s += `<path d="M64 124Q100 190 136 124L136 160L64 160Z" fill="#000" opacity=".32"/>`;
  s += `</g>`;
  // nose, cheek
  s += `<path d="M101 112L95 130Q100 134 106 130" fill="none" stroke="${sk2}" stroke-width="2.2" stroke-linecap="round"/>`;
  // eyes by mood
  const E = { neutral: { rx: 5.2, ry: 3, p: 2.2, lid: 0.35, br: [-1, 0] }, nervous: { rx: 5.6, ry: 4.6, p: 1.7, lid: 0, br: [-4, -2] }, smug: { rx: 5.2, ry: 3.2, p: 2.2, lid: 0.6, br: [-1, 1] }, caught: { rx: 6, ry: 5.8, p: 1.5, lid: 0, br: [-6, -3] }, angry: { rx: 5.2, ry: 3, p: 2.2, lid: 0.45, br: [3, 0] } }[mood] || { rx: 5.2, ry: 3, p: 2.2, lid: .35, br: [-1, 0] };
  [-1, 1].forEach(sd => {
    const cx = 100 + sd * ex; const dark = sd < 0 ? 0.0 : 0;
    s += `<ellipse cx="${cx}" cy="${ey}" rx="${E.rx}" ry="${E.ry}" fill="#f1ece0"/><circle cx="${cx + sd * -0.5}" cy="${ey + 0.3}" r="${E.p}" fill="#14100e"/>`;
    if (E.lid) s += `<path d="M${cx - E.rx - 1} ${ey - E.ry - 0.5}L${cx + E.rx + 1} ${ey - E.ry - 0.5}L${cx + E.rx + 1} ${ey - E.ry + E.ry * 2 * E.lid}Q${cx} ${ey - E.ry + E.ry * 2 * E.lid + 1.5} ${cx - E.rx - 1} ${ey - E.ry + E.ry * 2 * E.lid}Z" fill="${sk2}"/>`;
    const bi = E.br[0], bo = E.br[1];
    s += `<path d="M${cx - sd * -9} ${ey - 11 + (sd < 0 ? bo : bi) * 0.5}L${cx + sd * -9 * -1} ${ey - 11 + (sd < 0 ? bi : bo) * 0.5}" stroke="${hc === '#b4b6ba' || hc === '#b8b6b2' || hc === '#8d8f93' || hc === '#9a9a9a' ? '#777' : sh(hc, 0)}" stroke-width="3" stroke-linecap="round" fill="none" transform="translate(0 ${E.br[0] < -2 ? -2 : 0})"/>`;
  });
  // glasses
  if (a.glasses) s += `<circle cx="${100 - ex}" cy="${ey}" r="10.5" fill="#cfe6ff" fill-opacity=".1" stroke="#12100f" stroke-width="2"/><circle cx="${100 + ex}" cy="${ey}" r="10.5" fill="#cfe6ff" fill-opacity=".1" stroke="#12100f" stroke-width="2"/><path d="M${100 - ex + 10.5} ${ey}H${100 + ex - 10.5}" stroke="#12100f" stroke-width="2"/><path d="M${100 - ex - 6} ${ey - 5}l8 -3" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>`;
  if (a.mole) s += `<circle cx="${100 + ex + 6}" cy="128" r="1.6" fill="#2b1a14"/>`;
  if (a.scar) s += `<path d="M${100 - ex - 7} 98L${100 - ex + 7} 140" stroke="#7b3b34" stroke-width="2.4" stroke-linecap="round"/><path d="M${100 - ex - 10} 114l8 3M${100 - ex - 4} 124l8 3" stroke="#7b3b34" stroke-width="1.2"/>`;
  // mouth
  const my = 142, lipc = a.lips ? '#b3162f' : sh(skin, -75);
  const M = { neutral: `M88 ${my}Q100 ${my + 2} 112 ${my}`, smug: `M88 ${my + 1}Q100 ${my + 3} 114 ${my - 3}`, nervous: `M89 ${my + 1}Q94 ${my - 2} 99 ${my + 1}T111 ${my + 1}`, angry: `M89 ${my + 2}Q100 ${my - 2} 111 ${my + 2}`, caught: '' }[mood];
  if (mood === 'caught') s += `<ellipse cx="100" cy="${my + 2}" rx="8" ry="6" fill="#2a0c10"/><rect x="94" y="${my - 3}" width="12" height="3.5" fill="#eee" opacity=".85"/>`;
  else s += `<path d="${M}" stroke="${lipc}" stroke-width="${a.lips ? 4.2 : 2.4}" fill="none" stroke-linecap="round"/>`;
  if (a.stache) s += `<path d="M80 136Q90 128 100 134Q110 128 120 136Q110 140 100 138Q90 140 80 136Z" fill="${hc === '#b4b6ba' ? '#8a8c90' : hc}"/>`;
  // hair front
  const front = {
    slick: `<path d="M60 104C56 62 82 50 102 50C128 50 142 66 140 104C134 86 124 76 108 72C90 76 72 84 60 104Z" fill="${hc}"/><path d="M96 54Q92 66 78 76" stroke="#000" stroke-opacity=".35" fill="none" stroke-width="1.5"/>`,
    sweep: `<path d="M60 108C54 60 84 46 106 48C132 50 144 70 140 108C136 86 128 74 112 66C94 62 74 78 60 108Z" fill="${hc}"/><path d="M66 90Q82 62 112 60" stroke="#fff" stroke-opacity=".25" fill="none" stroke-width="2"/>`,
    waves: `<path d="M62 100C60 60 92 52 108 56C132 60 144 80 138 108C130 88 120 82 104 78C84 76 70 84 62 100Z" fill="${hc}"/><path d="M80 66Q92 60 104 66" stroke="#fff" stroke-opacity=".18" fill="none" stroke-width="2"/>`,
    bob: `<path d="M60 100C62 56 138 56 140 100C128 78 104 74 96 80C80 74 66 84 60 100Z" fill="${hc}"/>`,
    bun: `<path d="M62 100C58 58 142 58 138 100C128 80 106 72 100 76C82 72 70 82 62 100Z" fill="${hc}"/>`,
    curly: [...Array(11)].map((_, i) => { const t = i / 10, x = 62 + t * 76, y = 78 - Math.sin(t * Math.PI) * 24 + (i % 2) * 4; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(10 + (i % 3)).toFixed(1)}" fill="${hc}"/>`; }).join('') + `<path d="M62 100C60 84 70 78 80 80L82 90Z M138 100C140 84 130 78 120 80L118 90Z" fill="${hc}"/>`,
    bald: `<ellipse cx="108" cy="72" rx="9" ry="5" fill="#fff" opacity=".14"/><path d="M63 110C60 100 62 92 66 88L70 108Z M137 110C140 100 138 92 134 88L130 108Z" fill="${hc === '#222' ? '#3a3a3a' : hc}" opacity=".7"/>`,
    cap: `<path d="M60 92C58 52 142 52 140 92Z" fill="${hc}"/><path d="M54 92H146L152 100H48Z" fill="${sh(hc, -12)}"/><path d="M60 92C58 52 142 52 140 92" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>`,
  }[a.hair] || '';
  s += front;
  if (a.hat) s += `<path d="M64 84C62 40 138 40 136 84Z" fill="#2a2420"/><rect x="64" y="72" width="72" height="9" fill="#7a1f2b"/><ellipse cx="100" cy="86" rx="58" ry="10" fill="#1d1916"/><ellipse cx="100" cy="84" rx="58" ry="9" fill="none" stroke="#fff" stroke-opacity=".12"/>`;
  // light + rim + sweat
  s += `<g clip-path="url(#${id}h)"><rect x="40" y="55" width="130" height="110" fill="url(#${id}l)" opacity=".5"/></g>`;
  s += `<path d="M${100 + rx - 1} 90Q${100 + rx + 3} 118 ${100 + rx - 9} 142" fill="none" stroke="${acc}" stroke-opacity=".85" stroke-width="2.2" stroke-linecap="round"/>`;
  if (o.nerve >= 2 || mood === 'nervous' || mood === 'caught') s += `<path class="sweat" d="M${100 + rx - 8} 86q4 7 0 10q-4 -3 0 -10z" fill="#bfe6ff" opacity=".8"/>` + (o.nerve >= 3 ? `<path class="sweat" d="M${100 - rx + 8} 92q3 6 0 9q-3 -3 0 -9z" fill="#bfe6ff" opacity=".7"/>` : '');
  s += `<rect width="200" height="240" fill="url(#${id}v)"/></svg>`;
  return s;
}

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function skyline(id, acc, sky, kind, w, h) {
  const r = rng(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" class="banner"><defs><linearGradient id="sk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sk${id})"/>`;
  s += `<circle cx="${w * 0.8}" cy="${h * 0.22}" r="${h * 0.1}" fill="${acc}" opacity=".18"/><circle cx="${w * 0.8}" cy="${h * 0.22}" r="${h * 0.06}" fill="#f0e8d0" opacity=".5"/>`;
  [['#0d0b12', 0.5, 0.2], ['#08070c', 0.7, 0.35]].forEach(([c, mh, vv], layer) => {
    let x = -10; while (x < w) { const bw = 22 + r() * 40, bh = h * (0.25 + r() * 0.5) * mh * (layer ? 1.1 : 1); s += `<rect x="${x.toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${c}"/>`;
      if (layer) for (let k = 0; k < 7; k++) if (r() < 0.35) s += `<rect x="${(x + 4 + r() * (bw - 10)).toFixed(1)}" y="${(h - bh + 6 + r() * (bh - 14)).toFixed(1)}" width="3" height="4" fill="${r() < 0.2 ? acc : '#e8c87a'}" opacity=".75"/>`;
      x += bw + r() * 4; }
  });
  if (kind === 'club') s += `<g font-family="Impact,sans-serif" font-size="22" fill="${acc}" class="neon"><text x="${w * 0.08}" y="${h * 0.5}" transform="rotate(-6 ${w * 0.08} ${h * 0.5})" style="filter:drop-shadow(0 0 6px ${acc})">JAZZ</text></g>`;
  if (kind === 'manor') s += `<g fill="#05040a"><polygon points="${w * 0.4},${h} ${w * 0.4},${h * 0.5} ${w * 0.46},${h * 0.3} ${w * 0.52},${h * 0.5} ${w * 0.52},${h}"/><polygon points="${w * 0.52},${h} ${w * 0.52},${h * 0.58} ${w * 0.62},${h * 0.58} ${w * 0.62},${h}"/></g><rect x="${w * 0.455}" y="${h * 0.55}" width="6" height="9" fill="${acc}" opacity=".9"/>`;
  if (kind === 'train') s += `<g fill="#05040a"><rect x="${w * 0.08}" y="${h * 0.72}" width="${w * 0.84}" height="${h * 0.2}" rx="4"/></g>` + [...Array(9)].map((_, i) => `<rect x="${w * 0.12 + i * w * 0.09}" y="${h * 0.77}" width="${w * 0.05}" height="${h * 0.08}" fill="${acc}" opacity=".7"/>`).join('');
  if (kind === 'studio') s += `<g opacity=".22" fill="${acc}"><polygon points="${w*0.2},${h} ${w*0.02},0 ${w*0.1},0"/><polygon points="${w*0.8},${h} ${w*0.9},0 ${w*0.98},0"/></g><g fill="#05040a"><rect x="${w*0.05}" y="${h*0.55}" width="${w*0.38}" height="${h*0.45}"/><rect x="${w*0.5}" y="${h*0.62}" width="${w*0.45}" height="${h*0.38}"/><rect x="${w*0.7}" y="${h*0.3}" width="${w*0.12}" height="${h*0.14}" rx="3"/><line x1="${w*0.72}" y1="${h*0.44}" x2="${w*0.71}" y2="${h*0.62}" stroke="#05040a" stroke-width="3"/><line x1="${w*0.8}" y1="${h*0.44}" x2="${w*0.81}" y2="${h*0.62}" stroke="#05040a" stroke-width="3"/></g><text x="${w*0.72}" y="${h*0.84}" text-anchor="middle" font-family="Impact,sans-serif" font-size="20" fill="${acc}" class="neon">STUDIO 9</text>`;
  if (kind === 'lab') s += `<g stroke="#05040a" stroke-width="3"><line x1="${w * 0.3}" y1="${h}" x2="${w * 0.3}" y2="${h * 0.2}"/><line x1="${w * 0.26}" y1="${h * 0.4}" x2="${w * 0.34}" y2="${h * 0.4}"/></g><circle cx="${w * 0.3}" cy="${h * 0.2}" r="3" fill="${acc}"/>`;
  s += `<rect y="${h - 6}" width="${w}" height="6" fill="#050408"/></svg>`;
  return s;
}
root.NoirArt = { portrait, skyline };
})(typeof window !== 'undefined' ? window : globalThis);
