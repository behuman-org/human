// CAPA 3 — Prueba ZK de OPINIÓN POR CAMPAÑA en el NAVEGADOR (funding_opinion.circom).
// La PII/secret nunca sale del device. scope/nullScope/contentHash se derivan igual que
// en @behuman/sdk (sha256 string→field, 2 bits altos en 0 → < r_bls12381).
import * as snarkjs from "snarkjs";
import type { SnarkProof } from "../kyc/bls";
import type { StoredCredential } from "../kyc/credentialStore";

const WASM = "/circuits-funding/funding_opinion.wasm";
const ZKEY = "/circuits-funding/fo_final.zkey";

// Deben coincidir con FUNDING_SCOPE_PREFIX / FUNDING_NULLSCOPE_PREFIX del SDK.
const SCOPE_PREFIX = "funding:";
const NULLSCOPE_PREFIX = "funding-opinion:";

/** string → field element (< r_bls12381), idéntico a strToField del SDK. */
async function strToField(s: string): Promise<string> {
  const enc = new TextEncoder().encode(s);
  const ab = new ArrayBuffer(enc.length);
  new Uint8Array(ab).set(enc);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", ab));
  digest[0] &= 0x3f;
  let hex = "";
  for (const b of digest) hex += b.toString(16).padStart(2, "0");
  return BigInt("0x" + hex).toString();
}

export const fundingScope = (campaignId: string) => strToField(SCOPE_PREFIX + campaignId);
export const fundingNullScope = (campaignId: string) => strToField(NULLSCOPE_PREFIX + campaignId);
export const contentHashField = (content: string) => strToField(content);

export interface FundingOpinionProof {
  proof: SnarkProof;
  publicSignals: string[]; // [issuerRoot, platformId, nullifier, scope, nullScope, contentHash]
}

/** Genera la prueba de opinión atada a la campaña y al contenido. */
export async function generateFundingOpinionProof(
  cred: StoredCredential,
  campaignId: string,
  content: string,
): Promise<FundingOpinionProof> {
  const input = {
    birthYear: String(cred.attributes.birthYear),
    countryCode: String(cred.attributes.countryCode),
    secret: cred.secret,
    pathElements: cred.pathElements,
    pathIndices: cred.pathIndices.map(String),
    scope: await fundingScope(campaignId),
    nullScope: await fundingNullScope(campaignId),
    contentHash: await contentHashField(content),
  };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
  return { proof: proof as SnarkProof, publicSignals: publicSignals as string[] };
}

/** Handle público por campaña: últimos 5 chars del platformId (decimal → hex). */
export function handleOfCampaign(platformIdDecimal: string): string {
  return ("0x" + BigInt(platformIdDecimal).toString(16).padStart(64, "0")).slice(-5);
}
