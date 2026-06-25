import { describe, it, expect } from "vitest";
import { assessLiveness } from "../liveness.js";
import type { FaceData } from "../faceEngine.js";

// Construye un FaceData mínimo (duck-typed): assessLiveness solo usa
// landmarks.getLeftEye(), getRightEye() y positions[30].
function makeFace(eyeGap: number, noseDx: number): FaceData {
  const eye = (cx: number) => [
    { x: cx - 1, y: 0 }, // p1
    { x: cx - 0.33, y: eyeGap / 2 }, // p2
    { x: cx + 0.33, y: eyeGap / 2 }, // p3
    { x: cx + 1, y: 0 }, // p4
    { x: cx + 0.33, y: -eyeGap / 2 }, // p5
    { x: cx - 0.33, y: -eyeGap / 2 }, // p6
  ];
  const positions = new Array(68).fill({ x: 0, y: 0 });
  positions[30] = { x: 5 + noseDx, y: 5 }; // nariz (interocular=10 -> normalizado por 10)
  return {
    descriptor: new Float32Array(128),
    detectionScore: 0.9,
    landmarks: {
      getLeftEye: () => eye(0),
      getRightEye: () => eye(10),
      positions,
    } as unknown as FaceData["landmarks"],
  };
}

describe("assessLiveness", () => {
  it("acepta cuando hay parpadeo (variación de EAR)", () => {
    const frames = [makeFace(0.6, 0), makeFace(0.6, 0), makeFace(0.1, 0), makeFace(0.6, 0)];
    const r = assessLiveness(frames, frames.length);
    expect(r.ok).toBe(true);
    expect(r.earRange).toBeGreaterThanOrEqual(0.06);
  });

  it("acepta cuando hay giro de cabeza (movimiento de la nariz)", () => {
    const frames = [makeFace(0.4, 0), makeFace(0.4, 0.8), makeFace(0.4, 1.6)];
    const r = assessLiveness(frames, frames.length);
    expect(r.ok).toBe(true);
    expect(r.headMove).toBeGreaterThanOrEqual(0.12);
  });

  it("rechaza una foto estática (frames idénticos, sin movimiento)", () => {
    const frames = [makeFace(0.4, 0), makeFace(0.4, 0), makeFace(0.4, 0)];
    const r = assessLiveness(frames, frames.length);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("no_liveness_motion");
  });

  it("rechaza con muy pocos frames", () => {
    const frames = [makeFace(0.6, 0), makeFace(0.1, 0)];
    const r = assessLiveness(frames, 2);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("insufficient_live_frames");
  });
});
