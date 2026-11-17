/* Arzantia website - shared behaviour for every page: the icon set, navigation and footer, the signed-in
   state, scroll reveals, and the small live demos (fog, conditions, combat, dice, phones). */
(() => {
  'use strict';
  const CFG = window.ARCANE_SITE || {};
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  document.documentElement.classList.add('js');

  /* the cedar of Lebanon (arz), the tree Arzantia is named for, and the mark's four-point star */
  const CEDAR = 'M46.5 120L48 30h4l1.5 90ZM1 104Q24.5 100.5 48 101.5Q71.5 100.5 95 104Q83.2 92.8 62.1 90Q48 85.8 33.9 90Q12.8 92.8 1 104ZM16 88Q36 84.8 56 85.7Q76 84.8 96 88Q86 77.6 68 75Q56 71.1 44 75Q26 77.6 16 88ZM2 73Q23.5 69.8 45 70.7Q66.5 69.8 88 73Q77.2 62.6 57.9 60Q45 56.1 32.1 60Q12.8 62.6 2 73ZM22 58Q38 55 54 55.8Q70 55 86 58Q78 48.4 63.6 46Q54 42.4 44.4 46Q30 48.4 22 58ZM20 45Q33.5 42.2 47 43Q60.5 42.2 74 45Q67.2 36.2 55.1 34Q47 30.7 38.9 34Q26.8 36.2 20 45ZM35 33Q43.5 30.5 52 31.2Q60.5 30.5 69 33Q64.8 25 57.1 23Q52 20 46.9 23Q39.2 25 35 33ZM41 24Q45.5 22 50 22.6Q54.5 22 59 24Q56.8 17.6 52.7 16Q50 13.6 47.3 16Q43.2 17.6 41 24Z';
  const STAR4 = 'M12 1.5l2.4 8.1 8.1 2.4-8.1 2.4L12 22.5l-2.4-8.1L1.5 12l8.1-2.4Z';

  /* ── icons (one sprite; pages use <svg><use href="#i-name"/></svg>) ── */
  const P = {
    map: '<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13M15 6.5v13"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.2c2.2.2 3.7 1.8 4 4.3"/>',
    swords: '<path d="M14.5 3.5H20v5.5L9 20l-2.5-.5L6 17 14.5 3.5Z"/><path d="m13 11 4 4M4 20l3-3"/>',
    d20: '<path d="M12 2.5 20.5 7.4v9.2L12 21.5l-8.5-4.9V7.4L12 2.5Z"/><path d="M12 2.5 7.3 15h9.4L12 2.5ZM3.5 7.4 7.3 15M20.5 7.4 16.7 15M7.3 15 12 21.5l4.7-6.5M3.5 16.6 7.3 15M20.5 16.6 16.7 15"/>',
    dice: '<path d="M12 2.8 20.5 7.6v8.8L12 21.2 3.5 16.4V7.6L12 2.8Z"/><path d="M3.5 7.6 12 12.4l8.5-4.8M12 12.4v8.8"/>',
    book: '<path d="M4 4.5h6a2 2 0 0 1 2 2V20a1.5 1.5 0 0 0-1.5-1.5H4v-14ZM20 4.5h-6a2 2 0 0 0-2 2V20a1.5 1.5 0 0 1 1.5-1.5H20v-14Z"/>',
    skull: '<path d="M12 3c4.4 0 7.5 3 7.5 7 0 2.5-1.2 4.2-3 5.2V19h-9v-3.8c-1.8-1-3-2.7-3-5.2 0-4 3.1-7 7.5-7Z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10.5 19v-2M13.5 19v-2"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    tv: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    monitor: '<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 16.5v4"/><path d="m7 12 3-3 2.5 2.5L17 7"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    down: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><path d="M11 9v4l3 1.5"/>',
    windows: '<path d="M3 5.5 10.5 4.5v7H3v-6ZM12 4.3 21 3v8.5h-9V4.3ZM3 12.5h7.5v7L3 18.5v-6ZM12 12.5h9V21l-9-1.3v-7.2Z"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5Z"/>',
    play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 6.5-6 6.5-2.7 0-4.3-1.3-5.6-3.6L4 13.6a1.5 1.5 0 0 1 2.5-1.6L8 14"/>',
    cube: '<path d="m12 2.8 8.5 4.8v8.8L12 21.2l-8.5-4.8V7.6L12 2.8Z"/><path d="M12 12.4v8.8M3.5 7.6 12 12.4l8.5-4.8"/>',
    feather: '<path d="M20 4c-7 0-13 5-13 12v4"/><path d="M20 4c0 7-4 12-11 12"/><path d="M7 16h6"/>',
    crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/>',
    check: '<path d="M5 12.5 9.5 17 19 7.5"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 15.8a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1"/>',
    qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v.01M17 20.5h3.5V17"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6H10"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    ruler: '<path d="m3 16.5 13.5-13.5 4.5 4.5L7.5 21 3 16.5Z"/><path d="m7 12.5 2 2M10 9.5l2 2M13 6.5l2 2"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.4 3.1 7.8 7.5 9 4.4-1.2 7.5-4.6 7.5-9V6L12 3Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H12L11 21.5l8.5-11H12l1-8Z"/>',
    heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    zz: '<path d="M4 6h6l-6 7h6M13 12h6l-6 8h6"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.7 3-5.7 3.6-9.3 2 1.2 3.2 3 3.4 5 1-.8 1.6-2 1.7-3.5 2.6 2 4.3 4.6 4.3 7.8 0 3.6-2.6 6.2-6.5 6.2Z"/>',
    drop: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3Z"/>',
    snow: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  const sprite = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" class="sr-only" aria-hidden="true"><defs>' +
    Object.entries(P).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('') +
    /* filled shapes from the Arzantia mark: the cedar (arz) and its four-point star */
    `<symbol id="i-cedar" viewBox="0 0 100 120"><path fill="currentColor" stroke="none" d="${CEDAR}"/></symbol>` +
    `<symbol id="i-star4" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="${STAR4}"/></symbol>` +
    '</defs></svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);
  const ic = (n) => `<svg aria-hidden="true"><use href="#i-${n}"/></svg>`;
  window.ArcIcon = ic;

  /* ── navigation + footer, the same on every marketing page ── */
  const page = document.body.dataset.page || '';
  const LINKS = [['index.html#features', 'Features', 'features'], ['index.html#how', 'How it works', 'how'], ['features.html', 'Explore', 'explore'], ['about.html', 'About', 'about'], ['index.html#faq', 'FAQ', 'faq']];
  const navEl = $('[data-nav]');
  if (navEl) {
    navEl.className = 'nav';
    navEl.innerHTML = `<div class="wrap">
      <a class="brand" href="index.html" aria-label="Arzantia, home"><img src="assets/arzantia-mark-dark.svg" alt="" width="30" height="38"><span>Arzantia</span></a>
      <ul class="nav-links">${LINKS.map(([h, t, k]) => `<li><a href="${h}"${k === page ? ' aria-current="page"' : ''} data-k="${k}">${t}</a></li>`).join('')}</ul>
      <div class="nav-acts">
        <span class="anon"><a class="btn ghost sm hide-m" href="signin.html">Sign in</a></span>
        <a class="btn primary sm anon try-top" href="signup.html" data-try>Try Arzantia</a>
        <span class="who"><a class="btn primary sm hide-m" href="welcome.html" data-home>Your table</a><a class="avatar" href="welcome.html" data-avatar title="Your account">A</a></span>
        <button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="drawer"><span></span></button>
      </div></div>`;
    const drawer = document.createElement('nav');
    drawer.className = 'drawer'; drawer.id = 'drawer'; drawer.setAttribute('aria-label', 'Menu');
    drawer.innerHTML = LINKS.map(([h, t]) => `<a class="dl" href="${h}">${t}</a>`).join('') +
      `<div class="cta-row"><a class="btn primary lg anon-d" href="signup.html">Try Arzantia</a><a class="btn lg" href="features.html">Explore the features</a><a class="btn ghost lg anon-d" href="signin.html">Sign in</a><a class="btn ghost lg who-d" href="welcome.html" hidden>Your table</a></div>`;
    navEl.after(drawer);
    const mb = $('.menu-btn', navEl);
    const setMenu = (on) => { document.body.classList.toggle('menu-open', on); mb.setAttribute('aria-expanded', on); document.body.style.overflow = on ? 'hidden' : ''; };
    mb.onclick = () => setMenu(!document.body.classList.contains('menu-open'));
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); mb.focus(); } });
    addEventListener('resize', () => { if (innerWidth > 1080) setMenu(false); });
    const stick = () => navEl.classList.toggle('stuck', scrollY > 12);
    stick(); addEventListener('scroll', stick, { passive: true });
    /* on the home page, the link for the section in view lights up */
    if (page === 'home') {
      const secs = ['features', 'how', 'faq'].map((id) => document.getElementById(id)).filter(Boolean);
      const io = new IntersectionObserver((es) => es.forEach((en) => {
        const a = $(`.nav-links a[data-k="${en.target.id}"]`, navEl);
        if (a) a.classList.toggle('on', en.isIntersecting);
      }), { rootMargin: '-45% 0px -50% 0px' });
      secs.forEach((s) => io.observe(s));
    }
  }
  const footEl = $('[data-foot]');
  if (footEl) {
    footEl.className = 'foot';
    footEl.innerHTML = `${ridgeSVG(91, 'foot')}<div class="wrap"><div class="foot-top">
      <div><a class="brand" href="index.html"><img src="assets/arzantia-mark-dark.svg" alt="" width="30" height="38"><span>Arzantia</span></a>
        <p>The virtual tabletop for the table in front of you: your screen, their phones, and the map on the TV.</p><p class="foot-story">${ic('cedar')}<span>Named for <i>arz</i>, the cedar of Lebanon, the tree stories have gathered under for thousands of years. <a href="about.html">Our story</a></span></p></div>
      <div><h4>Product</h4><ul><li><a href="index.html#features">Features</a></li><li><a href="features.html">Explore Arzantia</a></li><li><a href="index.html#how">How it works</a></li><li><a href="about.html">About Arzantia</a></li></ul></div>
      <div><h4>Account</h4><ul><li><a href="signup.html">Create an account</a></li><li><a href="signin.html">Sign in</a></li><li><a href="${esc(CFG.loginUrl || 'signin.html')}" data-login>Your campaigns</a></li></ul></div>
      <div><h4>Help</h4><ul><li><a href="index.html#faq">Questions</a></li><li><a href="index.html#how">Getting started</a></li><li><a href="about.html">Our story</a></li></ul></div>
    </div><div class="foot-bot"><span>&copy; ${new Date().getFullYear()} Arzantia. Grown under the cedar, for storytellers.</span><span>Fonts: Cinzel, IM Fell English and Manrope (SIL Open Font License).</span></div></div>`;
  }

  /* ── the cedar ridges: Mount Lebanon's slopes with cedars on them, along the bottom of every hero,
     banner and sign-in picture, and rising over the footer. Drawn once, seeded, so they never jump. ── */
  function ridgeSVG(seed, kind) {
    let a = seed >>> 0;
    const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const W = 1600, H = 320;
    const line = (base, amp, step) => { const pts = []; let v = 0, y = 0; for (let x = -40; x <= W + 40; x += step) { v += (r() - .5) * 2; v *= .86; y += v; y *= .95; pts.push([x, base + y * amp]); } return pts; };
    const d = (pts) => 'M' + pts.map(([x, y]) => x + ' ' + y.toFixed(1)).join('L') + `L${W + 40} ${H + 10}L-40 ${H + 10}Z`;
    const yAt = (pts, x) => { for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
    const trees = (pts, n, s0, s1, cls) => { let o = ''; for (let i = 0; i < n; i++) { const x = r() * W, s = s0 + r() * (s1 - s0), w = s * (1 + r() * .5), y = yAt(pts, x); o += `<use href="#i-cedar" class="${cls}" x="${(x - w / 2).toFixed(0)}" y="${(y - s * 1.08).toFixed(0)}" width="${w.toFixed(0)}" height="${(s * 1.2).toFixed(0)}"/>`; } return o; };
    if (kind === 'foot') {
      const p = line(70, 9, 40);
      return `<svg class="ridge foot-ridge" viewBox="0 0 ${W} 110" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g class="rc">${trees(p, 26, 34, 70, 'c3')}</g><path class="r3" d="${'M' + p.map(([x, y]) => x + ' ' + y.toFixed(1)).join('L') + `L${W + 40} 120L-40 120Z`}"/></svg>`;
    }
    const p1 = line(170, 14, 50), p2 = line(225, 10, 40), p3 = line(272, 6, 40);
    return `<svg class="ridge" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path class="r1" d="${d(p1)}"/><path class="r1s" d="${'M' + p1.map(([x, y]) => x + ' ' + y.toFixed(1)).join('L')}"/>
      <g class="l2">${trees(p2, 30, 26, 48, 'c2')}<path class="r2" d="${d(p2)}"/></g>
      <g class="l3">${trees(p3, 18, 46, 92, 'c3')}<path class="r3" d="${d(p3)}"/></g></svg>`;
  }
  let rs = 11;
  $$('.hero-bg, .band, .auth-art, [data-ridge]').forEach((el) => { el.insertAdjacentHTML(el.matches('.hero-bg') ? 'afterbegin' : 'beforeend', ridgeSVG(rs += 17, 'hill')); });
  /* the near slope moves a little faster than the far one as the page scrolls */
  const heroRidges = $$('.hero-bg .ridge');
  if (heroRidges.length && !RM.matches) {
    const pr = () => { const y = Math.min(scrollY, 900); heroRidges.forEach((g) => g.style.setProperty('--rp', y.toFixed(0))); };
    pr(); addEventListener('scroll', pr, { passive: true });
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  window.ArcEsc = esc;

  /* ── signed in? the bar says so (no network wait to draw the page) ── */
  const A = window.ArcAuth;
  if (A && A.session) {
    document.body.classList.add('signed');
    const paintWho = (u) => {
      const n = A.name(u);
      $$('[data-avatar]').forEach((a) => { a.textContent = n.trim().charAt(0).toUpperCase() || 'A'; a.title = 'Signed in as ' + n; });
      $$('.anon-d').forEach((a) => { a.hidden = true; }); $$('.who-d').forEach((a) => { a.hidden = false; });
      $$('[data-try]').forEach((a) => { a.href = 'welcome.html'; });
    };
    paintWho(A.session.user);
    if (navEl) A.user().then((u) => { if (u) paintWho(u); else document.body.classList.remove('signed'); }).catch(() => {});
  }
  /* "Try Arzantia" takes a signed-in visitor to their table instead of a second sign-up */
  if (A && A.session) $$('a[href="signup.html"]').forEach((a) => { if (!a.closest('.drawer')) a.href = 'welcome.html'; });

  $$('[data-login]').forEach((a) => { if (CFG.loginUrl) a.href = CFG.loginUrl; });

  /* ── toast ── */
  let tT = 0;
  window.ArcToast = (text, err) => {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = text; t.classList.toggle('err', !!err); t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(tT); tT = setTimeout(() => { t.hidden = true; }, 5000);
  };

  /* ── scroll reveal ── */
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !RM.matches) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rv.forEach((el) => io.observe(el));
  } else rv.forEach((el) => el.classList.add('in'));
  /* staggered children */
  $$('[data-stagger]').forEach((g) => [...g.children].forEach((c, i) => { c.classList.add('rv'); c.style.setProperty('--d', (i * 0.07).toFixed(2) + 's'); }));
  if ('IntersectionObserver' in window && !RM.matches) {
    const io2 = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io2.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    $$('[data-stagger] > .rv').forEach((el) => io2.observe(el));
  } else $$('[data-stagger] > .rv').forEach((el) => el.classList.add('in'));

  /* ── drawn D&D art: each piece sketches itself line by line when it scrolls into view, then its colour
     and sparkle arrive (the same idea as the mark drawing itself on the About page). Use anywhere with
     <span class="draw-art" data-art="d20"></span>. ── */
  const s4 = (x, y, r) => `M${x} ${y - r}L${x + r * .26} ${y - r * .26}L${x + r} ${y}L${x + r * .26} ${y + r * .26}L${x} ${y + r}L${x - r * .26} ${y + r * .26}L${x - r} ${y}L${x - r * .26} ${y - r * .26}Z`;
  const L = (d, c = '') => `<path class="l ${c}" pathLength="1" d="${d}"/>`;
  const F = (d, c) => `<path class="f ${c}" d="${d}"/>`;
  const X = (x, y, r) => `<path class="x" d="${s4(x, y, r)}"/>`;
  const B = (x, y, r) => `<circle class="x bub" cx="${x}" cy="${y}" r="${r}"/>`;
  const ART = {
    /* a six-sided die seen from a corner: one pip on top, two and three on the sides */
    d6: F('M60 18L96 38L60 58L24 38Z', 'gold') + L('M60 18L96 38V80L60 100L24 80V38Z') + L('M24 38L60 58L96 38M60 58V100') +
      '<ellipse class="f pip" cx="60" cy="38" rx="6" ry="3.6"/><circle class="f pip" cx="34.8" cy="56.6" r="3.6"/><circle class="f pip" cx="49.2" cy="81.4" r="3.6"/>' +
      '<circle class="f pip" cx="69" cy="63.5" r="3.4"/><circle class="f pip" cx="78" cy="69" r="3.4"/><circle class="f pip" cx="87" cy="74.5" r="3.4"/>' + X(104, 16, 5) + X(16, 104, 3.5),
    d20: F('M60 30L88 78H32Z', 'gold') + L('M60 8L105 34V86L60 112L15 86V34Z') + L('M60 30L88 78H32Z') +
      L('M60 8V30M15 34L60 30L105 34M15 34L32 78M105 34L88 78M15 86L32 78M105 86L88 78M60 112L32 78M60 112L88 78') +
      '<text class="f num" x="60" y="69" text-anchor="middle">20</text>' + X(102, 12, 6) + X(16, 108, 4),
    sword: '<g transform="translate(60 60) rotate(-40) scale(1.2) translate(-60 -60)">' + F('M60 6L66 18V80H54V18Z', 'gold') + L('M60 6L66 18V80H54V18Z') + L('M60 22V76') +
      L('M38 80H82Q86 80 86 84Q86 88 82 88H38Q34 88 34 84Q34 80 38 80Z') + L('M56 88V106H64V88') + L('M56 93H64M56 98H64M56 103H64') +
      L('M55 111a5 5 0 1 0 10 0a5 5 0 1 0 -10 0') + '<path class="glint" d="M56 22H64"/></g>' + X(98, 18, 6),
    shield: F('M60 19L92 29V58C92 79 78 94 60 103C42 94 28 79 28 58V29Z', 'green') + L('M60 10L100 22V58C100 84 82 102 60 112C38 102 20 84 20 58V22Z') +
      L('M60 19L92 29V58C92 79 78 94 60 103C42 94 28 79 28 58V29Z') + '<use class="f emblem" href="#i-cedar" x="43" y="38" width="34" height="42"/>' + X(104, 12, 5) + X(14, 14, 4),
    potion: F('M29 74C40 66 50 80 60 72C70 64 81 78 91 72C91 92 77 105 60 105C43 105 29 92 29 74Z', 'red liquid') +
      L('M51 8H69V16H51Z') + L('M53 16V34C37 40 26 54 26 72C26 92 41 108 60 108C79 108 94 92 94 72C94 54 83 40 67 34V16') + L('M48 34H72') +
      L('M38 60C34 68 34 80 38 88', 'soft') + B(52, 90, 3) + B(64, 84, 2.2) + B(71, 95, 2.6) + X(100, 30, 5),
    book: F('M71 58a12 12 0 1 0 24 0a12 12 0 1 0 -24 0', 'green') + L('M60 30C48 22 30 20 14 24V96C30 92 48 94 60 102C72 94 90 92 106 96V24C90 20 72 22 60 30Z') +
      L('M60 30V102') + L('M22 40C32 38 42 40 52 44M22 52C32 50 42 52 52 56M22 64C32 62 42 64 52 68M22 76C30 74 40 76 48 79', 'soft') +
      L('M71 58a12 12 0 1 0 24 0a12 12 0 1 0 -24 0') + L(s4(83, 58, 9)) + X(84, 12, 5) + X(100, 24, 3.5) + X(68, 16, 3),
    map: F('M14 26L44 18L76 26L106 18V94L76 102L44 94L14 102Z', 'parch') + L('M14 26L44 18L76 26L106 18V94L76 102L44 94L14 102Z') + L('M44 18V94M76 26V102', 'soft') +
      L('M20 54L27 43L34 54M29 54L36 41L43 54', 'soft') + L('M24 88C34 72 46 82 54 68S72 52 84 42', 'trail') + L('M80 34L90 44M90 34L80 44', 'red') +
      L('M90 82a6 6 0 1 0 12 0a6 6 0 1 0 -12 0M96 73V91', 'soft') + X(85, 39, 7),
    chest: F('M16 60H104V102H16Z', 'gold') + B(50, 30, 4) + B(62, 25, 4.5) + B(73, 31, 4) + L('M16 60H104V102H16Z') + L('M16 60V48C16 30 104 30 104 48V60') +
      L('M38 37V102M82 37V102') + L('M53 60H67V74H53Z') + L('M60 64V69') + X(96, 18, 5) + X(24, 20, 4),
    hat: F('M32 93C42 66 48 38 76 12C70 34 78 62 88 93Z', 'green') + L('M14 96C36 88 84 88 106 96C84 104 36 104 14 96Z') +
      L('M32 93C42 66 48 38 76 12C70 34 78 62 88 93') + L('M34 86C50 82 70 82 86 86') + X(58, 54, 5) + X(70, 70, 3.5) + X(64, 36, 3) + X(98, 20, 5),
    /* a lone cedar of Lebanon on the mountain under a crescent moon: flat, layered tiers on a tall trunk */
    grove: L('M4 104L20 88L28 93L36 87', 'soft') + L('M20 88L23 92L26 90', 'soft') + L('M86 90L94 84L102 79L116 104', 'soft') + L('M102 79L105 84L108 82', 'soft') +
      '<g transform="translate(26 18) scale(.68)">' + F(CEDAR, 'green') + L(CEDAR) + '</g>' + L('M10 104H110') +
      L('M100 8A11 11 0 1 0 110 26A9 9 0 1 1 100 8Z', 'soft') + X(20, 22, 5) + X(36, 10, 3) + X(80, 12, 3.5) + X(12, 50, 3) + X(110, 48, 3)
  };
  function drawArt(el) {
    const k = el.dataset.art; if (!ART[k] || el.firstChild) return;
    el.innerHTML = `<svg class="art art-${k}" viewBox="0 0 120 120" aria-hidden="true">${ART[k]}</svg>`;
    const ls = $$('.l', el), xs = $$('.x', el);
    ls.forEach((p, i) => p.style.setProperty('--i', i));
    xs.forEach((p, i) => p.style.setProperty('--i', i));
    el.style.setProperty('--n', ls.length);
  }
  const arts = $$('.draw-art');
  arts.forEach(drawArt);
  if ('IntersectionObserver' in window && !RM.matches) {
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('drawn'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: .3 });
    arts.forEach((a) => io.observe(a));
  } else arts.forEach((a) => a.classList.add('drawn'));
  /* a codex card draws its piece again when you point at it */
  $$('.cx').forEach((c) => {
    const a = $('.draw-art', c); if (!a || RM.matches) return;
    let t = 0;
    const again = () => { if (Date.now() - t < 1600) return; t = Date.now(); a.classList.remove('drawn'); void a.offsetWidth; a.classList.add('drawn'); };
    c.addEventListener('pointerenter', again); c.addEventListener('focus', again);
  });

  /* ── the light follows the pointer on cards and gold buttons ── */
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest && e.target.closest('.card, .btn.primary');
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ── the steps' line draws itself ── */
  $$('.steps').forEach((s) => {
    if (RM.matches || !('IntersectionObserver' in window)) { s.style.setProperty('--prog', 1); return; }
    new IntersectionObserver((es, o) => es.forEach((en) => { if (en.isIntersecting) { s.style.setProperty('--prog', 1); o.disconnect(); } }), { threshold: .3 }).observe(s);
  });

  /* ── the CTA band's picture drifts a little slower than the page ── */
  const bands = $$('.band');
  if (bands.length && !RM.matches) {
    const par = () => bands.forEach((b) => { const r = b.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) b.style.setProperty('--par', ((r.top + r.height / 2 - innerHeight / 2) * -0.12).toFixed(1) + 'px'); });
    par(); addEventListener('scroll', par, { passive: true });
  }

  /* ── embers rising behind the hero ── */
  const cv = $('#embers');
  if (cv && !RM.matches) {
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, parts = [], run = true;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const spawn = (y) => ({ x: Math.random() * W, y: y == null ? H + 10 : y, r: Math.random() * 1.6 + .4, v: Math.random() * .35 + .15, w: Math.random() * Math.PI * 2, a: Math.random() * .5 + .25 });
    size(); parts = Array.from({ length: Math.round(W / 22) }, () => spawn(Math.random() * H));
    addEventListener('resize', size);
    new IntersectionObserver((es) => { run = es[0].isIntersecting; if (run) loop(); }).observe(cv);
    function loop() {
      if (!run) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y -= p.v; p.w += .02; p.x += Math.sin(p.w) * .3;
        if (p.y < -10) Object.assign(p, spawn());
        const fade = Math.min(1, p.y / (H * .6));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fillStyle = `rgba(233, 190, 110, ${(p.a * fade).toFixed(3)})`; ctx.shadowColor = 'rgba(233,170,90,.8)'; ctx.shadowBlur = 8; ctx.fill();
      }
      requestAnimationFrame(loop);
    }
  }

  /* ── the hero's table: tilt with the pointer, then a turn plays itself ── */
  const app = $('.hero-stage .app');
  if (app) {
    const stage = app.parentElement;
    if (!RM.matches) {
      app.style.setProperty('--enter', '14deg');
      requestAnimationFrame(() => requestAnimationFrame(() => { app.style.transition = 'transform 1.4s cubic-bezier(.2,.7,.2,1)'; app.style.setProperty('--enter', '0deg'); setTimeout(() => { app.style.transition = ''; }, 1500); }));
      stage.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = app.getBoundingClientRect();
        app.style.setProperty('--tilt-y', (((e.clientX - r.left) / r.width - .5) * 5).toFixed(2) + 'deg');
        app.style.setProperty('--tilt-x', (((e.clientY - r.top) / r.height - .5) * -4).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', () => { app.style.setProperty('--tilt-x', '0deg'); app.style.setProperty('--tilt-y', '0deg'); });
    }
    heroPlay(app);
  }
  function heroPlay(root) {
    const toks = { b: $('[data-t="b"]', root), k: $('[data-t="k"]', root), o: $('[data-t="o"]', root) };
    const rows = $$('.init-row', root), path = $('.trail path', root), ruler = $('.ruler', root), toast = $('.roll-toast', root), turn = $('[data-turn]', root);
    if (!toks.b) return;
    const place = (t, x, y) => { t.style.left = x + '%'; t.style.top = y + '%'; };
    place(toks.b, 30, 70); place(toks.k, 42, 76); place(toks.o, 58, 38);
    const ally2 = $('[data-t="m"]', root); if (ally2) place(ally2, 24, 58);
    const foe2 = $('[data-t="g"]', root); if (foe2) place(foe2, 66, 50);
    const script = [
      () => { setNow(0); },
      () => { path.setAttribute('d', 'M30 70 C 34 60, 40 52, 47 46'); path.parentElement.style.opacity = 1; ruler.style.left = '47%'; ruler.style.top = '46%'; ruler.textContent = '6 m'; ruler.classList.add('show'); },
      () => { place(toks.b, 47, 46); },
      () => { ruler.classList.remove('show'); $('b', toast).textContent = '17'; $('.d', toast).textContent = '17'; $('span', toast).innerHTML = 'Brynn rolls <b>d20 + 5</b> to hit'; toast.classList.add('show'); },
      () => { rows[2].style.setProperty('--hp', '38%'); $('.hpn', rows[2]) && ($('.hpn', rows[2]).textContent = '19/50'); toks.o.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 320 }); },
      () => { toast.classList.remove('show'); path.parentElement.style.opacity = 0; setNow(1); },
      () => { place(toks.k, 38, 60); },
      () => { setNow(2); },
      () => { place(toks.o, 52, 44); },
      () => { place(toks.b, 30, 70); place(toks.k, 42, 76); place(toks.o, 58, 38); rows[2].style.setProperty('--hp', '76%'); $('.hpn', rows[2]) && ($('.hpn', rows[2]).textContent = '38/50'); }
    ];
    function setNow(i) {
      rows.forEach((r, k) => r.classList.toggle('now', k === i));
      [toks.b, toks.k, toks.o].forEach((t, k) => t.classList.toggle('now', k === i));
      if (turn) turn.textContent = ['Brynn', 'Kael', 'The Ogre'][i] + ' is up';
    }
    setNow(0);
    if (RM.matches) return;
    let i = 0, vis = true;
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(root);
    setInterval(() => { if (!vis || document.hidden) return; script[i % script.length](); i++; }, 1500);
  }

  /* ── showcase tabs ── */
  $$('[data-tabs]').forEach((box) => {
    const tabs = $$('[role="tab"]', box), pill = $('.pill', box);
    const movePill = (t) => { if (!pill) return; pill.style.left = t.offsetLeft + 'px'; pill.style.width = t.offsetWidth + 'px'; };
    const pick = (t, focus) => {
      tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; const p = document.getElementById(x.getAttribute('aria-controls')); if (p) { p.hidden = !on; p.classList.toggle('in', on); } });
      movePill(t); if (focus) t.focus();
      t.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: RM.matches ? 'auto' : 'smooth' });
      const p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.dispatchEvent(new CustomEvent('shown'));
    };
    tabs.forEach((t, i) => {
      t.onclick = () => pick(t);
      t.onkeydown = (e) => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); pick(tabs[(i + k + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); pick(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); pick(tabs[tabs.length - 1], true); }
      };
    });
    const first = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    requestAnimationFrame(() => movePill(first));
    addEventListener('resize', () => movePill(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));
    document.fonts && document.fonts.ready.then(() => movePill(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));
  });

  /* ── demo: fog of war you wipe away ── */
  $$('.fogdemo').forEach((box) => {
    const c = $('canvas', box), ctx = c.getContext('2d');
    let W = 0, H = 0, down = false, last = null;
    function paint() {
      const d = Math.min(devicePixelRatio || 1, 2), r = box.getBoundingClientRect();
      if (!r.width) return;
      W = r.width; H = r.height; c.width = W * d; c.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b0c0f'); g.addColorStop(1, '#121318');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(236,224,200,.05)'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      reveal(W * .5, H * .86, 46);
    }
    function reveal(x, y, rad = 42) {
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createRadialGradient(x, y, rad * .35, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    }
    const at = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener('pointerdown', (e) => { down = true; c.setPointerCapture(e.pointerId); last = at(e); reveal(...last); const h = $('.vis-hint', box); if (h) h.style.opacity = 0; });
    c.addEventListener('pointermove', (e) => {
      if (!down && e.pointerType !== 'mouse') return;
      const p = at(e);
      if (!down) { reveal(p[0], p[1], 26); return; }
      const [x0, y0] = last, dist = Math.hypot(p[0] - x0, p[1] - y0), n = Math.max(1, Math.ceil(dist / 10));
      for (let k = 1; k <= n; k++) reveal(x0 + (p[0] - x0) * k / n, y0 + (p[1] - y0) * k / n);
      last = p;
    });
    const up = () => { down = false; last = null; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    const rs = $('.fog-reset', box.parentElement); if (rs) rs.onclick = paint;
    new ResizeObserver(() => { if (Math.abs(box.getBoundingClientRect().width - W) > 2) paint(); }).observe(box);
    box.closest('.pane') && box.closest('.pane').addEventListener('shown', paint);
    paint();
  });

  /* ── demo: conditions glow on the token ── */
  const COND = { stunned: ['#F5D04A', 'zz', 'Stunned'], burning: ['#FF6B35', 'flame', 'Burning'], frightened: ['#B07CF2', 'skull', 'Frightened'], bleeding: ['#E5484D', 'drop', 'Bleeding'], chilled: ['#8FD3FF', 'snow', 'Chilled'], poisoned: ['#5FD068', 'flask', 'Poisoned'] };
  $$('.conddemo').forEach((box) => {
    const tok = $('.big-tok', box), bad = $('.badges', box), chips = $('.cond-chips', box);
    const on = new Set(['frightened']);
    chips.innerHTML = Object.entries(COND).map(([k, [c, , n]]) => `<button type="button" class="cchip" data-c="${k}" aria-pressed="${on.has(k)}"><i></i>${n}</button>`).join('');
    $$('.cchip', chips).forEach((b) => b.style.setProperty('--c', COND[b.dataset.c][0]));
    const draw = () => {
      const list = [...on];
      tok.classList.toggle('has', list.length > 0);
      if (list.length) tok.style.setProperty('--cond', COND[list[list.length - 1]][0]);
      bad.innerHTML = list.slice(-3).map((k) => `<span data-k="${k}" title="${COND[k][2]}">${ic(COND[k][1] === 'flask' ? 'drop' : COND[k][1])}</span>`).join('');
      $$('span', bad).forEach((s) => s.style.setProperty('--c', COND[s.dataset.k][0]));
    };
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('.cchip'); if (!b) return;
      const k = b.dataset.c; on.has(k) ? on.delete(k) : on.add(k);
      b.setAttribute('aria-pressed', on.has(k)); draw();
    });
    draw();
  });

  /* ── demo: the initiative order, turn by turn ── */
  $$('.combatdemo').forEach((box) => {
    const list = $('.cd-list', box), next = $('[data-next]', box), back = $('[data-prev]', box), rnd = $('[data-round]', box), who = $('[data-who]', box);
    const P = [['Brynn', 'B', 19, 34, 40, ''], ['The Ogre', 'O', 17, 38, 59, 'foe'], ['Kael', 'K', 14, 22, 31, ''], ['Mira', 'M', 11, 18, 27, ''], ['Goblin', 'G', 8, 7, 7, 'foe']];
    const COL = { Brynn: '#c9a962', Kael: '#7c8cf5', Mira: '#5fd068' };
    let cur = 0, round = 1;
    list.innerHTML = P.map(([n, l, ini, hp, max, f]) => `<li class="cd-row ${f}"><span class="ini">${ini}</span><span class="face">${l}</span><span class="nm"><b>${n}</b><span class="hp"><i></i></span></span><span class="hpn">${hp}/${max}</span></li>`).join('');
    $$('.cd-row', list).forEach((r, i) => { r.style.setProperty('--c', P[i][5] ? '#e5484d' : COL[P[i][0]]); $('.hp i', r).style.setProperty('--hp', Math.round(P[i][3] / P[i][4] * 100) + '%'); });
    const paint = () => {
      $$('.cd-row', list).forEach((r, i) => { r.classList.toggle('now', i === cur); r.classList.toggle('done', i < cur); });
      rnd.textContent = 'Round ' + round; who.textContent = P[(cur + 1) % P.length][0];
      $('[data-up]', box).textContent = P[cur][0] + ' is up';
    };
    next.onclick = () => {
      /* a little damage lands each turn, so the bars move */
      const tgt = P[cur][5] ? 0 : 1, r = $$('.cd-row', list)[tgt];
      P[tgt][3] = Math.max(1, P[tgt][3] - (3 + Math.floor(Math.random() * 6)));
      $('.hp i', r).style.setProperty('--hp', Math.round(P[tgt][3] / P[tgt][4] * 100) + '%'); $('.hpn', r).textContent = P[tgt][3] + '/' + P[tgt][4];
      cur++; if (cur >= P.length) { cur = 0; round++; } paint();
    };
    back.onclick = () => { cur--; if (cur < 0) { if (round > 1) { round--; cur = P.length - 1; } else cur = 0; } paint(); };
    box.closest('.pane') && box.closest('.pane').addEventListener('keydown', (e) => { if ((e.key === 'n' || e.key === 'N') && !e.target.closest('input')) next.click(); });
    paint();
  });

  /* ── demo: roll the dice ── */
  $$('.dicedemo').forEach((box) => {
    const die = $('.die', box), n = $('.n', die), out = $('.die-out', box), hist = $('.dice-hist', box);
    let sides = 20, busy = false;
    const shapes = {
      4: 'M75 10 140 128H10Z', 6: 'M22 22h106v106H22Z', 8: 'M75 6 140 75 75 144 10 75Z',
      10: 'M75 6 138 62 75 144 12 62Z', 12: 'M75 6 140 54 116 132H34L10 54Z', 20: 'M75 5 138 41v68L75 145 12 109V41Z'
    };
    /* where each shape's visual centre sits (the d4's is low, the d10's high), and a smaller number on the small faces */
    const mid = { 4: [90, 34], 6: [75, 42], 8: [75, 38], 10: [68, 38], 12: [80, 40], 20: [75, 42] };
    const setShape = () => { $('path', die).setAttribute('d', shapes[sides]); die.style.setProperty('--cy', mid[sides][0]); die.style.setProperty('--fs', mid[sides][1] + 'px'); };
    $$('.dice-pick button', box).forEach((b) => b.onclick = () => {
      sides = Number(b.dataset.d); $$('.dice-pick button', box).forEach((x) => x.setAttribute('aria-pressed', x === b)); setShape(); n.textContent = sides; out.textContent = 'Tap the die to roll a d' + sides;
    });
    die.onclick = () => {
      if (busy) return; busy = true;
      const v = 1 + Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * sides);
      die.classList.remove('crit'); die.classList.remove('rolling'); void die.offsetWidth; die.classList.add('rolling');
      let k = 0; const spin = setInterval(() => { n.textContent = 1 + Math.floor(Math.random() * sides); if (++k > 12) clearInterval(spin); }, 60);
      setTimeout(() => {
        clearInterval(spin); n.textContent = v; busy = false; die.classList.remove('rolling');
        if (v === sides && sides === 20) { die.classList.add('crit'); out.innerHTML = '<b>Natural 20!</b> A critical hit.'; }
        else if (v === 1 && sides === 20) out.innerHTML = '<b>A natural 1.</b> The table groans.';
        else out.innerHTML = `You rolled <b>${v}</b> on a d${sides}.`;
        const s = document.createElement('span'); s.textContent = v; hist.prepend(s); while (hist.children.length > 8) hist.lastChild.remove();
      }, RM.matches ? 50 : 900);
    };
    setShape();
  });

  /* ── demo: players join from their phones ── */
  $$('.roomdemo').forEach((box) => {
    const ps = $$('.joined span', box);
    let shown = false;
    const go = () => { if (shown) return; shown = true; ps.forEach((p, i) => setTimeout(() => p.classList.add('in'), RM.matches ? 0 : 400 + i * 700)); };
    box.closest('.pane') ? box.closest('.pane').addEventListener('shown', go) : go();
    if (!box.closest('.pane') || !box.closest('.pane').hidden) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { go(); o.disconnect(); } }).observe(box);
    /* a decorative code pattern for the TV (a picture of the join code, not a working one) */
    const q = $('.tv-qr', box);
    if (q) {
      let s = 7, cells = '';
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
        const fin = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        if (fin) { const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y; if (fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5)) cells += `M${x} ${y}h1v1h-1z`; }
        else if (rnd() > .52) cells += `M${x} ${y}h1v1h-1z`;
      }
      q.innerHTML = `<svg viewBox="0 0 21 21" shape-rendering="crispEdges" aria-hidden="true"><path d="${cells}" fill="#0c0d10"/></svg>`;
    }
  });

  /* ── the year, wherever it is asked for ── */
  $$('[data-year]').forEach((e) => { e.textContent = new Date().getFullYear(); });
})();
