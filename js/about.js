/* Arzantia website - the About page: the night mountain with snow and cedars behind the hero, the story's
   scenes changing as the chapters scroll by, the mark explained part by part, and a cedar trunk that
   grows a ring for every session. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function fit(c) {
    const dp = Math.min(devicePixelRatio || 1, 2), W = Math.max(1, c.clientWidth), H = Math.max(1, c.clientHeight);
    c.width = Math.round(W * dp); c.height = Math.round(H * dp);
    const x = c.getContext('2d'); x.setTransform(dp, 0, 0, dp, 0, 0); return { x, W, H };
  }
  const CEDAR = new Path2D('M46.5 120L48 30h4l1.5 90ZM1 104Q24.5 100.5 48 101.5Q71.5 100.5 95 104Q83.2 92.8 62.1 90Q48 85.8 33.9 90Q12.8 92.8 1 104ZM16 88Q36 84.8 56 85.7Q76 84.8 96 88Q86 77.6 68 75Q56 71.1 44 75Q26 77.6 16 88ZM2 73Q23.5 69.8 45 70.7Q66.5 69.8 88 73Q77.2 62.6 57.9 60Q45 56.1 32.1 60Q12.8 62.6 2 73ZM22 58Q38 55 54 55.8Q70 55 86 58Q78 48.4 63.6 46Q54 42.4 44.4 46Q30 48.4 22 58ZM20 45Q33.5 42.2 47 43Q60.5 42.2 74 45Q67.2 36.2 55.1 34Q47 30.7 38.9 34Q26.8 36.2 20 45ZM35 33Q43.5 30.5 52 31.2Q60.5 30.5 69 33Q64.8 25 57.1 23Q52 20 46.9 23Q39.2 25 35 33ZM41 24Q45.5 22 50 22.6Q54.5 22 59 24Q56.8 17.6 52.7 16Q50 13.6 47.3 16Q43.2 17.6 41 24Z');

  /* ── the mark finishes drawing, then its stars twinkle ── */
  $$('.ab-mark.draw').forEach((m) => setTimeout(() => m.classList.add('done'), RM.matches ? 0 : 3900));

  /* ── hero sky: stars, three ridges of Mount Lebanon, cedars on the near slope, falling snow ── */
  const sky = $('.ab-sky');
  if (sky) {
    let fr = null, ridges = [], flakes = [], stars = [], vis = true, raf = 0, px = 0, tx = 0;
    const build = () => {
      fr = fit(sky); const { W, H } = fr, r = rng(7);
      const ridge = (base, amp, rough, seed) => { const rr = rng(seed), pts = []; let y = 0, v = 0; for (let x = -20; x <= W + 20; x += 8) { v += (rr() - .5) * rough; v *= .9; y += v; y *= .97; pts.push([x, base + y * amp + Math.sin(x / W * Math.PI * 1.3 + seed) * amp * 5]); } return pts; };
      ridges = [
        { pts: ridge(H * .5, 3.2, 3, 3), col: '#141c24', snow: true, k: .15 },
        { pts: ridge(H * .62, 2.6, 3, 9), col: '#0f161b', snow: true, k: .3 },
        { pts: ridge(H * .78, 1.6, 2, 17), col: '#0a0f10', snow: false, k: .55, trees: true }
      ];
      ridges[2].cedars = []; for (let i = 0; i < Math.round(W / 70); i++) { const x = r() * W; ridges[2].cedars.push([x, .5 + r() * .7]); }
      stars = Array.from({ length: Math.round(W * H / 5000) }, () => [r() * W, r() * H * .6, r() * 1.3 + .2, r() * 6]);
      flakes = Array.from({ length: Math.round(W / 9) }, () => [r() * W, r() * H, r() * 1.8 + .4, r() * .6 + .3, r() * 6]);
    };
    const ridgeY = (pts, x) => { const i = Math.max(0, Math.min(pts.length - 2, Math.floor((x + 20) / 8))); const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; return y0 + (y1 - y0) * ((x - x0) / (x1 - x0)); };
    const draw = (t) => {
      if (!fr) build(); const { x: g, W, H } = fr, T = t / 1000;
      px += (tx - px) * .05;
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#07080b'); sky.addColorStop(.55, '#0d1418'); sky.addColorStop(1, '#09090b');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      const glow = g.createRadialGradient(W / 2, H * .38, 0, W / 2, H * .38, W * .45); glow.addColorStop(0, 'rgba(46,140,100,.16)'); glow.addColorStop(.5, 'rgba(201,169,98,.06)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      stars.forEach(([x, y, s, p]) => { g.globalAlpha = .35 + .35 * Math.sin(T * 1.4 + p); g.fillStyle = '#efe9dd'; g.fillRect(x, y, s, s); }); g.globalAlpha = 1;
      const sy = Math.min(scrollY, H) ;
      ridges.forEach((rd, i) => {
        g.save(); g.translate(px * rd.k * 30, sy * rd.k * .35);
        g.beginPath(); g.moveTo(-40, H + 40); rd.pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(W + 40, H + 40); g.closePath(); g.fillStyle = rd.col; g.fill();
        if (rd.snow) { /* snow on the high ground */
          g.save(); g.clip(); const top = Math.min(...rd.pts.map((p) => p[1]));
          const sg = g.createLinearGradient(0, top, 0, top + 70); sg.addColorStop(0, i ? 'rgba(200,210,225,.32)' : 'rgba(220,228,240,.42)'); sg.addColorStop(1, 'rgba(200,210,225,0)');
          g.fillStyle = sg; g.fillRect(-40, top, W + 80, 70); g.restore();
        }
        if (rd.cedars) rd.cedars.forEach(([x, s]) => { const y = ridgeY(rd.pts, x); g.save(); g.translate(x - 30 * s, y - 70 * s); g.scale(.6 * s, .6 * s); g.fillStyle = '#0c1612'; g.fill(CEDAR); g.restore(); });
        g.restore();
      });
      flakes.forEach((f) => { f[1] += f[3]; f[0] += Math.sin(T + f[4]) * .3 - .15; if (f[1] > H) { f[1] = -5; f[0] = Math.random() * W; } g.globalAlpha = .55; g.fillStyle = '#fff'; g.beginPath(); g.arc(f[0], f[1], f[2], 0, 7); g.fill(); });
      g.globalAlpha = 1;
    };
    const loop = (t) => { raf = 0; if (!vis || document.hidden) return; draw(t); raf = requestAnimationFrame(loop); };
    const go = () => { if (RM.matches) { draw(0); return; } if (vis && !raf) raf = requestAnimationFrame(loop); };
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; go(); }).observe(sky);
    document.addEventListener('visibilitychange', go);
    new ResizeObserver(() => { fr = null; if (RM.matches) draw(0); }).observe(sky);
    sky.parentElement.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') tx = (e.clientX / innerWidth - .5) * 2; });
    draw(performance.now());
  }

  /* ── the story: the chapter in the middle of the screen picks the scene ── */
  const stage = $('.stage');
  if (stage) {
    const chs = $$('.ch'), num = $('[data-ring]', stage), name = $('[data-ring-name]', stage), R = ['I', 'II', 'III', 'IV'];
    const pick = (ch) => {
      chs.forEach((c) => c.classList.toggle('on', c === ch));
      const n = ch.dataset.scene;
      if (stage.dataset.on !== n) { stage.dataset.on = n; num.textContent = R[n - 1]; name.textContent = ch.dataset.name; }
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) pick(en.target); }), { rootMargin: '-45% 0px -45% 0px' });
      chs.forEach((c) => io.observe(c));
    }
    pick(chs[0]);
  }

  /* ── the mark, part by part ── */
  const big = $('.ab-mark.big');
  if (big) {
    const btns = $$('.anat-list button');
    const show = (b) => { btns.forEach((x) => x.classList.toggle('on', x === b)); if (b) big.dataset.part = b.dataset.part; else delete big.dataset.part; };
    btns.forEach((b) => {
      b.addEventListener('pointerenter', () => show(b)); b.addEventListener('focus', () => show(b));
      b.addEventListener('click', () => show(b.classList.contains('on') && b.dataset.sticky ? null : b));
    });
    $('.anat-list').addEventListener('pointerleave', () => { if (!btns.some((b) => b === document.activeElement)) show(null); });
    btns.forEach((b) => b.addEventListener('blur', () => setTimeout(() => { if (!btns.includes(document.activeElement)) show(null); }, 0)));
  }

  /* ── the trunk: one ring per session ── */
  const trunk = $('.trunk');
  if (trunk) {
    const sec = trunk.closest('section'), cnt = $('[data-count]', sec), yrs = $('[data-years]', sec);
    let rings = [], fr = null, grow = 0, raf = 0, seed = 11;
    const ring = (i) => { const r = rng(seed + i * 31); return { w: .7 + r() * .7, ph: r() * 6, wob: .012 + r() * .018, born: 0 }; };
    const set = (n) => { rings = Array.from({ length: n }, (_, i) => ring(i)); };
    const words = (n) => { const w = Math.round(n / 4.3); if (n < 5) return 'a few weeks'; if (w < 12) return 'about ' + (w < 2 ? 'a month' : ['', '', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'][w] + ' months'); const y = n / 50; return y < 1.5 ? 'about a year' : 'about ' + Math.round(y) + ' years'; };
    const label = () => { cnt.textContent = rings.length; yrs.textContent = words(rings.length); };
    const draw = (t) => {
      if (!fr) fr = fit(trunk); const { x: g, W, H } = fr, cx = W / 2, cy = H / 2, R = Math.min(W, H) * .44;
      g.clearRect(0, 0, W, H);
      const n = rings.length, tot = rings.reduce((s, r) => s + r.w, 0) + 1.2;
      const shape = (rad, rr) => { g.beginPath(); for (let k = 0; k <= 72; k++) { const a = k / 72 * Math.PI * 2, wob = 1 + Math.sin(a * 3 + rr.ph) * rr.wob + Math.sin(a * 5 + rr.ph * 2) * rr.wob * .6; const x = cx + Math.cos(a) * rad * wob, y = cy + Math.sin(a) * rad * wob * .97; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
      /* bark */
      shape(R * 1.08, { ph: 1, wob: .03 }); g.fillStyle = '#3a2614'; g.fill();
      shape(R * 1.08, { ph: 1, wob: .03 }); g.lineWidth = 3; g.strokeStyle = '#1f140a'; g.stroke();
      /* wood, from the outside in */
      let acc = tot;
      for (let i = n - 1; i >= -1; i--) {
        const rr = i >= 0 ? rings[i] : { w: 1.2, ph: 0, wob: .01 };
        const k = i >= 0 && rings[i].born ? Math.min(1, (t - rings[i].born) / 700) : 1;
        const rad = R * (acc / tot) * (i === n - 1 ? (0.92 + .08 * k) : 1);
        shape(rad, rr);
        const light = i % 2 ? '#c99a62' : '#b7864f';
        g.fillStyle = i === -1 ? '#8a5f34' : light; g.fill();
        g.lineWidth = Math.max(1, R / 120); g.strokeStyle = 'rgba(90,52,22,.75)'; g.stroke();
        if (i >= 0 && rings[i].born && k < 1) { g.lineWidth = 3; g.strokeStyle = `rgba(233,207,142,${1 - k})`; g.stroke(); }
        acc -= rr.w;
      }
      /* the grain: a few radial cracks and the heart */
      g.strokeStyle = 'rgba(70,40,15,.35)'; g.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const a = k * 1.3 + .4; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * .12, cy + Math.sin(a) * R * .12); g.lineTo(cx + Math.cos(a + .05) * R * .9, cy + Math.sin(a + .05) * R * .9); g.stroke(); }
      g.fillStyle = '#5a3a1c'; g.beginPath(); g.arc(cx, cy, R * .03, 0, 7); g.fill();
      const sh = g.createRadialGradient(cx - R * .3, cy - R * .35, 0, cx, cy, R * 1.1); sh.addColorStop(0, 'rgba(255,240,210,.14)'); sh.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = sh; shape(R * 1.08, { ph: 1, wob: .03 }); g.fill();
      /* the newest ring's label */
      const last = rings[n - 1];
      if (last && last.born && t - last.born < 1600) { const a = Math.min(1, (1600 - (t - last.born)) / 500); g.globalAlpha = a; g.font = `700 ${Math.round(R / 11)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.fillStyle = '#1a1408'; g.fillText('Session ' + n, cx, cy - R * .78); g.globalAlpha = 1; }
    };
    const loop = (t) => { raf = 0; draw(t); if (rings.some((r) => r.born && t - r.born < 1700)) raf = requestAnimationFrame(loop); };
    const kick = () => { if (RM.matches) { draw(performance.now() + 5000); return; } if (!raf) raf = requestAnimationFrame(loop); };
    const add = () => { if (rings.length >= 60) { label(); return; } const r = ring(rings.length); r.born = performance.now(); rings.push(r); label(); kick(); };
    $('[data-add]', sec).onclick = add; trunk.addEventListener('click', add);
    $('[data-reset]', sec).onclick = () => { seed = Math.floor(Math.random() * 1000); set(1); rings[0].born = performance.now(); label(); kick(); };
    new ResizeObserver(() => { fr = null; draw(performance.now() + 5000); }).observe(trunk);
    set(12); label(); draw(performance.now() + 5000);
  }
})();
