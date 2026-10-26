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
WA_ICON = '''<svg class="wa-ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z"/></svg>'''
# Íconos de compartir: tres puntos unidos (Android) y cuadrado con flecha hacia arriba (iOS)
ICON_ANDROID = '<svg class="sh-ic sh-android" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>'
ICON_IOS = '<svg class="sh-ic sh-ios" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M8 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/></svg>'
MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def fecha(iso):
    from datetime import date
    d = date.fromisoformat(iso)
    return d, f"{DIA[d.weekday()]} {d.day} de {MES[d.month - 1]}"


# En el texto, [[wa:5492914075621|291-4075621]] se muestra como link de WhatsApp con el ícono
WA_TOKEN = re.compile(r"\[\[wa:(\d+)\|([^\]]+)\]\]")


def wa_link(m):
    return f'<a class="wa-link" href="https://wa.me/{m.group(1)}" target="_blank" rel="noopener">{WA_ICON}{m.group(2)}</a>'


def paras(t):
    return "".join(f"<p>{WA_TOKEN.sub(wa_link, esc(p.strip()))}</p>" for p in re.split(r"\n\s*\n", t or "") if p.strip())


def resumen(t):
    s = WA_TOKEN.sub(lambda m: m.group(2), re.sub(r"\s+", " ", (t or "").strip()))
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
        extra += (f'<div class="alias-box"><div><div class="lbl">{esc(al.get("etiqueta", "Alias para transferir"))}</div><div class="alias" id="aliasText">{esc(al["valor"])}</div>'
                  f'<div class="who">Titular: {esc(al["titular"])}</div></div>'
                  f'<button class="btn fill copy-btn" id="copyAlias" type="button"><span id="copyLabel">Copiar alias</span></button></div>')
    if item.get("boton"):
        extra += f'<div class="art-share"><a class="btn fill" href="{esc(item["boton"]["url"])}" target="_blank" rel="noopener">{WA_ICON if item["boton"].get("whatsapp") else ""}{esc(item["boton"]["texto"])}</a></div>'

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
