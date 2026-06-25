pragma circom 2.1.6;

// Helper OFF-CHAIN: expone Poseidon(2) para que el SDK calcule hashes idénticos a los
// del circuito principal (mismo circomlib, mismo --prime bls12381). No se usa on-chain.
// Witness layout: [1, out, a, b] -> el SDK lee w[1].
include "../node_modules/circomlib/circuits/poseidon.circom";

template H2() {
    signal input a;
    signal input b;
    signal output out;
    component p = Poseidon(2);
    p.inputs[0] <== a;
    p.inputs[1] <== b;
    out <== p.out;
}

component main = H2();
