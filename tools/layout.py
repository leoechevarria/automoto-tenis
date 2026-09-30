#!/usr/bin/env python3
"""Aplica el header, el menú lateral y el footer compartidos a todas las páginas.

Uso:  python3 tools/layout.py
Edite los bloques de abajo y vuelva a correr el script. Cada página queda
marcada con <!-- layout:header --> y <!-- layout:footer --> para las próximas veces.
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TURNOS = "https://darturnos.com/AutomotoTenis/"

# página -> sección del menú que queda marcada
PAGES = {
    "index.html": None,
    "rankings.html": "liga",
    "reglas.html": "liga",
    "rating.html": "liga",
    "fixture.html": "liga",
    "novedades.html": "novedades",
    "mercado.html": "mercado",
    "info.html": "club",
    "subcomision.html": "club",
}

IG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'
SOCIAL = f'''<div class="social">
        <a href="https://www.instagram.com/automototenis/" target="_blank" rel="noopener" aria-label="Instagram de Automoto Tenis">{IG_SVG}</a>
        <a href="https://www.instagram.com/masu.tenis/" target="_blank" rel="noopener" aria-label="Instagram de Masu Tenis" class="masu"><img src="assets/masu-mark.png" alt=""></a>
      </div>'''

LIGA = [("rankings.html", "Ranking"), ("fixture.html", "Fixture"), ("rating.html", "Rating"), ("rankings.html#cargar", "Cargá tu resultado"), ("reglas.html", "Reglas de la liga")]
CLUB = [("info.html#pagos", "Cuota y alias de pago"), ("info.html#cancha", "Cuidado de la cancha"),
        ("info.html#contacto", "Teléfonos y contactos"), ("info.html#ubicacion", "Cómo llegar"),
        ("subcomision.html", "Subcomisión de Tenis")]


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
      <div class="menu">
        <button type="button" class="menu-btn"{cur("liga")} aria-expanded="false" aria-haspopup="true">Liga <span class="chev" aria-hidden="true">▾</span></button>
        <div class="menu-list">
{sub(LIGA)}
        </div>
      </div>
      <a href="novedades.html"{cur("novedades")}>Novedades</a>
      <a href="mercado.html"{cur("mercado")}>Mercado</a>
      <div class="menu">
        <button type="button" class="menu-btn"{cur("club")} aria-expanded="false" aria-haspopup="true">El club <span class="chev" aria-hidden="true">▾</span></button>
        <div class="menu-list">
{sub(CLUB)}
        </div>
      </div>
    </nav>
    <div class="mast-end">
      <a class="btn fill turno" href="{TURNOS}" target="_blank" rel="noopener">Reservar turno ↗</a>
      {SOCIAL}
      <button type="button" class="nav-toggle" aria-controls="drawer" aria-expanded="false" aria-label="Abrir menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
</header>
<div class="drawer-backdrop" id="drawerBackdrop"></div>
<nav class="drawer" id="drawer" aria-label="Menú" aria-hidden="true">
  <div class="drawer-head"><strong>Menú</strong><button type="button" class="drawer-close" aria-label="Cerrar menú">✕</button></div>
  <a class="btn fill turno" href="{TURNOS}" target="_blank" rel="noopener">Reservar turno ↗</a>
  <div class="drawer-group">
    <a class="big" href="index.html"{here("index.html")}>Inicio</a>
    <a class="big" href="novedades.html"{here("novedades.html")}>Novedades</a>
    <a class="big" href="mercado.html"{here("mercado.html")}>Mercado del usado</a>
  </div>
  <div class="drawer-group">
    <span class="k">Liga</span>
{dsub(LIGA)}
  </div>
  <div class="drawer-group">
    <span class="k">El club</span>
{dsub(CLUB)}
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
    if "<!-- layout:footer -->" in s:
        s = re.sub(r"<!-- layout:footer -->.*?<!-- /layout:footer -->", lambda m: FOOTER, s, flags=re.S)
    else:
        s, n = re.subn(r"<footer>.*?</footer>", lambda m: FOOTER, s, count=1, flags=re.S)
        assert n == 1, f"{page}: no encontré el footer"
    p.write_text(s)
    print("ok", page)


if __name__ == "__main__":
    for page in PAGES:
        if (ROOT / page).exists():
            apply(page)
        else:
            print("falta", page)
