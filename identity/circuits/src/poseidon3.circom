pragma circom 2.1.6;

// Helper OFF-CHAIN: expone Poseidon(3) para el commitment = Poseidon(birthYear,
// countryCode, secret), idéntico al circuito principal. No se usa on-chain.
// Witness layout: [1, out, a, b, c] -> el SDK lee w[1].
include "../node_modules/circomlib/circuits/poseidon.circom";

template H3() {
    signal input a;
    signal input b;
    signal input c;
    signal output out;
    component p = Poseidon(3);
    p.inputs[0] <== a;
    p.inputs[1] <== b;
    p.inputs[2] <== c;
    out <== p.out;
}

component main = H3();
