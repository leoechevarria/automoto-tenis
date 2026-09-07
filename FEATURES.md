# Ideas de features — Sitio del club

Lista de funcionalidades propuestas para el sitio, más allá del ranking (ya implementado en [rankings.html](rankings.html)).

## Pagos y administración
1. Alias para pagar cuota + valores vigentes
2. Actas y transparencia de cuentas de la subcomisión

## Uso de la cancha / turnos
3. Link para dar turnos
4. Acceso para ver las cámaras de la cancha (streaming/monitoreo en vivo)
5. Reglas y recomendaciones del espacio (cómo mantener la cancha, qué hace el canchero, buenas prácticas de uso)

## Información y comunicación
6. Cartelera y calendario de eventos y anuncios
7. Info sobre los torneos de Bahía (dentro de la cartelera)
8. Anuncios pineados
9. Teléfonos y contactos en general
10. Noticias y resultados del mundo del tenis (ej. resultados actuales de Wimbledon u otros torneos ATP/WTA) — requiere fuente de datos externa (API o widget embebido)
11. Notas/entrevistas con jugadores o gente de la actividad (para la cartelera)

## Ranking y competencia
12. Ranking (ya armado — ver [rankings.html](rankings.html), categorías A/B/C con ascenso/descenso/promoción según REGLAS - LIGA 2026)
13. Ranking y reglas de la liga
14. Cargar resultados de la liga desde el celular
24. Convocatoria al Master de fin de año — **bloqueado**: requiere (a) ranking de Clausura con el bonus de posición del Apertura (+200/+150/+100/+80/+60/+40 para el top 6), (b) resultado de la Copa Invernal (torneo aparte entre categorías A y B, no registrado hoy en ningún lado), y (c) el campeón defensor del año anterior. Hoy `Ranking_A/B/C` son una sola tabla corrida (no distingue Apertura/Clausura), así que no hay dónde enganchar esta lógica todavía.

## Compra/venta
15. Mercado de usado + cosas nuevas que venden los profes
16. Feria de usados (evento presencial de intercambio/venta) — *pendiente confirmar si es distinto del punto 15 o se fusionan*
17. Lugares recomendados donde comprar (todo tenis)
18. Info técnica de raquetas y recomendaciones (guías de compra, comparativas según nivel/juego)

## Contacto
19. Formulario de contacto con ruteo automático según motivo (ej: "Resultado" → Gonza, "Cuota/pagos" → Subcomisión, "Otro" → Seba, etc.) — definir si por mailto:, wa.me links, o ambos

## Comunidad / Redes
20. Preguntas de trivia (tenis en general, historia del club, jugadores, etc.)
21. Galería de fotos de la actividad (torneos, eventos, entrenamientos)
22. Link a Instagram del club + widget embebido (feed de posts recientes)

## Sponsors
23. Espacio/sección para sponsors del club (logos, banners, links a sus sitios)

## Clima y condiciones de juego
25. Pronóstico del clima para los próximos días (viento, lluvia, nubosidad, temperatura) + **"playability score" tenístico**: un puntaje de 1 a 5 estrellas de qué tan lindo está para jugar, estilo Windguru pero para tenis. Poco viento + sin lluvia + soleado = 5⭐. Ideal para decidir de un vistazo qué día conviene reservar cancha.

---

## Notas técnicas por feature

- **Cámaras (4)**: depende del sistema de cámaras del club (IP cams con RTSP, NVR con app propia, Ring, etc.) y si el acceso es público para socios o requiere login.
- **Noticias del mundo del tenis (10)**: necesita una API externa (ej. Tennis Live Data, RapidAPI) o un widget embebido (ESPN, ATP Tour), no se arma con Google Sheets como el ranking.
- **Resultados de liga desde el celular (14)**: implica un formulario/mini-app conectado al Google Sheet del ranking, con o sin autenticación para evitar cargas no autorizadas.
- **Clima + playability score (25)**: conviene usar **Open-Meteo** (gratis, sin API key, entrega viento/precipitación/nubosidad/temperatura por hora y día) en vez de la API de Windguru, que requiere cuenta/partner y es más restrictiva. El puntaje de estrellas se calcula en el navegador: se parte de 5⭐ y se descuenta por viento fuerte, probabilidad de lluvia, nubosidad alta y temperaturas extremas. Se puede afinar el algoritmo con lo que el club considere "buen día para jugar".

## Pendiente
- Priorizar un MVP (4-5 features) para la primera versión del sitio.
- Definir estructura de navegación (una sola landing vs. secciones/páginas separadas).
