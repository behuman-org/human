// snarkjs no publica tipos. Declaración mínima para el SDK.
declare module "snarkjs" {
  export const groth16: {
    fullProve(
      input: unknown,
      wasmPath: string,
      zkeyPath: string,
    ): Promise<{ proof: unknown; publicSignals: unknown }>;
    verify(vk: object, publicSignals: unknown, proof: object): Promise<boolean>;
  };
}
