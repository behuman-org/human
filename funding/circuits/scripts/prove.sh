#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node build/funding_opinion_js/generate_witness.js build/funding_opinion_js/funding_opinion.wasm input.json build/witness.wtns
snarkjs groth16 prove build/fo_final.zkey build/witness.wtns build/proof.json build/public.json
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json
echo "public [issuerRoot, platformId, nullifier, scope, nullScope, contentHash]:"; cat build/public.json
