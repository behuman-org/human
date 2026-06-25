// MatcherTestnetProvider — gate de identidad para TESTNET (face match 1:1 + liveness).
//
// Recibe foto del DNI + frames de cámara en vivo, y decide ok = match ∧ liveness.
// Privacidad: procesa buffers en memoria, NO persiste ni loguea imágenes, y devuelve
// solo OK/score/razones (nunca imágenes ni embeddings).
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MatchResult } from "@behuman/shared";
import type { GateInput, IdentityProvider } from "./provider.js";
import { detectFace, faceDistance, loadModels, type FaceData } from "./faceEngine.js";
import { assessLiveness } from "./liveness.js";

const here = dirname(fileURLToPath(import.meta.url));

function threshold(): number {
  const v = Number(process.env.MATCH_THRESHOLD);
  return Number.isFinite(v) && v > 0 ? v : 0.6; // distancia euclidiana (face-api)
}

function modelsPath(): string {
  // Default robusto: junto al módulo (no depende del cwd).
  return process.env.FACE_MODELS_PATH ?? resolve(here, "models");
}

export class MatcherTestnetProvider implements IdentityProvider {
  readonly kind = "testnet" as const;

  async verifyIdentity(input: GateInput): Promise<MatchResult> {
    await loadModels(modelsPath());
    const reasons: string[] = [];

    // 1) Cara del documento.
    const docFace = await detectFace(input.document);
    if (!docFace) {
      return { ok: false, matchScore: 0, matchDistance: 1, livenessOk: false, reasons: ["no_face_in_document"] };
    }

    // 2) Cara en cada frame del selfie en vivo.
    const liveFaces: FaceData[] = [];
    for (const frame of input.selfieFrames) {
      const f = await detectFace(frame);
      if (f) liveFaces.push(f);
    }
    if (liveFaces.length === 0) {
      return { ok: false, matchScore: 0, matchDistance: 1, livenessOk: false, reasons: ["no_face_in_selfie"] };
    }

    // 3) Liveness (challenge + anti-foto-estática).
    const liveness = assessLiveness(liveFaces, input.selfieFrames.length);
    reasons.push(...liveness.reasons);

    // 4) Match 1:1 DNI <-> mejor frame en vivo (menor distancia).
    const distance = Math.min(...liveFaces.map((f) => faceDistance(docFace.descriptor, f.descriptor)));
    const matchOk = distance <= threshold();
    if (!matchOk) reasons.push("face_mismatch");

    const matchScore = Math.max(0, 1 - distance); // confianza 0..1 (1 = idéntico)
    return {
      ok: matchOk && liveness.ok,
      matchScore: Number(matchScore.toFixed(4)),
      matchDistance: Number(distance.toFixed(4)),
      livenessOk: liveness.ok,
      reasons,
    };
  }
}
