/* Arzantia website - the first-run walkthrough (welcome.html). It needs a signed-in account; it creates the DM's
   first campaign or redeems a player's invite with the same Supabase calls the login page uses, then marks the
   account as onboarded (user metadata) so "Your table" opens on the summary next time. */
(() => {
  'use strict';
  const A = window.ArcAuth, CFG = window.ARCANE_SITE || {}, ic = window.ArcIcon, esc = window.ArcEsc;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const qs = new URLSearchParams(location.search);

  const STEPS = { role: 'Welcome', campaign: 'Campaign', invite: 'Party', setup: 'Your table', tour: 'Tour', done: 'Ready' };
  const FLOW = { dm: ['role', 'campaign', 'setup', 'tour', 'done'], player: ['role', 'invite', 'setup', 'tour', 'done'], both: ['role', 'campaign', 'invite', 'setup', 'tour', 'done'] };
  let U = null, st = null, key = '', camps = [];

  const loadSt = () => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
  const saveSt = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) { /* private mode */ } };
  const flow = () => FLOW[st.role] || FLOW.dm;
  const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const fmtCode = (c) => c.replace(/(.{4})(?=.)/g, '$1-');

  /* ── the progress bar ── */
  function paintProg() {
    const p = $('.prog'), f = flow(), at = f.indexOf(st.step);
    p.hidden = st.step === 'role' && !st.role;
    const fin = st.step === 'done';
    p.innerHTML = f.map((s, i) => `<li class="${i < at || fin ? 'done' : i === at ? 'on' : ''}"${i === at ? ' aria-current="step"' : ''}><span class="d">${i < at || fin ? ic('check') : i + 1}</span><span class="lbl">${STEPS[s]}</span></li>`).join('');
  }

  /* ── moving between steps ── */
  let prevIdx = 0;
  function go(step, opts = {}) {
    st.step = step; saveSt();
    const idx = flow().indexOf(step), back = idx < prevIdx; prevIdx = idx;
    $$('.stepv').forEach((s) => { const on = s.dataset.step === step; s.hidden = !on; s.classList.remove('in', 'back'); if (on) { void s.offsetWidth; s.classList.add('in'); s.classList.toggle('back', back); } });
    $('#loading').hidden = true;
    paintProg();
    if (!opts.keepScroll) scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
    const cur = $(`.stepv[data-step="${step}"]`);
    ({ setup: paintSetup, done: paintDone, campaign: paintCampaign, invite: paintInvite }[step] || (() => {}))(cur);
    const h = $('h1', cur); if (h && !opts.noFocus) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  const next = () => { const f = flow(), i = f.indexOf(st.step); go(f[Math.min(f.length - 1, i + 1)]); };
  const prev = () => { const f = flow(), i = f.indexOf(st.step); go(f[Math.max(0, i - 1)]); };
  $$('[data-next]').forEach((b) => b.addEventListener('click', () => { if (st.step === 'tour') finish(); else next(); }));
  $$('[data-back]').forEach((b) => b.addEventListener('click', prev));
  $$('[data-skip]').forEach((b) => b.addEventListener('click', () => { st['skip_' + st.step] = true; next(); }));

  /* ── 1 · role ── */
  const roleBtns = $$('[data-role]');
  function pickRole(r) {
    st.role = r; saveSt();
    roleBtns.forEach((b) => { const on = b.dataset.role === r; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    $('.stepv[data-step="role"] [data-next]').disabled = false; paintProg();
  }
  roleBtns.forEach((b, i) => {
    b.addEventListener('click', () => pickRole(b.dataset.role));
    b.addEventListener('dblclick', () => { pickRole(b.dataset.role); next(); });
    b.addEventListener('keydown', (e) => {
      const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); const n = roleBtns[(i + k + roleBtns.length) % roleBtns.length]; pickRole(n.dataset.role); n.focus(); }
    });
  });

  /* ── 2a · the campaign ── */
  const fC = $('#f-camp');
  function paintCampaign(sec) {
    const owned = camps.filter((c) => c.role === 'dm');
    const lede = $('.lede', sec);
    lede.textContent = st.campaign ? `"${st.campaign.name}" is ready. Name another, or continue.` :
      owned.length ? `You already run ${owned.length === 1 ? 'one campaign' : owned.length + ' campaigns'}. Start another here, or skip this step.` : 'It\'s how your players find your table. You can rename it whenever you like.';
    $('[data-skip]', sec).textContent = st.campaign || owned.length ? 'Continue' : 'Later';
    if (!fC.elements.name.value) setTimeout(() => fC.elements.name.focus(), 60);
  }
  $$('.sugg button').forEach((b) => b.addEventListener('click', () => { fC.elements.name.value = b.textContent; fC.elements.name.focus(); fC.elements.name.removeAttribute('aria-invalid'); }));
  fC.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = fC.elements.name.value.trim();
    const al = $('.form-alert', fC); al.hidden = true;
    if (!name) { fC.elements.name.setAttribute('aria-invalid', 'true'); al.textContent = 'Give your campaign a name, or press Later.'; al.hidden = false; fC.elements.name.focus(); return; }
    const btn = $('button[form="f-camp"]'); const lbl = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Creating…';
    try {
      const rows = await A.call('/rest/v1/campaigns', { method: 'POST', body: { name, owner: U.id }, headers: { Prefer: 'return=representation' } });
      const c = Array.isArray(rows) ? rows[0] : rows;
      st.campaign = { id: c && c.id, name: (c && c.name) || name }; saveSt();
      camps.push({ campaign_id: st.campaign.id, role: 'dm', name: st.campaign.name });
      window.ArcToast && window.ArcToast(`"${st.campaign.name}" is ready.`);
      fC.reset(); next();
    } catch (err) { al.textContent = 'Could not create the campaign: ' + A.words(err); al.hidden = false; }
    finally { btn.disabled = false; btn.innerHTML = lbl; }
  });
  fC.elements.name.addEventListener('input', () => fC.elements.name.removeAttribute('aria-invalid'));

  /* ── 2b · the invite ── */
  const fI = $('#f-inv');
  function paintInvite() {
    let inv = qs.get('invite'); try { inv = inv || localStorage.getItem('arc_invite'); } catch (e) { /* ignore */ }
    if (inv && !fI.elements.code.value) fI.elements.code.value = fmtCode(normCode(inv));
    if (!fI.elements.name.value) fI.elements.name.value = A.name(U);
    setTimeout(() => fI.elements.code.focus(), 60);
  }
  fI.elements.code.addEventListener('input', () => {
    const i = fI.elements.code, raw = normCode(i.value).slice(0, 12), f = fmtCode(raw);
    if (i.value !== f) i.value = f;
    i.removeAttribute('aria-invalid');
  });
  fI.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = normCode(fI.elements.code.value), al = $('.form-alert', fI); al.hidden = true;
    if (code.length < 8) { fI.elements.code.setAttribute('aria-invalid', 'true'); al.textContent = 'Invite codes are 12 letters and numbers, like ABCD-EFGH-JKLM.'; al.hidden = false; fI.elements.code.focus(); return; }
    const btn = $('button[form="f-inv"]'); const lbl = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spin" aria-hidden="true"></span>Joining…';
    try {
      const cid = await A.call('/rest/v1/rpc/redeem_invite', { method: 'POST', body: { code, name: fI.elements.name.value.trim() || null } });
      let name = 'your DM\'s campaign';
      try { const r = await A.call('/rest/v1/campaigns?select=id,name&id=eq.' + encodeURIComponent(cid)); if (r && r[0]) name = r[0].name; } catch (er) { /* the name is a nicety */ }
      st.joined = { id: cid, name }; saveSt();
      try { localStorage.removeItem('arc_invite'); } catch (er) { /* ignore */ }
      window.ArcToast && window.ArcToast(`You joined "${name}".`);
      next();
    } catch (err) {
      try { localStorage.removeItem('arc_invite'); } catch (er) { /* a bad code stops coming back */ }
      al.textContent = A.words(err).replace(/^This invite/i, 'This invite'); al.hidden = false; fI.elements.code.select();
    } finally { btn.disabled = false; btn.innerHTML = lbl; }
  });

  /* ── 3 · how the table runs ── */
  function paintSetup(sec) {
    const player = st.role === 'player';
    $('[data-paths-dm]', sec).hidden = player; $('[data-paths-player]', sec).hidden = !player;
    $('[data-setup-title]', sec).textContent = player ? 'How you\'ll join' : 'Open your table';
    $('[data-setup-lede]', sec).textContent = player ? 'Your DM runs the table. Here\'s what happens on game night.' : 'Arzantia runs in your browser. Here\'s how you open your table, and bring the room in.';
    $$('[data-login]', sec).forEach((a) => { a.href = CFG.loginUrl || 'signin.html'; });
  }

  /* ── 5 · ready ── */
  function paintDone(sec) {
    const dm = st.role !== 'player', pl = st.role !== 'dm', owned = camps.filter((c) => c.role === 'dm' || c.role === 'codm'), member = camps.filter((c) => c.role !== 'dm' && c.role !== 'codm');
    $('[data-done-title]', sec).textContent = st.finishedOnce ? 'Your table' : 'You\'re ready, ' + A.name(U);
    const row = (ok, icon, html, btn) => `<li class="${ok ? 'ok' : ''}"><i>${ic(ok ? 'check' : icon)}</i><span>${html}</span>${btn || ''}</li>`;
    const login = CFG.loginUrl ? esc(CFG.loginUrl) : '#';
    const items = [row(true, 'check', `Signed in as <b>${esc(U.email || A.name(U))}</b>`)];
    if (dm) {
      items.push(st.campaign ? row(true, 'flag', `Campaign <b>${esc(st.campaign.name)}</b> created`)
        : owned.length ? row(true, 'flag', `You run <b>${owned.length}</b> campaign${owned.length === 1 ? '' : 's'}`)
          : row(false, 'flag', 'No campaign yet', '<button class="btn sm" type="button" data-goto="campaign">Name one</button>'));
      items.push(row(false, 'play', '<b>Enter the table</b> from your campaigns, right in the browser', `<a class="btn sm primary" href="${login}">Open</a>`));
      items.push(row(false, 'link', 'Invite your party with a link or a code from your campaign', `<a class="btn sm" href="${login}">Invite players</a>`));
    }
    if (pl) {
      items.push(st.joined ? row(true, 'users', `You joined <b>${esc(st.joined.name)}</b>`)
        : member.length ? row(true, 'users', `You play in <b>${member.length}</b> campaign${member.length === 1 ? '' : 's'}`)
          : row(false, 'users', 'Waiting for an invite from your DM', '<button class="btn sm" type="button" data-goto="invite">Enter a code</button>'));
    }
    const ul = $('[data-summary]', sec); ul.innerHTML = items.join('');
    $$('[data-goto]', ul).forEach((b) => b.addEventListener('click', () => { if (flow().indexOf(b.dataset.goto) < 0) st.role = 'both'; go(b.dataset.goto); }));
    $$('[data-login]', sec).forEach((a) => { a.href = CFG.loginUrl || 'signin.html'; });
  }
  async function finish() {
    st.finished = true; saveSt();
    go('done');
    if (!st.finishedOnce) burst();
    st.finishedOnce = true; saveSt();
    try { await A.update({ data: { onboarded: true, role: st.role } }); } catch (e) { /* kept on this device either way */ }
  }
  $('[data-restart]').addEventListener('click', () => { const r = st.role; st = { role: r, step: 'role', finishedOnce: true, campaign: null, joined: null }; saveSt(); pickRole(r); go('role'); });

  /* a little gold for finishing */
  function burst() {
    if (RM.matches) return;
    const c = document.createElement('canvas'); c.className = 'confetti'; document.body.append(c);
    const x = c.getContext('2d'), d = Math.min(devicePixelRatio || 1, 2);
    c.width = innerWidth * d; c.height = innerHeight * d; x.scale(d, d);
    const cols = ['#e9cf8e', '#c9a962', '#f1dca6', '#8e7232', '#efe9dd'];
    const ps = Array.from({ length: 110 }, () => ({ x: innerWidth / 2, y: innerHeight * .32, vx: (Math.random() - .5) * 13, vy: -Math.random() * 11 - 3, r: Math.random() * 5 + 3, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: cols[(Math.random() * cols.length) | 0] }));
    let t = 0;
    (function f() {
      x.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of ps) { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.globalAlpha = Math.max(0, 1 - t / 140); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
      if (++t < 140) requestAnimationFrame(f); else c.remove();
    })();
  }

  /* ── sign out ── */
  $('#sign-out').addEventListener('click', async () => { await A.signOut(); location.replace('index.html'); });

  /* ── start: who is here, and where they left off ── */
  (async () => {
    const link = A.takeLink();
    if (link && link.error) { location.replace('signin.html?next=welcome.html'); return; }
    U = await A.user();
    if (!U) { location.replace('signin.html?next=welcome.html'); return; }
    key = 'arcane.site.onboard.' + U.id;
    const n = A.name(U);
    $$('[data-avatar]').forEach((a) => { a.textContent = n.charAt(0).toUpperCase(); });
    $('[data-hello]').textContent = 'Welcome, ' + n;
    try {
      const m = await A.call('/rest/v1/members?select=campaign_id,role&user_id=eq.' + encodeURIComponent(U.id));
      camps = Array.isArray(m) ? m : [];
    } catch (e) { camps = []; }
    const meta = U.user_metadata || {};
    st = loadSt() || { step: 'role' };
    if (!st.role && meta.role) st.role = meta.role;
    let pending = qs.get('invite'); try { pending = pending || localStorage.getItem('arc_invite'); } catch (e) { /* ignore */ }
    if (pending) { st.role = st.role === 'dm' ? 'both' : (st.role || 'player'); }
    if (qs.get('new')) history.replaceState(null, '', location.pathname);
    if (st.role) pickRole(st.role);
    const done = st.finished || meta.onboarded;
    if (done && !pending) { st.finishedOnce = true; st.role = st.role || meta.role || 'dm'; go('done', { noFocus: true }); return; }
    if (pending) { go('invite', { noFocus: true }); return; }
    go(flow().includes(st.step) ? st.step : 'role', { noFocus: true });
  })();
})();
