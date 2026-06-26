#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
POWER="${POWER:-14}"
snarkjs powersoftau new bls12-381 "$POWER" build/pot_0000.ptau -v >/dev/null
snarkjs powersoftau contribute build/pot_0000.ptau build/pot_0001.ptau --name=c3 -v -e="c3 $(date +%s)" >/dev/null
snarkjs powersoftau prepare phase2 build/pot_0001.ptau build/pot_final.ptau -v >/dev/null
snarkjs groth16 setup build/funding_opinion.r1cs build/pot_final.ptau build/fo_0000.zkey >/dev/null
snarkjs zkey contribute build/fo_0000.zkey build/fo_final.zkey --name=c3k -v -e="c3k $(date +%s)" >/dev/null
snarkjs zkey export verificationkey build/fo_final.zkey build/verification_key.json
echo "OK: build/fo_final.zkey + verification_key.json"
