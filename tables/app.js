/* Arcane - the front door (Vercel). Sign in with Supabase, see your campaigns, join one with an
   invite, and enter its table: the table runs on the DM's PC behind a tunnel; this page hands the
   browser to it with a form post carrying the Supabase access token, and the table checks that
   token itself with Supabase before it opens a session. Nothing secret lives in this file - the
   Supabase URL and publishable key in config.js are public by design; every table is guarded by
   Row Level Security. Everything shown from the database is set as text, never as HTML. */
(() => {
  'use strict';
  const CFG = window.ARCANE_CONFIG || {};
  const API = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
  const KEY = String(CFG.supabaseKey || '');
  /* One key for both front doors: this page answers at /tables on the website's address, so the website's
     sign-in is this page's too (website/js/auth.js keeps the same key and shape). The website keeps it in
     sessionStorage when "Keep me signed in" is off, so both stores are read. */
  const STORE = 'arzantia.session.v1';
  const OLD = ['arcane.session.v1', 'arcane.site.session.v1'];
  const $ = (id) => document.getElementById(id);
  const ONLINE_MS = 15 * 60 * 1000;       // a table without the M34 heartbeat: its address is republished every 10 min
  const BEAT_MS = 3 * 60 * 1000;          // M34: a table with one beats every minute - three missed and it is closed
  const TABLE_ADDR = /^https:\/\/[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?$/;   // a tunnel's, or a hosted table's own

  /* ── a few words on screen ── */
  let toastT = 0;
  function toast(text, err) {
    const t = $('toast');
    t.textContent = text; t.classList.toggle('err', !!err); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 5200);
  }
  function show(id) {
    for (const s of ['door', 'sent', 'reset', 'home']) $(s).hidden = s !== id;
    $('who').hidden = id !== 'home' && id !== 'reset';
  }
  const busy = (btn, on) => { if (btn) btn.disabled = !!on; };

  /* ── the session (Supabase), kept in this site's storage ── */
  const stores = () => { const out = []; try { out.push(localStorage); } catch (e) { /* blocked */ } try { out.push(sessionStorage); } catch (e) { /* blocked */ } return out; };
  for (const st of stores()) {   /* a session saved under an older key moves to the shared one, once */
    try {
      if (!st.getItem(STORE)) for (const k of OLD) { const v = st.getItem(k); if (v) { st.setItem(STORE, v); break; } }
      for (const k of OLD) st.removeItem(k);
    } catch (e) { /* blocked */ }
  }
  const read = () => {
    for (const st of stores()) { try { const v = JSON.parse(st.getItem(STORE) || 'null'); if (v && v.access_token) return v; } catch (e) { /* bad json */ } }
    return null;
  };
  let sess = read();
  const save = (s) => {
    sess = s;
    let where = localStorage;
    try { if (!localStorage.getItem(STORE) && sessionStorage.getItem(STORE)) where = sessionStorage; } catch (e) { /* default */ }
    for (const st of stores()) { try { st.removeItem(STORE); } catch (e) { /* ignore */ } }
    if (s) { try { where.setItem(STORE, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  };
  const keep = (r) => save({ access_token: r.access_token, refresh_token: r.refresh_token,
    expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600), user: r.user || (sess && sess.user) || null });

  async function call(path, opts = {}) {
    const headers = Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, opts.headers || {});
    /* the publishable key goes in apikey only (it is no JWT: as a Bearer it is refused); a signed-in user's token is the Bearer */
    const tok = opts.auth !== false && (opts.token || (sess && sess.access_token));
    if (tok) headers.Authorization = 'Bearer ' + tok;
    const r = await fetch(API + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    const txt = await r.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    if (!r.ok) {
      const msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('error ' + r.status);
      const e = new Error(String(msg)); e.status = r.status; throw e;
    }
    return data;
  }
  async function fresh() {
    sess = read() || sess;   /* the website may have renewed it */
    if (!sess) return null;
    if ((sess.expires_at || 0) - 90 > Date.now() / 1000) return sess;
    try { keep(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: sess.refresh_token } })); }
    catch (e) { save(null); return null; }
    return sess;
  }

  /* the table checks a sign-in with Supabase Auth, which knows when its session has ended (signed out
     everywhere, say) while the token still opens the lists here: Enter checks it the same way first */
  async function alive() {
    try { sess.user = await call('/auth/v1/user'); save(sess); return true; }
    catch (e) {
      if (e.status !== 401 && e.status !== 403) throw e;
      try {
        keep(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: sess.refresh_token } }));
        sess.user = await call('/auth/v1/user'); save(sess); return true;
      } catch (e2) { return false; }
    }
  }

  /* ── signing in, signing up, a lost password ── */
  const back = () => location.origin + location.pathname;
  async function signIn(email, password) {
    keep(await call('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } }));
  }
  async function signUp(name, email, password) {
    const r = await call('/auth/v1/signup?redirect_to=' + encodeURIComponent(back()), { method: 'POST', auth: false, body: { email, password, data: { name } } });
    if (r && r.access_token) { keep(r); return true; }       // no confirmation asked: signed in
    return false;
  }

  /* ── the campaigns ── */
  const uid = () => (sess && sess.user && sess.user.id) || '';
  const fmtCode = (c) => c.replace(/(.{4})(?=.)/g, '$1-');
  const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  async function sha256hex(text) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  function newCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', v = new Uint32Array(12);
    crypto.getRandomValues(v);
    return [...v].map((x) => A[x % A.length]).join('');
  }

  async function loadHome() {
    if (!(await fresh())) return showDoor();
    if (!sess.user) { try { sess.user = await call('/auth/v1/user'); save(sess); } catch (e) { return showDoor(); } }
    $('who-mail').textContent = sess.user.email || '';
    show('home');
    let mine = [], camps = [], hosts = [];
    try {
      mine = await call('/rest/v1/members?select=campaign_id,role,display_name&user_id=eq.' + encodeURIComponent(uid()));
      const ids = mine.map((m) => m.campaign_id);
      if (ids.length) {
        const list = 'in.(' + ids.map(encodeURIComponent).join(',') + ')';
        camps = await call('/rest/v1/campaigns?select=id,name,owner,created_at&order=created_at.asc&id=' + list);
        hosts = await getHosts(list);
      }
    } catch (e) { toast('Could not load your campaigns: ' + e.message, true); }
    const box = $('camps'); box.textContent = '';
    $('camps-empty').hidden = camps.length > 0;
    watchStatus();
    for (const c of camps) box.appendChild(campCard(c, mine.find((m) => m.campaign_id === c.id) || {}, hosts.find((h) => h.campaign_id === c.id)));
    let inv = new URLSearchParams(location.search).get('invite');
    try { inv = inv || localStorage.getItem('arc_invite'); } catch (e) { /* private mode */ }
    if (inv) { $('form-join').code.value = fmtCode(normCode(inv)); $('form-join').code.focus(); }
  }

  const ROLE_NAME = { dm: 'DM', codm: 'Co-DM', player: 'Player', guest: 'Guest' };
  /* M34: the heartbeat and who is at the table, from a database with the M34 update - else the address alone */
  let hostCols = 'campaign_id,url,updated_at,last_seen,kind,online';
  async function getHosts(list) {
    try { return await call('/rest/v1/hosts?select=' + hostCols + '&campaign_id=' + list); }
    catch (e) {
      if (e.status !== 400 || hostCols === 'campaign_id,url,updated_at') throw e;
      hostCols = 'campaign_id,url,updated_at';
      return call('/rest/v1/hosts?select=' + hostCols + '&campaign_id=' + list);
    }
  }
  const isOpen = (host) => !!(host && host.url && (host.last_seen
    ? Date.now() - Date.parse(host.last_seen) < BEAT_MS
    : Date.now() - Date.parse(host.updated_at) < ONLINE_MS));
  const HOSTS = new Map();                // campaign id -> its last host row (who is at the table)
  /* M33: open or closed, in words that say what to do - and the list keeps itself current */
  function paintStatus(el, host) {
    const on = isOpen(host);
    HOSTS.set(el.dataset.camp, host || null);
    const dm = el.dataset.role === 'dm';
    const hosted = !!(host && host.kind === 'hosted');
    const st = el.querySelector('.camp-status');
    st.textContent = on ? 'Table is open' : 'Table is closed';
    st.classList.toggle('on', on);
    const enter = el.querySelector('.camp-enter');
    enter.disabled = !on;
    enter.title = on ? 'Open the table' : hosted ? 'The table\'s server is not answering right now'
      : dm ? 'Your PC is not running this table' : 'The DM\'s PC is not running the table right now';
    let hint = el.querySelector('.camp-hint');
    if (!hint) { hint = document.createElement('p'); hint.className = 'hint camp-hint'; el.querySelector('.camp-row').after(hint); }
    hint.hidden = on;
    hint.textContent = hosted
      ? (dm ? 'Your online table is not answering: check its hosting service (is it running, are its settings set?). This page notices by itself.'
            : 'The table\'s server is not answering right now. This page notices by itself when it is back.')
      : dm
        ? 'To open it, double-click Arcane.cmd on the PC that runs this campaign - or host it online (DM tools). This page notices by itself.'
        : 'Your DM has not opened the table yet. This page notices by itself when they do.';
    paintOnline(el, host);
  }
  /* M34: who is at the table right now - a count on the card, a dot by each member */
  function paintOnline(el, host) {
    const ids = isOpen(host) && Array.isArray(host.online) ? host.online : [];
    let n = el.querySelector('.camp-online');
    if (!n) { n = document.createElement('span'); n.className = 'status on camp-online'; el.querySelector('.camp-id').appendChild(n); }
    n.hidden = !ids.length;
    n.textContent = ids.length ? ids.length + ' at the table' : '';
    for (const li of el.querySelectorAll('.members li[data-uid]')) {
      const here = ids.includes(li.dataset.uid);
      li.classList.toggle('here', here);
      const d = li.querySelector('.dot');
      if (d) d.title = here ? 'At the table now' : 'Not at the table';
    }
  }
  let statusTimer = 0;
  async function refreshStatus() {
    if ($('home').hidden || document.visibilityState !== 'visible') return;
    const cards = [...document.querySelectorAll('#camps .camp[data-camp]')];
    if (!cards.length) return;
    try {
      const list = 'in.(' + cards.map((c) => encodeURIComponent(c.dataset.camp)).join(',') + ')';
      const hosts = await getHosts(list);
      for (const el of cards) paintStatus(el, hosts.find((h) => h.campaign_id === el.dataset.camp));
      /* an open members list stays current: who joined with an invite since, who left */
      for (const el of cards) { const dm = el.querySelector('.camp-dm'); if (dm && dm.open) loadMembers(el.dataset.camp, el.querySelector('.members'), true); }
    } catch (e) { /* the next round tries again */ }
  }
  function watchStatus() {
    clearInterval(statusTimer);
    statusTimer = setInterval(refreshStatus, 30000);
  }
  document.addEventListener('visibilitychange', refreshStatus);
  function campCard(c, m, host) {
    const el = $('tpl-camp').content.firstElementChild.cloneNode(true);
    el.querySelector('.camp-name').textContent = c.name;
    el.querySelector('.camp-role').textContent = ROLE_NAME[m.role] || 'Player';
    el.dataset.camp = c.id; el.dataset.role = m.role || 'player';
    paintStatus(el, host);
    const enter = el.querySelector('.camp-enter');
    enter.onclick = () => enterTable(c.id, enter);
    if (m.role === 'dm' || m.role === 'codm') {
      /* a co-DM sees who is in the campaign; only the DM (the owner) invites and hosts it */
      const dm = el.querySelector('.camp-dm'); dm.hidden = false;
      dm.addEventListener('toggle', () => { if (dm.open) loadMembers(c.id, el.querySelector('.members')); });
      if (m.role === 'codm') {
        el.querySelector('.dm-summary').textContent = 'Co-DM tools: members';
        for (const b of el.querySelectorAll('.dm-box')) if (!b.querySelector('.members')) b.hidden = true;
      } else {
        el.querySelector('.dm-invite').onclick = (ev) => makeInvite(c.id, el.querySelector('.dm-invite-out'), ev.currentTarget, (el.querySelector('.dm-invite-role') || {}).value || 'player');
        el.querySelector('.dm-host').onclick = (ev) => hostOnline(c.id, el.querySelector('.dm-host-out'), ev.currentTarget);
      }
    }
    return el;
  }

  async function enterTable(campaign, btn) {
    busy(btn, true);
    try {
      if (!(await fresh())) return showDoor();
      if (!(await alive())) { save(null); showDoor(); toast('Your sign-in has ended: sign in again to enter the table.', true); return; }
      const rows = await call('/rest/v1/hosts?select=url,updated_at&campaign_id=eq.' + encodeURIComponent(campaign));
      const url = rows && rows[0] && rows[0].url;
      if (!url || !TABLE_ADDR.test(url)) { toast('The table is closed right now.', true); return; }
      /* a top-level form post: the table checks the token with Supabase and answers with its own
         session cookie - the token never travels in an address */
      const f = document.createElement('form');
      f.method = 'POST'; f.action = url + '/api/auth/session'; f.hidden = true;
      for (const [k, v] of [['access_token', sess.access_token], ['campaign', campaign]]) {
        const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i);
      }
      document.body.appendChild(f);
      f.submit();
    } catch (e) { toast('Could not open the table: ' + e.message, true); busy(btn, false); }
  }

  async function loadMembers(campaign, ul, quiet) {
    try {
      const rows = await call('/rest/v1/members?select=user_id,role,display_name,created_at&order=created_at.asc&campaign_id=eq.' + encodeURIComponent(campaign));
      const owner = (ul.closest('.camp') || {}).dataset || {};
      ul.textContent = '';
      const note = ul.parentElement.querySelector('.members-note');
      if (note) note.textContent = rows.length + (rows.length === 1 ? ' member' : ' members') + ' - a green dot is at the table now.';
      for (const r of rows) {
        const li = document.createElement('li');
        li.dataset.uid = r.user_id;
        const dot = document.createElement('span'); dot.className = 'dot'; dot.setAttribute('aria-hidden', 'true');
        li.appendChild(dot);
        const nm = document.createElement('span');
        nm.textContent = (r.display_name || (r.user_id === uid() ? 'You' : 'Player ' + r.user_id.slice(0, 4))) + (r.role !== 'player' ? ' (' + (ROLE_NAME[r.role] || r.role) + ')' : '');
        li.appendChild(nm);
        if (r.role !== 'dm' && owner.role === 'dm') {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn danger'; b.textContent = 'Remove';
          b.onclick = async () => {
            if (!confirm('Remove this player from the campaign?')) return;
            try { await call('/rest/v1/members?campaign_id=eq.' + encodeURIComponent(campaign) + '&user_id=eq.' + encodeURIComponent(r.user_id), { method: 'DELETE' }); li.remove(); }
            catch (e) { toast('Could not remove: ' + e.message, true); }
          };
          li.appendChild(b);
        }
        ul.appendChild(li);
      }
      const card = ul.closest('.camp');
      if (card) paintOnline(card, HOSTS.get(campaign));
    } catch (e) { if (!quiet) toast('Could not load members: ' + e.message, true); }
  }

  /* M22 (plan 8.2): a player, a guest who watches, or a co-DM who runs the table with you */
  async function makeInvite(campaign, out, btn, role) {
    busy(btn, true);
    try {
      const code = newCode();
      const who = role === 'codm' ? 'co-DM' : role === 'guest' ? 'guest' : 'player';
      /* M34: one invite serves the whole party (one QR on the screen); a co-DM's stays for one person */
      const uses = role === 'codm' ? 1 : 10;
      const body = { code_hash: await sha256hex(code), campaign_id: campaign, expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), max_uses: uses };
      if (role === 'codm' || role === 'guest') body.role = role;
      try { await call('/rest/v1/invites', { method: 'POST', headers: { Prefer: 'return=minimal' }, body }); }
      catch (e) {
        if (body.role && /check constraint|violates|23514/i.test(e.message)) throw new Error('co-DM and guest invites need the database update first (supabase/migrations/002_m22_roles.sql, in the Supabase SQL editor)');
        throw e;
      }
      const link = back() + '?invite=' + code;
      /* the QR is drawn from this very link, every time - never kept from an older one */
      out.textContent = '';
      const qr = window.ArcaneQR && window.ArcaneQR.node(link, 'QR code for the invite link');
      if (qr) out.appendChild(qr);
      const c = document.createElement('code'); c.textContent = fmtCode(code);
      const l = document.createElement('code'); l.className = 'invite-link'; l.textContent = link;
      const row = document.createElement('div'); row.className = 'invite-actions';
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'btn'; copy.textContent = 'Copy link';
      copy.onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Invite link copied.'); } catch (e) { toast('Select the link and copy it.', true); } };
      const again = document.createElement('button'); again.type = 'button'; again.className = 'btn'; again.textContent = 'New link';
      again.title = 'Make a new invite (the old one keeps working until it expires or is used up)';
      again.onclick = () => makeInvite(campaign, out, again, role);
      row.append(copy, again);
      const p = document.createElement('p'); p.className = 'hint';
      p.textContent = uses > 1
        ? 'Scan the QR code or open the link. Works for up to ' + uses + ' people, for 7 days. It is shown once.'
        : 'Send the link (or the code) to one ' + who + '. It is shown once.';
      out.append(c, l, row, p); out.hidden = false;
      try { await navigator.clipboard.writeText(link); toast('Invite link copied.'); } catch (e) { /* shown above */ }
    } catch (e) { toast('Could not make an invite: ' + e.message, true); }
    busy(btn, false);
  }

  /* M34: the settings a hosted table needs (docs/HOSTING.md). The host key is made fresh and shown once:
     making it replaces the old one, so a PC that published with that key must be linked again. */
  async function hostOnline(campaign, out, btn) {
    if (!out.hidden && out.childElementCount) { out.hidden = true; return; }
    if (!confirm('Make a new key for hosting this table online?\n\nIt is shown once. A PC already running this table must be linked again on its setup page afterwards.')) return;
    busy(btn, true);
    try {
      const key = await call('/rest/v1/rpc/rotate_host_key', { method: 'POST', body: { c: campaign } });
      if (!/^[0-9a-f]{32,128}$/.test(String(key || ''))) throw new Error('no key came back');
      out.textContent = '';
      const lines = 'ARCANE_CAMPAIGN_ID=' + campaign + '\nARCANE_HOST_KEY=' + key + '\nARCANE_PUBLIC_URL=https://<your table\'s address>';
      const pre = document.createElement('pre'); pre.className = 'env'; pre.textContent = lines;
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'btn'; copy.textContent = 'Copy settings';
      copy.onclick = async () => { try { await navigator.clipboard.writeText(lines); toast('Settings copied.'); } catch (e) { toast('Select them and copy.', true); } };
      const p = document.createElement('p'); p.className = 'hint';
      p.textContent = 'Deploy Arzantia\'s Dockerfile on a host with a persistent disk at /data (Render, Fly.io, Railway or your own server - see docs/HOSTING.md) '
        + 'and set these as its environment variables, with ARCANE_PUBLIC_URL its https address. Keep the key secret. When it runs, this card says "Table is open".';
      out.append(pre, copy, p); out.hidden = false;
    } catch (e) { toast('Could not make the key: ' + e.message, true); }
    busy(btn, false);
  }

  /* ── wiring ── */
  function showDoor() {
    show('door');
    const hash = new URLSearchParams(location.hash.slice(1));
    if (hash.get('error')) { toast(hash.get('error'), true); history.replaceState(null, '', location.pathname + location.search); return; }
    /* an invite opened by someone without an account yet: the account first, the campaign right after */
    let inv = null; try { inv = new URLSearchParams(location.search).get('invite') || localStorage.getItem('arc_invite'); } catch (e) { /* private mode */ }
    if (inv) { tab(true); toast('You are invited to a campaign: make an account (or sign in) and you join it right after.'); }
  }
  function tab(up) {
    $('tab-in').classList.toggle('on', !up); $('tab-up').classList.toggle('on', up);
    $('tab-in').setAttribute('aria-selected', String(!up)); $('tab-up').setAttribute('aria-selected', String(up));
    $('form-in').hidden = up; $('form-up').hidden = !up;
  }
  $('tab-in').onclick = () => tab(false);
  $('tab-up').onclick = () => tab(true);
  $('form-in').onsubmit = async (ev) => {
    ev.preventDefault(); const f = ev.currentTarget, b = f.querySelector('[type=submit]'); busy(b, true);
    try { await signIn(f.email.value.trim(), f.password.value); f.password.value = ''; await loadHome(); }
    catch (e) { toast(e.status === 400 ? 'Wrong email or password (or the email is not confirmed yet).' : 'Could not sign in: ' + e.message, true); }
    busy(b, false);
  };
  $('form-up').onsubmit = async (ev) => {
    ev.preventDefault(); const f = ev.currentTarget, b = f.querySelector('[type=submit]'); busy(b, true);
    try {
      const signedIn = await signUp(f.name.value.trim(), f.email.value.trim(), f.password.value);
      f.password.value = '';
      if (signedIn) await loadHome(); else { $('sent-text').textContent = 'We sent a confirmation link to ' + f.email.value.trim() + '. Open it on this device, then sign in.'; show('sent'); }
    } catch (e) { toast('Could not create the account: ' + e.message, true); }
    busy(b, false);
  };
  $('forgot').onclick = async () => {
    const email = $('form-in').email.value.trim();
    if (!email) { toast('Type your email first.', true); return; }
    try { await call('/auth/v1/recover?redirect_to=' + encodeURIComponent(back()), { method: 'POST', auth: false, body: { email } }); }
    catch (e) { /* never tell whether an account exists */ }
    $('sent-text').textContent = 'If an account exists for ' + email + ', a reset link is on its way.'; show('sent');
  };
  $('sent-back').onclick = () => { tab(false); showDoor(); };
  $('form-reset').onsubmit = async (ev) => {
    ev.preventDefault(); const f = ev.currentTarget, b = f.querySelector('[type=submit]'); busy(b, true);
    try { await call('/auth/v1/user', { method: 'PUT', body: { password: f.password.value } }); f.password.value = ''; toast('Password saved.'); await loadHome(); }
    catch (e) { toast('Could not save the password: ' + e.message, true); }
    busy(b, false);
  };
  $('sign-out').onclick = async () => {
    try { if (sess) await call('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* signed out here anyway */ }
    save(null); showDoor();
  };
  $('form-join').onsubmit = async (ev) => {
    ev.preventDefault(); const f = ev.currentTarget, b = f.querySelector('[type=submit]'); busy(b, true);
    try {
      await call('/rest/v1/rpc/redeem_invite', { method: 'POST', body: { code: normCode(f.code.value), name: f.name.value.trim() || null } });
      f.reset(); history.replaceState(null, '', location.pathname); try { localStorage.removeItem('arc_invite'); } catch (e2) { /* private mode */ }
      toast('Welcome to the campaign.'); await loadHome();
    } catch (e) {
      /* a code that will never work stops asking on every visit */
      if (/not valid|used up/i.test(e.message)) { try { localStorage.removeItem('arc_invite'); } catch (e2) { /* private mode */ } history.replaceState(null, '', location.pathname); }
      toast(/not valid/i.test(e.message) ? 'That invite is not valid (wrong, used or expired).'
        : /used up/i.test(e.message) ? 'That invite is used up: ask your DM for a new one.' : 'Could not join: ' + e.message, true);
    }
    busy(b, false);
  };

  /* an invite link opened before an account exists: keep its code here through the sign-up and the
     email confirmation (that link comes back without it), until it is used */
  try { const iv = new URLSearchParams(location.search).get('invite'); if (iv) localStorage.setItem('arc_invite', iv); } catch (e) { /* private mode */ }

  /* ── first look: a link from an email (confirmation or recovery), an error from the table, or the session we keep ── */
  (async () => {
    if (!API || !KEY) { show('door'); toast('This site is not configured yet.', true); return; }
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('access_token') && h.get('refresh_token')) {
      keep({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: Number(h.get('expires_in')) || 3600 });
      history.replaceState(null, '', location.pathname + location.search);
      try { sess.user = await call('/auth/v1/user'); save(sess); } catch (e) { save(null); }
      if (h.get('type') === 'recovery' && sess) { $('who-mail').textContent = sess.user.email || ''; show('reset'); return; }
    }
    if (h.get('error_description')) toast(h.get('error_description'), true);
    if (!sess) return showDoor();
    await loadHome();
    /* the table sent this browser back, with why (showDoor tells someone signed out) */
    if (h.get('error') && sess) { toast('The table did not let you in: ' + h.get('error'), true); history.replaceState(null, '', location.pathname + location.search); }
  })();
})();
