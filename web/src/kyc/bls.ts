// Encoding de puntos BLS12-381 al formato del contrato (zcash big-endian).
// Espejo de packages/sdk/src/blsEncode.ts (validado byte a byte contra ark-bls12-381):
//   G1 (96) = BE(x)‖BE(y)
//   G2 (192) = BE(x_c1)‖BE(x_c0)‖BE(y_c1)‖BE(y_c0)   (parte imaginaria primero)
// snarkjs entrega G2 como [[x_c0,x_c1],[y_c0,y_c1]].

const FQ = 48;

export function fieldToBE(dec: string, bytes = FQ): Uint8Array {
  let v = BigInt(dec);
  const out = new Uint8Array(bytes);
  for (let i = bytes - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error(`field element > ${bytes} bytes`);
  return out;
}

export const fieldTo32 = (dec: string) => fieldToBE(dec, 32);

export function g1ToBytes(p: string[]): Uint8Array {
  const b = new Uint8Array(96);
  b.set(fieldToBE(p[0]), 0);
  b.set(fieldToBE(p[1]), 48);
  return b;
}

export function g2ToBytes(p: string[][]): Uint8Array {
  const b = new Uint8Array(192);
  b.set(fieldToBE(p[0][1]), 0); // x_c1
  b.set(fieldToBE(p[0][0]), 48); // x_c0
  b.set(fieldToBE(p[1][1]), 96); // y_c1
  b.set(fieldToBE(p[1][0]), 144); // y_c0
  return b;
}

export interface SnarkProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}

export function encodeProof(proof: SnarkProof) {
  return { a: g1ToBytes(proof.pi_a), b: g2ToBytes(proof.pi_b), c: g1ToBytes(proof.pi_c) };
}
