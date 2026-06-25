// RenaperProvider — hueco para producción (RENAPER / SID).
//
// NO se implementa en esta etapa (testnet). Existe solo para preservar la interfaz
// `IdentityProvider`: en producción el match 1:1 + liveness los hace RENAPER vía SID
// (ver Proveedores-y-Stack / Biometria-y-Liveness en la vault), y el resto del sistema
// (issuer, capa ZK, contrato) no cambia: solo se cambia IDENTITY_PROVIDER=renaper.
import type { MatchResult } from "@behuman/shared";
import type { GateInput, IdentityProvider } from "./provider.js";

export class RenaperProvider implements IdentityProvider {
  readonly kind = "renaper" as const;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyIdentity(_input: GateInput): Promise<MatchResult> {
    throw new Error(
      "RenaperProvider no implementado (producción). Usá IDENTITY_PROVIDER=testnet para el gate local.",
    );
  }
}
