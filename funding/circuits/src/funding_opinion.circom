pragma circom 2.1.6;

// ============================================================================
// beHuman — CAPA 3 · Circuito de OPINIÓN POR CAMPAÑA (funding ZK)
//
// Prueba (sin revelar PII ni el address del KYC):
//   "Mi credencial (commitment = Poseidon(birthYear, countryCode, secret)) pertenece al
//    árbol Merkle del issuer (issuerRoot); mi identidad en ESTA campaña es
//    platformId = Poseidon(secret, scope); mi nullifier de campaña es
//    Poseidon(secret, nullScope); y la prueba está atada a contentHash."
//
// Diferencia con el circuito de Capa 2: el `scope` y el `nullScope` son INPUTS PÚBLICOS
// (runtime), derivados de la campaña ("funding:"+campaignId), para:
//   - identidad por campaña (platformId distinto e incorrelacionable entre campañas),
//   - 1 humano = 1 voz por campaña (nullifier scopeado, anti-Sybil del sentimiento).
//
// Reutiliza los templates Merkle/Poseidon de Capa 1/2 (misma curva BLS12-381).
// NO modifica kyc.circom ni post.circom (es un circuito nuevo de la vertical funding).
//
// Public signals (orden): [ issuerRoot, platformId, nullifier, scope, nullScope, contentHash ].
// ============================================================================

include "../node_modules/circomlib/circuits/poseidon.circom";

template MerkleInclusion(LEVELS) {
    signal input leaf;
    signal input pathElements[LEVELS];
    signal input pathIndices[LEVELS];
    signal output root;

    component hashers[LEVELS];
    signal cur[LEVELS + 1];
    signal left[LEVELS];
    signal right[LEVELS];

    cur[0] <== leaf;
    for (var i = 0; i < LEVELS; i++) {
        pathIndices[i] * (1 - pathIndices[i]) === 0;
        left[i]  <== cur[i]          + pathIndices[i] * (pathElements[i] - cur[i]);
        right[i] <== pathElements[i] + pathIndices[i] * (cur[i] - pathElements[i]);
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        cur[i + 1] <== hashers[i].out;
    }
    root <== cur[LEVELS];
}

template FundingOpinion(LEVELS) {
    // privados
    signal input birthYear;
    signal input countryCode;
    signal input secret;
    signal input pathElements[LEVELS];
    signal input pathIndices[LEVELS];

    // públicos (derivados de la campaña)
    signal input scope;       // "funding:"+campaignId (como field element)
    signal input nullScope;   // "funding-opinion:"+campaignId
    signal input contentHash;

    // outputs públicos
    signal output issuerRoot;
    signal output platformId;
    signal output nullifier;

    // 1) commitment idéntico al de Capa 1.
    component commit = Poseidon(3);
    commit.inputs[0] <== birthYear;
    commit.inputs[1] <== countryCode;
    commit.inputs[2] <== secret;

    // 2) pertenencia al árbol del issuer (mismos humanos verificados).
    component merkle = MerkleInclusion(LEVELS);
    merkle.leaf <== commit.out;
    for (var i = 0; i < LEVELS; i++) {
        merkle.pathElements[i] <== pathElements[i];
        merkle.pathIndices[i]  <== pathIndices[i];
    }
    issuerRoot <== merkle.root;

    // 3) identidad de campaña (incorrelacionable entre campañas y con el KYC).
    component pid = Poseidon(2);
    pid.inputs[0] <== secret;
    pid.inputs[1] <== scope;
    platformId <== pid.out;

    // 4) nullifier de campaña (1 humano = 1 voz por campaña).
    component nf = Poseidon(2);
    nf.inputs[0] <== secret;
    nf.inputs[1] <== nullScope;
    nullifier <== nf.out;

    // 5) binding de contentHash.
    signal contentHashSq;
    contentHashSq <== contentHash * contentHash;
}

component main {public [scope, nullScope, contentHash]} = FundingOpinion(4);
