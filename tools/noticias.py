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
# Íconos de compartir: tres puntos unidos (Android) y cuadrado con flecha hacia arriba (iOS)
ICON_ANDROID = '<svg class="sh-ic sh-android" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>'
ICON_IOS = '<svg class="sh-ic sh-ios" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M8 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/></svg>'
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
    foto = f'<img class="art-foto" src="{esc(item["foto"])}" alt="{esc(titulo)}">' if item.get("foto") else ""
    extra = ""
    if item.get("alias"):
        al = item["alias"]
        extra += (f'<div class="alias-box"><div><div class="lbl">Alias de Mercado Pago</div><div class="alias" id="aliasText">{esc(al["valor"])}</div>'
                  f'<div class="who">Titular: {esc(al["titular"])}</div></div>'
                  f'<button class="btn fill copy-btn" id="copyAlias" type="button"><span id="copyLabel">Copiar alias</span></button></div>')
    if item.get("boton"):
        extra += f'<div class="art-share"><a class="btn fill" href="{esc(item["boton"]["url"])}" target="_blank" rel="noopener">{esc(item["boton"]["texto"])}</a></div>'

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
    <a class="art-back" href="novedades.html">← Todas las novedades</a>
    {head}
    {foto}
    <div class="dlg-body">{paras(item.get("texto"))}</div>
    {extra}
    <div class="art-share"><button type="button" class="btn" id="share" data-title="{esc(titulo)}" data-text="{esc(desc)}" data-url="{url}">{ICON_ANDROID}{ICON_IOS}<span>Compartir</span></button></div>
  </article>
</main>

{layout.FOOTER}
<script src="site.js?v={v}"></script>
<script>
  (() => {{
    const btn = document.getElementById('copyAlias'); if (!btn) return;
    const label = document.getElementById('copyLabel');
    const legacy = t => {{ const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); let ok = false; try {{ ok = document.execCommand('copy'); }} catch (e) {{}} a.remove(); return ok; }};
    btn.addEventListener('click', async () => {{
      const alias = document.getElementById('aliasText').textContent.trim();
      let ok = false;
      if (navigator.clipboard && window.isSecureContext) {{ try {{ await navigator.clipboard.writeText(alias); ok = true; }} catch (e) {{}} }}
      if (!ok) ok = legacy(alias);
      btn.classList.add('done');
      label.textContent = ok ? '¡Copiado!' : 'Copiá: ' + alias;
      setTimeout(() => {{ btn.classList.remove('done'); label.textContent = 'Copiar alias'; }}, ok ? 1800 : 3500);
    }});
  }})();
</script>
<script>
  (() => {{
    const b = document.getElementById('share');
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || /Macintosh/.test(navigator.userAgent);
    b.classList.add(ios ? 'is-ios' : 'is-android');
    b.addEventListener('click', async () => {{
      const d = b.dataset;
      try {{
        if (navigator.share) {{ await navigator.share({{ title: d.title, text: d.text, url: d.url }}); return; }}
        await navigator.clipboard.writeText(d.url);
        b.querySelector('span').textContent = 'Link copiado';
        setTimeout(() => {{ b.querySelector('span').textContent = 'Compartir'; }}, 2500);
      }} catch (e) {{ /* el usuario cerró el menú de compartir */ }}
    }});
  }})();
</script>
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
