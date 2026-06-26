#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
circom src/funding_opinion.circom --r1cs --wasm --sym --prime bls12381 -o build -l node_modules
snarkjs r1cs info build/funding_opinion.r1cs
echo "OK: build/funding_opinion*"
