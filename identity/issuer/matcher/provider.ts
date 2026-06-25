// Interfaz IdentityProvider — el límite swappable del gate de Capa 1.
//
// Hoy: MatcherTestnetProvider (face match local con face-api).
// Mañana: RenaperProvider (match contra foto oficial vía SID) — misma firma.
// El issuer no sabe cuál está atrás: se elige por env IDENTITY_PROVIDER.
import type { IdentityProviderKind, MatchResult } from "@behuman/shared";
import { MatcherTestnetProvider } from "./testnetProvider.js";
import { RenaperProvider } from "./renaperProvider.js";

/** Entrada del gate: foto del DNI + frames de la cámara en vivo. PII efímera. */
export interface GateInput {
  document: Buffer; // imagen del frente del DNI (con la cara)
  selfieFrames: Buffer[]; // frames capturados en vivo (>=3 para liveness)
}

export interface IdentityProvider {
  readonly kind: IdentityProviderKind;
  /** Devuelve OK/score/razones. NUNCA imágenes ni embeddings. */
  verifyIdentity(input: GateInput): Promise<MatchResult>;
}

let cached: IdentityProvider | null = null;

/** Devuelve el provider activo según `IDENTITY_PROVIDER` (default: testnet). */
export function getProvider(): IdentityProvider {
  if (cached) return cached;
  const kind = (process.env.IDENTITY_PROVIDER ?? "testnet") as IdentityProviderKind;
  cached = kind === "renaper" ? new RenaperProvider() : new MatcherTestnetProvider();
  return cached;
}
