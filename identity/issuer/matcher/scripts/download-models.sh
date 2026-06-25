#!/usr/bin/env bash
# Descarga los pesos de los modelos de face-api (vladmandic) para el matcher testnet.
# Se guardan en $FACE_MODELS_PATH (gitignored). Solo hace falta una vez.
set -euo pipefail

DST="${FACE_MODELS_PATH:-identity/issuer/matcher/models}"
# Permitir correr desde cualquier cwd: resolver relativo a la raíz del repo si hace falta.
mkdir -p "$DST"
BASE="https://raw.githubusercontent.com/vladmandic/face-api/master/model"

# Modelos: detección (ssd_mobilenetv1), landmarks (68) y reconocimiento (128-d).
FILES=(
  "ssd_mobilenetv1_model-weights_manifest.json"
  "ssd_mobilenetv1_model.bin"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model.bin"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model.bin"
)

echo "==> Descargando modelos face-api a $DST"
for f in "${FILES[@]}"; do
  echo "  - $f"
  curl -fsSL "$BASE/$f" -o "$DST/$f"
done
echo "OK: modelos en $DST"
