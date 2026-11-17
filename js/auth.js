/* Arzantia website - accounts. Talks to Supabase Auth over plain fetch (no library, so the CSP stays 'self').
   The session lives in this site's own storage: localStorage when "Keep me signed in" is on, else
   sessionStorage (gone when the browser closes). Nothing from the server is ever written as HTML. */
(() => {
  'use strict';
  const CFG = window.ARCANE_SITE || {};
  const API = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
  const KEY = String(CFG.supabaseKey || '');
  /* One key for both front doors: the website and the login page (/tables) share this address, so signing in
     on one signs you in on the other. The login page keeps the same key and shape (login/app.js). */
  const STORE = 'arzantia.session.v1';
  const OLD = ['arcane.site.session.v1', 'arcane.session.v1'];

  const stores = () => { const out = []; try { out.push(localStorage); } catch (e) { /* blocked */ } try { out.push(sessionStorage); } catch (e) { /* blocked */ } return out; };
  function read() {
    for (const s of stores()) { try { const v = JSON.parse(s.getItem(STORE) || 'null'); if (v && v.access_token) return v; } catch (e) { /* bad json */ } }
    return null;
  }
  (function adopt() {   /* a session saved under an older key moves to the shared one, once */
    for (const st of (() => { const out = []; try { out.push(localStorage); } catch (e) { /* blocked */ } try { out.push(sessionStorage); } catch (e) { /* blocked */ } return out; })()) {
      try {
        if (st.getItem(STORE)) continue;
        for (const k of OLD) { const v = st.getItem(k); if (v) { st.setItem(STORE, v); break; } }
        for (const k of OLD) st.removeItem(k);
      } catch (e) { /* blocked */ }
    }
  })();
  let sess = read();
  let remember = true;
  try { remember = !sessionStorage.getItem(STORE) || !!localStorage.getItem(STORE); } catch (e) { /* default */ }

  function save(s) {
    sess = s;
    for (const st of stores()) { try { st.removeItem(STORE); } catch (e) { /* ignore */ } }
    if (!s) return;
    try { (remember ? localStorage : sessionStorage).setItem(STORE, JSON.stringify(s)); } catch (e) { /* private mode: memory only */ }
  }
  const keep = (r) => save({
    access_token: r.access_token, refresh_token: r.refresh_token,
    expires_at: r.expires_at || Math.floor(Date.now() / 1000) + (r.expires_in || 3600),
    user: r.user || (sess && sess.user) || null
  });

  async function call(path, opts = {}) {
    if (!API) throw new Error('The website is not connected to accounts yet');
    const headers = Object.assign({ apikey: KEY, 'Content-Type': 'application/json' }, opts.headers || {});
    const tok = opts.auth !== false && (opts.token || (sess && sess.access_token));
    if (tok) headers.Authorization = 'Bearer ' + tok;
    let r;
    try {
      r = await fetch(API + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    } catch (e) { const er = new Error('Could not reach the server - check your connection'); er.status = 0; throw er; }
    const txt = await r.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    if (!r.ok) {
      const msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('error ' + r.status);
      const e = new Error(String(msg)); e.status = r.status; e.code = data && (data.error_code || data.code); throw e;
    }
    return data;
  }

  /* friendly words for what Supabase says */
  function words(e) {
    const m = String((e && e.message) || e || '');
    if (/invalid login credentials/i.test(m)) return 'That email and password do not match an account.';
    if (/already registered|already been registered|user already exists/i.test(m)) return 'An account with this email already exists - sign in instead.';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first - open the link we sent you.';
    if (/password should be|weak password|at least/i.test(m)) return 'Choose a longer password (at least 10 characters).';
    if (/rate limit|too many/i.test(m)) return 'Too many tries - wait a minute and try again.';
    if (/invalid.*email|unable to validate email/i.test(m)) return 'That email address does not look right.';
    return m.charAt(0).toUpperCase() + m.slice(1);
  }

  async function fresh() {
    sess = read() || sess;   /* the other front door may have renewed it */
    if (!sess) return null;
    if ((sess.expires_at || 0) - 90 > Date.now() / 1000) return sess;
    try { keep(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: sess.refresh_token } })); }
    catch (e) { if (e.status) save(null); return e.status ? null : sess; }
    return sess;
  }
  async function user() {
    if (!(await fresh())) return null;
    if (sess.user && sess.user.id && sess.user._at && Date.now() - sess.user._at < 60000) return sess.user;
    try { const u = await call('/auth/v1/user'); u._at = Date.now(); sess.user = u; save(sess); return u; }
    catch (e) { if (e.status === 401 || e.status === 403) { save(null); return null; } return sess.user || null; }
  }

  const here = (page) => new URL(page, location.href).href.split('#')[0];

  const Auth = {
    get session() { return sess; },
    get remember() { return remember; },
    setRemember(on) { remember = !!on; if (sess) save(sess); },
    call, words, fresh, user,
    name(u) {
      u = u || (sess && sess.user);
      const m = (u && u.user_metadata) || {};
      return String(m.name || m.full_name || (u && u.email ? u.email.split('@')[0] : '') || 'Adventurer');
    },
    async signIn(email, password) {
      keep(await call('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } }));
      return user();
    },
    /* returns true when signed in at once, false when Supabase asked to confirm the email first */
    async signUp(name, email, password) {
      const r = await call('/auth/v1/signup?redirect_to=' + encodeURIComponent(here('welcome.html')), { method: 'POST', auth: false, body: { email, password, data: { name } } });
      if (r && r.access_token) { keep(r); return true; }
      return false;
    },
    recover(email) { return call('/auth/v1/recover?redirect_to=' + encodeURIComponent(here('signin.html')), { method: 'POST', auth: false, body: { email } }); },
    async update(fields) {
      const u = await call('/auth/v1/user', { method: 'PUT', body: fields });
      if (u && u.id) { u._at = Date.now(); sess.user = u; save(sess); }
      return u;
    },
    async signOut() {
      try { if (sess) await call('/auth/v1/logout?scope=local', { method: 'POST' }); } catch (e) { /* signed out here either way */ }
      save(null);
    },
    /* an email link (confirmation or recovery) lands with the session in the address's #fragment */
    takeLink() {
      const h = new URLSearchParams(location.hash.slice(1));
      if (!h.get('access_token') && !h.get('error') && !h.get('error_description')) return null;
      history.replaceState(null, '', location.pathname + location.search);
      if (h.get('error') || h.get('error_description')) return { error: (h.get('error_description') || h.get('error')).replace(/\+/g, ' ') };
      remember = true;
      keep({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: Number(h.get('expires_in')) || 3600, expires_at: Number(h.get('expires_at')) || 0 });
      return { type: h.get('type') || 'signup' };
    }
  };
  window.ArcAuth = Auth;
})();
