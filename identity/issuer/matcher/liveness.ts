// Liveness testnet: challenge activo (parpadeo / giro) sobre los frames en vivo.
//
// ⚠️ NO es PAD certificado (iBeta ISO 30107-3). Para testnet alcanza con exigir
// vivacidad: una foto estática frente a la cámara no parpadea ni gira -> se rechaza.
// Producción: RENAPER SID (cubre liveness + match en un flujo oficial).
import type { FaceData } from "./faceEngine.js";

const MIN_FRAMES = 3;
const EAR_DELTA = 0.06; // variación mínima del Eye Aspect Ratio -> hubo parpadeo
const HEAD_MOVE_DELTA = 0.12; // desplazamiento de la nariz (normalizado) -> hubo giro

type Pt = { x: number; y: number };

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Eye Aspect Ratio de un ojo (6 puntos en orden p1..p6). */
function eyeAspectRatio(eye: Pt[]): number {
  const a = dist(eye[1], eye[5]);
  const b = dist(eye[2], eye[4]);
  const c = dist(eye[0], eye[3]);
  return c === 0 ? 0 : (a + b) / (2 * c);
}

function avgEar(f: FaceData): number {
  return (eyeAspectRatio(f.landmarks.getLeftEye()) + eyeAspectRatio(f.landmarks.getRightEye())) / 2;
}

/** Posición de la nariz relativa al centro de los ojos, normalizada por la distancia interocular. */
function normalizedNose(f: FaceData): Pt {
  const le = f.landmarks.getLeftEye();
  const re = f.landmarks.getRightEye();
  const lc = centroid(le);
  const rc = centroid(re);
  const eyeMid = { x: (lc.x + rc.x) / 2, y: (lc.y + rc.y) / 2 };
  const interocular = dist(lc, rc) || 1;
  const nose = f.landmarks.positions[30]; // punta de la nariz
  return { x: (nose.x - eyeMid.x) / interocular, y: (nose.y - eyeMid.y) / interocular };
}

function centroid(pts: Pt[]): Pt {
  const s = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / pts.length, y: s.y / pts.length };
}

function range(xs: number[]): number {
  return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
}

export interface LivenessResult {
  ok: boolean;
  reasons: string[];
  earRange: number;
  headMove: number;
}

/**
 * Evalúa vivacidad sobre los frames con cara detectada.
 * @param frames frames (en vivo) en los que SÍ se detectó cara.
 * @param totalFrames total de frames enviados por el cliente.
 */
export function assessLiveness(frames: FaceData[], totalFrames: number): LivenessResult {
  const reasons: string[] = [];

  if (frames.length < MIN_FRAMES) {
    reasons.push("insufficient_live_frames");
  }
  // Si en muchos frames no hubo cara, la captura no es estable / confiable.
  if (totalFrames > 0 && frames.length / totalFrames < 0.6) {
    reasons.push("unstable_face_track");
  }

  const ears = frames.map(avgEar);
  const noses = frames.map(normalizedNose);
  const earRange = range(ears);
  const headMove = Math.max(range(noses.map((n) => n.x)), range(noses.map((n) => n.y)));

  const blinked = earRange >= EAR_DELTA;
  const turned = headMove >= HEAD_MOVE_DELTA;
  if (!blinked && !turned) {
    // Sin parpadeo ni giro: típico de una foto estática frente a la cámara.
    reasons.push("no_liveness_motion");
  }

  return { ok: reasons.length === 0, reasons, earRange, headMove };
}
