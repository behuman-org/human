// Encoding de puntos BLS12-381 (snarkjs -> formato del contrato Soroban).
//
// El verificador usa los tipos G1Affine/G2Affine del SDK de Soroban, que esperan los
// bytes en el formato "uncompressed" estándar (zcash, big-endian), idéntico al que
// produce ark-bls12-381 (validado byte a byte contra el contrato):
//   G1 (96 bytes) = BE(x) ‖ BE(y)
//   G2 (192 bytes) = BE(x_c1) ‖ BE(x_c0) ‖ BE(y_c1) ‖ BE(y_c0)   (parte imaginaria primero)
// snarkjs entrega G2 como [[x_c0, x_c1], [y_c0, y_c1]].

const FQ_BYTES = 48;

/** Elemento de campo (decimal) -> big-endian de `bytes` bytes. */
export function fieldToBE(dec: string, bytes = FQ_BYTES): Uint8Array {
  let v = BigInt(dec);
  const out = new Uint8Array(bytes);
  for (let i = bytes - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error(`elemento de campo no entra en ${bytes} bytes: ${dec}`);
  return out;
}

/** Public signal (decimal) -> BytesN<32> big-endian. */
export function fieldTo32(dec: string): Uint8Array {
  return fieldToBE(dec, 32);
}

/** G1 affine [x, y] (decimales snarkjs) -> 96 bytes. */
export function g1ToBytes(p: [string, string, ...string[]]): Uint8Array {
  const b = new Uint8Array(96);
  b.set(fieldToBE(p[0]), 0);
  b.set(fieldToBE(p[1]), 48);
  return b;
}

/** G2 affine [[x_c0,x_c1],[y_c0,y_c1]] (snarkjs) -> 192 bytes (orden zcash: c1 antes que c0). */
export function g2ToBytes(p: [string[], string[], ...string[][]]): Uint8Array {
  const b = new Uint8Array(192);
  b.set(fieldToBE(p[0][1]), 0); // x_c1
  b.set(fieldToBE(p[0][0]), 48); // x_c0
  b.set(fieldToBE(p[1][1]), 96); // y_c1
  b.set(fieldToBE(p[1][0]), 144); // y_c0
  return b;
}

export interface SnarkProof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
}

export interface EncodedProof {
  a: Uint8Array; // 96
  b: Uint8Array; // 192
  c: Uint8Array; // 96
}

/** Convierte la prueba de snarkjs al formato de bytes del contrato. */
export function encodeProof(proof: SnarkProof): EncodedProof {
  return {
    a: g1ToBytes(proof.pi_a),
    b: g2ToBytes(proof.pi_b),
    c: g1ToBytes(proof.pi_c),
  };
}
