# matcher · Gate de identidad (DNI + selfie) — Capa 1, **testnet**

Backend que valida identidad **antes** de crear la identidad de Capa 1: recibe la **foto del
DNI** + **frames de cámara en vivo**, hace **face match 1:1** (DNI ↔ cámara) + **liveness**,
y devuelve `{ ok, matchScore, matchDistance, livenessOk, reasons }`.

> 📐 Spec: `06 - Implementacion/Spec — Matcher DNI + Selfie (Capa 1)` ·
> Arquitectura: `05 - Arquitectura/Matcher de Identidad (Gate de Capa 1)`.

## ⚠️ Alcance: TESTNET / prototipo

- Face match con **face-api** (open-source). Sirve para testnet, **no** es KYC de producción.
- Liveness = **challenge activo** (parpadeo/giro) + anti-foto-estática. **No** es PAD
  certificado (iBeta ISO 30107-3).
- **No** valida autenticidad del documento ni hace AML. Eso es **RENAPER** en producción
  (`IDENTITY_PROVIDER=renaper`, hueco ya previsto en `renaperProvider.ts`).

## Privacidad (Ley 25.326)

- Imágenes **en memoria**, nunca a disco, **nunca** se loguean.
- La respuesta es **PII-free**: solo `ok/score/distance/reasons`. No salen imágenes ni embeddings.
- El issuer descarta la PII tras verificar (ver `identity/issuer` + `Cumplimiento-Argentina`).

## Diseño

| Archivo | Qué hace |
|---|---|
| `provider.ts` | Interfaz `IdentityProvider` swappable + selector por `IDENTITY_PROVIDER` |
| `testnetProvider.ts` | Match 1:1 (distancia euclidiana ≤ `MATCH_THRESHOLD`) + liveness |
| `renaperProvider.ts` | Stub de producción (no implementado en testnet) |
| `faceEngine.ts` | face-api + tfjs-node: detección, embeddings, distancia |
| `liveness.ts` | EAR (parpadeo) + movimiento de cabeza, anti-estática |
| `server.ts` | HTTP: `GET /health`, `POST /verify` (y `POST /enroll` en la Fase 3) |

**Decisión de métrica:** los descriptores de face-api se comparan con **distancia euclidiana**
(estándar 0.6; menor = más parecido). El **coseno no discrimina** (caras distintas dan ~0.85+).

## Uso

```bash
npm install                       # desde la raíz del monorepo
npm run download-models -w @behuman/issuer   # baja los pesos a matcher/models/ (gitignored)
npm run serve -w @behuman/issuer             # levanta el gate en :8787

# probar el gate
curl -s http://localhost:8787/health
curl -s -X POST http://localhost:8787/verify \
  -F "document=@dni.jpg" \
  -F "selfie=@f1.jpg" -F "selfie=@f2.jpg" -F "selfie=@f3.jpg"
```

## Tests

```bash
npm test -w @behuman/issuer
```

- `liveness.test.ts` — lógica de vivacidad (parpadeo/giro/estática) con landmarks sintéticos.
- `match.test.ts` — integración con caras reales (`__tests__/fixtures/`): misma cara → match,
  caras distintas → rechazo, documento sin cara → `no_face_in_document`.

Config en `.env` (raíz): `IDENTITY_PROVIDER`, `MATCH_THRESHOLD`, `MATCHER_PORT`, `FACE_MODELS_PATH`.
