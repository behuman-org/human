// Gating de donación/participación por PERSONHOOD (Capa 1) — membership, NO is_verified(address).
// El donante presenta una prueba de pertenencia (circuito de plataforma, Capa 2) y se
// verifica con snarkjs contra la VK. Identidad nunca revelada; wallet de donación anónima.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bindFundingOpinion,
  verifyFundingOpinionProof,
  verifyProofLocally,
  type FundingOpinionClaims,
} from "@behuman/sdk";

const here = dirname(fileURLToPath(import.meta.url));
// Reusa la VK del circuito de plataforma (membership + platformId), ya construido en Capa 2.
const PLATFORM_VK = resolve(here, "..", "..", "..", "platform", "circuits", "build", "verification_key.json");
// VK del circuito de OPINIÓN POR CAMPAÑA (Capa 3) — scope/nullifier por campaña.
const FUNDING_VK = resolve(here, "..", "..", "..", "funding", "circuits", "build", "verification_key.json");

const isDev = () => (process.env.FUNDING_PROVIDER ?? "dev") === "dev";

export interface MembershipProof {
  proof: unknown;
  publicSignals: string[]; // [issuerRoot, platformId, ...]
}

export interface FundingOpinionProofInput {
  proof: unknown;
  publicSignals: string[]; // [issuerRoot, platformId, nullifier, scope, nullScope, contentHash]
}

/** Verifica que el solicitante es un humano verificado (sin revelar quién). */
export async function verifyMembership(mp?: MembershipProof): Promise<boolean> {
  if (!mp || !Array.isArray(mp.publicSignals) || mp.publicSignals.length === 0) return false;
  // dev: se acepta la membership declarada (mock para construir/testear el flujo).
  if (isDev()) return true;
  // real: verificación criptográfica de la prueba de pertenencia con snarkjs.
  if (!existsSync(PLATFORM_VK)) return false;
  try {
    const vk = JSON.parse(readFileSync(PLATFORM_VK, "utf8"));
    return await verifyProofLocally(mp as never, vk);
  } catch {
    return false;
  }
}

/**
 * Verifica la prueba de OPINIÓN POR CAMPAÑA y devuelve los claims de confianza
 * (issuerRoot/platformId/nullifier vienen DE la prueba, atados a esta campaña y contenido).
 * Devuelve `null` si la prueba es inválida o no corresponde a la campaña/contenido.
 *
 * En dev (sin prover en el cliente) se aceptan los valores declarados por el caller
 * como fallback, para poder construir/testear el flujo end-to-end.
 */
export async function verifyFundingOpinion(
  campaignId: string,
  content: string,
  op: FundingOpinionProofInput | undefined,
  declared?: { platformId?: string; nullifier?: string },
): Promise<FundingOpinionClaims | null> {
  // Camino real: prueba criptográfica + binding a la campaña/contenido.
  if (op?.proof && Array.isArray(op.publicSignals)) {
    const claims = bindFundingOpinion(op.publicSignals, campaignId, content);
    if (!claims) return null; // scope/nullScope/contentHash no corresponden
    if (existsSync(FUNDING_VK)) {
      const vk = JSON.parse(readFileSync(FUNDING_VK, "utf8"));
      const ok = await verifyFundingOpinionProof(op as never, vk);
      if (!ok) return null;
      return claims;
    }
    // VK ausente: solo aceptable en dev.
    return isDev() ? claims : null;
  }
  // Fallback dev: sin prueba, se aceptan los valores declarados (mock).
  if (isDev() && declared?.platformId && declared?.nullifier) {
    return { issuerRoot: "", platformId: declared.platformId, nullifier: declared.nullifier };
  }
  return null;
}
