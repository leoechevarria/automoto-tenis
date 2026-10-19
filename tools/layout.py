#!/usr/bin/env python3
"""Aplica el header, el menú lateral y el footer compartidos a todas las páginas.

Uso:  python3 tools/layout.py   (correrlo antes de cada commit que toque CSS o JS)
Edite los bloques de abajo y vuelva a correr el script. Cada página queda
marcada con <!-- layout:header --> y <!-- layout:footer --> para las próximas veces.
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TURNOS = "https://darturnos.com/AutomotoTenis/"

# página -> sección del menú que queda marcada
PAGES = {
    "index.html": None,
    "tabla.html": "liga",
    "reglas.html": "liga",
    "rating.html": "liga",
    "fixture.html": "liga",
    "novedades.html": "novedades",
    "mercado.html": "mercado",
    "info.html": "club",
}

IG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'
SOCIAL = f'''<div class="social">
        <a href="https://www.instagram.com/automototenis/" target="_blank" rel="noopener" aria-label="Instagram de Automoto Tenis">{IG_SVG}</a>
        <a href="https://www.instagram.com/masu.tenis/" target="_blank" rel="noopener" aria-label="Instagram de Masu Tenis" class="masu"><img src="assets/masu-mark.png" alt=""></a>
      </div>'''

# Pestañas de la liga, arriba de tabla, fixture y reglas
LIGA = [("tabla.html", "Tabla"), ("fixture.html", "Fixture"), ("reglas.html", "Reglas")]
LIGA_PAGES = [h for h, _ in LIGA]


def liga_top(page):
    tabs = "".join(f'<a href="{h}"{" aria-current=\"page\"" if h == page else ""}>{t}</a>' for h, t in LIGA)
    return f'''<!-- layout:liga -->
  <a class="liga-cta" id="openRes" href="tabla.html#cargar">¿Jugaste? Cargá tu resultado <span aria-hidden="true">→</span></a>
  <div class="liga-tabs"><nav aria-label="Liga">{tabs}</nav><span class="liga-temp" id="subtitle"></span></div>
  <!-- /layout:liga -->'''
CLUB = [("info.html#pagos", "Cuota y alias de pago"), ("info.html#escuela", "Escuela de tenis"),
        ("info.html#subcomision", "Subcomisión de Tenis"), ("info.html#cancha", "Cuidado de la cancha"),
        ("info.html#contacto", "Otros contactos"), ("info.html#ubicacion", "Cómo llegar")]


def header(page):
    sec = PAGES[page]
    cur = lambda s: ' aria-current="page"' if s == sec else ''
    here = lambda href: ' aria-current="page"' if href == page else ''
    sub = lambda items, cls="": "\n".join(f'          <a{cls} href="{h}"{here(h)}>{t}</a>' for h, t in items)
    dsub = lambda items: "\n".join(f'      <a href="{h}"{here(h)}>{t}</a>' for h, t in items)
    return f'''<!-- layout:header -->
<header class="mast" id="mast">
  <div class="wrap mast-in">
    <a class="mast-brand" href="index.html" aria-label="Automoto Tenis, inicio"><img src="assets/logo.png" alt=""><span>Automoto Club Deportivo<b>Tenis</b></span></a>
    <nav class="mast-nav" aria-label="Secciones">
      <a href="tabla.html"{cur("liga")}>Liga</a>
      <a href="novedades.html"{cur("novedades")}>Novedades</a>
      <a href="mercado.html"{cur("mercado")}>Mercado</a>
      <a href="info.html"{cur("club")}>El club</a>
    </nav>
    <div class="mast-end">
      {SOCIAL}
      <button type="button" class="nav-toggle" aria-controls="drawer" aria-expanded="false" aria-label="Abrir menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
</header>
<div class="drawer-backdrop" id="drawerBackdrop"></div>
<nav class="drawer" id="drawer" aria-label="Menú" aria-hidden="true">
  <div class="drawer-head"><strong>Menú</strong><button type="button" class="drawer-close" aria-label="Cerrar menú">✕</button></div>
  <div class="drawer-group">
    <a class="big" href="index.html"{here("index.html")}>Inicio</a>
    <a class="big" href="tabla.html"{cur("liga")}>Liga</a>
    <a class="big" href="novedades.html"{here("novedades.html")}>Novedades</a>
    <a class="big" href="mercado.html"{here("mercado.html")}>Mercado del usado</a>
    <a class="big" href="info.html"{cur("club")}>El club</a>
  </div>
  {SOCIAL}
</nav>
<!-- /layout:header -->'''


FOOTER = '''<!-- layout:footer -->
<footer>
  <div class="wrap foot-cols">
    <div><strong>Automoto Club Deportivo · Tenis</strong><a href="https://maps.app.goo.gl/wUV2pwQLxERQxQDT8" target="_blank" rel="noopener">Tornquist, Provincia de Buenos Aires</a></div>
  </div>
</footer>
<!-- /layout:footer -->'''


def apply(page):
    p = ROOT / page
    s = p.read_text()
    h = header(page)
    if "<!-- layout:header -->" in s:
        s = re.sub(r"<!-- layout:header -->.*?<!-- /layout:header -->", lambda m: h, s, flags=re.S)
    else:
        s, n = re.subn(r'<header class="mast">.*?</header>', lambda m: h, s, count=1, flags=re.S)
        assert n == 1, f"{page}: no encontré el header"
    if page in LIGA_PAGES:
        s, n = re.subn(r"<!-- layout:liga -->.*?<!-- /layout:liga -->", lambda m: liga_top(page), s, flags=re.S)
        assert n == 1, f"{page}: falta <!-- layout:liga -->"
    if "<!-- layout:footer -->" in s:
        s = re.sub(r"<!-- layout:footer -->.*?<!-- /layout:footer -->", lambda m: FOOTER, s, flags=re.S)
    else:
        s, n = re.subn(r"<footer>.*?</footer>", lambda m: FOOTER, s, count=1, flags=re.S)
        assert n == 1, f"{page}: no encontré el footer"
    p.write_text(s)
    print("ok", page)


def bump_asset_versions():
    """Pone ?v=<fecha y hora> en los links a site.css, site.js, liga.js y novedades.js.
    Cloudflare hace que el navegador guarde CSS y JS 4 horas: con una versión nueva en el link,
    cada publicación se ve al instante."""
    import time
    v = time.strftime("%Y%m%d%H%M%S")
    for p in ROOT.glob("*.html"):
        s = p.read_text()
        s2 = re.sub(r'(href|src)="(site\.css|site\.js|liga\.js|novedades\.js)(\?v=\d+)?"', rf'\1="\2?v={v}"', s)
        if s2 != s:
            p.write_text(s2)
    print("versión de CSS/JS:", v)


if __name__ == "__main__":
    bump_asset_versions()
    for page in PAGES:
        if (ROOT / page).exists():
            apply(page)
        else:
            print("falta", page)
