#!/usr/bin/env python3
"""Genera una página con URL propia para cada noticia y cada evento de data/novedades.json.
Las páginas quedan en n/<id>.html y se ven en automototenis.com/n/<id>.
Cada una tiene su título, su descripción y su imagen para la vista previa al compartir (WhatsApp, etc.).
Lo llama tools/layout.py: correr `python3 tools/layout.py` después de cambiar el JSON."""
import json, re, sys
from html import escape as esc
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import layout

SITE = "https://automototenis.com"
MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def fecha(iso):
    from datetime import date
    d = date.fromisoformat(iso)
    return d, f"{DIA[d.weekday()]} {d.day} de {MES[d.month - 1]}"


def paras(t):
    return "".join(f"<p>{esc(p.strip())}</p>" for p in re.split(r"\n\s*\n", t or "") if p.strip())


def resumen(t):
    s = re.sub(r"\s+", " ", (t or "").strip())
    return s if len(s) <= 200 else s[:197].rsplit(" ", 1)[0] + "…"


def page(item, tipo, v):
    id_ = item["id"]
    url = f"{SITE}/n/{id_}"
    titulo = item["titulo"]
    img = f'{SITE}/{item["foto"]}' if item.get("foto") else f"{SITE}/assets/court.jpg"
    desc = resumen(item.get("texto")) or "Automoto Club Deportivo · Tenis, Tornquist."
    if tipo == "evento":
        d, largo = fecha(item["fecha"])
        cuando = " · ".join(x for x in [largo if not item.get("hasta") else f"del {d.day} al {fecha(item['hasta'])[0].day} de {MES[fecha(item['hasta'])[0].month - 1]}", item.get("hora"), item.get("lugar")] if x)
        head = (f'<div class="dlg-date"><b>{d.day}</b><span>{MES[d.month - 1]}<br>{DIA[d.weekday()]}</span></div>'
                f'<span class="k">Evento</span><h1>{esc(titulo)}</h1><p class="when">{esc(cuando)}</p>')
        if not item.get("texto"):
            desc = cuando
    else:
        pub = ""
        if item.get("publicado"):
            d, _ = fecha(item["publicado"])
            pub = f" · {d.day} de {MES[d.month - 1]}"
        head = f'<span class="k">{esc(item.get("etiqueta") or "Noticia")}{pub}</span><h1>{esc(titulo)}</h1>'
    wa = "https://wa.me/?text=" + __import__("urllib.parse").parse.quote(f"{titulo} {url}")
    foto = f'<img class="dlg-img" src="{esc(item["foto"])}" alt="">' if item.get("foto") else ""
    return f'''<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="UTF-8">
<base href="/">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(titulo)} — Automoto Tenis</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Automoto Club Deportivo · Tenis">
<meta property="og:title" content="{esc(titulo)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="assets/favicon-192.png">
<link rel="apple-touch-icon" href="assets/favicon-180.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#12265c">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="assets/fonts/barlow-condensed-800.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css?v={v}">
</head>
<body>
{layout.header("novedades.html")}

<main class="wrap">
  <article class="art reveal" style="--i:0">
    <a class="art-back" href="novedades.html">← Todas las noticias</a>
    {foto}
    {head}
    <div class="dlg-body">{paras(item.get("texto"))}</div>
    <div class="art-share"><a class="btn" href="{wa}" target="_blank" rel="noopener">Compartir por WhatsApp</a></div>
  </article>
</main>

{layout.FOOTER}
<script src="site.js?v={v}"></script>
</body>
</html>
'''


def build(v):
    data = json.loads((ROOT / "data" / "novedades.json").read_text())
    out = ROOT / "n"
    out.mkdir(exist_ok=True)
    for old in out.glob("*.html"):
        old.unlink()
    n = 0
    for tipo, key in (("anuncio", "anuncios"), ("evento", "eventos")):
        for item in data.get(key, []):
            assert re.fullmatch(r"[a-z0-9-]+", item["id"]), f'id inválido: {item["id"]}'
            (out / f'{item["id"]}.html').write_text(page(item, tipo, v))
            n += 1
    print(f"páginas de noticias y eventos: {n}")
