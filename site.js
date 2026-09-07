/* Automoto Tenis · comportamiento compartido: paleta, navegación y motion */
(() => {
  /* ---- Paleta según el Grand Slam en juego o por jugar ----
     Fechas aproximadas (varían un par de días por año). ?tema=ao|rg|wim|uso|random|auto fuerza una; por defecto Roland Garros. */
  const SLAMS = [
    { key: 'ao',  name: 'Australian Open', start: [1, 12],  end: [2, 1]  },
    { key: 'rg',  name: 'Roland Garros',   start: [5, 24],  end: [6, 7]  },
    { key: 'wim', name: 'Wimbledon',       start: [6, 29],  end: [7, 12] },
    { key: 'uso', name: 'US Open',         start: [8, 24],  end: [9, 13] },
  ];
  function pickSlam(now = new Date()) {
    const y = now.getFullYear();
    const d = (m, dd, yy = y) => new Date(yy, m - 1, dd);
    for (const s of SLAMS) if (now >= d(...s.start) && now <= d(...s.end, y).setHours(23, 59)) return { ...s, why: 'en juego' };
    const next = SLAMS.find(s => now < d(...s.start)) || SLAMS[0];
    const start = now < d(...next.start) ? d(...next.start) : d(...next.start, y + 1);
    const days = Math.ceil((start - now) / 864e5);
    return { ...next, why: `próximo · en ${days} días` };
  }
  function applySlam(key, why) {
    const s = SLAMS.find(x => x.key === key) || SLAMS[1];
    document.documentElement.classList.add('theming');
    document.documentElement.dataset.slam = s.key;
    const n = document.getElementById('slamName'); if (n) n.textContent = s.name;
    const w = document.getElementById('slamWhy'); if (w) w.textContent = why || '';
    const cap = document.getElementById('slamCap'); if (cap) cap.hidden = !why;
    requestAnimationFrame(() => document.documentElement.classList.remove('theming'));
  }
  const param = new URLSearchParams(location.search).get('tema');
  if (param === 'random') { const s = SLAMS[Math.floor(Math.random() * 4)]; applySlam(s.key, 'al azar'); }
  else if (param && SLAMS.some(s => s.key === param)) applySlam(param, 'elegido a mano');
  else if (param === 'auto') { const s = pickSlam(); applySlam(s.key, s.why); }
  else applySlam('rg', ''); // por defecto Roland Garros; ?tema=auto elige por calendario


  /* ---- Desplazamiento a sección: ease-out largo + aterrizaje con barrido del acento ---- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  function scrollToEl(el) {
    const mast = document.querySelector('.mast');
    const target = el.getBoundingClientRect().top + scrollY - (mast ? 12 : 0) - 8;
    if (reduce) { scrollTo(0, target); land(el); return; }
    const start = scrollY, dist = target - start, dur = Math.min(900, 350 + Math.abs(dist) * 0.25);
    let t0;
    const step = ts => {
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      scrollTo(0, start + dist * easeOut(p));
      if (p < 1) requestAnimationFrame(step); else land(el);
    };
    requestAnimationFrame(step);
  }
  function land(el) {
    el.classList.remove('landed'); void el.offsetWidth; el.classList.add('landed');
    el.addEventListener('animationend', () => el.classList.remove('landed'), { once: true });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
    const url = new URL(a.href, location.href);
    const samePage = url.pathname === location.pathname && url.search === location.search;
    if (samePage && url.hash) {
      const el = document.querySelector(url.hash); if (!el) return;
      e.preventDefault(); history.pushState(null, '', url.hash); openFoldFor(url.hash); scrollToEl(el);
      setCurrent(url.hash);
    } else if (url.origin === location.origin && !url.hash && !reduce) {
      /* salida: la página se apaga antes de cambiar */
      e.preventDefault(); document.documentElement.classList.add('leaving');
      setTimeout(() => { location.href = url.href; }, 170);
    }
  });
  addEventListener('pageshow', () => document.documentElement.classList.remove('leaving'));

  /* ---- Desplegable del masthead ---- */
  document.querySelectorAll('.menu').forEach(menu => {
    const btn = menu.querySelector('.menu-btn');
    const set = open => { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', () => set(!menu.classList.contains('open')));
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let t; menu.addEventListener('pointerenter', () => { clearTimeout(t); set(true); });
      menu.addEventListener('pointerleave', () => { t = setTimeout(() => set(false), 180); });
    }
    document.addEventListener('click', e => { if (!menu.contains(e.target)) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  });

  /* ---- Desplegables (details.fold): animación de cierre y apertura por hash ---- */
  document.querySelectorAll('details.fold').forEach(d => {
    const sum = d.querySelector('summary');
    sum.addEventListener('click', e => {
      if (!d.open || reduce) return;             // abrir: el navegador lo hace y la transición corre sola
      e.preventDefault(); d.classList.add('closing');
      const body = d.querySelector('.fold-body');
      body.style.gridTemplateRows = '0fr';
      body.addEventListener('transitionend', () => { d.open = false; d.classList.remove('closing'); body.style.gridTemplateRows = ''; }, { once: true });
    });
  });
  function openFoldFor(hash) {
    const el = hash && document.querySelector(hash); if (!el) return;
    const d = el.closest('details.fold') || (el.matches('details.fold') ? el : null);
    if (d) d.open = true;
  }
  openFoldFor(location.hash);
  if (location.hash) { const el = document.querySelector(location.hash); if (el) setTimeout(() => scrollToEl(el), 80); }

  /* ---- Link activo según la sección visible (solo en la home) ---- */
  const links = [...document.querySelectorAll('.mast-nav a[href^="#"]')];
  function setCurrent(hash) {
    document.querySelectorAll('.mast-nav a').forEach(a => a.removeAttribute('aria-current'));
    const a = document.querySelector(`.mast-nav a[href="${hash}"]`) || document.querySelector('.mast-nav a[data-home]');
    if (a) a.setAttribute('aria-current', 'page');
  }
  if (links.length && 'IntersectionObserver' in window) {
    const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(x => x.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (vis) setCurrent('#' + vis.target.id);
      else if (scrollY < 200) setCurrent('#');
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.2, 0.5] });
    secs.forEach(s => io.observe(s));
  }
})();
