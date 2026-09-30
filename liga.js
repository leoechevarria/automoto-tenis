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
    const ranges = ['Temporadas!A2:G', 'Inscripciones!A2:M', 'Categorías!A2:F', 'Partidos!A2:P', 'Jugadores!A2:D'].map(r => 'ranges=' + encodeURIComponent(r)).join('&');
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
    if (DEMO) partidos.push(...partidosDemo(jugadores, activa));
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
     RATING ELO UNIFICADO (uno por rama)
     - Todos los jugadores de la rama en un mismo pozo, sin importar la categoría.
     - Rating inicial solo para quien juega por primera vez, según la categoría de ese primer partido.
     - Quien sube o baja de categoría conserva su rating: nunca se reinicia.
     - Cuentan solo partidos oficiales: liga, promociones, copas y master. No cuentan
       walkovers, anulados ni pendientes.
     - E = 1 / (1 + 10^((R2 − R1) / 400)); R' = R + K · (S − E).
     - K = 64 en los primeros 5 partidos de cada jugador; K = 32 desde el 6.º.
     ========================================================== */
  const OFICIALES = ['Liga', 'Promoción', 'Copa', 'Master'];
  const ELO = {
    base: { Caballeros: { A: 1350, B: 1200, C: 1050 }, Damas: { A: 1275, B: 1125 } },
    k: 32, kNuevo: 64, partidosNuevo: 5, provisorio: 5,
  };
  const eloBase = (rama, cat) => (ELO.base[rama] || {})[cat] || 1200;
  // Lunes de esta semana a las 0 h: la foto contra la que se miden los cambios (como el ranking ATP).
  const lunesDeEstaSemana = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const parseFecha = s => { const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };

  // todos = true: incluye a los jugadores activos sin partidos, con el rating inicial de su categoría.
  // hasta: si se pasa una fecha, calcula el ranking como estaba en ese momento (solo partidos anteriores).
  function computeRating(rama, extra = [], todos = false, hasta = null) {
    const m = model;
    // categoría actual (para mostrar): la de Jugadores; si no está ahí, la última inscripción
    const catActual = new Map();
    (m.ins || []).forEach(r => { if (r[3] && r[1] === rama) catActual.set(r[3], r[2]); });
    (m.jugadores || []).forEach(r => { if (r[0] && r[1] === rama && r[2]) catActual.set(r[0], r[2]); });
    const matches = (m.partidos || []).map((r, i) => ({
      orden: i, rama: r[1], cat: r[2], tipo: (r[3] || 'Liga').trim(), a: r[8], b: r[9], ganador: ganadorDe(r),
      wo: (r[12] || '').toLowerCase().startsWith('s'), anulado: (r[13] || '').toLowerCase().startsWith('s'),
      fecha: parseFecha(r[7]) || parseFecha(r[6]) || parseFecha(r[5]),
    })).filter(x => OFICIALES.includes(x.tipo)).concat(extra.map(x => ({ orden: 1e9, ...x })))
      .filter(x => x.rama === rama && x.a && x.b && x.ganador && !x.wo && !x.anulado && x.fecha && (x.ganador === x.a || x.ganador === x.b) && (!hasta || x.fecha < hasta))
      .sort((x, y) => x.fecha - y.fecha || x.orden - y.orden);
    // Rating inicial: categoría del primer partido registrado; si todavía no jugó, su categoría actual.
    const primeraCat = new Map();
    for (const x of matches) { if (!primeraCat.has(x.a)) primeraCat.set(x.a, x.cat); if (!primeraCat.has(x.b)) primeraCat.set(x.b, x.cat); }
    const P = new Map();
    const get = name => {
      if (!P.has(name)) {
        const base = eloBase(rama, primeraCat.get(name) || catActual.get(name));
        P.set(name, { name, cat: catActual.get(name) || primeraCat.get(name), rating: base, inicial: base, n: 0, w: 0, hist: [] });
      }
      return P.get(name);
    };
    if (todos) {
      const activos = new Set((m.jugadores || []).filter(r => r[0] && r[1] === rama && !/^no$/i.test((r[3] || '').trim())).map(r => r[0]));
      (m.ins || []).forEach(r => { if (r[3] && r[1] === rama && r[0] === m.temporada) activos.add(r[3]); });
      for (const name of activos) if (catActual.get(name) || primeraCat.get(name)) get(name);
    }
    matches.forEach(x => { get(x.a); get(x.b); });
    const orden = { A: 0, B: 1, C: 2 };
    // Puestos con empates: mismo rating (redondeado), mismo puesto.
    const puestos = () => {
      const l = [...P.values()].map(p => ({ name: p.name, cat: p.cat, r: Math.round(p.rating) }))
        .sort((a, b) => b.r - a.r || (orden[a.cat] ?? 9) - (orden[b.cat] ?? 9) || a.name.localeCompare(b.name));
      const pos = new Map();
      l.forEach((p, i) => pos.set(p.name, i && l[i - 1].r === p.r ? pos.get(l[i - 1].name) : i + 1));
      return pos;
    };
    for (const x of matches) {
      const A = get(x.a), B = get(x.b);
      const eA = 1 / (1 + Math.pow(10, (B.rating - A.rating) / 400)), eB = 1 - eA;
      const sA = x.ganador === x.a ? 1 : 0, sB = 1 - sA;
      const kA = A.n < ELO.partidosNuevo ? ELO.kNuevo : ELO.k, kB = B.n < ELO.partidosNuevo ? ELO.kNuevo : ELO.k;
      A.rating += kA * (sA - eA); B.rating += kB * (sB - eB);
      A.n++; B.n++; A.w += sA; B.w += sB;
      A.hist.push({ fecha: x.fecha, rival: B.name, gano: !!sA }); B.hist.push({ fecha: x.fecha, rival: A.name, gano: !!sB });
    }
    const ahora = puestos();
    const list = [...P.values()].map(p => ({ ...p, rating: Math.round(p.rating), pos: ahora.get(p.name) }))
      .sort((a, b) => a.pos - b.pos || (orden[a.cat] ?? 9) - (orden[b.cat] ?? 9) || a.name.localeCompare(b.name));
    return list;
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

  /* ==========================================================
     MODO DEMO: ?demo en la dirección (?demo=2, ?demo=3… cambian el sorteo).
     Suma partidos inventados a los reales, solo en este navegador. La planilla no se toca.
     Cada jugador tiene una fuerza oculta según su categoría; el más fuerte gana más seguido.
     ========================================================== */
  const DEMO = new URLSearchParams(location.search).has('demo');
  function partidosDemo(jugadores, temporada) {
    let seed = parseInt(new URLSearchParams(location.search).get('demo'), 10) || 1;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const fuerza = new Map();
    const set = win => { const l = Math.floor(rnd() * 5); return win ? `6-${l}` : `${l}-6`; };
    const out = [];
    const lunes = lunesDeEstaSemana();
    const partido = (fecha, rama, cat, tipo, a, b, ronda = '', desde = null, hasta = null) => {
      const pa = 1 / (1 + Math.pow(10, (fuerza.get(b) - fuerza.get(a)) / 400));
      const ganaA = rnd() < pa;
      const tres = rnd() < 0.25;
      const sets = tres ? [set(ganaA), set(!ganaA), `10-${Math.floor(rnd() * 9)}`.replace(/^10-(\d)$/, ganaA ? '10-$1' : '$1-10')] : [set(ganaA), set(ganaA)];
      out.push([temporada, rama, cat, tipo, ronda, desde ? fmt(desde) : '', hasta ? fmt(hasta) : '', fmt(fecha), a, b, sets.join(','), ganaA ? 'Jugador 1' : 'Jugador 2', 'No', '', 'DEMO', ganaA ? a : b]);
    };
    for (const rama of ['Caballeros', 'Damas']) {
      const porCat = {};
      jugadores.filter(r => r[0] && r[1] === rama && r[2]).forEach(r => {
        (porCat[r[2]] = porCat[r[2]] || []).push(r[0]);
        fuerza.set(r[0], eloBase(rama, r[2]) + (rnd() - 0.5) * 220);
      });
      // 6 semanas de liga: cada semana, parejas al azar dentro de cada categoría; la última es esta semana
      for (let w = 5; w >= 0; w--) {
        for (const [cat, js] of Object.entries(porCat)) {
          const pool = js.slice().sort(() => rnd() - 0.5);
          for (let i = 0; i + 1 < pool.length; i += 2) {
            const d = new Date(lunes); d.setDate(d.getDate() - 7 * w + Math.floor(rnd() * (w ? 7 : Math.max(1, (new Date().getDay() + 6) % 7 + 1))));
            if (d > new Date()) d.setTime(Date.now());
            const ini = new Date(lunes); ini.setDate(ini.getDate() - 7 * w); const fin = new Date(ini); fin.setDate(fin.getDate() + 6);
            partido(d, rama, cat, 'Liga', pool[i], pool[i + 1], String(6 - w), ini, fin);
          }
        }
      }
      // promociones hace tres semanas: los mejores de abajo contra los peores de arriba
      const cats = Object.keys(porCat).sort();
      for (let c = 0; c + 1 < cats.length; c++) {
        const arriba = porCat[cats[c]].slice().sort((x, y) => fuerza.get(x) - fuerza.get(y)).slice(0, 2);
        const abajo = porCat[cats[c + 1]].slice().sort((x, y) => fuerza.get(y) - fuerza.get(x)).slice(0, 2);
        arriba.forEach((a, i) => { const d = new Date(lunes); d.setDate(d.getDate() - 20 + i); if (abajo[i]) partido(d, rama, cats[c], 'Promoción', a, abajo[i]); });
      }
    }
    return out;
  }
  if (DEMO) addEventListener('DOMContentLoaded', () => {
    const url = new URL(location.href); url.searchParams.delete('demo');
    document.body.insertAdjacentHTML('afterbegin', `<div class="demo-bar">Modo demo: partidos inventados, solo en este navegador. <a href="${url.pathname}${url.search}${url.hash}">Salir</a></div>`);
  });
