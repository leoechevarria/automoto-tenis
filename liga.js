/* Automoto Tenis · datos de la liga compartidos: planilla, tablas y rating Glicko-2.
   Lo usan rankings.html y rating.html. */
  // ---- Configuración ----
  const SHEET_ID = '1rWi1oJ9PKRLErlIGEzqEZ2JakEDyuk1poDqFdj88R9w';
  const API_KEY = 'AIzaSyCZWAlXFGaAtjNYYWB3ajsjQ0W72CNJnCI';
  const REFRESH_MS = 5 * 60 * 1000; // refrescar cada 5 minutos
  const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

  // Tablas: rama + categoría. 'a', 'b' y 'c' siguen funcionando como links viejos.
  const CATEGORIES = {
    ca: { rama: 'Caballeros', cat: 'A', oldTab: 'Ranking_A' },
    cb: { rama: 'Caballeros', cat: 'B', oldTab: 'Ranking_B' },
    cc: { rama: 'Caballeros', cat: 'C', oldTab: 'Ranking_C' },
    da: { rama: 'Damas', cat: 'A' },
    db: { rama: 'Damas', cat: 'B' },
  };
  const ALIAS = { a: 'ca', b: 'cb', c: 'cc' };
  // Reglas de ascenso/descenso si la planilla no tiene la pestaña Categorías (REGLAS - LIGA 2026).
  const DEFAULT_RULES = {
    ca: { up: 0, down: 3, promoUp: 0, promoDown: 2 },
    cb: { up: 3, down: 3, promoUp: 2, promoDown: 2 },
    cc: { up: 3, down: 0, promoUp: 2, promoDown: 0 },
    da: { up: 0, down: 0, promoUp: 0, promoDown: 0 },
    db: { up: 0, down: 0, promoUp: 0, promoDown: 0 },
  };
  const DEFAULT_CATEGORY = 'ca';
  // ------------------------

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  const n = v => parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10) || 0;

  /* ---- Datos: formato nuevo (una sola planilla por temporadas) o planilla anterior ---- */
  async function loadModel() {
    const ranges = ['Temporadas!A2:G', 'Inscripciones!A2:M', 'Categorías!A2:F', 'Partidos!A2:P', 'Jugadores!A2:C'].map(r => 'ranges=' + encodeURIComponent(r)).join('&');
    const res = await fetch(`${SHEETS}/values:batchGet?${ranges}&key=${API_KEY}`);
    if (!res.ok) return null; // las pestañas no existen: planilla anterior
    const [temps, ins, cats, partidos, jugadores] = (await res.json()).valueRanges.map(v => v.values || []);
    // Temporada a mostrar: la Activa; si no hay, la última Cerrada con inscriptos.
    const estado = r => (r[3] || '').trim().toLowerCase();
    const conInscriptos = t => ins.some(r => r[0] === t);
    const filaActiva = temps.find(r => estado(r) === 'activa')
      || [...temps].reverse().find(r => estado(r) === 'cerrada' && conInscriptos(r[0]))
      || temps[temps.length - 1] || [];
    const activa = filaActiva[0];
    const pts = { g: n(filaActiva[4]) || 100, p: n(filaActiva[5]) || 40, np: filaActiva[6] !== undefined && filaActiva[6] !== '' ? n(filaActiva[6]) : -20 };
    const keyOf = (rama, cat) => Object.keys(CATEGORIES).find(k => CATEGORIES[k].rama === rama && CATEGORIES[k].cat === cat);
    const rows = ins.filter(r => r[0] === activa && r[3]).map(r => ({ key: keyOf(r[1], r[2]), jugador: r[3], pj: n(r[4]), pg: n(r[5]), pp: n(r[6]), np: n(r[7]), pts: n(r[8]), puesto: n(r[12]) || null })).filter(r => r.key);
    const rules = {};
    cats.forEach(r => { const k = keyOf(r[0], r[1]); if (k && r.slice(2).some(v => v !== '' && v != null)) rules[k] = { up: n(r[2]), down: n(r[3]), promoUp: n(r[4]), promoDown: n(r[5]) }; });
    return { temporada: activa, enJuego: estado(filaActiva) === 'activa', pts, rows, rules, partidos, jugadores, ins };
  }

  // Orden: el puesto final oficial si la temporada lo tiene; si no, puntos, ganados, menos no presentados.
  function sortRows(list) {
    const conPuesto = list.length && list.every(r => r.puesto);
    return list.slice().sort((a, b) => conPuesto ? a.puesto - b.puesto
      : b.pts - a.pts || b.pg - a.pg || a.np - b.np || a.jugador.localeCompare(b.jugador));
  }
  // Ganador de una fila de Partidos: columna P (calculada); compatible con Ganó = nombre.
  const ganadorDe = r => r[15] || (/^jugador [12]$/i.test(r[11] || '') ? (r[11].endsWith('1') ? r[8] : r[9]) : r[11]) || '';

  /* ==========================================================
     RATING GLICKO-2
     Se calcula en el navegador con la pestaña Partidos: solo partidos oficiales
     (liga, promoción, copa, master), sin walkovers, anulados ni pendientes.
     Períodos de un mes. Rating inicial según la categoría del jugador.
     ========================================================== */
  // Solo partidos oficiales: liga, promociones y copas (el Master de fin de año cuenta como copa).
  const OFICIALES = ['Liga', 'Promoción', 'Copa', 'Master'];
  const G2 = { scale: 173.7178, tau: 0.5, sigma: 0.06, rd: 200, seed: { A: 1700, B: 1500, C: 1300 } };
  const parseFecha = s => { const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
  const g2g = phi => 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
  const g2E = (mu, muj, phij) => 1 / (1 + Math.exp(-g2g(phij) * (mu - muj)));

  function g2update(p, games) {
    let vinv = 0, sum = 0;
    for (const o of games) { const E = g2E(p.mu, o.mu, o.phi), g = g2g(o.phi); vinv += g * g * E * (1 - E); sum += g * (o.s - E); }
    const v = 1 / vinv, delta = v * sum, a = Math.log(p.sigma * p.sigma), t2 = G2.tau * G2.tau, phi2 = p.phi * p.phi;
    const f = x => { const ex = Math.exp(x); return ex * (delta * delta - phi2 - v - ex) / (2 * (phi2 + v + ex) ** 2) - (x - a) / t2; };
    let A = a, B;
    if (delta * delta > phi2 + v) B = Math.log(delta * delta - phi2 - v);
    else { let k = 1; while (f(a - k * G2.tau) < 0) k++; B = a - k * G2.tau; }
    let fA = f(A), fB = f(B);
    for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
      const C = A + (A - B) * fA / (fB - fA), fC = f(C);
      if (fC * fB <= 0) { A = B; fA = fB; } else fA /= 2;
      B = C; fB = fC;
    }
    const sigma = Math.exp(A / 2), phiStar = Math.sqrt(phi2 + sigma * sigma);
    const phi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
    return { mu: p.mu + phi * phi * sum, phi, sigma };
  }

  function computeRating(rama, extra = []) {
    const m = model;
    // categoría de cada jugador: la última inscripción, o la categoría actual en Jugadores
    const catOf = new Map();
    (m.jugadores || []).forEach(r => { if (r[0]) catOf.set(r[0], r[2]); });
    (m.ins || []).forEach(r => { if (r[3] && r[1] === rama) catOf.set(r[3], r[2]); });
    const matches = (m.partidos || []).map(r => ({
      rama: r[1], cat: r[2], tipo: (r[3] || 'Liga').trim(), a: r[8], b: r[9], ganador: ganadorDe(r), wo: (r[12] || '').toLowerCase().startsWith('s'), anulado: (r[13] || '').toLowerCase().startsWith('s'),
      fecha: parseFecha(r[7]) || parseFecha(r[6]) || parseFecha(r[5]),
    })).filter(x => OFICIALES.includes(x.tipo)).concat(extra).filter(x => x.rama === rama && x.a && x.b && x.ganador && !x.wo && !x.anulado && x.fecha && (x.ganador === x.a || x.ganador === x.b))
      .sort((x, y) => x.fecha - y.fecha);
    const P = new Map();
    const get = (name, cat) => {
      if (!P.has(name)) P.set(name, { name, cat: catOf.get(name) || cat, mu: ((G2.seed[catOf.get(name) || cat] || 1500) - 1500) / G2.scale, phi: G2.rd / G2.scale, sigma: G2.sigma, n: 0, w: 0, hist: [] });
      return P.get(name);
    };
    if (!matches.length) return [];
    const key = d => d.getFullYear() * 12 + d.getMonth();
    const now = new Date(), first = key(matches[0].fecha), last = key(now);
    let i = 0;
    for (let period = first; period <= last; period++) {
      const games = new Map();
      for (; i < matches.length && key(matches[i].fecha) === period; i++) {
        const x = matches[i], A = get(x.a, x.cat), B = get(x.b, x.cat), sa = x.ganador === x.a ? 1 : 0;
        if (!games.has(A.name)) games.set(A.name, []);
        if (!games.has(B.name)) games.set(B.name, []);
        games.get(A.name).push({ mu: B.mu, phi: B.phi, s: sa });   // valores del rival antes del período
        games.get(B.name).push({ mu: A.mu, phi: A.phi, s: 1 - sa });
        A.n++; B.n++; A.w += sa; B.w += 1 - sa;
      }
      const updates = [];
      for (const p of P.values()) updates.push([p, games.has(p.name) ? g2update(p, games.get(p.name)) : null]);
      for (const [p, u] of updates) {
        if (u) Object.assign(p, u);
        else p.phi = Math.min(Math.sqrt(p.phi * p.phi + p.sigma * p.sigma), 350 / G2.scale); // sin partidos: crece la incertidumbre
      }
    }
    return [...P.values()].map(p => ({ ...p, rating: Math.round(1500 + G2.scale * p.mu), rd: Math.round(G2.scale * p.phi) }))
      .sort((a, b) => b.rating - a.rating);
  }


  // Selectores en dos niveles: rama (Caballeros | Damas) y categoría (A | B | C). Cambian el hash de la página.
  function ligaNav(el, currentKey, keys) {
    const ramas = [...new Set(keys.map(k => CATEGORIES[k].rama))];
    const cur = CATEGORIES[currentKey];
    el.innerHTML = `
      <div class="seg" role="group" aria-label="Rama">${ramas.map(r => `<button type="button" data-rama="${r}" aria-pressed="${r === cur.rama}">${r}</button>`).join('')}</div>
      <div class="cats" role="group" aria-label="Categoría">${keys.filter(k => CATEGORIES[k].rama === cur.rama)
        .map(k => `<button type="button" data-cat="${k}" class="${k === currentKey ? 'active' : ''}">Categoría ${CATEGORIES[k].cat}</button>`).join('')}</div>`;
    el.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.cat; }));
    el.querySelectorAll('[data-rama]').forEach(b => b.addEventListener('click', () => {
      const same = keys.find(k => CATEGORIES[k].rama === b.dataset.rama && CATEGORIES[k].cat === cur.cat);
      location.hash = same || keys.find(k => CATEGORIES[k].rama === b.dataset.rama);
    }));
  }
  const keyFromHash = () => { const h = location.hash.slice(1); return CATEGORIES[ALIAS[h] || h] ? (ALIAS[h] || h) : DEFAULT_CATEGORY; };
