// Árbol Merkle de commitments (humanos verificados), con Poseidon-bls12381.
//
// Profundidad fija = 4 (coincide con LEVELS del circuito kyc.circom -> 16 hojas).
// El issuer construye el árbol y publica el `root` como issuer_root; cada usuario
// prueba inclusión de su commitment sin revelar cuál.
import { poseidon2 } from "./poseidonBls.js";

export const MERKLE_DEPTH = 4;
const ZERO_LEAF = 0n; // hoja vacía

export interface BuiltTree {
  root: bigint;
  layers: bigint[][]; // layers[0] = hojas; layers[DEPTH] = [root]
}

/** Construye el árbol a partir de las hojas (commitments), rellenando con ZERO_LEAF. */
export async function buildTree(leaves: bigint[], depth = MERKLE_DEPTH): Promise<BuiltTree> {
  const size = 1 << depth;
  if (leaves.length > size) throw new Error(`demasiadas hojas: ${leaves.length} > ${size}`);
  const padded = [...leaves];
  while (padded.length < size) padded.push(ZERO_LEAF);

  const layers: bigint[][] = [padded];
  let cur = padded;
  for (let d = 0; d < depth; d++) {
    const next: bigint[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      next.push(await poseidon2(cur[i], cur[i + 1]));
    }
    layers.push(next);
    cur = next;
  }
  return { root: cur[0], layers };
}

export interface MerklePath {
  pathElements: bigint[]; // hermanos por nivel
  pathIndices: number[]; // 0 = nodo actual a la izquierda, 1 = a la derecha
}

/** Camino de inclusión para la hoja en `index`. */
export function merkleProof(tree: BuiltTree, index: number, depth = MERKLE_DEPTH): MerklePath {
  const pathElements: bigint[] = [];
  const pathIndices: number[] = [];
  let idx = index;
  for (let d = 0; d < depth; d++) {
    const isRight = idx & 1; // posición del nodo actual
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    pathElements.push(tree.layers[d][siblingIdx]);
    pathIndices.push(isRight);
    idx = idx >> 1;
  }
  return { pathElements, pathIndices };
}
