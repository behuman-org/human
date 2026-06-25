// Backend del gate de Capa 1 (matcher DNI + selfie).
//
// Endpoints:
//   GET  /health   -> estado + provider activo
//   POST /verify   -> gate puro: { document, selfie[] } -> MatchResult  (no crea identidad)
//   POST /enroll   -> gate + emisión de identidad Capa 1 (se agrega en la Fase 3)
//
// Privacidad (Ley 25.326): imágenes en memoria (nunca a disco), nunca se loguean,
// y la respuesta es PII-free (solo ok/score/razones). Ver Cumplimiento-Argentina.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import type { MatchResult } from "@behuman/shared";
import { getProvider } from "./provider.js";

// Cargar .env desde la raíz del repo (matcher/ está en identity/issuer/matcher).
const here = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(here, "..", "..", "..", ".env") });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 25 }, // PII efímera; sin disco
});

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, provider: getProvider().kind, threshold: Number(process.env.MATCH_THRESHOLD ?? 0.6) });
});

type MulterFiles = Record<string, Express.Multer.File[]>;

app.post(
  "/verify",
  upload.fields([
    { name: "document", maxCount: 1 },
    { name: "selfie", maxCount: 20 },
  ]),
  async (req, res) => {
    const files = req.files as MulterFiles | undefined;
    const document = files?.document?.[0]?.buffer;
    const selfieFrames = (files?.selfie ?? []).map((f) => f.buffer);

    if (!document) return res.status(400).json({ error: "missing_document" });
    if (selfieFrames.length === 0) return res.status(400).json({ error: "missing_selfie" });

    try {
      const result: MatchResult = await getProvider().verifyIdentity({ document, selfieFrames });
      // Log PII-free: solo metadatos del resultado.
      console.log(
        `[verify] frames=${selfieFrames.length} ok=${result.ok} score=${result.matchScore} dist=${result.matchDistance} liveness=${result.livenessOk} reasons=${result.reasons.join(",")}`,
      );
      res.json(result);
    } catch (err) {
      console.error("[verify] error:", (err as Error).message);
      res.status(500).json({ error: "gate_failed" });
    }
  },
);

const port = Number(process.env.MATCHER_PORT ?? 8787);
// Solo levantar el server si se ejecuta directamente (no al importarlo en tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`beHuman matcher escuchando en :${port} (provider=${getProvider().kind})`);
  });
}

export { app };
