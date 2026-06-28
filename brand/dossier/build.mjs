#!/usr/bin/env node
/**
 * Genera brand/dossier/index.html desde cases.json
 * Uso: node brand/dossier/build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, 'cases.json'), 'utf8'));

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCase(c, i) {
  const media = c.media.map((m) => `<span class="tag">${esc(m)}</span>`).join('');
  const timeline = c.timeline
    .map((t) => `<li><time>${esc(t.date)}</time> — ${esc(t.event)}</li>`)
    .join('\n');
  const links = c.links
    .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a></li>`)
    .join('\n');

  return `
<article class="case" id="${esc(c.id)}">
  <header class="case-head">
    <p class="case-index">Caso ${String(i + 1).padStart(2, '0')} · ${esc(c.region)}</p>
    <h2>${esc(c.name)}</h2>
    <p class="case-outcome pill-outcome">${esc(c.outcome)}</p>
  </header>

  <div class="case-grid">
    <section class="case-block">
      <h3>Fotografía</h3>
      <p class="muted">No se incrustan imágenes por derechos de imagen. Ver retrato en fuente primaria:</p>
      <p><a class="photo-link" href="${esc(c.photoUrl)}" target="_blank" rel="noopener noreferrer">Abrir fuente con fotografía pública →</a></p>
    </section>

    <section class="case-block">
      <h3>Perfil</h3>
      <dl class="profile">
        <div><dt>Profesión</dt><dd>${esc(c.profession)}</dd></div>
        <div><dt>Edad</dt><dd>${esc(c.age)}</dd></div>
        <div><dt>País</dt><dd>${esc(c.country)}</dd></div>
        <div><dt>Ciudad</dt><dd>${esc(c.city)}</dd></div>
        <div><dt>Organización</dt><dd>${esc(c.organization)}</dd></div>
      </dl>
    </section>
  </div>

  <section class="case-block">
    <h3>Resumen del caso</h3>
    <p>${esc(c.summary)}</p>
  </section>

  <section class="case-block">
    <h3>Qué denunció</h3>
    <p>${esc(c.exposed)}</p>
  </section>

  <section class="case-block">
    <h3>Medio utilizado</h3>
    <div class="tags">${media}</div>
  </section>

  <section class="case-block">
    <h3>Cronología</h3>
    <ol class="timeline">${timeline}</ol>
  </section>

  <section class="case-block">
    <h3>Amenazas previas</h3>
    <p>${esc(c.threats)}</p>
  </section>

  <section class="case-block">
    <h3>Qué ocurrió</h3>
    <p>${esc(c.whatHappened)}</p>
  </section>

  <section class="case-block">
    <h3>Estado del caso</h3>
    <p>${esc(c.status)}</p>
  </section>

  <section class="case-block bridge-block">
    <h3>Conexión con beHuman</h3>
    <p>${esc(c.beHumanAngle)}</p>
  </section>

  <section class="case-block">
    <h3>Fuentes verificadas</h3>
    <ul class="sources">${links}</ul>
  </section>
</article>`;
}

const statsHtml = data.statistics
  .map(
    (s) => `
    <div class="stat-card">
      <div class="stat-value">${esc(s.value)}</div>
      <p class="stat-label">${esc(s.label)}</p>
      <a class="stat-source" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.source)} →</a>
    </div>`
  )
  .join('');

const tocHtml = data.cases
  .map((c, i) => `<li><a href="#${esc(c.id)}">${String(i + 1).padStart(2, '0')}. ${esc(c.name)} <span>${esc(c.region)}</span></a></li>`)
  .join('\n');

const casesHtml = data.cases.map((c, i) => renderCase(c, i)).join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>beHuman · ${esc(data.meta.title)}</title>
  <link rel="icon" href="../logos/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../design-system/tokens.css" />
  <style>
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: var(--font-sans);
      color: var(--c-text);
      background: var(--c-bg-deep);
      -webkit-font-smoothing: antialiased;
      line-height: var(--lh-normal);
    }
    a { color: var(--c-accent-deep); }
    a:hover { color: var(--c-accent); }

    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 0.75rem 1.5rem;
      background: rgba(255,255,255,0.92);
      border-bottom: 1px solid var(--c-border);
      backdrop-filter: blur(10px);
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
    }
    .toolbar .brand { display: flex; align-items: center; gap: 0.5rem; color: var(--c-text-dim); text-transform: uppercase; letter-spacing: 0.1em; }
    .toolbar img { height: 16px; }
    .toolbar button {
      border: 1px solid var(--c-border);
      background: #fff;
      border-radius: var(--radius-pill);
      padding: 0.45rem 0.9rem;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
    }
    .toolbar button:hover { border-color: var(--c-accent); color: var(--c-accent-deep); }

    .doc { max-width: 820px; margin: 0 auto; padding: 5rem 1.5rem 4rem; }

    .cover {
      min-height: 90vh;
      display: flex; flex-direction: column; justify-content: center;
      padding: 3rem 0 4rem;
      border-bottom: 1px solid var(--c-border);
      page-break-after: always;
    }
    .cover.dark-band {
      margin: -5rem -1.5rem 3rem;
      padding: 5rem 1.5rem 4rem;
      background: var(--grad-ink, linear-gradient(135deg, #0a0a0a, #1a1a1a));
      color: #fff;
    }
    .cover.dark-band .eyebrow { color: var(--c-accent-soft); }
    .cover.dark-band .lead { color: rgba(255,255,255,0.78); }
    .cover.dark-band .meta { color: rgba(255,255,255,0.55); }
    .cover-logo { width: min(280px, 70vw); margin-bottom: 2rem; }
    .eyebrow {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--c-accent-deep);
      margin: 0 0 1rem;
    }
    h1 {
      font-size: clamp(2rem, 5vw, 3.2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.05;
      margin: 0 0 1.25rem;
      max-width: 18ch;
    }
    .lead { font-size: var(--fs-body-lg); color: var(--c-text-muted); max-width: 62ch; margin: 0; }
    .meta {
      margin-top: 2.5rem;
      display: flex; flex-wrap: wrap; gap: 1.5rem;
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
      color: var(--c-text-dim);
    }
    .meta b { color: inherit; font-weight: 600; }

    .chapter { padding: 3rem 0; border-bottom: 1px solid var(--c-border); page-break-before: always; }
    .chapter:first-of-type { page-break-before: auto; }
    h2.section-title {
      font-size: var(--fs-h2);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 1rem;
    }
    h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.6rem; color: var(--c-text); }
    .muted { color: var(--c-text-muted); font-size: var(--fs-sm); }

    .notice {
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      background: var(--c-accent-subtle);
      border: 1px solid var(--c-accent-border);
      font-size: var(--fs-sm);
      color: var(--c-accent-deep);
      margin: 1.5rem 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .stat-card {
      border: 1px solid var(--c-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      background: #fff;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.06));
    }
    .stat-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; color: var(--c-accent-deep); }
    .stat-label { font-size: var(--fs-sm); color: var(--c-text-muted); margin: 0.35rem 0 0.75rem; line-height: 1.45; }
    .stat-source { font-family: var(--font-mono); font-size: var(--fs-xs); text-decoration: none; }

    .toc { list-style: none; padding: 0; margin: 1.5rem 0 0; columns: 1; }
    @media (min-width: 640px) { .toc { columns: 2; column-gap: 2rem; } }
    .toc li { break-inside: avoid; margin-bottom: 0.55rem; }
    .toc a {
      text-decoration: none;
      font-size: var(--fs-sm);
      display: flex; justify-content: space-between; gap: 1rem;
      padding: 0.35rem 0;
      border-bottom: 1px dotted var(--c-border);
    }
    .toc a span { color: var(--c-text-dim); font-family: var(--font-mono); font-size: var(--fs-xs); white-space: nowrap; }

    .pattern-list { margin: 0; padding-left: 1.2rem; color: var(--c-text-muted); }
    .pattern-list li { margin-bottom: 0.75rem; }

    .case {
      padding: 3rem 0;
      border-bottom: 2px solid var(--c-border);
      page-break-before: always;
    }
    .case-head { margin-bottom: 1.5rem; }
    .case-index { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--c-accent-deep); letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 0.35rem; }
    .case-head h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
    .pill-outcome {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      font-weight: 600;
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-pill);
      background: var(--c-accent-muted);
      color: var(--c-accent-deep);
      border: 1px solid var(--c-accent-border);
    }

    .case-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
    @media (max-width: 640px) { .case-grid { grid-template-columns: 1fr; } }
    .case-block { margin-bottom: 1.25rem; }
    .case-block p { margin: 0; color: var(--c-text-muted); }

    .profile { margin: 0; }
    .profile div { display: grid; grid-template-columns: 110px 1fr; gap: 0.5rem; padding: 0.35rem 0; border-bottom: 1px solid var(--c-neutral-100); font-size: var(--fs-sm); }
    .profile dt { font-family: var(--font-mono); color: var(--c-text-dim); margin: 0; }
    .profile dd { margin: 0; color: var(--c-text); }

    .tags { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .tag {
      font-size: var(--fs-xs);
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-pill);
      border: 1px solid var(--c-border);
      background: var(--c-neutral-50);
      color: var(--c-text-muted);
    }

    .timeline { margin: 0; padding-left: 1.2rem; color: var(--c-text-muted); font-size: var(--fs-sm); }
    .timeline li { margin-bottom: 0.55rem; }
    .timeline time { font-family: var(--font-mono); color: var(--c-accent-deep); font-weight: 600; }

    .bridge-block {
      border-left: 3px solid var(--c-accent);
      padding-left: 1rem;
      background: var(--c-bg-tint);
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;
    }
    .bridge-block p { color: var(--c-text); }

    .sources { margin: 0; padding-left: 1.2rem; font-size: var(--fs-sm); }
    .sources li { margin-bottom: 0.4rem; word-break: break-word; }
    .photo-link { font-family: var(--font-mono); font-size: var(--fs-sm); }

    .closing {
      margin-top: 3rem;
      padding: 2.5rem;
      border-radius: var(--radius-lg);
      background: var(--grad-ink, linear-gradient(135deg, #0a0a0a, #1a1a1a));
      color: #fff;
      page-break-before: always;
    }
    .closing h2 { color: #fff; margin-top: 0; }
    .closing p, .closing li { color: rgba(255,255,255,0.78); }
    .closing a { color: var(--c-accent-soft); }

    .biblio { font-size: var(--fs-sm); color: var(--c-text-muted); }
    .biblio li { margin-bottom: 0.5rem; }

    @media print {
      .toolbar { display: none; }
      .doc { max-width: none; padding-top: 0; }
      .cover.dark-band { margin: 0 0 2rem; padding: 2rem 0; min-height: auto; }
      .case, .chapter, .closing { page-break-inside: avoid; }
      a { color: var(--c-accent-deep); }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="brand"><img src="../logos/human-mark.svg" alt="" /> beHuman · dossier</div>
    <button type="button" onclick="window.print()">Exportar PDF (Ctrl+P)</button>
  </div>

  <main class="doc">
    <header class="cover dark-band">
      <img class="cover-logo" src="../logos/human-horizontal-white.svg" alt="human" />
      <p class="eyebrow">Investigación · Lote 1 verificado</p>
      <h1>${esc(data.meta.title)}</h1>
      <p class="lead">${esc(data.meta.subtitle)}. Documento alineado al pitch de <strong>beHuman</strong> (ACRC-Zk): la evidencia del problema que justifica identidad humana verificable con privacidad para opinar, denunciar y apoyar causas.</p>
      <div class="meta">
        <span>Versión <b>${esc(data.meta.version)}</b></span>
        <span>Alcance <b>${esc(data.meta.scope)}</b></span>
        <span>Actualizado <b>${esc(data.meta.lastUpdated)}</b></span>
        <span>Casos desarrollados <b>${data.cases.length}</b></span>
      </div>
    </header>

    <section class="chapter" id="intro">
      <p class="eyebrow">Marco</p>
      <h2 class="section-title">Por qué este dossier existe</h2>
      <p class="lead" style="color:var(--c-text-muted);max-width:70ch">Cuando tu nombre queda atado a lo que decís, muchas personas eligen callarse. Este informe documenta el costo humano de esa exposición: asesinatos, desapariciones, cárcel, lawfare y doxxing contra quienes hicieron pública información de interés general.</p>
      <div class="notice"><strong>Metodología responsable:</strong> ${esc(data.meta.generatedNote)} No se inventan datos: cada cifra y cada ficha enlaza fuentes primarias o institucionales (CPJ, RSF, UNESCO, Global Witness, medios de referencia, organismos de DDHH). Las fotografías no se incrustan; se enlaza la fuente donde aparecen.</div>
      <h3>Ángulo beHuman</h3>
      <ul class="pattern-list">
        <li><strong>Identidad expuesta → represalia:</strong> en la mayoría de los casos, la víctima era públicamente identificable (nombre, rostro, domicilio, cargo o red social).</li>
        <li><strong>Doxxing como antesala:</strong> Hussein-Suale, Ressa y otros fueron localizados antes del golpe legal o físico.</li>
        <li><strong>Impunidad sistémica:</strong> ~85% de asesinatos de periodistas sin resolver (UNESCO) refuerza el miedo a hablar.</li>
        <li><strong>Propuesta:</strong> prueba ZK de persona real y única + seudónimo estable + publicación anclada on-chain/off-chain — sin pegar DNI ni nombre legal a cada post.</li>
      </ul>
    </section>

    <section class="chapter" id="stats">
      <p class="eyebrow">Capítulo 1</p>
      <h2 class="section-title">El problema en cifras (fuentes citables)</h2>
      <p class="muted">Datos para slide 2 del pitch deck. Verificar fecha de corte al presentar ante jurado.</p>
      <div class="stats-grid">${statsHtml}</div>
    </section>

    <section class="chapter" id="toc">
      <p class="eyebrow">Índice</p>
      <h2 class="section-title">Casos del lote 1 (${data.cases.length} fichas)</h2>
      <ul class="toc">${tocHtml}</ul>
    </section>

    <section class="chapter" id="patterns">
      <p class="eyebrow">Capítulo 2</p>
      <h2 class="section-title">Patrones transfronterizos</h2>
      <ul class="pattern-list">
        <li><strong>Narco + política:</strong> México (Breach, Martínez), Honduras (Cáceres), Eslovaquia (Kuciak + 'Ndrangheta).</li>
        <li><strong>Corrupción de élite:</strong> Malta, Angola, Rusia (Magnitsky, Navalny), Sri Lanka.</li>
        <li><strong>Medio ambiente / territorio:</strong> Cáceres, Guajajara; 146 defensores asesinados o desaparecidos solo en 2024 (Global Witness).</li>
        <li><strong>Lawfare digital:</strong> Ressa (ciberlibelo), Marques (difamación), Radi (espionaje).</li>
        <li><strong>Estado como sospechoso:</strong> Khashoggi, Politkovskaya, Wickrematunge, Mohammadi.</li>
        <li><strong>Impunidad:</strong> autores intelectuales libres en Politkovskaya, Breach, Martínez, Wickrematunge; patrones similares en América Latina y Asia.</li>
      </ul>
    </section>

    <section class="chapter" id="cases">
      <p class="eyebrow">Capítulo 3</p>
      <h2 class="section-title">Fichas verificadas</h2>
      ${casesHtml}
    </section>

    <section class="chapter" id="expansion">
      <p class="eyebrow">Roadmap del dossier</p>
      <h2 class="section-title">Cómo llegar a 100 casos sin perder rigor</h2>
      <p>Este documento es el <strong>lote 1</strong>. Para completar 80–150 páginas y 100 fichas:</p>
      <ol class="pattern-list">
        <li>Extraer candidatos de <a href="https://cpj.org/data/killed/">CPJ Killed</a>, <a href="https://www.unesco.org/en/safety-journalists/observatory">UNESCO Observatory</a> y <a href="https://rsf.org/en/2025-deadly-year-journalists-where-hate-and-impunity-lead">RSF Round-up</a>.</li>
        <li>Verificar cada ficha con mínimo 3 fuentes independientes antes de incluirla.</li>
        <li>Ampliar perfiles: creadores digitales, fiscales, médicos, empresarios (según criterios del brief).</li>
        <li>Agregar bloques regionales: África subsahariana, Medio Oriente, Sudeste Asiático, Europa del Este, Oceanía.</li>
        <li>Regenerar con <code>node brand/dossier/build.mjs</code> tras editar <code>cases.json</code>.</li>
      </ol>
    </section>

    <section class="chapter" id="biblio">
      <p class="eyebrow">Bibliografía base</p>
      <h2 class="section-title">Fuentes institucionales</h2>
      <ul class="biblio">
        <li>Committee to Protect Journalists — <a href="https://cpj.org/data/">Database &amp; reports</a></li>
        <li>Reporters Without Borders — <a href="https://rsf.org/en/2025-deadly-year-journalists-where-hate-and-impunity-lead">2025 Round-up</a></li>
        <li>UNESCO — <a href="https://www.unesco.org/en/safety-journalists/observatory">Observatory of Killed Journalists</a></li>
        <li>Global Witness — <a href="https://globalwitness.org/en/campaigns/land-and-environmental-defenders/roots-of-resistance/">Roots of Resistance (2024)</a></li>
        <li>Forbidden Stories — <a href="https://forbiddenstories.org">The Cartel Project</a></li>
        <li>OCCRP — <a href="https://www.occrp.org/">Investigaciones transfronterizas</a></li>
      </ul>
    </section>

    <footer class="closing">
      <img src="../logos/human-horizontal-white.svg" alt="human" style="width:200px;margin-bottom:1.5rem" />
      <h2>Tu opinión importa. Sin exponer quién sos.</h2>
      <p>beHuman · proof of personhood con Zero-Knowledge sobre Stellar. Organización ACRC-Zk · PULSO Hackathon.</p>
      <p style="margin-top:1rem;font-family:var(--font-mono);font-size:var(--fs-xs)">▸ Completar: métricas en slide 2 del deck · demo · contacto de cierre</p>
    </footer>
  </main>
</body>
</html>`;

writeFileSync(join(__dirname, 'index.html'), html, 'utf8');
console.log(`Generado index.html con ${data.cases.length} casos.`);
