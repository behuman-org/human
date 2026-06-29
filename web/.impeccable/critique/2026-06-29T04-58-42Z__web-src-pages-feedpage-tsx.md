---
target: feed social /app
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-06-29T04-58-42Z
slug: web-src-pages-feedpage-tsx
---
# Critique — Feed social (`/app`)

**Target:** `web/src/pages/FeedPage.tsx` (+ shell, PostCard, SidebarNav)  
**Date:** 2026-06-29  
**Register:** product

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Loading/error son texto plano; sin skeleton ni `aria-live` en el stream |
| 2 | Match System / Real World | 3 | Copy humano y bilingüe; jerga ZK solo en flujos de verificación |
| 3 | User Control and Freedom | 3 | Nav clara, tabs reversibles; votos locales no persisten (ilusión de control) |
| 4 | Consistency and Standards | 2 | Sin DESIGN.md activo; `web/docs/DESIGN.md` desactualizado vs tokens reales |
| 5 | Error Prevention | 2 | Composer con límite y disabled; resonate redirige abrupto a `/onboarding` |
| 6 | Recognition Rather Than Recall | 2 | `/app/explore` y settings inaccesibles desde nav móvil |
| 7 | Flexibility and Efficiency | 2 | Sin atajos de teclado ni acciones batch |
| 8 | Aesthetic and Minimalist Design | 3 | Shell de 3 columnas legible; cards algo densas pero calmadas |
| 9 | Error Recovery | 2 | Error de feed genérico (“API en línea”); sin retry inline |
| 10 | Help and Documentation | 2 | Empty states mínimos; sin ayuda contextual sobre badge humano / resonate |
| **Total** | | **24/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** No grita “AI slop” de marketing, pero sí señales de producto genérico: feed en cards con borde lateral de acento (side-stripe), nav con indicador `border-left: 3px`, y empty states de una sola línea. El tono copy es cálido y distinto del anti-ref crypto-bro; evita engagement bait visible. Riesgo moderado de parecer “clon social” por densidad de acciones por post.

**Deterministic scan:** `detect.mjs` sobre feed/social → **0 findings** (exit 0).

**Browser visualization:** No disponible — timeout al abrir pestaña Glass; inyección de overlays no ejecutada. Evaluación visual basada en código fuente.

## Overall Impression

La base del feed es sólida: shell responsive, i18n, composer integrado, badge verificado, acciones con labels. El mayor gap es **descubribilidad + estados** (explorar comunidades, settings móvil, loading/empty que enseñen) y **honestidad de interacción** (votos optimistas no persistidos).

## What's Working

1. **Shell responsive bien pensado** — nav fija abajo en móvil, feed centrado en desktop, safe areas y focus-visible en `social-ui.css`.
2. **Composer humano** — saludo con nombre, contador de caracteres, contexto de comunidad en threads; alineado a “Humano · Cálido”.
3. **Acciones de post accesibles** — botones con texto + icono, `aria-pressed` en resonate, enlace on-chain con `sr-only`.

## Priority Issues

### [P1] Side-stripe en `PostCard` (ban absoluto Impeccable)
- **What:** `voice-card__panel::before` — barra vertical 3px de acento a la izquierda.
- **Why:** Patrón explícitamente prohibido; además refuerza look “card genérica”.
- **Fix:** Quitar pseudo-elemento; usar borde completo, tint de fondo (`voice-card--own` ya lo hace) o chip de comunidad.
- **Command:** `/impeccable polish PostCard`

### [P1] Explorar comunidades casi oculto
- **What:** Ruta `/app/explore` existe pero no está en `SidebarNav` (solo link desde mensajes vacíos).
- **Why:** Usuarios nuevos no descubren threads/comunidades — falla reconocimiento vs recall.
- **Fix:** Añadir “Explorar” al nav desktop y móvil, o entry en RightRail.
- **Command:** `/impeccable shape explore-nav`

### [P2] Empty y loading states no enseñan
- **What:** `feed-empty` es `<p>` centrado para loading, error y vacío.
- **Why:** Product register pide empty states que enseñen; Jordan no sabe el siguiente paso más allá del copy de una línea.
- **Fix:** Empty con CTA (publicar, explorar comunidades); skeleton rows para loading; error con botón “Reintentar”.
- **Command:** `/impeccable onboard FeedPage`

### [P2] Settings inaccesible en móvil desde nav principal
- **What:** `settings` marcado `desktopOnly` en `SidebarNav`.
- **Why:** Usuarios móviles deben ir a perfil → settings; fricción extra.
- **Fix:** Incluir settings en menú móvil o perfil con affordance clara.
- **Command:** `/impeccable layout SidebarNav`

### [P2] Votos optimistas sin persistencia
- **What:** `handleVote` en `PostCard` solo actualiza estado local.
- **Why:** Riley ve inconsistencia; Alex pierde confianza al refrescar.
- **Fix:** Persistir vía API o ocultar votos hasta backend real.
- **Command:** `/impeccable harden PostCard`

## Persona Red Flags

**Jordan (First-Timer):** No ve “Explorar” en nav. Empty feed dice “Sé el primero” pero no enlaza a explorar comunidades. Resonate sin verificar → redirect brusco a onboarding sin explicación en UI.

**Casey (Mobile):** Settings solo vía perfil. RightRail (identidad) oculto en móvil — pierde contexto de usuario en pantalla principal.

**Alex (Power User):** Sin atajos (`/` compose, `j/k` navegación). Votos no persisten. Dos paths a compose (nav + botón desktop) pero móvil solo “+”.

**Verified Human (PRODUCT.md):** Badge “verificado” visible pero sin tooltip/help que explique proof-of-personhood en el feed.

## Minor Observations

- Tabs sort (Nuevo/Popular) sin `aria-controls` / `id` de panel asociado.
- `community-banner__eyebrow` uppercase tracked — vigilar que no se generalice a cada sección.
- Falta `DESIGN.md` en resolución Impeccable (`hasDesign: false`) — drift documental.
- `PostComposer` no muestra error si `publishPost` falla (silencioso en `finally`).

## Questions to Consider

- ¿El feed necesita votos visibles en el feed general o solo en comunidades?
- ¿Empty state debería empujar a verificar identidad o a explorar comunidades primero?
- ¿Qué haría un feed “social calmado” si eliminamos una acción por post?
