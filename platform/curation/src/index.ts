// @behuman/curation — Moderación proactiva off-chain (Groq + cola humana).
//
// Nivel 1: agente moderador (IA) — hilo perdido, PII ajena, ilegal/+18/gore -> CurationVerdict.
// Nivel 2: casos dudosos/sensibles -> cola de moderación humana.
//
// Foco del agente: pierde el hilo, PII de terceros, ilegal/+18/gore. No moderar posturas.
// ⚠️ Opera SOLO sobre contenido + platformId (seudónimo). NUNCA address ni PII.
// 📐 Ver en la vault: `Curaduría y Agentes Validadores`.
import type { CurationInput, CurationVerdict } from "@behuman/shared";
import { createCurator, type Curator } from "./agent.js";

export * from "./agent.js";
export * from "./queue.js";
export * from "./reports.js";
export { articleReviewBody } from "./agent.js";

let _curator: Curator | null = null;
function defaultCurator(): Curator {
  if (!_curator) _curator = createCurator();
  return _curator;
}

/** Conveniencia: revisa un post con el curador por defecto (modelo de env/CURATION_MODEL). */
export function reviewPost(input: CurationInput): Promise<CurationVerdict> {
  return defaultCurator().reviewPost(input);
}
