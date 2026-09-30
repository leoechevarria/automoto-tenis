/* Automoto Tenis · anuncios y eventos. Fuente única: data/novedades.json
   Las listas muestran un resumen; el contenido completo se abre en un popup. */
window.Novedades = (() => {
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day = iso => new Date(iso + 'T12:00:00');
  const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const paras = t => String(t || '').split(/\n\s*\n/).map(p => `<p>${esc(p.trim())}</p>`).join('');
  const index = new Map();

  async function load() {
    const res = await fetch('data/novedades.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const t = hoy();
    const anuncios = (data.anuncios || []).filter(a => !a.vence || day(a.vence) >= t)
      .sort((a, b) => (b.fijado === true) - (a.fijado === true) || (b.publicado || '').localeCompare(a.publicado || ''));
    const eventos = (data.eventos || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
    const fin = e => day(e.hasta || e.fecha);
    anuncios.forEach(a => index.set(a.id, { tipo: 'anuncio', item: a }));
    eventos.forEach(e => index.set(e.id, { tipo: 'evento', item: e, pasado: fin(e) < t }));
    return { anuncios, proximos: eventos.filter(e => fin(e) >= t), pasados: eventos.filter(e => fin(e) < t).reverse() };
  }

  function cuando(e) {
    const d = day(e.fecha);
    let s = DIA[d.getDay()];
    if (e.hasta) { const h = day(e.hasta); s = `del ${d.getDate()} al ${h.getDate()} de ${MES[h.getMonth()]}`; }
    return [s, e.hora, e.lugar].filter(Boolean).join(' · ');
  }
  const etiqueta = a => `${a.fijado ? 'Fijado · ' : ''}${esc(a.etiqueta || 'Aviso')}${a.publicado ? ' · ' + day(a.publicado).getDate() + ' ' + MES[day(a.publicado).getMonth()] : ''}`;
  const primero = t => String(t || '').split(/\n\s*\n/)[0];

  function anuncio(a) {
    return `<a class="post nov-link${a.fijado ? ' pinned' : ''}" href="#${esc(a.id)}" data-nid="${esc(a.id)}">
      <span class="k">${etiqueta(a)}</span>
      <h3>${esc(a.titulo)}</h3>
      <p class="txt">${esc(primero(a.texto))}</p>
    </a>`;
  }

  function evento(e, extra) {
    if (typeof extra !== 'string') extra = ''; // map() pasa el índice como segundo parámetro
    const d = day(e.fecha);
    return `<a class="ev nov-link${extra}" href="#${esc(e.id)}" data-nid="${esc(e.id)}">
      <div class="d"><b>${d.getDate()}</b><small>${MES[d.getMonth()]}</small></div>
      <div><h3>${esc(e.titulo)}</h3><p class="when">${esc(cuando(e))}</p>${e.texto ? `<p class="txt">${esc(primero(e.texto))}</p>` : ''}</div>
    </a>`;
  }

  /* ---- Popup con el contenido completo ---- */
  let dlg;
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'nov-dlg';
    dlg.setAttribute('aria-labelledby', 'novDlgTitle');
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.addEventListener('close', () => {
      document.documentElement.classList.remove('dlg-open');
      if (location.hash && index.has(decodeURIComponent(location.hash.slice(1)))) history.replaceState(null, '', location.pathname + location.search);
    });
    return dlg;
  }
  function close() { if (dlg?.open) dlg.close(); }

  function open(id) {
    const hit = index.get(id); if (!hit) return false;
    const x = hit.item, d = ensureDialog();
    let head;
    if (hit.tipo === 'evento') {
      const f = day(x.fecha);
      head = `<div class="dlg-date"><b>${f.getDate()}</b><span>${MES_L[f.getMonth()]}<br>${DIA[f.getDay()]}</span></div>
        <span class="k">${hit.pasado ? 'Evento pasado' : 'Evento'}</span>
        <h2 id="novDlgTitle">${esc(x.titulo)}</h2>
        <p class="when">${esc([x.hasta ? `del ${f.getDate()} al ${day(x.hasta).getDate()} de ${MES_L[day(x.hasta).getMonth()]}` : null, x.hora, x.lugar].filter(Boolean).join(' · '))}</p>`;
    } else {
      head = `<span class="k${x.fijado ? ' pinned' : ''}">${etiqueta(x)}</span><h2 id="novDlgTitle">${esc(x.titulo)}</h2>`;
    }
    d.innerHTML = `<div class="dlg-in">
      <button type="button" class="dlg-close" aria-label="Cerrar">✕</button>
      ${x.foto ? `<img class="dlg-img" src="${esc(x.foto)}" alt="">` : ''}
      ${head}
      <div class="dlg-body">${paras(x.texto)}</div>
      ${x.ejemplo ? '<p class="note">Contenido de ejemplo</p>' : ''}
    </div>`;
    d.querySelector('.dlg-close').addEventListener('click', close);
    if (!d.open) { d.showModal(); document.documentElement.classList.add('dlg-open'); }
    d.querySelector('.dlg-in').scrollTop = 0;
    history.replaceState(null, '', '#' + encodeURIComponent(id));
    return true;
  }

  // Captura: se adelanta al desplazamiento a sección de site.js.
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-nid]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (index.has(a.dataset.nid)) { e.preventDefault(); e.stopPropagation(); open(a.dataset.nid); }
  }, true);

  // Link directo: novedades.html#asado-oct abre el popup.
  const openFromHash = () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && index.has(id)) open(id); };

  const hayEjemplos = list => list.some(x => x.ejemplo);
  return { load, anuncio, evento, cuando, open, openFromHash, hayEjemplos, esc, day, MES, DIA };
})();
