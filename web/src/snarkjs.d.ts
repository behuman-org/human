declare module "snarkjs" {
  export const groth16: {
    fullProve(
      input: unknown,
      wasm: string,
      zkey: string,
    ): Promise<{ proof: unknown; publicSignals: string[] }>;
    verify(vk: object, publicSignals: unknown, proof: object): Promise<boolean>;
  };
}
