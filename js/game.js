'use strict';
// Dragon Ball Arena - premier jet jouable (canvas 2D, JS natif).

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const FONT = "'Pixelify Sans', 'Courier New', monospace";
const LABEL = "'Silkscreen', 'Courier New', monospace";

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sign = v => (v > 0 ? 1 : v < 0 ? -1 : 0);

function txt(s, x, y, o = {}) {
  ctx.font = `${o.weight || 700} ${o.size || 16}px ${o.font || FONT}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(s, x + (o.sx || 2), y + (o.sy || 2)); }
  ctx.fillStyle = o.color || '#fff3df';
  ctx.fillText(s, x, y);
}

function chamfer(x, y, w, h, c = 10, all = false) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h);
  if (all) { ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); } else ctx.lineTo(x, y + h);
  ctx.closePath();
}

function panel(x, y, w, h, o = {}) {
  chamfer(x, y, w, h, o.c || 10, o.all);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, o.a || 'rgba(255,255,255,0.09)');
  g.addColorStop(1, o.b || 'rgba(255,255,255,0.02)');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = o.stroke || 'rgba(255,160,60,0.55)'; ctx.stroke();
}

function bar(x, y, w, h, v, color, bg = 'rgba(255,255,255,0.1)', glow = true) {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
  ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(0, w * clamp(v, 0, 1)), h);
  ctx.restore();
}

function chip(label, x, y, color, size = 11) {
  ctx.font = `700 ${size}px ${LABEL}`;
  const w = ctx.measureText(label).width + 16;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 6, y + size + 8); ctx.lineTo(x, y + size + 8); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  txt(label, x + 8, y + size + 3, { size, font: LABEL, color: '#140a05' });
  return w;
}

function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/* ------------------------------------------------------------------ */
/* Audio (synthèse simple, aucun fichier)                              */
/* ------------------------------------------------------------------ */
const Snd = {
  ac: null, muted: false,
  init() {
    if (this.ac) return;
    try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* ignore */ }
  },
  tone(f0, f1, d, type = 'square', vol = 0.06) {
    if (!this.ac || this.muted) return;
    const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.ac.destination); o.start(t); o.stop(t + d);
  },
  noise(d, vol = 0.08) {
    if (!this.ac || this.muted) return;
    const n = Math.floor(this.ac.sampleRate * d), b = this.ac.createBuffer(1, n, this.ac.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ac.createBufferSource(), g = this.ac.createGain();
    g.gain.value = vol; s.buffer = b; s.connect(g); g.connect(this.ac.destination); s.start();
  },
  play(k) {
    switch (k) {
      case 'hit': this.noise(0.08, 0.07); this.tone(220, 80, 0.08, 'square', 0.05); break;
      case 'heavy': this.noise(0.2, 0.12); this.tone(140, 40, 0.2, 'sawtooth', 0.08); break;
      case 'block': this.tone(520, 380, 0.06, 'triangle', 0.05); break;
      case 'blast': this.tone(700, 300, 0.18, 'sawtooth', 0.04); break;
      case 'ult': this.tone(200, 900, 0.5, 'sawtooth', 0.05); break;
      case 'ultfire': this.noise(0.4, 0.1); this.tone(900, 200, 0.5, 'sawtooth', 0.07); break;
      case 'dash': this.noise(0.1, 0.04); break;
      case 'switch': this.tone(330, 660, 0.12, 'square', 0.05); this.tone(660, 990, 0.12, 'square', 0.04); break;
      case 'ko': this.tone(300, 40, 0.6, 'sawtooth', 0.08); this.noise(0.5, 0.1); break;
      case 'move': this.tone(440, 440, 0.04, 'square', 0.03); break;
      case 'ok': this.tone(523, 784, 0.12, 'square', 0.05); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.18, 'square', 0.05), i * 130)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.22, 'triangle', 0.06), i * 160)); break;
    }
  },
};

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */
const IMG = {};
const whiteCache = new Map();

function loadImages(onProgress) {
  const list = ['arena_tournoi.jpg'];
  ROSTER.forEach(r => { list.push(r.id + '_idle.png', r.id + '_por.png', 'frames/' + r.id + '.png'); });
  let done = 0;
  return Promise.all(list.map(f => new Promise(res => {
    const im = new Image();
    im.onload = im.onerror = () => { done++; onProgress(done / list.length); res(); };
    im.src = 'assets/' + f;
    IMG[f.replace(/\.(png|jpg)$/, '').replace('frames/', 'atlas_')] = im;
  })));
}

function whiteOf(im) {
  if (whiteCache.has(im)) return whiteCache.get(im);
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  whiteCache.set(im, c); return c;
}

/* ------------------------------------------------------------------ */
/* Entrées                                                             */
/* ------------------------------------------------------------------ */
const Input = {
  held: new Set(), queue: [],
  mouse: { x: 0, y: 0, clicked: false },
  down(e) {
    if (e.repeat) { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); return; }
    Snd.init();
    this.held.add(e.code);
    this.queue.push(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyF') toggleFullscreen();
    if (e.code === 'KeyM') Snd.muted = !Snd.muted;
  },
  up(e) { this.held.delete(e.code); },
  has(...codes) { return codes.some(c => this.held.has(c)); },
  pressed(...codes) { return this.queue.some(c => codes.includes(c)); },
  flush() { this.queue.length = 0; this.mouse.clicked = false; },
};

window.addEventListener('keydown', e => Input.down(e));
window.addEventListener('keyup', e => Input.up(e));
window.addEventListener('blur', () => Input.held.clear());
function canvasPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
cv.addEventListener('mousemove', e => { const p = canvasPos(e); Input.mouse.x = p.x; Input.mouse.y = p.y; });
cv.addEventListener('mousedown', e => { Snd.init(); const p = canvasPos(e); Input.mouse.x = p.x; Input.mouse.y = p.y; Input.mouse.clicked = true; });

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else (document.getElementById('wrap') || cv).requestFullscreen?.();
}

/* ------------------------------------------------------------------ */
/* Combat : entités                                                    */
/* ------------------------------------------------------------------ */
const BOUNDS = { y0: 235, y1: 500 };
function boundsX(y) { const t = (y - BOUNDS.y0) / (BOUNDS.y1 - BOUNDS.y0); return [140 - 70 * t, 820 + 70 * t]; }

class Fighter {
  constructor(def) {
    this.def = def; this.img = IMG[def.id + '_idle']; this.por = IMG[def.id + '_por'];
    this.maxhp = def.hp; this.hp = def.hp; this.ki = 30; this.guard = 100;
    this.alive = true; this.reset(0, 0);
  }
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.state = 'idle'; this.st = 0; this.stDur = 1;
    this.combo = 0; this.comboT = 0; this.inv = 0; this.hitImm = 0; this.guarding = false; this.charging = false;
    this.flash = 0; this.face = 1; this.dashCd = 0; this.guardBroken = 0; this.anim = Math.random() * 6;
    this.walking = false; this.wt = 0; this.didHit = false; this.bufAtk = false; this.fired = false; this.dash = [0, 0]; this.koT = 0; this.lunge = 0;
  }
}

class Team {
  constructor(ids, side) {
    this.side = side; this.fs = ids.map(id => new Fighter(ROSTER_BY_ID[id])); this.act = 0; this.swCd = 0;
  }
  get f() { return this.fs[this.act]; }
  alive() { return this.fs.filter(f => f.alive); }
}

const MELEE = [{ p: 15, dur: 0.30, lunge: 16 }, { p: 15, dur: 0.30, lunge: 16 }, { p: 24, dur: 0.46, lunge: 30 }];
const COST = { blast: 10, ult: 60, dash: 8 };

class Battle {
  constructor(playerIds, enemyIds, diff) {
    this.p = new Team(playerIds, 'p'); this.e = new Team(enemyIds, 'e');
    this.diff = DIFFICULTIES[diff]; this.t = 0; this.time = 180; this.state = 'intro'; this.stT = 1.6;
    this.projs = []; this.parts = []; this.texts = []; this.shake = 0; this.paused = false;
    this.p.f.reset(250, 400); this.e.f.reset(710, 360); this.p.f.face = 1; this.e.f.face = -1;
    this.stats = { dmg: 0, kos: 0, taken: 0 }; this.ai = { t: 0, k: {}, guardT: 0 }; this.aiSw = 0;
    this.choose = null; this.winner = null; this.endT = 0; this.banner = { s: 'ROUND 1', t: 1.4 };
    this.slow = 1; this.eKoT = 0;
  }

  /* --------- utilitaires --------- */
  team(f) { return this.p.fs.includes(f) ? this.p : this.e; }
  foe(f) { return this.p.fs.includes(f) ? this.e.f : this.p.f; }
  spark(x, y, color, n = 8, sp = 220) {
    for (let i = 0; i < n; i++) { const a = rand(0, 6.28), s = rand(40, sp); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: rand(0.25, 0.6), max: 0.6, color, size: rand(2, 5) }); }
  }
  pop(x, y, s, color) { this.texts.push({ x, y, s, color, t: 0.9 }); }

  /* --------- dégâts --------- */
  damage(att, tgt, P, kind) {
    if (!tgt.alive || tgt.state === 'ko' || tgt.inv > 0) return false;
    const mult = styleMult(att.def.style, tgt.def.style);
    let D = P * (att.def.atk / tgt.def.def) * mult * rand(0.95, 1.05);
    const blocked = tgt.guarding && tgt.guardBroken <= 0 && sign(att.x - tgt.x) === tgt.face;
    const cy = tgt.y - 80;
    if (blocked) {
      D *= kind === 'ult' ? 0.5 : 0.2;
      tgt.guard -= kind === 'ult' ? 55 : 10 + P * 0.5;
      Snd.play('block'); this.spark(tgt.x + tgt.face * 30, cy, '#bfe9ff', 6, 160);
      if (tgt.guard <= 0) { tgt.guard = 0; tgt.guardBroken = 1.3; this.pop(tgt.x, cy - 40, 'GARDE BRISÉE', '#ff9a3a'); this.stun(tgt, 0.7); }
    } else {
      Snd.play(kind === 'ult' ? 'heavy' : 'hit');
      this.spark(tgt.x, cy, kind === 'ult' ? '#ffe45f' : '#ffffff', kind === 'ult' ? 22 : 9);
      if (tgt.hitImm <= 0 || kind === 'ult') { this.stun(tgt, kind === 'ult' ? 0.5 : 0.22); tgt.hitImm = 0.55; }
      tgt.vx = sign(tgt.x - att.x) * (kind === 'ult' ? 420 : kind === 'melee3' ? 300 : 160);
      this.shake = Math.max(this.shake, kind === 'ult' ? 10 : 3);
    }
    D = Math.max(1, Math.round(D));
    tgt.hp -= D; tgt.flash = 0.12; att.ki = Math.min(100, att.ki + 5); tgt.ki = Math.min(100, tgt.ki + 3);
    const col = mult > 1 ? '#7dff9a' : mult < 1 ? '#ff7a6a' : '#ffffff';
    this.pop(tgt.x + rand(-10, 10), cy - 30, String(D), col);
    if (this.team(att) === this.p) this.stats.dmg += D; else this.stats.taken += D;
    if (tgt.hp <= 0) this.ko(tgt);
    return true;
  }
  stun(f, d) { if (f.state === 'ko') return; f.state = 'hurt'; f.st = d; f.stDur = d; f.combo = 0; f.charging = false; f.fired = true; }
  ko(f) {
    f.hp = 0; f.alive = false; f.state = 'ko'; f.koT = 0; f.st = 99; Snd.play('ko'); this.shake = 12;
    const team = this.team(f);
    if (team === this.e) this.stats.kos++;
    this.slow = 0.25;
    if (team.alive().length === 0) { this.finish(team === this.p ? 'e' : 'p'); return; }
    if (team === this.p) { this.state = 'choose'; this.stT = 4; this.choose = true; this.banner = { s: 'CHOISIS TON COMBATTANT', t: 4 }; }
    else { this.state = 'echoose'; this.stT = 1.0; }
  }
  finish(w) { this.winner = w; this.state = 'end'; this.endT = 2.4; this.slow = 0.35; this.banner = { s: w === 'p' ? 'VICTOIRE !' : 'DÉFAITE...', t: 3 }; Snd.play(w === 'p' ? 'win' : 'lose'); }

  doSwitch(team, idx, forced) {
    const nf = team.fs[idx]; if (!nf || !nf.alive || idx === team.act) return false;
    if (!forced && (team.swCd > 0 || ['atk', 'cast', 'ult'].includes(team.f.state))) return false;
    const old = team.f; nf.reset(old.x, old.y); nf.inv = 1.5; nf.face = old.face; team.act = idx; if (!forced) team.swCd = 8;
    this.spark(old.x, old.y - 70, '#ffffff', 14); Snd.play('switch');
    this.slow = 1; if (team === this.p && this.state === 'choose') { this.state = 'fight'; this.choose = null; this.banner = { s: '', t: 0 }; }
    if (this.state === 'echoose' && team === this.e) this.state = 'fight';
    return true;
  }
  bestSwitch(team, foe) {
    let best = -1, bs = -1;
    team.fs.forEach((f, i) => { if (!f.alive || i === team.act) return; const s = styleMult(f.def.style, foe.def.style) * 100 + f.hp / f.maxhp * 50; if (s > bs) { bs = s; best = i; } });
    return best;
  }

  /* --------- projectiles --------- */
  fire(f, kind) {
    const ult = kind === 'ult';
    const col = ult ? f.def.ultColor : STYLES[f.def.style].c;
    this.projs.push({ x: f.x + f.face * 40, y: f.y, vx: f.face * (ult ? 420 : 560), r: ult ? 38 : 13, P: ult ? 150 : 34, kind, owner: f, color: col, life: 2.5, trail: [] });
    Snd.play(ult ? 'ultfire' : 'blast');
    if (ult) this.shake = Math.max(this.shake, 6);
  }

  /* --------- logique des combattants --------- */
  step(f, inp, dt) {
    f.walking = false;
    const foe = this.foe(f), team = this.team(f), def = f.def;
    f.anim += dt; f.inv -= dt; f.hitImm -= dt; f.flash -= dt; f.dashCd -= dt; f.comboT -= dt; f.guardBroken -= dt;
    if (f.state === 'ko') { f.koT += dt; return; }
    if (f.state !== 'dash') f.face = foe.x >= f.x ? 1 : -1;
    if (!f.charging) f.ki = Math.min(100, f.ki + 3 * dt); else f.ki = Math.min(100, f.ki + 26 * dt);
    f.guarding = false; if (f.state === 'idle' && inp.guard && f.guardBroken <= 0 && f.guard > 0) { f.guarding = true; f.guard -= 14 * dt; } else if (f.guard < 100 && f.guardBroken <= 0) f.guard = Math.min(100, f.guard + 18 * dt);
    if (f.guard < 0) f.guard = 0;
    f.charging = false;
    const spd = def.spd;

    if (f.state === 'hurt') { f.st -= dt; f.x += f.vx * dt; f.vx *= Math.pow(0.02, dt); if (f.st <= 0) { f.state = 'idle'; } this.clampPos(f); return; }
    f.x += f.vx * dt; f.vx *= Math.pow(0.02, dt);

    if (f.state === 'atk') {
      f.st -= dt; const m = MELEE[f.combo - 1], p = 1 - f.st / f.stDur;
      f.x += f.face * (m.lunge / m.dur) * dt * (p < 0.5 ? 1 : 0.2); f.lunge = Math.sin(clamp(p, 0, 1) * Math.PI);
      if (inp.atk) f.bufAtk = true;
      if (!f.didHit && p >= 0.35) {
        f.didHit = true;
        const dx = (foe.x - f.x) * f.face, dy = Math.abs(foe.y - f.y);
        if (dx > -20 && dx < 96 && dy < 32) this.damage(f, foe, m.p, f.combo === 3 ? 'melee3' : 'melee');
      }
      if (f.st <= 0) {
        if (f.bufAtk && f.combo < 3) { this.startAtk(f); } else { f.state = 'idle'; f.lunge = 0; if (f.combo >= 3) f.combo = 0; f.comboT = 0.5; }
      }
      this.clampPos(f); return;
    }
    if (f.state === 'cast') { f.st -= dt; if (!f.fired && f.st < f.stDur * 0.5) { f.fired = true; this.fire(f, 'blast'); } if (f.st <= 0) f.state = 'idle'; return; }
    if (f.state === 'ult') { f.st -= dt; f.lunge = 1 - f.st / f.stDur; if (!f.fired && f.st <= 0.3) { f.fired = true; this.fire(f, 'ult'); } if (f.st <= 0) { f.state = 'idle'; f.lunge = 0; } return; }
    if (f.state === 'dash') { f.st -= dt; f.x += f.dash[0] * 720 * dt; f.y += f.dash[1] * 520 * dt; this.clampPos(f); if (f.st <= 0) { f.state = 'idle'; } return; }

    // idle : actions
    if (inp.dash && f.dashCd <= 0 && f.ki >= COST.dash) {
      let dx = inp.mx, dy = inp.my; if (!dx && !dy) dx = -f.face; const n = Math.hypot(dx, dy) || 1;
      f.dash = [dx / n, dy / n]; f.ki -= COST.dash; f.state = 'dash'; f.st = f.stDur = 0.2; f.inv = 0.24; f.dashCd = 0.45; Snd.play('dash');
      this.spark(f.x, f.y - 60, '#ffffff', 6, 120); return;
    }
    if (inp.ult && f.ki >= COST.ult) { f.ki -= COST.ult; f.state = 'ult'; f.st = f.stDur = 0.7; f.fired = false; Snd.play('ult'); return; }
    if (inp.blast && f.ki >= COST.blast) { f.ki -= COST.blast; f.state = 'cast'; f.st = f.stDur = 0.26; f.fired = false; return; }
    if (inp.atk) { if (f.comboT <= 0 && f.combo >= 3) f.combo = 0; if (f.comboT <= 0) f.combo = 0; this.startAtk(f); return; }
    if (inp.charge && !f.guarding) { f.charging = true; if (Math.random() < 0.4) this.parts.push({ x: f.x + rand(-30, 30), y: f.y - rand(10, 120), vx: 0, vy: -rand(60, 140), life: 0.5, max: 0.5, color: STYLES[def.style].c, size: 3 }); return; }
    const k = f.guarding ? 0.3 : 1;
    f.walking = !!(inp.mx || inp.my) && !f.guarding; if (f.walking) f.wt += dt * 9;
    f.x += inp.mx * 285 * spd * k * dt; f.y += inp.my * 190 * spd * k * dt; this.clampPos(f);
  }
  startAtk(f) {
    f.combo = Math.min(3, f.combo + 1); const m = MELEE[f.combo - 1];
    f.state = 'atk'; f.st = f.stDur = m.dur; f.didHit = false; f.bufAtk = false;
  }
  clampPos(f) { f.y = clamp(f.y, BOUNDS.y0, BOUNDS.y1); const [a, b] = boundsX(f.y); f.x = clamp(f.x, a, b); }

  /* --------- IA --------- */
  aiInput(dt) {
    const f = this.e.f, foe = this.p.f, d = this.diff, a = this.ai;
    a.t -= dt; a.guardT -= dt;
    const k = a.k;
    k.atk = k.blast = k.ult = k.dash = false;
    if (f.state === 'ko' || f.state === 'hurt') { k.mx = k.my = 0; return k; }
    k.guard = a.guardT > 0;
    if (a.t <= 0) {
      a.t = d.react * rand(0.6, 1.4);
      const dx = foe.x - f.x, dy = foe.y - f.y, dist = Math.hypot(dx, dy * 1.6);
      k.mx = k.my = 0; k.charge = false;
      const threat = this.projs.find(p => p.owner === foe && Math.abs(p.y - f.y) < 40 && sign(f.x - p.x) === sign(p.vx) && Math.abs(f.x - p.x) < 300);
      const foeAtk = foe.state === 'atk' && dist < 120;
      if ((threat || foeAtk) && Math.random() < d.dodge) {
        if (f.ki >= COST.dash && Math.random() < 0.6 && f.dashCd <= 0) { k.dash = true; k.my = Math.random() < 0.5 ? 1 : -1; if (f.y < BOUNDS.y0 + 30) k.my = 1; if (f.y > BOUNDS.y1 - 30) k.my = -1; k.mx = 0; }
        else a.guardT = 0.5;
      } else if (f.ki >= COST.ult && Math.abs(dy) < 30 && dist > 150 && Math.random() < d.ult) k.ult = true;
      else if (dist < 95 && Math.abs(dy) < 30) {
        if (Math.random() < d.atk) k.atk = true; else if (Math.random() < 0.4) a.guardT = 0.4; else k.mx = -sign(dx);
      } else if (Math.abs(dy) < 28 && dist > 190 && f.ki >= COST.blast && Math.random() < d.blast) k.blast = true;
      else if (f.ki < 20 && dist > 300 && Math.random() < 0.5) k.charge = true;
      else {
        k.mx = Math.abs(dx) > 80 ? sign(dx) : 0; k.my = Math.abs(dy) > 14 ? sign(dy) : 0;
      }
    } else { // actions ponctuelles consommées
      k.atk = k.blast = k.ult = k.dash = false;
    }
    if (a.t > d.react * 0.0 && !(f.state === 'atk')) { /* garde les mouvements entre deux décisions */ }
    // enchaînement automatique du combo à proximité
    if (f.state === 'atk' && f.combo < 3 && Math.random() < 0.02 + d.atk * 0.03) k.atk = true;
    return k;
  }

  /* --------- boucle --------- */
  update(rdt) {
    if (this.paused) return;
    const dt = rdt * this.slow;
    this.t += dt;
    if (this.banner.t > 0) this.banner.t -= rdt;
    if (this.slow < 1 && (this.state === 'fight')) this.slow = Math.min(1, this.slow + rdt * 2);

    const inpP = this.playerInput();

    if (this.state === 'intro') { this.stT -= rdt; if (this.stT <= 0) { this.state = 'fight'; this.banner = { s: 'COMBATS !', t: 0.8 }; } }
    else if (this.state === 'fight' || this.state === 'choose' || this.state === 'echoose' || this.state === 'end') {
      if (this.state === 'fight') { this.time -= dt; if (this.time <= 0) { const hp = t => t.fs.reduce((s, f) => s + f.hp / f.maxhp, 0); this.finish(hp(this.p) >= hp(this.e) ? 'p' : 'e'); } }
      this.p.swCd = Math.max(0, this.p.swCd - dt); this.e.swCd = Math.max(0, this.e.swCd - dt);
      // choix forcé
      if (this.state === 'choose') {
        this.stT -= rdt;
        const alive = this.p.fs.map((f, i) => (f.alive ? i : -1)).filter(i => i >= 0);
        for (const [i, codes] of [[0, ['Digit1', 'Numpad1']], [1, ['Digit2', 'Numpad2']], [2, ['Digit3', 'Numpad3']]]) if (Input.pressed(...codes) && alive.includes(i)) this.doSwitch(this.p, i, true);
        if (this.state === 'choose' && this.stT <= 0) this.doSwitch(this.p, this.bestSwitch(this.p, this.e.f), true);
      }
      if (this.state === 'echoose') { this.stT -= rdt; if (this.stT <= 0) this.doSwitch(this.e, this.bestSwitch(this.e, this.p.f), true); }
      if (this.state === 'end') { this.endT -= rdt; }
      const lock = this.state !== 'fight' && this.state !== 'end';
      const pf = this.p.f, ef = this.e.f;
      if (this.state === 'fight' || this.state === 'end' || lock) {
        const idle = { mx: 0, my: 0 };
        this.step(pf, this.state === 'fight' ? inpP : idle, dt);
        const ik = this.state === 'fight' ? this.aiInput(rdt) : idle;
        this.step(ef, ik, dt);
        // changement de combattant IA
        if (this.state === 'fight' && this.diff.sw > 0 && this.e.swCd <= 0 && ef.state === 'idle' && this.e.alive().length > 1) {
          this.aiSw -= rdt;
          if (this.aiSw <= 0) {
            this.aiSw = rand(2, 4);
            const m = styleMult(ef.def.style, pf.def.style);
            if ((m < 1 || ef.hp / ef.maxhp < 0.25) && Math.random() < this.diff.sw) { const b = this.bestSwitch(this.e, pf); if (b >= 0) this.doSwitch(this.e, b, false); }
          }
        }
        // changement joueur
        if (this.state === 'fight') for (const [i, codes] of [[0, ['Digit1', 'Numpad1']], [1, ['Digit2', 'Numpad2']], [2, ['Digit3', 'Numpad3']]]) if (Input.pressed(...codes)) this.doSwitch(this.p, i, false);
      }
      this.updateProjs(dt);
    }
    // FX
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const t of this.texts) { t.t -= dt; t.y -= 38 * dt; }
    this.texts = this.texts.filter(t => t.t > 0);
    this.shake = Math.max(0, this.shake - 30 * rdt);
  }
  playerInput() {
    const L = Input.has('ArrowLeft', 'KeyA'), R = Input.has('ArrowRight', 'KeyD'), U = Input.has('ArrowUp', 'KeyW'), D = Input.has('ArrowDown', 'KeyS');
    return {
      mx: (R ? 1 : 0) - (L ? 1 : 0), my: (D ? 1 : 0) - (U ? 1 : 0),
      atk: Input.pressed('KeyJ') || (Input.held.has('KeyJ') && this.p.f.state === 'atk'),
      blast: Input.pressed('KeyK'), ult: Input.pressed('KeyL'), dash: Input.pressed('Space'),
      guard: Input.has('ShiftLeft', 'ShiftRight'), charge: Input.has('KeyC'),
    };
  }
  updateProjs(dt) {
    for (const p of this.projs) {
      p.x += p.vx * dt; p.life -= dt; p.trail.push([p.x, p.y]); if (p.trail.length > 8) p.trail.shift();
      const tgt = this.foe(p.owner);
      if (tgt.alive && tgt.state !== 'ko' && Math.abs(p.x - tgt.x) < p.r + 24 && Math.abs(p.y - tgt.y) < 22 + p.r * 0.8) {
        if (tgt.inv <= 0) { this.damage(p.owner, tgt, p.P, p.kind); p.life = 0; }
      }
      if (p.x < -60 || p.x > W + 60) p.life = 0;
    }
    // collisions projectile / projectile
    for (let i = 0; i < this.projs.length; i++) for (let j = i + 1; j < this.projs.length; j++) {
      const a = this.projs[i], b = this.projs[j];
      if (a.owner === b.owner || a.life <= 0 || b.life <= 0) continue;
      if (Math.abs(a.x - b.x) < a.r + b.r && Math.abs(a.y - b.y) < a.r + b.r) {
        this.spark((a.x + b.x) / 2, a.y - 60, '#ffffff', 12);
        if (a.kind === 'ult' && b.kind !== 'ult') b.life = 0; else if (b.kind === 'ult' && a.kind !== 'ult') a.life = 0; else a.life = b.life = 0;
        Snd.play('block');
      }
    }
    this.projs = this.projs.filter(p => p.life > 0);
  }

  /* --------- rendu --------- */
  draw() {
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake) * 0.5, rand(-this.shake, this.shake) * 0.5);
    ctx.drawImage(IMG.arena_tournoi, 0, 0, W, H);
    const fs = [this.p.f, this.e.f].sort((a, b) => a.y - b.y);
    for (const f of fs) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 54, 12, 0, 0, 6.3); ctx.fill(); }
    for (const f of fs) this.drawFighter(f);
    for (const p of this.projs) this.drawProj(p);
    for (const p of this.parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
    ctx.globalAlpha = 1;
    for (const t of this.texts) txt(t.s, t.x, t.y, { size: 24, align: 'center', color: t.color, shadow: '#000' });
    ctx.restore();
    this.drawHUD();
  }
  pickFrame(f) {
    const fr = typeof FRAMES !== 'undefined' && FRAMES[f.def.id], at = IMG['atlas_' + f.def.id];
    if (!fr || !at || !at.width) return null;
    let r = fr.idle;
    const pair = k => { const v = fr[k]; return Array.isArray(v[0]) ? v : [v, v]; };
    if (f.state === 'ko') r = fr.ko;
    else if (f.state === 'hurt') r = f.guardBroken > 0 ? fr.stun : fr.hurt;
    else if (f.state === 'dash') r = fr.dash;
    else if (f.state === 'atk') { const p = 1 - f.st / f.stDur, v = pair('atk' + f.combo); r = p < 0.35 ? v[0] : v[1]; }
    else if (f.state === 'cast') r = fr.cast;
    else if (f.state === 'ult') r = f.fired ? fr.ultf : fr.ultw;
    else if (f.guarding) r = fr.guard;
    else if (f.walking && fr.walk) { const w = fr.walk; r = Array.isArray(w[0]) ? w[Math.floor(f.wt) % w.length] : w; }
    return { at, r, ref: fr.idle };
  }
  drawFighter(f) {
    const pf = this.pickFrame(f);
    const im = pf ? pf.at : f.img; if (!im || !im.width) return;
    const s = f.def.scale, sw = pf ? pf.r[2] : im.width, sh = pf ? pf.r[3] : im.height, w = sw * s, h = sh * s, h0 = pf ? pf.ref[3] * s : h;
    const draw = (src, a) => { if (pf) ctx.drawImage(src, pf.r[0], pf.r[1], sw, sh, -w / 2, -h, w, h); else ctx.drawImage(src, -w / 2, -h, w, h); };
    ctx.save();
    ctx.translate(f.x, f.y);
    const idle = f.state === 'idle', moving = Math.abs(f.vx) > 5;
    const bob = idle ? Math.sin(f.anim * 6) * 2 : 0;
    if (f.state === 'ko') { const p = clamp(f.koT / 0.6, 0, 1); if (!pf) ctx.rotate(f.face * -p * 1.4); ctx.globalAlpha = 1 - clamp((f.koT - 0.5) / 0.7, 0, 1); }
    else if (f.inv > 0 && f.state !== 'dash') ctx.globalAlpha = Math.sin(f.anim * 40) > 0 ? 0.35 : 0.9;
    if (f.state === 'dash') ctx.globalAlpha = 0.6;
    if (f.charging) { const g = ctx.createRadialGradient(0, -h0 / 2, 10, 0, -h0 / 2, 110); g.addColorStop(0, STYLES[f.def.style].c + 'aa'); g.addColorStop(1, STYLES[f.def.style].c + '00'); ctx.fillStyle = g; ctx.fillRect(-120, -h0 - 40, 240, h0 + 80); }
    if (f.state === 'ult') { const r = 40 + f.lunge * 90; const g = ctx.createRadialGradient(0, -h0 / 2, 5, 0, -h0 / 2, r); g.addColorStop(0, f.def.ultColor + 'ee'); g.addColorStop(1, f.def.ultColor + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -h0 / 2, r, 0, 6.3); ctx.fill(); }
    ctx.translate(f.face * f.lunge * 10, bob + (f.state === 'hurt' ? 2 : 0));
    ctx.rotate(pf ? (moving && f.state === 'idle' ? f.face * 0.04 : 0) : f.state === 'hurt' ? -f.face * 0.12 : moving ? f.face * 0.04 : f.state === 'atk' ? f.face * 0.1 * f.lunge : 0);
    ctx.scale(f.face, 1 + (f.state === 'cast' ? -0.04 : 0));
    if (f.state === 'atk' && f.lunge > 0.5) { ctx.save(); ctx.globalAlpha *= 0.35; ctx.translate(-f.face * 14, 0); draw(im); ctx.restore(); }
    draw(im);
    if (f.flash > 0) { ctx.globalAlpha = clamp(f.flash / 0.12, 0, 1) * 0.85; draw(whiteOf(im)); }
    ctx.restore();
    if (f.guarding) { ctx.save(); ctx.strokeStyle = 'rgba(160,230,255,0.9)'; ctx.fillStyle = 'rgba(120,200,255,0.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x + f.face * 6, f.y - h0 / 2, 56, h0 / 2 + 8, 0, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (f.state === 'atk') { ctx.save(); ctx.globalAlpha = 0.5 * f.lunge; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x + f.face * 52, f.y - h0 * 0.55, 34, f.face > 0 ? -1.2 : Math.PI - 1.2 + 0.0, f.face > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); ctx.restore(); }
    if (this.team(f) === this.p && f === this.p.f && this.state !== 'end') txt('▼', f.x, f.y - h0 - 8, { size: 16, align: 'center', color: '#ffd23f', shadow: '#000' });
  }
  drawProj(p) {
    ctx.save();
    for (let i = 0; i < p.trail.length; i++) { const [x, y] = p.trail[i]; ctx.globalAlpha = (i / p.trail.length) * 0.35; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y - 70, p.r * (0.4 + i / p.trail.length * 0.6), 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(p.x, p.y - 70, 1, p.x, p.y - 70, p.r * 1.8);
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, p.color); g.addColorStop(1, p.color + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 70, p.r * 1.8, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y - 70, p.r * 0.55, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  drawHUD() {
    // dégradés
    let g = ctx.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, 'rgba(10,5,2,0.92)'); g.addColorStop(0.55, 'rgba(10,5,2,0.8)'); g.addColorStop(1, 'rgba(10,5,2,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 150);
    g = ctx.createLinearGradient(0, 500, 0, 540); g.addColorStop(0, 'rgba(10,5,2,0)'); g.addColorStop(1, 'rgba(10,5,2,0.85)'); ctx.fillStyle = g; ctx.fillRect(0, 500, W, 40);
    this.drawTeamHUD(this.p, 16, false); this.drawTeamHUD(this.e, W - 16, true);
    // timer
    panel(440, 12, 80, 36, { all: true, c: 6, stroke: 'rgba(255,160,60,0.8)' });
    txt(fmtTime(this.time), 480, 38, { size: 22, align: 'center' });
    const m = styleMult(this.p.f.def.style, this.e.f.def.style);
    if (m !== 1) {
      const adv = m > 1; ctx.fillStyle = adv ? 'rgba(20,70,35,0.9)' : 'rgba(80,20,15,0.9)'; ctx.strokeStyle = adv ? '#3ee08a' : '#ff4a3a'; ctx.lineWidth = 2;
      chamfer(405, 54, 150, 22, 6, true); ctx.fill(); ctx.stroke();
      txt(adv ? '▲ AVANTAGE' : '▼ DÉSAVANTAGE', 480, 70, { size: 12, align: 'center', font: LABEL, color: adv ? '#9dffbd' : '#ffb0a0' });
    }
    // jauges ki / garde du combattant actif
    const pf = this.p.f, ef = this.e.f;
    this.drawBars(pf, 16, false); this.drawBars(ef, W - 16, true);
    if (this.p.swCd > 0) txt(`SWITCH DANS ${Math.ceil(this.p.swCd)} S`, 16, 118, { size: 11, font: LABEL, color: '#e0b080' });
    else if (this.p.alive().length > 1) txt('SWITCH PRÊT · 1 2 3', 16, 118, { size: 11, font: LABEL, color: '#7dff9a' });
    txt('J ATTAQUE · K KI · L ULTIME · ESPACE ESQUIVE · MAJ GARDE · C CHARGE · 1 2 3 SWITCH · F PLEIN ÉCRAN · M SON', W / 2, 526, { size: 10, font: LABEL, align: 'center', color: '#e0b080' });
    // bannière
    if (this.banner.t > 0 && this.banner.s) {
      const a = clamp(this.banner.t * 2, 0, 1); ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 240, W, 70);
      txt(this.banner.s, W / 2, 290, { size: this.banner.s.length > 12 ? 34 : 54, align: 'center', color: '#ffb02e', shadow: '#7a2200', sx: 4, sy: 4 });
      ctx.restore();
    }
    if (this.state === 'choose') {
      txt(`${Math.ceil(this.stT)}`, W / 2, 340, { size: 40, align: 'center', color: '#fff' });
      const alive = this.p.fs.map(f => f.alive);
      txt(alive.map((a, i) => (a ? `[${i + 1}] ${this.p.fs[i].def.name}` : '')).filter(Boolean).join('    '), W / 2, 372, { size: 18, align: 'center', color: '#ffd23f', shadow: '#000' });
    }
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
      txt('PAUSE', W / 2, 250, { size: 56, align: 'center', color: '#ffb02e', shadow: '#7a2200', sx: 4, sy: 4 });
      txt('ÉCHAP : REPRENDRE   ·   Q : QUITTER', W / 2, 300, { size: 18, align: 'center', font: LABEL });
    }
  }
  drawTeamHUD(team, edge, right) {
    for (let i = 0; i < 3; i++) {
      const f = team.fs[i]; const w = 136, x = right ? edge - (3 - i) * (w + 8) + 8 : edge + i * (w + 8), y = 12;
      const act = i === team.act;
      ctx.save(); if (!f.alive) ctx.globalAlpha = 0.45;
      panel(x, y, w, 60, { c: 8, stroke: act ? '#ffd23f' : 'rgba(255,160,60,0.35)', a: act ? 'rgba(255,170,60,0.28)' : undefined });
      ctx.drawImage(f.por, x + 6, y + 8, 31, 44);
      txt(f.def.name.length > 9 ? 'BOO' : f.def.name, x + 44, y + 24, { size: 14 });
      bar(x + 44, y + 32, 82, 8, f.hp / f.maxhp, f.hp / f.maxhp > 0.3 ? '#3ee08a' : '#ff4a3a', 'rgba(255,255,255,0.12)', false);
      ctx.fillStyle = STYLES[f.def.style].c; ctx.fillRect(x + 44, y + 46, 82, 3);
      if (!f.alive) txt('KO', x + 118, y + 22, { size: 12, align: 'right', color: '#ff6a5a' });
      ctx.restore();
      if (team === this.p) txt(String(i + 1), x + 5, y + 10, { size: 10, font: LABEL, color: '#ffb02e' });
    }
  }
  drawBars(f, edge, right) {
    const w = 400, x = right ? edge - w : edge;
    txt('KI', right ? x : x, 90, { size: 11, font: LABEL, color: '#ffd23f' });
    bar(x + 22, 82, w - 22, 9, f.ki / 100, '#ffd23f', 'rgba(255,255,255,0.12)');
    txt('GD', x, 104, { size: 11, font: LABEL, color: '#35d0ff' });
    bar(x + 22, 98, w - 22, 6, f.guard / 100, f.guardBroken > 0 ? '#ff4a3a' : '#35d0ff', 'rgba(255,255,255,0.12)', false);
  }
}

/* ------------------------------------------------------------------ */
/* Scènes                                                              */
/* ------------------------------------------------------------------ */
const App = { scene: 'loading', prog: 0, t: 0, menuSel: 0, selCur: 0, team: [], diff: 1, battle: null, lastResult: null, resSel: 0, creditsScroll: 0, ready: false };

function inRect(r) { const m = Input.mouse; return m.x >= r[0] && m.x <= r[0] + r[2] && m.y >= r[1] && m.y <= r[1] + r[3]; }

function bgWarm() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#120804'); g.addColorStop(0.55, '#2e170d'); g.addColorStop(1, '#6a3418');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function scan() { ctx.fillStyle = 'rgba(0,0,0,0.14)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); }
function button(label, x, y, w, h, sel, opt = {}) {
  chamfer(x, y, w, h, 8);
  if (sel) { const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#ff5a1a'); g.addColorStop(1, '#ffb02e'); ctx.fillStyle = g; }
  else ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = sel ? '#fff' : 'rgba(255,160,60,' + (opt.off ? 0.28 : 0.7) + ')'; ctx.stroke();
  txt((sel ? '► ' : '') + label, x + 14, y + h / 2 + 6, { size: 18, color: sel ? '#1a0d00' : opt.off ? '#b08458' : '#fff3df' });
  if (opt.tag) txt(opt.tag, x + w - 12, y + h / 2 + 4, { size: 11, align: 'right', font: LABEL, color: '#b08458' });
}

function drawIdle(id, x, y, scale, flip, t = 0) {
  const im = IMG[id + '_idle']; if (!im || !im.width) return;
  const w = im.width * scale, h = im.height * scale, bob = Math.sin(t * 3 + x) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.45, 8, 0, 0, 6.28); ctx.fill();
  ctx.save(); ctx.translate(x, y - h + bob); if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, 0, w, h); ctx.restore();
}

function startBattle() {
  const rest = ROSTER.map(r => r.id).filter(i => !App.team.includes(i));
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  App.battle = new Battle(App.team.slice(), rest.slice(0, 3), App.diff);
  App.scene = 'battle'; Snd.play('ok');
}

const MENU = [
  { l: 'COMBAT RAPIDE', go: () => { App.scene = 'select'; App.selCur = 0; } },
  { l: 'TOURNOI', off: true, tag: 'BIENTÔT' },
  { l: 'ENTRAÎNEMENT', off: true, tag: 'BIENTÔT' },
  { l: 'COMMANDES', go: () => { App.scene = 'controls'; } },
  { l: 'CRÉDITS', go: () => { App.scene = 'credits'; App.creditsScroll = 0; } },
];
const menuRect = i => [290, 256 + i * 40, 380, 32];

const Scenes = {
  loading(dt) {
    bgWarm();
    txt('DRAGON BALL ARENA', W / 2, 240, { size: 40, align: 'center', color: '#ffb02e', shadow: '#3a1200', sx: 3, sy: 3 });
    bar(300, 280, 360, 14, App.prog, '#ff8a1f');
    txt('CHARGEMENT…', W / 2, 330, { size: 14, align: 'center', font: LABEL });
    scan();
  },
  menu(dt) {
    bgWarm();
    for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 3 ? '#fff' : '#ffd27a'; ctx.fillRect((i * 173) % W, (i * 97) % 230, 4, 4); }
    ctx.fillStyle = '#2a140b'; ctx.fillRect(0, 424, W, 116); ctx.fillStyle = '#ff8c1a'; ctx.fillRect(0, 424, W, 6);
    txt('DRAGON BALL', W / 2, 96, { size: 57, align: 'center', color: '#ffb02e', shadow: '#3a1200', sx: 5, sy: 5 });
    txt('ARENA', W / 2, 190, { size: 92, align: 'center', color: '#ff4a2a', shadow: '#3a0a00', sx: 6, sy: 6 });
    txt("COMBAT D'ARÈNE 3 CONTRE 3", W / 2, 228, { size: 17, align: 'center', color: '#fff0d0' });
    drawIdle('goku', 130, 500, 4.2, false, App.t); drawIdle('vegeta', 830, 500, 4.2, true, App.t + 1);
    MENU.forEach((m, i) => { if (inRect(menuRect(i)) && Input.mouse.moved) App.menuSel = i; button(m.l, ...menuRect(i), App.menuSel === i, m); });
    if (Input.pressed('ArrowDown', 'KeyS')) { do App.menuSel = (App.menuSel + 1) % MENU.length; while (MENU[App.menuSel].off); Snd.play('move'); }
    if (Input.pressed('ArrowUp', 'KeyW')) { do App.menuSel = (App.menuSel + MENU.length - 1) % MENU.length; while (MENU[App.menuSel].off); Snd.play('move'); }
    const clickIdx = Input.mouse.clicked ? MENU.findIndex((m, i) => inRect(menuRect(i))) : -1;
    if (clickIdx >= 0 && !MENU[clickIdx].off) { App.menuSel = clickIdx; MENU[clickIdx].go(); Snd.play('ok'); }
    else if (Input.pressed('Enter', 'Space')) { MENU[App.menuSel].go?.(); Snd.play('ok'); }
    txt('↑ ↓ CHOISIR · ENTRÉE VALIDER · F PLEIN ÉCRAN · M SON', W / 2, 470, { size: 11, align: 'center', font: LABEL, color: '#fff0d0' });
    txt('FAN GAME GRATUIT · NON OFFICIEL · NON AFFILIÉ À TOEI, SHUEISHA OU BANDAI NAMCO', W / 2, 522, { size: 11, align: 'center', font: LABEL, color: '#e0b080' });
    txt('V0.1 · WEB', W - 14, 522, { size: 11, align: 'right', font: LABEL, color: '#e0b080' });
    scan();
  },
  select(dt) {
    bgWarm();
    txt('CHOISIS TON ÉQUIPE', 36, 52, { size: 30, color: '#ffb02e', shadow: '#3a1200' });
    const tile = i => [36 + i * 114, 392, 106, 92];
    // clic souris
    ROSTER.forEach((r, i) => { if (inRect(tile(i)) && Input.mouse.moved) App.selCur = i; });
    if (Input.mouse.clicked) { const i = ROSTER.findIndex((r, k) => inRect(tile(k))); if (i >= 0) { App.selCur = i; toggleTeam(); } else if (inRect([700, 300, 224, 44])) tryStart(); else if (inRect([700, 352, 224, 28])) cycleDiff(); }
    if (Input.pressed('ArrowRight', 'KeyD')) { App.selCur = (App.selCur + 1) % ROSTER.length; Snd.play('move'); }
    if (Input.pressed('ArrowLeft', 'KeyA')) { App.selCur = (App.selCur + ROSTER.length - 1) % ROSTER.length; Snd.play('move'); }
    if (Input.pressed('ArrowDown', 'KeyS')) { App.selCur = (App.selCur + 4) % ROSTER.length; Snd.play('move'); }
    if (Input.pressed('ArrowUp', 'KeyW')) { App.selCur = (App.selCur + ROSTER.length - 4) % ROSTER.length; Snd.play('move'); }
    if (Input.pressed('Enter')) toggleTeam();
    if (Input.pressed('Tab')) cycleDiff();
    if (Input.pressed('Space')) tryStart();
    if (Input.pressed('Escape', 'Backspace')) { App.scene = 'menu'; }
    const r = ROSTER[App.selCur], st = STYLES[r.style];
    // panneau héros
    panel(36, 72, 640, 300, { c: 14 });
    const grad = ctx.createRadialGradient(200, 300, 10, 200, 300, 200); grad.addColorStop(0, 'rgba(255,138,31,0.35)'); grad.addColorStop(1, 'rgba(255,138,31,0)');
    ctx.fillStyle = grad; ctx.fillRect(36, 72, 300, 300);
    drawIdle(r.id, 190, 350, 6, false, App.t);
    txt(r.name, 360, 120, { size: 40, color: '#fff3df', shadow: '#3a1200' });
    chip(st.n, 360, 134, st.c); txt('Style ' + st.n + ' bat ' + STYLES[st.beats].n, 440, 152, { size: 12, font: LABEL, color: '#e0b080' });
    const stats = [['PV', r.hp / 1100, r.hp], ['ATTAQUE', r.atk / 110, r.atk], ['DÉFENSE', r.def / 100, r.def], ['VITESSE', (r.spd - 0.8) / 0.4, Math.round(r.spd * 100)]];
    stats.forEach((s, i) => { txt(s[0], 360, 200 + i * 28, { size: 12, font: LABEL, color: '#e0b080' }); bar(450, 190 + i * 28, 150, 10, s[1], '#ff8a1f'); txt(String(s[2]), 612, 200 + i * 28, { size: 13 }); });
    txt('ULTIME', 360, 330, { size: 12, font: LABEL, color: '#e0b080' }); txt(r.ult.toUpperCase(), 450, 332, { size: 18, color: r.ultColor });
    // équipe
    panel(700, 72, 224, 210, { c: 12 });
    txt('TON ÉQUIPE', 714, 100, { size: 16, color: '#ffb02e' });
    for (let i = 0; i < 3; i++) {
      const id = App.team[i], y = 112 + i * 56; panel(712, y, 200, 48, { c: 8, stroke: id ? '#ffd23f' : 'rgba(255,160,60,0.3)' });
      if (id) { ctx.drawImage(IMG[id + '_por'], 718, y + 4, 28, 40); txt(ROSTER_BY_ID[id].name, 756, y + 30, { size: 16 }); }
      else txt('— VIDE —', 756, y + 30, { size: 14, color: '#b08458' });
    }
    const ready = App.team.length === 3;
    button('COMBATTRE', 700, 300, 224, 44, ready, { off: !ready });
    chamfer(700, 352, 224, 28, 6); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,160,60,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    txt('◄ ' + DIFFICULTIES[App.diff].name + ' ►', 812, 372, { size: 14, align: 'center' });
    // roster
    ROSTER.forEach((q, i) => {
      const [x, y, w, h] = tile(i), cur = i === App.selCur, inT = App.team.indexOf(q.id);
      panel(x, y, w, h, { c: 8, stroke: cur ? '#ffd23f' : 'rgba(255,160,60,0.35)', a: cur ? 'rgba(255,170,60,0.3)' : undefined });
      ctx.drawImage(IMG[q.id + '_por'], x + w / 2 - 16, y + 6, 32, 45);
      txt(q.name === 'MAJIN BOO' ? 'BOO' : q.name, x + w / 2, y + 68, { size: 13, align: 'center' });
      ctx.fillStyle = STYLES[q.style].c; ctx.fillRect(x + 8, y + h - 12, w - 16, 4);
      if (inT >= 0) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 4, y + 4, 18, 18); txt(String(inT + 1), x + 13, y + 18, { size: 14, align: 'center', color: '#140a05' }); }
    });
    txt('FLÈCHES : CURSEUR · ENTRÉE : AJOUTER/RETIRER · TAB : DIFFICULTÉ · ESPACE : COMBATTRE · ÉCHAP : RETOUR', W / 2, 520, { size: 10, align: 'center', font: LABEL, color: '#e0b080' });
    scan();
  },
  controls(dt) {
    bgWarm(); txt('COMMANDES', 36, 60, { size: 34, color: '#ffb02e', shadow: '#3a1200' });
    const rows = [['FLÈCHES / ZQSD / WASD', 'Se déplacer'], ['J', 'Attaque (combo en 3 coups)'], ['K', 'Boule de ki (10 ki)'], ['L', 'Attaque ultime (60 ki)'], ['ESPACE', 'Esquive éclair (8 ki)'], ['MAJ', 'Garde'], ['C', 'Charger le ki'], ['1 / 2 / 3', 'Changer de combattant'], ['F', 'Plein écran'], ['M', 'Couper le son'], ['ÉCHAP', 'Pause']];
    rows.forEach((r, i) => { const y = 110 + i * 34; panel(80, y - 22, 220, 30, { c: 6 }); txt(r[0], 92, y, { size: 14, font: LABEL, color: '#ffd23f' }); txt(r[1], 330, y, { size: 18 }); });
    txt('Cycle de styles : FORCE > TECH > RUSE > KI > VIT > FORCE  (×1,25 / ×0,8)', 80, 500, { size: 14, color: '#e0b080' });
    txt('ÉCHAP : RETOUR', W - 36, 52, { size: 12, align: 'right', font: LABEL, color: '#e0b080' });
    if (Input.pressed('Escape', 'Enter', 'Backspace') || Input.mouse.clicked) App.scene = 'menu';
    scan();
  },
  credits(dt) {
    bgWarm(); txt('CRÉDITS', 36, 60, { size: 34, color: '#ffb02e', shadow: '#3a1200' });
    txt('Fan game gratuit, non officiel. Dragon Ball © Bird Studio / Shueisha / Toei Animation.', 36, 92, { size: 13, font: LABEL, color: '#e0b080' });
    txt('Sprites : communauté fan (The Spriters Resource & auteurs ci-dessous). Code : Faza.', 36, 112, { size: 13, font: LABEL, color: '#e0b080' });
    CREDITS.forEach((c, i) => { const y = 160 + i * 38; txt(c[0], 60, y, { size: 16, color: '#ffd23f' }); txt(c[1], 200, y, { size: 13, font: LABEL }); txt(c[2], 470, y, { size: 13, font: LABEL, color: '#e0b080' }); });
    txt('ÉCHAP : RETOUR', W - 36, 52, { size: 12, align: 'right', font: LABEL, color: '#e0b080' });
    if (Input.pressed('Escape', 'Enter', 'Backspace') || Input.mouse.clicked) App.scene = 'menu';
    scan();
  },
  battle(dt) {
    const b = App.battle;
    if (Input.pressed('Escape') && b.state !== 'end') { b.paused = !b.paused; Snd.play('move'); }
    if (b.paused && Input.pressed('KeyQ')) { App.scene = 'menu'; App.battle = null; return; }
    b.update(dt); b.draw();
    if (b.state === 'end' && b.endT <= 0) { App.lastResult = { win: b.winner === 'p', stats: b.stats, time: 180 - b.time }; App.resSel = 0; App.scene = 'result'; }
  },
  result(dt) {
    const r = App.lastResult; bgWarm();
    txt(r.win ? 'VICTOIRE !' : 'DÉFAITE...', W / 2, 130, { size: 80, align: 'center', color: r.win ? '#ffd23f' : '#ff6a5a', shadow: '#3a1200', sx: 6, sy: 6 });
    panel(300, 170, 360, 130, { c: 12 });
    [['DÉGÂTS INFLIGÉS', Math.round(r.stats.dmg)], ['KO', r.stats.kos], ['DÉGÂTS SUBIS', Math.round(r.stats.taken)], ['DURÉE', fmtTime(r.time)]].forEach((s, i) => { txt(s[0], 322, 205 + i * 26, { size: 12, font: LABEL, color: '#e0b080' }); txt(String(s[1]), 640, 206 + i * 26, { size: 18, align: 'right' }); });
    const opts = ['REJOUER', 'CHANGER D\'ÉQUIPE', 'MENU'];
    opts.forEach((o, i) => { const rc = [330, 330 + i * 44, 300, 36]; if (inRect(rc) && Input.mouse.moved) App.resSel = i; button(o, ...rc, App.resSel === i); });
    if (Input.pressed('ArrowDown', 'KeyS')) { App.resSel = (App.resSel + 1) % 3; Snd.play('move'); }
    if (Input.pressed('ArrowUp', 'KeyW')) { App.resSel = (App.resSel + 2) % 3; Snd.play('move'); }
    let pick = -1; if (Input.pressed('Enter', 'Space')) pick = App.resSel;
    if (Input.mouse.clicked) opts.forEach((o, i) => { if (inRect([330, 330 + i * 44, 300, 36])) pick = i; });
    if (pick === 0) startBattle(); else if (pick === 1) App.scene = 'select'; else if (pick === 2) App.scene = 'menu';
    scan();
  },
};

function toggleTeam() {
  const id = ROSTER[App.selCur].id, i = App.team.indexOf(id);
  if (i >= 0) App.team.splice(i, 1); else if (App.team.length < 3) App.team.push(id); else { Snd.play('block'); return; }
  Snd.play('ok');
}
function cycleDiff() { App.diff = (App.diff + 1) % DIFFICULTIES.length; Snd.play('move'); }
function tryStart() { if (App.team.length === 3) startBattle(); else Snd.play('block'); }

/* ------------------------------------------------------------------ */
/* Boucle principale                                                   */
/* ------------------------------------------------------------------ */
cv.addEventListener('mousemove', () => { Input.mouse.moved = true; });
let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now; App.t += dt;
  ctx.imageSmoothingEnabled = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  try { Scenes[App.scene](dt); } catch (e) { console.error(e); }
  Input.flush(); Input.mouse.moved = false;
  requestAnimationFrame(frame);
}
window.__app = App;
const fontsReady = document.fonts ? Promise.all([document.fonts.load("700 20px 'Pixelify Sans'"), document.fonts.load("700 12px 'Silkscreen'")]).catch(() => {}) : Promise.resolve();
Promise.all([loadImages(p => { App.prog = p; }), fontsReady, new Promise(r => setTimeout(r, 400))]).then(() => { App.scene = 'menu'; });
requestAnimationFrame(frame);
