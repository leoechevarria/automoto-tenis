/* Automoto Tenis · noticias ("anuncios" en el JSON) y eventos. Fuente única: data/novedades.json
   Las listas muestran un resumen; cada una tiene su página en /n/<id> (la genera tools/noticias.py). */
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
    // La novedad más reciente por fecha, sin importar si hay una fijada (la usa la home)
    const ultimo = anuncios.slice().sort((a, b) => (b.publicado || '').localeCompare(a.publicado || ''))[0];
    return { anuncios, ultimo, proximos: eventos.filter(e => fin(e) >= t), pasados: eventos.filter(e => fin(e) < t).reverse() };
  }

  function cuando(e) {
    const d = day(e.fecha);
    let s = DIA[d.getDay()];
    if (e.hasta) { const h = day(e.hasta); s = `del ${d.getDate()} al ${h.getDate()} de ${MES[h.getMonth()]}`; }
    return [s, e.hora, e.lugar].filter(Boolean).join(' · ');
  }
  const etiqueta = a => `${a.fijado ? 'Fijado · ' : ''}${esc(a.etiqueta || 'Noticia')}${a.publicado ? ' · ' + day(a.publicado).getDate() + ' ' + MES[day(a.publicado).getMonth()] : ''}`;
  const primero = t => String(t || '').split(/\n\s*\n/)[0];

  function anuncio(a) {
    return `<a class="post nov-link${a.fijado ? ' pinned' : ''}" href="n/${esc(a.id)}">
      <span class="k">${etiqueta(a)}</span>
      <h3>${esc(a.titulo)}</h3>
      <p class="txt">${esc(primero(a.texto))}</p>
    </a>`;
  }

  function evento(e, extra) {
    if (typeof extra !== 'string') extra = ''; // map() pasa el índice como segundo parámetro
    const d = day(e.fecha);
    return `<a class="ev nov-link${extra}" href="n/${esc(e.id)}">
      <div class="d"><b>${d.getDate()}</b><small>${MES[d.getMonth()]}</small></div>
      <div><h3>${esc(e.titulo)}</h3><p class="when">${esc(cuando(e))}</p>${e.texto ? `<p class="txt">${esc(primero(e.texto))}</p>` : ''}</div>
    </a>`;
  }

  // Links viejos (novedades.html#id) pasan a la página propia.
  const openFromHash = () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && index.has(id)) location.replace('/n/' + id); };

  return { load, anuncio, evento, cuando, openFromHash, esc, day, MES, DIA };
})();
