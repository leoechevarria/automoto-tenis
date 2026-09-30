/* Automoto Tenis · anuncios y eventos. Fuente única: data/novedades.json */
window.Novedades = (() => {
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day = iso => new Date(iso + 'T12:00:00');
  const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  async function load() {
    const res = await fetch('data/novedades.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const t = hoy();
    const anuncios = (data.anuncios || []).filter(a => !a.vence || day(a.vence) >= t)
      .sort((a, b) => (b.fijado === true) - (a.fijado === true) || (b.publicado || '').localeCompare(a.publicado || ''));
    const eventos = (data.eventos || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
    const fin = e => day(e.hasta || e.fecha);
    return {
      anuncios,
      proximos: eventos.filter(e => fin(e) >= t),
      pasados: eventos.filter(e => fin(e) < t).reverse(),
    };
  }

  function cuando(e) {
    const d = day(e.fecha);
    let s = DIA[d.getDay()];
    if (e.hasta) { const h = day(e.hasta); s = `del ${d.getDate()} al ${h.getDate()} de ${MES[h.getMonth()]}`; }
    return [s, e.hora, e.lugar].filter(Boolean).join(' · ');
  }

  function anuncio(a) {
    return `<article class="post${a.fijado ? ' pinned' : ''}" id="${esc(a.id)}">
      <span class="k">${a.fijado ? 'Fijado · ' : ''}${esc(a.etiqueta || 'Aviso')}${a.publicado ? ' · ' + day(a.publicado).getDate() + ' ' + MES[day(a.publicado).getMonth()] : ''}</span>
      <h3>${esc(a.titulo)}</h3>
      <p>${esc(a.texto)}</p>
    </article>`;
  }

  function evento(e) {
    const d = day(e.fecha);
    return `<article class="ev" id="${esc(e.id)}">
      <div class="d"><b>${d.getDate()}</b><small>${MES[d.getMonth()]}</small></div>
      <div><h3>${esc(e.titulo)}</h3><p class="when">${esc(cuando(e))}</p>${e.texto ? `<p>${esc(e.texto)}</p>` : ''}</div>
    </article>`;
  }

  const hayEjemplos = list => list.some(x => x.ejemplo);
  return { load, anuncio, evento, cuando, hayEjemplos, esc, day, MES, DIA };
})();
