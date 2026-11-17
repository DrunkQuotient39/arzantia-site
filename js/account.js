/* Arzantia website - signin.html and signup.html. Signing in returns to where you were going (welcome.html by
   default); a new account goes straight into the welcome walkthrough. */
(() => {
  'use strict';
  const A = window.ArcAuth, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = document.body.dataset.page;

  /* only our own pages are allowed as "next" (no open redirects) */
  const SAFE = /^(welcome|index|features|about)\.html(#[a-z0-9-]*)?$/;
  const nextRaw = new URLSearchParams(location.search).get('next') || '';
  const next = SAFE.test(nextRaw) ? nextRaw : 'welcome.html';
  /* an invite code in the address (signup.html?invite=...) waits for the walkthrough's Party step */
  const invQ = (new URLSearchParams(location.search).get('invite') || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 20);
  if (invQ) { try { localStorage.setItem('arc_invite', invQ); } catch (e) { /* private mode */ } }
  $$('[data-keep-next]').forEach((a) => { if (nextRaw && SAFE.test(nextRaw)) a.href += '?next=' + encodeURIComponent(nextRaw); });

  const views = $$('.view');
  function show(id) {
    views.forEach((v) => { v.hidden = v.id !== 'v-' + id; });
    const v = $('#v-' + id), f = v && $('input:not([type=checkbox])', v);
    if (f) setTimeout(() => f.focus(), 30);
  }
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.go === 'forgot') { const e = $('#f-in [name=email]'); if (e) $('#f-forgot [name=email]').value = e.value; }
    clearAlert($('#f-forgot')); show(b.dataset.go);
  }));

  /* show / hide the password */
  $$('.peek').forEach((b) => b.addEventListener('click', () => {
    const i = b.parentElement.querySelector('input'), on = i.type === 'password';
    i.type = on ? 'text' : 'password'; b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Hide the password' : 'Show the password');
    i.focus({ preventScroll: true });
  }));

  function alert(form, text, ok) { const a = $('.form-alert', form); if (!a) return; a.classList.toggle('ok', !!ok); a.textContent = text; a.hidden = false; }
  function clearAlert(form) { if (!form) return; const a = $('.form-alert', form); if (a) a.hidden = true; $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid')); }
  function busy(form, on, label) {
    const b = $('button[type=submit]', form);
    if (on) { b.dataset.label = b.innerHTML; b.innerHTML = `<span class="spin" aria-hidden="true"></span>${label}`; b.disabled = true; }
    else { if (b.dataset.label) b.innerHTML = b.dataset.label; b.disabled = false; }
  }
  /* checks before anything is sent: the first problem gets the focus */
  function check(form, rules) {
    clearAlert(form);
    for (const [name, test, msg] of rules) {
      const i = form.elements[name];
      if (!test(i.value.trim(), i)) { i.setAttribute('aria-invalid', 'true'); alert(form, msg); i.focus(); return false; }
    }
    return true;
  }
  const isMail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  $$('input').forEach((i) => i.addEventListener('input', () => i.removeAttribute('aria-invalid')));

  /* ── already signed in: nothing to do here ── */
  const link = A.takeLink();
  if (link && link.error) { show(page === 'signup' ? 'up' : 'in'); alert($(page === 'signup' ? '#f-up' : '#f-in'), 'That link did not work: ' + link.error + '. Ask for a new one.'); }
  else if (link && link.type === 'recovery') show('reset');
  else if (link) location.replace('welcome.html');
  else if (A.session) A.user().then((u) => { if (u) location.replace(next); });

  /* ── sign in ── */
  const fIn = $('#f-in');
  if (fIn) fIn.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!check(fIn, [['email', isMail, 'Enter the email you signed up with.'], ['password', (v) => v.length >= 6, 'Enter your password.']])) return;
    A.setRemember(fIn.elements.remember.checked);
    busy(fIn, true, 'Signing in…');
    try { await A.signIn(fIn.elements.email.value.trim(), fIn.elements.password.value); location.replace(next); }
    catch (err) { busy(fIn, false); alert(fIn, A.words(err)); fIn.elements.password.select(); }
  });

  /* ── a lost password ── */
  const fFg = $('#f-forgot');
  if (fFg) fFg.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!check(fFg, [['email', isMail, 'Enter the email of your account.']])) return;
    busy(fFg, true, 'Sending…');
    try { await A.recover(fFg.elements.email.value.trim()); busy(fFg, false); show('sent'); }
    catch (err) { busy(fFg, false); alert(fFg, A.words(err)); }
  });

  /* ── a new password from a recovery link ── */
  const fRs = $('#f-reset');
  if (fRs) fRs.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!check(fRs, [['password', (v) => v.length >= 10, 'Use at least 10 characters.']])) return;
    busy(fRs, true, 'Saving…');
    try { await A.update({ password: fRs.elements.password.value }); alert(fRs, 'Password saved. Taking you to your table…', true); setTimeout(() => location.replace('welcome.html'), 900); }
    catch (err) { busy(fRs, false); alert(fRs, A.words(err)); }
  });

  /* ── sign up ── */
  const fUp = $('#f-up');
  if (fUp) {
    const pw = fUp.elements.password, meter = $('.meter', fUp), word = $('[data-pw-word]', fUp), count = $('[data-pw-count]', fUp);
    const WORDS = ['Use 10 or more characters', 'Weak', 'Fair', 'Good', 'Strong'];
    const score = (v) => {
      if (v.length < 10) return v.length ? 1 : 0;
      let s = 2; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v) || /[^A-Za-z0-9]/.test(v)) s++; if (v.length >= 14) s++;
      return Math.min(4, s);
    };
    pw.addEventListener('input', () => {
      const v = pw.value, s = score(v);
      meter.dataset.s = s; word.textContent = v.length < 10 ? WORDS[0] : WORDS[s];
      count.textContent = v.length < 10 ? v.length + ' / 10' : '';
    });
    fUp.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!check(fUp, [
        ['name', (v) => v.length >= 1, 'Tell us what to call you.'],
        ['email', isMail, 'That email address does not look right.'],
        ['password', (v) => v.length >= 10, 'Use at least 10 characters for your password.']
      ])) return;
      busy(fUp, true, 'Creating your account…');
      A.setRemember(true);
      try {
        const now = await A.signUp(fUp.elements.name.value.trim(), fUp.elements.email.value.trim(), pw.value);
        if (now) { location.replace('welcome.html?new=1'); return; }
        busy(fUp, false);
        $('#sent-text').textContent = `We sent a link to ${fUp.elements.email.value.trim()}. Open it on this device and you'll land straight in your welcome tour.`;
        show('sent');
      } catch (err) { busy(fUp, false); alert(fUp, A.words(err)); }
    });
  }
})();
