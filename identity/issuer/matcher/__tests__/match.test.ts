import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as tf from "@tensorflow/tfjs-node";
import { detectFace, faceDistance, loadModels } from "../faceEngine.js";
import { MatcherTestnetProvider } from "../testnetProvider.js";

// PNG válido sin cara (gris uniforme), para el caso "no_face".
async function blankPng(): Promise<Buffer> {
  const t = tf.fill([120, 120, 3], 127, "int32") as tf.Tensor3D;
  const buf = Buffer.from(await tf.node.encodePng(t));
  t.dispose();
  return buf;
}

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (n: string) => readFileSync(resolve(here, "fixtures", n));
const MODELS = resolve(here, "..", "models");

// Integración: carga modelos reales (tfjs-node). Timeout amplio.
describe("face match (integración)", () => {
  beforeAll(async () => {
    process.env.FACE_MODELS_PATH = MODELS;
    await loadModels(MODELS);
  }, 60_000);

  it("misma imagen -> distancia ~0 (match)", async () => {
    const a = await detectFace(fixture("sample1.jpg"));
    const b = await detectFace(fixture("sample1.jpg"));
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const d = faceDistance(a!.descriptor, b!.descriptor);
    expect(d).toBeLessThan(0.6);
  }, 30_000);

  it("caras distintas -> distancia > umbral (no match)", async () => {
    const a = await detectFace(fixture("sample1.jpg"));
    const b = await detectFace(fixture("sample5.jpg"));
    const d = faceDistance(a!.descriptor, b!.descriptor);
    expect(d).toBeGreaterThan(0.6);
  }, 30_000);

  it("documento sin cara detectable -> no_face_in_document", async () => {
    // Un buffer de imagen sin caras (los modelos no detectan nada).
    const provider = new MatcherTestnetProvider();
    const blank = await blankPng();
    const r = await provider.verifyIdentity({ document: blank, selfieFrames: [blank] });
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("no_face_in_document");
  }, 30_000);

  it("gate rechaza cara distinta (face_mismatch)", async () => {
    const provider = new MatcherTestnetProvider();
    const r = await provider.verifyIdentity({
      document: fixture("sample1.jpg"),
      selfieFrames: [fixture("sample5.jpg"), fixture("sample5.jpg"), fixture("sample5.jpg")],
    });
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain("face_mismatch");
  }, 30_000);
});
