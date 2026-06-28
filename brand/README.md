# brand · Kit de marca, design system y pitch deck de beHuman

Carpeta autocontenida con todo lo visual del proyecto: **logos**, **design system** y **pitch
deck**. Pensada para abrirse sin build (solo HTML/CSS/SVG; las fuentes vienen de Google Fonts).

> Marca: el **logotipo** es `human` (minúscula). El **nombre de producto** es `beHuman`.
> Organización: `ACRC-Zk`.

## 📁 Estructura

```text
brand/
├── README.md                    # esto
├── logos/
│   ├── human-mark.svg           # isotipo (negro)
│   ├── human-mark-white.svg     # isotipo blanco (sobre oscuro/acento)
│   ├── human-mark-celeste.svg   # isotipo en acento celeste
│   ├── human-horizontal.svg     # lockup horizontal (negro)
│   ├── human-horizontal-white.svg # lockup horizontal (sobre oscuro)
│   ├── human-stacked.svg        # lockup vertical
│   ├── human-wordmark.svg       # solo logotipo
│   ├── human-horizontal.png     # versión original (pixel-perfect)
│   ├── human-stacked.png        # versión original (pixel-perfect)
│   └── favicon.ico
├── design-system/
│   ├── index.html               # guía visual: logo, color, tipografía, componentes
│   └── tokens.css               # fuente de verdad de los tokens (color/type/espaciado)
├── pitch-deck/
│   └── index.html               # presentación de 17 slides, navegable y exportable a PDF
└── dossier/
    ├── cases.json               # datos verificados del lote 1 (casos + estadísticas)
    ├── build.mjs                # generador → index.html
    └── index.html               # dossier de investigación alineado al pitch
```

## 🚀 Cómo usarlo

- **Design system:** abrí `design-system/index.html` en el navegador.
- **Dossier (research):** abrí `dossier/index.html`. Botón **Exportar PDF** o `Ctrl+P` → Landscape, márgenes mínimos, gráficos de fondo activados. Para ampliar casos: editá `dossier/cases.json` y corré `node brand/dossier/build.mjs`.
- **Pitch deck:** abrí `pitch-deck/index.html`. Navegación:
  - `←` `→` (o `espacio`, flechas, `PageUp`/`PageDown`) para moverte entre slides.
  - `F` pantalla completa · `P` imprimir / exportar a PDF · `Home`/`End` ir al inicio/fin.

> Tip para exportar el deck a PDF: abrir en Chrome → `P` → "Guardar como PDF" →
> tamaño **Horizontal/Landscape**, márgenes "Ninguno", activar "Gráficos de fondo".

## 🎨 Tokens

Definidos en `design-system/tokens.css` (espejo de `web/src/styles/tokens.css`).

- **Acento:** celeste `#0ea5e9` (único color de marca; reservado para acción y foco).
- **Neutros:** del `#0a0a0a` (ink) al blanco.
- **Tipografías:** `Plus Jakarta Sans` (UI/titulares) + `JetBrains Mono` (datos/código).
- **Escala de espaciado:** base 4px. **Radios:** sm 8 · md 12 · lg 20 · pill.

## 🧩 Slides del pitch deck (17)

1. Portada · 2. Problema · 3. Por qué ahora (ZK + Stellar) · 4. Solución (3 capas) ·
5. **A quién va dirigido** · 6. Cómo funciona · 7. **Qué construimos** · 8. Capa 1 Identidad ·
9. Capa 2 Plataforma · 10. Capa 3 Funding · 11. **Stellar en la práctica** · 12. Arquitectura ·
13. Privacidad · 14. Demo · 15. Roadmap · 16. Equipo · 17. Cierre.

## ✍️ Para completar antes de presentar

Buscá los marcadores `▸ completar` / `todo` en `pitch-deck/index.html`:

- **Equipo** (slide 16): integrantes, roles y links.
- **Demo** (slide 14): capturas/GIF y link al video.
- **Cierre** (slide 17): email de contacto.
- **Métricas** del problema (slide 2): usar cifras del `dossier/index.html` (CPJ, RSF, UNESCO, Global Witness).

> Nota: en testnet el issuer KYC es un **mock** declarado — no sustituye un KYC regulado.
