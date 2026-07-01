/* ============================================================
   OUTREACH INFLUENCERS — site.js
   Shared chrome (header/footer), auth + cart simulation,
   modals, cart drawer, toasts, reveal animations.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- tiny SVG icon set ---------- */
  const I = {
    cart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2.2l2.1 12.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6"/></svg>',
    caret: '<svg class="nav__caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    arrow: '<svg class="arrow" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    link: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>',
    pr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    ai: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="3"/><path d="M10 11h4M10 14h2"/></svg>',
    reseller: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18l-1.5 4.5a2 2 0 0 1-1.9 1.5H6.4a2 2 0 0 1-1.9-1.5L3 7z"/><path d="M3 7 5 3h14l2 4M8 21v-8M16 21v-8M5 13v8h14v-8"/></svg>',
    grow: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5 4 4 8-9"/><path d="M16 7h5v5"/></svg>',
  };

  /* ---------- nav model ---------- */
  const SERVICES = [
    { href: 'link-building.html', t: 'Link Building', d: 'Authority backlinks & guest posts', ic: I.link },
    { href: 'digital-pr.html',   t: 'Digital PR',     d: 'Press coverage on top-tier media', ic: I.pr },
    { href: 'ai-seo.html',       t: 'AI SEO',         d: 'Get cited by ChatGPT & AI search', ic: I.ai },
    { href: 'seo-reseller.html', t: 'SEO Reseller',   d: 'White-label SEO for agencies',     ic: I.reseller },
    { href: 'grow.html',         t: 'Grow',           d: 'Done-for-you growth retainers',    ic: I.grow },
  ];
  const NAV = [
    { t: 'Case Studies', href: 'case-studies.html' },
    { t: 'Blog',         href: 'blog.html' },
    { t: 'About',        href: 'about.html' },
    { t: 'Affiliates',   href: 'affiliates.html' },
  ];
  const APP_URL = (window.OI_APP_URL || 'https://app.outreachinfluencers.com').replace(/\/+$/, '');
  const appUrl = (path) => APP_URL + path;
  const goToApp = (path) => { window.location.href = appUrl(path); };

  /* ---------- state ---------- */
  const KEY = 'oi_state_v1';
  const defaultState = { loggedIn: false, name: '', email: '', cart: [] };
  let state = load();
  function load() { try { return Object.assign({}, defaultState, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return Object.assign({}, defaultState); } }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  const money = (n) => '$' + n.toLocaleString('en-US');
  const cartTotal = () => state.cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const cartCount = () => state.cart.reduce((s, i) => s + (i.qty || 1), 0);

  /* ---------- build header ---------- */
  function buildHeader() {
    const page = document.body.dataset.page || '';
    const isService = SERVICES.some(s => s.href === (page + '.html')) || page === 'service';
    const menuItems = SERVICES.map(s => `
      <a class="menu__item" href="${s.href}">
        <span class="menu__ico">${s.ic}</span>
        <span><span class="menu__t">${s.t}</span><br><span class="menu__d">${s.d}</span></span>
      </a>`).join('');

    const navLinks = NAV.map(n => `<a class="nav__link ${page === n.href.replace('.html','') ? 'is-active' : ''}" href="${n.href}">${n.t}</a>`).join('');

    const hdr = document.createElement('header');
    hdr.className = 'hdr';
    hdr.innerHTML = `
      <div class="wrap hdr__bar">
        <a class="brand" href="index.html" aria-label="Outreach Influencers home">
          <span class="brand__mark">OI</span><span>Outreach<span style="color:var(--violet)">Influencers</span></span>
        </a>
        <nav class="nav">
          <div class="has-menu">
            <a class="nav__link ${isService ? 'is-active' : ''}" href="#">Services ${I.caret}</a>
            <div class="menu"><div class="menu__grid">${menuItems}</div>
              <a class="menu__item" href="index.html#services" style="grid-column:1/-1;background:var(--paper);margin-top:4px">
                <span class="menu__ico" style="background:var(--ink);color:var(--lime)">${I.arrow}</span>
                <span><span class="menu__t">All services & pricing</span><br><span class="menu__d">Browse the full marketplace</span></span>
              </a>
            </div>
          </div>
          ${navLinks}
        </nav>
        <div class="hdr__spacer"></div>
        <div class="hdr__actions">
          <button class="icon-btn" id="cartBtn" aria-label="Open cart">${I.cart}<span class="cart-count" id="cartCount">0</span></button>
          <div id="authSlot"></div>
          <button class="burger" id="burger" aria-label="Menu"><span></span></button>
        </div>
      </div>`;
    document.body.prepend(hdr);

    // stuck shadow
    const onScroll = () => hdr.classList.toggle('is-stuck', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    document.getElementById('cartBtn').addEventListener('click', openDrawer);
    document.getElementById('burger').addEventListener('click', openMnav);
    buildMnav(menuItems, navLinks);
    renderAuth();
    renderCartCount();
  }

  function renderAuth() {
    const slot = document.getElementById('authSlot');
    if (state.loggedIn) {
      const initials = (state.name || 'You').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      slot.innerHTML = `
        <div class="has-menu">
          <button class="acct"><span class="avatar">${initials}</span><span class="acct__name">${(state.name||'Account').split(' ')[0]}</span>${I.caret}</button>
          <div class="menu" style="min-width:220px;left:auto;right:0">
            <div style="padding:12px 14px 14px;border-bottom:1.5px solid var(--line);margin-bottom:6px">
              <div style="font-weight:700">${state.name||'Your account'}</div>
              <div class="menu__d">${state.email||''}</div>
            </div>
            <a class="menu__item" href="${appUrl('/orders')}" style="display:block;padding:10px 14px"><span class="menu__t">Dashboard</span></a>
            <a class="menu__item" href="${appUrl('/orders')}" style="display:block;padding:10px 14px"><span class="menu__t">My orders</span></a>
            <button class="menu__item" id="logoutBtn" style="display:block;width:100%;text-align:left;padding:10px 14px;color:var(--coral-ink)"><span class="menu__t" style="color:inherit">Log out</span></button>
          </div>
        </div>`;
      document.getElementById('logoutBtn').addEventListener('click', logout);
    } else {
      slot.innerHTML = `
        <button class="nav__link" id="loginLink" style="font-weight:600">Log in</button>
        <button class="btn btn--primary btn--sm" id="signupLink">Sign up</button>`;
      document.getElementById('loginLink').addEventListener('click', () => goToApp('/sign-in'));
      document.getElementById('signupLink').addEventListener('click', () => goToApp('/sign-up'));
    }
    refreshCartButtons();
  }

  /* ---------- mobile nav ---------- */
  function buildMnav(menuItems, navLinks) {
    const m = document.createElement('div');
    m.className = 'mnav'; m.id = 'mnav';
    m.innerHTML = `
      <div class="flex items-center justify-between mb-24">
        <span class="brand"><span class="brand__mark">OI</span>Outreach<span style="color:var(--violet)">Influencers</span></span>
        <button class="icon-btn" id="mnavClose">${I.close}</button>
      </div>
      <div class="tag mb-8" style="margin-top:8px">Services</div>
      ${SERVICES.map(s => `<a class="mnav__link" href="${s.href}">${s.t}</a>`).join('')}
      <div class="tag mb-8" style="margin-top:24px">Company</div>
      ${NAV.map(n => `<a class="mnav__link" href="${n.href}">${n.t}</a>`).join('')}
      <a class="btn btn--coral btn--lg btn--block" href="#" style="margin-top:28px" id="mnavCta">Sign up free ${I.arrow}</a>`;
    document.body.appendChild(m);
    document.getElementById('mnavClose').addEventListener('click', closeMnav);
    document.getElementById('mnavCta').addEventListener('click', (e) => { e.preventDefault(); closeMnav(); state.loggedIn ? openDrawer() : goToApp('/sign-up'); });
  }
  function openMnav() { document.getElementById('mnav').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeMnav() { document.getElementById('mnav').classList.remove('open'); document.body.style.overflow = ''; }

  /* ---------- footer ---------- */
  function buildFooter() {
    const f = document.createElement('footer');
    f.className = 'ftr';
    f.innerHTML = `
      <div class="wrap">
        <div class="ftr__top">
          <div class="ftr__brand">
            <span class="brand"><span class="brand__mark">OI</span>Outreach<span style="color:var(--violet)">Influencers</span></span>
            <p style="max-width:34ch;color:#B8B4C4">The outreach marketplace trusted by 12,000+ agencies and brands to scale rankings, traffic and revenue.</p>
            <div class="ftr__social" style="margin-top:20px">
              <a href="#" aria-label="X">𝕏</a>
              <a href="#" aria-label="LinkedIn">in</a>
              <a href="#" aria-label="YouTube">▶</a>
              <a href="#" aria-label="Instagram">◎</a>
            </div>
          </div>
          <div class="ftr__col"><h5>Services</h5><ul>${SERVICES.map(s => `<li><a href="${s.href}">${s.t}</a></li>`).join('')}</ul></div>
          <div class="ftr__col"><h5>Company</h5><ul>
            <li><a href="about.html">About us</a></li>
            <li><a href="case-studies.html">Case studies</a></li>
            <li><a href="blog.html">Blog</a></li>
            <li><a href="affiliates.html">Affiliates</a></li>
          </ul></div>
          <div class="ftr__col"><h5>Programs</h5><ul>
            <li><a href="become-affiliate.html">Become an affiliate</a></li>
            <li><a href="seo-reseller.html">Agency / white-label</a></li>
            <li><a href="#">Partner directory</a></li>
            <li><a href="#">Help center</a></li>
          </ul></div>
          <div class="ftr__col"><h5>Get started</h5><ul>
            <li><a href="#" id="ftrSignup">Create free account</a></li>
            <li><a href="#" id="ftrCart">View cart</a></li>
            <li><a href="#">Book a strategy call</a></li>
            <li><a href="#">Pricing</a></li>
          </ul></div>
        </div>
        <div class="ftr__bottom">
          <span>© ${new Date().getFullYear()} Outreach Influencers Ltd. All rights reserved.</span>
          <span style="display:flex;gap:18px;flex-wrap:wrap"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Refund policy</a><a href="#">Status</a></span>
        </div>
      </div>`;
    document.body.appendChild(f);
    document.getElementById('ftrSignup').addEventListener('click', (e) => { e.preventDefault(); state.loggedIn ? openDrawer() : goToApp('/sign-up'); });
    document.getElementById('ftrCart').addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
  }

  /* ---------- modals (auth) ---------- */
  let pendingAdd = null;
  function buildOverlays() {
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="scrim" id="scrim"></div>
      <div class="modal" id="authModal">
        <div class="modal__box">
          <button class="modal__close" id="authClose">${I.close}</button>
          <div id="authInner"></div>
        </div>
      </div>
      <aside class="drawer" id="drawer" aria-label="Cart">
        <div class="drawer__head">
          <strong style="font-family:var(--display);font-size:1.3rem">Your cart</strong>
          <button class="icon-btn" id="drawerClose" style="width:38px;height:38px">${I.close}</button>
        </div>
        <div class="drawer__body" id="cartBody"></div>
        <div class="drawer__foot" id="cartFoot"></div>
      </aside>
      <div class="toast-wrap" id="toastWrap"></div>`;
    document.body.appendChild(el);
    document.getElementById('scrim').addEventListener('click', closeAll);
    document.getElementById('authClose').addEventListener('click', closeAll);
    document.getElementById('drawerClose').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  }

  function openAuth(mode) {
    goToApp(mode === 'login' ? '/sign-in' : '/sign-up');
  }

  function logout() { state.loggedIn = false; state.name = ''; state.email = ''; save(); renderAuth(); toast('Logged out'); }

  /* ---------- cart ---------- */
  function addToCart(p, silent) {
    const existing = state.cart.find(i => i.id === p.id);
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else state.cart.push(Object.assign({ qty: 1 }, p));
    save(); renderCartCount(); renderDrawer();
    if (!silent) toast(`Added “${p.name}” to cart`);
    openDrawer();
  }
  function removeFromCart(id) { state.cart = state.cart.filter(i => i.id !== id); save(); renderCartCount(); renderDrawer(); }
  function setQty(id, d) { const it = state.cart.find(i => i.id === id); if (!it) return; it.qty = Math.max(1, (it.qty||1) + d); save(); renderCartCount(); renderDrawer(); }

  function renderCartCount() {
    const c = document.getElementById('cartCount'); if (!c) return;
    const n = cartCount(); c.textContent = n; c.classList.toggle('show', n > 0);
  }

  function renderDrawer() {
    const body = document.getElementById('cartBody');
    const foot = document.getElementById('cartFoot');
    if (!body) return;
    if (!state.cart.length) {
      body.innerHTML = `<div class="cart-empty">${I.cart}<p style="margin-top:14px">Your cart is empty.</p><p style="font-size:.9rem">Browse the marketplace to add services.</p></div>`;
      foot.innerHTML = `<a class="btn btn--ghost btn--block" href="index.html#services">Browse services</a>`;
      return;
    }
    body.innerHTML = state.cart.map(i => `
      <div class="cart-line">
        <span class="cart-line__thumb">${I.link}</span>
        <div style="flex:1">
          <div style="font-weight:700;line-height:1.25">${i.name}</div>
          <div class="menu__d">${i.meta || ''}</div>
          <div class="flex items-center justify-between" style="margin-top:8px">
            <div class="flex items-center gap-8">
              <button class="icon-btn" style="width:28px;height:28px" data-q="-" data-id="${i.id}">−</button>
              <span style="font-weight:700;min-width:18px;text-align:center">${i.qty||1}</span>
              <button class="icon-btn" style="width:28px;height:28px" data-q="+" data-id="${i.id}">+</button>
            </div>
            <strong>${money(i.price * (i.qty||1))}</strong>
          </div>
          <button class="cart-line__rm" data-rm="${i.id}" style="margin-top:6px">Remove</button>
        </div>
      </div>`).join('');
    foot.innerHTML = `
      <div class="flex items-center justify-between mb-16">
        <span class="muted">Subtotal</span><strong style="font-size:1.35rem;font-family:var(--display)">${money(cartTotal())}</strong>
      </div>
      <button class="btn btn--coral btn--block btn--lg" id="checkoutBtn">Checkout ${I.arrow}</button>
      <p class="center muted" style="font-size:.8rem;margin-top:10px">Secure checkout · Managed by your dedicated account team</p>`;
    body.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.rm)));
    body.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => setQty(b.dataset.id, b.dataset.q === '+' ? 1 : -1)));
    document.getElementById('checkoutBtn').addEventListener('click', () => toast('Checkout is a demo in this prototype 🎉'));
  }

  function openDrawer() { renderDrawer(); document.getElementById('scrim').classList.add('open'); document.getElementById('drawer').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { document.getElementById('drawer').classList.remove('open'); document.getElementById('scrim').classList.remove('open'); document.body.style.overflow = ''; }
  function closeAll() {
    document.getElementById('scrim').classList.remove('open');
    document.getElementById('authModal').classList.remove('open');
    document.getElementById('drawer').classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---------- cart buttons on pages ---------- */
  function refreshCartButtons() {
    document.querySelectorAll('[data-add]').forEach(btn => {
      const label = btn.querySelector('.cart-btn-label');
      if (label) label.textContent = state.loggedIn ? (btn.dataset.label || 'Add to Cart') : 'Sign Up to Order';
    });
  }
  function wireCartButtons() {
    document.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const p = { id: btn.dataset.id || btn.dataset.name, name: btn.dataset.name, price: parseInt(btn.dataset.price, 10) || 0, meta: btn.dataset.meta || '' };
        if (state.loggedIn) addToCart(p);
        else { pendingAdd = p; openAuth('signup'); }
      });
    });
    refreshCartButtons();
  }

  /* ---------- toast ---------- */
  function toast(msg) {
    const wrap = document.getElementById('toastWrap');
    const t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = `${I.check}<span>${msg}</span>`;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 2600);
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((e, i) => { e.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms'; io.observe(e); });
    // Safety: if IO never fires (off-screen iframe, print, PDF capture), reveal everything.
    setTimeout(() => els.forEach(e => e.classList.add('in')), 1400);
  }

  /* ---------- expose a couple helpers for pages ---------- */
  window.OI = { toast, openAuth, openDrawer, get state() { return state; } };

  /* ---------- boot ---------- */
  function boot() {
    buildHeader();
    buildFooter();
    buildOverlays();
    wireCartButtons();
    initReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
