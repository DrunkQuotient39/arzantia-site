/* Arzantia website - the second set of playable pieces: the map generator, marks on the battlefield (fire,
   frost, gas... in circles, cones and walls), movement with the ruler and vision clearing the fog, the strike,
   death saves, the bestiary with an encounter tray, and a 3D d20 you can spin. Each one is a small, honest
   copy of something the app does. Nothing here talks to a server. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ic = (n) => (window.ArcIcon ? window.ArcIcon(n) : '');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const d = (n) => 1 + Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * n);

  /* seeded random, so the same seed draws the same map */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /* size a canvas to its box, sharp on high-density screens */
  function fit(c) {
    const dp = Math.min(devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(c.clientWidth)), H = Math.max(1, Math.round(c.clientHeight)); /* layout size: an entrance animation's scale must not shrink the drawing */
    c.width = Math.round(W * dp); c.height = Math.round(H * dp);
    const x = c.getContext('2d'); x.setTransform(dp, 0, 0, dp, 0, 0);
    return { x, W, H, dp };
  }
  /* run a frame loop only while the element is on screen */
  function animate(el, frame) {
    let vis = false, raf = 0;
    const tick = (t) => { raf = 0; if (!vis || document.hidden) return; frame(t); raf = requestAnimationFrame(tick); };
    const go = () => { if (RM.matches) { frame(performance.now()); return; } if (vis && !raf) raf = requestAnimationFrame(tick); };
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; go(); }).observe(el);
    document.addEventListener('visibilitychange', go);
    return { kick: () => { if (RM.matches || !vis) frame(performance.now()); else go(); } };
  }
  const hex = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const mix = (h1, h2, k) => { const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16); const c = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return `rgb(${c(16)},${c(8)},${c(0)})`; };

  /* ════════ the map generator (the app's own five, in miniature) ════════ */
  const PAL = {
    dungeon: { void: '#100C08', floor: '#B7A480', floor2: '#9A8560', wall: '#5E4D39', wallHi: '#7E6A4E', ink: '#241C13', warm: '#F0C877', tex: 'flag', ao: .55 },
    cave: { void: '#0C0906', floor: '#A2917A', floor2: '#87775F', wall: '#4F4436', wallHi: '#6E6050', ink: '#201911', warm: '#E6B06A', tex: 'earth', ao: .7, organic: true },
    forest: { void: '#22261A', floor: '#8E9564', floor2: '#737B4C', wall: '#39412A', wallHi: '#515A38', ink: '#1B1F13', warm: '#F2DFA0', tex: 'grass', ao: .45, organic: true },
    tavern: { void: '#140F0A', floor: '#A17B4C', floor2: '#856435', wall: '#54402B', wallHi: '#77593C', ink: '#201709', warm: '#FFC978', tex: 'plank', ao: .5 },
    ruins: { void: '#141109', floor: '#B0A183', floor2: '#948667', wall: '#7A6A55', wallHi: '#9C8B70', ink: '#282016', warm: '#E9D9A8', tex: 'broken', ao: .4 }
  };
  const GEN = {
    dungeon: { label: 'Dungeon', k1: 'Room density', k3: 'Clutter', k2: 'Corridor width' },
    cave: { label: 'Cave', k1: 'Openness', k3: 'Clutter' },
    forest: { label: 'Forest', k1: 'Tree density', k3: 'Undergrowth' },
    tavern: { label: 'Tavern', k1: 'Table count', k3: 'Clutter' },
    ruins: { label: 'Ruins', k1: 'Standing walls', k3: 'Rubble' }
  };

  function generate(type, seed, k1, k3, k2, cols, rows) {
    const r = rng(seed), N = cols * rows;
    const solid = new Uint8Array(N).fill(1), water = new Uint8Array(N), hole = new Uint8Array(N);
    const props = [], lights = [], rooms = [];
    const I = (x, y) => y * cols + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
    const carve = (x, y) => { if (x > 0 && y > 0 && x < cols - 1 && y < rows - 1) solid[I(x, y)] = 0; };
    const ri = (a, b) => a + Math.floor(r() * (b - a + 1));

    if (type === 'dungeon') {
      const want = Math.round(4 + k1 * 8);
      for (let t = 0; t < 400 && rooms.length < want; t++) {
        const w = ri(3, 7), h = ri(3, 5), x = ri(1, cols - w - 2), y = ri(1, rows - h - 2);
        if (rooms.some((o) => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
        rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
      }
      rooms.sort((a, b) => a.cx - b.cx);
      rooms.forEach((o) => { for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) carve(x, y); });
      const cw = Math.max(1, Math.round(k2 || 1));
      for (let i = 1; i < rooms.length; i++) {
        const a = rooms[i - 1], b = rooms[i], hz = r() < .5;
        const run = (x0, x1, y, horiz) => { for (let v = Math.min(x0, x1); v <= Math.max(x0, x1); v++) for (let k = 0; k < cw; k++) horiz ? carve(v, y + k) : carve(y + k, v); };
        if (hz) { run(a.cx, b.cx, a.cy, true); run(a.cy, b.cy, b.cx, false); } else { run(a.cy, b.cy, a.cx, false); run(a.cx, b.cx, b.cy, true); }
      }
      rooms.forEach((o) => {
        lights.push({ x: o.cx + .5, y: o.y + .35, r: 4 + o.w * .4, c: '#F0C877' });
        const n = Math.round(k3 * o.w * o.h * .16);
        for (let k = 0; k < n; k++) {
          const edge = r() < .75, x = edge ? (r() < .5 ? o.x : o.x + o.w - 1) : ri(o.x, o.x + o.w - 1), y = ri(o.y, o.y + o.h - 1);
          props.push({ t: ['crate', 'barrel', 'rubble', 'crate'][ri(0, 3)], x: x + .5, y: y + .5, a: r() * 6.3, s: .7 + r() * .25 });
        }
        if (r() < .35) props.push({ t: 'chest', x: o.cx + .5, y: o.y + o.h - .5, a: 0, s: 1 });
      });
    } else if (type === 'cave') {
      const p = .5 - k1 * .14;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) solid[I(x, y)] = (x === 0 || y === 0 || x === cols - 1 || y === rows - 1 || r() < p) ? 1 : 0;
      for (let it = 0; it < 5; it++) {
        const nx = new Uint8Array(N);
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          let n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && (!inb(x + i, y + j) || solid[I(x + i, y + j)])) n++;
          nx[I(x, y)] = (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? 1 : n >= 5 ? 1 : n <= 3 ? 0 : solid[I(x, y)];
        }
        solid.set(nx);
      }
      keepLargest(solid, cols, rows);
      const fl = []; for (let i = 0; i < N; i++) if (!solid[i]) fl.push(i);
      if (fl.length) {
        let s = fl[Math.floor(r() * fl.length)]; const blob = [s]; water[s] = 1;
        for (let k = 0; k < 10 + k1 * 14; k++) { const c = blob[Math.floor(r() * blob.length)], x = c % cols + ri(-1, 1), y = ((c / cols) | 0) + ri(-1, 1); if (inb(x, y) && !solid[I(x, y)] && !water[I(x, y)]) { water[I(x, y)] = 1; blob.push(I(x, y)); } }
        for (let k = 0; k < 3; k++) { const c = fl[Math.floor(r() * fl.length)]; if (!water[c]) lights.push({ x: c % cols + .5, y: ((c / cols) | 0) + .5, r: 3.5, c: k ? '#7FE0C4' : '#E6B06A' }); }
        const n = Math.round(k3 * fl.length * .06);
        for (let k = 0; k < n; k++) { const c = fl[Math.floor(r() * fl.length)]; if (!water[c]) props.push({ t: 'stalag', x: c % cols + .2 + r() * .6, y: ((c / cols) | 0) + .2 + r() * .6, s: .35 + r() * .45 }); }
      }
    } else if (type === 'forest') {
      solid.fill(0);
      const ph = r() * 6, amp = rows * (.16 + r() * .1), path = [];
      for (let x = -1; x <= cols + 1; x += .5) path.push([x, rows / 2 + Math.sin(x * .28 + ph) * amp]);
      const nearPath = (x, y) => path.some(([px, py]) => Math.hypot(px - x, py - y) < 2.2);
      const camp = { x: ri(5, cols - 6) + .5, y: 0 };
      camp.y = rows / 2 + Math.sin(camp.x * .28 + ph) * amp + (r() < .5 ? -4 : 4);
      camp.y = Math.max(3, Math.min(rows - 3, camp.y));
      const nearCamp = (x, y) => Math.hypot(camp.x - x, camp.y - y) < 3.4;
      const want = Math.round(k1 * cols * rows * .085);
      for (let t = 0; t < want * 6 && props.filter((p) => p.t === 'tree').length < want; t++) {
        const x = r() * cols, y = r() * rows, s = .9 + r() * 1.1;
        if (nearPath(x, y) || nearCamp(x, y) || props.some((p) => p.t === 'tree' && Math.hypot(p.x - x, p.y - y) < (p.s + s) * .62)) continue;
        props.push({ t: 'tree', x, y, s, a: r() * 6.3 });
      }
      const nb = Math.round(k3 * cols * rows * .05);
      for (let k = 0; k < nb; k++) { const x = r() * cols, y = r() * rows; if (!nearPath(x, y) && !nearCamp(x, y)) props.unshift({ t: 'bush', x, y, s: .3 + r() * .35 }); }
      props.unshift({ t: 'path', pts: path });
      props.push({ t: 'fire', x: camp.x, y: camp.y, s: 1 });
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + r(); props.push({ t: 'log', x: camp.x + Math.cos(a) * 1.6, y: camp.y + Math.sin(a) * 1.6, a: a + 1.57, s: 1 }); }
      props.push({ t: 'tent', x: camp.x + (camp.x > cols / 2 ? -3 : 3), y: camp.y - .5, a: 0, s: 1 });
      lights.push({ x: camp.x, y: camp.y, r: 6, c: '#FFB45C' });
    } else if (type === 'tavern') {
      const kx = cols - 9;
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) if (x !== kx) carve(x, y);
      carve(kx, rows >> 1); carve(kx, (rows >> 1) - 1);
      carve(cols >> 1, rows - 1); carve((cols >> 1) - 1, rows - 1);
      props.push({ t: 'counter', x: kx - 2.6, y: 2.2, w: 1.1, h: rows - 6.4 });
      for (let y = 3; y < rows - 4; y += 2) props.push({ t: 'stool', x: kx - 3.6, y: y + .2, s: .32 });
      props.push({ t: 'hearth', x: 1.3, y: rows / 2, s: 1 });
      lights.push({ x: 2, y: rows / 2, r: 7, c: '#FF9E4A' });
      const want = Math.round(3 + k1 * 8), tabs = [];
      for (let t = 0; t < 300 && tabs.length < want; t++) {
        const x = 4.5 + r() * (kx - 10), y = 3 + r() * (rows - 6);
        if (tabs.some((o) => Math.hypot(o.x - x, o.y - y) < 3.4)) continue;
        tabs.push({ x, y });
      }
      tabs.forEach((o, i) => {
        props.push({ t: 'table', x: o.x, y: o.y, s: .95 });
        for (let k = 0; k < 4; k++) { const a = k * 1.57 + .4; props.push({ t: 'stool', x: o.x + Math.cos(a) * 1.35, y: o.y + Math.sin(a) * 1.35, s: .3 }); }
        if (i % 2 === 0) lights.push({ x: o.x, y: o.y, r: 2.6, c: '#FFD08A' });
      });
      const nk = Math.round(2 + k3 * 9);
      for (let k = 0; k < nk; k++) props.push({ t: r() < .6 ? 'barrel' : 'crate', x: kx + 1.5 + r() * 6, y: r() < .5 ? 1.6 + r() * 2 : rows - 2 - r() * 2.4, a: r() * 6.3, s: .75 });
      lights.push({ x: kx + 4, y: rows / 2, r: 4, c: '#FFC978' });
    } else if (type === 'ruins') {
      solid.fill(0);
      const r2 = rng(seed + 7);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const edge = x < 2 || y < 2 || x > cols - 3 || y > rows - 3;
        if (edge || r2() < .05) hole[I(x, y)] = 1;
      }
      const sx = 2, sy = 2, ex = cols - 3, ey = rows - 3, step = ri(5, 7);
      const wallAt = (x, y) => { if (r() < k1 * .95 + .05) { solid[I(x, y)] = 1; hole[I(x, y)] = 0; } };
      let on = true;
      for (let x = sx; x <= ex; x++) { if (r() < .18) on = !on; if (on) { wallAt(x, sy); } if (r() < .5 ? on : !on) wallAt(x, ey); }
      for (let y = sy; y <= ey; y++) { if (r() < .18) on = !on; if (on) wallAt(sx, y); if (r() > .3 && on) wallAt(ex, y); }
      for (let x = sx + step; x < ex - 2; x += step) { const gap = ri(sy + 2, ey - 3); for (let y = sy; y <= ey; y++) if (Math.abs(y - gap) > 1 && r() < k1) wallAt(x, y); }
      const n = Math.round(k3 * cols * rows * .07);
      for (let k = 0; k < n; k++) {
        let x = ri(1, cols - 2), y = ri(1, rows - 2);
        for (let t = 0; t < 6 && !solid[I(x, y)]; t++) { x = ri(1, cols - 2); y = ri(1, rows - 2); }
        props.push({ t: 'rubble', x: x + .5 + (r() - .5) * 2.4, y: y + .5 + (r() - .5) * 2.4, a: r() * 6.3, s: .5 + r() * .5 });
      }
      props.push({ t: 'statue', x: (cols >> 1) + .5, y: (rows >> 1) + .5, s: 1 });
      lights.push({ x: cols / 2, y: rows / 2, r: 7, c: '#E9D9A8' });
    }
    return { type, cols, rows, solid, water, hole, props, lights, rooms };
  }
  function keepLargest(solid, cols, rows) {
    const N = cols * rows, lab = new Int32Array(N).fill(-1); let best = -1, bestN = 0, id = 0;
    for (let i = 0; i < N; i++) {
      if (solid[i] || lab[i] >= 0) continue;
      let n = 0; const st = [i]; lab[i] = id;
      while (st.length) { const c = st.pop(); n++; const x = c % cols, y = (c / cols) | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < cols && Y < rows) { const k = Y * cols + X; if (!solid[k] && lab[k] < 0) { lab[k] = id; st.push(k); } } }); }
      if (n > bestN) { bestN = n; best = id; } id++;
    }
    for (let i = 0; i < N; i++) if (!solid[i] && lab[i] !== best) solid[i] = 1;
  }

  /* paint a generated map into a context, cell size cs, from (ox, oy) */
  function paintMap(g, m, W, H, seed) {
    const P = PAL[m.type], { cols, rows, solid, water, hole } = m, r = rng(seed * 3 + 1);
    const cs = Math.min(W / cols, H / rows), ox = (W - cs * cols) / 2, oy = (H - cs * rows) / 2;
    const S = (i) => solid[i], at = (x, y) => (x < 0 || y < 0 || x >= cols || y >= rows) ? 1 : solid[y * cols + x];
    g.save();
    g.fillStyle = P.void; g.fillRect(0, 0, W, H);
    g.translate(ox, oy);
    /* floor */
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x; if (S(i)) continue;
      if (hole[i]) { g.fillStyle = mix('#4a5632', '#38422a', r()); g.fillRect(x * cs, y * cs, cs + .5, cs + .5); for (let k = 0; k < 4; k++) { g.strokeStyle = hex(r() < .5 ? '#9fae6a' : '#2a3320', .55); const a = x * cs + r() * cs, b = y * cs + r() * cs; g.lineWidth = 1; g.beginPath(); g.moveTo(a, b); g.lineTo(a + cs * .06, b - cs * .22); g.stroke(); } continue; }
      g.fillStyle = mix(P.floor, P.floor2, r() * .8); g.fillRect(x * cs, y * cs, cs + .5, cs + .5);
      if (P.organic) { g.beginPath(); g.arc((x + .5) * cs, (y + .5) * cs, cs * .74, 0, 7); g.fill(); }
    }
    /* texture */
    g.lineWidth = Math.max(.6, cs * .045);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x; if (S(i) || hole[i] || water[i]) continue;
      const X = x * cs, Y = y * cs;
      if (P.tex === 'flag' || P.tex === 'broken') {
        g.strokeStyle = hex(P.ink, .28); g.strokeRect(X + 1, Y + 1, cs - 2, cs - 2);
        if (r() < .35) { g.beginPath(); g.moveTo(X + cs * r(), Y + 1); g.lineTo(X + cs * r(), Y + cs - 1); g.stroke(); }
        if (P.tex === 'broken' && r() < .14) { g.fillStyle = hex(P.ink, .22); g.beginPath(); const px = X + cs * r(), py = Y + cs * r(); for (let k = 0; k < 5; k++) { const an = k * 1.26 + r() * .6, rr = cs * (.08 + r() * .14); k ? g.lineTo(px + Math.cos(an) * rr, py + Math.sin(an) * rr) : g.moveTo(px + Math.cos(an) * rr, py + Math.sin(an) * rr); } g.fill(); }
        if (P.tex === 'broken' && r() < .2) { g.strokeStyle = hex(P.ink, .35); g.beginPath(); let px = X + cs * r(), py = Y + cs * r(); g.moveTo(px, py); for (let k = 0; k < 3; k++) { px += (r() - .5) * cs * .5; py += (r() - .5) * cs * .5; g.lineTo(px, py); } g.stroke(); }
      } else if (P.tex === 'plank') {
        g.strokeStyle = hex(P.ink, .3);
        for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(X, Y + k * cs / 2); g.lineTo(X + cs, Y + k * cs / 2); g.stroke(); }
        g.beginPath(); const sx = X + cs * ((x + y * 3) % 3) / 3; g.moveTo(sx, Y); g.lineTo(sx, Y + cs / 2); g.stroke();
      } else if (P.tex === 'grass') {
        for (let k = 0; k < 3; k++) { g.strokeStyle = hex(r() < .5 ? '#c8d18a' : '#3d4426', .45); const a = X + r() * cs, b = Y + r() * cs; g.beginPath(); g.moveTo(a, b); g.lineTo(a + cs * .08, b - cs * .2); g.stroke(); }
      } else if (P.tex === 'earth') {
        if (r() < .5) { g.fillStyle = hex(P.ink, .12); g.beginPath(); g.arc(X + r() * cs, Y + r() * cs, cs * (.15 + r() * .25), 0, 7); g.fill(); }
      }
    }
    /* water */
    for (let i = 0; i < cols * rows; i++) if (water[i]) {
      const x = i % cols, y = (i / cols) | 0;
      g.fillStyle = '#2f4f58'; g.beginPath(); g.arc((x + .5) * cs, (y + .5) * cs, cs * .78, 0, 7); g.fill();
    }
    for (let i = 0; i < cols * rows; i++) if (water[i] && r() < .5) {
      const x = i % cols, y = (i / cols) | 0;
      g.strokeStyle = 'rgba(190,230,235,.35)'; g.beginPath(); g.arc((x + .5) * cs, (y + .5) * cs, cs * .3, .3, 2); g.stroke();
    }
    /* path (forest) under props */
    m.props.filter((p) => p.t === 'path').forEach((p) => {
      g.strokeStyle = '#8a7651'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = cs * 1.7;
      g.beginPath(); p.pts.forEach(([x, y], k) => k ? g.lineTo(x * cs, y * cs) : g.moveTo(x * cs, y * cs)); g.stroke();
      g.strokeStyle = 'rgba(60,45,25,.35)'; g.lineWidth = cs * .12; g.setLineDash([cs * .3, cs * .5]); g.stroke(); g.setLineDash([]);
    });
    /* shade along walls */
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (at(x, y)) continue;
      const X = x * cs, Y = y * cs, sh = cs * .55;
      const edge = (cond, x0, y0, x1, y1, rx, ry, rw, rh) => { if (!cond) return; const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, hex(P.ink, P.ao * .75)); gr.addColorStop(1, hex(P.ink, 0)); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); };
      edge(at(x, y - 1), X, Y, X, Y + sh, X, Y, cs, sh); edge(at(x, y + 1), X, Y + cs, X, Y + cs - sh, X, Y + cs - sh, cs, sh);
      edge(at(x - 1, y), X, Y, X + sh, Y, X, Y, sh, cs); edge(at(x + 1, y), X + cs, Y, X + cs - sh, Y, X + cs - sh, Y, sh, cs);
    }
    /* walls: only the ones that face a floor */
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!at(x, y)) continue;
      let touches = false; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (!at(x + i, y + j)) touches = true;
      if (!touches) continue;
      const X = x * cs, Y = y * cs;
      g.fillStyle = P.wall;
      if (P.organic) { g.beginPath(); g.arc(X + cs / 2, Y + cs / 2, cs * .66, 0, 7); g.fill(); } else g.fillRect(X - .25, Y - .25, cs + .5, cs + .5);
      g.fillStyle = hex(P.wallHi, .9);
      if (P.organic) { g.beginPath(); g.arc(X + cs * .42, Y + cs * .4, cs * .32, 0, 7); g.fill(); } else g.fillRect(X + cs * .12, Y + cs * .12, cs * .76, cs * .4);
    }
    /* the wall line, where floor meets stone */
    g.strokeStyle = P.ink; g.lineWidth = Math.max(1.5, cs * .13); g.lineCap = 'round';
    if (!P.organic) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (at(x, y)) continue;
      const X = x * cs, Y = y * cs; g.beginPath();
      if (at(x, y - 1)) { g.moveTo(X, Y); g.lineTo(X + cs, Y); }
      if (at(x, y + 1)) { g.moveTo(X, Y + cs); g.lineTo(X + cs, Y + cs); }
      if (at(x - 1, y)) { g.moveTo(X, Y); g.lineTo(X, Y + cs); }
      if (at(x + 1, y)) { g.moveTo(X + cs, Y); g.lineTo(X + cs, Y + cs); }
      g.stroke();
    }
    /* props */
    m.props.forEach((p) => drawProp(g, p, cs, P));
    /* the grid, exact */
    g.strokeStyle = 'rgba(20,14,8,.16)'; g.lineWidth = 1;
    g.beginPath(); for (let x = 0; x <= cols; x++) { g.moveTo(x * cs, 0); g.lineTo(x * cs, rows * cs); } for (let y = 0; y <= rows; y++) { g.moveTo(0, y * cs); g.lineTo(cols * cs, y * cs); } g.stroke();
    /* light and shadow */
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(70,60,80,.55)'; g.fillRect(0, 0, cols * cs, rows * cs);
    g.globalCompositeOperation = 'lighter';
    m.lights.forEach((l) => { const gr = g.createRadialGradient(l.x * cs, l.y * cs, 0, l.x * cs, l.y * cs, l.r * cs); gr.addColorStop(0, hex(l.c, .42)); gr.addColorStop(.5, hex(l.c, .14)); gr.addColorStop(1, hex(l.c, 0)); g.fillStyle = gr; g.fillRect(l.x * cs - l.r * cs, l.y * cs - l.r * cs, l.r * cs * 2, l.r * cs * 2); });
    g.globalCompositeOperation = 'source-over';
    g.restore();
    /* vignette */
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    return { cs, ox, oy };
  }
  function drawProp(g, p, cs, P) {
    const X = p.x * cs, Y = p.y * cs, s = (p.s || 1) * cs;
    g.save(); g.translate(X, Y); if (p.a) g.rotate(p.a);
    g.lineWidth = Math.max(1, cs * .07); g.strokeStyle = P.ink;
    const shadow = (rad) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(rad * .18, rad * .22, rad, rad * .9, 0, 0, 7); g.fill(); };
    switch (p.t) {
      case 'crate': shadow(s * .45); g.fillStyle = '#8a6236'; g.fillRect(-s * .38, -s * .38, s * .76, s * .76); g.strokeRect(-s * .38, -s * .38, s * .76, s * .76); g.beginPath(); g.moveTo(-s * .38, -s * .38); g.lineTo(s * .38, s * .38); g.moveTo(s * .38, -s * .38); g.lineTo(-s * .38, s * .38); g.stroke(); break;
      case 'chest': shadow(s * .4); g.fillStyle = '#6e4420'; g.fillRect(-s * .42, -s * .26, s * .84, s * .52); g.strokeRect(-s * .42, -s * .26, s * .84, s * .52); g.fillStyle = '#e2b850'; g.fillRect(-s * .08, -s * .1, s * .16, s * .2); break;
      case 'barrel': shadow(s * .4); g.fillStyle = '#74502b'; g.beginPath(); g.arc(0, 0, s * .36, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 0, s * .22, 0, 7); g.stroke(); break;
      case 'rubble': g.fillStyle = P.wallHi; for (let k = 0; k < 4; k++) { g.beginPath(); const a = k * 1.7, rr = s * (.12 + k * .03); g.moveTo(Math.cos(a) * s * .3 - rr, Math.sin(a) * s * .3); g.lineTo(Math.cos(a) * s * .3, Math.sin(a) * s * .3 - rr); g.lineTo(Math.cos(a) * s * .3 + rr, Math.sin(a) * s * .3 + rr * .6); g.closePath(); g.fill(); g.stroke(); } break;
      case 'stalag': g.fillStyle = P.wall; g.beginPath(); g.arc(0, 0, s * .5, 0, 7); g.fill(); g.stroke(); g.fillStyle = P.wallHi; g.beginPath(); g.arc(-s * .12, -s * .12, s * .24, 0, 7); g.fill(); break;
      case 'tree': {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(s * .22, s * .28, s * .62, 0, 7); g.fill();
        g.fillStyle = '#2c4422'; for (let k = 0; k < 6; k++) { const a = k * 1.05; g.beginPath(); g.arc(Math.cos(a) * s * .3, Math.sin(a) * s * .3, s * .36, 0, 7); g.fill(); }
        g.fillStyle = '#3f5e2e'; g.beginPath(); g.arc(-s * .08, -s * .1, s * .4, 0, 7); g.fill();
        g.fillStyle = 'rgba(190,210,120,.28)'; g.beginPath(); g.arc(-s * .2, -s * .24, s * .2, 0, 7); g.fill(); break;
      }
      case 'bush': g.fillStyle = '#4a6430'; g.beginPath(); g.arc(0, 0, s * .6, 0, 7); g.arc(s * .4, s * .1, s * .45, 0, 7); g.fill(); break;
      case 'fire': {
        g.fillStyle = '#5a4a3a'; for (let k = 0; k < 7; k++) { const a = k * .9; g.beginPath(); g.arc(Math.cos(a) * s * .55, Math.sin(a) * s * .55, s * .16, 0, 7); g.fill(); }
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * .45); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(.5, '#ff9a2e'); gr.addColorStop(1, 'rgba(200,60,20,.2)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * .45, 0, 7); g.fill(); break;
      }
      case 'log': g.fillStyle = '#6b4a2b'; g.fillRect(-s * .7, -s * .18, s * 1.4, s * .36); g.strokeRect(-s * .7, -s * .18, s * 1.4, s * .36); break;
      case 'tent': g.fillStyle = '#9b8458'; g.beginPath(); g.moveTo(0, -s * 1.2); g.lineTo(s * 1.1, s * .9); g.lineTo(-s * 1.1, s * .9); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, -s * 1.2); g.lineTo(0, s * .9); g.stroke(); break;
      case 'counter': g.restore(); g.save(); g.fillStyle = '#5e3f22'; g.fillRect(p.x * cs, p.y * cs, p.w * cs, p.h * cs); g.strokeStyle = P.ink; g.lineWidth = Math.max(1, cs * .07); g.strokeRect(p.x * cs, p.y * cs, p.w * cs, p.h * cs); g.fillStyle = 'rgba(255,220,160,.12)'; g.fillRect(p.x * cs + 2, p.y * cs + 2, p.w * cs * .4, p.h * cs - 4); break;
      case 'table': shadow(s * .8); g.fillStyle = '#7b5a35'; g.beginPath(); g.arc(0, 0, s * .82, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#f4e6c0'; g.beginPath(); g.arc(s * .15, -s * .1, s * .1, 0, 7); g.fill(); break;
      case 'stool': g.fillStyle = '#5b3f22'; g.beginPath(); g.arc(0, 0, s, 0, 7); g.fill(); g.stroke(); break;
      case 'hearth': {
        g.fillStyle = '#5a5249'; g.fillRect(-s * .3, -s * 1.3, s * .9, s * 2.6); g.strokeRect(-s * .3, -s * 1.3, s * .9, s * 2.6);
        const gr = g.createRadialGradient(s * .25, 0, 0, s * .25, 0, s * .8); gr.addColorStop(0, '#fff0a0'); gr.addColorStop(.6, '#ff8a2a'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(s * .25, 0, s * .8, 0, 7); g.fill(); break;
      }
      case 'statue': shadow(s * .6); g.fillStyle = '#8f8778'; g.beginPath(); g.arc(0, 0, s * .6, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#b6ad9a'; g.beginPath(); g.arc(-s * .1, -s * .12, s * .3, 0, 7); g.fill(); break;
    }
    g.restore();
  }

  $$('.gendemo').forEach((box) => {
    const c = $('canvas', box), types = $('.gd-types', box), k1i = $('[data-k="1"]', box), k3i = $('[data-k="3"]', box), k2i = $('[data-k="2"]', box);
    const k1l = $('[data-l="1"]', box), k3l = $('[data-l="3"]', box), k2w = $('.gd-k2', box), seedEl = $('.gd-seed', box), reroll = $('.gd-roll', box);
    let type = 'dungeon', seed = 1000 + Math.floor(Math.random() * 9000), base = null, born = 0;
    types.innerHTML = Object.entries(GEN).map(([k, v]) => `<button type="button" data-t="${k}" aria-pressed="${k === type}">${esc(v.label)}</button>`).join('');
    const build = () => {
      const { x: g, W, H, dp } = fit(c);
      const cols = W < 520 ? 26 : 36, rows = Math.max(12, Math.round(cols * H / W));
      const m = generate(type, seed, Number(k1i.value), Number(k3i.value), Number(k2i.value), cols, rows);
      base = document.createElement('canvas'); base.width = c.width; base.height = c.height;
      const bg = base.getContext('2d'); bg.setTransform(dp, 0, 0, dp, 0, 0);
      paintMap(bg, m, W, H, seed);
      seedEl.textContent = '#' + seed;
      born = performance.now(); a.kick();
      g.setTransform(1, 0, 0, 1, 0, 0);
    };
    const a = animate(c, (t) => {
      if (!base) return;
      const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);
      const k = RM.matches ? 1 : Math.max(0, Math.min(1, (t - born) / 700)), W = c.width, H = c.height;
      if (k >= 1 && c.dataset.done === String(born)) return;
      g.clearRect(0, 0, W, H); g.fillStyle = '#0c0d10'; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); g.arc(W / 2, H / 2, Math.hypot(W, H) * .52 * (1 - Math.pow(1 - k, 3)), 0, 7); g.clip(); g.drawImage(base, 0, 0); g.restore();
      if (k < 1) { g.strokeStyle = `rgba(233,207,142,${(1 - k) * .8})`; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2, Math.hypot(W, H) * .52 * (1 - Math.pow(1 - k, 3)), 0, 7); g.stroke(); }
      if (k >= 1) c.dataset.done = String(born);
    });
    const label = () => { const v = GEN[type]; k1l.textContent = v.k1; k3l.textContent = v.k3; k2w.hidden = !v.k2; };
    types.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; type = b.dataset.t; $$('button', types).forEach((x) => x.setAttribute('aria-pressed', x === b)); label(); build(); });
    [k1i, k3i, k2i].forEach((i) => i.addEventListener('change', build));
    [k1i, k3i].forEach((i) => i.addEventListener('input', () => { clearTimeout(i._t); i._t = setTimeout(build, 120); }));
    reroll.onclick = () => { seed = 1000 + Math.floor(Math.random() * 9000); build(); };
    label();
    let lastW = 0;
    new ResizeObserver(() => { const w = c.clientWidth; if (w && Math.abs(w - lastW) > 2) { lastW = w; build(); } }).observe(c);
    if (c.clientWidth) { lastW = c.clientWidth; build(); }
  });

  /* ════════ marks on the battlefield ════════ */
  const MARKS = {
    fire: { n: 'Fire', tint: '#E8721C', bed: 'rgba(34,12,3,.55)', rim: 'rgba(255,220,150,.92)', edge: 'soft', anim: 'flicker', shape: 'circle', rM: 3 },
    ice: { n: 'Frost', tint: '#8FD4EC', bed: 'rgba(6,32,46,.55)', rim: 'rgba(236,250,255,.95)', edge: 'hard', anim: 'shimmer', shape: 'circle', rM: 3 },
    poison: { n: 'Poison gas', tint: '#6FBF3C', bed: 'rgba(8,28,4,.6)', rim: 'rgba(212,250,158,.95)', edge: 'soft', anim: 'drift', shape: 'circle', rM: 4.5 },
    lightning: { n: 'Lightning', tint: '#B9A8FF', bed: 'rgba(18,8,40,.55)', rim: 'rgba(226,214,255,.95)', edge: 'hard', anim: 'arc', shape: 'line', rM: 9 },
    web: { n: 'Web', tint: '#E3DCCB', bed: 'rgba(20,16,12,.5)', rim: 'rgba(255,252,244,.85)', edge: 'none', anim: 'web', shape: 'circle', rM: 3 },
    radiant: { n: 'Radiance', tint: '#F4EEDC', bed: 'rgba(40,32,18,.45)', rim: 'rgba(255,253,246,.95)', edge: 'hard', anim: 'rays', shape: 'circle', rM: 3 },
    acid: { n: 'Acid', tint: '#C4DE2E', bed: 'rgba(24,30,2,.55)', rim: 'rgba(242,252,178,.85)', edge: 'soft', anim: 'fizz', shape: 'cone', rM: 4.5 },
    darkness: { n: 'Darkness', tint: '#241E2E', bed: 'rgba(0,0,0,.8)', rim: 'rgba(216,202,238,.96)', edge: 'soft', anim: 'drift', shape: 'circle', rM: 4.5 }
  };
  const SHAPES = [['circle', 'Circle'], ['cone', 'Cone'], ['line', 'Wall'], ['square', 'Square']];
  const CONE = Math.atan(.5);

  $$('.markdemo').forEach((box) => {
    const c = $('canvas', box), kinds = $('.md-kinds', box), shapes = $('.md-shapes', box), size = $('.md-size input', box), sizeOut = $('.md-size output', box), out = $('.md-out', box), clear = $('.md-clear', box);
    const MW = 24, MH = 15; /* the map is 24 × 15 m, 1.5 m squares */
    const toks = [
      { n: 'Kael', l: 'K', c: '#7c8cf5', x: 4.5, y: 10.5, caster: true },
      { n: 'Brynn', l: 'B', c: '#c9a962', x: 6.75, y: 6.75 },
      { n: 'The Ogre', l: 'O', c: '#e5484d', x: 15.75, y: 5.25, big: true, foe: true },
      { n: 'Goblin', l: 'G', c: '#e5484d', x: 13.5, y: 9.75, foe: true },
      { n: 'Goblin archer', l: 'G', c: '#e5484d', x: 18.75, y: 10.5, foe: true },
      { n: 'Cultist', l: 'C', c: '#e5484d', x: 20.25, y: 3.75, foe: true }
    ];
    let kind = 'fire', shape = 'circle', rM = 3, hover = null, marks = [], hitFlash = 0, W = 0, H = 0, sc = 1, ox = 0, oy = 0;
    const img = new Image(); img.src = 'assets/courtyard.webp'; img.onload = () => a.kick();
    kinds.innerHTML = Object.entries(MARKS).map(([k, v]) => `<button type="button" data-k="${k}" aria-pressed="${k === kind}"><i></i>${esc(v.n)}</button>`).join('');
    $$('button', kinds).forEach((b) => b.style.setProperty('--c', MARKS[b.dataset.k].tint));
    shapes.innerHTML = SHAPES.map(([k, n]) => `<button type="button" data-s="${k}" aria-pressed="${k === shape}">${n}</button>`).join('');
    const setSize = (v) => { rM = v; size.value = v; sizeOut.textContent = v + ' m ' + ({ circle: 'radius', cone: 'long', line: 'long', square: 'half-side' })[shape]; };
    kinds.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.k; $$('button', kinds).forEach((x) => x.setAttribute('aria-pressed', x === b)); pickShape(MARKS[kind].shape); setSize(MARKS[kind].rM); a.kick(); });
    const pickShape = (s) => { shape = s; $$('button', shapes).forEach((x) => x.setAttribute('aria-pressed', x.dataset.s === s)); setSize(rM); };
    shapes.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; pickShape(b.dataset.s); a.kick(); });
    size.addEventListener('input', () => { setSize(Number(size.value)); a.kick(); });
    clear.onclick = () => { marks = []; report(null); a.kick(); };
    const caster = toks[0];
    const geom = (k, s, r, px, py) => {
      if (s === 'circle' || s === 'square') return { k, s, r, x: px, y: py };
      const ang = Math.atan2(py - caster.y, px - caster.x);
      return { k, s, r, x: caster.x, y: caster.y, ang };
    };
    const inside = (m, x, y, pad = 0) => {
      const dx = x - m.x, dy = y - m.y;
      if (m.s === 'circle') return Math.hypot(dx, dy) <= m.r + pad;
      if (m.s === 'square') return Math.abs(dx) <= m.r + pad && Math.abs(dy) <= m.r + pad;
      const ca = Math.cos(m.ang), sa = Math.sin(m.ang), along = dx * ca + dy * sa, perp = -dx * sa + dy * ca;
      if (m.s === 'line') return along >= -pad && along <= m.r + pad && Math.abs(perp) <= .75 + pad;
      return along > 0 && along <= m.r + pad && Math.abs(Math.atan2(perp, along)) <= CONE + (pad / Math.max(along, .1));
    };
    const caught = (m) => toks.filter((t) => !(m.s !== 'circle' && m.s !== 'square' && t.caster) && inside(m, t.x, t.y, t.big ? .7 : .45));
    function report(m) {
      if (!m) { out.innerHTML = 'Pick a mark and a shape, then click the map to place it.'; return; }
      const list = caught(m);
      out.innerHTML = `<b>${esc(MARKS[m.k].n)}</b>, ${esc(({ circle: m.r + ' m radius', square: (m.r * 2) + ' m square', cone: m.r + ' m cone from Kael', line: m.r + ' m wall from Kael' })[m.s])}. ` +
        (list.length ? 'Caught in it: ' + list.map((t) => `<span class="${t.foe ? 'foe' : 'ally'}">${esc(t.n)}</span>`).join(', ') + '.' : 'Nobody is caught in it.');
    }
    const toM = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left - ox) / sc, (e.clientY - r.top - oy) / sc]; };
    c.addEventListener('pointermove', (e) => { const [x, y] = toM(e); hover = (x >= 0 && y >= 0 && x <= MW && y <= MH) ? [x, y] : null; a.kick(); });
    c.addEventListener('pointerleave', () => { hover = null; a.kick(); });
    c.addEventListener('click', (e) => {
      const [x, y] = toM(e); if (x < 0 || y < 0 || x > MW || y > MH) return;
      const sx = shape === 'square' || shape === 'circle' ? Math.round(x / 1.5) * 1.5 : x, sy = shape === 'square' || shape === 'circle' ? Math.round(y / 1.5) * 1.5 : y;
      const m = geom(kind, shape, rM, sx, sy); m.born = performance.now(); m.seed = Math.random() * 1e4;
      marks.push(m); if (marks.length > 4) marks.shift();
      report(m); hitFlash = performance.now(); m.hits = caught(m);
      const h = $('.vis-hint', box); if (h) h.style.opacity = 0;
      a.kick();
    });
    /* keyboard: Enter places at the centre of the map */
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const m = geom(kind, shape, rM, 15, 7.5); m.born = performance.now(); m.seed = 1; marks.push(m); if (marks.length > 4) marks.shift(); m.hits = caught(m); hitFlash = m.born; report(m); a.kick(); } });
    function path(g, m) {
      g.beginPath();
      const X = ox + m.x * sc, Y = oy + m.y * sc, R = m.r * sc;
      if (m.s === 'circle') { g.arc(X, Y, R, 0, 7); return; }
      if (m.s === 'square') { g.rect(X - R, Y - R, R * 2, R * 2); return; }
      if (m.s === 'line') { const w = .75 * sc, ca = Math.cos(m.ang), sa = Math.sin(m.ang); g.moveTo(X - sa * w, Y + ca * w); g.lineTo(X + ca * R - sa * w, Y + sa * R + ca * w); g.lineTo(X + ca * R + sa * w, Y + sa * R - ca * w); g.lineTo(X + sa * w, Y - ca * w); g.closePath(); return; }
      g.moveTo(X, Y); g.arc(X, Y, R / Math.cos(CONE), m.ang - CONE, m.ang + CONE); g.closePath();
    }
    function bounds(m) { const X = ox + m.x * sc, Y = oy + m.y * sc, R = m.r * sc * 1.2 + 10; return [X - R, Y - R, R * 2, R * 2, X, Y, R]; }
    function drawMark(g, m, t, preview) {
      const K = MARKS[m.k], age = (t - (m.born || t)) / 1000, grow = preview ? 1 : Math.min(1, age * 3), r = rng(Math.floor(m.seed || 3));
      const [bx, by, bw, bh, X, Y] = bounds(m);
      g.save(); g.globalAlpha = preview ? .45 : 1;
      path(g, { ...m, r: m.r * (preview ? 1 : .2 + .8 * (1 - Math.pow(1 - grow, 3))) });
      g.fillStyle = K.bed; g.fill();
      g.save(); g.clip();
      const T = t / 1000;
      if (K.anim === 'flicker' || K.anim === 'fizz') {
        g.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 26; k++) {
          const px = bx + r() * bw, py = by + r() * bh, ph = r() * 6, rr = (K.anim === 'fizz' ? .25 : .7) * sc * (.6 + .5 * Math.sin(T * (4 + r() * 4) + ph));
          const gr = g.createRadialGradient(px, py, 0, px, py, Math.abs(rr) + 2);
          gr.addColorStop(0, K.anim === 'fizz' ? 'rgba(240,255,170,.7)' : 'rgba(255,230,140,.75)'); gr.addColorStop(.5, hex(K.tint, .45)); gr.addColorStop(1, hex(K.tint, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(px, py - (K.anim === 'flicker' ? (T * 18 + ph * 10) % 14 : 0), Math.abs(rr) + 2, 0, 7); g.fill();
        }
      } else if (K.anim === 'drift') {
        for (let k = 0; k < 14; k++) {
          const ph = r() * 6, px = bx + bw * (.5 + .4 * Math.sin(T * .3 + ph)), py = by + bh * (.5 + .4 * Math.cos(T * .25 + ph * 1.3)), rr = sc * (1.4 + r() * 1.4);
          const gr = g.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, hex(K.tint, m.k === 'darkness' ? .55 : .4)); gr.addColorStop(1, hex(K.tint, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
        }
      } else if (K.anim === 'shimmer') {
        g.strokeStyle = 'rgba(236,250,255,.55)'; g.lineWidth = 1.2;
        for (let k = 0; k < 18; k++) { const px = bx + r() * bw, py = by + r() * bh, l = sc * (.3 + r() * .5), a0 = r() * 3; g.globalAlpha = (preview ? .45 : 1) * (.4 + .6 * Math.abs(Math.sin(T * 2 + k))); g.beginPath(); for (let j = 0; j < 3; j++) { const a1 = a0 + j * 1.05; g.moveTo(px - Math.cos(a1) * l, py - Math.sin(a1) * l); g.lineTo(px + Math.cos(a1) * l, py + Math.sin(a1) * l); } g.stroke(); }
        g.globalAlpha = preview ? .45 : 1; g.fillStyle = hex(K.tint, .22); g.fillRect(bx, by, bw, bh);
      } else if (K.anim === 'arc') {
        g.globalCompositeOperation = 'lighter'; g.lineWidth = 2; g.strokeStyle = 'rgba(226,214,255,.9)'; g.shadowColor = K.tint; g.shadowBlur = 10;
        const rr = rng(Math.floor(T * 12)); const ca = Math.cos(m.ang || 0), sa = Math.sin(m.ang || 0);
        for (let k = 0; k < 3; k++) { g.beginPath(); let px = X, py = Y; g.moveTo(px, py); const L = m.r * sc; for (let s = 1; s <= 12; s++) { const al = L * s / 12, pe = (rr() - .5) * sc * 1.1; px = X + ca * al - sa * pe; py = Y + sa * al + ca * pe; g.lineTo(px, py); } g.stroke(); }
        g.shadowBlur = 0;
      } else if (K.anim === 'web') {
        g.strokeStyle = 'rgba(245,240,228,.7)'; g.lineWidth = 1;
        for (let k = 0; k < 12; k++) { const a1 = k / 12 * 6.283; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(a1) * m.r * sc * 1.5, Y + Math.sin(a1) * m.r * sc * 1.5); g.stroke(); }
        for (let ring = 1; ring <= 5; ring++) { g.beginPath(); for (let k = 0; k <= 12; k++) { const a1 = k / 12 * 6.283, rr = m.r * sc * ring / 5 * (k % 2 ? .92 : 1); k ? g.lineTo(X + Math.cos(a1) * rr, Y + Math.sin(a1) * rr) : g.moveTo(X + Math.cos(a1) * rr, Y + Math.sin(a1) * rr); } g.stroke(); }
      } else if (K.anim === 'rays') {
        g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(X, Y, 0, X, Y, m.r * sc); gr.addColorStop(0, 'rgba(255,250,225,.55)'); gr.addColorStop(1, 'rgba(255,240,200,.05)'); g.fillStyle = gr; g.fillRect(bx, by, bw, bh);
        g.strokeStyle = 'rgba(255,248,220,.45)'; g.lineWidth = 2;
        for (let k = 0; k < 16; k++) { const a1 = k / 16 * 6.283 + T * .25; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(a1) * m.r * sc * 1.4, Y + Math.sin(a1) * m.r * sc * 1.4); g.stroke(); }
      }
      g.restore();
      if (K.edge !== 'none') { path(g, { ...m, r: m.r * (preview ? 1 : .2 + .8 * (1 - Math.pow(1 - grow, 3))) }); g.strokeStyle = K.rim; g.lineWidth = K.edge === 'hard' ? 2 : 1.4; if (K.edge === 'soft') g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]); }
      g.restore();
    }
    const a = animate(c, (t) => {
      const fr = c._fr || (c._fr = fit(c)); const g = fr.x; W = fr.W; H = fr.H;
      sc = Math.min(W / MW, H / MH); ox = (W - MW * sc) / 2; oy = (H - MH * sc) / 2;
      g.clearRect(0, 0, W, H); g.fillStyle = '#0c0d10'; g.fillRect(0, 0, W, H);
      if (img.complete && img.naturalWidth) { const ir = img.naturalWidth / img.naturalHeight, mr = MW / MH; let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0; if (ir > mr) { sw = sh * mr; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / mr; sy = (img.naturalHeight - sh) / 2; } g.globalAlpha = .9; g.drawImage(img, sx, sy, sw, sh, ox, oy, MW * sc, MH * sc); g.globalAlpha = 1; }
      g.strokeStyle = 'rgba(255,240,210,.09)'; g.lineWidth = 1; g.beginPath();
      for (let x = 0; x <= MW; x += 1.5) { g.moveTo(ox + x * sc, oy); g.lineTo(ox + x * sc, oy + MH * sc); } for (let y = 0; y <= MH; y += 1.5) { g.moveTo(ox, oy + y * sc); g.lineTo(ox + MW * sc, oy + y * sc); } g.stroke();
      marks.forEach((m) => drawMark(g, m, t, false));
      if (hover) drawMark(g, { ...geom(kind, shape, rM, shape === 'circle' || shape === 'square' ? Math.round(hover[0] / 1.5) * 1.5 : hover[0], shape === 'circle' || shape === 'square' ? Math.round(hover[1] / 1.5) * 1.5 : hover[1]), seed: 9 }, t, true);
      const last = marks[marks.length - 1], fl = Math.max(0, 1 - (t - hitFlash) / 900);
      const pv = hover ? geom(kind, shape, rM, shape === 'circle' || shape === 'square' ? Math.round(hover[0] / 1.5) * 1.5 : hover[0], shape === 'circle' || shape === 'square' ? Math.round(hover[1] / 1.5) * 1.5 : hover[1]) : null;
      toks.forEach((tk) => {
        const X = ox + tk.x * sc, Y = oy + tk.y * sc, R = sc * (tk.big ? .95 : .62);
        const inPv = pv && caught(pv).includes(tk), hit = last && last.hits && last.hits.includes(tk);
        g.save();
        if (inPv || (hit && fl > 0)) { g.shadowColor = MARKS[inPv ? kind : last.k].tint; g.shadowBlur = 18 + fl * 20; }
        g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(X + 2, Y + 3, R, 0, 7); g.fill();
        g.fillStyle = '#16171c'; g.beginPath(); g.arc(X, Y, R, 0, 7); g.fill(); g.shadowBlur = 0;
        g.lineWidth = 3; g.strokeStyle = (inPv ? MARKS[kind].tint : tk.c); g.stroke();
        if (hit && fl > 0) { g.lineWidth = 2; g.strokeStyle = hex(MARKS[last.k].tint.length === 7 ? MARKS[last.k].tint : '#ffffff', fl); g.beginPath(); g.arc(X, Y, R + 4 + (1 - fl) * 12, 0, 7); g.stroke(); }
        g.fillStyle = tk.c; g.font = `700 ${Math.round(R * .9)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tk.l, X, Y + 1);
        if (tk.caster && (shape === 'cone' || shape === 'line')) { g.strokeStyle = 'rgba(124,140,245,.6)'; g.setLineDash([3, 4]); g.beginPath(); g.arc(X, Y, R + 6, 0, 7); g.stroke(); g.setLineDash([]); }
        g.restore();
      });
      if (RM.matches) return;
    });
    new ResizeObserver(() => { c._fr = null; a.kick(); }).observe(c);
    setSize(3); report(null);
  });

  /* ════════ move, measure, and vision clears the fog ════════ */
  $$('.movedemo').forEach((box) => {
    const c = $('canvas', box), vis = $('.mv-vision input', box), visOut = $('.mv-vision output', box), dash = $('.mv-dash', box), reset = $('.mv-reset', box), out = $('.mv-out', box);
    const cols = 24, rows = 15, SQ = 1.5, SPEED = 9;
    let m = null, base = null, fog = null, tok = null, drag = null, W = 0, H = 0, cs = 0, ox = 0, oy = 0, dashOn = false, vM = 6, fr = null;
    const seedFor = 4242;
    function setup() {
      fr = fit(c); W = fr.W; H = fr.H;
      m = generate('dungeon', seedFor, .75, .35, 1, cols, rows);
      base = document.createElement('canvas'); base.width = c.width; base.height = c.height;
      const bg = base.getContext('2d'); bg.setTransform(fr.dp, 0, 0, fr.dp, 0, 0);
      ({ cs, ox, oy } = paintMap(bg, m, W, H, seedFor));
      fog = document.createElement('canvas'); fog.width = c.width; fog.height = c.height;
      if (!tok) { const r0 = m.rooms[0]; tok = { x: r0.cx, y: r0.cy }; }
      resetFog();
    }
    function resetFog() {
      const f = fog.getContext('2d'); f.setTransform(fr.dp, 0, 0, fr.dp, 0, 0); f.globalCompositeOperation = 'source-over';
      f.clearRect(0, 0, W, H); f.fillStyle = 'rgba(6,6,9,.86)'; f.fillRect(0, 0, W, H); clearAt(tok.x + .5, tok.y + .5); draw();
    }
    function clearAt(x, y) {
      const f = fog.getContext('2d'); f.globalCompositeOperation = 'destination-out';
      const R = Math.max(.6, vM / SQ) * cs, X = ox + x * cs, Y = oy + y * cs;
      const gr = f.createRadialGradient(X, Y, R * .55, X, Y, R + 1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = gr; f.beginPath(); f.arc(X, Y, R + 1, 0, 7); f.fill(); f.globalCompositeOperation = 'source-over';
    }
    const solidAt = (x, y) => x < 0 || y < 0 || x >= cols || y >= rows || m.solid[y * cols + x];
    const cells = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    const blocked = (a, b) => { const n = Math.max(1, cells(a, b) * 4); for (let k = 1; k < n; k++) { const x = Math.floor(a.x + .5 + (b.x - a.x) * k / n), y = Math.floor(a.y + .5 + (b.y - a.y) * k / n); if (solidAt(x, y)) return true; } return false; };
    function draw() {
      const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
      g.drawImage(base, 0, 0); g.setTransform(fr.dp, 0, 0, fr.dp, 0, 0);
      const lim = SPEED * (dashOn ? 2 : 1) / SQ;
      /* where the token can reach this turn */
      g.drawImage(fog, 0, 0, W, H);
      g.fillStyle = drag ? 'rgba(233,207,142,.16)' : 'rgba(233,207,142,.08)';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!solidAt(x, y) && cells({ x, y }, tok) <= lim) g.fillRect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2);
      const T = drag ? drag.cell : tok, X = ox + (T.x + .5) * cs, Y = oy + (T.y + .5) * cs;
      if (drag) {
        const n = cells(drag.cell, tok), mtr = n * SQ, wall = solidAt(drag.cell.x, drag.cell.y) || blocked(tok, drag.cell), col = wall || mtr > SPEED * 2 ? '#ff6b5e' : mtr > SPEED ? '#f0a84a' : '#e9cf8e';
        const SX = ox + (tok.x + .5) * cs, SY = oy + (tok.y + .5) * cs;
        g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(SX, SY); g.lineTo(X, Y); g.stroke(); g.setLineDash([]);
        g.fillStyle = col; g.beginPath(); g.arc(SX, SY, 4, 0, 7); g.fill();
        const label = wall ? (solidAt(drag.cell.x, drag.cell.y) ? 'A wall' : 'A wall is in the way') : mtr + ' m' + (mtr > SPEED * 2 ? ' · too far' : mtr > SPEED ? ' · needs a Dash' : '');
        g.font = '700 13px Manrope, system-ui, sans-serif'; const tw = g.measureText(label).width + 16;
        const lx = Math.min(W - tw - 4, Math.max(4, X + 14)), ly = Math.max(4, Y - 36);
        g.fillStyle = 'rgba(12,12,16,.88)'; g.beginPath(); g.roundRect ? g.roundRect(lx, ly, tw, 24, 8) : g.rect(lx, ly, tw, 24); g.fill(); g.strokeStyle = col; g.lineWidth = 1; g.stroke();
        g.fillStyle = col; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(label, lx + 8, ly + 12.5);
      }
      /* vision ring and token */
      g.strokeStyle = 'rgba(143,212,236,.45)'; g.setLineDash([4, 5]); g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, vM / SQ * cs, 0, 7); g.stroke(); g.setLineDash([]);
      const R = cs * .42;
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(X + 2, Y + 3, R, 0, 7); g.fill();
      g.fillStyle = '#16171c'; g.beginPath(); g.arc(X, Y, R, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = '#c9a962'; g.stroke();
      g.fillStyle = '#e9cf8e'; g.font = `700 ${Math.round(R)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('B', X, Y + 1);
    }
    const toCell = (e) => { const r = c.getBoundingClientRect(); return { x: Math.floor((e.clientX - r.left - ox) / cs), y: Math.floor((e.clientY - r.top - oy) / cs) }; };
    function moveTo(cell) {
      const n = cells(cell, tok), mtr = n * SQ;
      if (solidAt(cell.x, cell.y)) { out.textContent = "That's a wall. Brynn stays where she is."; draw(); return false; }
      if (blocked(tok, cell)) { out.textContent = 'A wall is in the way. Go round it, through the doorways.'; draw(); return false; }
      if (mtr > SPEED * (dashOn ? 2 : 1)) { out.textContent = mtr > SPEED * 2 ? `${mtr} m is too far for one turn.` : `${mtr} m needs a Dash. Turn on Dash to go that far.`; draw(); return false; }
      const steps = Math.max(1, n * 3);
      for (let k = 0; k <= steps; k++) clearAt(tok.x + .5 + (cell.x - tok.x) * k / steps, tok.y + .5 + (cell.y - tok.y) * k / steps);
      tok = { x: cell.x, y: cell.y };
      out.textContent = mtr ? `Brynn moved ${mtr} m. Her ${vM} m of vision clears the fog as she goes.` : 'Brynn stays put.';
      draw(); return true;
    }
    c.addEventListener('pointerdown', (e) => {
      const cell = toCell(e);
      if (cell.x === tok.x && cell.y === tok.y) { drag = { cell }; c.setPointerCapture(e.pointerId); c.classList.add('dragging'); draw(); const h = $('.vis-hint', box); if (h) h.style.opacity = 0; }
      else { moveTo(cell); }
    });
    c.addEventListener('pointermove', (e) => { if (!drag) { const cl = toCell(e); c.classList.toggle('over', cl.x === tok.x && cl.y === tok.y); return; } const cell = toCell(e); cell.x = Math.max(0, Math.min(cols - 1, cell.x)); cell.y = Math.max(0, Math.min(rows - 1, cell.y)); if (cell.x !== drag.cell.x || cell.y !== drag.cell.y) { drag.cell = cell; draw(); } });
    const up = () => { if (!drag) return; const cell = drag.cell; drag = null; c.classList.remove('dragging'); moveTo(cell); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', () => { drag = null; c.classList.remove('dragging'); draw(); });
    c.addEventListener('keydown', (e) => { const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!k) return; e.preventDefault(); moveTo({ x: tok.x + k[0], y: tok.y + k[1] }); });
    vis.addEventListener('input', () => { vM = Number(vis.value); visOut.textContent = vM + ' m'; clearAt(tok.x + .5, tok.y + .5); draw(); });
    dash.addEventListener('click', () => { dashOn = !dashOn; dash.setAttribute('aria-pressed', dashOn); out.textContent = dashOn ? 'Dash: 18 m this turn.' : 'Speed 9 m. Drag Brynn, or click a square.'; draw(); });
    reset.onclick = () => { tok = null; setup(); out.textContent = 'The fog is back. Drag Brynn, or click a square.'; };
    let lastW = 0;
    new ResizeObserver(() => { const w = c.clientWidth; if (w && Math.abs(w - lastW) > 2) { lastW = w; setup(); } }).observe(c);
    const pane = box.closest('.pane'); if (pane) pane.addEventListener('shown', () => { lastW = 0; setup(); });
    if (c.clientWidth) { lastW = c.clientWidth; setup(); }
  });

  /* ════════ the strike: did it hit? then the blow lands ════════ */
  const ATTACK_ICON = {
    swords: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3.5H20v5.5L9 20l-2.5-.5L6 17 14.5 3.5Z"/><path d="m13 11 4 4M4 20l3-3"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.7 3-5.7 3.6-9.3 2 1.2 3.2 3 3.4 5 1-.8 1.6-2 1.7-3.5 2.6 2 4.3 4.6 4.3 7.8 0 3.6-2.6 6.2-6.5 6.2Z"/></svg>',
    arrowup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M19 5h-6M19 5v6M5 19l-1-4M5 19l4 1"/><path d="M7 3c5 1 9 5 10 10" opacity=".55"/></svg>',
    dagger: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 3-3M9 15l9.5-9.5L20 4l-1.5 1.5M7 13l4 4M5.5 14.5l4 4"/></svg>'
  };
  const ATTACKS = [
    { id: 'sword', n: 'Longsword', to: 5, dmg: [1, 8, 3], kind: 'Slashing', fx: 'slash', ico: 'swords' },
    { id: 'bolt', n: 'Fire Bolt', to: 5, dmg: [1, 10, 0], kind: 'Fire', fx: 'bolt', ico: 'flame' },
    { id: 'bow', n: 'Longbow', to: 4, dmg: [1, 8, 2], kind: 'Piercing', fx: 'arrow', ico: 'arrowup' },
    { id: 'dag', n: 'Twin Daggers', to: 5, dmg: [1, 4, 3], kind: 'Piercing, twice', fx: 'stab', twice: true, ico: 'dagger' }
  ];
  $$('.strikedemo').forEach((box) => {
    const stage = $('.sk-stage', box), c = $('canvas', stage), hero = $('.sk-me', stage), ogre = $('.sk-foe', stage), hpb = $('.sk-hp', stage), hpn = $('.sk-hpn', stage);
    const atks = $('.sk-atks', box), roll = $('.sk-roll', box), log = $('.sk-log', box), again = $('.sk-again', box);
    const MAX = 59, DEF = 14; let hp = MAX, busy = false, fx = [], fr = null;
    atks.innerHTML = ATTACKS.map((a) => `<button type="button" class="btn sk-atk" data-a="${a.id}"><span class="sk-ai">${ATTACK_ICON[a.ico] || ''}</span><span><b>${esc(a.n)}</b><small>+${a.to} to hit · ${a.dmg[0]}d${a.dmg[1]}${a.dmg[2] ? ' + ' + a.dmg[2] : ''}${a.twice ? ' ×2' : ''}</small></span></button>`).join('');
    const center = (el) => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2]; };
    const paintHp = () => { hpb.style.setProperty('--hp', Math.max(0, hp / MAX * 100) + '%'); hpn.textContent = Math.max(0, hp) + ' / ' + MAX; hpb.classList.toggle('low', hp / MAX < .35); };
    const float = (txt, cls) => { const s = document.createElement('span'); s.className = 'sk-float ' + (cls || ''); s.textContent = txt; const [x, y] = center(ogre); s.style.left = x + 'px'; s.style.top = (y - 40) + 'px'; stage.append(s); setTimeout(() => s.remove(), 1300); };
    const addLog = (html) => { const li = document.createElement('li'); li.innerHTML = html; log.prepend(li); while (log.children.length > 4) log.lastChild.remove(); };
    const a = animate(c, (t) => {
      if (!fr) fr = fit(c); const g = fr.x; g.clearRect(0, 0, fr.W, fr.H);
      fx = fx.filter((f) => t - f.t0 < f.dur + 50);
      fx.forEach((f) => { const k = Math.max(0, Math.min(1, (t - f.t0) / f.dur)); if (t >= f.t0) f.draw(g, k); });
    });
    new ResizeObserver(() => { fr = null; }).observe(stage);
    const pushFx = (dur, draw, delay = 0) => { fx.push({ t0: performance.now() + delay, dur, draw }); a.kick(); };
    function play(atk, hit, onImpact) {
      const [hx, hy] = center(hero), [ox, oy] = center(ogre), miss = !hit;
      const tx = miss ? ox + 30 : ox, ty = miss ? oy - 46 : oy;
      if (RM.matches) { onImpact(); return; }
      if (atk.fx === 'slash' || atk.fx === 'stab') {
        hero.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${(ox - hx) * .55}px,${(oy - hy) * .55}px)` }, { transform: 'translate(0,0)' }], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
        const hits = atk.fx === 'stab' ? [0, 230] : [0];
        hits.forEach((dl, i) => pushFx(380, (g, k) => {
          g.save(); g.globalAlpha = 1 - k; g.lineCap = 'round';
          if (atk.fx === 'slash') { g.strokeStyle = '#f6e7bf'; g.shadowColor = '#e9cf8e'; g.shadowBlur = 16; g.lineWidth = 6 * (1 - k) + 1; g.beginPath(); g.arc(tx - 10, ty + 6, 46, -2.3 + k * .4, -2.3 + k * .4 + 2.1 * Math.min(1, k * 2.5)); g.stroke(); }
          else { g.strokeStyle = '#dfe6f0'; g.shadowColor = '#fff'; g.shadowBlur = 10; g.lineWidth = 3; const s = i ? 1 : -1; g.beginPath(); g.moveTo(tx - 34 * s, ty - 26); g.lineTo(tx - 34 * s + 60 * s * Math.min(1, k * 3), ty - 26 + 46 * Math.min(1, k * 3)); g.stroke(); }
          g.restore();
        }, 230 + dl));
        setTimeout(onImpact, 330);
      } else {
        const dur = atk.fx === 'bolt' ? 460 : 260;
        const trail = [];
        pushFx(dur, (g, k) => {
          const e = atk.fx === 'bolt' ? k * k * (3 - 2 * k) : k, x = hx + (tx - hx) * e, y = hy + (ty - hy) * e - Math.sin(k * Math.PI) * (atk.fx === 'arrow' ? 26 : 10);
          if (atk.fx === 'bolt') {
            trail.push([x, y]); if (trail.length > 14) trail.shift();
            g.save(); g.globalCompositeOperation = 'lighter';
            trail.forEach(([px, py], i) => { const rr = 4 + i * .9; const gr = g.createRadialGradient(px, py, 0, px, py, rr * 2); gr.addColorStop(0, `rgba(255,220,120,${i / 14})`); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px, py, rr * 2, 0, 7); g.fill(); });
            const gr = g.createRadialGradient(x, y, 0, x, y, 18); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(.4, '#ff9a2e'); gr.addColorStop(1, 'rgba(255,60,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); g.restore();
          } else {
            const ang = Math.atan2((ty - hy) - Math.cos(k * Math.PI) * Math.PI * 26, tx - hx);
            g.save(); g.translate(x, y); g.rotate(ang); g.strokeStyle = '#e8dcc0'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, 0); g.lineTo(6, 0); g.stroke();
            g.fillStyle = '#cfd6de'; g.beginPath(); g.moveTo(10, 0); g.lineTo(2, -4); g.lineTo(2, 4); g.fill();
            g.strokeStyle = '#b8322e'; g.beginPath(); g.moveTo(-26, 0); g.lineTo(-32, -5); g.moveTo(-26, 0); g.lineTo(-32, 5); g.stroke();
            g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(-70, 0); g.lineTo(-30, 0); g.stroke(); g.restore();
          }
        });
        setTimeout(() => {
          onImpact();
          if (hit && atk.fx === 'bolt') pushFx(520, (g, k) => {
            g.save(); g.globalCompositeOperation = 'lighter';
            const gr = g.createRadialGradient(ox, oy, 0, ox, oy, 70 * k + 10); gr.addColorStop(0, `rgba(255,240,180,${1 - k})`); gr.addColorStop(.5, `rgba(255,130,40,${(1 - k) * .8})`); gr.addColorStop(1, 'rgba(255,60,20,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, 70 * k + 10, 0, 7); g.fill();
            for (let i = 0; i < 12; i++) { const an = i / 12 * 6.28, rr = 20 + k * 60; g.fillStyle = `rgba(255,200,90,${1 - k})`; g.beginPath(); g.arc(ox + Math.cos(an) * rr, oy + Math.sin(an) * rr, 3 * (1 - k) + 1, 0, 7); g.fill(); }
            g.restore();
          });
        }, dur);
      }
    }
    atks.addEventListener('click', (e) => {
      const b = e.target.closest('.sk-atk'); if (!b || busy || hp <= 0) return;
      const atk = ATTACKS.find((x) => x.id === b.dataset.a); busy = true; $$('.sk-atk', atks).forEach((x) => { x.disabled = true; });
      const swings = atk.twice ? 2 : 1; let i = 0, total = 0;
      const one = () => {
        const nat = d(20), sum = nat + atk.to, crit = nat === 20, hit = crit || (nat !== 1 && sum >= DEF);
        let dmg = 0, dice = [];
        if (hit) { for (let k = 0; k < atk.dmg[0] * (crit ? 2 : 1); k++) dice.push(d(atk.dmg[1])); dmg = dice.reduce((s, v) => s + v, 0) + atk.dmg[2]; }
        roll.innerHTML = `<span class="sk-d20${crit ? ' crit' : nat === 1 ? ' fumble' : ''}">${nat}</span><span>d20 + ${atk.to} = <b>${sum}</b> against defence ${DEF}<br>${crit ? '<b class="g">Critical hit!</b> Damage dice doubled.' : hit ? '<b class="g">Hit.</b>' : nat === 1 ? '<b class="r">A natural 1.</b> It goes wide.' : '<b class="r">Miss.</b>'}</span>`;
        play(atk, hit, () => {
          if (hit) {
            hp -= dmg; total += dmg; paintHp(); float('−' + dmg, crit ? 'crit' : '');
            if (!RM.matches) ogre.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 340 });
            ogre.classList.remove('flash'); void ogre.offsetWidth; ogre.classList.add('flash');
          } else float('MISS', 'miss');
          addLog(`<b>${esc(atk.n)}</b> ${hit ? `hits for <b>${dmg}</b> ${esc(atk.kind.split(',')[0].toLowerCase())}${dice.length ? ` <small>(${dice.join(' + ')}${atk.dmg[2] ? ' + ' + atk.dmg[2] : ''})</small>` : ''}` : 'misses'}`);
          i++;
          if (hp <= 0) { setTimeout(() => { ogre.classList.add('down'); addLog('<b class="r">The Ogre falls.</b>'); again.hidden = false; busy = false; }, 500); return; }
          if (i < swings) setTimeout(one, 650); else setTimeout(() => { busy = false; $$('.sk-atk', atks).forEach((x) => { x.disabled = false; }); }, 450);
        });
      };
      one();
    });
    again.onclick = () => { hp = MAX; paintHp(); ogre.classList.remove('down'); again.hidden = true; log.innerHTML = ''; roll.innerHTML = '<span class="sk-d20">20</span><span>Choose an attack. The Ogre has defence 14.</span>'; $$('.sk-atk', atks).forEach((x) => { x.disabled = false; }); };
    paintHp();
  });

  /* ════════ down is not dead: death saves ════════ */
  $$('.deathdemo').forEach((box) => {
    const tok = $('.dd-tok', box), st = $('.dd-state', box), hpEl = $('.dd-hp', box), sP = $$('.dd-s i', box), fP = $$('.dd-f i', box), die = $('.dd-die', box), out = $('.dd-out', box);
    const rollB = $('.dd-roll', box), healB = $('.dd-heal', box), resetB = $('.dd-reset', box);
    let s = 0, f = 0, state = 'down', hp = 0;
    const paint = () => {
      sP.forEach((p, i) => p.classList.toggle('on', i < s)); fP.forEach((p, i) => p.classList.toggle('on', i < f));
      tok.dataset.state = state; hpEl.textContent = hp + ' / 27 HP';
      st.textContent = { down: 'Down', stable: 'Stable', dead: 'Dead', up: 'Back up' }[state];
      st.dataset.state = state;
      rollB.disabled = state !== 'down'; healB.disabled = state === 'dead' || state === 'up';
    };
    rollB.onclick = () => {
      const v = d(20);
      die.textContent = v; die.classList.remove('spin'); void die.offsetWidth; if (!RM.matches) die.classList.add('spin');
      die.classList.toggle('crit', v === 20); die.classList.toggle('fumble', v === 1);
      if (v === 20) { state = 'up'; hp = 1; s = 0; f = 0; out.innerHTML = '<b>A natural 20!</b> Mira gasps awake with 1 HP.'; }
      else if (v === 1) { f = Math.min(3, f + 2); out.innerHTML = '<b>A natural 1.</b> It counts as two failures.'; }
      else if (v >= 10) { s++; out.innerHTML = `<b>${v}.</b> A success.`; }
      else { f++; out.innerHTML = `<b>${v}.</b> A failure.`; }
      if (state === 'down' && s >= 3) { state = 'stable'; out.innerHTML += ' Three successes: she is <b>stable</b>, and gets up with 1 HP when the fight ends.'; }
      if (state === 'down' && f >= 3) { state = 'dead'; out.innerHTML += ' Three failures. Mira is <b>dead</b>, and every screen plays the fall.'; }
      paint();
    };
    healB.onclick = () => { hp = Math.min(27, hp + 5); state = 'up'; s = 0; f = 0; out.innerHTML = 'Brynn lays on hands. <b>Healing brings Mira straight back</b>, with ' + hp + ' HP.'; paint(); };
    resetB.onclick = () => { s = 0; f = 0; hp = 0; state = 'down'; die.textContent = '–'; die.classList.remove('crit', 'fumble'); out.innerHTML = 'Mira took a blow to 0 HP. On her turn, roll her death save: 10 or more is a success.'; paint(); };
    resetB.onclick();
  });

  /* ════════ the bestiary and the encounter tray ════════ */
  const E = {
    goblin: '<path d="M20 31c0-9 5-15 12-15s12 6 12 15c0 9-5 16-12 16s-12-7-12-16Z"/><path d="M20.5 28 5 19l13 16M43.5 28 59 19 46 35"/><path d="M25 28l4 1.5M39 28l-4 1.5"/><circle cx="27" cy="32" r="1.6"/><circle cx="37" cy="32" r="1.6"/><path d="M26 39.5c3.5 2.6 8.5 2.6 12 0M29.5 40.5l1 2.2 1-1.9M33 40.7l1 2 1-2.2"/>',
    wolf: '<path d="M32 54 19 40l-4-25 11 9h12l11-9-4 25-13 14Z"/><path d="M19 15l7 9M45 15l-7 9"/><path d="M24 33l5 2M40 33l-5 2"/><path d="M27 44h10l-5 5-5-5Z"/><path d="M32 49v3M22 41l-6 2M42 41l6 2"/>',
    skeleton: '<path d="M32 10c9 0 15.5 6 15.5 14 0 5-2.4 8.4-6 10.4V41h-19v-6.6c-3.6-2-6-5.4-6-10.4 0-8 6.5-14 15.5-14Z"/><circle cx="26" cy="25" r="3.6"/><circle cx="38" cy="25" r="3.6"/><path d="m32 29-2 4h4l-2-4ZM27 41v-4M32 41v-4M37 41v-4"/><path d="M12 46l40 10M52 46 12 56"/><circle cx="11" cy="45" r="2"/><circle cx="53" cy="45" r="2"/><circle cx="11" cy="57" r="2"/><circle cx="53" cy="57" r="2"/>',
    zombie: '<path d="M18 30c0-11 6-18 15-18 8 0 13 6 13 15 0 4-1 6-2 8l1 7c0 6-5 10-12 10-9 0-15-7-15-14v-8Z"/><path d="M22 26l5 3M24 31l4-5"/><circle cx="38" cy="29" r="2.6"/><path d="M26 43h12M28 41v4M31 41v4M34 41v4M37 41v4"/><path d="M33 12l-2 6 3 3M46 22l-5 2"/>',
    ogre: '<path d="M14 30c0-11 8-18 18-18s18 7 18 18v5c0 10-8 17-18 17s-18-7-18-17v-5Z"/><path d="M21 27l7 2.5M43 27l-7 2.5"/><circle cx="26" cy="32" r="1.7"/><circle cx="38" cy="32" r="1.7"/><path d="M29 36.5h6"/><path d="M23 42c5 4 13 4 18 0"/><path d="M25 43l-1.5-6M39 43l1.5-6"/><path d="M14 33l-4 1M50 33l4 1"/>',
    troll: '<path d="M20 22c2-7 7-11 13-11 7 0 12 5 12 12v8c0 10-6 20-14 20-7 0-11-5-11-12"/><path d="M32 30c-4 3-12 4-17 9 4 1 9 1 13-1"/><circle cx="37" cy="25" r="1.8"/><path d="M33 22l7-1"/><path d="M24 44l7 1M27 12l-6-6M33 11l-1-7M39 13l5-6M44 18l7-3"/>',
    spider: '<ellipse cx="32" cy="38" rx="9" ry="11"/><circle cx="32" cy="22" r="6"/><circle cx="29.5" cy="21" r="1"/><circle cx="34.5" cy="21" r="1"/><path d="M26 25 14 16l-6 8M38 25l12-9 6 8M24 32 10 30l-5 12M40 32l14-2 5 12M24 40 12 46l-2 12M40 40l12 6 2 12M27 47l-6 12M37 47l6 12"/>',
    dragon: '<path d="M8 40 26 30l6-14 3 11 17 2 7 7-12 3 9 6-15 3-11-2-14 6"/><path d="M32 16 28 6M35 27l8-15"/><circle cx="41" cy="33" r="1.8"/><path d="M47 40l2 3M53 37l2 2"/><path d="M60 41c3 0 4 2 3 4M61 34c2 0 3-1 3-3" opacity=".7"/><path d="M14 46c-3 3-5 6-5 10M22 44c-1 3-1 6 0 9"/>'
  };
  const BEASTS = [
    { id: 'goblin', n: 'Goblin', type: 'Humanoid', g: 'humanoid', cr: '1/4', hp: 7, def: 15, spd: '9 m', atk: 'Scimitar +4, 1d6 + 2', note: 'Slips away after it strikes.' },
    { id: 'wolf', n: 'Wolf', type: 'Beast', g: 'beast', cr: '1/4', hp: 11, def: 13, spd: '12 m', atk: 'Bite +4, 2d4 + 2, may knock prone', note: 'Hunts in packs.' },
    { id: 'skeleton', n: 'Skeleton', type: 'Undead', g: 'undead', cr: '1/4', hp: 13, def: 13, spd: '9 m', atk: 'Shortsword +4, 1d6 + 2', note: 'Bludgeoning hurts it more.' },
    { id: 'zombie', n: 'Zombie', type: 'Undead', g: 'undead', cr: '1/4', hp: 22, def: 8, spd: '6 m', atk: 'Slam +3, 1d6 + 1', note: 'Hard to put down for good.' },
    { id: 'spider', n: 'Giant Spider', type: 'Beast', g: 'beast', cr: '1', hp: 26, def: 14, spd: '9 m, climbs', atk: 'Bite +5, 1d8 + 3 and poison', note: 'Webs hold whoever they catch.' },
    { id: 'ogre', n: 'Ogre', type: 'Giant', g: 'giant', cr: '2', hp: 59, def: 11, spd: '12 m', atk: 'Greatclub +6, 2d8 + 4', note: 'Hits like a falling door.' },
    { id: 'troll', n: 'Troll', type: 'Giant', g: 'giant', cr: '5', hp: 84, def: 15, spd: '9 m', atk: 'Bite and two claws, +7', note: 'Regrows unless burned.' },
    { id: 'dragon', n: 'Young Red Dragon', type: 'Dragon', g: 'dragon', cr: '10', hp: 178, def: 18, spd: '12 m, flies 24 m', atk: 'Fire breath, a 9 m cone, 16d6', note: 'Its breath fills a cone.' }
  ];
  const TYPECOL = { humanoid: '#d9a05b', beast: '#8fbf6a', undead: '#a7b4c9', giant: '#d9785b', dragon: '#e5484d' };
  $$('.bestdemo').forEach((box) => {
    const grid = $('.bd-grid', box), filt = $('.bd-filter', box), tray = $('.bd-list', box), drop = $('.bd-drop', box), map = $('.bd-map', box), sum = $('.bd-sum', box);
    const enc = new Map();
    grid.innerHTML = BEASTS.map((b) => `<article class="bd-card" data-g="${b.g}">
      <button type="button" class="bd-flip" aria-pressed="false" aria-label="${esc(b.n)}: show its stats">
        <span class="bd-face bd-front"><span class="bd-em"><svg viewBox="0 0 64 64" aria-hidden="true">${E[b.id]}</svg></span><span class="bd-n">${esc(b.n)}</span><span class="bd-t">${esc(b.type)} · CR ${b.cr}</span></span>
        <span class="bd-face bd-back"><span class="bd-n">${esc(b.n)}</span><span class="bd-stats"><span><b>${b.hp}</b>HP</span><span><b>${b.def}</b>DEF</span><span><b>${esc(b.spd.split(',')[0])}</b>SPD</span></span><span class="bd-atk">${esc(b.atk)}</span><span class="bd-note">${esc(b.note)}</span></span>
      </button>
      <button type="button" class="bd-add" data-id="${b.id}" aria-label="Add a ${esc(b.n)} to the encounter">+</button></article>`).join('');
    $$('.bd-card', grid).forEach((c) => c.style.setProperty('--tc', TYPECOL[c.dataset.g]));
    const groups = [['all', 'All'], ['beast', 'Beasts'], ['humanoid', 'Humanoids'], ['undead', 'Undead'], ['giant', 'Giants'], ['dragon', 'Dragons']];
    filt.innerHTML = groups.map(([k, n]) => `<button type="button" data-g="${k}" aria-pressed="${k === 'all'}">${n}</button>`).join('');
    filt.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('button', filt).forEach((x) => x.setAttribute('aria-pressed', x === b)); $$('.bd-card', grid).forEach((c) => { c.hidden = b.dataset.g !== 'all' && c.dataset.g !== b.dataset.g; }); });
    grid.addEventListener('click', (e) => {
      const f = e.target.closest('.bd-flip'); if (f) { const on = f.getAttribute('aria-pressed') !== 'true'; f.setAttribute('aria-pressed', on); f.closest('.bd-card').classList.toggle('flipped', on); return; }
      const a = e.target.closest('.bd-add'); if (!a) return;
      enc.set(a.dataset.id, (enc.get(a.dataset.id) || 0) + 1); paintTray();
      a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop');
    });
    tray.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (!b) return; const n = (enc.get(b.dataset.id) || 0) - 1; n > 0 ? enc.set(b.dataset.id, n) : enc.delete(b.dataset.id); paintTray(); });
    function paintTray() {
      const list = [...enc.entries()];
      tray.innerHTML = list.length ? list.map(([id, n]) => { const b = BEASTS.find((x) => x.id === id); return `<li><span class="bd-mini" data-g="${b.g}">${b.n.charAt(0)}</span>${esc(b.n)}<b>×${n}</b><button type="button" data-id="${id}" aria-label="Remove one ${esc(b.n)}">−</button></li>`; }).join('') : '<li class="empty">Add creatures with the + on each card.</li>';
      $$('.bd-mini', tray).forEach((m) => m.style.setProperty('--tc', TYPECOL[m.dataset.g]));
      const count = list.reduce((s, [, n]) => s + n, 0), hp = list.reduce((s, [id, n]) => s + BEASTS.find((x) => x.id === id).hp * n, 0);
      sum.textContent = count ? `${count} creature${count > 1 ? 's' : ''} · ${hp} HP in all` : 'Empty';
      drop.disabled = !count;
    }
    drop.onclick = () => {
      $$('.bd-tok', map).forEach((t) => t.remove());
      let k = 0; const all = []; enc.forEach((n, id) => { for (let i = 0; i < n; i++) all.push(id); });
      const cx = 62, cy = 46;
      all.slice(0, 16).forEach((id, i) => {
        const b = BEASTS.find((x) => x.id === id), big = ['ogre', 'troll', 'dragon'].includes(id);
        const ang = i * 2.399, rad = 7 + Math.sqrt(i) * 9;
        const t = document.createElement('span'); t.className = 'bd-tok' + (big ? ' big' : ''); t.textContent = b.n.charAt(0); t.title = b.n;
        t.style.left = Math.max(6, Math.min(94, cx + Math.cos(ang) * rad)) + '%'; t.style.top = Math.max(10, Math.min(90, cy + Math.sin(ang) * rad * .8)) + '%';
        t.style.setProperty('--tc', TYPECOL[b.g]); t.style.setProperty('--d', (k++ * 0.07).toFixed(2) + 's');
        map.append(t);
      });
      map.classList.add('dropped');
      const n = all.length; window.ArcToast && window.ArcToast(`${n} creature${n > 1 ? 's' : ''} dropped on the map, together.`);
    };
    paintTray();
  });

  /* ════════ a d20 in 3D: drag to spin it, tap to roll it ════════ */
  $$('.d20-3d').forEach((c) => {
    const phi = (1 + Math.sqrt(5)) / 2;
    const V = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]].map((v) => { const l = Math.hypot(...v); return v.map((x) => x / l); });
    const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const NUM = [20, 8, 14, 2, 12, 4, 18, 6, 10, 16, 1, 13, 7, 19, 9, 17, 3, 11, 5, 15];
    let rx = -.5, ry = .6, vx = .004, vy = .007, drag = null, fr = null, rolling = 0, target = null;
    const rot = (p) => { let [x, y, z] = p; let c1 = Math.cos(ry), s1 = Math.sin(ry); [x, z] = [x * c1 + z * s1, -x * s1 + z * c1]; c1 = Math.cos(rx); s1 = Math.sin(rx); [y, z] = [y * c1 - z * s1, y * s1 + z * c1]; return [x, y, z]; };
    const a = animate(c, (t) => {
      if (!fr) fr = fit(c); const { x: g, W, H } = fr; g.clearRect(0, 0, W, H);
      if (!drag) {
        if (target) { rx += (target[0] - rx) * .12; ry += (target[1] - ry) * .12; if (Math.abs(target[0] - rx) + Math.abs(target[1] - ry) < .002) target = null; }
        else { rx += vx; ry += vy; vx += (.0025 - vx) * .02; vy += (.004 - vy) * .02; }
      }
      const R = Math.min(W, H) * .38, cx = W / 2, cy = H / 2, P = V.map(rot);
      const faces = F.map((f, i) => { const p = f.map((k) => P[k]), z = (p[0][2] + p[1][2] + p[2][2]) / 3; const n = [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, z]; return { p, z, n, i }; }).sort((A, B) => A.z - B.z);
      faces.forEach(({ p, n, i }) => {
        const nl = Math.hypot(...n), nz = n[2] / nl; if (nz < -0.05) return;
        const L = Math.max(0, (n[0] * -.4 + n[1] * -.6 + n[2] * .7) / nl);
        g.beginPath(); p.forEach(([x, y], k) => { const X = cx + x * R * (1 + p[k][2] * .08), Y = cy + y * R * (1 + p[k][2] * .08); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath();
        const sh = .35 + L * .65; g.fillStyle = `rgb(${Math.round(70 + 150 * sh)},${Math.round(52 + 120 * sh)},${Math.round(20 + 60 * sh)})`; g.fill();
        g.strokeStyle = 'rgba(250,236,200,.75)'; g.lineWidth = 1.4; g.lineJoin = 'round'; g.stroke();
        if (nz > .35) {
          const X = cx + (n[0] / 1) * R * .98, Y = cy + (n[1] / 1) * R * .98;
          g.save(); g.globalAlpha = Math.min(1, (nz - .35) * 2.2); g.fillStyle = '#1a1408'; g.font = `700 ${Math.round(R * .22 * nz)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(NUM[i], X, Y); g.restore();
        }
      });
      const gl = g.createRadialGradient(cx - R * .3, cy - R * .4, 0, cx, cy, R * 1.3); gl.addColorStop(0, 'rgba(255,245,215,.18)'); gl.addColorStop(1, 'rgba(255,245,215,0)'); g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, R * 1.3, 0, 7); g.fill();
    });
    c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; c.setPointerCapture(e.pointerId); target = null; });
    c.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); ry += dx * .01; rx += dy * .01; vy = dx * .004; vx = dy * .004; drag.x = e.clientX; drag.y = e.clientY; a.kick(); });
    const up = () => {
      if (!drag) return; const tap = drag.moved < 6; drag = null;
      if (tap) { /* roll: spin hard, then settle with a face toward you */
        vx = .12 + Math.random() * .1; vy = .16 + Math.random() * .1;
        clearTimeout(rolling); rolling = setTimeout(() => {
          const pick = Math.floor(Math.random() * 20), f = F[pick], n = [0, 1, 2].map((k) => (V[f[0]][k] + V[f[1]][k] + V[f[2]][k]) / 3);
          const ty = -Math.atan2(n[0], n[2]), nz = -n[0] * Math.sin(ty) + n[2] * Math.cos(ty), tx = Math.atan2(n[1], nz);
          const wrap = (cur, to) => to + Math.round((cur - to) / (2 * Math.PI)) * 2 * Math.PI;
          target = [wrap(rx, tx), wrap(ry, ty)];
          const lab = c.parentElement.querySelector('.d20-out'); if (lab) { lab.textContent = NUM[pick] === 20 ? 'Natural 20!' : 'You rolled ' + NUM[pick]; lab.classList.toggle('crit', NUM[pick] === 20); }
        }, RM.matches ? 0 : 700);
      }
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drag = { moved: 0 }; up(); } });
    new ResizeObserver(() => { fr = null; a.kick(); }).observe(c);
  });
})();
