// @behuman/sdk — CAPA 3 · Prueba ZK de OPINIÓN POR CAMPAÑA (funding).
//
// Genera/verifica la prueba del circuito `funding_opinion.circom`:
//   "Soy un humano del árbol del issuer; mi identidad en ESTA campaña es
//    platformId = Poseidon(secret, scope); mi nullifier de campaña es
//    Poseidon(secret, nullScope); y la prueba está atada a contentHash."
//
// El `scope` y el `nullScope` se derivan de la campaña (runtime) → identidad y
// anti-Sybil POR CAMPAÑA. La PII/secret nunca sale del device: el witness se calcula
// localmente (en el browser el caller pasa las URLs de wasm/zkey).
//
// Public signals (orden del circuito): [issuerRoot, platformId, nullifier, scope, nullScope, contentHash].
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as snarkjs from "snarkjs";
import type { Capa1Credential } from "@behuman/shared";
import type { SnarkProof } from "./blsEncode.js";

const here = dirname(fileURLToPath(import.meta.url));

/** Carpeta con los artefactos compilados del circuito de funding (Node; en browser pasar URLs). */
export function fundingCircuitsBuildDir(): string {
  return (
    process.env.FUNDING_CIRCUITS_BUILD_DIR ??
    resolve(here, "..", "..", "..", "funding", "circuits", "build")
  );
}

// Prefijos de dominio (deben coincidir con los usados por la API y el cliente).
export const FUNDING_SCOPE_PREFIX = "funding:";
export const FUNDING_NULLSCOPE_PREFIX = "funding-opinion:";

/** Mapea un string a un field element < r_bls12381 (sha256 con los 2 bits altos en 0). */
export function strToField(s: string): string {
  const digest = createHash("sha256").update(s, "utf8").digest();
  digest[0] &= 0x3f; // < 2^254 < r_bls12381
  return BigInt("0x" + digest.toString("hex")).toString();
}

/** scope de identidad de campaña: "funding:"+campaignId → field. */
export const fundingScope = (campaignId: string): string => strToField(FUNDING_SCOPE_PREFIX + campaignId);
/** scope del nullifier de campaña: "funding-opinion:"+campaignId → field. */
export const fundingNullScope = (campaignId: string): string =>
  strToField(FUNDING_NULLSCOPE_PREFIX + campaignId);
/** Hash del contenido de la opinión (binding público) → field. */
export const contentHashField = (content: string): string => strToField(content);

// Orden de los public signals e índices (acordado con el circuito).
export const FUNDING_OPINION_SIGNALS_ORDER = [
  "issuerRoot",
  "platformId",
  "nullifier",
  "scope",
  "nullScope",
  "contentHash",
] as const;
export const FO_ISSUER_ROOT = 0;
export const FO_PLATFORM_ID = 1;
export const FO_NULLIFIER = 2;
export const FO_SCOPE = 3;
export const FO_NULLSCOPE = 4;
export const FO_CONTENT_HASH = 5;

export interface FundingOpinionProof {
  proof: SnarkProof;
  publicSignals: string[]; // ver FUNDING_OPINION_SIGNALS_ORDER
}

/** Rutas/URLs de los artefactos del prover (browser: URLs; Node: opcional, default build dir). */
export interface FundingOpinionArtifacts {
  wasm?: string;
  zkey?: string;
}

/**
 * Genera la prueba Groth16 de opinión para `campaignId`. Funciona en Node (paths por
 * defecto) y en browser (pasar `artifacts` con las URLs del .wasm y el .zkey).
 */
export async function generateFundingOpinionProof(
  credential: Capa1Credential,
  campaignId: string,
  content: string,
  artifacts: FundingOpinionArtifacts = {},
): Promise<FundingOpinionProof> {
  const input = {
    birthYear: String(credential.attributes.birthYear),
    countryCode: String(credential.attributes.countryCode),
    secret: credential.secret,
    pathElements: credential.pathElements.map(String),
    pathIndices: credential.pathIndices.map(String),
    scope: fundingScope(campaignId),
    nullScope: fundingNullScope(campaignId),
    contentHash: contentHashField(content),
  };
  const buildDir = fundingCircuitsBuildDir();
  const wasm = artifacts.wasm ?? resolve(buildDir, "funding_opinion_js", "funding_opinion.wasm");
  const zkey = artifacts.zkey ?? resolve(buildDir, "fo_final.zkey");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
  return { proof: proof as SnarkProof, publicSignals: publicSignals as string[] };
}

/** Verifica la prueba con snarkjs contra la VK del circuito de funding. */
export async function verifyFundingOpinionProof(
  gen: FundingOpinionProof,
  verificationKey: unknown,
): Promise<boolean> {
  if (!gen?.proof || !Array.isArray(gen.publicSignals) || gen.publicSignals.length !== 6) return false;
  return snarkjs.groth16.verify(verificationKey as object, gen.publicSignals, gen.proof as object);
}

export interface FundingOpinionClaims {
  issuerRoot: string;
  platformId: string;
  nullifier: string;
}

/**
 * Valida que los public signals están atados a ESTA campaña y a ESTE contenido, y extrae
 * los claims de confianza (issuerRoot/platformId/nullifier vienen DE la prueba, no del body).
 * No verifica la prueba criptográficamente — llamá antes a `verifyFundingOpinionProof`.
 */
export function bindFundingOpinion(
  publicSignals: string[],
  campaignId: string,
  content: string,
): FundingOpinionClaims | null {
  if (!Array.isArray(publicSignals) || publicSignals.length !== 6) return null;
  if (publicSignals[FO_SCOPE] !== fundingScope(campaignId)) return null;
  if (publicSignals[FO_NULLSCOPE] !== fundingNullScope(campaignId)) return null;
  if (publicSignals[FO_CONTENT_HASH] !== contentHashField(content)) return null;
  return {
    issuerRoot: publicSignals[FO_ISSUER_ROOT],
    platformId: publicSignals[FO_PLATFORM_ID],
    nullifier: publicSignals[FO_NULLIFIER],
  };
}
