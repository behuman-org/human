// Motor de caras (testnet): detección, embeddings y landmarks con face-api + tfjs-node.
//
// ⚠️ Solo para testnet/prototipo (lo dice Proveedores-y-Stack). El liveness robusto y
// certificado (iBeta ISO 30107-3) y el match contra foto oficial van por RENAPER en prod.
//
// Privacidad: trabaja sobre buffers en memoria; nunca persiste ni loguea imágenes;
// devuelve solo descriptores/landmarks para uso interno del gate (no salen del backend).
import * as tf from "@tensorflow/tfjs-node";
import * as faceapi from "@vladmandic/face-api";

let loaded = false;

/** Carga los pesos de los modelos desde disco. Idempotente. */
export async function loadModels(modelsPath: string): Promise<void> {
  if (loaded) return;
  await tf.ready();
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
  loaded = true;
}

export interface FaceData {
  descriptor: Float32Array; // embedding 128-d
  landmarks: faceapi.FaceLandmarks68;
  detectionScore: number;
}

/**
 * Detecta UNA cara en la imagen y devuelve su embedding + landmarks.
 * `null` si no hay cara detectable.
 */
export async function detectFace(
  image: Buffer,
  minConfidence = 0.5,
): Promise<FaceData | null> {
  const tensor = tf.node.decodeImage(image, 3) as unknown as tf.Tensor3D;
  try {
    const result = await faceapi
      .detectSingleFace(tensor as never, new faceapi.SsdMobilenetv1Options({ minConfidence }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!result) return null;
    return {
      descriptor: result.descriptor,
      landmarks: result.landmarks,
      detectionScore: result.detection.score,
    };
  } finally {
    tensor.dispose();
  }
}

/**
 * Distancia euclidiana entre dos embeddings (face-api estándar). MENOR = más
 * parecidos; el umbral típico de match 1:1 es 0.6. (El coseno NO sirve para estos
 * descriptores: caras distintas dan coseno ~0.85+.)
 */
export function faceDistance(a: Float32Array, b: Float32Array): number {
  return faceapi.euclideanDistance(a, b);
}
